# PYQBASE Software Architecture Document
**Author:** Principal Solution Architect  
**Status:** Approved for Development  
**Date:** July 2026  

This document outlines the complete software architecture for the PYQBASE platform, derived from PRD v3.0 and the BRD. Note: No code is included in this document; it focuses purely on structural design, flows, and architectural decisions.

---

## 1. High Level Architecture

PYQBASE utilizes a decoupled, modern serverless/PaaS stack designed to keep infrastructure costs near zero while easily scaling to handle thousands of concurrent users.

*   **Client Tier:** A Next.js web application deployed on Vercel (Edge network).
*   **API Tier:** A stateless FastAPI Python backend deployed on Railway.
*   **Data Tier:** PostgreSQL database hosted on Supabase (managed cloud).
*   **Auth Tier:** Supabase Auth providing JWT-based session management.
*   **Offline Tier:** Local Python scripts run by the Admin (founder) to process heavy NLP tasks (FAISS / sentence-transformers) to avoid cloud RAM costs.

*Design Decision:* A decoupled architecture was chosen over a monolith (like Django or pure Next.js Server Actions) because the backend relies heavily on Python-native data science libraries (AI agents), while the frontend requires a highly reactive, SEO-optimized React interface.

---

## 2. Low Level Architecture

### The Request Lifecycle
1. User requests data via Next.js.
2. Next.js fetches data from the FastAPI backend, passing the Supabase JWT in the `Authorization` header.
3. FastAPI's middleware validates the JWT with Supabase's public keys.
4. FastAPI checks the in-memory LRU Cache for the requested resource (e.g., ELO rating).
5. On cache miss, FastAPI queries PostgreSQL via PgBouncer.
6. The response is returned to the client.

### ELO Write Lifecycle (Contention Prevention)
1. User submits an answer. 
2. FastAPI calculates the new ELO score in memory.
3. FastAPI inserts a row into the `background_jobs` Postgres table.
4. A background worker picks up rows every 5 minutes using `FOR UPDATE SKIP LOCKED` and executes bulk updates.

*Design Decision:* Queueing ELO via Postgres tables prevents row-level write contention on the main `questions` table without requiring a separate Redis cluster.

---

## 3. Modular Architecture

The system is broken down into domain-driven modules:
*   **Quiz Engine Module:** Handles state generation, mock test criteria matching, and spaced repetition (SM-2) date calculations.
*   **Search Engine Module:** Wraps Postgres Full Text Search (FTS).
*   **Analytics Module:** Handles heavy aggregation queries (Heatmaps, Syllabus Overlap) using Postgres Materialized Views.
*   **Admin Module:** Physically isolated from the consumer app. Handles manual content CRUD, OCR batch ingestion triggering, and the News Bridge.

---

## 4. Folder Structure

The repository will be a Monorepo containing two distinct application roots to simplify CI/CD pipelines.

```text
/pyqbase-monorepo
 ├── /frontend (Next.js Application)
 │    ├── /apps
 │    │    ├── /client (Public Consumer App)
 │    │    └── /admin (Isolated Admin App)
 │    ├── /components (Shared React Components)
 │    └── /lib (API clients, Utils)
 ├── /backend (FastAPI Application)
 │    ├── /api (Route definitions)
 │    ├── /core (Auth middleware, Config, DB connections)
 │    ├── /services (Business logic: Search, ELO, Quiz)
 │    └── /models (Pydantic schemas)
 └── /offline_pipeline (Local NLP Scripts)
      └── /nlp_mapper (FAISS & sentence-transformers)
```

*Design Decision:* The Admin app is a physically separate Next.js app within the `/frontend` workspace. This completely isolates admin API routes and components from the public JS bundle, preventing Admin Bundle Exposure.

---

## 5. Services & Components

*   **Consumer Web Client:** Next.js App Router providing SEO-friendly public question pages and authenticated quiz dashboards.
*   **Admin Web Client:** Secure internal tool for content moderation.
*   **Core API Service:** FastAPI application serving all REST endpoints.
*   **Background Worker Service:** A separate Python process (or FastAPI `BackgroundTasks`) dedicated to flushing Postgres queues and managing heavy DB aggregations.

---

## 6. APIs

Communication between Frontend and Backend will occur strictly via RESTful JSON APIs.
*   *Design Decision:* REST was chosen over GraphQL to maintain strict simplicity and leverage standard HTTP caching mechanisms on the Edge.
*   *Documentation:* The FastAPI backend will automatically generate OpenAPI (Swagger) documentation to serve as the single source of truth for API contracts.

---

## 7. Authentication

