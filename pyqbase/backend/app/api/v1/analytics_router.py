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
