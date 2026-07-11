# PYQBASE Backend Module Design
**Author:** Senior Backend Architect  
**Date:** July 2026  
**Status:** Finalized for Development  

This document details the internal architecture and logical boundaries of the FastAPI backend application. It defines how data flows through the application layers and enforces the separation of concerns.

---

## 1. Folder Structure (The Module Tree)

The backend will follow a domain-driven, layered architecture structure within the `/backend/app` directory:

```text
/backend/app
 ├── /api                   # Controllers (Routers)
 │    ├── /v1
 │    │    ├── auth_router.py
 │    │    ├── questions_router.py
 │    │    ├── quiz_router.py
 │    │    └── admin_router.py
 │    └── dependencies.py   # Auth & DB Injection
 ├── /core                  # Configuration & Global Setup
 │    ├── config.py         # Pydantic BaseSettings
 │    ├── security.py       # JWT verification logic
 │    ├── database.py       # SQLAlchemy Engine & Session
 │    └── exceptions.py     # Custom exception classes
 ├── /domain                # DTOs & Validation (Pydantic)
 │    ├── schemas_question.py
 │    ├── schemas_quiz.py
 │    └── schemas_user.py
 ├── /models                # Database Models (SQLModel)
 │    ├── question.py
 │    ├── user_progress.py
 │    └── taxonomy.py
 ├── /repositories          # Data Access Layer
 │    ├── question_repo.py
 │    └── progress_repo.py
 └── /services              # Business Logic Layer
      ├── search_service.py
      ├── quiz_service.py
      └── elo_worker.py
```

---

## 2. Layer Definitions & Contracts

### A. Controllers (API Routers)
*   **Role:** Receive HTTP requests, call the appropriate Service layer function, and return HTTP responses.
*   **Rules:** Controllers must **never** contain business logic or raw SQL queries.
*   **Example Mapping:** `POST /api/v1/attempts` maps to `quiz_router.submit_attempt()`.

### B. Domain Transfer Objects (DTOs) & Validation
*   **Role:** Define the exact shape of incoming request payloads and outgoing response payloads.
*   **Implementation:** **Pydantic V2**.
*   **Validation:** Pydantic automatically handles type checking (e.g., ensuring `time_taken_seconds` is an integer) and custom rules (e.g., ensuring a string is a valid UUID).
*   **Example DTO:** `AttemptCreateDTO` (Request), `AttemptResultDTO` (Response).

### C. Models
*   **Role:** Define the database schema and object-relational mapping.
*   **Implementation:** **SQLModel** (which bridges Pydantic and SQLAlchemy).
*   **Rule:** Models represent the database state. They do not validate HTTP payloads (that is the job of DTOs).

### D. Repositories
*   **Role:** Isolate all SQLAlchemy database queries.
*   **Implementation:** Classes (e.g., `QuestionRepository`) that inject the database `Session`.
*   **Example Methods:** `get_by_id(db, question_id)`, `count_user_attempts_today(db, user_id)`.
*   **Why:** If we need to change how attempts are counted (e.g., moving from Postgres to Redis), we only change the Repository, leaving the Service layer completely untouched.

### E. Services (Business Logic)
*   **Role:** The "Brain" of the application.
*   **Implementation:** Classes or modules that take validated DTOs, apply business rules, orchestrate Repositories, and return results.
*   **Example (QuizService):** 
    1. Checks if the user has hit their 30-day limit via `ProgressRepository`.
    2. Calculates the new ELO rating.
    3. Pushes the ELO update to the Redis Queue.
    4. Calculates the SM-2 `next_review_date`.
    5. Saves the attempt via `ProgressRepository`.

---

## 3. Core Infrastructure Modules

### Authentication & Authorization
*   **Dependency Injection:** A core dependency `get_current_user` extracts the `Authorization: Bearer <token>` header.
*   **Logic:** Cryptographically verifies the token using the Supabase JWT secret. If valid, it returns a `User` object context to the Controller.
*   **Role Guards:** A higher-order dependency `get_admin_user` will wrap `get_current_user` and additionally verify that `is_admin == true` in the JWT payload.

### Middleware
1.  **CORS Middleware:** Restricted to allow only the Vercel production domains and `localhost:3000`.
2.  **Rate Limiting Middleware:** `slowapi` intercepts requests, hashes the IP or `X-Device-Fingerprint`, and checks Redis. If the bucket is empty, it short-circuits and returns a `429 Too Many Requests` before hitting the Router.

### Configuration
*   **Implementation:** `pydantic-settings` (`BaseSettings`).
*   **Role:** Loads environment variables (DB URL, API Keys) on startup, validates their existence and type (preventing the app from booting if a critical secret is missing), and exposes them as a globally typed `settings` object.

### Exception Handling
*   **Custom Exceptions:** We define `DomainException`, inherited by `NotFoundException`, `QuotaExceededException`, etc.
*   **Global Handler:** FastAPI `@app.exception_handler(DomainException)`.
*   **Why:** A Service can simply `raise QuotaExceededException("Limit reached")`. The Router doesn't need to catch it. The Global Handler intercepts it, maps it to a `429` status code, and formats the standard JSON error response.

### Logging
*   **Implementation:** Standard Python `logging` module configured with a JSON formatter (`python-json-logger`).
*   **Why JSON:** Railway's log viewer and external tools like Datadog parse JSON logs perfectly, allowing us to query logs by `user_id` or `trace_id` easily without writing regex to parse plain text strings.
