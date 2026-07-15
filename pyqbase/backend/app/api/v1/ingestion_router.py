import os
import shutil
import logging
from typing import Optional
from uuid import UUID

import asyncio
from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlmodel import col as sa_col

from app.core.database import get_db
from app.core.security import get_admin_user as get_current_admin_user
from app.models.user import UserDb
from app.models.ingestion import IngestionStatus, ReviewStatus, StagedQuestionDb
from app.models.question import QuestionDb
from app.models.audit_log import AuditLogDb
from app.repositories import ingestion_repo
from app.services.ingestion_service import process_ingestion_batch
from app.schemas.ingestion import StagedQuestionUpdate

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/health")
async def ingestion_health():
    """
    Health check endpoint for ingestion service.
    Use this to verify configuration before uploading.
    """
    from app.core.config import settings
    from app.services.ai_content_service import groq_client
    
    checks = {
        "upload_dir_exists": os.path.exists(UPLOAD_DIR),
        "upload_dir_writable": os.access(UPLOAD_DIR, os.W_OK),
        "upload_dir_path": UPLOAD_DIR,
        "groq_client_initialized": groq_client is not None,
        "groq_api_key_set": bool(settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("placeholder")),
        "database_url_set": bool(settings.DATABASE_URL),
    }
    
    all_ok = all([
        checks["upload_dir_exists"],
        checks["upload_dir_writable"],
        checks["groq_client_initialized"],
        checks["groq_api_key_set"],
        checks["database_url_set"],
    ])
    
    return {
        "status": "healthy" if all_ok else "degraded",
        "checks": checks,
        "issues": [k for k, v in checks.items() if not v] if not all_ok else []
    }

@router.post("/upload")
async def upload_paper(
    exam: str = Form(...),
    year: int = Form(...),
    paper_metadata: str = Form(..., alias="paper"),
    paper_file: Optional[UploadFile] = File(None),
    paper_text: Optional[str] = Form(None),
    answer_key_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin_user: UserDb = Depends(get_current_admin_user)
):
    """
    Upload a question paper for bulk ingestion (via file or raw text).
    """
    paper_path = None
    answer_key_path = None
    source_filename = ""
    try:
        # Log the upload attempt
        logger.info(f"Upload attempt: exam={exam}, year={year}, paper={paper_metadata}, user={admin_user.email}")
        
        # Validate that exactly one input is provided
        if not paper_file and not paper_text:
            raise HTTPException(
                status_code=400,
                detail="Either a paper file or manual text must be provided."
            )
            
        if paper_file and paper_text:
            raise HTTPException(
                status_code=400,
                detail="Provide either a paper file or manual text, not both."
            )
            
        # Ensure upload directory exists
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        logger.info(f"Upload directory: {UPLOAD_DIR}")
        
        import uuid
        
        if paper_text:
            # Handle Manual Text Entry
            source_filename = f"manual_entry_{uuid.uuid4().hex[:8]}.md"
            paper_path = os.path.join(UPLOAD_DIR, source_filename)
            logger.info(f"Saving manual text to: {paper_path}")
            try:
                with open(paper_path, "w", encoding="utf-8") as f:
                    f.write(paper_text)
            except Exception as e:
                logger.error(f"Failed to save text file: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to save text: {str(e)}"
                )
        else:
            # Handle File Upload
            source_filename = paper_file.filename
            
            # Validate file extensions
            allowed_extensions = {'.md', '.pdf', '.txt'}
            paper_ext = os.path.splitext(paper_file.filename)[1].lower()
            if paper_ext not in allowed_extensions:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid paper file format '{paper_ext}'. Allowed formats: {', '.join(allowed_extensions)}"
                )
            
            paper_path = os.path.join(UPLOAD_DIR, paper_file.filename)
            logger.info(f"Saving paper file to: {paper_path}")
            
            try:
                with open(paper_path, "wb") as buffer:
                    content = await paper_file.read()
                    if not content:
                        raise HTTPException(
                            status_code=400,
                            detail="Paper file is empty"
                        )
                    buffer.write(content)
                logger.info(f"Paper file saved successfully ({len(content)} bytes)")
            except Exception as e:
                logger.error(f"Failed to save paper file: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to save paper file: {str(e)}"
                )
            
        answer_key_path = None
        if answer_key_file and answer_key_file.filename:
            answer_ext = os.path.splitext(answer_key_file.filename)[1].lower()
            allowed_extensions = {'.md', '.pdf', '.txt'}
            if answer_ext not in allowed_extensions:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid answer key file format '{answer_ext}'. Allowed formats: {', '.join(allowed_extensions)}"
                )
            
            answer_key_path = os.path.join(UPLOAD_DIR, answer_key_file.filename)
            logger.info(f"Saving answer key file to: {answer_key_path}")
            try:
                with open(answer_key_path, "wb") as buffer:
                    content = await answer_key_file.read()
                    buffer.write(content)
                logger.info(f"Answer key file saved successfully ({len(content)} bytes)")
            except Exception as e:
                logger.error(f"Failed to save answer key file: {e}")
                # Clean up paper file
                try:
                    os.remove(paper_path)
                except:
                    pass
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to save answer key file: {str(e)}"
                )
                
        # Create DB batch
        logger.info("Creating database batch record")
        try:
            batch = await ingestion_repo.create_batch(
                db=db,
                uploaded_by=admin_user.id,
                exam=exam,
                year=year,
                paper=paper_metadata,
                source_filename=source_filename,
                answer_key_filename=answer_key_file.filename if answer_key_file else None
            )
            logger.info(f"Batch created successfully: {batch.id}")
        except Exception as e:
            logger.error(f"Failed to create batch: {e}")
            # Clean up uploaded files
            try:
                os.remove(paper_path)
                if answer_key_path:
                    os.remove(answer_key_path)
            except:
                pass
            raise HTTPException(
                status_code=500,
                detail=f"Database error: Failed to create batch. {str(e)}"
            )
        
        # Trigger background parsing + AI enrichment as a true asyncio task.
        # asyncio.create_task runs on the app's event loop and is NOT tied
        # to the request lifecycle, so it survives after the response is sent.
        logger.info(f"Triggering background parsing for batch {batch.id}")
        asyncio.create_task(
            process_ingestion_batch(batch.id, paper_path, answer_key_path)
        )
        
        logger.info(f"Upload successful: batch_id={batch.id}")
        return {
            "message": "Upload successful, parsing started.", 
            "batch_id": str(batch.id), 
            "status": batch.status,
            "exam": batch.exam,
            "year": batch.year,
            "paper": batch.paper
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in upload: {e}", exc_info=True)
        # Clean up any uploaded files on error
        try:
            if paper_path and os.path.exists(paper_path):
                os.remove(paper_path)
            if answer_key_path and os.path.exists(answer_key_path):
                os.remove(answer_key_path)
        except:
            pass
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error during upload: {str(e)}\n\nPlease check backend logs for details."
        )

