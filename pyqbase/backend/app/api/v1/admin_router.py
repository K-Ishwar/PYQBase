from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID, uuid4
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_admin_user, User
from app.models.question import QuestionDb, QuestionUpsertPayload, QuestionResponse
from app.models.taxonomy import (
    SubjectDb,
    SubjectCreate, SubjectResponse,
    TopicDb,
    TopicCreate, TopicResponse,
)
from app.models.audit_log import AuditLogDb
from app.repositories import question_repo, taxonomy_repo
from app.services.audit_service import log_admin_action

router = APIRouter()

@router.get("/trigger-import-taxonomy", status_code=200)
async def trigger_import_taxonomy(db: AsyncSession = Depends(get_db)):
    DATA = """
1. History
Ancient History
Medieval History
Modern History
World History
Art & Culture
Freedom Struggle
Post-Independence India
Historical Personalities
Historical Places
Architecture
Literature History
Religion & Philosophy
Archaeology
Historiography
2. Geography
Physical Geography
Geomorphology
Climatology
Oceanography
Biogeography
Environmental Geography
Indian Geography
Physiography
Rivers
Climate
Agriculture
Industries
Resources
Population
Transport
Energy
Disaster Geography
World Geography
Continents
Countries
Capitals
Maps
Important Locations
3. Indian Polity
Constitution
Preamble
Fundamental Rights
DPSP
Fundamental Duties
Parliament
State Legislature
President
Vice President
Prime Minister
Governor
Judiciary
Supreme Court
High Court
Constitutional Bodies
Statutory Bodies
Local Government
Elections
Political Parties
Emergency Provisions
Constitutional Amendments
Schedules
Union-State Relations
Panchayati Raj
Governance
Public Policy
4. Economy
Basic Economics
National Income
Inflation
Banking
RBI
Monetary Policy
Fiscal Policy
Budget
Taxation
Public Finance
Agriculture Economics
External Sector
International Trade
WTO
IMF
World Bank
Poverty
Employment
Infrastructure
Economic Survey
Five-Year Plans
NITI Aayog
Industry
MSME
Stock Market
Financial Markets
Insurance
Digital Economy
5. Science
Physics
Mechanics
Heat
Light
Sound
Electricity
Magnetism
Modern Physics
Electronics
Chemistry
Physical Chemistry
Organic Chemistry
Inorganic Chemistry
Everyday Chemistry
Biology
Cell Biology
Genetics
Human Physiology
Plant Physiology
Ecology
Biotechnology
Zoology
Botany
Microbiology
Diseases
Nutrition
6. Environment & Ecology
Ecology
Ecosystem
Biodiversity
Climate Change
Pollution
Wildlife
National Parks
Biosphere Reserves
Ramsar Sites
Conservation
Environmental Laws
Sustainable Development
International Conventions
7. Science & Technology
Space Technology
Defence Technology
Biotechnology
Nanotechnology
Artificial Intelligence
Robotics
Quantum Technology
Semiconductors
Nuclear Technology
Information Technology
Internet
Cyber Security
Communication Technology
8. Current Affairs
National
International
Economy
Science
Environment
Awards
Sports
Books
Reports
Summits
Government Schemes
Personalities
Important Days
9. International Relations
International Organizations
Bilateral Relations
Global Issues
International Treaties
Regional Organizations
Geopolitics
10. Agriculture
Crops
Irrigation
Soil
Fertilizers
Animal Husbandry
Fisheries
Horticulture
Agricultural Schemes
Agricultural Economics
11. Disaster Management
Natural Disasters
Man-made Disasters
Disaster Management Act
NDMA
Preparedness
Climate Risks
12. Internal Security
Terrorism
Left Wing Extremism
Cyber Security
Border Security
Intelligence Agencies
Organized Crime
Money Laundering
Coastal Security
13. Ethics (UPSC GS-4)
Ethics
Integrity
Aptitude
Emotional Intelligence
Probity
Civil Service Values
Case Studies
14. General Science
Everyday Science
Scientific Instruments
Inventions
Discoveries
Nobel Prizes
15. Computer
Hardware
Software
Operating System
MS Office
Internet
Networking
Database
Programming Basics
Cyber Security
Computer Abbreviations
16. Mathematics
Arithmetic
Number System
Simplification
Percentage
Profit & Loss
Simple Interest
Compound Interest
Ratio
Proportion
Average
Partnership
Time & Work
Pipes & Cistern
Time Speed Distance
Boat & Stream
Mixture
Ages
Advanced Math
Algebra
Geometry
Mensuration
Trigonometry
Coordinate Geometry
Statistics
17. Reasoning
Verbal
Analogy
Classification
Coding Decoding
Blood Relations
Direction Sense
Syllogism
Statement Conclusion
Seating Arrangement
Ranking
Alphabet
Puzzle
Non-Verbal
Mirror Image
Paper Folding
Figure Series
Embedded Figures
18. English
Grammar
Parts of Speech
Tenses
Voice
Narration
Articles
Prepositions
Conjunctions
Subject Verb Agreement
Vocabulary
Synonyms
Antonyms
Idioms
Phrases
One Word Substitution
Spelling
Homophones
Comprehension
Reading Comprehension
Cloze Test
Para Jumbles
Sentence Improvement
Error Detection
19. Hindi / Marathi / Regional Language
Grammar
Vocabulary
Comprehension
Literature
20. General Knowledge
Awards
Books
Sports
Important Days
Personalities
Organizations
Miscellaneous Facts
21. Defence
Indian Army
Indian Navy
Indian Air Force
DRDO
Missiles
Exercises
Ranks
Commands
22. Government Schemes
Social Welfare
Health
Education
Agriculture
Women & Child
Infrastructure
Skill Development
23. Aptitude
Logical Aptitude
Numerical Aptitude
Data Interpretation
Analytical Aptitude
24. Data Interpretation
Tables
Pie Charts
Line Graphs
Bar Graphs
Mixed Graphs
Caselets
25. Statistics
Mean
Median
Mode
Probability
Permutation & Combination
Standard Deviation
26. Commerce (Some State Exams)
Accounting
Business Studies
Finance
Auditing
Cost Accounting
27. Law
Constitutional Law
Criminal Law
Civil Law
IPC/BNS
CrPC/BNSS
Evidence Act
Contract Act
28. Public Administration
Administration
Governance
Accountability
Civil Services
Administrative Thinkers
29. Sociology
Society
Social Institutions
Social Change
Stratification
Thinkers
30. Psychology
Learning
Intelligence
Personality
Motivation
Perception
31. Philosophy
Indian Philosophy
Western Philosophy
Logic
Ethics
32. Miscellaneous
Mixed Questions
Assertion–Reason
Match the Following
Chronology
Statement Based
Map Based
Picture Based
Data Based
Passage Based
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text
from app.core.config import settings

async def background_import_taxonomy():
    try:
        engine = create_async_engine(settings.direct_database_url, echo=False)
        async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        async with async_session() as db:
            lines = [l.strip() for l in DATA.splitlines() if l.strip()]
            current_subject_id = None
            
            for line in lines:
                if line[0].isdigit() and ". " in line:
                    subj_name = line.split(". ", 1)[1].strip()
                    res = await db.execute(
                        text("INSERT INTO subjects (id, name) VALUES (gen_random_uuid(), :name) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id"),
                        {"name": subj_name}
                    )
                    current_subject_id = res.scalar()
                else:
                    if not current_subject_id:
                        continue
                    
                    topic_name = line.strip()
                    res = await db.execute(
                        text("""
                            INSERT INTO topics (id, subject_id, name) 
                            VALUES (gen_random_uuid(), :sid, :name) 
                            ON CONFLICT DO NOTHING 
                            RETURNING id
                        """),
                        {"sid": current_subject_id, "name": topic_name}
                    )
                    topic_id = res.scalar()
                    
                    if not topic_id:
                        res = await db.execute(
                            text("SELECT id FROM topics WHERE subject_id = :sid AND name = :name"),
                            {"sid": current_subject_id, "name": topic_name}
                        )
                        topic_id = res.scalar()
                        
                    await db.execute(
                        text("""
                            INSERT INTO subtopics (id, topic_id, name) 
                            VALUES (gen_random_uuid(), :tid, :name) 
                            ON CONFLICT DO NOTHING
                        """),
                        {"tid": topic_id, "name": topic_name}
                    )
                        
            await db.commit()
            with open("import_result.txt", "w") as f:
                f.write("SUCCESS")
    except Exception as e:
        import traceback
        with open("import_result.txt", "w") as f:
            f.write(traceback.format_exc())


from fastapi import BackgroundTasks

@router.get("/trigger-import-taxonomy", status_code=200)
async def trigger_import_taxonomy(background_tasks: BackgroundTasks):
    background_tasks.add_task(background_import_taxonomy)
    return {"message": "import started in background"}


class AdminStatsResponse(BaseModel):
    total_questions: int
    total_subjects: int
    total_audit_logs: int

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    total_questions = await db.scalar(select(func.count()).select_from(QuestionDb)) or 0
    total_subjects = await db.scalar(select(func.count()).select_from(SubjectDb)) or 0
    total_audit_logs = await db.scalar(select(func.count()).select_from(AuditLogDb)) or 0

    return AdminStatsResponse(
        total_questions=total_questions,
        total_subjects=total_subjects,
        total_audit_logs=total_audit_logs
    )



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
        "topic_id": str(question.topic_id),
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


class BulkDeletePayload(BaseModel):
    question_ids: list[UUID]

@router.delete("/questions/bulk", status_code=204)
async def bulk_delete_questions(
    payload: BulkDeletePayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Delete multiple questions (admin only)."""
    deleted_count = await question_repo.delete_questions(db, payload.question_ids)
    
    # Write audit log for each deleted question
    for q_id in payload.question_ids:
        await log_admin_action(
            db=db,
            admin_id=admin.id,
            table_name="questions",
            record_id=q_id,
            action="DELETE"
        )
    return


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
# USERS
# ──────────────────────────────────────────────────────────────────────────────

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from sqlalchemy import select, func, cast, String

