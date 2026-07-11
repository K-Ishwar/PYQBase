# PYQBASE Performance Architecture
**Author:** Performance Engineer  
**Date:** July 2026  
**Status:** Finalized for Development  

This document outlines the proactive performance optimization strategy for PYQBASE, ensuring the platform remains lightning-fast even under heavy load during peak exam seasons.

---

## 1. Identified Performance Bottlenecks
Before scaling, we must acknowledge the architectural limits of the MVP stack:
*   **Bottleneck A (RAM):** `rank-bm25` loads the entire question corpus into memory on the FastAPI server. If the corpus exceeds 100,000 questions, the Docker container's RAM will max out, causing OOM (Out of Memory) crashes.
*   **Bottleneck B (Write Contention):** If 5,000 users answer a quiz simultaneously, writing 5,000 individual `UPDATE` rows to Postgres will lock the database.

*Mitigation:* BM25 will be monitored via Railway metrics (triggering migration to Postgres FTS at 80% RAM). Write contention is already mitigated by our Redis Queue batching strategy.

---

## 2. Frontend Optimization (Next.js)

### Lazy Loading & Code Splitting
*   **Strategy:** We will use `next/dynamic` combined with React `<Suspense>` for all heavy components (e.g., Recharts libraries used for Analytics/Heatmaps). This ensures the initial JavaScript bundle sent to the user is tiny, and chart libraries are only downloaded if the user actually navigates to the Dashboard.
*   **Server Components:** By default, all layout and standard text pages will be React Server Components (RSC), shipping **zero** JavaScript to the client.

### Image Optimization & CDN
*   **Strategy:** Images uploaded to Supabase (like Geography maps) will be rendered exclusively using the `<Image />` component from `next/image`.
*   **Why:** Vercel's edge CDN will automatically intercept the request, convert the heavy JPEG into a next-gen `WebP` or `AVIF` format, resize it based on the user's mobile/desktop screen size, and serve it from the nearest edge node globally.

### Compression
*   **Strategy:** Brotli and Gzip compression are natively enabled on both the Vercel Edge (Frontend) and the Railway Envoy Proxy (Backend). Text payloads (JSON APIs, HTML) will be aggressively compressed over the wire.

---

## 3. API Optimization (FastAPI)

*   **Asynchronous I/O:** Every database call in FastAPI will utilize asynchronous SQLAlchemy sessions (`AsyncSession`). This prevents the Python thread from blocking while waiting for Supabase to return data.
*   **Serialization Speed:** FastAPI uses Pydantic V2, which is rewritten in Rust. This guarantees that parsing massive JSON payloads (like a 50-question mock test) happens incredibly fast compared to native Python dictionaries.
*   **Connection Pooling:** Supabase `PgBouncer` is strictly enforced. FastAPI workers will not open raw connections, preventing database connection exhaustion.

---

## 4. Database & Query Optimization

*   **Query Optimization:** 
    *   No `SELECT *` allowed. ORM queries must strictly select only the columns needed for the DTO payload.
    *   Developers must run `EXPLAIN ANALYZE` on any query that joins more than 3 tables (e.g., retrieving the full Topic taxonomy).
*   **Materialized Views:** 
    *   *Problem:* The "Subject Heatmap" requires joining `user_attempts`, `questions`, and `topics` across millions of rows. Running this dynamically is too slow.
    *   *Solution:* We will create a `MATERIALIZED VIEW` in Postgres that pre-calculates the heatmap aggregates. A nightly cron job will run `REFRESH MATERIALIZED VIEW CONCURRENTLY`, dropping read latency from 2 seconds to 10 milliseconds.

---

## 5. Caching Strategy

We will utilize a multi-layered caching strategy:
1.  **Vercel Edge Cache (Stale-While-Revalidate):** Public static pages (like the Syllabus Explorer) will be cached at the CDN edge. They are served instantly and rebuilt silently in the background when data changes.
2.  **Redis Cache (Backend):** Expensive, dynamic API responses (e.g., the pre-computed `Similar Questions Array` from FAISS) will be cached in Redis with a 30-day TTL.

---

## 6. Load Testing Strategy

Before the public launch, the infrastructure must be proven.
*   **Tooling:** `k6` (an open-source load testing tool written in Go).
*   **Scenario 1: Spike Test (Exam Eve):**
    *   Simulate 1,000 concurrent users hitting the `/api/v1/search` endpoint simultaneously for 5 minutes.
    *   *Goal:* Ensure Railway auto-scales the FastAPI container before the response time drops below the 500ms SLA.
*   **Scenario 2: Endurance Test (Write Heavy):**
    *   Simulate 500 users submitting 30 questions each (`POST /api/v1/attempts`) over a 1-hour period.
    *   *Goal:* Monitor the Redis Queue to ensure it does not back up, and verify the 5-minute bulk flush to Postgres executes smoothly without deadlocks.
