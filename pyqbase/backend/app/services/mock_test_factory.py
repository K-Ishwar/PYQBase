from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from uuid import UUID
from typing import List

from app.models.question import QuestionDb
from app.models.taxonomy import SubtopicDb, TopicDb
from app.models.user_progress import UserAttemptDb

class MockTestFactory:
    def __init__(self, db: AsyncSession, user_id: UUID):
        self.db = db
        self.user_id = user_id

    async def generate_custom(self, exam: str, subject_id: UUID, limit: int) -> List[UUID]:
        """
        Randomly selects up to `limit` questions for the given exam and subject.
        """
        stmt = (
            select(QuestionDb.id)
            .join(SubtopicDb, QuestionDb.subtopic_id == SubtopicDb.id)
            .join(TopicDb, SubtopicDb.topic_id == TopicDb.id)
            .where(
                and_(
                    QuestionDb.exam == exam,
                    TopicDb.subject_id == subject_id
                )
            )
            .order_by(func.random())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def generate_weak_area(self, exam: str, subject_id: UUID, limit: int) -> List[UUID]:
        """
        Selects questions where the user has previously answered incorrectly,
        falling back to random questions if there aren't enough wrong answers.
        """
        # Get questions the user answered incorrectly
        wrong_stmt = (
            select(QuestionDb.id)
            .join(UserAttemptDb, UserAttemptDb.question_id == QuestionDb.id)
            .join(SubtopicDb, QuestionDb.subtopic_id == SubtopicDb.id)
            .join(TopicDb, SubtopicDb.topic_id == TopicDb.id)
            .where(
                and_(
                    UserAttemptDb.user_id == self.user_id,
                    UserAttemptDb.is_correct == False,
                    QuestionDb.exam == exam,
                    TopicDb.subject_id == subject_id
                )
            )
            .order_by(QuestionDb.elo_rating.desc())  # Weight by difficulty
            .limit(limit)
        )
        wrong_result = await self.db.execute(wrong_stmt)
        wrong_ids = list(wrong_result.scalars().all())

        # If we need more, fetch random questions not in wrong_ids
        if len(wrong_ids) < limit:
            remaining = limit - len(wrong_ids)
            fallback_stmt = (
                select(QuestionDb.id)
                .join(SubtopicDb, QuestionDb.subtopic_id == SubtopicDb.id)
                .join(TopicDb, SubtopicDb.topic_id == TopicDb.id)
                .where(
                    and_(
                        QuestionDb.exam == exam,
                        TopicDb.subject_id == subject_id,
                        QuestionDb.id.notin_(wrong_ids) if wrong_ids else True
                    )
                )
                .order_by(QuestionDb.elo_rating.desc()) # Give harder questions
                .limit(remaining)
            )
            fallback_result = await self.db.execute(fallback_stmt)
            wrong_ids.extend(fallback_result.scalars().all())

        return wrong_ids
