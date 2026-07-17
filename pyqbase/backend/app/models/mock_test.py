from sqlmodel import SQLModel, Field
from typing import Optional, List, Any
from uuid import UUID, uuid4
from datetime import datetime, timezone
from sqlalchemy import Column, ARRAY
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from pydantic import BaseModel

class MockTestDb(SQLModel, table=True):
    __tablename__ = "mock_tests"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id")
    exam: str
    question_ids: List[UUID] = Field(sa_column=Column(ARRAY(PG_UUID), nullable=False))
    mode: str  # "custom" | "weak_area"
    test_format: str = Field(default="cbt") # "cbt" | "scrollable"
    time_limit: int = Field(default=30) # time in minutes
    score: Optional[float] = None
    user_answers: dict = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False, server_default='{}'))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

# API Schemas
class MockTestGenerateRequest(BaseModel):
    exam: str
    subject_id: UUID
    question_count: int
    question_ids: Optional[List[UUID]] = None
    mode: str
    test_format: str = "cbt"
    time_limit: int = 30

class MockTestResponse(BaseModel):
    id: UUID
    exam: str
    question_ids: List[UUID]
    mode: str
    test_format: str
    time_limit: int
    score: Optional[float]
    user_answers: Optional[dict] = None
    created_at: datetime
    questions: Optional[List[Any]] = None
    
    model_config = {"from_attributes": True}
