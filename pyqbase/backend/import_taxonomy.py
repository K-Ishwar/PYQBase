import asyncio
from uuid import uuid4
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.models.taxonomy import SubjectDb, TopicDb, SubtopicDb

# Clean up DSN if needed (from config.py)
dsn = str(settings.DATABASE_URL)
if "?pgbouncer=true" in dsn:
    dsn = dsn.replace("?pgbouncer=true", "")

engine = create_async_engine(dsn, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

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

async def run():
    print("Starting taxonomy import...")
    lines = [l.strip() for l in DATA.splitlines() if l.strip()]
    
    async with async_session() as session:
        current_subject = None
        
        for line in lines:
            if line[0].isdigit() and ". " in line:
                # It's a subject
                subj_name = line.split(". ", 1)[1].strip()
                
                # Check if exists
                stmt = select(SubjectDb).where(SubjectDb.name == subj_name)
                res = await session.execute(stmt)
                existing_subj = res.scalar_one_or_none()
                
                if not existing_subj:
                    existing_subj = SubjectDb(name=subj_name)
                    session.add(existing_subj)
                    await session.flush()
                
                current_subject = existing_subj
                print(f"Subject: {subj_name}")
            else:
                if not current_subject:
                    continue
                
                topic_name = line.strip()
                
                # Check if topic exists for this subject
                stmt = select(TopicDb).where(TopicDb.name == topic_name, TopicDb.subject_id == current_subject.id)
                res = await session.execute(stmt)
                existing_topic = res.scalar_one_or_none()
                
                if not existing_topic:
                    existing_topic = TopicDb(subject_id=current_subject.id, name=topic_name)
                    session.add(existing_topic)
                    await session.flush()
                
                # Create subtopic with same name
                stmt = select(SubtopicDb).where(SubtopicDb.name == topic_name, SubtopicDb.topic_id == existing_topic.id)
                res = await session.execute(stmt)
                existing_subtopic = res.scalar_one_or_none()
                
                if not existing_subtopic:
                    existing_subtopic = SubtopicDb(topic_id=existing_topic.id, name=topic_name)
                    session.add(existing_subtopic)
                    await session.flush()
                    
                print(f"  Topic/Subtopic: {topic_name}")
                
        await session.commit()
    print("Taxonomy import complete!")

if __name__ == "__main__":
    asyncio.run(run())
