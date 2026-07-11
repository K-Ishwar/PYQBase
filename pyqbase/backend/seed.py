import asyncio
from sqlalchemy import text
from app.core.database import async_session_maker
import json

async def seed():
    async with async_session_maker() as session:
        # Subject
        res = await session.execute(text("INSERT INTO subjects (name) VALUES ('Geography') RETURNING id"))
        subject_id = res.scalar()
        
        # Topic
        res = await session.execute(text("INSERT INTO topics (subject_id, name) VALUES (:sid, 'Climatology') RETURNING id"), {"sid": subject_id})
        topic_id = res.scalar()
        
        # Subtopic
        res = await session.execute(text("INSERT INTO subtopics (topic_id, name) VALUES (:tid, 'El Nino') RETURNING id"), {"tid": topic_id})
        subtopic_id = res.scalar()
        
        # Question
        stem = json.dumps({"en": "What is El Nino?"})
        opts = json.dumps({"A": "A warm ocean current", "B": "A cold ocean current", "C": "A wind system", "D": "A mountain"})
        
        await session.execute(text("""
            INSERT INTO questions (exam, year, paper, question_number, question_stem, options, correct_option, question_type, has_image, subtopic_id)
            VALUES ('UPSC', 2024, 'GS1', 1, :stem, :opts, 'A', 'MCQ', false, :sub_id)
        """), {
            "stem": stem,
            "opts": opts,
            "sub_id": subtopic_id
        })
        
        await session.commit()
        
        # Refresh heatmap
        conn = await session.connection()
        raw_conn = await conn.get_raw_connection()
        await raw_conn.driver_connection.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY topic_heatmap")
        
        print(f"Seed complete. Subject ID: {subject_id}, Topic ID: {topic_id}")

if __name__ == "__main__":
    asyncio.run(seed())
