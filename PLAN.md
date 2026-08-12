# Kindling — Production-Ready Development Plan

This plan turns **§3 What “excellent go-to tutor” requires next** and **§4 Suggested priority horizons** from [`CAPABILITIES.md`](./CAPABILITIES.md) into sequenced, implementable work. Use it as the operating guide for the next features and production hardening of Kindling.

**Source of truth for product intent:** `CAPABILITIES.md`  
**Source of truth for execution order:** this file  
**Design principles (non-negotiable):** `CAPABILITIES.md` §5

---

## 1. Goal

Move Kindling from a **strong adaptive prototype** to a product families and schools can trust as a **default go-to tutor**—production-ready on reliability, safety, learning science, and parent-visible value—without losing the warm, patient teaching voice.

**Production-ready means:**

| Dimension | Definition of done |
|-----------|--------------------|
| Learning quality | Mastery and intervention improve outcomes beyond heuristics alone |
| Trust | Tutor answers are checked where feasible; child-safe policies exist |
| Continuity | Sessions resume; progress and history are durable and searchable |
| Relationships | Parents get clear digests; student UI stays encouraging |
| Platform | Postgres, jobs, observability, backups, deployable config |
| Resilience | Clear failure states for AI/API/network; no silent data loss |

---

## 2. Current baseline (do not re-build)

Kindling already has a coherent spine. New work should **extend** these layers:

| Layer | Exists today | Primary code |
|-------|--------------|--------------|
| Auth & student profile | JWT, onboarding, one profile per user | `backend/accounts`, `backend/students`, `frontend` auth/onboarding |
| Curriculum & topics | Custom subjects, topic paths, seed data | `backend/curriculum`, `frontend` subjects/lesson path |
| Live tutoring | Gemini stream, Socratic default, profile + personalization prompts | `frontend/src/services/gemini.js`, lesson components |
| Intervention mode | Struggle detect, offer/auto/manual guide, exit, events | `frontend/.../interventionDetector.js`, `InterventionBanner.jsx` |
| Learning intelligence | Signals, local profile, event pipeline, server recompute | `frontend/src/services/learning/*`, `backend/learning` |
| Presentation | Markdown, KaTeX, code, tables, diagrams | `TutorMessageContent.jsx`, `tutor-content.css` |
| Voice | TTS + STT toggles | `tts.js`, `useSpeech.js` |
| Family surfaces | Dashboard mastery/confidence views, learning API | `Dashboard.jsx`, learning views |
| Session continuity (partial) | Topic conversations / journal primitives | `conversation_service.py`, `ConversationJournal.jsx` |

**Explicit gaps for production:** true skill mastery, curriculum graph, spaced review, homework image flow, correctness verification, parent accounts/digests, safety policies, Postgres + jobs + observability.

---

## 3. Guiding principles for all PRs

1. **Respect the learner** — normalize struggle; never shame in student-facing copy.  
2. **Guide before giving** — Socratic by default; intervention explicit and exit-able.  
3. **Presentation is pedagogy** — math/code/diagrams stay readable while streaming.  
4. **Adapt quietly** — scores and models stay internal; tutor speech stays human.  
5. **Parents and students see progress differently** — student: encouragement; family: clarity.  
6. **Safety and privacy scale with trust** — especially for children.  
7. **Ship vertical slices** — prefer end-to-end value on 1–2 pilot subjects over incomplete platform-wide abstractions.

---

## 4. Execution model

### 4.1 Horizons (from CAPABILITIES §4)

| Horizon | Intent | Role in this plan |
|---------|--------|-------------------|
| **A** | High impact, builds on existing code | **Primary execution focus** — production MVP |
| **B** | Differentiation | After A ships and is stable |
| **C** | Category leadership | Strategic backlog; design only unless opportunity appears |

### 4.2 Workstreams

Every feature maps to one or more streams:

