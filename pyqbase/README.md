# PYQBase Monorepo

This monorepo contains the Next.js frontend and the FastAPI backend for PYQBase.

## Project Structure
- `/frontend` - Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui, Zustand, TanStack Query, React Hook Form + Zod, next-themes.
- `/backend` - FastAPI, Python 3.12, SQLModel, Pydantic V2.

## How to run locally

### Frontend
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. The frontend will be available at `http://localhost:3000`.

### Backend
1. Navigate to the backend directory: `cd backend`
2. Set up virtual environment: `python -m venv .venv`
3. Activate the virtual environment:
   - Windows: `.venv\Scripts\activate`
   - Mac/Linux: `source .venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run the server: `uvicorn app.main:app --reload`
6. The backend will be available at `http://localhost:8000`. You can check the health status at `http://localhost:8000/health`.
