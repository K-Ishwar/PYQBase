from sqlmodel import SQLModel, Field, Column, JSON
from typing import Optional, Dict, List, Any
from uuid import UUID, uuid4
from pydantic import BaseModel


# ─── DB Table Models ──────────────────────────────────────────────────────────

class ExamDb(SQLModel, table=True):
    __tablename__ = "exams"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(unique=True)
    slug: str = Field(unique=True)
    description: Optional[str] = None
    overview: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    pattern: Optional[List[Dict[str, Any]]] = Field(default=None, sa_column=Column(JSON))
    eligibility: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))


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

class ExamCreate(BaseModel):
    name: str

class ExamResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    overview: Optional[Dict[str, Any]] = None
    pattern: Optional[List[Dict[str, Any]]] = None
    eligibility: Optional[List[str]] = None
    model_config = {"from_attributes": True}


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