| ID | Stream | Owns |
|----|--------|------|
| **P** | Pedagogy & cognition | Mastery, graph, examples, review, misconceptions, assessment |
| **I** | Intervention & affect | Struggle signals, graduated help, check-ins, alerts |
| **M** | Multimodal teaching | Visuals, diagrams, image homework, whiteboard later |
| **V** | Voice & language | Duplex, i18n, personas (mostly post-A) |
| **R** | Relationships | Parents, digests, teachers, goals, portfolios |
| **T** | Trust, safety & quality | Safety policies, correctness, privacy, evals |
| **X** | Product experience | Resume, uploads, resilience, a11y, theming |
| **S** | Platform & scale | Postgres, jobs, observability, AI gateway, deploy |

### 4.3 Phase gate rule

Do not start Horizon B product surface area until **Phase 0–2** below are complete (or explicitly waived with a documented risk acceptance). Platform and trust work runs **in parallel** with Horizon A features, not after them.

---

## 5. Phase 0 — Production foundation (platform + trust floor)

**Goal:** Kindling can be deployed, monitored, and operated safely even before every pedagogy feature lands.

**Maps to:** §3.6 (partial), §3.8, parts of §3.7

### 0.1 Production database & config

| Task | Detail | Touchpoints |
|------|--------|-------------|
| Postgres | Replace default SQLite for non-dev; env-driven `DATABASE_URL` | `backend/backend/settings.py` |
| Migrations discipline | CI runs `migrate --check` / migrate on deploy | CI + deploy docs |
| Secrets | No secrets in repo; document required env vars | `.env.example` (fe + be), README |
| Backups | Automated DB backups + restore runbook | Ops docs |

**Done when:** Staging runs on Postgres with successful migrate + seed path.

### 0.2 Observability ✅ (implemented)

| Task | Detail | Status |
|------|--------|--------|
| Request logging | Structured JSON logs (`event=http.request`) with latency, status, request id | ✅ |
| Client error reporting | `POST /api/telemetry/errors/` + SPA `reportError` (gemini/tts/api) with PII scrub | ✅ |
| Product metrics | `POST /api/telemetry/metrics/` funnel: session.started / first_message / drop_off; intervention rates from learning events | ✅ |
| Health endpoints | `/health/live/`, `/health/ready/`, combined `/health/` | ✅ |
| Summary | `GET /api/telemetry/summary/?hours=24` → `tutoring_health` | ✅ |

**Done when:** You can answer “is tutoring healthy today?” from logs/metrics alone.  
**How:** hit summary endpoint or inspect `kindling` logger lines; Django admin lists `ClientErrorReport` / `ProductMetric`.

### 0.3 Resilience & failure UX ✅ (implemented)

| Task | Detail | Status |
|------|--------|--------|
| AI down states | `chatError` banner + **Try again**; timeouts; student messages kept | ✅ |
| API down states | Learning events queue offline / on fail; connection banner + Sync now | ✅ |
| Partial offline | localStorage write-through for chat; queue survives refresh | ✅ |

**Done when:** Simulated Gemini/API outages produce recoverable UX (no blank chat, no silent event loss).  
**How to verify:** disable network mid-lesson, or stop Django, or break Gemini key — expect calm banners, retry, history still present after refresh.

### 0.4 Child safety floor ✅ (implemented)

| Task | Detail | Status |
|------|--------|--------|
| Age-aware policies | Grade → age band; system prompt block + `GET /api/safety/policy/` | ✅ |
| Distress escalation | Client detect → pause AI + escalation card + scrubbed `SafetyEvent` | ✅ |
| Privacy basics | `docs/SAFETY_AND_PRIVACY.md`; `GET /api/auth/export/`; `DELETE /api/auth/account/` | ✅ |

**Done when:** Safety policy is written, enforced in tutor prompts, and has a tested escalation path.  
**How:** see `docs/SAFETY_AND_PRIVACY.md`; send crisis-like text in lesson (dev) → tutoring pauses; export/delete via auth API.

### 0.5 Background jobs skeleton ✅ (implemented)

| Task | Detail | Status |
|------|--------|--------|
| Job runner | Management commands + `JobRun` audit; cron via `run_scheduled_jobs` (no Redis) | ✅ |
| Hooks | `heartbeat`, `weekly_digest`, `mastery_recompute`, `review_schedule` placeholders | ✅ |

