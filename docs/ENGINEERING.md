# Kindling — Engineering Handbook

**Audience:** engineers joining or extending Kindling  
**Status:** Living document — aligned with Phases 0–2 shipped (foundation + Horizon A + intervention depth)  
**Companion docs:** [CAPABILITIES.md](../CAPABILITIES.md) (product *what*), [PLAN.md](../PLAN.md) (execution *order*), [README.md](../README.md) (setup), [SAFETY_AND_PRIVACY.md](./SAFETY_AND_PRIVACY.md) (trust floor)

This handbook explains **how Kindling is built**, the **concepts** that structure the code, **architecture**, and the **design decisions / trade-offs** the team should preserve when changing it.

---

## 1. Engineering thesis

Kindling is not a chat wrapper around a model. It is a **closed-loop tutoring system**:

1. The student acts (answer, silence, thrash, upload homework, use a manipulative).  
2. The client extracts **signals** (correctness, affect, struggle, misconceptions).  
3. Signals update a **learner model** (local profile + server mastery / events).  
4. The next tutor turn is shaped by **directives** injected into the system prompt — without dumping scores into student-facing copy.  
5. Families see a **different** surface (effort-first digests, skill sparks), not the same UI with more charts.

Everything in the monorepo either serves that loop or the platform floor that keeps it operable (auth, health, jobs, safety, failure UX).

**Non-negotiable product rules** (also CAPABILITIES §5 / PLAN §3):

| Rule | Engineering implication |
|------|-------------------------|
| Respect the learner | No shaming strings in student UI; struggle is normalized |
| Guide before giving | Default prompt is Socratic; help is explicit ladder levels, always exit-able |
| Presentation is pedagogy | Streaming-safe Markdown / KaTeX / tables; tags stripped for speech |
| Adapt quietly | Mastery, BKT, heuristics stay internal; tutor speaks human |
| Split family vs student views | Digests / dashboard ≠ learner pulse copy |
| Safety scales with trust | Age policy in prompts; distress can **block** the model call |

If a PR fights these, it is the wrong PR — even if the feature is clever.

---

## 2. How we build (process)

### 2.1 Source-of-truth split

| Doc | Owns |
|-----|------|
| `CAPABILITIES.md` | Product inventory + vision backlog |
| `PLAN.md` | Phased epics, exit criteria, sequencing |
| This file | Architecture, concepts, trade-offs, “how to change safely” |
| `backend/README.md` | API map and ops commands |
| `docs/SAFETY_AND_PRIVACY.md` | What we store, escalate, export/delete |

Do not invent parallel roadmaps in code comments. Link the epic id (`A3`, `B5`, …) in PRs and migrations when relevant.

### 2.2 Phased delivery (what “done” means)

```text
Phase 0  Production floor     observability, resilience UX, safety, jobs skeleton
Phase 1  Horizon A            mastery graph, resume, math check, homework, digests, manipulatives
Phase 2  Intervention depth   struggle signals, ladder, affect, examples, misconceptions, multistep  ✅
Phase 2.5 Session rhythm      B7 start energy, B8 reflection, C1 review v1, C5 goals lite, G1 challenge  ✅
Phase 3+ Wave 2               deploy/Postgres; C1+ / C6–C10; Phase 4 diagrams/a11y; Phase 5 scale  ⬜
         assessment / scale
```

**Vertical slices over platform abstractions.** Prefer one pilot domain (**Math Foundations**: fractions → early algebra) end-to-end before generalizing to every subject. Seed data must demo every new pedagogy feature (`python manage.py seed_kindling`).

### 2.3 Workstreams (for ownership, not silos)

| ID | Stream | Typical code |
|----|--------|----------------|
| **P** | Pedagogy | `skillGraph`, mastery engine, worked examples, misconceptions, multistep |
| **I** | Intervention & affect | `interventionDetector`, ladder, affect check-in |
| **M** | Multimodal | homework upload, manipulatives, future diagrams |
| **R** | Relationships | student-configured digests only (no multi-child / classroom products) |
| **T** | Trust | safety/, math verifier, privacy export |
| **X** | Experience | lesson UI, resume, failure banners |
| **S** | Platform | core jobs, telemetry, `kindling_platform`, deploy |

