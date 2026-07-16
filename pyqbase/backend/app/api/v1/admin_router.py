from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from uuid import UUID, uuid4
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_admin_user, User
from app.models.question import QuestionDb, QuestionUpsertPayload, QuestionResponse
from app.models.taxonomy import (
    SubjectDb,
    SubjectCreate, SubjectResponse,
    TopicDb,
    TopicCreate, TopicResponse,
)
from app.models.audit_log import AuditLogDb
from app.repositories import question_repo, taxonomy_repo
from app.services.audit_service import log_admin_action

router = APIRouter()


class AdminStatsResponse(BaseModel):
    total_questions: int
    total_subjects: int
    total_audit_logs: int

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    total_questions = await db.scalar(select(func.count()).select_from(QuestionDb)) or 0
    total_subjects = await db.scalar(select(func.count()).select_from(SubjectDb)) or 0
    total_audit_logs = await db.scalar(select(func.count()).select_from(AuditLogDb)) or 0

    return AdminStatsResponse(
        total_questions=total_questions,
        total_subjects=total_subjects,
        total_audit_logs=total_audit_logs
    )



class ExamSubjectYearStats(BaseModel):
    exam: str
    subject: str
    year: int
    total_questions: int

@router.get("/reports/exam-subject-year", response_model=list[ExamSubjectYearStats])
async def get_exam_subject_year_report(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    Returns total number of questions grouped by Exam, Subject, and Year.
    """
    stmt = (
        select(
            QuestionDb.exam,
            SubjectDb.name.label("subject"),
            QuestionDb.year,
            func.count(QuestionDb.id).label("total_questions")
        )
        .join(TopicDb, QuestionDb.topic_id == TopicDb.id)
        .join(SubjectDb, TopicDb.subject_id == SubjectDb.id)
        .group_by(QuestionDb.exam, SubjectDb.name, QuestionDb.year)
        .order_by(QuestionDb.exam, SubjectDb.name, QuestionDb.year.desc())
    )
    result = await db.execute(stmt)
    
    return [
        ExamSubjectYearStats(
            exam=row.exam or "Unknown",
            subject=row.subject or "Unknown",
            year=row.year or 0,
            total_questions=row.total_questions
        )
        for row in result.mappings()
    ]


# ──────────────────────────────────────────────────────────────────────────────
# QUESTIONS
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/questions", response_model=list[QuestionResponse])
async def list_questions(
    limit: int = 100,
    offset: int = 0,
    show_duplicates: bool = False,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """List all questions (admin only). If show_duplicates is true, returns questions that are >90% similar to another question."""
    if show_duplicates:
        # Ensure pg_trgm extension is active (requires superuser, but usually allowed in local/cloud SQL if trusted)
        try:
            await db.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))
            await db.commit()
        except Exception:
            pass # might fail if already exists or permission denied, but if it exists we're good
            
        # We find questions that have at least one other question with >90% similarity.
        # extracting 'en' from JSONB for comparison
        stmt_global = text("""
            SELECT DISTINCT ON (q1.id) q1.*
            FROM questions q1
            JOIN questions q2 ON q1.id != q2.id
                 AND q1.exam = q2.exam
                 AND q1.year = q2.year
            WHERE similarity(q1.question_stem->>'en', q2.question_stem->>'en') > 0.90
            ORDER BY q1.id
            LIMIT :limit OFFSET :offset
        """)
        try:
            result = await db.execute(stmt_global, {"limit": limit, "offset": offset})
            rows = result.mappings().all()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        # Map to expected response
        return [dict(r) for r in rows]
    else:
        questions = await question_repo.list_questions(db, limit=limit, offset=offset)
        return questions


@router.put("/questions/{question_id}", response_model=QuestionResponse, status_code=200)
async def upsert_question(
    question_id: UUID,
    payload: QuestionUpsertPayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    Create or update a question (admin only).
    Enforces BR-04: parse_confidence >= 0.90 or manual_review_approved=True.
    Records every write in audit_logs.
    """
    # Fetch existing for audit snapshot
    existing = await question_repo.get_question_by_id(db, question_id)
    previous_payload = (
        {
            "exam": existing.exam,
            "year": existing.year,
            "question_stem": existing.question_stem,
            "correct_option": existing.correct_option,
        }
        if existing
        else None
    )

    question, is_new = await question_repo.upsert_question(db, question_id, payload)

    new_payload = {
        "exam": question.exam,
        "year": question.year,
        "question_stem": question.question_stem,
        "correct_option": question.correct_option,
        "topic_id": str(question.topic_id),
    }

    # Write immutable audit log
    await log_admin_action(
        db=db,
        admin_id=admin.id,
        table_name="questions",
        record_id=question.id,
        action="CREATE" if is_new else "UPDATE",
        previous_payload=previous_payload,
        new_payload=new_payload,
    )

    return question


class BulkDeletePayload(BaseModel):
    question_ids: list[UUID]

@router.delete("/questions/bulk", status_code=204)
async def bulk_delete_questions(
    payload: BulkDeletePayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Delete multiple questions (admin only)."""
    deleted_count = await question_repo.delete_questions(db, payload.question_ids)
    
    # Write audit log for each deleted question
    for q_id in payload.question_ids:
        await log_admin_action(
            db=db,
            admin_id=admin.id,
            table_name="questions",
            record_id=q_id,
            action="DELETE"
        )
    return


# ──────────────────────────────────────────────────────────────────────────────
# TAXONOMY — SUBJECTS
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/subjects", response_model=list[SubjectResponse])
async def list_subjects(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    return await taxonomy_repo.list_subjects(db)


@router.post("/subjects", response_model=SubjectResponse, status_code=201)
async def create_subject(
    payload: SubjectCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    subject = await taxonomy_repo.get_or_create_subject(db, payload.name)
    await log_admin_action(db, admin.id, "subjects", subject.id, "CREATE_OR_GET",
                           new_payload={"name": subject.name})
    return subject


@router.delete("/subjects/{subject_id}", status_code=204)
async def delete_subject(
    subject_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    deleted = await taxonomy_repo.delete_subject(db, subject_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Subject not found")
    await log_admin_action(db, admin.id, "subjects", subject_id, "DELETE")


# ──────────────────────────────────────────────────────────────────────────────
# TAXONOMY — TOPICS
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/subjects/{subject_id}/topics", response_model=list[TopicResponse])
async def list_topics(
    subject_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    return await taxonomy_repo.list_topics(db, subject_id)


@router.post("/subjects/{subject_id}/topics", response_model=TopicResponse, status_code=201)
async def create_topic(
    subject_id: UUID,
    payload: TopicCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    topic = await taxonomy_repo.get_or_create_topic(db, subject_id, payload.name)
    await log_admin_action(db, admin.id, "topics", topic.id, "CREATE_OR_GET",
                           new_payload={"name": topic.name, "subject_id": str(subject_id)})
    return topic


@router.delete("/topics/{topic_id}", status_code=204)
async def delete_topic(
    topic_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    deleted = await taxonomy_repo.delete_topic(db, topic_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Topic not found")
    await log_admin_action(db, admin.id, "topics", topic_id, "DELETE")





# ──────────────────────────────────────────────────────────────────────────────
# USERS
# ──────────────────────────────────────────────────────────────────────────────

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from sqlalchemy import select, func, cast, String

class UserResponse(BaseModel):
    id: UUID
    email: str
    role: str
    subscription_status: str
    trial_ends_at: Optional[datetime]
    created_at: datetime

class UserStatsResponse(BaseModel):
    total_users: int
    subscribed_users: int
    admin_users: int

@router.get("/users/stats", response_model=UserStatsResponse)
async def get_user_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    from app.models.user import UserDb
    
    total = await db.scalar(select(func.count(UserDb.id))) # type: ignore
    subscribed = await db.scalar(select(func.count(UserDb.id)).where(cast(UserDb.subscription_status, String) == "premium")) # type: ignore
    admins = await db.scalar(select(func.count(UserDb.id)).where(cast(UserDb.role, String) == "admin")) # type: ignore
    
    return UserStatsResponse(
        total_users=total or 0,
        subscribed_users=subscribed or 0,
        admin_users=admins or 0,
    )

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    from app.models.user import UserDb
    
    result = await db.execute(select(UserDb).order_by(UserDb.created_at.desc()).limit(limit).offset(offset)) # type: ignore
    users = result.scalars().all()
    
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            role=u.role,
            subscription_status=u.subscription_status,
            trial_ends_at=u.trial_ends_at,
            created_at=u.created_at,
        )
        for u in users
    ]

@router.get("/test-query")
async def test_query(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    try:
        # Get distinct taxonomy used by questions
        res = await db.execute(text("""
            SELECT q.subject_id, s.name as subject, q.topic_id, t.name as topic, COUNT(q.id) as q_count
            FROM questions q
            LEFT JOIN subjects s ON q.subject_id = s.id
            LEFT JOIN topics t ON q.topic_id = t.id
            GROUP BY q.subject_id, s.name, q.topic_id, t.name
            ORDER BY s.name
        """))
        return {"data": [dict(row._mapping) for row in res]}
    except Exception as e:
        return {"error": str(e)}
