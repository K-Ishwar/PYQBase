from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.core.database import get_db
from app.models.taxonomy import SubjectResponse, TopicResponse, SubtopicResponse, ExamResponse
from app.repositories import taxonomy_repo

router = APIRouter()

@router.get("/exams", response_model=list[ExamResponse])
async def list_exams(db: AsyncSession = Depends(get_db)):
    """Publicly accessible endpoint to list all exams."""
    return await taxonomy_repo.list_exams(db)

@router.get("/exams/{slug}", response_model=ExamResponse)
async def get_exam_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    """Publicly accessible endpoint to get a specific exam."""
    exam = await taxonomy_repo.get_exam_by_slug(db, slug)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam

@router.get("/subjects", response_model=list[SubjectResponse])
async def list_subjects(db: AsyncSession = Depends(get_db)):
    """Publicly accessible endpoint to list all subjects."""
    return await taxonomy_repo.list_subjects(db)


@router.get("/subjects/{subject_id}/topics", response_model=list[TopicResponse])
async def list_topics(
    subject_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Publicly accessible endpoint to list topics for a subject."""
    return await taxonomy_repo.list_topics(db, subject_id)


@router.get("/topics/{topic_id}/subtopics", response_model=list[SubtopicResponse])
async def list_subtopics(
    topic_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Publicly accessible endpoint to list subtopics for a topic."""
    return await taxonomy_repo.list_subtopics(db, topic_id)