Cross-cutting standards (PLAN §11): additive learning-event payloads, JWT auth extensible to roles later, backend tests for mastery/correctness/thresholds, PII-minimized logs, heavy work async, prompt changes called out in PR review.

---

## 3. System architecture

### 3.1 Monorepo layout

```text
Kindling/
├── frontend/                 # React 19 + Vite SPA — lesson runtime + AI I/O
│   └── src/
│       ├── components/       # Screens & lesson chrome
│       ├── hooks/            # Session, learning, speech, platform
│       └── services/
│           ├── ai/           # Multi-provider gateway + BYOK vault
│           ├── api/          # REST client (JWT)
│           ├── learning/     # Signal → profile → events → pedagogy engines
│           └── safety/       # Age band, distress, policy blocks
└── backend/                  # Django 5.1 + DRF — durable state & analytics
    ├── accounts/             # Auth, export/delete
    ├── students/             # StudentProfile (1:1 User)
    ├── curriculum/           # Subjects, topics, skills, pedagogy catalogs
    ├── learning/             # Events, mastery, conversations, digests, homework
    ├── core/                 # Health, telemetry, safety events, jobs
    └── kindling_platform/    # Plans, subscription, AI routing prefs
```

### 3.2 Runtime topology

```text
                    ┌─────────────────────────────────────┐
                    │           Browser (SPA)               │
                    │                                       │
  Student ─────────►│  Lesson UI ──► useChatSession         │
                    │       │              │                │
                    │       │              ▼                │
                    │       │     AI Gateway (stream)       │──────► Provider APIs
                    │       │     (Gemini / OpenAI-compat / │        (chat, vision, TTS)
                    │       │      Anthropic / …)           │        keys: env or BYOK
                    │       │              │                │
                    │       ▼              ▼                │
                    │  learning/*     safety/*              │
                    │  (signals,      (distress gate,       │
                    │   ladder,        age prompt block)    │
                    │   BKT-local)                          │
                    │       │                               │
                    │       ▼                               │
                    │  event queue + localStorage profile   │
                    └───────────────┬───────────────────────┘
                                    │ JWT REST
                                    ▼
                    ┌─────────────────────────────────────┐
                    │        Django API                     │
                    │  recompute profile / BKT mastery      │
                    │  conversations, digests, homework     │
                    │  safety audit, telemetry, jobs        │
                    └─────────────────────────────────────┘
```

**Critical split:**  
- **Generative I/O** (tutor tokens, vision OCR, TTS) runs **from the browser** through the AI gateway.  
- **Durable learning state** (events, mastery, transcripts, digests) lives on **Django** when `VITE_API_URL` is set.

That is intentional (see §8 trade-offs). The SPA can still teach in degraded mode with a local mock queue if the API is down; it cannot stream without an AI route (platform key or BYOK).

### 3.3 Request paths (mental model)

| Concern | Path |
|---------|------|
| Login / profile / subjects | `frontend/services/api/*` → `/api/auth|students|subjects/` |
| Live tutor turn | `services/ai/gateway` → provider; history may sync via conversations API |
| After each exchange | `signalExtractor` → `sessionTracker` / ladder / misconception → `profileStore` → `analyticsApi` POST `/api/learning/events/` |
| Graded math | Hidden `⟦check …⟧` in tutor text → FE + BE `math_verify` / `mathVerifier`; **checker wins** over linguistic “yes” for mastery |
| Homework photo | Multipart → `/api/learning/homework/` + Gemini vision in SPA → remediation stream |
| Parent digest | Job `weekly_digest` or Dashboard generate → aggregates `LearningEvent` + mastery |
| Distress | Client detector **before** model → optional block + scrubbed `POST /api/safety/events/` |

---

## 4. Core concepts

### 4.1 Student-centric identity

- One **User** ↔ one **StudentProfile**.  
- No multi-child parent hierarchy **by design** (permanent: one seat per learner; digests via student-configured email).  
- Family email + `digest_opt_in` hang off the student profile; digests are summaries for a linked adult, not a separate ACL model.

When you add roles later, **extend** JWT claims / permissions; do not break the student token shape without a migration plan.

### 4.2 Curriculum vs skills

