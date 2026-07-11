# PYQBASE Master Test Plan & QA Strategy
**Author:** Senior QA Engineer  
**Date:** July 2026  
**Status:** Finalized for Development  

This document defines the comprehensive Quality Assurance (QA) strategy for PYQBASE, ensuring high reliability, performance, and fault tolerance across the entire stack before production launch.

---

## 1. Test Strategy & Tooling

We will employ a "Shift-Left" testing approach, catching bugs during CI/CD rather than manual QA post-deployment.

*   **Backend (FastAPI):** `pytest` for Unit and Integration tests. `httpx` for async API testing.
*   **Frontend (Next.js):** `Vitest` + `React Testing Library` for component unit tests. `Playwright` for End-to-End (E2E) UI flows.
*   **Performance (Load):** `Artillery` or `k6` to stress-test the FastAPI application.
*   **Coverage Target:** Minimum 80% line coverage for critical domain logic (Quiz Engine, ELO calculation, SRS SM-2).

---

## 2. Functional Tests

These tests verify that the software behaves exactly as defined in the PRD and BRD.

### Core Features
*   **Auth:** 
    *   Verify user can sign up with email and Google OAuth.
    *   Verify user receives a 7-day premium trial upon signup.
*   **Search Engine:** 
    *   Verify exact match keywords return in top 3 results.
    *   Verify offset pagination (Page 1 vs Page 2) correctly slices the BM25 results without overlapping IDs.
*   **Quiz Engine:** 
    *   Verify selecting the correct option turns the UI green and reveals the AI explanation.
    *   Verify selecting the wrong option turns the UI red, highlights the correct option, and reveals the explanation.
*   **Mock Test Generator:** 
    *   Verify a Free User is blocked from generating a second custom mock test in the same calendar week.
    *   Verify Premium Users can access the "Weak Area" generation mode.

---

## 3. Integration Tests

These tests verify that distinct modules communicate properly.

*   **Database Integration:** Spin up a local Postgres test container. Verify `QuestionRepository` correctly executes SQLAlchemy joins across `topics` and `subtopics`.
*   **Redis Integration:** Verify the `QuizService` successfully pushes an ELO update payload to the Redis queue, and the background worker successfully pops it and writes to the test DB.
*   **Supabase Auth Integration:** Mock a JWT token. Verify the FastAPI Dependency `get_current_user` decodes the token and successfully fetches the user from the test DB.

---

## 4. Regression Tests

Automated tests designed to ensure new features don't break old ones.
*   **Syllabus Taxonomy Lock:** Ensure that deleting a `topic` throws a Foreign Key constraint error if questions are attached to it (preventing accidental DB wipes).
*   **JSONB Schema Consistency:** Verify that adding a Hindi translation `{"hi": "..."}` to the `question_stem` JSONB column does not crash the frontend English renderer.

---

## 5. Performance & Load Tests

*   **Search Latency (BM25):** 
    *   *Test:* Send 50 concurrent search queries to the API with a 40,000 document index.
    *   *Acceptance Criteria:* p95 response time must remain < 500ms. RAM usage must not exceed 512MB.
*   **Database Write Contention:** 
    *   *Test:* Fire 500 concurrent `POST /api/v1/attempts` requests.
    *   *Acceptance Criteria:* The API must return 201 Created instantly, pushing to Redis without triggering Postgres connection timeouts or row-lock deadlocks.

---

## 6. Security Tests

*   **BOLA (IDOR):** 
    *   *Test:* Authenticate as User A. Send a `GET` request to User B's `/srs-queue`. 
    *   *Acceptance Criteria:* API must return `403 Forbidden` or `404 Not Found`.
*   **Rate Limiting Evasion:**
    *   *Test:* Send 150 search requests from a single IP within 60 seconds.
    *   *Acceptance Criteria:* Requests 101-150 must return `429 Too Many Requests`.
*   **Free Tier Abuse Prevention:**
    *   *Test:* Create 5 different Free accounts from the exact same browser/device fingerprint. Have each account answer 10 questions.
    *   *Acceptance Criteria:* The 4th account should hit the 30-question device limit and return a `429 Quota Exceeded` error, successfully blocking fake-account abuse.

---

## 7. Edge Cases

*   **Midnight Boundary Quiz:** 
    *   *Test:* User starts a quiz at 23:58 IST. They submit answers at 23:59:50, 00:00:05, and 00:01:10.
    *   *Acceptance Criteria:* The first attempt deducts from Day 1's quota. The second and third attempts correctly deduct from Day 2's quota, without terminating the active quiz session UI.
*   **Dropped Questions:** 
    *   *Test:* User submits an answer for a question marked `correct_option = 'DROPPED'`.
    *   *Acceptance Criteria:* The user's mock test score does not change (numerator and denominator remain unaffected). ELO rating does not change.
*   **Rapid Double-Click Submission:**
    *   *Test:* User mashes the "Submit Answer" button 5 times in 1 second.
    *   *Acceptance Criteria:* The frontend disables the button after the first click. The backend idempotency check prevents 5 rows from being written to `user_attempts`.

---

## 8. Failure Cases (Fault Tolerance)

*   **Redis Outage:** 
    *   *Test:* Kill the Redis container while the API is running. User requests a Heatmap.
    *   *Acceptance Criteria:* FastAPI must catch the `ConnectionError`, log a warning, and gracefully fallback to querying PostgreSQL directly (bypassing the cache) rather than crashing with a `500 Internal Server Error`.
*   **Groq API Rate Limit (Offline Pipeline):** 
    *   *Test:* Simulate a `429 Too Many Requests` from Groq during the AI Explanation generation batch job.
    *   *Acceptance Criteria:* The script must catch the exception, sleep with exponential backoff (e.g., 60s), and retry without crashing the entire batch process.

---

## 9. User Acceptance Tests (UAT)

These are manual testing flows performed by the founder before the Alpha Launch.

*   **UAT Flow 1 (The Serious Aspirant):** 
    1. Log in. 
    2. Search for "Fundamental Rights". 
    3. Answer 15 questions in a row. 
    4. Log out. 
    5. Log in the next day. 
    6. *Pass Condition:* The Daily Revision Queue shows the incorrectly answered questions from yesterday ready for review.
*   **UAT Flow 2 (The Exam Strategist):** 
    1. Visit the CAPF Geography Topic page. 
    2. Look at the topic heatmap. 
    3. Click on the reddest (hottest) topic ("Climatology"). 
    4. View the list of questions and their AI predictions. 
    5. *Pass Condition:* The heatmap instantly renders and the data accurately matches the syllabus breakdown.
