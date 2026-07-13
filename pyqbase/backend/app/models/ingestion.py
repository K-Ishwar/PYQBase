from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB, UUID as pgUUID
import sqlalchemy as sa
from typing import Optional, Dict, Any, List
from uuid import UUID, uuid4
from datetime import datetime, timezone
import enum

class IngestionStatus(str, enum.Enum):
    parsing = "parsing"
    parsed = "parsed"
    reviewing = "reviewing"
    publishing = "publishing"
    completed = "completed"
    failed = "failed"

class ReviewStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    needs_edit = "needs_edit"

class IngestionBatchDb(SQLModel, table=True):
    __tablename__ = "ingestion_batches"
    
    id: UUID = Field(
        default_factory=uuid4,
        sa_column=Column(pgUUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    )
    uploaded_by: UUID = Field(sa_column=Column(pgUUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False))
    exam: str = Field(nullable=False)
    year: int = Field(nullable=False)
    paper: str = Field(nullable=False)
    source_filename: str = Field(nullable=False)
    answer_key_filename: Optional[str] = Field(default=None)
    status: IngestionStatus = Field(
        default=IngestionStatus.parsing,
        sa_column=Column(sa.Enum(IngestionStatus, name="ingestion_status"), nullable=False, server_default="parsing")
    )
    total_questions: int = Field(default=0, nullable=False)
    error_log: Optional[str] = Field(default=None)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    )

class StagedQuestionDb(SQLModel, table=True):
    __tablename__ = "staged_questions"
    
    id: UUID = Field(
        default_factory=uuid4,
        sa_column=Column(pgUUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    )
    batch_id: UUID = Field(sa_column=Column(pgUUID(as_uuid=True), sa.ForeignKey("ingestion_batches.id", ondelete="CASCADE"), nullable=False))
    question_number: int = Field(nullable=False)
    raw_question_stem: str = Field(nullable=False)
    paraphrased_stem: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    raw_options: Dict[str, Any] = Field(sa_column=Column(JSONB, nullable=False))
    paraphrased_options: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    correct_option: Optional[str] = Field(default=None)
    matched_from_answer_key: bool = Field(default=False, nullable=False)
    ai_explanation: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    
    subject_id: Optional[UUID] = Field(default=None, sa_column=Column(pgUUID(as_uuid=True), sa.ForeignKey("subjects.id", ondelete="SET NULL")))
    topic_id: Optional[UUID] = Field(default=None, sa_column=Column(pgUUID(as_uuid=True), sa.ForeignKey("topics.id", ondelete="SET NULL")))
    subtopic_id: Optional[UUID] = Field(default=None, sa_column=Column(pgUUID(as_uuid=True), sa.ForeignKey("subtopics.id", ondelete="SET NULL")))
    
    parse_confidence: float = Field(nullable=False)
    lexical_similarity_score: Optional[float] = Field(default=None)
    
    review_status: ReviewStatus = Field(
        default=ReviewStatus.pending,
        sa_column=Column(sa.Enum(ReviewStatus, name="review_status"), nullable=False, server_default="pending")
    )
    reviewer_notes: Optional[str] = Field(default=None)
    
    has_image: bool = Field(default=False, nullable=False)
    image_url: Optional[str] = Field(default=None)
    
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now())
    )
