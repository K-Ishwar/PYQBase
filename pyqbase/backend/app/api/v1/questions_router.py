from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.models.question import SearchResponse
from app.services.search_service import search_questions
from app.core.security import get_current_user

router = APIRouter()


@router.get("", response_model=SearchResponse)
async def list_questions(
    q: Optional[str] = Query(None, description="Full-text search query"),
    exam: Optional[str] = Query(None, description="Filter by exam (UPSC CSE, UPSC CAPF, MPSC Rajyseva, UPSC CDS)"),
    year: Optional[int] = Query(None, description="Filter by year"),
    subject_id: Optional[str] = Query(None, description="Filter by subject UUID"),
    topic_id: Optional[str] = Query(None, description="Filter by topic UUID"),
    sort: str = Query("relevance", description="Sort: 'relevance' or 'year_desc'"),
    limit: int = Query(20, ge=1, le=100, description="Results per page (hard-capped at 100)"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: AsyncSession = Depends(get_db),
):
    """
    Cross-exam PYQ search via Postgres Full-Text Search.
    NOTE: correct_option and options are deliberately omitted from the response
    to prevent answer-key scraping (Security doc §8).
    Results are cached in-memory for 1 hour (Architecture doc §10).
    """
    return await search_questions(
        db,
        q=q,
        exam=exam,
        year=year,
        subject_id=subject_id,
        topic_id=topic_id,
        sort=sort,
        limit=limit,
        offset=offset,
    )


from pydantic import BaseModel
from typing import Dict, Any

class QuestionDetailResponse(BaseModel):
    id: str
    exam: str
    year: int
    paper: str
    question_number: int
    question_stem: Dict[str, Any]
    options: Dict[str, Any]
    question_type: str
    has_image: bool
    image_url: Optional[str]
    elo_rating: int


@router.get("/{question_id}", response_model=QuestionDetailResponse)
async def get_question(question_id: str, db: AsyncSession = Depends(get_db)):
    """
    Fetch full question detail for attempting.
    Omit correct_option and explanation.
    """
    from app.models.question import QuestionDb
    from sqlalchemy import select
    from fastapi import HTTPException
    
    result = await db.execute(select(QuestionDb).where(QuestionDb.id == question_id))
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    return QuestionDetailResponse(
        id=str(question.id),
        exam=question.exam,
        year=question.year,
        paper=question.paper,
        question_number=question.question_number,
        question_stem=question.question_stem,
        options=question.options,
        question_type=question.question_type,
        has_image=question.has_image,
        image_url=question.image_url,
        elo_rating=question.elo_rating,
    )


class QuestionSolutionResponse(BaseModel):
    id: str
    correct_option: str
    explanation: Optional[Dict[str, Any]]


@router.get("/{question_id}/solution", response_model=QuestionSolutionResponse)
async def get_question_solution(
    question_id: str,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(get_current_user)  # Requires auth
):
    """
    Fetch the correct option and explanation.
    Restricted to authenticated users.
    """
    from app.models.question import QuestionDb
    from sqlalchemy import select
    from fastapi import HTTPException
    
    result = await db.execute(select(QuestionDb).where(QuestionDb.id == question_id))
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    return QuestionSolutionResponse(
        id=str(question.id),
        correct_option=question.correct_option,
        explanation=question.explanation,
    )