class UserResponse(BaseModel):
    id: UUID
    email: str
    role: str
    subscription_status: str
    trial_ends_at: Optional[datetime]
    created_at: datetime

class UserStatsResponse(BaseModel):
    total_users: int
    subscribed_users: int
    admin_users: int

@router.get("/users/stats", response_model=UserStatsResponse)
async def get_user_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    from app.models.user import UserDb
    
    total = await db.scalar(select(func.count(UserDb.id)))
    subscribed = await db.scalar(select(func.count(UserDb.id)).where(cast(UserDb.subscription_status, String) == "premium"))
    admins = await db.scalar(select(func.count(UserDb.id)).where(cast(UserDb.role, String) == "admin"))
    
    return UserStatsResponse(
        total_users=total or 0,
        subscribed_users=subscribed or 0,
        admin_users=admins or 0,
    )

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    from app.models.user import UserDb
    
    result = await db.execute(select(UserDb).order_by(UserDb.created_at.desc()).limit(limit).offset(offset))
    users = result.scalars().all()
    
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            role=u.role,
            subscription_status=u.subscription_status,
            trial_ends_at=u.trial_ends_at,
            created_at=u.created_at,
        )
        for u in users
    ]

@router.get("/test-query")
async def test_query(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    try:
        # Get distinct taxonomy used by questions
        res = await db.execute(text("""
            SELECT q.subject_id, s.name as subject, q.topic_id, t.name as topic, q.subtopic_id, st.name as subtopic, COUNT(q.id) as q_count
            FROM questions q
            LEFT JOIN subjects s ON q.subject_id = s.id
            LEFT JOIN topics t ON q.topic_id = t.id
            LEFT JOIN subtopics st ON q.subtopic_id = st.id
            GROUP BY q.subject_id, s.name, q.topic_id, t.name, q.subtopic_id, st.name
            ORDER BY s.name
        """))
        return {"data": [dict(row._mapping) for row in res]}
    except Exception as e:
        return {"error": str(e)}
