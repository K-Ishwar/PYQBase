import asyncio
import sys
import os

# Add the backend root directory to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import async_session_maker
from app.repositories import taxonomy_repo

TAXONOMY_DATA = {
    "History": [
        "Ancient India",
        "Medieval India",
        "Modern India",
        "World History",
        "Art and Culture",
        "Freedom Struggle"
    ],
    "Geography": [
        "Physical Geography",
        "Indian Geography",
        "World Geography",
        "Human and Economic Geography",
        "Climatology and Oceanography"
    ],
    "Polity": [
        "Indian Constitution",
        "Fundamental Rights and Duties",
        "Parliament and State Legislature",
        "Judiciary",
        "Local Government (Panchayati Raj)",
        "Constitutional and Non-Constitutional Bodies"
    ],
    "Economy": [
        "Macroeconomics",
        "Indian Economy Overview",
        "Agriculture and Industry",
        "Banking and Finance",
        "Taxation and Budget",
        "International Trade and Organizations",
        "Poverty and Unemployment"
    ],
    "Science & Technology": [
        "Physics",
        "Chemistry",
        "Biology",
        "Space Technology",
        "IT and Computers",
        "Defense Technology",
        "Biotechnology and Health"
    ],
    "Environment & Ecology": [
        "Ecology and Ecosystems",
        "Biodiversity and Conservation",
        "Climate Change",
        "Environmental Pollution",
        "Environmental Treaties and Conventions"
    ],
    "Quantitative Aptitude": [
        "Number System",
        "Algebra",
        "Geometry and Mensuration",
        "Trigonometry",
        "Data Interpretation",
        "Arithmetic (Percentages, Profit/Loss, Interest)",
        "Time, Speed, Distance, and Work"
    ],
    "Logical Reasoning": [
        "Verbal Reasoning",
        "Non-Verbal Reasoning",
        "Analytical Reasoning",
        "Syllogism",
        "Blood Relations",
        "Coding-Decoding",
        "Seating Arrangement"
    ],
    "English Language & Comprehension": [
        "Reading Comprehension",
        "Grammar and Syntax",
        "Vocabulary (Synonyms, Antonyms)",
        "Idioms and Phrases",
        "Error Spotting",
        "Sentence Rearrangement"
    ],
    "Current Affairs & General Knowledge": [
        "National Events",
        "International Events",
        "Sports",
        "Awards and Honors",
        "Books and Authors",
        "Important Days and Themes",
        "Government Schemes"
    ]
}

async def seed_taxonomy():
    print("🌱 Starting massive taxonomy seed for UPSC, SSC, MPSC, etc...")
    async with async_session_maker() as db:
        total_subjects = 0
        total_topics = 0
        
        for subject_name, topics in TAXONOMY_DATA.items():
            # Get or create subject
            subject = await taxonomy_repo.get_or_create_subject(db, subject_name)
            total_subjects += 1
            print(f"✅ Added Subject: {subject_name}")
            
            for topic_name in topics:
                # Get or create topic
                await taxonomy_repo.get_or_create_topic(db, subject.id, topic_name)
                total_topics += 1
                print(f"    ↳ Added Topic: {topic_name}")
                
        print("\n🎉 Seed complete!")
        print(f"Created/Verified {total_subjects} Subjects and {total_topics} Topics.")

if __name__ == "__main__":
    asyncio.run(seed_taxonomy())