from app.services.ai_content_service import enrich_batch

@router.post("/batches/{batch_id}/run-ai")
async def trigger_ai_categorization(
    batch_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user: UserDb = Depends(get_current_admin_user)
):
    """
    Manually triggers AI categorization for perfectly structured questions in a batch.
    """
    batch = await ingestion_repo.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    logger.info(f"Manually triggering AI enrichment for batch {batch_id}")
    asyncio.create_task(enrich_batch(batch_id))
    
    return {"message": "AI Categorization started successfully"}


@router.get("/batches/{batch_id}")
async def get_batch_status(
    batch_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user: UserDb = Depends(get_current_admin_user)
):
    batch, questions = await ingestion_repo.get_batch_with_questions(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    return {
        "id": batch.id,
        "exam": batch.exam,
        "year": batch.year,
        "paper": batch.paper,
        "status": batch.status,
        "total_questions": batch.total_questions,
        "error_log": batch.error_log,
        "parsed_questions_count": len(questions)
    }

@router.get("/batches/{batch_id}/staged")
async def get_staged_questions(
    batch_id: UUID,
    status: Optional[ReviewStatus] = None,
    db: AsyncSession = Depends(get_db),
    admin_user: UserDb = Depends(get_current_admin_user)
):
    stmt = select(StagedQuestionDb).where(sa_col(StagedQuestionDb.batch_id) == batch_id)
    if status:
        stmt = stmt.where(sa_col(StagedQuestionDb.review_status) == status)
    stmt = stmt.order_by(sa_col(StagedQuestionDb.question_number))
    
    result = await db.execute(stmt)
    questions = result.scalars().all()
    return questions

@router.patch("/staged/{staged_id}")
async def update_staged_question(
    staged_id: UUID,
    update_data: StagedQuestionUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: UserDb = Depends(get_current_admin_user)
):
    update_dict = update_data.model_dump(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No valid fields to update")
        
    updated = await ingestion_repo.update_staged_question(db, staged_id, **update_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Staged question not found")
        
    return updated

class BulkApproveRequest(BaseModel):
    ids: list[UUID]

@router.post("/staged/bulk-approve")
async def bulk_approve_staged(
    body: BulkApproveRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: UserDb = Depends(get_current_admin_user),
):
    """Set review_status = approved for all given staged question IDs in one query."""
    from sqlalchemy import update as sa_update
    from app.models.ingestion import StagedQuestionDb as _SQ
    stmt = (
        sa_update(_SQ)
        .where(sa_col(_SQ.id).in_(body.ids))
        .values(review_status=ReviewStatus.approved)
    )
    await db.execute(stmt)
    await db.commit()
    return {"approved_count": len(body.ids)}

class BulkUpdateRequest(BaseModel):
    ids: list[UUID]
    subject_id: Optional[UUID] = None
    topic_id: Optional[UUID] = None
    subtopic_id: Optional[UUID] = None

@router.post("/staged/bulk-update")
async def bulk_update_staged(
    body: BulkUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: UserDb = Depends(get_current_admin_user),
):
    """Update taxonomy for all given staged question IDs in one query."""
    from sqlalchemy import update as sa_update
    from app.models.ingestion import StagedQuestionDb as _SQ
    
    values = {}
    if body.subject_id is not None:
        values['subject_id'] = body.subject_id
    if body.topic_id is not None:
        values['topic_id'] = body.topic_id
    if body.subtopic_id is not None:
        values['subtopic_id'] = body.subtopic_id
        
    if not values:
        return {"updated_count": 0}

    stmt = (
        sa_update(_SQ)
        .where(sa_col(_SQ.id).in_(body.ids))
        .values(**values)
    )
    await db.execute(stmt)
    await db.commit()
    return {"updated_count": len(body.ids)}

class PublishRequest(BaseModel):
    force_publish_ids: list[UUID] = []

@router.post("/batches/{batch_id}/publish")
async def publish_batch(
    batch_id: UUID,
    body: Optional[PublishRequest] = None,
    db: AsyncSession = Depends(get_db),
    admin_user: UserDb = Depends(get_current_admin_user)
):
    """
    Publish all approved questions that are ready.
    - Questions missing taxonomy or correct_option are skipped and returned as invalid.
    - Duplicate questions (already in DB) are returned separately.
    - Clean questions are published immediately without waiting for duplicates.
    """
    force_publish_ids = body.force_publish_ids if body else []
    
    batch, questions = await ingestion_repo.get_batch_with_questions(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    approved_questions = [q for q in questions if q.review_status == ReviewStatus.approved]
    if not approved_questions:
        raise HTTPException(status_code=400, detail="No approved questions to publish.")

    # ── Separate valid from invalid (missing taxonomy/answer) ──
    invalid = []
    valid = []
    for q in approved_questions:
        reasons = []
        if not q.correct_option:
            reasons.append("missing correct answer")
        if not q.subtopic_id:
            reasons.append("missing Subject/Topic/Subtopic")
        if reasons:
            invalid.append({"id": str(q.id), "question_number": q.question_number, "reasons": reasons})
        else:
            valid.append(q)

    # ── Duplicate detection on valid questions only ──
    duplicates = []
    clean = []
    for q in valid:
        q_exam = q.exam if q.exam else batch.exam
        q_year = q.year if q.year else batch.year
        stem_text = q.raw_question_stem or ""

        if q.id in force_publish_ids:
            clean.append(q)
            continue

        from sqlalchemy import and_
        stmt = select(QuestionDb).where(
            and_(
                sa_col(QuestionDb.exam) == q_exam,
                sa_col(QuestionDb.year) == q_year,
                QuestionDb.question_stem['en'].astext.ilike(stem_text[:200])
            )
        )
        existing = (await db.execute(stmt)).first()
        if existing:
            duplicates.append({
                "id": str(q.id),
                "question_number": q.question_number,
                "raw_question_stem": q.raw_question_stem,
            })
            # Mark in staging so they show in the duplicates panel
            await ingestion_repo.update_staged_question(
                db, q.id,
                review_status=ReviewStatus.needs_edit,
                reviewer_notes="⚠️ Duplicate: This question is already in the database.",
            )
        else:
            clean.append(q)

    # ── Publish clean questions ──
    published_count = 0
    try:
        for q in clean:
            new_q = QuestionDb(
                subtopic_id=q.subtopic_id,
                exam=q.exam if q.exam else batch.exam,
                year=q.year if q.year else batch.year,
                paper=batch.paper,
                question_number=q.question_number,
                question_stem={"en": q.raw_question_stem},
                options=q.raw_options or {},
                correct_option=q.correct_option,
                explanation=None,
                question_type="MCQ",
                elo_rating=1500
            )
            db.add(new_q)
            await db.flush()

            log = AuditLogDb(
                admin_id=admin_user.id,
                table_name="questions",
                record_id=new_q.id,
                action="ingest_publish",
                new_payload={"staged_question_id": str(q.id)}
            )
            db.add(log)

            # Remove from staging
            await db.delete(q)
            published_count += 1

        await db.commit()

        if published_count > 0:
            from app.services.search_service import clear_search_cache
            clear_search_cache()

    except Exception as e:
        import traceback as tb
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Database error during publish: {str(e)}\n{tb.format_exc()}"
        )

    return {
        "published_count": published_count,
        "duplicates": duplicates,
        "invalid": invalid,
        "message": f"Published {published_count} questions."
        + (f" {len(duplicates)} duplicates need review." if duplicates else "")
        + (f" {len(invalid)} questions missing taxonomy/answer." if invalid else ""),
    }


@router.post("/staged/bulk-reject")
async def bulk_reject_staged(
    body: BulkApproveRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: UserDb = Depends(get_current_admin_user),
):
    """Reject (remove from publish queue) all given staged question IDs."""
    from sqlalchemy import update as sa_update
    from app.models.ingestion import StagedQuestionDb as _SQ
    stmt = (
        sa_update(_SQ)
        .where(sa_col(_SQ.id).in_(body.ids))
        .values(review_status=ReviewStatus.rejected)
    )
    await db.execute(stmt)
    await db.commit()
    return {"rejected_count": len(body.ids)}
