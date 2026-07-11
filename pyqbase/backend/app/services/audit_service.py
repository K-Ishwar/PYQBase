from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Any
from uuid import UUID

from app.models.audit_log import AuditLogDb


async def log_admin_action(
    db: AsyncSession,
    admin_id: UUID,
    table_name: str,
    record_id: UUID,
    action: str,
    previous_payload: Optional[dict] = None,
    new_payload: Optional[dict] = None,
) -> AuditLogDb:
    """
    Inserts an immutable audit log row capturing every admin write.
    action should be one of: 'CREATE', 'UPDATE', 'DELETE'
    """
    log = AuditLogDb(
        admin_id=admin_id,
        table_name=table_name,
        record_id=record_id,
        action=action,
        previous_payload=previous_payload,
        new_payload=new_payload,
    )
    db.add(log)
    await db.commit()
    return log