**Done when:** One scheduled job runs in staging (e.g. health heartbeat or empty digest dry-run).  
**How:** `python manage.py run_job heartbeat` or cron `run_scheduled_jobs`; see `GET /api/jobs/status/`.

**Phase 0 exit criteria**

- [ ] Staging deploy: Postgres + env config + health check  
- [x] Basic metrics/logs for sessions, interventions, AI failures  
- [x] Failure UX for AI/API  
- [x] Written child-safety + privacy baseline  
- [x] Job runner can execute one scheduled task  

---

## 6. Phase 1 — Horizon A: core product slice

**Goal:** High-impact features that build on existing code and make Kindling feel like a *real* tutor families return to.

**Maps to:** CAPABILITIES §4 Horizon A + §3 items listed per epic

### Epic A1 — Stronger mastery + skill graph (pilot subjects) ✅

**CAPABILITIES:** §3.1.1 True mastery model, §3.1.2 Curriculum graph (pilot scope)

**Pilot:** `Math Foundations` — fractions → early algebra skill graph (“Skill sparks”).

| Step | Work | Status |
|------|------|--------|
| A1.1 | `Skill` catalog + BKT params + standard codes | ✅ |
| A1.2 | `TopicSkillLink` + seed topics on demo student | ✅ |
| A1.3 | `SkillPrerequisite` DAG + lock/ready thresholds | ✅ |
| A1.4 | BKT-lite updates on graded turns (FE + BE) | ✅ |
| A1.5 | Personalization directives + next-skill recommend | ✅ |
| A1.6 | Lesson path spark bars + dashboard skill rows | ✅ |

**Done when:** For pilot topics, mastery changes after graded exchanges, next-topic recommendation uses prerequisites, and dashboard reflects skill (not only topic label) progress.  
**How:** seed → open Math Foundations → practice; watch Skill sparks; dashboard “Ready to spark”.

### Epic A2 — Session history & resume ✅

**CAPABILITIES:** §3.7.2

| Step | Work | Status |
|------|------|--------|
| A2.1 | Full transcript on `TopicConversation` + `preview_text` on each message append | ✅ |
| A2.2 | Continue list API + My Subjects / Dashboard Continue CTAs | ✅ |
| A2.3 | `resume_snapshot` (intervention/tools/personalization); restore as offered | ✅ |
| A2.4 | Transcript keyword search API + My Subjects search UI | ✅ |

**Done when:** User can leave mid-lesson, return days later, and resume with history intact and searchable.  
**How:** practice a topic → leave → My Subjects shows Continue; Dashboard “Pick up a lesson”; search “pizza” finds snippets.

### Epic A3 — Math correctness verification (graded turns) ✅

**CAPABILITIES:** §3.6.2

| Step | Work | Status |
|------|------|--------|
| A3.1 | Graded-turn contract + hidden `⟦check expected=…⟧` tags from tutor | ✅ |
| A3.2 | Rational/decimal/percent verifier (FE + BE, pure Fraction math) | ✅ |
| A3.3 | Prefer checker over linguistic grade; log `math.grade_disagreement` | ✅ |
| A3.4 | Verified correctness drives mastery BKT + intervention counters | ✅ |

**Done when:** On pilot math items, correctness used for mastery is not solely linguistic heuristics.  
**How:** Math Foundations lesson; tutor tags expected answer; student `6/8` vs `3/4` grades correct; wrong answer overrides tutor “yes”.

### Epic A4 — Image homework upload + guided remediation ✅

**CAPABILITIES:** §3.3.3, §3.7.3 (wire attach control)

| Step | Work | Status |
|------|------|--------|
| A4.1 | `+` attach → file input; `POST /api/learning/homework/` multipart upload | ✅ |
| A4.2 | Gemini multimodal OCR/analysis (problem, work, errors) | ✅ |
| A4.3 | Chat homework bubble + Socratic remediation stream; offer guide if 2+ errors | ✅ |
| A4.4 | 5 MB / image types; reject non-homework; 30-day retention policy | ✅ |

