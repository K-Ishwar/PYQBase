from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from typing import Optional
from uuid import UUID, uuid4
from datetime import date, datetime, timezone


class UserAttemptDb(SQLModel, table=True):
    """
    Maps to the partitioned user_attempts table.
    The primary key includes attempt_date (partition key).
    """
    __tablename__ = "user_attempts"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id")
    question_id: UUID = Field(foreign_key="questions.id")
    selected_option: str
    is_correct: bool
    time_taken_seconds: int
    attempt_date: date = Field(primary_key=True)


class BackgroundJobDb(SQLModel, table=True):
    """
    Postgres-native job queue.  Workers SELECT ... FOR UPDATE SKIP LOCKED
    to claim jobs without any Redis dependency.
    """
    __tablename__ = "background_jobs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    task_type: str
    payload: dict = Field(sa_column=Column(JSONB, nullable=False))
    status: str = Field(default="pending")   # pending | processing | completed | failed
    locked_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class UserSrsDb(SQLModel, table=True):
    """
    Tracks SM-2 spaced repetition state for a user/question pair.
    """
    __tablename__ = "user_srs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id")
    question_id: UUID = Field(foreign_key="questions.id")
    next_review_date: date
    interval: int = 0
    ease_factor: float = 2.5
    repetitions: int = 0
