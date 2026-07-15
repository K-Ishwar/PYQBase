import asyncio
import os
import sys
import json
import re

from uuid import uuid4
from dotenv import load_dotenv

# Bypass PGbouncer connection limits by using DIRECT_URL if available
load_dotenv()
if "DIRECT_URL" in os.environ:
    direct_url = os.environ.get("DIRECT_URL")
    if direct_url and direct_url.startswith("postgres"):
        os.environ["DATABASE_URL"] = direct_url

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from app.core.database import async_session_maker
from app.models.taxonomy import SubjectDb, TopicDb, SubtopicDb
from app.models.question import QuestionDb
from app.models.ingestion import StagedQuestionDb

def parse_taxonomy(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]

    taxonomy = {}
    current_subject = None
    current_topic = None

    for line in lines:
        if line.startswith("Comprehensive ") and "Taxonomy" in line:
            subject_name = line.replace("Comprehensive ", "").replace(" Taxonomy", "").strip()
            current_subject = subject_name
            taxonomy[current_subject] = {}
            current_topic = None
            continue
            
        if line in ["Physical Geography", "Indian Geography", "World Geography", "Map-Based Geography", "Ancient Indian History", "Medieval Indian History", "Transition to Modern India", "British Administration & National Awakening", "Indian National Movement", "Physics", "Chemistry", "Biology"]:
            continue

        if line.startswith("•") or line.startswith("○") or line.startswith("■"):
            subtopic_name = line.lstrip("•○■ ").strip()
            if current_subject and current_topic:
                if subtopic_name not in taxonomy[current_subject][current_topic]:
                    taxonomy[current_subject][current_topic].append(subtopic_name)
            continue
            
        topic_name = re.sub(r'^\d+\.\s*', '', line).strip()
        if current_subject:
            current_topic = topic_name
            if current_topic not in taxonomy[current_subject]:
                taxonomy[current_subject][current_topic] = []

    return taxonomy

async def wipe_and_import():
    t = parse_taxonomy("raw_taxonomy.txt")
    
    async with async_session_maker() as db:
        print("Creating 'Uncategorized' taxonomy placeholder...")
        
        # 1. Create or get "Uncategorized" Subject, Topic, Subtopic
        res = await db.execute(select(SubjectDb).where(SubjectDb.name == "Uncategorized"))
        uncat_subj = res.scalar_one_or_none()
        if not uncat_subj:
            uncat_subj = SubjectDb(name="Uncategorized")
            db.add(uncat_subj)
            await db.commit()
            await db.refresh(uncat_subj)
            
        res = await db.execute(select(TopicDb).where(TopicDb.subject_id == uncat_subj.id).where(TopicDb.name == "Uncategorized"))
        uncat_topic = res.scalar_one_or_none()
        if not uncat_topic:
            uncat_topic = TopicDb(subject_id=uncat_subj.id, name="Uncategorized")
            db.add(uncat_topic)
            await db.commit()
            await db.refresh(uncat_topic)
            
        res = await db.execute(select(SubtopicDb).where(SubtopicDb.topic_id == uncat_topic.id).where(SubtopicDb.name == "Uncategorized"))
        uncat_sub = res.scalar_one_or_none()
        if not uncat_sub:
            uncat_sub = SubtopicDb(topic_id=uncat_topic.id, name="Uncategorized")
            db.add(uncat_sub)
            await db.commit()
            await db.refresh(uncat_sub)

        print("Reassigning existing questions to 'Uncategorized'...")
        # 2. Re-assign all existing questions/staged_questions to "Uncategorized" so we can safely delete the old taxonomy
        await db.execute(update(StagedQuestionDb).values(
            subject_id=uncat_subj.id,
            topic_id=uncat_topic.id,
            subtopic_id=uncat_sub.id
        ))
        await db.execute(update(QuestionDb).values(
            subtopic_id=uncat_sub.id
        ))
        await db.commit()
        
        print("Wiping old taxonomy...")
        # 3. Delete all old taxonomy except "Uncategorized"
        await db.execute(delete(SubtopicDb).where(SubtopicDb.id != uncat_sub.id))
        await db.execute(delete(TopicDb).where(TopicDb.id != uncat_topic.id))
        await db.execute(delete(SubjectDb).where(SubjectDb.id != uncat_subj.id))
        await db.commit()
        
        print("Importing new taxonomy...")
        # 4. Insert new taxonomy
        for subj_name, topics in t.items():
            print(f"Adding Subject: {subj_name}...")
            
            # Avoid inserting duplicate subjects if something went wrong
            res = await db.execute(select(SubjectDb).where(SubjectDb.name == subj_name))
            subj = res.scalar_one_or_none()
            if not subj:
                subj = SubjectDb(name=subj_name)
                db.add(subj)
                await db.flush()
            
            for top_name, subtopics in topics.items():
                top = TopicDb(subject_id=subj.id, name=top_name)
                db.add(top)
                await db.flush()
                
                # Some topics might not have explicit subtopics in the PDF.
                # If so, create a default subtopic with "General"
                if not subtopics:
                    subtopics = ["General"]
                    
                for sub_name in subtopics:
                    subt = SubtopicDb(topic_id=top.id, name=sub_name)
                    db.add(subt)
                    
            await db.commit()
            
        print("Taxonomy successfully imported!")

if __name__ == "__main__":
    asyncio.run(wipe_and_import())
