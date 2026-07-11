# PYQBASE UI/UX Architecture & Design System
**Author:** Senior UI/UX Designer  
**Date:** July 2026  
**Status:** Finalized for Development  

This document outlines the complete user experience, design system, and wireframe flows for PYQBASE. It builds upon the excellent baseline UI provided in the reference image, elevating it with modern SaaS trends, accessibility standards, and a premium "dark-mode ready" aesthetic.

---

## 1. Vision & Baseline Analysis

**Review of the Attached Baseline:**
The provided UI mockup is extremely strong. It is clean, functional, and maps perfectly to the mental model of a student (Exam -> Subject -> Topic -> Question). The use of white space and subtle borders is excellent for readability.

**My Suggested "Better Vision" Elevating to Modern SaaS:**
While the baseline is great, we can make it feel like a premium $50/mo SaaS rather than a basic ed-tech blog by introducing:
1.  **Dark Mode (Crucial):** Aspirants study late at night. A sleek, OLED-friendly dark mode is non-negotiable for retention.
2.  **Glassmorphism & Depth:** Using blurred, translucent sticky headers (`backdrop-filter: blur()`) to maintain context while scrolling through long questions.
3.  **Micro-Interactions:** Subtle scale animations on hover for Exam Cards, and smooth layout transitions when expanding explanations.
4.  **Immersive Focus Mode:** When a user enters the Quiz Engine, all sidebars should collapse into a distraction-free "Zen Mode".

---

## 2. Design System

### Color Palette
*   **Primary (Brand):** Indigo / Royal Blue (`#4F46E5` to `#3730A3`). Represents trust, intelligence, and focus.
*   **Secondary (Action):** Sky Blue (`#0EA5E9`) for secondary buttons and active UI states.
*   **Success (Correct):** Emerald Green (`#10B981`) with a soft green background (`#D1FAE5`) for selected correct options.
*   **Danger (Wrong):** Rose Red (`#F43F5E`) for incorrect option selections and destructive actions.
*   **Surface (Light Mode):** Background (`#F8FAFC`), Cards (`#FFFFFF`), Borders (`#E2E8F0`).
*   **Surface (Dark Mode):** Background (`#0F172A`), Cards (`#1E293B`), Borders (`#334155`).

### Typography
*   **Primary Font:** `Inter` or `Plus Jakarta Sans`. Both are highly legible, modern geometric sans-serif fonts used by top-tier SaaS companies.
*   **Headings:** Bold (700) or ExtraBold (800) with tight tracking (letter-spacing: -0.02em).
*   **Body Text:** Regular (400) or Medium (500) with generous line-height (`1.6`) to prevent eye strain during long reading sessions.
*   **Monospace (for code/IDs):** `JetBrains Mono` or `Fira Code`.

---

## 3. Component Library (Atomic Design)

*   **Atoms:** 
    *   Primary Button (Solid Indigo, rounded-md)
    *   Secondary Button (Outline, gray text)
    *   Exam Badges (Small pills: `[UPSC CSE]`, `[CAPF]`)
    *   Difficulty Pills (Green=Easy, Yellow=Med, Red=Hard)
*   **Molecules:**
    *   **Question Option Row:** A clickable div containing `(A)` and the text. On click, border turns Indigo. On submit, border turns Green/Red.
    *   **Search Bar:** Large, pill-shaped, with a leading magnifying glass icon and a trailing `⌘K` shortcut hint.
*   **Organisms:**
    *   **Question Card (Quiz View):** Combines Question Stem, Options, Submit Button, and hidden Explanation block.
    *   **Topic Grid:** A CSS grid of cards displaying Subtopic name, icon, and question count (as seen in the baseline image).

---

## 4. User Flow & Screen Flow

### Flow 1: Public Exploration (Unauthenticated)
1.  **Landing Page:** Hero section -> Global Search -> "Choose Your Exam" Grid.
2.  **Exam Page (`/exams/upsc-cse`):** Shows syllabus subjects.
3.  **Subject Page (`/exams/upsc-cse/geography`):** Grid of topics (Climatology, Geomorphology).
4.  **Topic Page (`/topics/climatology`):** List of questions (as seen in baseline).
5.  **Question Detail (`/questions/uuid`):** Shows question. **Friction Point:** If user clicks "Show Answer", trigger Login Modal with "Sign up to view AI explanations and track your score."