| Layer | Meaning | Owner |
|-------|---------|--------|
| **Subject / Topic** | Student-owned lesson path (“what we’re studying”) | `curriculum.Subject` / `Topic` |
| **Skill** | Atomic learning objective in the pilot graph | `curriculum.Skill` |
| **TopicSkillLink** | Maps a lesson topic → skills practiced | curriculum |
| **SkillPrerequisite** | DAG for lock / ready | curriculum |
| **SkillMastery** | Per-student BKT-lite state | `learning.SkillMastery` |

UI language is warm (**Skill sparks**: Growing roots → Ready to spark → Catching fire → Glowing). Internal state enums stay machine-stable.

**Pilot scope:** deep pedagogy (examples, misconceptions, multistep, verifier) is concentrated on **Math Foundations**. Other subjects still get Socratic chat + generic signals; do not pretend full graph coverage everywhere.

### 4.3 Learning events (the analytics spine)

Events are the durable audit of the loop. Frontend vocabulary lives in `frontend/src/services/learning/types.js` and must stay **additive** and versioned (`schemaVersion` on envelopes).

Major families:

| Family | Examples | Consumers |
|--------|----------|-----------|
| Session | `session.start` / `end`, topic switch | dashboard, digests |
| Turn | `turn.exchange` (correctness, affect, timing, check tags) | mastery, interventions |
| Behavior | hints, tools, voice, manipulative | personalization, metrics |
| Intervention | offered / entered / exited / declined (+ level) | ladder analytics |
| Struggle | `struggle.signal` + subtype | B1 detectors |
| Affect | `affect.checkin`, `affect.persistence` | B3, digests |
| Misconception | detected / remediated | B5, mastery nudge |
| Multistep | started / step / completed / exited | B6 |

**Design rule:** UI state can be optimistic and local; anything that should survive devices or feed digests/mastery must become an event (or conversation message).

### 4.4 Signals vs scores vs speech

```text
Student text + tutor text
        │
        ▼
 signalExtractor  ──► correctness, affect, confidence, engagement, timing
        │
        ├─► mathVerifier (if pilot / check tags)  ── overrides linguistic grade
        ├─► misconceptionEngine
        ├─► interventionDetector + ladder
        ├─► affectCheckIn thresholds
        └─► sessionTracker counters
                │
                ▼
        profileStore (local) + POST events
                │
                ▼
        buildPersonalizationInsights / server personalization
                │
                ▼
        system prompt directives  (never raw p_know in student chat)
```

Linguistic heuristics are **good enough for UX** and a fallback; they are **not** trusted alone for pilot math mastery once a check tag or verifier context exists (Epic A3).

### 4.5 Intervention ladder (not binary “guide mode”)

Struggle used to be binary. Phase 2 replaced that with an explicit ladder:

| Level | Id | Intent |
|------:|----|--------|
| 1 | `micro_hint` | Smallest nudge; stay mostly Socratic |
| 2 | `worked_example` | Prefer **library** example when catalog matches |
| 3 | `full_guide` | Step-by-step teaching |
| 4 | `break_or_easier` | Affect + skill-graph easier path |

Struggle **signals** (idle, short answers, thrashing, rapid guessing, off-topic, streaks, frustration, hint spam) choose severity → suggested level. Soft idle nudge (~45s) precedes a full offer. Escalation and **exit anytime** are first-class in UI and events.

Implementation map:

- Thresholds: `struggleThresholds.js`  
- Detection: `interventionDetector.js`  
- Levels / prompt blocks: `interventionLadder.js`  
- UI: `InterventionBanner.jsx`, tools Help ladder  

### 4.6 Mastery (BKT-lite)

Server of record: `backend/learning/mastery_engine.py` (mirrored conceptually on the client for sparks / offline feel).

- Observation from graded correctness (`correct` / `incorrect` / soft `partial`).  
- Classic BKT parameters (transit, slip, guess) with clamps.  
- Prerequisites gate **ready** vs **locked**.  
- Rusty after inactivity window.  
- Misconception remediation success can apply a positive skill nudge (B5).  
- Multistep partial credit maps solid-step ratio into a grade for BKT (B6 + A3).

