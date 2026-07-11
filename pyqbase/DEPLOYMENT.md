# PYQBase Deployment Guide

This document outlines the deployment configuration for PYQBase, targeting Vercel (Frontend), Railway (Backend), and Supabase (Database/Auth).

## 1. Supabase Setup
1. Create a new project in the Supabase Dashboard.
2. Run the schema migrations located in `backend/migrations/` (start with `001_initial_schema.sql`, then `002_add_missing_fields.sql`) via the Supabase SQL Editor.
3. Enable **Point-in-Time Recovery (PITR)** in Database Settings (if applicable to your plan).
4. Retrieve the **Project URL**, **anon key**, **service_role key**, and **Database Connection String (Session/PgBouncer)**.

## 2. Railway Configuration (Backend)
1. Create a new Railway project and connect it to the GitHub repository.
2. Ensure Railway is pointed to the `/backend` directory and uses the provided `Dockerfile`.
3. Set the following environment variables:
   - `DATABASE_URL`: Your Supabase connection string.
   - `SUPABASE_URL`: Supabase Project URL.
   - `SUPABASE_SERVICE_KEY`: Supabase service_role key.
   - `SUPABASE_JWT_SECRET`: JWT secret from Supabase API settings.
   - `GROQ_API_KEY`: Groq API Key.
   - `RESEND_API_KEY`: Resend API Key.
   - `CORS_ORIGINS`: Comma-separated list of allowed frontend domains (e.g., `https://pyqbase.com,https://www.pyqbase.com`).
   - `ENVIRONMENT`: `production`
   - `SENTRY_DSN`: Your backend Sentry DSN.

## 3. Vercel Configuration (Frontend)
1. Import the project in Vercel. Set the **Framework Preset** to Next.js and the **Root Directory** to `frontend`.
2. Set the following environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase Project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key.
   - `NEXT_PUBLIC_API_URL`: Your deployed Railway backend URL (e.g., `https://api.pyqbase.com`).
   - `NEXT_PUBLIC_SENTRY_DSN`: Your frontend Sentry DSN.
   - `SENTRY_AUTH_TOKEN`: Token for uploading source maps to Sentry (required for CI).
   - `SENTRY_ORG`: Sentry organization slug.
   - `SENTRY_PROJECT`: Sentry project slug.

## 4. Cloudflare DNS Records
1. **Frontend (Vercel)**:
   - `A` record for the root domain (`@`) pointing to Vercel's IP (e.g., `76.76.21.21`), or an `ALIAS` record if supported.
   - `CNAME` for `www` pointing to `cname.vercel-dns.com`.
2. **Backend (Railway)**:
   - `CNAME` for `api` (e.g., `api.pyqbase.com`) pointing to your Railway generated domain.

Once configured, any push to the `main` branch will automatically trigger deployments on both Vercel and Railway, with GitHub Actions running CI checks (`npm run lint`, `npm run typecheck`, `pytest`, `black`) on PRs to `main`.