**Done when:** Student can photograph a fractions worksheet problem and receive guided help without retyping everything.  
**How:** Lesson → + → pick photo → “Looking at your work…” → thumbnail + Kindling helps.

### Epic A5 — Parent digest from existing learning events

**CAPABILITIES:** §3.2.4 (alerts), §3.5.1 (partial: digest without full multi-child yet), §3.8.2

| Step | Work |
|------|------|
| A5.1 | Digest data model: weekly summary from events (time on task, topics, mastery deltas, struggle hotspots) |
| A5.2 | Copy rules: clarity for parents, no shame language about the child |
| A5.3 | Delivery: email (or in-app first) via background job |
| A5.4 | Opt-in settings on profile (even if still single student account) |

**Note:** Full multi-child parent hierarchy can wait for Phase 3; digests can target the linked family email on the student account first.

**Done when:** Opted-in demo family receives a weekly summary generated from real `LearningEvent` data.

### Epic A6 — Interactive visual models (top struggle topics)

**CAPABILITIES:** §3.3.1 (scoped)

| Step | Work |
|------|------|
| A6.1 | Pick 1–2 manipulatives for pilot (e.g. fraction bars, number line) |
| A6.2 | Embed in lesson UI as tutor-invokable or tools-panel widgets |
| A6.3 | Sync state lightly with chat (tutor can say “move the bar to 3/4”) |
| A6.4 | Log tool use as learning events |

**Done when:** At least one pilot topic uses an interactive visual during live teaching, not only ASCII diagrams.

### Phase 1 sequencing (recommended)

```text
Week-oriented order (adjust to team size):

  A2 Session resume ──────────────┐
  A3 Correctness checker ──┐      │
                           ├─► A1 Mastery + skill graph
  A4 Image upload ─────────┘      │
  A6 Visual (can parallel)        │
                                  ▼
                         A5 Parent digest (needs stable events + mastery deltas)
```

**Phase 1 exit criteria (Horizon A MVP)**

- [ ] Pilot skill graph + mastery updates on graded turns  
- [ ] Resume session with transcript  
- [ ] Math correctness verification on pilot items  
- [ ] Homework image → guided help path  
- [ ] Parent weekly digest (opt-in) from events  
- [ ] ≥1 interactive visual for a high-struggle pilot topic  

---

## 7. Phase 2 — Intervention depth + teaching quality

**Goal:** Make struggle handling and pedagogy *feel intentional*, not binary (Socratic vs full guide).

**Maps to:** §3.1.3–3.1.8 (selectively), §3.2.1–3.2.3

### Epic B1 — Richer struggle signals

Extend `interventionDetector.js` / session tracker:

| Signal | Behavior |
|--------|----------|
| Idle time | Soft nudge → offer help after threshold |
| Repeated short answers | Increase scaffolding bias |
| Topic thrashing | Suggest focus or prerequisite |
| Rapid guessing | Slow down; verify with A3 when applicable |
| Off-topic drift | Gentle redirect |

Emit new learning event subtypes where useful.

### Epic B2 — Graduated interventions

Replace binary guide mode with levels:

1. Micro-hint  
2. Worked example (from library when available)  
3. Full step-by-step guide (existing intervention mode)  
4. Suggest break / easier related skill (uses graph from A1)  

UI: tools panel + in-chat cards reflect level; always exit-able.

### Epic B3 — Affective check-ins

- Periodic gentle affect prompts after frustration streaks or long sessions  
- Celebrate **persistence** in tutor copy and parent digest, not only accuracy  
- Store affect events; never shame in student UI  

### Epic B4 — Worked-example library (pilot)

**CAPABILITIES:** §3.1.3

- Curated examples + counterexamples per pilot skill  
- Age-appropriate language; linked to skills  
- Tutor prefers library example over free generation when available  

### Epic B5 — Misconception engine v1

**CAPABILITIES:** §3.1.5

