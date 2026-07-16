from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.models.question import SearchResponse
from app.services.search_service import search_questions
from app.core.security import get_current_user, get_optional_current_user, User

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
    user: Optional[User] = Depends(get_optional_current_user),
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
        include_explanation=getattr(user, 'subscription_status', 'free') == 'active' or getattr(user, 'role', '') == 'admin' if user else False,
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
    from app.models.taxonomy import TopicDb, SubjectDb
    from sqlalchemy import select
    from fastapi import HTTPException
    
    stmt = (
        select(
            QuestionDb,
            TopicDb.name.label("topic_name"),
            SubjectDb.name.label("subject_name")
        )
        .outerjoin(TopicDb, QuestionDb.topic_id == TopicDb.id)
        .outerjoin(SubjectDb, TopicDb.subject_id == SubjectDb.id)

        .where(QuestionDb.id == question_id)
    )
    result = await db.execute(stmt)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Question not found")
    
    question, topic_name, subject_name = row
        
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
        subject_name=subject_name,
        topic_name=topic_name,
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
        
    # Check subscription status
    has_sub = getattr(user, 'subscription_status', 'free') == 'active' or getattr(user, 'role', '') == 'admin'
    
    return QuestionSolutionResponse(
        id=str(question.id),
        correct_option=question.correct_option,
        explanation=question.explanation if has_sub else None,
    )


class GenerateExplanationRequest(BaseModel):
    pass

@router.post("/{question_id}/explanation/generate", response_model=QuestionSolutionResponse)
async def generate_question_explanation_api(
    question_id: str,
    req: GenerateExplanationRequest,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(get_current_user)  # Requires auth
):
    """
    Generate an AI explanation for the question and save it.
    """
    from app.models.question import QuestionDb
    from sqlalchemy import select
    from fastapi import HTTPException
    from app.services.ai_content_service import generate_explanation
    from app.services.search_service import clear_search_cache
    
    # Check subscription status
    has_sub = getattr(user, 'subscription_status', 'free') == 'active' or getattr(user, 'role', '') == 'admin'
    if not has_sub:
        raise HTTPException(status_code=403, detail="Subscription required to generate explanations")
        
    result = await db.execute(select(QuestionDb).where(QuestionDb.id == question_id))
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    result_data = await generate_explanation(
        question_stem=question.question_stem,
        options=question.options,
        provided_correct_option=question.correct_option,
    )
    
    # Update question with new explanation and possibly corrected option
    explanation_obj = {"en": result_data["explanation"]}
    question.explanation = explanation_obj
    question.correct_option = result_data["correct_option"]
    
    db.add(question)
    await db.commit()
    
    # Clear the search cache so that the new explanation appears in search results immediately
    clear_search_cache()
    
    return QuestionSolutionResponse(
        id=str(question.id),
        correct_option=question.correct_option,
        explanation=question.explanation,
    )
