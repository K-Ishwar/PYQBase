from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from typing import Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone


class AuditLogDb(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    admin_id: UUID = Field(foreign_key="users.id")
    table_name: str
    record_id: UUID
    action: str  # 'CREATE' | 'UPDATE' | 'DELETE'
    previous_payload: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    new_payload: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