### Flow 2: Daily Revision (Authenticated)
1.  **User Dashboard:** Replaces the generic homepage. Shows "Daily Streak", "SRS Review Queue (45 Qs)", and "Topic Heatmap".
2.  **SRS Quiz Engine:** User clicks "Start Daily Review".
3.  **Focus Mode:** Sidebars disappear. One question on screen.
4.  **Submission:** User selects option. Instant feedback (Green/Red). AI Explanation slides down. Next Question button appears. ELO updates silently in the background.

---

## 5. Layouts & Navigation

### Desktop Layout
*   **Top Navigation (Sticky):** Logo (left), Breadcrumbs (middle), Global Search `⌘K`, Dark Mode Toggle, Profile Avatar (right).
*   **Left Sidebar (Contextual):** 
    *   *If exploring subjects:* Lists Exams and Quick Links.
    *   *If in Dashboard:* Lists Home, Mock Tests, Analytics, Saved Bookmarks.
*   **Main Content Area:** Max-width constrained (e.g., `max-w-5xl`) to ensure reading lines don't get too wide on ultrawide monitors.

### Mobile Layout
*   **Top Navigation:** Logo, Hamburger Menu.
*   **Bottom Tab Bar (Authenticated):** Home, Search, Mock Tests, Profile. (Provides app-like experience).
*   **Sidebar:** Hidden behind the Hamburger menu (Off-canvas drawer).
*   **Question View:** Options stack vertically. Explanation block stacks below options rather than side-by-side (which is done on desktop).

### Dashboard Layout (Authenticated User)
*   **Greeting:** "Welcome back, Arjun. Your exam is in 142 days."
*   **Top Row Cards:** 
    *   Daily Limit: `12 / 30 Attempts Used` (Progress Bar).
    *   SRS Queue: `45 Questions Due Today` (Primary Action Button).
*   **Middle Section:** "Weak Areas" heatmap (Red/Yellow/Green blocks for topics).
*   **Bottom Section:** "Resume Mock Test" or "Recent Mistakes".

---

## 6. Accessibility (a11y)

*   **Keyboard Navigation:** Fully navigable via `Tab`. The Quiz Engine must support keyboard shortcuts (Press `A`, `B`, `C`, `D` to select options, `Enter` to submit).
*   **Contrast Ratios:** All text-to-background contrast will meet WCAG AA standards (minimum 4.5:1).
*   **Screen Readers:** `aria-labels` on all icon-only buttons (like Bookmark or Dark Mode toggle). Question elements will use semantic HTML (`<fieldset>` and `<legend>` for question options).

---

## 7. Wireframes (Text Description based on Baseline)

**Wireframe: The Quiz Engine (The Core Screen)**
```text
[ Navbar: PYQBase Logo | Breadcrumb: UPSC > Geog > Climatology | 🌙 | (Avatar) ]
--------------------------------------------------------------------------------
                                                                [ Bookmark Icon ]
[ Exam Badge: UPSC 2024 ]  [ Difficulty: Medium ] 

Q: With reference to 'El Nino', consider the following statements:
   1. It is a warm ocean current...
   2. It leads to an increase in sea surface temp...
   
   Which of the statements given above is/are correct?
   
   [ ] A. 1 and 2 only
   [x] B. 2 and 3 only  <-- (User selects this, turns blue outline)
   [ ] C. 1 and 3 only
   [ ] D. 1, 2, and 3
   
                   [ Submit Answer ]
                   
--------------------------------------------------------------------------------
(UPON SUBMITTING)
                   
   [✓] B. 2 and 3 only  <-- (Turns Green, success icon appears)
   
   +--------------------------------------------------------------------------+
   |  Answer: B                                                               |
   |                                                                          |
   |  [ AI Explanation ]                                                      |
   |  El Nino is associated with the warming of sea surface temperatures...   |
   |  Statement 1 is incorrect because...                                     |
   +--------------------------------------------------------------------------+
   
   [ < Previous Question ]                                 [ Next Question > ]
```
