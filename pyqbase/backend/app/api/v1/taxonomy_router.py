from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.core.database import get_db
from app.models.taxonomy import SubjectResponse, TopicResponse, ExamResponse
from app.repositories import taxonomy_repo

router = APIRouter()

@router.get("/exams", response_model=list[ExamResponse])
async def list_exams(db: AsyncSession = Depends(get_db)):
    """Publicly accessible endpoint to list all exams."""
    return await taxonomy_repo.list_exams(db)


@router.get("/subjects", response_model=list[SubjectResponse])
async def list_subjects(db: AsyncSession = Depends(get_db)):
    """Publicly accessible endpoint to list all subjects."""
    return await taxonomy_repo.list_subjects(db)


@router.get("/all")
async def get_all_taxonomy(db: AsyncSession = Depends(get_db)):
    """Bulk endpoint to fetch all subjects and topics in one request."""
    subjects, topics = await taxonomy_repo.get_all_taxonomy_data(db)
    return {
        "subjects": subjects,
        "topics": topics
    }



@router.get("/debug_staged")
async def debug_staged(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models.ingestion import StagedQuestionDb
    res = await db.execute(select(StagedQuestionDb).order_by(StagedQuestionDb.created_at.desc()).limit(10))
    return [{
        'id': str(q.id), 
        'q_num': q.question_number, 
        'subject': q.subject_id, 
        'conf': q.parse_confidence, 
        'notes': q.reviewer_notes
    } for q in res.scalars()]

@router.get("/subjects/{subject_id}/topics", response_model=list[TopicResponse])
async def list_topics(
    subject_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Publicly accessible endpoint to list topics for a subject."""
    return await taxonomy_repo.list_topics(db, subject_id)





@router.get("/subjects/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    subject = await taxonomy_repo.get_subject(db, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject


@router.get("/topics/{topic_id}", response_model=TopicResponse)
async def get_topic(
    topic_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    topic = await taxonomy_repo.get_topic(db, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic
