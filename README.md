# Kindling

**Kindling** is an AI-powered adaptive tutoring platform. It provides warm, private-school-style 1-on-1 lessons that adapt in real time to how a student thinks, struggles, and succeeds—backed by a Django learning API and a multi-provider AI gateway (platform Gemini by default, optional BYOK).

```
Kindling/
├── frontend/          # React + Vite SPA (live lessons, dashboard, subjects, settings)
├── backend/           # Django REST API (auth, profile, curriculum, learning, safety, jobs)
├── docs/              # Engineering handbook, safety & privacy
├── README.md          # This file — start here
├── CAPABILITIES.md    # Product capabilities & roadmap (source of truth for *what*)
├── PLAN.md            # Production-ready execution plan (source of truth for *order*)
└── PITCH_DECK.md      # Investor pitch narrative
```

| Doc | Purpose |
|-----|---------|
| [CAPABILITIES.md](./CAPABILITIES.md) | Full inventory + longer-term vision |
| [PLAN.md](./PLAN.md) | Phased execution (0 foundation → 2 intervention depth → …) |
| [docs/ENGINEERING.md](./docs/ENGINEERING.md) | Architecture, concepts, design decisions & trade-offs (eng team) |
| [docs/SAFETY_AND_PRIVACY.md](./docs/SAFETY_AND_PRIVACY.md) | Child-safety & privacy baseline |
| [PITCH_DECK.md](./PITCH_DECK.md) | YC pitch materials + application answer bank |
| [Kindling_YC_Pitch.pptx](./Kindling_YC_Pitch.pptx) | 10-slide YC partner deck |
| [backend/README.md](./backend/README.md) | Full API map, jobs, observability |
| [frontend/README.md](./frontend/README.md) | Frontend-focused notes |

---

## Why Kindling

- **Adaptive tutor** — Socratic by default; graduated help when stuck (micro-hint → worked example → full guide → break / easier path)
- **Knows the student** — Grade, curriculum, country, interests, and learning style shape every lesson
- **Learns from every turn** — Correctness, affect, confidence, engagement, misconceptions, and persistence feed a living learner model
- **Pilot pedagogy depth** — Skill graph + BKT-lite mastery, math verification, worked-example library, misconception playbooks, multi-step “show your work”
- **Presentation matters** — Math, lists, code, tables, and diagrams render cleanly while streaming
- **Voice-ready** — Optional speak-aloud (TTS) and speech-to-text answers
- **Progress families can trust** — Subjects, resume, skill sparks, learner pulse, weekly digests (opt-in)
- **Flexible AI** — Platform Gemini and/or bring-your-own-key (Gemini, OpenAI-compatible, Anthropic, Groq, OpenRouter)
- **Production floor** — Health probes, telemetry, failure UX, safety escalation, background jobs skeleton

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, Lucide, vanilla CSS design system |
| Backend | Django 5.1, DRF, SimpleJWT, CORS, SQLite by default |
| AI | Multi-provider gateway in the browser; platform default = Gemini |
| Data | Student profile, curriculum graph, learning events/sessions, mastery, digests, homework media |
| Seed | `seed_kindling` — demo student + Math Foundations pilot pack |

**Domain model:** each user account is one student (one `StudentProfile`). There is no multi-child parent hierarchy yet; family digests are opt-in summaries on the student account.

---

## Architecture (high level)

```
┌──────────────────────────┐     JWT + REST      ┌───────────────────────────┐
│  frontend (Vite / React) │ ─────────────────►  │  backend (Django + DRF)    │
│  Lesson UI + tools       │                     │  accounts / students       │
│  AI gateway (multi-      │ ── provider APIs ─► │  curriculum (skills,      │
│    provider / BYOK)      │     (browser)       │    examples, misconceptions│
│  learning event queue    │ ─────────────────► │  learning events, mastery, │
│  Settings, dashboard     │                     │    digests, homework       │
└──────────────────────────┘                     │  core (health, safety,     │
                                                 │    jobs, telemetry)        │
                                                 │  kindling_platform (plans) │
                                                 └───────────────────────────┘
```