**Trade-off:** This is intentionally a **transparent, tunable** BKT-lite — not a research black box. Prefer parameter / threshold changes with tests over opaque ML in v1.

### 4.7 Hidden tutor tags (machine channel inside chat)

The model may emit machine-readable directives that the UI strips before display/TTS:

| Tag pattern | Purpose |
|-------------|---------|
| `⟦check expected="…" alts="…" result="…"⟧` | Graded-turn contract for math verifier |
| `⟦visual type=… num=… den=…⟧` | Drive fraction manipulative |

**Rule:** Tags are a **contract**, not a display feature. Parsers must be tolerant; strippers must run on every student-visible and spoken path. Disagreements between tutor `result=` and checker log `math.grade_disagreement` rather than failing silently.

### 4.8 Conversations & resume

`TopicConversation` (+ message rows) is the durable transcript. The SPA keeps a **localStorage shelf** for offline resilience but **loads/saves through the API** when logged in so clearing one browser does not erase history.

Resume snapshots can restore intervention / tools / personalization context as “offered” rather than silently forcing guide mode — respect learner agency.

### 4.9 AI gateway & plans

`frontend/src/services/ai/`:

- **Registry** of providers (Gemini, Anthropic, OpenAI-compatible family including Groq / OpenRouter).  
- **Key vault** in the browser (BYOK).  
- **Resolve route** per task: `chat` | `vision` | `tts`.  
- **Gateway façade** so lesson code does not branch on provider.

`kindling_platform` stores **plan entitlements** and **routing preferences** (modes, model choices, key fingerprints) — **not** raw API secrets. Pilot plans: Spark / Ember / Forge.

Platform default remains Gemini via `VITE_GEMINI_API_KEY` for zero-config demos.

---

## 5. Frontend architecture

### 5.1 Layering

```text
components/     presentational + screen composition
hooks/          lifecycle & orchestration (chat, learning, multistep, speech)
services/       pure-ish engines + I/O adapters (no React)
constants/      navigation, subscription catalog mirrors
styles/         lesson + tutor-content CSS (presentation is product)
```

Prefer putting new pedagogy logic in **`services/learning/*`** with unit/smoke coverage, then thin hooks/UI. Avoid burying thresholds inside JSX.

### 5.2 Key hooks

| Hook | Role |
|------|------|
| `useChatSession` | Stream lifecycle, history, errors, homework attach path |
| `useStudentLearning` | Profile, events, interventions, skills, affect, misconceptions |
| `useMultiStep` | B6 show-your-work panel state |
| `useSpeech` | TTS / STT toggles |
| `usePlatformSettings` | Plans + AI routing |
| `useAuth` / `useStudentProfile` / `useSubjects` | Account spine |

### 5.3 Lesson UI composition

Live lesson is a three-region product on desktop (path | chat | tools), collapsing to tabs on mobile:

- **Path** — topics + skill sparks  
- **Chat** — streaming `TutorMessageContent`, intervention / affect cards, multistep panel, manipulatives  
- **Tools** — hints, ladder, library example, show-your-work, voice, models  

Failure UX belongs here: AI down → retry banner (keep student messages); API down → queue + sync affordance. Never blank the transcript.

### 5.4 Smokes

`frontend/scripts/smoke-*.mjs` cover B1–B6 engines without a full browser harness. Use them when changing thresholds or pure functions. Prefer esbuild/bundle steps documented in each script header.

---

## 6. Backend architecture

### 6.1 App boundaries

| App | Responsibility | Do not put here |
|-----|----------------|-----------------|
| `accounts` | JWT register/login/demo, export/delete | Learning math |
| `students` | Profile fields, digest prefs | Event ingest |
| `curriculum` | Catalog definitions (skills, examples, MC defs, multistep templates) | Per-student mastery rows |
| `learning` | Runtime student data, ingest, engines, digests, homework | Auth |
| `core` | Health, telemetry, safety events, job runner | Product curriculum |
| `kindling_platform` | Commercial/plan/routing prefs | Pedagogy content |

**Catalog vs instance:** Worked examples and misconception **definitions** are curriculum; detections and mastery are learning. Keep seed data next to curriculum (`*_data.py` + `seed_kindling`).

### 6.2 Ingest philosophy

