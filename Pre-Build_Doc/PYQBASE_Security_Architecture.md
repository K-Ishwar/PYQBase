# PYQBASE Security Architecture & Risk Assessment
**Author:** Cyber Security Architect  
**Date:** July 2026  
**Status:** Finalized for Development  

This document outlines the security posture of the PYQBASE platform, addressing OWASP Top 10 vulnerabilities, authentication, and data protection strategies.

---

## 1. Authentication & JWT Security

*   **Provider:** Supabase Auth handles all password hashing (Argon2) and OAuth flows. We do not store raw passwords.
*   **JWT Storage:** JWTs must be stored securely. 
    *   *Risk:* Storing JWTs in `localStorage` makes them vulnerable to XSS token theft.
    *   *Mitigation:* Next.js will store the Supabase Auth session in **HttpOnly, Secure, SameSite=Lax cookies**. This prevents JavaScript from reading the token.
*   **JWT Expiration:** Short-lived access tokens (1 hour) with refresh token rotation enabled in Supabase.
*   **Password Policy:** Minimum 8 characters enforced.

## 2. Authorization Risks (BOLA / IDOR)

*   **Broken Object Level Authorization (BOLA/IDOR):** 
    *   *Risk:* A user alters the API request from `GET /api/v1/users/123/stats` to `GET /api/v1/users/124/stats` to view someone else's data.
    *   *Mitigation 1 (Obfuscation):* All primary keys are `UUIDv4`, making ID guessing mathematically impossible.
    *   *Mitigation 2 (Validation):* Even with UUIDs, the FastAPI service layer must explicitly check `resource.user_id == current_jwt.sub` before returning or mutating any user-specific data (e.g., `user_attempts`, `user_srs`).

## 3. SQL Injection (SQLi)

*   **Risk:** Malicious payloads in search inputs (`?q=' OR 1=1; DROP TABLE users;`) executing raw SQL.
*   **Mitigation:** 
    *   **No Raw SQL:** All database interactions will go through the ORM (SQLModel/SQLAlchemy) which utilizes safe parameterized query bindings by default.
    *   **Strict Typing:** Pydantic models automatically sanitize and reject invalid payload types (e.g., strings masquerading as integers) before they ever reach the ORM.

## 4. Cross-Site Scripting (XSS)

*   **Risk:** If question text or explanations contain malicious JavaScript, rendering them on the frontend could execute the payload.
*   **Mitigation:**
    *   React (Next.js) automatically escapes standard text.
    *   If any question content requires rendering Markdown or HTML via `dangerouslySetInnerHTML`, the payload MUST be passed through **DOMPurify** (or equivalent sanitizer) on the client side before rendering.
    *   Content Security Policy (CSP) headers will restrict the execution of inline scripts.

## 5. Cross-Site Request Forgery (CSRF)

*   **Risk:** An attacker tricks an authenticated user into clicking a link that submits an unwanted state-changing request (e.g., `POST /api/v1/delete-account`).
*   **Mitigation:**
    *   Because we will use `HttpOnly` cookies, we must rely on the `SameSite=Lax` (or `Strict`) cookie attribute, which prevents the browser from sending the cookie on cross-site POST requests.

## 6. Server-Side Request Forgery (SSRF)

*   **Risk:** The server is tricked into making a request to an internal IP (e.g., AWS Metadata endpoint) on behalf of the attacker.
*   **Status:** PYQBASE currently does not accept user-supplied URLs to fetch external resources. This risk is effectively **zero** for MVP.

## 7. File Upload Risks

*   **Risk:** The Admin panel allows image uploads for maps/diagrams. An attacker with compromised admin credentials uploads a malicious `.svg` or `.php` file.
*   **Mitigation:**
    *   Files are uploaded directly to **Supabase Storage (S3)**, not the local Railway filesystem.
    *   Strict MIME-type validation (only `image/jpeg`, `image/png`, `image/webp`).
    *   Maximum file size limit (e.g., 2MB).
    *   Files are served from a separate CDN domain, preventing them from executing scripts in the context of the main app domain.

## 8. API Risks & Rate Limiting

*   **Risk:** Automated bots brute-forcing the quiz engine or scraping the entire PYQ database via the Search API.
*   **Mitigation:**
    *   **Rate Limiting:** `slowapi` enforces strict Redis-backed token-bucket limits.
    *   **Pagination Limits:** `limit` query parameters are hard-capped at a maximum of `100`. The API will reject `?limit=100000` to prevent database exhaustion.
    *   **Payload Stripping:** As noted in the API Architecture, list views strip out the `correct_option` and `explanation` so scrapers cannot build an offline copy of the answer keys.

## 9. Secrets Management & Encryption

*   **Secrets:** No `.env` files will ever be committed to Git. Secrets (Supabase JWT Secret, DB URL, Resend API Key) are injected securely via Vercel and Railway environment variables.
*   **Encryption in Transit:** Strict TLS 1.3 (HTTPS) mandated. HSTS headers enabled.
*   **Encryption at Rest:** Supabase Postgres databases run on encrypted AWS EBS volumes.

---

## 10. Developer Pre-Flight Security Checklist

Before deploying Phase 1 to production, the engineering team must check off the following:

- [ ] **Auth:** Are session tokens stored in `HttpOnly` cookies?
- [ ] **Authz:** Do all protected API endpoints verify ownership (`item.user_id == user.id`)?
- [ ] **Validation:** Do all API endpoints use Pydantic models with strict typing?
- [ ] **XSS:** Is `DOMPurify` active anywhere `dangerouslySetInnerHTML` is used?
- [ ] **CORS:** Is the FastAPI CORS middleware restricted to the exact production Vercel domain (and localhost for dev)?
- [ ] **Rate Limits:** Is `slowapi` active on the `/api/v1/attempts` endpoint?
- [ ] **Headers:** Are security headers (Helmet / Next.js config) enabled (CSP, HSTS, X-Frame-Options)?
- [ ] **Secrets:** Are `.env` files in `.gitignore`?
- [ ] **Dependencies:** Has `npm audit` and `pip-audit` been run to check for known CVEs in libraries?
