# PYQBASE Project Milestones & Sprint Plan
**Author:** Engineering Manager  
**Date:** July 2026  
**Status:** Ready for Jira/Linear Import  

This document breaks down the entire PYQBASE architecture into manageable Epics, Features, Tasks, and Subtasks. It is designed for a 4-Sprint MVP development cycle (assuming a Solo Developer velocity).

---

## 📅 Sprint Overview (2-Week Sprints)
*   **Sprint 1: The Foundation** (Infra, DB, Auth, Monorepo Setup)
*   **Sprint 2: The Core** (Admin Data Ingestion, Postgres FTS Search)
*   **Sprint 3: The Engine** (Quiz UI, ELO Queue, SM-2 SRS Logic)
*   **Sprint 4: The Polish** (Analytics, Heatmaps, Paywall, Deployment)

---

## 📋 Epic Breakdown (Markdown Format)

### EPIC 1: Infrastructure & Foundation (Sprint 1)
*   **Feature 1.1:** Monorepo Initialization
    *   *Task:* Initialize Next.js (App Router, Tailwind, shadcn)
    *   *Task:* Initialize FastAPI (SQLModel, Pydantic)
*   **Feature 1.2:** Database Provisioning
    *   *Task:* Create Supabase Project & execute DDL schemas.
    *   *Task:* Create Postgres Materialized Views & `background_jobs` table.
*   **Feature 1.3:** Authentication System
    *   *Task:* Setup Supabase Auth (Email + Google OAuth).
    *   *Task:* Implement FastAPI JWT validation middleware.
    *   *Task:* Build Next.js Login/Signup UI.

### EPIC 2: Data Ingestion & Admin (Sprint 2)
*   **Feature 2.1:** Admin Next.js App
    *   *Task:* Scaffold isolated `/admin` Next.js routes with RBAC.
    *   *Task:* Build Supabase Storage direct-upload component for maps/images.
*   **Feature 2.2:** Content CRUD
    *   *Task:* API: `POST /api/admin/questions`
    *   *Task:* API: Taxonomy management (Subjects -> Topics).

### EPIC 3: Search Engine (Sprint 2)
*   **Feature 3.1:** Postgres FTS
    *   *Task:* Create `tsvector` generation trigger on the `questions` table.
    *   *Task:* API: `GET /api/search` with Offset Pagination.
    *   *Task:* Build Next.js Search UI with debounce and keyword highlighting.

### EPIC 4: Quiz Engine & ELO (Sprint 3)
*   **Feature 4.1:** The Quiz UI
    *   *Task:* Build interactive Mock Test component (Timer, Options, Submit).
    *   *Task:* Build AI Explanation reveal UI (with "Dropped Question" state).
*   **Feature 4.2:** ELO Queue System
    *   *Task:* API: `POST /api/attempts` (pushes to `background_jobs`).
    *   *Task:* Python Background Worker: Polling `FOR UPDATE SKIP LOCKED`.
    *   *Task:* ELO recalculation math logic.

### EPIC 5: Spaced Repetition (SRS) (Sprint 3)
*   **Feature 5.1:** SM-2 Algorithm
    *   *Task:* Implement SM-2 logic calculating `next_review_date` (IST).
*   **Feature 5.2:** Daily Review Queue
    *   *Task:* API: `GET /api/srs/queue` (Fetch questions due today).
    *   *Task:* Build Next.js "Daily Revision" Dashboard.

### EPIC 6: Analytics & Monetization (Sprint 4)
*   **Feature 6.1:** Heatmaps
    *   *Task:* Build Recharts UI for Topic frequency.
    *   *Task:* API: Fetch from Materialized Views (sub-10ms).
*   **Feature 6.2:** Paywalls & Free Tier
    *   *Task:* Implement Device Fingerprinting (Canvas hashing) on Frontend.
    *   *Task:* API: Middleware to block attempts > 30/day for Free users.
    *   *Task:* Razorpay integration for Premium upgrades.

---

## 📥 CSV Export (Ready for Jira / GitHub Projects Import)

Save the following block as `pyqbase_jira_import.csv` and upload it directly to your project management tool.

```csv
Issue Type,Summary,Parent Epic,Priority,Story Points,Dependency,Sprint
Epic,Infrastructure & Foundation,,Highest,0,,Sprint 1
Task,Initialize Next.js Monorepo,Infrastructure & Foundation,High,2,,Sprint 1
Task,Initialize FastAPI Backend,Infrastructure & Foundation,High,2,,Sprint 1
Task,Provision Supabase DB & DDL Schemas,Infrastructure & Foundation,Highest,3,,Sprint 1
Task,Setup Supabase Auth & JWT Middleware,Infrastructure & Foundation,High,3,Provision Supabase DB & DDL Schemas,Sprint 1
Epic,Data Ingestion & Admin,,High,0,,Sprint 2
Task,Build Isolated Admin Next.js Routes,Data Ingestion & Admin,High,3,Initialize Next.js Monorepo,Sprint 2
Task,Build Supabase Storage Image Uploader,Data Ingestion & Admin,Medium,2,Build Isolated Admin Next.js Routes,Sprint 2
Task,Build Admin CRUD API Endpoints,Data Ingestion & Admin,High,3,Initialize FastAPI Backend,Sprint 2
Epic,Search Engine,,Highest,0,,Sprint 2
Task,Create TSVECTOR triggers in Postgres,Search Engine,Highest,2,Provision Supabase DB & DDL Schemas,Sprint 2
Task,Build FastApi FTS Search Endpoint,Search Engine,High,3,Create TSVECTOR triggers in Postgres,Sprint 2
Task,Build Next.js Search Bar UI,Search Engine,High,3,Build FastApi FTS Search Endpoint,Sprint 2
Epic,Quiz Engine & ELO,,Highest,0,,Sprint 3
Task,Build Next.js Quiz Component,Quiz Engine & ELO,Highest,5,Initialize Next.js Monorepo,Sprint 3
Task,Build POST /attempts API,Quiz Engine & ELO,Highest,3,Initialize FastAPI Backend,Sprint 3
Task,Build Postgres Background Worker (ELO),Quiz Engine & ELO,High,5,Build POST /attempts API,Sprint 3
Epic,Spaced Repetition (SRS),,High,0,,Sprint 3
Task,Implement SM-2 Python Logic,Spaced Repetition (SRS),High,3,Build POST /attempts API,Sprint 3
Task,Build SRS Daily Queue UI,Spaced Repetition (SRS),High,3,Implement SM-2 Python Logic,Sprint 3
Epic,Analytics & Monetization,,Medium,0,,Sprint 4
Task,Build Topic Heatmaps (Recharts),Analytics & Monetization,Medium,3,Initialize Next.js Monorepo,Sprint 4
Task,Implement Device Fingerprinting (Free limit),Analytics & Monetization,High,3,Build Next.js Quiz Component,Sprint 4
Task,Razorpay Integration,Analytics & Monetization,Medium,5,Setup Supabase Auth & JWT Middleware,Sprint 4
```
