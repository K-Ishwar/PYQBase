from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Text
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from typing import Optional, Literal
from uuid import UUID, uuid4
from datetime import datetime, timezone
from pydantic import BaseModel, model_validator


# ─── DB Table Model ───────────────────────────────────────────────────────────

class QuestionDb(SQLModel, table=True):
    __tablename__ = "questions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    exam: str
    year: int
    paper: str
    question_number: int
    question_stem: dict = Field(sa_column=Column(JSONB, nullable=False))
    options: dict = Field(sa_column=Column(JSONB, nullable=False))
    correct_option: str  # 'A' | 'B' | 'C' | 'D' | 'DROPPED'
    question_type: str = Field(default="MCQ")
    has_image: bool = Field(default=False)
    image_url: Optional[str] = None
    image_description: Optional[str] = Field(default=None, sa_column=Column(Text))
    explanation: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    parse_confidence: Optional[float] = None
    subtopic_id: UUID = Field(foreign_key="subtopics.id")
    syllabus_point_id: Optional[int] = None
    elo_rating: int = Field(default=1200)
    # search_vector is managed by a DB trigger — excluded from writes
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


# ─── API Payload Schemas ──────────────────────────────────────────────────────

class QuestionStem(BaseModel):
    en: str

class QuestionOptions(BaseModel):
    A: str
    B: str
    C: str
    D: str

class QuestionUpsertPayload(BaseModel):
    exam: Literal["UPSC_CSE", "CAPF", "MPSC", "CDS"]
    year: int
    paper: str
    question_number: int
    question_stem: QuestionStem
    options: QuestionOptions
    correct_option: Literal["A", "B", "C", "D", "DROPPED"]
    question_type: str = "MCQ"
    has_image: bool = False
    image_url: Optional[str] = None
    image_description: Optional[str] = None
    parse_confidence: Optional[float] = None
    subtopic_id: UUID
    manual_review_approved: bool = False

    @model_validator(mode="after")
    def validate_publish_rules(self) -> "QuestionUpsertPayload":
        """
        BR-04: Reject publish unless answer key + subject tag present
        AND parse_confidence >= 0.90, OR manual_review_approved is True.
        """
        if self.manual_review_approved:
            return self
        if self.parse_confidence is not None and self.parse_confidence < 0.90:
            raise ValueError(
                "parse_confidence must be >= 0.90 to publish without manual_review_approved=True"
            )
        return self


class QuestionResponse(BaseModel):
    """Full question response — used in admin context only."""
    id: UUID
    exam: str
    year: int
    paper: str
    question_number: int
    question_stem: dict
    options: dict
    correct_option: str
    question_type: str
    has_image: bool
    image_url: Optional[str]
    parse_confidence: Optional[float]
    subtopic_id: UUID
    elo_rating: int
    created_at: datetime

    model_config = {"from_attributes": True}


class QuestionListItem(BaseModel):
    """
    Scraping-safe public list/search response.
    Deliberately omits `correct_option` and `options` per Security doc §8.
    """
    id: UUID
    exam: str
    year: int
    paper: str
    question_number: int
    question_stem: dict          # only .en text, no answer
    question_type: str
    has_image: bool
    image_url: Optional[str]
    subtopic_id: UUID
    elo_rating: int
    ts_rank: Optional[float] = None   # populated by search queries
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchMeta(BaseModel):
    total: int
    limit: int
    offset: int
    has_next: bool


class SearchResponse(BaseModel):
    data: list[QuestionListItem]
    meta: SearchMeta
