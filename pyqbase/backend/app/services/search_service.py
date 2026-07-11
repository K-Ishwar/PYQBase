"""
Search service — Postgres Full Text Search using ts_rank + plainto_tsquery /
websearch_to_tsquery against the pre-built search_vector TSVECTOR column.

Architecture doc §10: results are cached in an in-memory LRU cache (TTL 1 hour).
Using functools.lru_cache is not ideal for async, so we use a simple TTL dict.
"""
from __future__ import annotations

import time
import hashlib
import json
from typing import Optional
from uuid import UUID

from sqlalchemy import text, func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.question import QuestionListItem, SearchMeta, SearchResponse


# ─── Simple in-memory LRU / TTL cache ─────────────────────────────────────────

_CACHE: dict[str, tuple[float, SearchResponse]] = {}
_CACHE_TTL = 3600  # 1 hour in seconds
_CACHE_MAX = 512   # max entries to avoid unbounded growth


def _cache_key(q: str, exam: Optional[str], subject_id: Optional[str],
               topic_id: Optional[str], sort: str, limit: int, offset: int) -> str:
    raw = json.dumps(
        [q, exam, subject_id, topic_id, sort, limit, offset], sort_keys=True
    )
    return hashlib.sha256(raw.encode()).hexdigest()


def _cache_get(key: str) -> Optional[SearchResponse]:
    entry = _CACHE.get(key)
    if entry is None:
        return None
    ts, value = entry
    if time.monotonic() - ts > _CACHE_TTL:
        del _CACHE[key]
        return None
    return value


def _cache_set(key: str, value: SearchResponse) -> None:
    # Evict oldest entries when at capacity (simple FIFO)
    if len(_CACHE) >= _CACHE_MAX:
        oldest = next(iter(_CACHE))
        del _CACHE[oldest]
    _CACHE[key] = (time.monotonic(), value)


# ─── Search implementation ────────────────────────────────────────────────────

async def search_questions(
    db: AsyncSession,
    *,
    q: Optional[str] = None,
    exam: Optional[str] = None,
    subject_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    sort: str = "relevance",
    limit: int = 20,
    offset: int = 0,
) -> SearchResponse:
    """
    Full-text search across questions using Postgres ts_rank.
    - Uses websearch_to_tsquery when q is given (handles "El Nino"-style queries).
    - Falls back to listing all (no FTS filter) when q is empty.
    - Filters by exam, subject_id (via subtopic→topic→subject join), topic_id.
    - Paginates with offset.
    - correct_option and options columns are NOT selected — enforced at SQL level.
    """
    limit = min(limit, 100)  # hard cap

    ck = _cache_key(q or "", exam, subject_id, topic_id, sort, limit, offset)
    cached = _cache_get(ck)
    if cached:
        return cached

    # Build the SQL query manually for fine-grained control over selected columns
    # Deliberately exclude correct_option and options columns.
    base_select = """
        SELECT
            q.id,
            q.exam,
            q.year,
            q.paper,
            q.question_number,
            q.question_stem,
            q.question_type,
            q.has_image,
            q.image_url,
            q.subtopic_id,
            q.elo_rating,
            q.created_at
            {rank_col}
        FROM questions q
        {joins}
        WHERE 1=1
        {filters}
        {order}
        LIMIT :limit OFFSET :offset
    """

    count_select = """
        SELECT COUNT(q.id)
        FROM questions q
        {joins}
        WHERE 1=1
        {filters}
    """

    params: dict = {"limit": limit, "offset": offset}
    rank_col = ""
    joins = ""
    filters = ""
    order = "ORDER BY q.created_at DESC"

    # ── FTS filter ──────────────────────────────────────────────────────────
    if q and q.strip():
        rank_col = ", ts_rank(q.search_vector, websearch_to_tsquery('english', :query)) AS ts_rank"
        filters += " AND q.search_vector @@ websearch_to_tsquery('english', :query)"
        params["query"] = q.strip()
        if sort == "relevance":
            order = "ORDER BY ts_rank DESC, q.year DESC"

    # ── Exam filter ─────────────────────────────────────────────────────────
    if exam:
        filters += " AND q.exam = :exam"
        params["exam"] = exam

    # ── Subject / topic filters via subtopic join ──────────────────────────
    if subject_id or topic_id:
        joins = """
            JOIN subtopics st ON q.subtopic_id = st.id
            JOIN topics t ON st.topic_id = t.id
        """
        if topic_id:
            filters += " AND t.id = :topic_id"
            params["topic_id"] = topic_id
        elif subject_id:
            filters += " AND t.subject_id = :subject_id"
            params["subject_id"] = subject_id

    # ── Year sort fallback ──────────────────────────────────────────────────
    if sort == "year_desc" or (not q and sort != "relevance"):
        order = "ORDER BY q.year DESC, q.question_number ASC"

    # ── Execute ─────────────────────────────────────────────────────────────
    data_sql = text(base_select.format(
        rank_col=rank_col, joins=joins, filters=filters, order=order
    ))
    count_sql = text(count_select.format(joins=joins, filters=filters))

    rows = (await db.execute(data_sql, params)).mappings().all()
    total = (await db.execute(count_sql, {k: v for k, v in params.items()
                                          if k not in ("limit", "offset")})).scalar_one()

    items = [
        QuestionListItem(
            id=row["id"],
            exam=row["exam"],
            year=row["year"],
            paper=row["paper"],
            question_number=row["question_number"],
            question_stem=dict(row["question_stem"]),
            question_type=row["question_type"],
            has_image=row["has_image"],
            image_url=row["image_url"],
            subtopic_id=row["subtopic_id"],
            elo_rating=row["elo_rating"],
            ts_rank=float(row["ts_rank"]) if "ts_rank" in row.keys() and row["ts_rank"] is not None else None,
            created_at=row["created_at"],
        )
        for row in rows
    ]

    result = SearchResponse(
        data=items,
        meta=SearchMeta(
            total=int(total),
            limit=limit,
            offset=offset,
            has_next=(offset + limit) < int(total),
        ),
    )
    _cache_set(ck, result)
    return result
