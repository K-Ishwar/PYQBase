from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional, List
from uuid import UUID

from app.models.ingestion import IngestionBatchDb, StagedQuestionDb, IngestionStatus

async def create_batch(
    db: AsyncSession, 
    uploaded_by: UUID, 
    exam: str, 
    year: int, 
    paper: str, 
    source_filename: str,
    answer_key_filename: Optional[str] = None
) -> IngestionBatchDb:
    batch = IngestionBatchDb(
        uploaded_by=uploaded_by,
        exam=exam,
        year=year,
        paper=paper,
        source_filename=source_filename,
        answer_key_filename=answer_key_filename,
        status=IngestionStatus.parsing
    )
    db.add(batch)
    await db.commit()
    await db.refresh(batch)
    return batch

async def get_batch(db: AsyncSession, batch_id: UUID) -> Optional[IngestionBatchDb]:
    result = await db.execute(select(IngestionBatchDb).where(IngestionBatchDb.id == batch_id))
    return result.scalar_one_or_none()

async def update_batch_status(
    db: AsyncSession, 
    batch_id: UUID, 
    status: IngestionStatus,
    error_log: Optional[str] = None
) -> Optional[IngestionBatchDb]:
    stmt = (
        update(IngestionBatchDb)
        .where(IngestionBatchDb.id == batch_id)
        .values(status=status)
        .returning(IngestionBatchDb)
    )
    
    if error_log is not None:
        stmt = stmt.values(error_log=error_log)
        
    result = await db.execute(stmt)
    await db.commit()
    return result.scalar_one_or_none()

async def add_staged_questions(db: AsyncSession, questions: List[StagedQuestionDb]) -> None:
    db.add_all(questions)
    await db.commit()

async def update_staged_question(
    db: AsyncSession, 
    question_id: UUID, 
    **kwargs
) -> Optional[StagedQuestionDb]:
    stmt = (
        update(StagedQuestionDb)
        .where(StagedQuestionDb.id == question_id)
        .values(**kwargs)
        .returning(StagedQuestionDb)
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.scalar_one_or_none()

async def get_batch_with_questions(db: AsyncSession, batch_id: UUID) -> tuple[Optional[IngestionBatchDb], List[StagedQuestionDb]]:
    batch = await get_batch(db, batch_id)
    if not batch:
        return None, []
        
    result = await db.execute(
        select(StagedQuestionDb)
        .where(StagedQuestionDb.batch_id == batch_id)
        .order_by(StagedQuestionDb.question_number)
    )
    questions = list(result.scalars().all())
    return batch, questions
