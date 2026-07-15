from pydantic import BaseModel
from typing import Optional, Dict, Any
from uuid import UUID
from app.models.ingestion import ReviewStatus

class StagedQuestionUpdate(BaseModel):
    raw_question_stem: Optional[str] = None
    paraphrased_stem: Optional[Dict[str, Any]] = None
    raw_options: Optional[Dict[str, Any]] = None
    paraphrased_options: Optional[Dict[str, Any]] = None
    correct_option: Optional[str] = None
    ai_explanation: Optional[Dict[str, Any]] = None
    subject_id: Optional[UUID] = None
    topic_id: Optional[UUID] = None

    review_status: Optional[ReviewStatus] = None
    reviewer_notes: Optional[str] = None
