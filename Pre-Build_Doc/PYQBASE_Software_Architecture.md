# PYQBASE Software Structure & Design Patterns
**Author:** Senior Software Architect  
**Date:** July 2026  
**Status:** Finalized for Development  

This document defines the strict coding standards, design patterns, and structural principles the PYQBASE engineering team will follow during implementation. 

---

## 1. Domain Driven Design (DDD)
We will partition the monolithic codebase into distinct Bounded Contexts to ensure loose coupling.
*   **Identity Context:** User registration, JWT validation, Device Fingerprinting.
*   **Content Context:** Questions, Options, Subjects, Topics, Parsing Engine.
*   **Quiz Context:** Active sessions, ELO tracking, User Attempts, SM-2 SRS engine.
*   **Analytics Context:** Heatmaps, Syllabus Overlap Matrix, Mock Test Generation.

*Principle:* A module in the Quiz Context cannot execute raw SQL against tables owned by the Content Context. It must communicate through the Content Context's Service Layer.

---

## 2. Layered Architecture
The backend (FastAPI) will adhere to a strict **4-Tier Clean Architecture**:
1.  **Presentation Layer (Routers):** Handles HTTP requests, parses headers, extracts JWTs, and returns HTTP responses. *Zero business logic allowed here.*
2.  **Service Layer:** Contains the core business logic (e.g., calculating SM-2 review dates, validating free-tier limits). 
3.  **Data Access Layer (Repositories):** Manages all database interactions. *Zero HTTP context allowed here.*
4.  **Infrastructure Layer:** External integrations (Supabase Client, Redis Client, Resend API, BM25 Index).

---

## 3. Repository Pattern
*   **Design:** We will use the Repository Pattern to abstract the ORM (SQLModel/SQLAlchemy).
*   **Why:** If we ever switch database technologies, or need to intercept queries for caching, we only modify the Repository, not the Service.
*   **Implementation:** Services will interact with generic interfaces (e.g., `QuestionRepository.get_by_topic(topic_id)`), ensuring the Service layer remains completely ignorant of SQL syntax.

---

## 4. Dependency Injection (DI)
*   **Backend:** We will aggressively leverage FastAPI's native `Depends()` system. Repositories will be injected into Services, and Services into Routers. This ensures testability; we can effortlessly inject a `MockQuestionRepository` during unit testing.
*   **Frontend:** In Next.js, we will use React Context Providers for global state (Auth, Theme) and custom hooks (`useQuizEngine()`) to inject dependencies into components, keeping UI components "dumb".

---

## 5. Key Design Patterns
*   **Singleton Pattern:** Used for heavy infrastructure connections: the PostgreSQL Engine, the Redis Connection Pool, and the BM25 In-Memory Index. These instantiate exactly once on application startup.
*   **Strategy Pattern:** Used in the Search Service. We will define a `SearchStrategy` interface. The MVP will implement `BM25SearchStrategy`. If we outgrow it, we can easily swap in `PostgresFTSSearchStrategy` without altering the Controller.
*   **Factory Pattern:** Used for the Smart Mock Test Generator. A `MockTestFactory` will take parameters (User ID, Weak Areas, Exam) and assemble the complex mock test payload dynamically.

---

## 6. SOLID Principles Enforcement
*   **Single Responsibility Principle (SRP):** Files must do one thing. A file handling user profile updates cannot also handle password reset logic.
*   **Open/Closed Principle:** The `ExamSimilarityEngine` must be open for extension (adding new exams like NDA) but closed for modification (we don't rewrite the core math when a new exam is added).
*   **Dependency Inversion Principle:** High-level modules (Routers) will not depend on low-level modules (SQL queries). Both will depend on abstractions (Pydantic Models and Repositories).

---

## 7. Exception & Error Handling Strategy
*   **No Silent Failures:** `try/except pass` is strictly forbidden.
*   **Custom Exception Classes:** We will define a domain-specific hierarchy (e.g., `PyqBaseException` -> `ResourceNotFoundException`, `RateLimitExceededException`, `DomainValidationException`).
*   **Global Exception Handler:** FastAPI will register a global `@app.exception_handler`. If a Service throws a `ResourceNotFoundException`, the global handler automatically catches it and returns a standardized JSON format:
    `{ "error": "Question not found", "code": "ERR_NOT_FOUND", "status": 404 }`
*   **Layer Rule:** Repositories throw DB Exceptions. Services catch them and throw Domain Exceptions. Routers do not try/catch; they let the Global Handler format the response.

---

## 8. Validation Strategy
*   **Incoming Data (Backend):** 100% of incoming request bodies and query parameters will be validated via **Pydantic** models before hitting the router logic.
*   **Outgoing Data (Backend):** Responses will be serialized using Pydantic `response_model` definitions to ensure no accidental leakage of private fields (e.g., user passwords, internal IDs).
*   **Frontend Validation:** All forms (Admin Panel, User Settings) will use **Zod** schema validation combined with React Hook Form to provide instant, type-safe error messages to the user before network requests are made.

---

## 9. Folder Structure

### Backend (FastAPI / Clean Architecture)
```text
/backend
 ├── /app
 │    ├── /api               # Presentation Layer (Routers)
 │    │    └── /v1
 │    ├── /core              # Infrastructure (Config, Security, Redis Setup)
 │    ├── /domain            # DDD: Pydantic schemas, Enums, Interfaces
 │    ├── /services          # Business Logic (SM-2, ELO, Search)
 │    ├── /repositories      # Data Access Layer (SQLAlchemy logic)
 │    └── /tests             # Pytest unit & integration tests
```

### Frontend (Next.js App Router)
```text
/frontend
 ├── /src
 │    ├── /app               # Next.js App Router Pages
 │    ├── /components        # UI Components
 │    │    ├── /ui           # Dumb shared components (Buttons, Inputs)
 │    │    └── /features     # Smart domain components (QuizCard)
 │    ├── /hooks             # Custom React Hooks
 │    ├── /lib               # Utils, API clients, Zod schemas
 │    └── /store             # Zustand or Context for global state
```

---

## 10. Naming Conventions

To maintain absolute consistency across the stack:

| Entity | Standard | Example |
| :--- | :--- | :--- |
| **Python Variables/Functions** | `snake_case` | `calculate_next_review_date()` |
| **Python Classes** | `PascalCase` | `QuestionRepository` |
| **TypeScript Variables/Funcs** | `camelCase` | `fetchUserProgress()` |
| **React Components** | `PascalCase` | `QuizEngineCard.tsx` |
| **API JSON Payloads** | `snake_case` | `{"question_id": 12}` |
| **Database Tables** | `snake_case` (Plural) | `user_attempts` |
| **Environment Variables** | `UPPER_SNAKE` | `SUPABASE_JWT_SECRET` |
| **File Names (Python)** | `snake_case` | `mock_test_service.py` |
| **File Names (React)** | `kebab-case` | `quiz-dashboard.tsx` |

---
*Prepared by Senior Software Architect*
