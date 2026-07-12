from sqlmodel import SQLModel, Field
from typing import Optional, List, Any
from uuid import UUID, uuid4
from datetime import datetime, timezone
from sqlalchemy import Column, ARRAY
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from pydantic import BaseModel

class MockTestDb(SQLModel, table=True):
    __tablename__ = "mock_tests"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id")
    exam: str
    question_ids: List[UUID] = Field(sa_column=Column(ARRAY(PG_UUID), nullable=False))
    mode: str  # "custom" | "weak_area"
    score: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# API Schemas
class MockTestGenerateRequest(BaseModel):
    exam: str
    subject_id: UUID
    question_count: int
    mode: str

class MockTestResponse(BaseModel):
    id: UUID
    exam: str
    question_ids: List[UUID]
    mode: str
    score: Optional[float]
    created_at: datetime
    
    model_config = {"from_attributes": True}