- Replace/extend tiny regex set with stored misconceptions per domain  
- Detect → label → remediating prompt playbook  
- Feed remediation success into mastery  

### Epic B6 — Multi-step “show your work”

**CAPABILITIES:** §3.1.6

- Structured intermediate checks  
- Partial credit pedagogy aligned with A3 checker  
- Session UI for step list (optional panel)  

**Phase 2 exit criteria**

- [ ] ≥5 struggle signals drive intervention decisions  
- [ ] Graduated intervention ladder live in lesson  
- [ ] Affective check-in flow without breaking tutor character  
- [ ] Pilot worked examples + misconception records in DB  
- [ ] Multi-step problem mode on at least one skill  

---

## 8. Phase 3 — Relationships, assessment, and differentiation (Horizon B)

**Goal:** Kindling becomes sticky for households and classrooms.

**Maps to:** §3.1.4, §3.1.7–3.1.8, §3.5, remaining §3.2.4

| Epic | Capability | Deliverable |
|------|------------|-------------|
| C1 | §3.1.4 Spaced review | Scheduler uses weak mastery + forgetting curve; short review sessions |
| C2 | §3.5.1 Parent accounts | Multi-child households, permissions, digest ownership |
| C3 | §3.5.2 Classroom mode | Rosters, assignments, privacy-safe aggregates |
| C4 | §3.5.3 Standards reports | Export progress vs framework codes on pilot graph |
| C5 | §3.5.4 Goals & plans | Exam prep timelines, weekly focus contracts |
| C6 | §3.1.7 Assessment modes | Low-stakes quizzes / end-of-topic checks separate from open chat |
| C7 | §3.1.8 Domain playbooks | Early math / algebra packs + scaffold consistency |
| C8 | §3.6.5 Eval harness | Automated scores: hint quality, Socratic fidelity, intervention timing |
| C9 | §3.6.3 Human review | Flagged sessions for parent/teacher |

**Phase 3 exit criteria (Horizon B)**

- [ ] Spaced review appears automatically for weak skills  
- [ ] Real parent multi-child account path  
- [ ] One classroom pilot flow (roster + assignment)  
- [ ] Exportable standards-aligned report for pilot subjects  
- [ ] Offline eval harness produces quality scores on recorded sessions  

---

## 9. Phase 4 — Multimodal, voice, and experience polish

**Goal:** Teaching medium matches how children actually learn and how families use devices.

**Maps to:** remaining §3.3, §3.4, §3.7

| Priority | Item | Notes |
|----------|------|-------|
| P0 | Rendered diagrams (Mermaid/SVG/geometry) | Beyond ASCII; streaming-safe |
| P0 | Accessible content | Dyslexia-friendly option, high contrast, captions for TTS, keyboard-first lesson |
| P1 | Attachments & work upload generalization | Beyond homework photo (PDF/docs) |
| P1 | Keyboard shortcuts & focus modes | Distraction-free lesson |
| P1 | Theming | Calm light, high-contrast, reduced motion |
| P2 | Whiteboard co-drawing | Shared sketch space |
| P2 | Video micro-lessons | Optional clips when density high |
| P2 | Low-latency duplex voice | Continuous conversation mode |
| P2 | Multi-language tutoring | UI + tutor pairs; EAL bilingual |
| P3 | Pronunciation coaching | Languages / early reading |
| P3 | Age-tuned TTS personas | Stable voice identity per preference |

**Done when (Phase 4 minimum):** diagram rendering + accessibility pack + focus mode ship; voice/language items scheduled by demand.

---

## 10. Phase 5 — Platform scale & category leadership (Horizon C)

**Maps to:** §3.8 remaining, Horizon C

| Track | Work |
|-------|------|
| AI gateway | Abstract multi-model failover, cost controls; stop hard-binding all paths to one client pattern |
| Mobile | PWA first (voice + offline notes), native later if needed |
| i18n / RTL | Full UI string extraction + RTL layout |
| Lifelong learner model | Cross-subject knowledge that persists years |
| School integrations | LMS, SSO |
| Research instrumentation | Learning-science-grade event schema & consent |
| Enterprise | Multi-region hosting, admin, compliance packs |

