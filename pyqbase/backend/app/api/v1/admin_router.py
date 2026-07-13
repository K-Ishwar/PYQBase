from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID, uuid4

from app.core.database import get_db
from app.core.security import get_admin_user, User
from app.models.question import QuestionUpsertPayload, QuestionResponse
from app.models.taxonomy import (
    SubjectCreate, SubjectResponse,
    TopicCreate, TopicResponse,
    SubtopicCreate, SubtopicResponse,
)
from app.repositories import question_repo, taxonomy_repo
from app.services.audit_service import log_admin_action

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# QUESTIONS
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/questions", response_model=list[QuestionResponse])
async def list_questions(
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """List all questions (admin only)."""
    questions = await question_repo.list_questions(db, limit=limit, offset=offset)
    return questions


@router.put("/questions/{question_id}", response_model=QuestionResponse, status_code=200)
async def upsert_question(
    question_id: UUID,
    payload: QuestionUpsertPayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    Create or update a question (admin only).
    Enforces BR-04: parse_confidence >= 0.90 or manual_review_approved=True.
    Records every write in audit_logs.
    """
    # Fetch existing for audit snapshot
    existing = await question_repo.get_question_by_id(db, question_id)
    previous_payload = (
        {
            "exam": existing.exam,
            "year": existing.year,
            "question_stem": existing.question_stem,
            "correct_option": existing.correct_option,
        }
        if existing
        else None
    )

    question, is_new = await question_repo.upsert_question(db, question_id, payload)

    new_payload = {
        "exam": question.exam,
        "year": question.year,
        "question_stem": question.question_stem,
        "correct_option": question.correct_option,
        "subtopic_id": str(question.subtopic_id),
    }

    # Write immutable audit log
    await log_admin_action(
        db=db,
        admin_id=admin.id,
        table_name="questions",
        record_id=question.id,
        action="CREATE" if is_new else "UPDATE",
        previous_payload=previous_payload,
        new_payload=new_payload,
    )

    return question


# ──────────────────────────────────────────────────────────────────────────────
# TAXONOMY — SUBJECTS
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/subjects", response_model=list[SubjectResponse])
async def list_subjects(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    return await taxonomy_repo.list_subjects(db)


@router.post("/subjects", response_model=SubjectResponse, status_code=201)
async def create_subject(
    payload: SubjectCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    subject = await taxonomy_repo.get_or_create_subject(db, payload.name)
    await log_admin_action(db, admin.id, "subjects", subject.id, "CREATE_OR_GET",
                           new_payload={"name": subject.name})
    return subject


@router.delete("/subjects/{subject_id}", status_code=204)
async def delete_subject(
    subject_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    deleted = await taxonomy_repo.delete_subject(db, subject_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Subject not found")
    await log_admin_action(db, admin.id, "subjects", subject_id, "DELETE")


# ──────────────────────────────────────────────────────────────────────────────
# TAXONOMY — TOPICS
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/subjects/{subject_id}/topics", response_model=list[TopicResponse])
async def list_topics(
    subject_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    return await taxonomy_repo.list_topics(db, subject_id)


@router.post("/subjects/{subject_id}/topics", response_model=TopicResponse, status_code=201)
async def create_topic(
    subject_id: UUID,
    payload: TopicCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    topic = await taxonomy_repo.get_or_create_topic(db, subject_id, payload.name)
    await log_admin_action(db, admin.id, "topics", topic.id, "CREATE_OR_GET",
                           new_payload={"name": topic.name, "subject_id": str(subject_id)})
    return topic


@router.delete("/topics/{topic_id}", status_code=204)
async def delete_topic(
    topic_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    deleted = await taxonomy_repo.delete_topic(db, topic_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Topic not found")
    await log_admin_action(db, admin.id, "topics", topic_id, "DELETE")


# ──────────────────────────────────────────────────────────────────────────────
# TAXONOMY — SUBTOPICS
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/topics/{topic_id}/subtopics", response_model=list[SubtopicResponse])
async def list_subtopics(
    topic_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    return await taxonomy_repo.list_subtopics(db, topic_id)


@router.post("/topics/{topic_id}/subtopics", response_model=SubtopicResponse, status_code=201)
async def create_subtopic(
    topic_id: UUID,
    payload: SubtopicCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    subtopic = await taxonomy_repo.get_or_create_subtopic(db, topic_id, payload.name)
    await log_admin_action(db, admin.id, "subtopics", subtopic.id, "CREATE_OR_GET",
                           new_payload={"name": subtopic.name, "topic_id": str(topic_id)})
    return subtopic


@router.delete("/subtopics/{subtopic_id}", status_code=204)
async def delete_subtopic(
    subtopic_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    deleted = await taxonomy_repo.delete_subtopic(db, subtopic_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Subtopic not found")
    await log_admin_action(db, admin.id, "subtopics", subtopic_id, "DELETE")
