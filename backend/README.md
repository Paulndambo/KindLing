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
| `core` | Health probes, request logging, client error + product metrics telemetry |

## Observability (Phase 0.2)

| Endpoint | Purpose |
|----------|---------|
| `GET /health/live/` | Liveness (process up) |
| `GET /health/ready/` | Readiness (DB reachable) |
| `GET /health/` | Combined probe (backward compatible) |
| `POST /api/telemetry/errors/` | Client error ingest (scrubbed) |
| `POST /api/telemetry/metrics/` | Product funnel metrics |
| `GET /api/telemetry/summary/?hours=24` | “Is tutoring healthy?” snapshot |

Structured access logs emit as `kindling | {"event":"http.request",...}` with latency and status. Set `VITE_TELEMETRY=false` on the SPA to disable client posts.

## Child safety & privacy (Phase 0.4)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/safety/policy/?grade=` | Age-band policy notes for a grade label |
| `POST /api/safety/events/` | Scrubbed distress escalation ingest (no raw message body) |
| `GET /api/auth/export/` | Authenticated JSON export of account + learning data |
| `DELETE /api/auth/account/` | Delete account (`{"confirm": true}`); demo account blocked |

Full write-up: [`docs/SAFETY_AND_PRIVACY.md`](../docs/SAFETY_AND_PRIVACY.md).

## Background jobs (Phase 0.5)

Cron-friendly job runner (no Redis/Celery required). Jobs write `JobRun` audit rows and structured logs (`event=job.*`).

### Commands

```bash
# List registered jobs
python manage.py run_job list

# Run the ops heartbeat (proves the runner works)
python manage.py run_job heartbeat

# Weekly parent digests (Epic A5) — generate + in-app/console delivery
python manage.py run_job weekly_digest --dry-run
# Real email (console backend prints to stdout in local dev)
python manage.py run_job weekly_digest

# Run every job that is due by interval
python manage.py run_scheduled_jobs
```

### Staging cron example

```cron
*/5 * * * * cd /path/to/backend && python manage.py run_scheduled_jobs >> /var/log/kindling-jobs.log 2>&1
```

### Registered jobs

| Name | Default interval | Purpose |
|------|------------------|---------|
| `heartbeat` | 1h | Health proof + 24h counters |
| `weekly_digest` | 7d | Parent digests for opted-in students |
| `mastery_recompute` | 1d | Placeholder mastery recompute |
| `review_schedule` | 1d | Placeholder spaced review |

Configure in `settings.KINDLING_JOBS`. Ops snapshot: `GET /api/jobs/status/`.

## Skill graph mastery (Epic A1)

Pilot domain: **Math Foundations** (fractions → early algebra).

| Endpoint | Purpose |
|----------|---------|
| `GET /api/learning/skills/` | Pilot skill catalog + prerequisites |
| `GET /api/learning/skills/path/?subject=&topic=` | Skills for a lesson topic + readiness |
| `GET /api/learning/skills/next/` | Recommended next skill for the learner |

Graded `turn.exchange` events update **BKT-lite** `SkillMastery` rows and blend into topic mastery. Warm states: Growing roots → Ready to spark → Catching fire → Glowing.

```bash
python manage.py seed_kindling   # seeds graph + demo mastery sparks
```

## Math correctness verification (Epic A3)

Independent rational/decimal checker for pilot math turns. Tutor may emit a hidden tag:

```text
⟦check expected="3/4" alts="0.75|6/8" result="correct"⟧
```

When the tag (or pilot Math context) is present, the server re-verifies on `turn.exchange` and **prefers the checker** over linguistic “yes/no” for mastery updates. Disagreements log `math.grade_disagreement`.

```bash
POST /api/learning/verify-math/
{ "studentText": "6/8", "tutorText": "…⟦check expected=\"3/4\" result=\"correct\"⟧" }
```

## Homework photos (Epic A4)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/learning/homework/` | Multipart upload (`image` field, max 5 MB) |
| `POST /api/learning/homework/<id>/analyze/` | Attach vision analysis JSON |
| `GET/DELETE /api/learning/homework/<id>/` | Fetch or delete |

Files live under `MEDIA_ROOT/homework/…`. Retention default: **30 days** (`KINDLING_HOMEWORK_RETENTION_DAYS`). Vision OCR runs in the SPA via Gemini multimodal; the API stores the image + analysis for history.

Requires `Pillow` (`pip install -r requirements.txt`).

## Parent digests (Epic A5)

Opt-in weekly family summaries from learning events (sessions, exchanges, mastery, guide-mode). Copy is effort-first and non-shaming.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/learning/digests/` | List digests + opt-in / family email |
| `POST /api/learning/digests/generate/` | Build this week's digest (`deliver`, `dryRun`) |
| `GET /api/learning/digests/<id>/` | Digest detail |
| Profile | `digestOptIn`, `familyEmail` on `PATCH /api/students/me/` |

Delivery: in-app always; email via Django mail (console backend in local dev). Weekly job: `run_job weekly_digest`.

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

### Platform — `/api/platform/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/plans/` | public | Plan catalog (Spark / Ember / Forge) |
| GET | `/subscription/` | JWT | Current subscription + entitlements |
| POST | `/subscription/` | JWT | Activate/change plan (pilot checkout) |
| PATCH | `/subscription/` | JWT | Cancel at period end / resume |
| GET/PATCH | `/ai-routing/` | JWT | AI routing prefs (no raw API keys) |

BYOK API keys stay on the client. The API only stores routing mode, provider/model choices, and non-secret key fingerprints.

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

For monorepo overview, quick start, and pedagogy status, see the **[root README](../README.md)**.
