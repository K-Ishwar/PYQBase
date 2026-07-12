import os
import shutil
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile, Form, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_admin_user
from app.models.user import UserDb
from app.models.ingestion import IngestionStatus, ReviewStatus, StagedQuestionDb
from app.models.question import QuestionDb, QuestionType
from app.models.solution import SolutionDb
from app.models.audit_log import AuditLogDb
from app.repositories import ingestion_repo
from app.services.ingestion_service import process_ingestion_batch
from app.schemas.ingestion import StagedQuestionUpdate
from sqlalchemy import select

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_paper(
    background_tasks: BackgroundTasks,
    exam: str = Form(...),
    year: int = Form(...),
    paper_metadata: str = Form(..., alias="paper"),
    paper_file: UploadFile = File(...),
    answer_key_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin_user: UserDb = Depends(get_current_admin_user)
):
    # Save uploaded files temporarily
    paper_path = os.path.join(UPLOAD_DIR, paper_file.filename)
    with open(paper_path, "wb") as buffer:
        shutil.copyfileobj(paper_file.file, buffer)
        
    answer_key_path = None
    if answer_key_file:
        answer_key_path = os.path.join(UPLOAD_DIR, answer_key_file.filename)
        with open(answer_key_path, "wb") as buffer:
            shutil.copyfileobj(answer_key_file.file, buffer)
            
    # Create DB batch
    batch = await ingestion_repo.create_batch(
        db=db,
        uploaded_by=admin_user.id,
        exam=exam,
        year=year,
        paper=paper_metadata,
        source_filename=paper_file.filename,
        answer_key_filename=answer_key_file.filename if answer_key_file else None
    )
    
    # Trigger background parsing task
    background_tasks.add_task(
        process_ingestion_batch,
        batch.id,
        paper_path,
        answer_key_path
    )
    
    return {"message": "Upload successful, parsing started.", "batch_id": batch.id, "status": batch.status}


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
                subject_id=q.subject_id,
                topic_id=q.topic_id,
                subtopic_id=q.subtopic_id,
                exam=batch.exam,
                year=batch.year,
                paper=batch.paper,
                question_number=q.question_number,
                question_stem=q.paraphrased_stem.get('en') if q.paraphrased_stem else q.raw_question_stem,
                options=q.paraphrased_options.get('en') if q.paraphrased_options else q.raw_options,
                question_type=QuestionType.MULTIPLE_CHOICE,
                difficulty_level="medium",
                elo_rating=1500.0
            )
            db.add(new_q)
            await db.flush() # To get the new_q.id
            
            # 2. Create Solution
            new_sol = SolutionDb(
                question_id=new_q.id,
                correct_option=q.correct_option,
                explanation=q.ai_explanation.get('en') if q.ai_explanation else None
            )
            db.add(new_sol)
            
            # 3. Create Audit Log
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

