from sqlmodel import SQLModel, Field
from typing import Optional
from uuid import UUID
import uuid
from datetime import datetime, timezone

class FeedbackBase(SQLModel):
    user_id: UUID = Field(foreign_key="users.id", index=True)
    message: str
    status: str = Field(default="new") # can be 'new', 'read', 'resolved'

class FeedbackDb(FeedbackBase, table=True):
    __tablename__ = "feedbacks"
    id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class FeedbackCreate(SQLModel):
    message: str

class FeedbackResponse(FeedbackBase):
    id: UUID
    created_at: datetime
    
class AdminFeedbackResponse(FeedbackResponse):
    user_name: str
    user_email: str
