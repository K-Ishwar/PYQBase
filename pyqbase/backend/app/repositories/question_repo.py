from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID

from app.models.question import QuestionDb, QuestionUpsertPayload


async def get_question_by_id(db: AsyncSession, question_id: UUID) -> Optional[QuestionDb]:
    result = await db.execute(select(QuestionDb).where(QuestionDb.id == question_id))
    return result.scalar_one_or_none()


async def upsert_question(
    db: AsyncSession,
    question_id: UUID,
    payload: QuestionUpsertPayload,
) -> tuple[QuestionDb, bool]:
    """
    Creates or updates a question row.
    Returns (question, is_new) where is_new=True means it was created.
    """
    existing = await get_question_by_id(db, question_id)
    is_new = existing is None

    question_stem_dict = {"en": payload.question_stem.en}
    options_dict = {
        "A": payload.options.A,
        "B": payload.options.B,
        "C": payload.options.C,
        "D": payload.options.D,
    }

    if is_new:
        question = QuestionDb(
            id=question_id,
            exam=payload.exam,
            year=payload.year,
            paper=payload.paper,
            question_number=payload.question_number,
            question_stem=question_stem_dict,
            options=options_dict,
            correct_option=payload.correct_option,
            question_type=payload.question_type,
            has_image=payload.has_image,
            image_url=payload.image_url,
            image_description=payload.image_description,
            parse_confidence=payload.parse_confidence,
            subtopic_id=payload.subtopic_id,
        )
        db.add(question)
    else:
        # Update all mutable fields
        existing.exam = payload.exam
        existing.year = payload.year
        existing.paper = payload.paper
        existing.question_number = payload.question_number
        existing.question_stem = question_stem_dict
        existing.options = options_dict
        existing.correct_option = payload.correct_option
        existing.question_type = payload.question_type
        existing.has_image = payload.has_image
        existing.image_url = payload.image_url
        existing.image_description = payload.image_description
        existing.parse_confidence = payload.parse_confidence
        existing.subtopic_id = payload.subtopic_id
        question = existing

    # ── DROPPED Question Cleanup ─────────────────────────────────────────────
    # Retroactive cleanup: If the question is marked DROPPED, delete it from all user_srs queues.
    if payload.correct_option == "DROPPED":
        from sqlalchemy import text
        await db.execute(
            text("DELETE FROM user_srs WHERE question_id = :q_id"),
            {"q_id": str(question_id)}
        )

    await db.commit()
    await db.refresh(question)
    return question, is_new


async def list_questions(db: AsyncSession, limit: int = 100, offset: int = 0) -> list[QuestionDb]:
    result = await db.execute(select(QuestionDb).order_by(QuestionDb.created_at.desc()).limit(limit).offset(offset))
    return result.scalars().all()
