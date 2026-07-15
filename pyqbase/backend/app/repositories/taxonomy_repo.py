from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from typing import Optional
from uuid import UUID

from app.models.taxonomy import SubjectDb, TopicDb


# ─── Subjects ──────────────────────────────────────────────────────────────────

async def list_subjects(db: AsyncSession) -> list[SubjectDb]:
    result = await db.execute(select(SubjectDb).order_by(SubjectDb.name))
    return result.scalars().all()

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
