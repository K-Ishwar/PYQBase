# PYQBASE DevOps & Deployment Architecture
**Author:** Senior DevOps Engineer  
**Date:** July 2026  
**Status:** Finalized for Development  

This document outlines the cloud infrastructure, deployment pipelines, and operational strategies for PYQBASE. The core philosophy of this architecture is **"Zero-Ops Bootstrapping"**: minimizing server management, eliminating manual scaling, and maximizing cost efficiency for a solo founder.

---

## 1. Cloud Provider Recommendations

We will utilize a specialized, decoupled Serverless/PaaS stack rather than a traditional monolithic cloud provider (AWS/GCP/Azure).

| Component | Recommended Provider | Why? | Estimated Cost (Launch) |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | Native Next.js support, edge caching, zero-config CI/CD. | $0 (Hobby) / $20 (Pro) |
| **Backend & Cache** | **Railway** | Docker-based PaaS. Cheaper and faster to deploy than AWS ECS. Auto-scales based on CPU. | ~$5 - $10 (Usage based) |
| **Database & Auth** | **Supabase Cloud** | Managed Postgres, Auth, and Storage. Built-in PgBouncer and automated daily backups. | $25 (Pro Plan) |
| **DNS & CDN** | **Cloudflare** | Industry-leading DNS resolution and edge DDoS protection. | $0 (Free Plan) |

**Decision on Kubernetes (K8s):**  
*Explicitly Rejected.* Kubernetes is severe architectural overkill for a monolithic MVP managed by a single developer. Railway abstracts container orchestration perfectly without requiring a single line of YAML.

---

## 2. Git Strategy (Trunk-Based Development)

For a solo founder, GitFlow is too slow. We will use **Trunk-Based Development**.
*   **Branches:** Only one permanent branch: `main`.
*   **Workflow:** 
    1. Create a short-lived feature branch (`feat/search-bar`).
    2. Commit code.
    3. Open a Pull Request against `main`.
    4. CI Pipeline runs tests.
    5. Squash-merge to `main`.
*   **Deployments:** Every merge to `main` automatically triggers a production deployment via Vercel and Railway webhooks.

---

## 3. Docker Strategy

*   **Frontend (Next.js):** No Dockerfile required. Vercel handles the build pipeline natively.
*   **Backend (FastAPI):** A multi-stage `Dockerfile` will be utilized.
    *   *Stage 1 (Builder):* Installs Python `requirements.txt` (including heavy ML libs if needed) into a virtual environment.
    *   *Stage 2 (Runner):* Uses a slim Python alpine/debian image, copies the virtual environment, and runs `uvicorn`. This keeps the final image size extremely small and fast to boot on Railway.

---

## 4. CI/CD Pipeline (GitHub Actions)

**Trigger:** On Pull Request to `main`.
**Jobs:**
1.  **Frontend Check:** Runs `npm run lint` and `npm run typecheck` (TypeScript).
2.  **Backend Check:** Runs `pytest` and `flake8/black` formatting checks.

**Trigger:** On Push/Merge to `main`.
**Jobs:**
1.  Vercel Webhook fires -> Builds and deploys the Next.js static and serverless edge functions.
2.  Railway Webhook fires -> Builds the FastAPI `Dockerfile` and deploys the container, replacing the old version with zero downtime.

---

## 5. Domain, DNS, Reverse Proxy & SSL

*   **Domain Registration:** Cloudflare.
*   **DNS Management:** Cloudflare DNS.
    *   `A` / `CNAME` records pointing `pyqbase.com` to Vercel.
    *   `CNAME` record pointing `api.pyqbase.com` to Railway.
*   **Reverse Proxy:** Railway acts as a Layer-7 Envoy proxy for the backend, routing traffic to the active Docker containers.
*   **SSL / TLS:** Zero-config. Vercel and Railway automatically provision, renew, and terminate Let's Encrypt SSL certificates. All traffic defaults to strict HTTPS (TLS 1.3).

---

## 6. Environment Variables & Secrets Management

*   **Rule:** `.env` files are in `.gitignore`. No secrets are ever committed to the repo.
*   **Frontend Config:** Managed securely in the Vercel Dashboard (e.g., `NEXT_PUBLIC_SUPABASE_URL`).
*   **Backend Config:** Managed securely in the Railway Dashboard (e.g., `DATABASE_URL`, `REDIS_URL`, `GROQ_API_KEY`).
*   Railway allows sharing environment variables across environments (Staging vs Prod).

---

## 7. Monitoring & Logging

*   **Frontend Web Vitals:** Vercel Analytics (tracks LCP, CLS, FCP) to monitor user experience.
*   **Application Logs:** FastAPI standard output (JSON structured logs) is automatically ingested by the Railway Log Viewer. No ELK stack needed for MVP.
*   **Crash Reporting:** **Sentry** integrated into both Next.js and FastAPI. Triggers an email/Slack alert if a user encounters a `500 Internal Server Error` or an unhandled frontend exception.

---

## 8. Backup Strategy & Disaster Recovery

*   **Database:** Supabase Pro automatically takes daily logical backups (pg_dump) and enables Point-In-Time Recovery (PITR), maintaining 7 days of Write-Ahead Logs (WAL).
*   **Codebase:** GitHub serves as the remote backup.
*   **Disaster Recovery (RTO < 2 hours):** If Railway suffers a total regional outage, the backend can be redeployed to DigitalOcean App Platform or Render within 15 minutes simply by connecting the GitHub repo and injecting the environment variables.

---

## 9. Scaling & Cost Optimization

### Scaling Triggers
1.  **Traffic Spikes:** Vercel automatically scales Edge functions infinitely.
2.  **Backend CPU Spikes:** Railway can be configured to auto-scale the FastAPI Docker container (spin up replicas) if CPU exceeds 75%.
3.  **Database Connection Limits:** As FastAPI replicas scale up, they will exhaust standard Postgres connections. **PgBouncer** (provided by Supabase) is mandatory to pool connections and protect the database from crashing.

### Cost Optimization
This architecture is heavily optimized for a bootstrapped startup:
*   **Avoided Costs:** No AWS NAT Gateways ($30/mo), no Idle Load Balancers ($15/mo), no expensive Kubernetes control planes ($70/mo).
*   **Offloading ML:** By running the FAISS syllabus mapping offline on the founder's laptop and uploading the resulting `.faiss` index to Supabase, we avoid renting a 4GB+ RAM server 24/7.
*   **Total Estimated MVP Operational Cost:** **~$30 to $50 per month**, easily covered by just 2 Premium subscribers.