`POST /api/learning/events/` accepts batched envelopes. Auth is preferred; design assumed client-originated analytics with server recompute as source of truth for dashboard/mastery when JWT present.

On graded `turn.exchange`:

1. Persist event.  
2. Optionally re-verify math.  
3. Update skill/topic mastery.  
4. Refresh longitudinal profile aggregates.

Idempotency and duplicate client ids should be handled conservatively (prefer safe upserts over double-counting mastery when extending).

### 6.3 Jobs

No Redis/Celery requirement in v1. `core.jobs` registry + `run_job` / `run_scheduled_jobs` + `JobRun` audit rows.

| Job | Role |
|-----|------|
| `heartbeat` | Ops proof |
| `weekly_digest` | A5 delivery |
| `mastery_recompute` | Placeholder for batch repair |
| `review_schedule` | C1 spaced review materialize (Wave 1); deepen in Wave 2 C1+ |

Cron-friendly by design. Heavy pedagogy stays request-path or explicit job — not hidden threads inside WSGI.

### 6.4 Observability & health

- Structured access logs: `event=http.request` (+ latency, status, request id).  
- `GET /health/live|ready|` for probes.  
- Client `POST /api/telemetry/errors|metrics/`; summary for “is tutoring healthy?”.  
- Safety and jobs emit their own structured events.

Assume logs may be exported: **scrub PII**; never log raw distress utterances or full BYOK keys.

---

## 7. Data & consistency model

### 7.1 Dual write (local + server)

| State | Local | Server |
|-------|-------|--------|
| Learning profile pulse | `localStorage` | Recomputed profile API |
| Event queue | `localStorage` until flush | `LearningEvent` rows |
| Conversations | shelf cache | `TopicConversation` |
| Skill mastery display | derived / cached | `SkillMastery` |
| BYOK secrets | browser vault only | fingerprints / prefs only |

**Conflict stance today:** server wins for multi-device resume of transcripts and mastery; local queue drains when online. Multi-active-tab sync is best-effort — avoid designing features that require strong CRDTs until Phase 5.

### 7.2 Media

Homework images under `MEDIA_ROOT` with size/type caps and **retention** (`KINDLING_HOMEWORK_RETENTION_DAYS`, default 30). Vision analysis JSON stored alongside for history; OCR itself is client/provider-side.

### 7.3 Database

Dev default: **SQLite**. Production target: **Postgres** via env-driven config (Phase 0.1 — still an explicit deploy gap). Write migrations for every model change; seed must remain runnable on empty DB.

---

## 8. Design decisions and trade-offs

These are the decisions most likely to be “helpfully refactored” by newcomers. Please read before rewriting.

### 8.1 Browser-side model calls vs server-side proxy

**Choice:** Tutor/vision/TTS from the SPA gateway.  
**Why:** Fast iteration, trivial BYOK, no server-side key custody for Forge users, streaming simplicity in Vite dev.  
**Cost:** API keys can appear in the browser (platform key in Vite is **public to the client bundle** — treat as a demo/dev convenience, not a secure multi-tenant production pattern). Server proxy + rate limits + spend caps remain a Phase 5 hardening item for platform-paid AI.  
**Do not:** Half-migrate one call server-side without a clear authZ and billing story.

### 8.2 Dual implementation of pedagogy (FE + BE)

**Choice:** Verifier, misconception detect, mastery updates, etc. exist on both sides in places.  
**Why:** Instant UI without a round-trip; server remains authoritative for dashboards and anti-tamper light trust.  
**Cost:** Drift risk.  
**Mitigation:** Shared fixtures via seed; backend tests as source of truth for numeric thresholds where money/mastery matter; smokes on FE; comment epic ids when ports happen. When logic diverges, **prefer matching the backend test** and adjusting FE.

### 8.3 Pilot-shaped depth vs generic tutor

**Choice:** Deep graph/examples/MC/multistep on Math Foundations first.  
**Why:** Vertical quality beats thin horizontal coverage for learning outcomes and demos.  
**Cost:** Other subjects feel “chat-only.”  
**Mitigation:** Keep generic signal + ladder paths domain-agnostic; add domain packs as data (curriculum rows), not hardcoded one-offs in JSX when extending.

