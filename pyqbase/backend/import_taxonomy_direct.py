import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text
from app.core.config import settings

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
Banking & Finance
RBI & Monetary Policy
Taxation
Fiscal Policy
Budget
Financial Markets
Agriculture Economics
Industrial Sector
Service Sector
Infrastructure
Poverty & Unemployment
Planning & NITI Aayog
International Trade
Balance of Payments
International Organizations
WTO & IMF
World Bank
5. Environment & Ecology
Ecology Basics
Ecosystems
Biodiversity
Conservation
National Parks & Wildlife Sanctuaries
Biosphere Reserves
Climate Change
Global Warming
Ozone Depletion
Pollution
Air Pollution
Water Pollution
Soil Pollution
Waste Management
Environmental Laws
International Treaties
UNFCCC & COP
Sustainable Development
Renewable Energy
6. Science & Technology
Physics
Chemistry
Biology
Human Anatomy
Diseases & Health
Genetics
Space Technology
ISRO & NASA missions
Defense Technology
Missiles & Submarines
Information Technology
Artificial Intelligence
Biotechnology
Nanotechnology
Nuclear Technology
Robotics
7. Current Affairs & General Knowledge
National Events
International Events
Awards & Honours
Sports
Books & Authors
Important Days
Persons in News
Summits & Conferences
Government Schemes
Indices & Reports
Committees & Commissions
Defense Exercises
8. Quantitative Aptitude
Number System
HCF & LCM
Simplification
Average
Percentage
Ratio & Proportion
Partnership
Mixture & Alligation
Profit & Loss
Simple Interest
Compound Interest
Time & Work
Pipe & Cistern
Time, Speed & Distance
Trains
Boats & Streams
Mensuration 2D
Mensuration 3D
Geometry
Trigonometry
Algebra
Data Interpretation
Probability
Permutation & Combination
9. Logical Reasoning
Series Completion
Coding & Decoding
Blood Relations
Direction Sense
Syllogism
Venn Diagrams
Ranking & Order
Clock & Calendar
Seating Arrangement
Puzzles
Statement & Assumptions
Statement & Conclusions
Non-Verbal Reasoning
Mirror & Water Images
Paper Folding & Cutting
Figure Counting
10. English Language & Comprehension
Reading Comprehension
Cloze Test
Para Jumbles
Fill in the Blanks
Error Spotting
Sentence Improvement
Active & Passive Voice
Direct & Indirect Speech
Vocabulary
Synonyms & Antonyms
Idioms & Phrases
One Word Substitution
Spelling Errors
11. Mathematics
Sets & Relations
Functions
Complex Numbers
Quadratic Equations
Sequence & Series
Matrices & Determinants
Limits & Derivatives
Integration
Differential Equations
Vector Algebra
3D Geometry
Statistics
Linear Programming
12. Physics
Units & Measurements
Kinematics
Laws of Motion
Work, Energy & Power
System of Particles & Rotational Motion
Gravitation
Mechanical Properties of Solids
Mechanical Properties of Fluids
Thermal Properties of Matter
Thermodynamics
Kinetic Theory
Oscillations & Waves
Electrostatics
Current Electricity
Magnetic Effects of Current
Magnetism
Electromagnetic Induction
Alternating Current
Electromagnetic Waves
Optics
Dual Nature of Radiation & Matter
Atoms & Nuclei
Semiconductor Electronics
Communication Systems
13. Chemistry
Some Basic Concepts of Chemistry
Structure of Atom
Classification of Elements
Chemical Bonding
States of Matter
Thermodynamics
Equilibrium
Redox Reactions
Hydrogen
s-Block Elements
p-Block Elements
Organic Chemistry Basics
Hydrocarbons
Environmental Chemistry
Solid State
Solutions
Electrochemistry
Chemical Kinetics
Surface Chemistry
General Principles of Isolation of Elements
d- and f-Block Elements
Coordination Compounds
Haloalkanes & Haloarenes
Alcohols, Phenols & Ethers
Aldehydes, Ketones & Carboxylic Acids
Amines
Biomolecules
Polymers
Chemistry in Everyday Life
14. Biology
The Living World
Biological Classification
Plant Kingdom
Animal Kingdom
Morphology of Flowering Plants
Anatomy of Flowering Plants
Structural Organisation in Animals
Cell: The Unit of Life
Biomolecules
Cell Cycle and Cell Division
Transport in Plants
Mineral Nutrition
Photosynthesis
Respiration in Plants
Plant Growth and Development
Digestion and Absorption
Breathing and Exchange of Gases
Body Fluids and Circulation
Excretory Products and their Elimination
Locomotion and Movement
Neural Control and Coordination
Chemical Coordination and Integration
Reproduction in Organisms
Sexual Reproduction in Flowering Plants
Human Reproduction
Reproductive Health
Principles of Inheritance and Variation
Molecular Basis of Inheritance
Evolution
Human Health and Disease
Strategies for Enhancement in Food Production
Microbes in Human Welfare
Biotechnology: Principles and Processes
Biotechnology and its Applications
Organisms and Populations
Ecosystem
Biodiversity and Conservation
Environmental Issues
15. Computer Science
Computer Fundamentals
Operating Systems
Database Management Systems
Computer Networks
Data Structures & Algorithms
Programming Languages
C/C++
Java
Python
Web Technologies
Software Engineering
Cyber Security
Artificial Intelligence & Machine Learning
Cloud Computing
Digital Logic
Computer Organization & Architecture
Theory of Computation
Compiler Design
16. Uncategorized
General
Mixed
Miscellaneous
Previous Year Questions
Mock Tests
Sample Papers
Previous Year Papers
"""

async def run():
    print("Starting import using direct URL...")
    # Use direct URL to bypass PgBouncer and ECIRCUITBREAKER issues
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    direct_url = os.environ.get("DIRECT_URL")
    if direct_url and direct_url.startswith("postgres"):
        direct_url = direct_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        direct_url = direct_url.replace("postgres://", "postgresql+asyncpg://", 1)
    else:
        print("Warning: DIRECT_URL not found in .env, falling back to async_database_url (which may hit the pooler)")
        direct_url = settings.async_database_url
        
    engine = create_async_engine(direct_url, echo=False)
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
                print(f"Upserted subject: {subj_name} ({current_subject_id})")
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
    print("Import complete.")

if __name__ == "__main__":
    asyncio.run(run())
