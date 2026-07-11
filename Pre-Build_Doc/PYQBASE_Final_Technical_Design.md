# PYQBASE Final Technical Design Document (FTDD)
**Author:** Principal Software Engineer  
**Date:** July 2026  
**Status:** Approved for Immediate Development  

This document serves as the absolute final technical contract before writing code. A rigorous review of the previous 12 architectural documents has uncovered three critical structural flaws that would have caused scaling and deployment nightmares. 

These flaws have been resolved below. This FTDD overrides any conflicting information in the previous documents.

---

## 1. Critical Architecture Corrections (The "Bad Decisions")

### Flaw A: The Stateful BM25 Search (Severe Technical Debt)
*   **The Original Plan:** Load the 40,000-question `rank-bm25` index into RAM on the FastAPI server.
*   **The Problem:** Railway auto-scales workers. If we have 3 FastAPI workers, we have 3 separate in-memory indexes. When an Admin adds a new question, we would have to implement a complex pub/sub mechanism to force all 3 independent workers to hot-reload their RAM.
*   **The Better Alternative (Adopted):** We will discard `rank-bm25` for the web backend and use **PostgreSQL Full Text Search (FTS)** natively in Supabase. Postgres FTS handles 40,000 rows effortlessly, eliminates stateful backend workers, drops FastAPI memory usage to near zero, and keeps our infrastructure completely stateless.

### Flaw B: Redis for Queuing (Unnecessary Cost & Complexity)
*   **The Original Plan:** Run a separate Redis instance on Railway to queue ELO updates and SRS emails.
*   **The Problem:** Managing a separate Redis cluster adds cost, monitoring overhead, and introduces a failure point where queue data could be lost if the container crashes.
*   **The Better Alternative (Adopted):** We will use Postgres as our queue. We will create a `background_jobs` table and utilize PostgreSQL's `FOR UPDATE SKIP LOCKED` mechanism. This guarantees exactly-once processing, keeps our tech stack smaller (only FastAPI + Supabase), and ensures transactional integrity. 

### Flaw C: Missing Admin Image Upload Flow
*   **The Original Plan:** PRD mentioned questions can have an `image_url`. It never defined the upload flow.
*   **The Better Alternative (Adopted):** The Next.js Admin Panel will upload images directly to Supabase Storage using the Supabase JS Client (bypassing FastAPI completely to avoid payload limits and double-handling). Supabase Storage will return the public URL, which the Admin Panel will then include in the JSON payload sent to FastAPI (`POST /api/v1/admin/questions`).

---

## 2. Final Tech Stack Summary

*   **Frontend (Public & Admin):** Next.js App Router (TypeScript, Tailwind, shadcn/ui, Zustand).
*   **Backend:** FastAPI (Python, SQLModel, Pydantic V2).
*   **Database:** Supabase (PostgreSQL 15).
*   **Authentication:** Supabase Auth (JWT).
*   **Hosting:** Vercel (Frontend) + Railway (Backend).
*   **Search Engine:** PostgreSQL Full Text Search (FTS) via pg_trgm.
*   **Caching:** In-memory LRU cache on FastAPI for static taxonomy (Subjects/Topics), eliminating the need for Redis entirely.

---

## 3. Final Database Schema (Core)

```sql
-- Identity
users (id UUID PK, email VARCHAR, role VARCHAR, created_at TIMESTAMP)

-- Taxonomy
subjects (id UUID PK, name VARCHAR UNIQUE)
topics (id UUID PK, subject_id UUID FK, name VARCHAR)

-- Content
questions (
    id UUID PK,
    exam VARCHAR,
    year INT,
    question_stem JSONB,
    options JSONB,
    correct_option VARCHAR,
    image_url VARCHAR NULL,
    topic_id UUID FK,
    elo_rating INT DEFAULT 1200,
    search_vector TSVECTOR -- For Postgres FTS
)

-- User State
user_attempts (id UUID PK, user_id UUID FK, question_id UUID FK, is_correct BOOLEAN, attempt_date DATE)
user_srs (id UUID PK, user_id UUID FK, question_id UUID FK, next_review_date DATE, interval INT, ease_factor FLOAT)

-- Queue
background_jobs (id UUID PK, task_type VARCHAR, payload JSONB, status VARCHAR, locked_at TIMESTAMP)
```

---

## 4. Final Monorepo Structure

We will use a standard monorepo format, ensuring zero friction between the Python and TypeScript ecosystems.

```text
/pyqbase
 ├── /frontend                  # Next.js Application
 │    ├── package.json
 │    ├── tailwind.config.ts
 │    └── /src
 │         ├── /app             # Web Routes
 │         ├── /components      # UI Components
 │         └── /lib             # API Client & Utils
 │
 ├── /backend                   # FastAPI Application
 │    ├── requirements.txt
 │    ├── Dockerfile
 │    └── /app
 │         ├── /api             # Routers
 │         ├── /core            # Config & Auth Middleware
 │         ├── /domain          # Pydantic DTOs
 │         ├── /models          # SQLModel schemas
 │         ├── /repositories    # Database queries
 │         └── /services        # Business Logic
 │
 └── .gitignore
```

---

## 5. Development Launch Sequence

The architecture is fully de-risked and optimized for a solo developer. The execution phase will follow these exact steps:

1.  **Initialize Git & Repo Structure:** Scaffold `/frontend` (Next.js) and `/backend` (FastAPI).
2.  **Database Provisioning:** Execute SQL DDL scripts to create Supabase tables, Foreign Keys, and the FTS `tsvector` index.
3.  **Backend Core:** Wire up FastAPI, SQLModel DB connection, and Supabase JWT middleware.
4.  **Admin Panel Setup:** Build the Next.js Admin routes to allow manual question ingestion.
5.  **Quiz Engine Logic:** Implement the ELO algorithm and SM-2 spaced repetition service in Python.
6.  **Public Frontend:** Build the Quiz UI, Search Bar, and Heatmaps.
7.  **Performance Tuning:** Ensure the Postgres `background_jobs` worker is running smoothly.