- **Tutor chat / TTS / vision** resolve through the frontend AI layer (platform Gemini env key and/or user BYOK in **Settings → AI providers**). Raw API keys stay in the browser; the API stores only routing prefs and non-secret fingerprints.
- **Auth, profile, subjects, conversations, digests, platform plans, and learning analytics** go through the Django API when `VITE_API_URL` is set.
- Learning events can run in **local-mock** mode if the API is unavailable (queue + local profile still update).

---

## Prerequisites

- **Node.js** 18+ (frontend)
- **Python** 3.11+ recommended (backend; 3.13/3.14 also used in dev)
- An AI route for live tutoring:
  - Platform: `VITE_GEMINI_API_KEY`, **or**
  - BYOK: API key in the app under **Settings → AI providers**

---

## Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py seed_kindling
python manage.py runserver
```

API base: [http://127.0.0.1:8000](http://127.0.0.1:8000)

**Demo login** (also `POST /api/auth/demo/`):

| Field    | Value                  |
|----------|------------------------|
| Email    | `student@kindling.edu` |
| Password | `kindling-demo`        |

`seed_kindling` loads the demo student, **Math Foundations** pilot skill graph, worked examples, misconception catalog, multi-step problems, sample mastery sparks, and a preview parent digest.

More detail: [backend/README.md](./backend/README.md).

### 2. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env` (optional if you only use BYOK in Settings):

```env
# Platform default Gemini (chat + TTS + vision when selected)
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Wire SPA to local API (recommended)
VITE_API_URL=http://127.0.0.1:8000

# Optional overrides
# VITE_LEARNING_API_URL=http://127.0.0.1:8000/api/learning/events/
# VITE_TELEMETRY=false
```

```bash
npm run dev
```