*   **Provider:** Supabase Auth.
*   **Methods:** Email/Password (8-char minimum) and passwordless Google OAuth.
*   **Session State:** Supabase manages JWT issuance, refresh tokens, and cookie storage. 
*   *Design Decision:* Supabase Auth natively issues PostgreSQL database tokens, meaning RLS (Row Level Security) can theoretically be utilized in the future if direct-to-DB connections are required.

---

## 8. Authorization

*   **Role-Based Access Control (RBAC):** Users are assigned roles via Supabase Custom JWT Claims (`role: 'user'` vs `role: 'admin'`).
*   **Free vs Premium:** The backend checks the user's subscription status via a `users` table lookup on every protected API call.
*   **Device Fingerprinting:** The frontend generates a hardware/browser fingerprint (using Canvas/WebGL hashing). This fingerprint is passed in a custom header `X-Device-Fingerprint`. The backend uses this ID to throttle the 30-question free limit, preventing abuse via infinite Google accounts.

---

## 9. File Storage

*   **Provider:** Supabase Storage (S3-compatible).
*   **Usage:** Storing maps, diagrams, and figures attached to UPSC geography/science questions. 
*   **Structure:** Images are stored under `/questions/{exam}/{year}/{question_id}.jpg` and linked in the DB via the `image_url` JSON property.

---

## 10. Caching

*   **Provider:** FastAPI In-Memory LRU Cache.
*   **Entities Cached:**
    1.  **Topic Heatmaps (TTL: 24h):** Heatmaps change very slowly.
    2.  **ELO Difficulty Scores (TTL: 5m):** Delays user visibility by 5 minutes to protect DB loads.
    3.  **Similar Question Arrays (TTL: 30d):** Pre-computed relationship arrays never change unless new content is added.

---

## 11. Background Jobs

*   **Queue System:** Postgres `background_jobs` table using `FOR UPDATE SKIP LOCKED`.
*   **Job 1 (Every 5 minutes):** Flush ELO difficulty updates to PostgreSQL.
*   **Job 2 (Daily at 00:01 IST):** Refresh Postgres Materialized Views (Heatmaps, Frequency analytics).
*   **Job 3 (Daily at 02:00 IST):** Execute "Soft Delete" cleanup (hard-deleting accounts marked `deleted_at` > 30 days ago).

---

## 12. Event System

PYQBASE relies on a simplistic synchronous event flow for MVP, avoiding complex message brokers like Kafka.
*   When an Admin approves a new Question -> Webhook triggers the FastAPI server to update the search index (if necessary).

---

## 13. Notification System

*   **Provider:** Resend API.
*   **Trigger:** A scheduled background job runs daily at 6:45 AM IST, querying all users who have an SRS `next_review_date` matching today's date.
*   **Action:** Dispatches a bulk email via Resend: *"You have 45 questions in your daily review queue. Keep your streak alive."*

---

## 14. Logging

*   **Application Logs:** FastAPI standard output (JSON structured logs) ingested automatically by Railway's log viewer.
*   **Audit Logs (Admin):** Every content change in the Admin panel writes an immutable row to an `audit_logs` Postgres table `{admin_id, action, target_id, timestamp}`.

---

## 15. Monitoring

*   **Uptime Monitoring:** External ping service monitoring the `/health` endpoint.
*   **Error Tracking:** Sentry integrated into both Next.js and FastAPI. Triggers Slack/Email alerts on unhandled `500 Internal Server Error` responses.
*   **Memory Monitoring:** Railway dashboard to monitor FastAPI RAM usage. *Critical alert threshold set at 80% RAM to monitor the BM25 index size.*

---

## 16. Scalability Plan

*   **Database:** A single Supabase Postgres instance maxes out around 500-1000 concurrent active connections. We introduce **PgBouncer** (connection pooler) configured to a strict maximum of 20 connections. All FastAPI workers share this pool.
*   **Search Engine:** We use Postgres Full Text Search (FTS) to keep the backend completely stateless, avoiding memory bloat on FastAPI instances.
*   **Compute Scaling:** FastAPI workers are stateless. As traffic increases, Railway will auto-scale by spinning up additional Docker containers.

---

## 17. Future Expansion

*   **B2B Multi-Tenancy:** The database schema is strictly single-tenant B2C. For Phase 5 (B2B Coaching Institutes), the architecture will inject `institute_id` into tables and utilize Postgres Row-Level Security (RLS) policies to partition data, ensuring institute A cannot see institute B's custom content.
*   **Localization:** The schema utilizes `JSONB` for textual data (e.g., `question_stem: {"en": "...", "hi": "..."}`). Adding Hindi support requires zero database schema migrations; the API simply begins querying the `hi` key based on the user's language preference header.
