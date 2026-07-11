from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import Optional
from uuid import UUID

from app.models.taxonomy import SubjectDb, TopicDb, SubtopicDb


# ─── Subjects ──────────────────────────────────────────────────────────────────

async def list_subjects(db: AsyncSession) -> list[SubjectDb]:
    result = await db.execute(select(SubjectDb).order_by(SubjectDb.name))
    return result.scalars().all()

async def create_subject(db: AsyncSession, name: str) -> SubjectDb:
    subject = SubjectDb(name=name)
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return subject

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

async def create_topic(db: AsyncSession, subject_id: UUID, name: str) -> TopicDb:
    topic = TopicDb(subject_id=subject_id, name=name)
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic

async def delete_topic(db: AsyncSession, topic_id: UUID) -> bool:
    result = await db.execute(select(TopicDb).where(TopicDb.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        return False
    await db.delete(topic)
    await db.commit()
    return True


# ─── Subtopics ─────────────────────────────────────────────────────────────────

async def list_subtopics(db: AsyncSession, topic_id: UUID) -> list[SubtopicDb]:
    result = await db.execute(
        select(SubtopicDb).where(SubtopicDb.topic_id == topic_id).order_by(SubtopicDb.name)
    )
    return result.scalars().all()

async def create_subtopic(db: AsyncSession, topic_id: UUID, name: str) -> SubtopicDb:
    subtopic = SubtopicDb(topic_id=topic_id, name=name)
    db.add(subtopic)
    await db.commit()
    await db.refresh(subtopic)
    return subtopic

async def delete_subtopic(db: AsyncSession, subtopic_id: UUID) -> bool:
    result = await db.execute(select(SubtopicDb).where(SubtopicDb.id == subtopic_id))
    subtopic = result.scalar_one_or_none()
    if not subtopic:
        return False
    await db.delete(subtopic)
    await db.commit()
    return True
