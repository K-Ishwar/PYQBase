from sqlmodel import SQLModel, Field
from typing import Optional
from uuid import UUID, uuid4
from pydantic import BaseModel


# ─── DB Table Models ──────────────────────────────────────────────────────────

class SubjectDb(SQLModel, table=True):
    __tablename__ = "subjects"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(unique=True)


class TopicDb(SQLModel, table=True):
    __tablename__ = "topics"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    subject_id: UUID = Field(foreign_key="subjects.id", index=True)
    name: str




# ─── API Schemas ──────────────────────────────────────────────────────────────

class SubjectCreate(BaseModel):
    name: str

class SubjectResponse(BaseModel):
    id: UUID
    name: str
    question_count: Optional[int] = 0
    model_config = {"from_attributes": True}


class TopicCreate(BaseModel):
    name: str

class TopicResponse(BaseModel):
    id: UUID
    subject_id: UUID
    name: str
    model_config = {"from_attributes": True}


