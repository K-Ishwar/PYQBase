import os
import shutil
import logging
from typing import Optional
from uuid import UUID

import asyncio
from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_admin_user as get_current_admin_user
from app.models.user import UserDb
from app.models.ingestion import IngestionStatus, ReviewStatus, StagedQuestionDb
from app.models.question import QuestionDb
from app.models.audit_log import AuditLogDb
from app.repositories import ingestion_repo
from app.services.ingestion_service import process_ingestion_batch
from app.schemas.ingestion import StagedQuestionUpdate
from sqlalchemy import select

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
    paper_file: UploadFile = File(...),
    answer_key_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin_user: UserDb = Depends(get_current_admin_user)
):
    """
    Upload a question paper for bulk ingestion.
    
    Errors that can occur:
    - 400: Invalid file format
    - 401: Not authenticated as admin
    - 500: Server error (file I/O, database, etc.)
    """
    try:
        # Log the upload attempt
        logger.info(f"Upload attempt: exam={exam}, year={year}, paper={paper_metadata}, user={admin_user.email}")
        
        # Validate file exists and has content
        if not paper_file or not paper_file.filename:
            raise HTTPException(
                status_code=400,
                detail="Paper file is required"
            )
        
        # Validate file extensions
        allowed_extensions = {'.md', '.pdf', '.txt'}
        paper_ext = os.path.splitext(paper_file.filename)[1].lower()
        if paper_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid paper file format '{paper_ext}'. Allowed formats: {', '.join(allowed_extensions)}"
            )
        
        if answer_key_file and answer_key_file.filename:
            answer_ext = os.path.splitext(answer_key_file.filename)[1].lower()
            if answer_ext not in allowed_extensions:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid answer key file format '{answer_ext}'. Allowed formats: {', '.join(allowed_extensions)}"
                )
        
        # Ensure upload directory exists
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        logger.info(f"Upload directory: {UPLOAD_DIR}")
        
        # Save uploaded files temporarily
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
                source_filename=paper_file.filename,
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
            if 'paper_path' in locals() and os.path.exists(paper_path):
                os.remove(paper_path)
            if 'answer_key_path' in locals() and answer_key_path and os.path.exists(answer_key_path):
                os.remove(answer_key_path)
        except:
            pass
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error during upload: {str(e)}\n\nPlease check backend logs for details."
        )


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
    stmt = select(StagedQuestionDb).where(StagedQuestionDb.batch_id == batch_id)
    if status:
        stmt = stmt.where(StagedQuestionDb.review_status == status)
    stmt = stmt.order_by(StagedQuestionDb.question_number)
    
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
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No valid fields to update")
        
    updated = await ingestion_repo.update_staged_question(db, staged_id, **update_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Staged question not found")
        
    return updated

@router.post("/batches/{batch_id}/publish")
async def publish_batch(
    batch_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user: UserDb = Depends(get_current_admin_user)
):
    batch, questions = await ingestion_repo.get_batch_with_questions(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    # Validation: Check if ANY row prevents publishing
    for q in questions:
        if q.correct_option is None:
            raise HTTPException(status_code=400, detail=f"Cannot publish: Question {q.question_number} is missing a correct option.")
        if q.parse_confidence < 0.90 and q.review_status != ReviewStatus.approved:
            raise HTTPException(status_code=400, detail=f"Cannot publish: Low-confidence question {q.question_number} must be explicitly approved.")
            
    published_count = 0
    for q in questions:
        if q.review_status == ReviewStatus.approved:
            # 1. Create Question
            new_q = QuestionDb(
                subtopic_id=q.subtopic_id,
                exam=q.exam if q.exam else batch.exam,
                year=q.year if q.year else batch.year,
                paper=batch.paper,
                question_number=q.question_number,
                question_stem=q.paraphrased_stem.get('en') if q.paraphrased_stem else {"en": q.raw_question_stem},
                options=q.paraphrased_options.get('en') if q.paraphrased_options else q.raw_options,
                correct_option=q.correct_option,
                explanation=q.ai_explanation.get('en') if q.ai_explanation else None,
                question_type="MCQ",
                elo_rating=1500
            )
            db.add(new_q)
            await db.flush()  # To get the new_q.id
            
            # 2. Create Audit Log
            log = AuditLogDb(
                admin_id=admin_user.id,
                table_name="questions",
                record_id=new_q.id,
                action="ingest_publish",
                new_payload={"staged_question_id": str(q.id)}
            )
            db.add(log)
            published_count += 1
            
    # Mark batch as completed
    batch.status = IngestionStatus.completed
    await db.commit()
    
    return {"message": f"Successfully published {published_count} questions.", "published_count": published_count}

