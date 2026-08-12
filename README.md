# Kindling

**Kindling** is an AI-powered adaptive tutoring platform. It provides warm, private-school-style 1-on-1 lessons that adapt in real time to how a student thinks, struggles, and succeeds—powered by Google Gemini and a Django learning API.

```
Kindling/
├── frontend/          # React + Vite SPA (live lessons, dashboard, subjects)
├── backend/           # Django REST API (auth, profile, curriculum, learning)
├── docs/              # Safety, privacy, and ops notes
├── README.md          # This file
├── CAPABILITIES.md    # Product capabilities & roadmap
├── PLAN.md            # Production-ready execution plan
└── PITCH_DECK.md      # Investor pitch narrative
```

- Full product inventory & roadmap: **[CAPABILITIES.md](./CAPABILITIES.md)**  
- Execution plan: **[PLAN.md](./PLAN.md)**  
- Safety & privacy baseline: **[docs/SAFETY_AND_PRIVACY.md](./docs/SAFETY_AND_PRIVACY.md)**  
- Investor pitch deck (Markdown): **[PITCH_DECK.md](./PITCH_DECK.md)**

---

## Why Kindling

- **Adaptive tutor** — Socratic by default; steps into a clear step-by-step guide when the learner is stuck  
- **Knows the student** — Grade, curriculum, country, interests, and learning style shape every lesson  
- **Learns from every turn** — Correctness, confidence, engagement, and misconceptions feed a living learner model  
- **Presentation matters** — Math, lists, code, tables, and diagrams render cleanly for young learners  
- **Voice-ready** — Optional speak-aloud (TTS) and speech-to-text answers  
- **Progress you can see** — Subjects, lesson paths, learner pulse, and a family-style dashboard  

---

## Architecture (high level)

```
┌─────────────────────┐         JWT + REST          ┌──────────────────────┐
│  frontend (Vite)    │ ──────────────────────────► │  backend (Django)    │
│  React lesson UI    │                             │  accounts / students │
│  Gemini chat + TTS  │ ── Gemini API (browser) ──► │  curriculum          │
│  learning events    │ ──────────────────────────► │  learning events &   │
└─────────────────────┘                             │  profiles / sessions │
                                                    └──────────────────────┘
```

- **Tutor replies** stream from Gemini in the browser (requires `VITE_GEMINI_API_KEY`).  
- **Auth, profile, subjects, and learning analytics** go through the Django API when configured.  
- Learning events can run in **local-mock** mode if the API URL is not set.

---

## Prerequisites

- **Node.js** 18+ (frontend)  
- **Python** 3.11+ recommended (backend)  
- A **Google Gemini API key** from [Google AI Studio](https://aistudio.google.com/)  

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

**Demo login** (also available via `POST /api/auth/demo/`):

| Field    | Value                 |
|----------|-----------------------|
| Email    | `student@kindling.edu` |
| Password | `kindling-demo`        |

More detail: [backend/README.md](./backend/README.md).

### 2. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Optional — wire SPA to local API
VITE_API_URL=http://127.0.0.1:8000
VITE_LEARNING_API_URL=http://127.0.0.1:8000/api/learning/events/
```

```bash
npm run dev
```

Open the URL Vite prints (usually [http://localhost:5173](http://localhost:5173)).

More detail: [frontend/README.md](./frontend/README.md).

---

## Main product surfaces

| Area | What you get |
|------|----------------|
| **Overview** | Product home / marketing entry |
| **Auth & onboarding** | Register, login, demo; rich student profile |
| **My Subjects** | Create subjects & topics; launch lessons |
| **Live lesson** | Chat tutor, collapsible lesson path, tools (hints, guide mode, voice, learner pulse) |
| **Intervention** | Auto or offered step-by-step guide when struggling; student can exit anytime |
| **Dashboard** | Progress, mastery, confidence-oriented views for families |

---

## Key technical capabilities

- Streaming Gemini tutoring with profile- and signal-aware system prompts  
- **Intervention mode** after repeated incorrect answers or manual request  
- Learning pipeline: signal extraction → session tracker → local profile → API events  
- Rich tutor message rendering (Markdown, GFM tables, KaTeX math, code blocks)  
- Gemini TTS + browser speech recognition  
- Django apps: `accounts`, `students`, `curriculum`, `learning`  

---

## Environment variables (frontend)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_GEMINI_API_KEY` | Yes (for live AI) | Gemini chat + TTS |
| `VITE_API_URL` | Recommended | Base URL for auth, profile, subjects |
| `VITE_LEARNING_API_URL` | Optional | Learning event ingest endpoint |
| `VITE_LEARNING_USE_HTTPBIN` | Optional | Dev-only remote sink for events |

Without a Gemini key, the lesson UI loads but tutoring cannot stream.

---

## Development scripts

### Frontend (`frontend/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

### Backend (`backend/`)

| Command | Description |
|---------|-------------|
| `python manage.py runserver` | Dev API server |
| `python manage.py migrate` | Apply migrations |
| `python manage.py seed_kindling` | Demo student + sample data |
| `python manage.py createsuperuser` | Django admin user |

Admin (after superuser): [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)

---

## Repository map

```
frontend/src/
  components/     # Lesson, dashboard, auth, subjects, overview
  hooks/          # Auth, chat session, learning, speech, profile
  services/       # Gemini, TTS, learning analytics, API client
  styles/         # Lesson + tutor content CSS

backend/
  accounts/       # JWT auth, demo login
  students/       # Student profile (1:1 with user)
  curriculum/     # Subjects & topics
  learning/       # Events, sessions, mastery, dashboard
```

---

## Design principles

1. Guide before giving answers (Socratic default).  
2. When stuck, intervene kindly—and let the student leave guide mode.  
3. Presentation is part of teaching (clear math, lists, code, diagrams).  
4. Adapt using data; speak as a human tutor, not a scoreboard.  
5. Build for learners first; give families clarity without shame.

---

## Roadmap snapshot

Short list of high-impact next steps (see **CAPABILITIES.md** for the full list):

- Skill-level mastery model and curriculum prerequisite graphs  
- Homework photo upload and visual manipulatives  
- Session history / resume and parent digests  
- Math/code answer verification  
- Parent multi-child accounts and classroom modes  

---

## License & contributing

Project-specific license and contribution guidelines can be added here as the project is published. For local development, use the demo account or register a new student through the UI.

---

## Docs

| Document | Description |
|----------|-------------|
| [CAPABILITIES.md](./CAPABILITIES.md) | Capabilities to date + potential improvements |
| [PITCH_DECK.md](./PITCH_DECK.md) | Investor pitch deck (problem → ask, plus appendix) |
| [frontend/README.md](./frontend/README.md) | Frontend-focused notes |
| [backend/README.md](./backend/README.md) | API map and backend setup |
# KindLing