### 8.4 Heuristic NLP signals vs formal assessment

**Choice:** Lightweight linguistic / behavioral heuristics for affect and much correctness.  
**Why:** No dependency on a second model call per turn; works offline; low latency.  
**Cost:** False positives/negatives.  
**Mitigation:** A3 checker for pilot math; graded-turn tags; future eval harness (C8). Do not replace heuristics with an untested LLM-as-judge on every turn without latency budget.

### 8.5 SQLite + management-command jobs

**Choice:** Zero-infra local story; cron calls `manage.py`.  
**Why:** Contributors run the full loop in minutes.  
**Cost:** Not multi-node safe; no serious queue guarantees.  
**Mitigation:** Keep job functions pure/registry-based so Celery/RQ can wrap them later without rewriting digest math.

### 8.6 Student-only accounts

**Choice:** No parent user type yet; digests email a family address.  
**Why:** Unblocks A5 without ACL explosion.  
**Cost:** Household multi-profile is **out of product**; digests stay on the student profile.  
**Mitigation:** Store digest content as first-class rows; avoid embedding “parent” assumptions into student JWT.

### 8.7 Prompt-directed teaching vs scripted ITS

**Choice:** LLM generates moves; structured systems (ladder, playbooks, examples, tags) **constrain** it.  
**Why:** Warmth and coverage of language; scripts alone feel brittle.  
**Cost:** Variance, occasional ignored instructions.  
**Mitigation:** Short, high-priority system blocks; library examples preferred over free-gen at L2; verifiers on grades; safety block before call. Prefer better **constraints** over ever-longer prompts.

### 8.8 Event-sourced analytics (light)

**Choice:** Append learning events; derive digests/mastery.  
**Why:** Debuggable, replayable, parent-copy friendly.  
**Cost:** Storage growth; privacy surface.  
**Mitigation:** Retention policies; export/delete; scrubbed telemetry; avoid putting raw secrets or full distress text into events.

### 8.9 Vanilla CSS design system vs component library

**Choice:** Custom tokens + lesson CSS, Lucide icons.  
**Why:** Distinct “calm tutor” brand; full control of streaming layout.  
**Cost:** More hand-rolled a11y/responsive work.  
**Mitigation:** Phase 4 accessibility pack; keep z-index/overflow rules in `lesson.css` / `tutor-content.css` documented by comment only when non-obvious.

---

## 9. Safety, privacy, and trust (engineering view)

Pipeline order on send:

1. **Distress detect** (client) → maybe **do not call model**.  
2. Age-aware **policy block** always in system instruction.  
3. Tutor generation.  
4. Strip machine tags for display/TTS.  
5. Learning analysis / events (no raw crisis text on safety API).

Export/delete are product features (`/api/auth/export|account/`), not only legal footnotes. Demo account deletion is blocked by design.

Homework and transcripts are sensitive educational data — default to minimization in new log lines and admin list displays.

Details: [SAFETY_AND_PRIVACY.md](./SAFETY_AND_PRIVACY.md).

---

## 10. Testing strategy

| Layer | What | Where |
|-------|------|--------|
| Backend unit | Mastery, math verify, digests, B1–B6 services | `learning/tests_*.py`, `core/tests_*.py` |
| Seed path | Demo pedagogy always boots | `seed_kindling` |
| FE smokes | Pure engines B1–B6 | `frontend/scripts/smoke-*.mjs` |
| Manual / browser | Resume, ladder UX, homework, Settings BYOK | lesson flows in README |

**Expectation for pedagogy PRs:** at least one backend test or FE smoke that fails before the change and passes after. Threshold tweaks need explicit expected values in tests so “feel” does not regress silently.

---

## 11. How to add a feature (playbooks)

### 11.1 New struggle signal

1. Add subtype to `StruggleSignal` + thresholds.  
2. Detect in `interventionDetector` / session tracker.  
3. Emit `struggle.signal` with payload.  
4. Map severity → ladder level in `selectInterventionLevel`.  
5. Student copy: warm, non-shaming.  
6. Test threshold edges; update CAPABILITIES/PLAN checkmarks if epic-scoped.

### 11.2 New pilot skill / example / misconception / multistep