---

## 11. Cross-cutting engineering standards

Apply to every phase:

| Area | Standard |
|------|----------|
| API | Versioned payloads for learning events; additive changes preferred |
| Auth | JWT stays; parent/teacher roles extend without breaking student JWT |
| Testing | Backend unit tests for mastery, correctness, intervention thresholds; frontend smoke for lesson resume |
| Seed data | `seed_kindling` always demos new pedagogy features |
| Prompt changes | Document in PR; keep Socratic default and exit-able intervention |
| Privacy | Minimize PII in logs; retention knobs for transcripts and images |
| Performance | Stream remains snappy; heavy jobs (digest, recompute) stay async |
| Feature flags | Prefer flags for intervention ladder, correctness checker, image upload |

---

## 12. Suggested milestone map

| Milestone | Name | Includes | Outcome |
|-----------|------|----------|---------|
| **M0** | Deployable | Phase 0 | Staging on Postgres, observability, safety floor |
| **M1** | Continuity | A2 + resilience | Families can pause/resume real lessons |
| **M2** | Trust math | A3 + A1 start | Graded mastery on pilot math |
| **M3** | Multimodal help | A4 + A6 | Photo homework + one manipulative |
| **M4** | Family loop | A5 + digest job | Weekly parent clarity without shaming |
| **M5** | Adaptive depth | Phase 2 | Graduated help + misconceptions + examples |
| **M6** | Institution-ready | Phase 3 subset | Spaced review + parent accounts + reports |
| **M7** | Scale | Phase 4–5 as needed | Voice/i18n/gateway/school integrations |

---

## 13. Traceability: CAPABILITIES §3 → plan phases

| §3 area | Item | Phase / epic |
|---------|------|----------------|
| 3.1 Pedagogy | True mastery model | Phase 1 · A1 |
| 3.1 | Curriculum graph | Phase 1 · A1 (pilot); expand later |
| 3.1 | Worked-example library | Phase 2 · B4 |
| 3.1 | Retrieval / spaced review | Phase 3 · C1 |
| 3.1 | Misconception engine | Phase 2 · B5 |
| 3.1 | Multi-step problem solving | Phase 2 · B6 |
| 3.1 | Assessment modes | Phase 3 · C6 |
| 3.1 | Teacher/tutor playbooks | Phase 3 · C7 |
| 3.2 Intervention | Richer struggle signals | Phase 2 · B1 |
| 3.2 | Graduated interventions | Phase 2 · B2 |
| 3.2 | Affective check-ins | Phase 2 · B3 |
| 3.2 | Parent/teacher alerts | Phase 1 · A5; Phase 3 · C2/C9 |
| 3.3 Multimodal | Interactive visuals | Phase 1 · A6 |
| 3.3 | Rendered diagrams | Phase 4 |
| 3.3 | Image input | Phase 1 · A4 |
| 3.3 | Whiteboard | Phase 4 |
| 3.3 | Video micro-lessons | Phase 4 |
| 3.3 | Accessible content | Phase 4 |
| 3.4 Voice & language | All items | Phase 4–5 |
| 3.5 Progress & institutions | Parent accounts | Phase 3 · C2 |
| 3.5 | Teacher/classroom | Phase 3 · C3 |
| 3.5 | Standards reports | Phase 3 · C4 |
| 3.5 | Goals & plans | Phase 3 · C5 |
| 3.5 | Portfolios | Phase 3+ backlog |
| 3.6 Trust | Child-safe policies | Phase 0 · 0.4 |
| 3.6 | Answer correctness | Phase 1 · A3 |
| 3.6 | Human-in-the-loop | Phase 3 · C9 |
| 3.6 | Privacy by design | Phase 0; deepen Phase 5 |
| 3.6 | Eval harness | Phase 3 · C8 |
| 3.7 Experience | Offline / flaky network | Phase 0 · 0.3 |
| 3.7 | Session history & resume | Phase 1 · A2 |
| 3.7 | Attachments | Phase 1 · A4; Phase 4 generalize |
| 3.7 | Keyboard / focus | Phase 4 |
| 3.7 | Theming | Phase 4 |
| 3.8 Platform | Postgres | Phase 0 · 0.1 |
| 3.8 | Background jobs | Phase 0 · 0.5; used by A5/C1 |
| 3.8 | Observability | Phase 0 · 0.2 |
| 3.8 | Provider flexibility | Phase 5 |
| 3.8 | Mobile apps | Phase 5 |
| 3.8 | Internationalization | Phase 5 |

