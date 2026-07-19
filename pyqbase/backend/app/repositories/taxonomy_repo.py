from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from typing import Optional
from uuid import UUID

from app.models.taxonomy import SubjectDb, TopicDb, ExamDb


from app.models.question import QuestionDb

# ─── Exams ─────────────────────────────────────────────────────────────────────

async def list_exams(db: AsyncSession) -> list[ExamDb]:
    result = await db.execute(select(ExamDb).order_by(ExamDb.name))
    return result.scalars().all()

async def create_exam(db: AsyncSession, name: str) -> ExamDb:
    slug = name.lower().replace(" ", "-")
    exam = ExamDb(name=name, slug=slug)
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return exam

async def get_or_create_exam(db: AsyncSession, name: str) -> ExamDb:
    result = await db.execute(select(ExamDb).where(func.lower(ExamDb.name) == name.lower()))
    exam = result.scalar_one_or_none()
    if exam:
        return exam
    return await create_exam(db, name)

async def delete_exam(db: AsyncSession, exam_id: UUID) -> bool:
    result = await db.execute(select(ExamDb).where(ExamDb.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        return False
    await db.delete(exam)
    await db.commit()
    return True


# ─── Subjects ──────────────────────────────────────────────────────────────────

async def list_subjects(db: AsyncSession) -> list[dict]:
    stmt = select(
        SubjectDb.id, 
        SubjectDb.name, 
        func.count(QuestionDb.id).label("question_count")
    ).outerjoin(
        TopicDb, SubjectDb.id == TopicDb.subject_id
    ).outerjoin(
        QuestionDb, TopicDb.id == QuestionDb.topic_id
    ).group_by(SubjectDb.id).order_by(SubjectDb.name)
    
    result = await db.execute(stmt)
    return [{"id": row.id, "name": row.name, "question_count": row.question_count} for row in result.mappings()]

async def get_subject(db: AsyncSession, subject_id: UUID) -> Optional[SubjectDb]:
    result = await db.execute(select(SubjectDb).where(SubjectDb.id == subject_id))
    return result.scalar_one_or_none()

async def create_subject(db: AsyncSession, name: str) -> SubjectDb:
    subject = SubjectDb(name=name)
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return subject

async def get_or_create_subject(db: AsyncSession, name: str) -> SubjectDb:
    result = await db.execute(select(SubjectDb).where(func.lower(SubjectDb.name) == name.lower()))
    subject = result.scalar_one_or_none()
    if subject:
        return subject
    return await create_subject(db, name)

async def delete_subject(db: AsyncSession, subject_id: UUID) -> bool:
    result = await db.execute(select(SubjectDb).where(SubjectDb.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        return False
    await db.delete(subject)
    await db.commit()
    return True


# ─── Topics ────────────────────────────────────────────────────────────────────

async def list_topics(db: AsyncSession, subject_id: UUID) -> list[TopicDb]:
    result = await db.execute(
        select(TopicDb).where(TopicDb.subject_id == subject_id).order_by(TopicDb.name)
    )
    return result.scalars().all()

async def get_topic(db: AsyncSession, topic_id: UUID) -> Optional[TopicDb]:
    result = await db.execute(select(TopicDb).where(TopicDb.id == topic_id))
    return result.scalar_one_or_none()

async def create_topic(db: AsyncSession, subject_id: UUID, name: str) -> TopicDb:
    topic = TopicDb(subject_id=subject_id, name=name)
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic

async def get_or_create_topic(db: AsyncSession, subject_id: UUID, name: str) -> TopicDb:
    result = await db.execute(
        select(TopicDb)
        .where(TopicDb.subject_id == subject_id)
        .where(func.lower(TopicDb.name) == name.lower())
    )
    topic = result.scalar_one_or_none()
    if topic:
        return topic
    return await create_topic(db, subject_id, name)

async def delete_topic(db: AsyncSession, topic_id: UUID) -> bool:
    result = await db.execute(select(TopicDb).where(TopicDb.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        return False
    await db.delete(topic)
    await db.commit()
    return True



# ─── Bulk Operations ───────────────────────────────────────────────────────────

async def get_all_taxonomy_data(db: AsyncSession) -> tuple[list[SubjectDb], list[TopicDb]]:
    """
    Fetches the entire taxonomy across all tiers in exactly 2 queries.
    """
    subjects = (await db.execute(select(SubjectDb).order_by(SubjectDb.name))).scalars().all()
    topics = (await db.execute(select(TopicDb).order_by(TopicDb.name))).scalars().all()
    
    # Returning lists directly; SQLite/Postgres rows converted to list of models
    return list(subjects), list(topics)