1. Data module under `curriculum/` + model if needed.  
2. Wire `seed_kindling`.  
3. API list/detail under `/api/learning/…`.  
4. FE loader + prompt block builder.  
5. Lesson tools entry only if discoverability matters.  
6. Mastery side-effects go through existing engines (do not ad-hoc mutate p_know in views).

### 11.3 New learning event type

1. Add to `LearningEventType` (FE) and backend allowed types.  
2. Additive payload; bump docs.  
3. Decide: profile recompute? digest section? metric?  
4. Never break old clients on unknown types (ignore or store raw).

### 11.4 New AI provider

1. Adapter under `services/ai/providers/`.  
2. Registry entry + capabilities (stream, vision, tts).  
3. Gateway branches or interface.  
4. Settings UI + entitlement gates via plans.  
5. No raw key persistence on server.

### 11.5 New background job

1. Register in `core.jobs`.  
2. Idempotent-ish; write `JobRun`.  
3. Structured logs `event=job.*`.  
4. Expose status if operators need it.  
5. Document cron example in backend README.

---

## 12. What “good” looks like in review

- **Epic-linked** — reviewer can find A#/B# or Phase rationale.  
- **Pilot-first** — depth on Math Foundations before abstract frameworks.  
- **Exit-able help** — no trapped intervention states.  
- **Streaming-safe UI** — no layout jump disasters; math readable mid-stream.  
- **Failure-aware** — AI/API down paths tested mentally or manually.  
- **Seeded** — `seed_kindling` demos it.  
- **Tested** — numeric pedagogy covered.  
- **Private enough** — logs/events scrubbed; tags stripped from speech.  
- **Copy split** — student encouragement vs parent clarity.

---

## 13. Known gaps and near-term technical direction

Honest backlog for engineers (not a product pitch):

| Area | Today | Direction |
|------|-------|-----------|
| DB | SQLite default | Env `DATABASE_URL` Postgres for staging/prod |
| Platform AI keys | Vite-exposed demo pattern | Server-side proxy, quotas, spend caps |
| Parent / adult progress notes | Email on student (A5) | Stay email-only; never multi-child accounts |
| Spaced review | Job placeholder | Scheduler from weak/rusty skills |
| Eval | Manual + unit | Harness for Socratic fidelity / intervention timing |
| FE/BE drift | Mirrored logic | Consolidate pure math/verify into shared fixtures or generated JSON tests |
| i18n / duplex voice | Partial TTS/STT | Phase 4+ |
| Feature flags | Informal | Explicit flags for risky pedagogy rolls |

Phase gates: do not open large Horizon B surface area until Phase 0 deploy gaps you care about are accepted or closed (PLAN §4.3).

---

## 14. Glossary

| Term | Meaning |
|------|---------|
| **Skill spark** | UI label for skill mastery warmth state |
| **BKT-lite** | Simplified Bayesian Knowledge Tracing update on skills |
| **Ladder** | Graduated intervention levels 1–4 |
| **Directive** | Prompt injection derived from learner model (internal) |
| **Check tag** | Hidden `⟦check …⟧` graded-turn contract |
| **BYOK** | Bring your own key — browser vault |
| **Shelf** | Per subject×topic conversation collection |
| **Pilot** | Math Foundations vertical slice |
| **Envelope** | Batched learning-events POST body |
| **Playbook** | Structured remediation guidance for a misconception |

---

## 15. Quick orientation for a new engineer

**Day-one path:**

1. Read README quick start; run backend `seed_kindling` + frontend with `VITE_API_URL`.  
2. Log in as demo student; teach one Math Foundations topic.  
3. Trigger idle nudge, help ladder, library example, show-your-work.  
4. Skim `services/learning/types.js` and `learning/mastery_engine.py`.  
5. Hit `GET /api/telemetry/summary/` and `GET /api/learning/dashboard/` with a token.  
6. Read this handbook §8 before proposing structural rewrites.

**When stuck:** CAPABILITIES for *whether* we want it, PLAN for *when*, this file for *how the system thinks*, backend README for *which URL*.

---

*Last updated: 2026-09-01 — Wave 1 through Phase 2.5; single-seat commercial lock; Wave 2 in PLAN.md §15–16.*
