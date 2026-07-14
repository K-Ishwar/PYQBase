from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from uuid import UUID
from pydantic import BaseModel
from typing import List

from app.core.database import get_db

router = APIRouter()

class TopicHeatmapData(BaseModel):
    topic_id: UUID
    topic_name: str
    question_count: int
    weightage_percent: float

class SubjectHeatmapResponse(BaseModel):
    subject_id: UUID
    subject_name: str
    topics: List[TopicHeatmapData]


class ExamStatsResponse(BaseModel):
    exam: str
    total_questions: int
    available_years: List[int]



@router.get("/heatmaps/{subject_id}", response_model=SubjectHeatmapResponse)
async def get_subject_heatmap(
    subject_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns heatmap data for a given subject.
    Sources from the topic_heatmap materialized view to avoid live aggregation.
    """
    
    # 1. First ensure the subject exists and get its name
    subject_row = (await db.execute(
        text("SELECT name FROM subjects WHERE id = :subject_id"),
        {"subject_id": str(subject_id)}
    )).scalar_one_or_none()
    
    if not subject_row:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    subject_name = subject_row
    
    # 2. Query the materialized view
    rows = (await db.execute(
        text("""
            SELECT topic_id, topic_name, question_count, weightage_percent
            FROM topic_heatmap
            WHERE subject_id = :subject_id
            ORDER BY weightage_percent DESC
        """),
        {"subject_id": str(subject_id)}
    )).mappings().all()
    
    topics = [
        TopicHeatmapData(
            topic_id=row["topic_id"],
            topic_name=row["topic_name"],
            question_count=row["question_count"],
            weightage_percent=float(row["weightage_percent"])
        )
        for row in rows
    ]
    
    return SubjectHeatmapResponse(
        subject_id=subject_id,
        subject_name=subject_name,
        topics=topics
    )


@router.get("/exams", response_model=List[str])
async def get_all_exams(
    db: AsyncSession = Depends(get_db)
):
    """
    Returns a list of all distinct exams currently in the database.
    """
    from app.models.question import QuestionDb
    from sqlalchemy import select
    
    stmt = select(QuestionDb.exam).distinct().where(QuestionDb.exam.isnot(None))
    result = await db.execute(stmt)
    exams = result.scalars().all()
    return list(exams)


@router.get("/exams/{exam_name}", response_model=ExamStatsResponse)
async def get_exam_stats(
    exam_name: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns live statistics for a specific exam:
    - total number of questions
    - available distinct years sorted descending
    """
    from app.models.question import QuestionDb
    from sqlalchemy import select, func
    
    # Get total questions
    count_stmt = select(func.count(QuestionDb.id)).where(QuestionDb.exam == exam_name)
    total_questions = (await db.execute(count_stmt)).scalar() or 0
    
    # Get distinct years sorted descending
    years_stmt = select(QuestionDb.year).where(QuestionDb.exam == exam_name).distinct().order_by(QuestionDb.year.desc())
    years = (await db.execute(years_stmt)).scalars().all()
    
    return ExamStatsResponse(
        exam=exam_name,
        total_questions=total_questions,
        available_years=list(years)
    )

@router.get("/exams/{exam_name}/subjects", response_model=List[str])
async def get_exam_subjects(
    exam_name: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns a list of subject names that have questions for a specific exam.
    """
    from app.models.question import QuestionDb
    from app.models.taxonomy import SubtopicDb, TopicDb, SubjectDb
    from sqlalchemy import select

    stmt = (
        select(SubjectDb.name)
        .distinct()
        .join(TopicDb, SubjectDb.id == TopicDb.subject_id)
        .join(SubtopicDb, TopicDb.id == SubtopicDb.topic_id)
        .join(QuestionDb, SubtopicDb.id == QuestionDb.subtopic_id)
        .where(QuestionDb.exam == exam_name)
    )
    result = await db.execute(stmt)
    subjects = result.scalars().all()
    return list(subjects)

