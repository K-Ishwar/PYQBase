import asyncio
import csv
import argparse
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

import sys
import os

# Add the parent directory to sys.path so we can import 'app'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import engine
from app.models.taxonomy import SubjectDb, TopicDb, SubtopicDb
from app.models.question import QuestionDb, QuestionType
from app.models.solution import SolutionDb
from app.repositories import taxonomy_repo

async def get_or_create_subject(db: AsyncSession, name: str, cache: dict) -> SubjectDb:
    name = name.strip()
    if name in cache['subjects']:
        return cache['subjects'][name]
    
    # Try to fetch from DB in case it was created in a previous run
    from sqlalchemy import select
    res = await db.execute(select(SubjectDb).where(SubjectDb.name == name))
    subject = res.scalar_one_or_none()
    
    if not subject:
        subject = await taxonomy_repo.create_subject(db, name)
    
    cache['subjects'][name] = subject
    return subject

async def get_or_create_topic(db: AsyncSession, subject_id: str, name: str, cache: dict) -> TopicDb:
    name = name.strip()
    key = f"{subject_id}_{name}"
    if key in cache['topics']:
        return cache['topics'][key]
    
    from sqlalchemy import select
    res = await db.execute(select(TopicDb).where(TopicDb.subject_id == subject_id, TopicDb.name == name))
    topic = res.scalar_one_or_none()
    
    if not topic:
        topic = await taxonomy_repo.create_topic(db, subject_id, name)
        
    cache['topics'][key] = topic
    return topic

async def get_or_create_subtopic(db: AsyncSession, topic_id: str, name: str, cache: dict) -> SubtopicDb:
    name = name.strip()
    if not name:
        return None
        
    key = f"{topic_id}_{name}"
    if key in cache['subtopics']:
        return cache['subtopics'][key]
    
    from sqlalchemy import select
    res = await db.execute(select(SubtopicDb).where(SubtopicDb.topic_id == topic_id, SubtopicDb.name == name))
    subtopic = res.scalar_one_or_none()
    
    if not subtopic:
        subtopic = await taxonomy_repo.create_subtopic(db, topic_id, name)
        
    cache['subtopics'][key] = subtopic
    return subtopic

async def seed_data(csv_path: str):
    print(f"Reading data from {csv_path}...")
    if not os.path.exists(csv_path):
        print(f"Error: File {csv_path} not found.")
        return

    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    cache = {
        'subjects': {},
        'topics': {},
        'subtopics': {}
    }
    
    questions_added = 0
    
    async with AsyncSessionLocal() as db:
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                try:
                    # 1. Taxonomy
                    subject = await get_or_create_subject(db, row['subject'], cache)
                    topic = await get_or_create_topic(db, subject.id, row['topic'], cache)
                    subtopic = await get_or_create_subtopic(db, topic.id, row.get('subtopic', ''), cache)
                    
                    # 2. Options dictionary
                    options = {}
                    if row.get('option_a'): options['A'] = row['option_a'].strip()
                    if row.get('option_b'): options['B'] = row['option_b'].strip()
                    if row.get('option_c'): options['C'] = row['option_c'].strip()
                    if row.get('option_d'): options['D'] = row['option_d'].strip()
                    
                    # 3. Create Question
                    question = QuestionDb(
                        topic_id=topic.id,
                        subtopic_id=subtopic.id if subtopic else None,
                        exam=row['exam'].strip(),
                        year=int(row['year']) if row.get('year') else None,
                        paper=row.get('paper', '').strip() or None,
                        question_number=int(row['question_number']) if row.get('question_number') else None,
                        question_stem=row['question_stem'].strip(),
                        options=options,
                        question_type=QuestionType.MULTIPLE_CHOICE,
                        difficulty_level=row.get('difficulty_level', 'medium').strip().lower(),
                        elo_rating=1500.0 # Default starting ELO
                    )
                    db.add(question)
                    await db.flush() # flush to get question.id
                    
                    # 4. Create Solution
                    solution = SolutionDb(
                        question_id=question.id,
                        correct_option=row['correct_option'].strip().upper(),
                        explanation=row.get('explanation', '').strip() or None
                    )
                    db.add(solution)
                    
                    questions_added += 1
                    if questions_added % 50 == 0:
                        await db.commit()
                        print(f"Processed {questions_added} questions...")
                        
                except Exception as e:
                    print(f"Error processing row: {row}")
                    print(f"Exception: {e}")
                    await db.rollback()
                    continue
                    
        await db.commit()
        
    print(f"\n✅ Successfully seeded {questions_added} questions and solutions!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed PYQBase with questions from a CSV file.")
    parser.add_argument("csv_file", nargs='?', default="sample_pyqs.csv", help="Path to the CSV file")
    args = parser.parse_args()
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, args.csv_file)
    
    asyncio.run(seed_data(csv_path))