---

## 14. Immediate next actions (start here)

Use this checklist for the next development cycle:

1. **Stand up Phase 0**  
   - Postgres settings + `.env.example`  
   - Health endpoint + basic structured logging  
   - Lesson failure UX for Gemini/API errors  
   - Draft `docs/SAFETY_AND_PRIVACY.md` (or section in README)

2. **Ship M1 — Session resume**  
   - Harden server transcript persistence  
   - “Continue lesson” UX on subjects/dashboard  

3. **Ship M2 — Correctness + mastery foundation**  
   - Graded-turn checker for pilot math  
   - Skill model + seed graph for fractions / early algebra  
   - Wire verified correctness into profile recompute  

4. **Parallel tracks**  
   - Image attach API (A4)  
   - Fraction manipulative prototype (A6)  
   - Digest query from `LearningEvent` (A5 dry-run, no email yet)

5. **Update this plan**  
   - After each milestone, mark exit criteria and note deviations in a short changelog at the bottom of this file.

---

## 15. Out of scope (until later unless re-prioritized)

- Full multi-region compliance / enterprise admin  
- Research-grade multi-year learner model  
- Native mobile apps (prefer PWA first)  
- Complete bilingual product localization  
- Whiteboard and video micro-lessons before Horizon A MVP  
- Classroom LMS SSO before parent digest + multi-child accounts  

---

## 16. Success metrics (product)

Track as features land:

| Metric | Why it matters |
|--------|----------------|
| Session resume rate | Continuity works |
| Intervention accept → complete → return rate | Help is useful, not humiliating |
| Mastery gain on pilot skills per week | Pedagogy works |
| Parent digest open / return-to-app rate | Family loop works |
| Correctness checker agreement vs model | Trust |
| AI/API error recovery (no abandoned sessions) | Production quality |
| Time-to-first-helpful-turn after homework photo | Multimodal value |

---

## 17. Document control

| Field | Value |
|-------|--------|
| Based on | `CAPABILITIES.md` §3, §4, §5 |
| Codebase | `frontend/` + `backend/` monorepo |
| Status | Active execution plan |
| Last updated | 2026-08-12 |

### Changelog

| Date | Note |
|------|------|
| 2026-08-12 | Initial PLAN.md created from CAPABILITIES “excellent go-to tutor” section and Horizon A–C priorities. |
| 2026-08-12 | Phase 0.2 Observability implemented (skipped 0.1 Postgres per product decision). |
| 2026-08-12 | Phase 0.3 Resilience & failure UX (AI recovery, connectivity banner, durable queue/history). |
| 2026-08-12 | Phase 0.4 Child safety floor (age policies, distress escalation, export/delete, safety doc). |
| 2026-08-12 | Phase 0.5 Background jobs skeleton (heartbeat + digest/mastery/review placeholders, cron runner). |
| 2026-08-12 | Phase 1 Epic A1: skill graph + BKT-lite mastery (Math Foundations pilot, sparks UI). |
| 2026-08-12 | Phase 1 Epic A2: session continue cards, resume snapshots, transcript search. |
| 2026-08-12 | Phase 1 Epic A3: math correctness verifier (tags + Fraction check, prefer checker). |
| 2026-08-12 | Phase 1 Epic A4: homework photo upload, vision analysis, guided remediation. |

---

*When product intent and execution disagree, update CAPABILITIES for vision and this PLAN for sequencing—then keep them cross-linked.*
