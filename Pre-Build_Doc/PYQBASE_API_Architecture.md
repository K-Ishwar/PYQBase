# PYQBASE API Architecture
**Author:** API Architect  
**Date:** July 2026  
**Status:** Finalized for Development  

This document details the RESTful API design for the PYQBASE backend (FastAPI). It strictly adheres to REST best practices, ensuring a predictable, scalable, and secure contract between the Next.js frontend and the FastAPI backend.

---

## 1. Global API Standards

### API Versioning
*   **Strategy:** URL-based versioning.
*   **Format:** `/api/v1/...`
*   **Why:** Ensures backwards compatibility if we fundamentally alter resource structures (e.g., migrating to GraphQL in v2) without breaking mobile app clients or old browser sessions.

### Pagination (Offset-Based)
*   **Standard:** All collection endpoints (`GET /...`) return paginated results using `limit` and `offset`.
*   **Query Params:** `?limit=20&offset=0`
*   **Response Wrapper:**
    ```json
    {
      "data": [...],
      "meta": { "total": 1250, "limit": 20, "offset": 0, "has_next": true }
    }
    ```

### Filtering & Sorting
*   **Filtering:** Exact matches via query parameters (`?exam=UPSC_CSE&year=2024`).
*   **Sorting:** `sort` query parameter. Prefix with `-` for descending. (e.g., `?sort=-elo_rating,created_at`).

### Authentication & Authorization
*   **Authentication:** `Authorization: Bearer <Supabase_JWT>` header.
*   **Authorization:** JWT is cryptographically verified by FastAPI middleware. Role-based access control (RBAC) relies on the `is_admin` custom claim.
*   **Device Fingerprinting (Free Tier):** Client passes `X-Device-Fingerprint: <hash>` header on specific endpoints.

### Rate Limiting (via `slowapi`)
*   **Public Search:** 60 requests/minute per IP.
*   **Submissions:** 30 requests/day per Device Fingerprint (Free Tier), 200 requests/minute per JWT (Premium).

---

## 2. Endpoint Definitions

### A. Search & Content Context

#### 1. Search / List Questions
*   **Endpoint:** `GET /api/v1/questions`
*   **Auth:** Optional. (Unauthenticated users can search but see limited payloads).
*   **Query Params:** `q` (Search string), `exam`, `subject_id`, `topic_id`, `sort`, `limit`, `offset`.
*   **Response (200 OK):**
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "exam": "UPSC_CSE",
          "question_stem": {"en": "..."},
          "options": {"A": {"en": "..."}},
          "difficulty_label": "Hard",
          "is_premium_locked": false
        }
      ],
      "meta": {...}
    }
    ```
    *(Note: `correct_option` and `explanation` are explicitly OMITTED in this list view to prevent client-side cheating).*

#### 2. Get Question Details
*   **Endpoint:** `GET /api/v1/questions/{question_id}`
*   **Auth:** Optional (Free tier rules apply).
*   **Response (200 OK):** Returns full question object *including* the correct option and AI explanation.
*   **Error (404 Not Found):** `{"error": "Question not found", "code": "NOT_FOUND"}`

---

### B. Quiz & Progress Context

#### 3. Submit Answer Attempt
*   **Endpoint:** `POST /api/v1/attempts`
*   **Auth:** Required (Bearer JWT + `X-Device-Fingerprint`).
*   **Validation Rules:** User cannot exceed 30 attempts/day if Premium status is false.
*   **Request Model:**
    ```json
    {
      "question_id": "uuid",
      "selected_option": "B",
      "time_taken_seconds": 45
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "is_correct": false,
      "correct_option": "A",
      "new_elo_rating": 1185,
      "explanation": {...}
    }
    ```
*   **Error (429 Too Many Requests):** `{"error": "Daily free limit reached", "code": "QUOTA_EXCEEDED"}`

#### 4. Get Daily SRS Queue
*   **Endpoint:** `GET /api/v1/srs/queue`
*   **Auth:** Required (Bearer JWT).
*   **Description:** Fetches all questions where `next_review_date <= TODAY (IST)`.
*   **Response (200 OK):** Array of question IDs and minimal metadata.

---

### C. Mock Test Context

#### 5. Generate Mock Test
*   **Endpoint:** `POST /api/v1/mock-tests/generate`
*   **Auth:** Required (Bearer JWT).
*   **Request Model:**
    ```json
    {
      "exam": "CAPF",
      "subject_id": "uuid",
      "question_count": 25,
      "mode": "weak_area" // Premium only
    }
    ```
*   **Response (201 Created):** Returns a `mock_test_id` and the array of `question_ids`.
*   **Error (403 Forbidden):** `{"error": "Weak area mode requires Premium", "code": "PREMIUM_REQUIRED"}`

---

### D. Analytics Context

#### 6. Get Subject Heatmap
*   **Endpoint:** `GET /api/v1/analytics/heatmaps/{subject_id}`
*   **Auth:** Optional.
*   **Response (200 OK):**
    ```json
    {
      "subject_name": "Geography",
      "topics": [
        { "topic_name": "Climatology", "question_count": 142, "weightage_percent": 18.5 }
      ]
    }
    ```

---

### E. Admin Context (Protected)

#### 7. Create/Update Question (Admin)
*   **Endpoint:** `PUT /api/v1/admin/questions/{question_id}`
*   **Auth:** Required (`is_admin` custom JWT claim).
*   **Validation:** Payload must pass strict Pydantic parsing (valid enums, required fields).
*   **Response (200 OK):** Returns updated question.
*   **Error (401 Unauthorized):** `{"error": "Admin privileges required", "code": "UNAUTHORIZED"}`

---

## 3. Standard HTTP Status Codes

| Code | Usage |
| :--- | :--- |
| **200 OK** | Successful read/update. |
| **201 Created** | Successful resource creation (Attempt, Mock Test). |
| **400 Bad Request** | Pydantic validation failure (e.g., missing field). |
| **401 Unauthorized** | Missing or invalid JWT. |
| **403 Forbidden** | Valid JWT, but action not allowed (e.g., Premium required). |
| **404 Not Found** | Resource does not exist. |
| **429 Too Many Requests** | Rate limit or free tier quota exceeded. |
| **500 Internal Server Error** | Unexpected backend crash (handled by Global Exception Handler). |

---

## 4. Exception Handling Strategy

All API errors will return a standard JSON structure to simplify frontend error parsing in Axios/Fetch.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid question_id format.",
    "details": [
      { "field": "question_id", "issue": "Must be a valid UUID v4." }
    ]
  }
}
```
