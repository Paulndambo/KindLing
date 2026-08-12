# Kindling Backend API

Django + Django REST Framework API for the Kindling adaptive tutoring platform.

## Stack

- **Django 5.1** / **DRF 3.15**
- **SimpleJWT** for student authentication
- **django-cors-headers** for the Vite frontend
- **SQLite** by default (swap `DATABASES` for Postgres in production)

## Domain model

- Each **user account is a student**.
- That student has at most one **`StudentProfile`** (onboarding / identity).
- Curriculum subjects, learning events, and the longitudinal learning profile hang off that student profile.
- There is no parent account or multi-child hierarchy.

## Apps

| App | Responsibility |
|-----|----------------|
| `accounts` | Register, login, demo login, JWT refresh, `/me` |
| `students` | Student profile for the logged-in user (1:1) |
| `curriculum` | Subjects & topics owned by a student |
| `learning` | Event ingest, sessions, longitudinal profile, dashboard |

## Quick start

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_kindling
python manage.py runserver
```

API base: `http://127.0.0.1:8000`

Demo credentials (also `POST /api/auth/demo/`):

- email: `student@kindling.edu`
- password: `kindling-demo`

## Frontend wiring

Point the SPA learning transport at this API:

```env
# frontend/.env
VITE_LEARNING_API_URL=http://127.0.0.1:8000/api/learning/events/
```

Auth and profile endpoints expect:

```
Authorization: Bearer <access_token>
```

## API map

### Auth — `/api/auth/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register/` | public | Create student account → tokens |
| POST | `/login/` | public | Email/password → tokens |
| POST | `/demo/` | public | Demo student login |
| POST | `/refresh/` | public | Refresh JWT |
| GET | `/me/` | JWT | Current user |

### Students — `/api/students/`

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/` | Get or create this user's profile (at most one) |
| GET/PUT/PATCH | `/me/` | Current student's profile (onboarding) |
| GET/PATCH/DELETE | `/{id}/` | Profile detail (own profile only) |

Student JSON uses camelCase fields matching the frontend (`schoolName`, `learningStyle`, `isOnboarded`, …).

### Subjects — `/api/subjects/`

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/` | List / create subjects (with optional `topics: string[]`) |
| GET/PATCH/DELETE | `/{id}/` | Subject detail |
| GET/POST | `/{id}/topics/` | List / add topics |
| GET/PATCH/DELETE | `/topics/{id}/` | Topic detail |

### Learning — `/api/learning/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health/` | public | Liveness |
| POST | `/events/` | optional JWT | Ingest analytics envelope |
| GET | `/profile/` | JWT | Longitudinal learning profile + insights |
| GET | `/personalization/` | JWT | Tutor personalization block |
| GET | `/sessions/` | JWT | Lesson sessions |
| GET | `/sessions/{sessionId}/` | JWT | Session + turns |
| GET | `/dashboard/` | JWT | Student dashboard aggregates |
| GET | `/events/list/` | JWT | Recent events (debug) |

#### Event envelope (from frontend `analyticsApi.js`)

```json
{
  "schemaVersion": 1,
  "source": "kindling-web",
  "sentAt": "2026-04-08T12:00:00.000Z",
  "events": [
    {
      "id": "evt_…",
      "type": "turn.exchange",
      "timestamp": "…",
      "context": { "studentId": "maya", "sessionId": "ses_…" },
      "payload": { }
    }
  ]
}
```

Supported event types:

- `session.start` / `session.end`
- `turn.exchange`
- `behavior.hint_requested` / `behavior.tool_toggled` / `behavior.voice_input`
- `session.topic_switched`
- `profile.snapshot`
- `intervention.offered` / `intervention.entered` / `intervention.exited` / `intervention.declined`

### Topic conversations — `/api/learning/conversations/`

Durable chat history for lesson resume and the Learning Journal (requires JWT + onboarded student profile).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/conversations/shelf/?subject=&topic=` | Full shelf for a subject×topic (active + archived, with messages) |
| PUT | `/conversations/shelf/` | Sync a full shelf document |
| POST | `/conversations/ensure/` | Ensure an active conversation exists |
| GET | `/conversations/<client_id>/` | One conversation with messages |
| PUT | `/conversations/<client_id>/` | Upsert conversation (+ optional messages) |
| POST | `/conversations/<client_id>/messages/` | Append one message (+ optional `apiPair` for Gemini history) |
| POST | `/conversations/<client_id>/archive/` | End conversation with title/summary/highlights |

The SPA keeps a localStorage cache for offline resilience but **loads and saves through this API when the student is logged in**, so clearing the browser does not wipe history.

## Admin

```bash
python manage.py createsuperuser
# open http://127.0.0.1:8000/admin/
```
# KindLing
