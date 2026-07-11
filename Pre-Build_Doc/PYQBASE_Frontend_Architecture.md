# PYQBASE Frontend Architecture
**Author:** Senior Frontend Architect  
**Date:** July 2026  
**Status:** Finalized for Development  

This document defines the technical strategy for building the PYQBASE client applications (Consumer Web & Admin Web), ensuring high performance, strict type safety, and exceptional developer experience (DX).

---

## 1. Core Framework & Routing

*   **Framework:** **Next.js (App Router)**
*   **Language:** Strict **TypeScript**
*   **Rendering Strategy:** 
    *   *Public Pages (Search, Heatmaps, Dashboards):* React Server Components (RSC) and Static Site Generation (SSG) for instant LCP and SEO dominance.
    *   *Interactive Pages (Quiz Engine, Mock Tests):* Client Components (`"use client"`) to handle rich interaction state and keyboard event listeners.

## 2. State Management Strategy

To avoid "prop drilling" and massive Context API re-renders, state is strictly partitioned:
1.  **Server State (Data Fetching):** **TanStack React Query** (or SWR). Handles caching, re-fetching, and synchronizing backend API data with the UI.
2.  **Global UI State (Client):** **Zustand**. A tiny, fast, unopinionated state manager used *only* for global UI toggles (e.g., `isSidebarOpen`, `activeQuizSessionId`).
3.  **Auth State:** **React Context** specifically tied to the Supabase Auth listener to broadcast the current `User` object across the app.
4.  **Local State:** Standard `useState` / `useReducer` for isolated component logic.

## 3. The API Layer

*   **Client:** Custom wrapped `fetch` (or Axios instance) located in `lib/api-client.ts`.
*   **Behavior:** 
    *   Automatically extracts the Supabase session token and injects it as `Authorization: Bearer <token>`.
    *   Automatically attaches the `X-Device-Fingerprint` header for unauthenticated/free-tier endpoints.
    *   Intercepts `401 Unauthorized` responses to trigger a silent token refresh or redirect to `/login`.

## 4. Components & Reusable UI (Design System)

*   **Styling:** **Tailwind CSS**. Utility-first styling ensures zero dead CSS and rapid prototyping.
*   **Component Base:** **shadcn/ui** (built on Radix UI primitives). 
    *   *Why:* We get fully accessible (WAI-ARIA compliant), keyboard-navigable components (Modals, Selects, Dropdowns) where we fully own the source code, avoiding the lock-in of heavy libraries like MUI or Chakra.
*   **Icons:** **Lucide React**.

## 5. Forms & Validation

*   **Form Management:** **React Hook Form**. Prevents unnecessary re-renders when typing in massive inputs (like the Admin Question Editor).
*   **Validation:** **Zod**. 
    *   *Why:* We define a Zod schema once (e.g., `QuestionSchema`). We use it to validate the frontend form, and we share that exact same schema with the FastAPI backend (via Pydantic equivalents) for ultimate consistency.

## 6. Theme & Dark Mode

*   **Implementation:** **`next-themes`**.
*   **Mechanism:** Toggles a `dark` class on the `<html>` root element. Tailwind picks this up via the `dark:` prefix (e.g., `bg-white dark:bg-slate-900`).
*   **FOUC Prevention:** `next-themes` blocks the "Flash of Unstyled Content" by injecting a tiny script in the `<head>` to evaluate localStorage before hydration.

## 7. Error Handling & Loading States

*   **Route Errors:** Utilizing Next.js `error.tsx` (React Error Boundaries). If the Quiz page crashes, it shows a localized fallback UI with a "Try Again" button, rather than crashing the entire app.
*   **API Errors (Toasts):** Handled via `sonner` or `react-hot-toast`. If an API call fails, a non-intrusive toast pops up with the standard JSON error message returned by FastAPI.
*   **Loading States:**
    *   *Route Transitions:* Next.js `loading.tsx` renders a lightweight skeleton while Server Components fetch data.
    *   *Client Fetching:* Custom Tailwind skeleton components (`animate-pulse`) mimic the exact shape of the incoming data (e.g., a pulsing question card).

## 8. Performance Optimization

*   **Image Optimization:** Utilizing the `next/image` component for any images loaded from Supabase Storage. This automatically serves WebP formats, resizes for mobile/desktop, and prevents Cumulative Layout Shift (CLS).
*   **Debouncing:** Search inputs use custom `useDebounce` hooks (300ms) to prevent hammering the FastAPI search endpoint on every keystroke.
*   **Code Splitting:** Next.js natively code-splits at the route level. Heavy components (like charting libraries for Analytics) will be dynamically imported (`next/dynamic`) so they don't block the initial JS bundle.

## 9. Folder Structure

```text
/frontend
 ├── /src
 │    ├── /app                  # Next.js App Router (Pages & Layouts)
 │    │    ├── (auth)           # Route group for login/signup
 │    │    ├── (dashboard)      # Route group for logged-in users
 │    │    └── /admin           # Isolated Admin routes
 │    │
 │    ├── /components           # React Components
 │    │    ├── /ui              # Dumb primitives (Buttons, Inputs - shadcn)
 │    │    ├── /forms           # Zod-validated forms
 │    │    └── /features        # Domain components (QuizEngine, Heatmap)
 │    │
 │    ├── /hooks                # Custom React Hooks
 │    │    ├── use-debounce.ts
 │    │    └── use-device-id.ts # Generates hardware fingerprint
 │    │
 │    ├── /lib                  # Utilities and Config
 │    │    ├── api-client.ts    
 │    │    ├── supabase.ts      # Supabase client instantiation
 │    │    └── utils.ts         # Tailwind clsx/tailwind-merge utils
 │    │
 │    ├── /store                # Zustand Global State
 │    │
 │    └── /types                # Global TypeScript Interfaces
```