Open the URL Vite prints (usually [http://localhost:5173](http://localhost:5173)).

Log in with the demo account (or register), complete onboarding if prompted, open **My Subjects → Math Foundations**, and start a lesson.

More detail: [frontend/README.md](./frontend/README.md).

---

## Main product surfaces

| Area | What you get |
|------|----------------|
| **Overview** | Product home / marketing entry |
| **Auth & onboarding** | Register, login, demo; rich student profile (grade, curriculum, interests, learning style, …) |
| **My Subjects** | Create subjects & topics; continue cards; transcript search |
| **Live lesson** | Streaming tutor, lesson path + skill sparks, tools sidebar, learner pulse |
| **Help ladder** | Soft idle nudge → offer → micro-hint → worked example → full guide → break/easier path; escalate / exit anytime |
| **Show library example** | Curated worked examples from the pilot catalog (preferred over free generation) |
| **Show your work** | Multi-step problems with intermediate checks and partial credit (pilot topics) |
| **Manipulatives** | Interactive fraction tools on matching pilot topics |
| **Homework photo** | Upload notebook/homework image → vision analysis + guided help path |
| **Dashboard** | Mastery, skill readiness, confidence-oriented views, family digest panel |
| **Settings** | AI providers / BYOK routing, plan entitlements (Spark / Ember / Forge pilot) |

---

## What’s implemented (through Phase 2)

High-signal features already in the monorepo (see CAPABILITIES / PLAN for full tables):

### Learning science (pilot: Math Foundations)

- Skill graph + **BKT-lite** mastery (“Skill sparks”: Growing roots → Ready to spark → Catching fire → Glowing)
- Math **correctness verifier** (hidden `⟦check …⟧` tags; server prefers checker over linguistic yes/no for mastery)
- **Worked-example library** (DB + API; grade bands; tutor prefers library over free generation)
- **Misconception engine** (catalog + remediation playbooks; detect/remediate events; success boosts skill mastery)
- **Multi-step show-your-work** (step panel, A3-aligned intermediate checks, partial credit)

### Intervention & affect

- Rich struggle signals (idle, short answers, thrashing, rapid guessing, off-topic, incorrect/hint streaks)
- Soft idle nudge (~45s) before a full help offer
- Graduated intervention ladder with level-aware CTA, escalate, and exit
- Affective check-ins + persistence celebration (student UI + parent digest “Effort & heart”)

### Continuity & family

- Topic conversations with resume snapshots, localStorage cache, and transcript search
- Opt-in **weekly parent digests** (job + Dashboard family panel; effort-first copy)
- Homework photo uploads with retention policy (default 30 days)

### Platform floor

- Health live/ready endpoints, structured request logs, client error + product metrics
- AI/API failure UX (retry, offline event queue, chat history kept)
- Age-aware safety policy + distress escalation path (pause tutor + scrubbed `SafetyEvent`)
- Account export / delete (`GET /api/auth/export/`, `DELETE /api/auth/account/`)
- Background job runner (`heartbeat`, `weekly_digest`, placeholders for mastery/review)
- Pilot plans & AI routing prefs under `/api/platform/`

---

## Key technical capabilities

- Multi-provider AI gateway (`frontend/src/services/ai/`): platform Gemini + BYOK for Gemini, OpenAI-compatible, Anthropic, Groq, OpenRouter; per-task routing (chat / vision / TTS) on higher plans
- Streaming tutoring with profile-, safety-, and signal-aware system prompts
- Learning pipeline: signal extraction → session tracker → local profile → API events
- Rich tutor rendering (Markdown, GFM tables, KaTeX, code blocks, diagrams)
- Gemini TTS + browser speech recognition
- Django apps: `accounts`, `students`, `curriculum`, `learning`, `core`, `kindling_platform`

### Useful API groups

| Group | Examples |
|-------|----------|
| **Auth** `/api/auth/` | `POST …/register/`, `…/login/`, `…/demo/`, `…/refresh/`, `GET …/me/`, `GET …/export/`, `DELETE …/account/` |
| **Students** `/api/students/` | `GET/PATCH …/me/` (profile + digest prefs) |
| **Subjects** `/api/subjects/` | subjects & topics CRUD |
| **Learning** `/api/learning/` | events, profile, dashboard, sessions |
| Skills | `GET …/skills/`, `…/skills/path/`, `…/skills/next/` |
| Pedagogy libraries | `GET …/worked-examples/`, `…/misconceptions/`, `…/multistep/` |
| Math / homework | `POST …/verify-math/`, `POST …/homework/` |
| Digests | `GET/POST …/digests/` |
| Conversations | shelf, ensure, resume, messages, archive, continue list, transcript search |
| **Platform** `/api/platform/` | plans, subscription, AI routing prefs |
| **Safety** `/api/safety/` | policy by grade, distress event ingest |
| **Ops** | `GET /health/`, `GET /api/telemetry/summary/`, `GET /api/jobs/status/` |

Full tables: [backend/README.md](./backend/README.md).

---

## Environment variables (frontend)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_GEMINI_API_KEY` | For platform Gemini | Default chat + TTS + vision when not using BYOK |
| `VITE_API_URL` | Recommended | Base URL for auth, profile, subjects, learning, platform |
| `VITE_LEARNING_API_URL` | Optional | Override learning event ingest endpoint |
| `VITE_LEARNING_USE_HTTPBIN` | Optional | Dev-only remote sink for events |
| `VITE_TELEMETRY` | Optional | Set `false` to disable client error/metric posts |

Without any AI route (env key or BYOK), the lesson UI loads but tutoring cannot stream. Configure keys under **Settings → AI providers** if you prefer not to use `.env`.

**Backend** defaults to SQLite (`backend/db.sqlite3`) for local dev. For production, point Django at Postgres and keep secrets out of the repo (see PLAN Phase 0.1 and [backend/README.md](./backend/README.md)).

---

## Development scripts

### Frontend (`frontend/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

Pedagogy unit smokes under `frontend/scripts/` (see each script header for any esbuild/bundle step):

```bash
node scripts/smoke-struggle-b1.mjs
node scripts/smoke-struggle-b2.mjs
node scripts/smoke-affect-b3.mjs
node scripts/smoke-worked-b4.mjs
node scripts/smoke-misconception-b5.mjs
node scripts/smoke-multistep-b6.mjs
```

### Backend (`backend/`)

| Command | Description |
|---------|-------------|
| `python manage.py runserver` | Dev API server |
| `python manage.py migrate` | Apply migrations |
| `python manage.py seed_kindling` | Demo student + pilot pedagogy data |
| `python manage.py createsuperuser` | Django admin user |
| `python manage.py run_job list` | List background jobs |
| `python manage.py run_job heartbeat` | Prove job runner |
| `python manage.py run_job weekly_digest --dry-run` | Digest dry-run |
| `python manage.py run_scheduled_jobs` | Run every due job by interval |
| `python manage.py test` | Backend test suite (includes B1–B6 pedagogy tests) |

Admin (after superuser): [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)

---

## Repository map

```
frontend/src/
  components/     # Lesson, dashboard, auth, subjects, settings, overview
  hooks/          # Auth, chat session, learning, multi-step, speech, profile
  services/
    ai/           # Multi-provider gateway, key vault, routing
    learning/     # Signals, struggle, ladder, misconceptions, multistep, …
    api/          # REST client (auth, learning, platform)
    safety/       # Age policy + distress client
  styles/         # Lesson + tutor content CSS

backend/
  accounts/           # JWT auth, demo login, export/delete
  students/           # Student profile (1:1 with user), digest prefs
  curriculum/         # Subjects, topics, skill graph, worked examples,
                      #   misconception defs, multi-step problems
  learning/           # Events, sessions, mastery, digests, homework, APIs
  core/               # Health, telemetry, safety, job runner
  kindling_platform/  # Plans (Spark / Ember / Forge), subscription, AI routing prefs
```

---

## Design principles

1. **Respect the learner** — normalize struggle; never shame in student-facing copy.  
2. **Guide before giving** — Socratic by default; intervention explicit and exit-able.  
3. **Presentation is pedagogy** — math/code/diagrams stay readable while streaming.  
4. **Adapt quietly** — scores and models stay internal; tutor speech stays human.  
5. **Parents and students see progress differently** — student: encouragement; family: clarity.  
6. **Safety and privacy scale with trust** — especially for children.  

---

## Roadmap snapshot

**Done (see PLAN.md Phases 0–2):** production floor (observability, resilience UX, safety, jobs), Horizon A core slice (mastery graph, resume, math check, homework photo, digests, manipulatives), intervention depth (richer struggle signals, graduated ladder, affective check-ins, worked examples, misconception engine, multi-step work), multi-provider AI + pilot plans.

**Next (Phase 3+):** spaced review scheduler, real parent multi-child accounts, classroom mode, standards reports, assessment modes, eval harness, deeper multimodal/voice polish, Postgres-by-default deploy path.

Full detail: **[PLAN.md](./PLAN.md)** and **[CAPABILITIES.md](./CAPABILITIES.md)**.

---

## Try the pilot pedagogy (after seed)

1. Log in as the demo student (`student@kindling.edu` / `kindling-demo`).  
2. Open **My Subjects → Math Foundations** (fractions → early algebra).  
3. Start a lesson. In **Tools**, try:
   - **Help ladder** (or wait idle / struggle to see soft nudge → offer)
   - **Show library example**
   - **Show your work** (e.g. on *Adding fractions*)
   - Fraction **manipulatives** where the topic supports them  
4. Optionally upload a **homework photo** for guided help.  
5. Leave mid-lesson and return via **Continue** on My Subjects / Dashboard.  
6. Dashboard → family digest preview (opt-in + generate).  
7. **Settings** → AI providers / plan routing if you want BYOK instead of the platform Gemini key.

---

## License & contributing

Project-specific license and contribution guidelines can be added here as the project is published. For local development, use the demo account or register a new student through the UI.
