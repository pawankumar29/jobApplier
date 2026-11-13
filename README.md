# AutoJob AI — Autonomous Job Discovery & Application Platform

AutoJob AI is a production-grade, fully autonomous job discovery and application platform integrating with LinkedIn, Naukri.com, and direct ATS career portals (Greenhouse, Lever, Workday).

It automates the complete lifecycle: **Discovery → AI Semantic Match Evaluation → Early Applicant Prioritization → Form Autofill & Screening Q&A → Submission Verification**.

---

## Architecture & Technology Stack

- **Full-Stack TypeScript**: Type-safe shared contracts from database to UI.
- **Backend API**: Node.js v22 + Express (TypeScript), REST endpoints, Server-Sent Events (SSE) live bus.
- **Database**: SQLite (WAL mode) with **Prisma ORM** (zero configuration local setup, one-line switch to PostgreSQL).
- **AI Matching Engine**: Hybrid engine featuring **Google Gemini API** (`@google/generative-ai`) for contextual evaluation + strict heuristic fallback (0–100 score, classification, matching vs. missing skills, rationale).
- **Resume Intelligence**: `pdf-parse` & `mammoth` (DOCX) structured information extraction.
- **Autonomous Daemon**: In-process persistent priority queue, recency weighting, latency tracking, retry backoff, daily rate-limit enforcement.
- **Frontend Dashboard**: Vite + React 18 + Tailwind CSS + Lucide icons + Recharts.

---

## Platform Compliance & Integration Boundaries

AutoJob AI strictly complies with platform terms and security standards:
- **LinkedIn**: Supports official OAuth 2.0 authorization, structured job discovery feeds, and user-authorized session tokens (`li_at`).
- **Naukri**: Supports authorized session tokens and fast search discovery feeds.
- **Anti-Bot & CAPTCHA Safeguards**: The system **never** attempts automated CAPTCHA bypasses. When a platform gates a flow, it halts, marks the state as `ACTION_REQUIRED`, and notifies the user in real time.
- **Credential Security**: Credentials and session tokens are encrypted with AES-256-GCM before storage.

---

## Getting Started

### 1. Prerequisites
- Node.js v20+ (Node v22 recommended)
- npm v10+

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/pawankumar29/jobApplier.git
cd projects

# Install dependencies
npm install
cd client && npm install && cd ..
```

### 3. Database Initialization & Seeding
```bash
# Push Prisma schema to SQLite
npx prisma db push --schema=server/prisma/schema.prisma

# Seed realistic profile, resumes, and test integrations
npm run db:seed
```

### 4. Running the Development Services
```bash
# Run both Backend API and Vite Frontend concurrently
npm run dev

# Or run separately:
npm run dev:server  # Runs Express API on http://localhost:5000
npm run dev:client  # Runs Vite Frontend on http://localhost:5173
```

### 5. Running Automated Tests
```bash
npm run test
```

---

## Key Features

1. **Autonomous 24/7 Daemon**: Operates continuously in the background without requiring an open browser tab.
2. **Early Applicant Prioritization**: Tracks publication timestamps, prioritizing newly posted opportunities (sub-10 minute time-to-apply).
3. **AI Semantic Matching**: Evaluates true technical compatibility, seniority, location, and salary without naive keyword hallucination.
4. **Factual Screening Q&A**: Dynamically fills multi-step application questions referencing only verified candidate data.
5. **Modern Real-Time Dashboard**:
   - **Overview**: KPIs, velocity charts, and latency telemetry benchmarks.
   - **Live Job Feed**: Multi-platform filtering, search, and deep AI match drawer.
   - **Application Tracker**: Status history, confirmation IDs, latency tracking.
   - **Resume Intelligence**: PDF & DOCX upload with structured JSON parsing.
   - **Integration Hub**: LinkedIn & Naukri credentials vault with AES-256-GCM.
   - **Daemon Controls**: Start, Pause, Resume, Stop, concurrency and daily limit caps.

