from sqlmodel import SQLModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    role: str = Field(default="user")
    subscription_status: str = Field(default="free")
    trial_ends_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

class UserDb(UserBase, table=True):
    __tablename__ = "users"
    id: UUID = Field(primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
