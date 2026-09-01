# Kindling — Production-Ready Development Plan

This plan turns **§3 What “excellent go-to tutor” requires next** and **§4 Suggested priority horizons** from [`CAPABILITIES.md`](./CAPABILITIES.md) into sequenced, implementable work. Use it as the operating guide for the next features and production hardening of Kindling.

**Source of truth for product intent:** `CAPABILITIES.md`  
**Source of truth for execution order:** this file  
**Design principles (non-negotiable):** `CAPABILITIES.md` §5

---

## 1. Goal

Move Kindling from a **strong adaptive prototype** to a product each **individual learner** (and the adult paying for that seat) can trust as a **default go-to tutor**—production-ready on reliability, safety, learning science, and optional email digests—without losing the warm, patient teaching voice. **One account = one student subscription**, always.

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

**Shipped (do not re-build):** pilot skill mastery + graph (A1), resume (A2), math verify (A3), homework photos (A4), guardian digests (A5), manipulatives (A6), struggle ladder B1–B6, session rhythm B7–B8 / C1 / C5 lite / G1, observability + safety floor + jobs skeleton.

**Commercial model (permanent):** **one account = one learner = one subscription.** Parents or schools who support multiple children buy **separate seats** (same as any multi-learner institution). There is **no** multi-child household product, parent portal hierarchy, or classroom/roster product. Adults may only receive **optional email digests** when the student configures an address on their own profile (A5).

**Still open for production / Wave 2:** Postgres + hostable deploy (0.1), AI failover/cost controls, assessment modes, domain playbook expansion, eval harness, student-facing standards export, diagram rendering, a11y pack, duplex voice, PWA/i18n, full goals planner (single-learner), portfolios, digest polish.

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
| **R** | Relationships | Student-configured digests/email, single-learner goals, portfolios (no multi-child or classroom products) |
| **T** | Trust, safety & quality | Safety policies, correctness, privacy, evals |
| **X** | Product experience | Resume, uploads, resilience, a11y, theming |
| **S** | Platform & scale | Postgres, jobs, observability, AI gateway, deploy |

### 4.3 Phase gate rule

**Wave 1 (complete for product pedagogy):** Phases **0.2–0.5**, **1 (A1–A6)**, **2 (B1–B6)**, and **2.5 (B7, B8, C1 v1, C5 lite, G1)** are implemented in-repo.

**Wave 2 (active backlog):** Everything still open in CAPABILITIES §3 that is not checked off above — and that fits the **single-learner seat** model — organized in [§15 Wave 2](#15-wave-2--second-development-cycle-post-phase-25) and Phases **3–5**. **Never** schedule multi-child households, parent multi-profile accounts, or classroom/roster products (see §16). Bulk buyers (parents with several kids, schools) = **N separate student subscriptions**. **Phase 0.1 deploy/Postgres** may run in parallel with early Wave 2 product work — it remains a hard gate for *external* beta.

Platform and trust work runs **in parallel** with product features, not after them.

### 4.4 Two-wave framing (execution)

| Wave | Scope | Status |
|------|--------|--------|
| **Wave 1** | Adaptive tutor spine + intervention depth + session rhythm (Phases 0.2–2.5 product epics) | ✅ Shipped in monorepo |
| **Wave 2** | Hostable production closeout + relationships/assessment + multimodal polish + scale (0.1 + Phases 3–5) | ⬜ Active plan — see §15 |

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

### Epic A5 — Parent digest from existing learning events ✅

**CAPABILITIES:** §3.2.4 (optional email alerts), §3.5 progress digests (student-configured), §3.8.2

| Step | Work | Status |
|------|------|--------|
| A5.1 | `ParentDigest` model + aggregate from sessions/events/mastery | ✅ |
| A5.2 | Warm parent copy (effort-first, no shame language) | ✅ |
| A5.3 | `weekly_digest` job + in-app / console / email delivery | ✅ |
| A5.4 | `digest_opt_in` + `family_email` on profile; Dashboard UI | ✅ |

**Note (permanent model):** Digests stay on the **student** profile (`digest_opt_in` + `family_email` or any recipient email the student sets). No separate parent login, no multi-child tree—ever. A parent of three children buys three seats.

**Done when:** Opted-in demo family receives a weekly summary generated from real `LearningEvent` data.  
**How:** Dashboard → Family weekly digest (opt-in + generate preview); job: `python manage.py run_job weekly_digest --dry-run`.

### Epic A6 — Interactive visual models (top struggle topics) ✅

**CAPABILITIES:** §3.3.1 (scoped)

| Step | Work | Status |
|------|------|--------|
| A6.1 | Fraction bars + number line for Math Foundations topics | ✅ |
| A6.2 | Chat manipulative panel + tools “Open fraction model” | ✅ |
| A6.3 | Tutor `⟦visual type=… num=… den=…⟧` drives model; student can share back | ✅ |
| A6.4 | `behavior.manipulative_used` learning events + metrics | ✅ |

**Done when:** At least one pilot topic uses an interactive visual during live teaching, not only ASCII diagrams.  
**How:** Math Foundations → Fraction sense → Interactive model panel; tutor tags move the bar; Share model with Kindling.

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

- [x] Pilot skill graph + mastery updates on graded turns  
- [x] Resume session with transcript  
- [x] Math correctness verification on pilot items  
- [x] Homework image → guided help path  
- [x] Parent weekly digest (opt-in) from events  
- [x] ≥1 interactive visual for a high-struggle pilot topic  

---

## 7. Phase 2 — Intervention depth + teaching quality

**Goal:** Make struggle handling and pedagogy *feel intentional*, not binary (Socratic vs full guide).

**Maps to:** §3.1.3–3.1.8 (selectively), §3.2.1–3.2.3

### Epic B1 — Richer struggle signals ✅

Extend `interventionDetector.js` / session tracker:

| Signal | Behavior | Status |
|--------|----------|--------|
| Idle time | Soft nudge → offer help after threshold | ✅ |
| Repeated short answers | Increase scaffolding bias | ✅ |
| Topic thrashing | Suggest focus or prerequisite | ✅ |
| Rapid guessing | Slow down; verify with A3 when applicable | ✅ |
| Off-topic drift | Gentle redirect | ✅ |

Emit new learning event subtypes where useful. ✅ `struggle.signal` (+ payload.signal subtypes)

**How:** Wait ~45s after a tutor prompt → soft “Still thinking?” card; ~90s → guide offer. Fire short/rapid/off-topic/thrash answers to see reason-specific offers and `struggle.signal` events.

### Epic B2 — Graduated interventions ✅

Replace binary guide mode with levels:

| Level | Name | Status |
|------:|------|--------|
| 1 | Micro-hint | ✅ |
| 2 | Worked example (pilot library when available) | ✅ |
| 3 | Full step-by-step guide | ✅ |
| 4 | Suggest break / easier related skill (A1 graph) | ✅ |

UI: tools panel + in-chat cards reflect level; always exit-able. ✅  
Escalation: “More help” while active; session escalates after lighter levels used.

**How:** Tools → Help ladder (4 rungs). Struggle offers pick a level by severity; accept enters that mode. Worked examples from pilot pack on Fraction sense / equations.

### Epic B3 — Affective check-ins ✅

| Work | Status |
|------|--------|
| Periodic gentle affect prompts after frustration streaks or long sessions | ✅ |
| Celebrate **persistence** in tutor copy and parent digest, not only accuracy | ✅ |
| Store affect events; never shame in student UI | ✅ |

**How:** After ~2 frustrated turns or a long lesson, in-chat “How are you feeling?” card (4 warm options). Persistence chips + learner-pulse spark; digest “Effort & heart”; events `affect.checkin` / `affect.persistence`.

### Epic B4 — Worked-example library (pilot) ✅

**CAPABILITIES:** §3.1.3

| Work | Status |
|------|--------|
| Curated examples + counterexamples per pilot skill | ✅ DB `WorkedExample` + seed pack |
| Age-appropriate language; linked to skills | ✅ grade_min/max + Skill FK |
| Tutor prefers library example over free generation when available | ✅ system prompt block + ladder L2 |

**How:** `seed_kindling` loads library; `GET /api/learning/worked-examples/?subject=&topic=&grade=`; tools **Show library example**; intervention L2 uses best match.

### Epic B5 — Misconception engine v1 ✅

**CAPABILITIES:** §3.1.5

| Work | Status |
|------|--------|
| Replace/extend tiny regex set with stored misconceptions per domain | ✅ `MisconceptionDef` + seed |
| Detect → label → remediating prompt playbook | ✅ FE/BE detect + tutor playbook block |
| Feed remediation success into mastery | ✅ clear active MC + skill BKT nudge |

**How:** Say “I added the denominators” on Adding fractions → learner pulse tip + playbook in tutor prompt; correct later → `misconception.remediated` + skill spark lift.

### Epic B6 — Multi-step “show your work” ✅

**CAPABILITIES:** §3.1.6

| Work | Status |
|------|--------|
| Structured intermediate checks | ✅ step engine + A3 verifier |
| Partial credit pedagogy aligned with A3 checker | ✅ % solid steps → mastery grade |
| Session UI for step list (optional panel) | ✅ `MultiStepPanel` + tools CTA |

**Pilot skills:** `frac.add_unlike` (Adding fractions), `alg.one_step_equation` (Simple equations).

**How:** Tools → **Show your work** on Adding fractions; answer each step in chat; panel tracks ✓/→ and partial credit; exit anytime.

**Phase 2 exit criteria**

- [x] ≥5 struggle signals drive intervention decisions  
- [x] Graduated intervention ladder live in lesson  
- [x] Affective check-in flow without breaking tutor character  
- [x] Pilot worked examples + misconception records in DB  
- [x] Multi-step problem mode on at least one skill  

---

## 8. Phase 2.5 — Session rhythm (SUGGESTIONS-feasible, beta-relevant)

**Goal:** Capture the *useful* parts of the day-in-the-life vision ([`SUGGESTIONS.md`](./SUGGESTIONS.md)) without VR, global collab, wearables, or heavy gamification. Thin rituals at **start** and **end** of a lesson, plus the retention engine that makes multi-day adaptation feel automatic.

**Source:** SUGGESTIONS “natural next steps” — session-start check-in, end-of-session reflection, spaced review, light goals surface.  
**Explicitly deferred here:** mindfulness content packs, voice-tone affect, quests/badges, external course/book recommenders, peer collaboration (see §15).

**Maps to:** CAPABILITIES §3.2.3 (extend), §3.1.4, §3.5.4 (lite), §3.7 experience

### Epic B7 — Session-start energy check-in ✅

**Extends:** B3 (in-lesson affect) → optional **pre-lesson** mood/energy chip.

| Step | Work | Status |
|------|------|--------|
| B7.1 | Optional chip on lesson open / first turn: 3–4 warm energy options (e.g. ready / okay / low / need a break) | ✅ |
| B7.2 | Emit `affect.session_start` (or reuse `affect.checkin` with `reason=session_start`); never block starting the lesson | ✅ `reason=session_start`; greeting waits ≤14s then continues |
| B7.3 | **Low energy → softer open:** tutor directive for shorter steps / lighter load; optional one-tap offer of break or easier related skill (reuse B2 L4, do not invent new ladder) | ✅ |
| B7.4 | Skip / dismiss forever-this-session; no shame copy; respect existing distress safety path | ✅ |

**Done when:** Student can optionally set energy at session start; choosing low energy changes tutor pacing or offers break/easier path within one turn.  
**How:** Open Math Foundations → chip appears once → pick “low” → first tutor message or banner reflects lighter pace / break offer.  
**Beta map:** [`BETA_LAUNCH.md`](./BETA_LAUNCH.md) **P1.8**  
**Verify:** `frontend/scripts/smoke-session-start-b7.mjs` (esbuild bundle); backend `learning.tests_affect_b3` B7 case.

### Epic B8 — End-of-session reflection ✅

**Vision beat:** evening “reflection & growth” without a separate product surface.

| Step | Work | Status |
|------|------|--------|
| B8.1 | On natural session end (leave lesson, topic complete, or explicit “Wrap up”): short card — *what clicked?* + *what’s next?* (2–4 choices or one free line) | ✅ Tools **Wrap up** → reflection card |
| B8.2 | Persist as learning event(s) e.g. `session.reflect`; feed optional one-line note into resume snapshot / next session open | ✅ `session.reflect` + profile `lastReflection` + resume snapshot |
| B8.3 | Student-facing close copy stays encouraging; optional deep-link CTA to **Review spark** when C1 has a due item | ✅ Thin local CTA until C1; ended-card button |
| B8.4 | Skip always available; do not force reflection on crash/error exits | ✅ |

**Done when:** Ending a normal lesson can capture a 10-second reflection and surface a sensible next step (continue topic, review spark, or rest).  
**How:** Practice → **Wrap up** → reflection card → Save & finish / Skip → journal summary + optional Review spark CTA.  
**Beta map:** **P1.9**  
**Verify:** `frontend/scripts/smoke-session-reflect-b8.mjs`; backend `learning.tests_session_reflect_b8`; browser `verify-session-reflect-b8.mjs`.

### Epic C1 — Spaced review v1 (detail) ✅

**CAPABILITIES:** §3.1.4 · **Primary retention bet for paid beta**

| Step | Work | Status |
|------|------|--------|
| C1.1 | Selection: weak / rusty pilot skills from BKT + recent struggle / incorrect streaks (7-day window default) | ✅ `review_service.select_review_candidates` |
| C1.2 | `review_schedule` job (or on-read compute) materializes due reviews; honor existing jobs skeleton hook | ✅ job + on-read via GET `/api/learning/reviews/` |
| C1.3 | Student UI: **Review spark** entry on Dashboard + My Subjects; one-tap start short review session | ✅ `ReviewSparkCard` |
| C1.4 | Review session mode: brief retrieval practice on the skill (not full new-topic lecture); mastery update on graded turns | ✅ review mode banner + tutor directives; graded turns still drive BKT |
| C1.5 | After review success, reschedule further out; after fail, sooner + optional easier prerequisite | ✅ SM-2-lite `complete_review` |

**Done when:** Within 7 days of struggle on a pilot skill, learner sees an auto-suggested review and can complete it in-product.  
**How:** Miss fraction items → later open Dashboard → Review spark → short practice → skill spark moves.  
**Beta map:** **P1.2**  
**Verify:** `learning.tests_review_c1`; `frontend/scripts/smoke-review-c1.mjs`; browser `verify-review-c1.mjs`.

### Epic C5 — Goals surface (lite) ✅

**CAPABILITIES:** §3.5.4 lite only — **not** full exam planners or multi-week contracts.

| Step | Work | Status |
|------|------|--------|
| C5.1 | Surface existing topic `learning_goal` + familiarity on lesson path / tools / first-session orientation | ✅ path chip, tools “Your focus”, chat header |
| C5.2 | Optional one-line “this week I’m working on…” from profile or subject (student-editable) | ✅ `week_focus` / `weekFocus` + Dashboard editor |
| C5.3 | Inject goal into tutor system prompt when present; reflection (B8) may echo goal language | ✅ gemini topic intent + week focus; B8 body echo |
| C5.4 | **Defer:** exam timelines, homework windows, guardian-set contracts | — |

**Done when:** Student can see and lightly set a goal that shapes the first turns of a lesson without a planning product.  
**How:** Set goal on subject/topic → open lesson → tutor references it; path or tools shows the goal chip.  
**Beta map:** **P2.4**  
**Verify:** `frontend/scripts/smoke-goals-c5.mjs`; backend `students.tests_goals_c5`; browser `verify-goals-c5.mjs`.

### Epic G1 — Light spark challenge (optional, post-C1) ✅

**Only after** C1 + session rhythm are sticky. Stays tutor-first — not a badge platform.

| Step | Work | Status |
|------|------|--------|
| G1.1 | Optional “Spark challenge”: e.g. 3 solid graded turns on a weak pilot skill from Dashboard | ✅ Dashboard card → challenge lesson mode |
| G1.2 | Completion = persistence / mastery celebration only (reuse B3 chips + skill sparks) — **no** collectible badge inventory | ✅ chips + `challenge.*` events; optional C1 reschedule |
| G1.3 | **Defer:** unlockable sims, global portfolios, employer/university credentials | — |

**Done when:** A motivated student can take a short optional challenge that reuses mastery events without new economy systems.  
**Beta map:** **P2.9** (only if P0/P1 green and learners ask for “something to beat”)  
**Verify:** `frontend/scripts/smoke-challenge-g1.mjs`; backend `learning.tests_challenge_g1`; browser `verify-challenge-g1.mjs`.

**Phase 2.5 exit criteria (beta product slice)**

- [x] Optional session-start energy check-in can soften pacing or offer break/easier skill (**B7**)  
- [x] End-of-session reflection captures next-step signal without blocking exit (**B8**)  
- [x] Spaced review v1 surfaces and completes for at least one pilot skill path (**C1**)  
- [x] Topic/subject goal visible in lesson when set (C5 lite)  
- [x] No VR / collab / badge portfolio work shipped under this phase  

---

## 9. Phase 3 — Single-learner depth & differentiation (Horizon B) · **Wave 2 core**

**Goal:** After Phase 2.5 retention loops, deepen **one student's** learning quality and shareable progress—without ever building multi-child households or classroom products.

**Commercial invariant:** one subscription seat per learner. A parent with two children = two accounts. A school with 30 students = 30 seats (billing/ops only—no roster UI, no class aggregates product).

**Maps to:** CAPABILITIES §3.1.4 (depth beyond v1), §3.1.7–3.1.8, §3.5.3–3.5.4 (student-facing), §3.6.3/5 · digest polish stays on A5

| Epic | Capability | Deliverable | Status | Notes |
|------|------------|-------------|--------|-------|
| **C1+** | §3.1.4 Spaced review depth | Multi-subject due list, stronger schedule UX, richer forgetting curve | ⬜ | v1 ✅ in Phase 2.5 |
| **C2** | §3.5.1 Parent accounts | — | ❌ | **Out of product forever** — student-configured digest email only (A5) |
| **C3** | §3.5.2 Classroom mode | — | ❌ | **Out of product forever** — institutions buy per-seat; no roster product |
| **C4** | §3.5.3 Standards reports | Export progress vs framework codes for **this student** | ⬜ | Single-learner export only |
| **C5+** | §3.5.4 Goals & plans (full) | Exam prep timelines, homework windows, weekly focus (student-owned) | ⬜ | Lite ✅ Phase 2.5; no guardian contract product |
| **C6** | §3.1.7 Assessment modes | Low-stakes quizzes / end-of-topic checks separate from open chat | ⬜ | |
| **C7** | §3.1.8 Domain playbooks | Second thin domain pack + scaffold consistency beyond math pilot | ⬜ | Beta P2.2 if sessions leave math |
| **C8** | §3.6.5 Eval harness | Automated scores: hint quality, Socratic fidelity, intervention timing | ⬜ | Manual rubric = beta P2.3 |
| **C9** | §3.6.3 Human review | Ops flag on distress / repeated fail (support queue) | ⬜ | Beta P2.8 lite; **not** a parent app |
| **C10** | §3.2.4 Optional email alerts | Extra “stuck N sessions” email to the **same** student-configured digest address | ⬜ | Extends A5 only; student controls opt-in |

### Phase 3 epic sketches (Wave 2 backlog detail)

#### C1+ — Spaced review depth
| Step | Work | Status |
|------|------|--------|
| C1+.1 | Multi-subject / multi-domain due selection (not only pilot math) | ⬜ |
| C1+.2 | Student schedule UX (upcoming vs due, snooze, “why this skill”) | ⬜ |
| C1+.3 | Stronger interval model (forgetting curve params per skill family) | ⬜ |
| C1+.4 | Tie B8 next-step + week focus (C5) into review ranking | ⬜ |

#### C2 / C3 — Explicitly not planned
| Epic | Stance |
|------|--------|
| **C2** Parent multi-child accounts | **Never.** Digest email only (student configures recipient on their profile). |
| **C3** Classroom / roster / LMS class product | **Never.** Schools purchase individual seats; no class dashboard. |

#### C4 — Standards alignment reports (single learner)
| Step | Work | Status |
|------|------|--------|
| C4.1 | Map pilot skills → standard codes (expand A1 `standard_codes`) | ⬜ |
| C4.2 | Export PDF/CSV progress for **this student** (student or payer downloads) | ⬜ |
| C4.3 | Plain-language narrative suitable to forward by email | ⬜ |

#### C5+ — Goals & plans (full, single learner)
| Step | Work | Status |
|------|------|--------|
| C5+.1 | Exam / target date + countdown orientation | ⬜ |
| C5+.2 | Homework help windows (time-boxed tutor modes) | ⬜ |
| C5+.3 | Weekly focus the **student** sets (no guardian contract UI) | ⬜ |
| C5+.4 | **Keep lite surface** as default; fuller planner opt-in | — |

#### C6 — Assessment modes
| Step | Work | Status |
|------|------|--------|
| C6.1 | End-of-topic check (short graded set, not open chat) | ⬜ |
| C6.2 | Low-stakes quiz mode with A3 verification where applicable | ⬜ |
| C6.3 | Optional timed practice flag | ⬜ |
| C6.4 | Results feed mastery + optional Review spark seeds | ⬜ |

#### C7 — Domain playbooks
| Step | Work | Status |
|------|------|--------|
| C7.1 | Codify early-math / algebra scaffold pack as data (not only prompts) | ⬜ |
| C7.2 | Second thin pack (science or writing) if >40% sessions leave math | ⬜ |
| C7.3 | Consistency checks via C8 samples | ⬜ |

#### C8 — Eval harness
| Step | Work | Status |
|------|------|--------|
| C8.1 | Offline scorer on recorded transcripts (hint quality, Socratic fidelity, intervention timing) | ⬜ |
| C8.2 | Dashboard or CLI report for weekly sample | ⬜ |
| C8.3 | Beta bridge: manual 10-session rubric (BETA P2.3) until automated | ⬜ |

#### C9 / C10 — Ops flags & digest-channel alerts (still single seat)
| Step | Work | Status |
|------|------|--------|
| C9.1 | Flag model: distress (reuse safety), repeated fail — for **ops/support** | ⬜ |
| C9.2 | Simple ops review list (admin), not a parent app | ⬜ |
| C10.1 | Optional rule: email digest recipient when stuck N sessions (student opt-in) | ⬜ |
| C10.2 | Same email channel as A5; never shame copy in student chat | ⬜ |

**Phase 3 exit criteria (Horizon B / Wave 2 product)**

- [x] Spaced review v1 appears for weak pilot skills — Phase 2.5 / beta P1.2 (**C1 done**)  
- [ ] Spaced review depth beyond v1 (multi-subject, stronger schedule UX) (**C1+**)  
- [x] **No** multi-child or classroom product (strategy lock)  
- [ ] Exportable standards-aligned report for **one** student (**C4**)  
- [ ] At least one assessment mode distinct from open chat (**C6**)  
- [ ] Offline or weekly eval path produces quality scores on recorded sessions (**C8**)  
- [ ] Digest remains student-configured email only (A5; optional C10 on same channel)  

---

## 10. Phase 4 — Multimodal, voice, and experience polish · **Wave 2 experience**

**Goal:** Teaching medium matches how children actually learn and how families use devices.

**Maps to:** CAPABILITIES remaining §3.3, §3.4, §3.7

| Priority | Item | CAPABILITIES | Status | Notes |
|----------|------|--------------|--------|-------|
| **P0** | Rendered diagrams (Mermaid/SVG/geometry) | §3.3.2 | ⬜ | Beyond ASCII; streaming-safe |
| **P0** | Accessible content pack | §3.3.6 | ⬜ | Dyslexia-friendly option, high contrast, TTS captions, keyboard-first lesson (partial reduced-motion already in CSS) |
| **P1** | Attachments & work upload generalization | §3.7.3 | ⬜ | Beyond homework photo (PDF/docs) |
| **P1** | Keyboard shortcuts & focus modes | §3.7.4 | ⬜ | Distraction-free lesson |
| **P1** | Theming | §3.7.5 | ⬜ | Calm light, high-contrast toggle; reduced-motion respect ✅ partial |
| **P1** | Offline practice packs | §3.7.1 deepen | ⬜ | Failure UX ✅; offline *practice content* still open |
| **P2** | Whiteboard co-drawing | §3.3.4 | ⬜ | Shared sketch space |
| **P2** | Video micro-lessons | §3.3.5 | ⬜ | Optional clips when density high |
| **P2** | Low-latency duplex voice | §3.4.1 | ⬜ | Continuous conversation mode |
| **P2** | Multi-language tutoring | §3.4.2 | ⬜ | UI + tutor pairs; EAL bilingual |
| **P3** | Pronunciation coaching | §3.4.3 | ⬜ | Languages / early reading |
| **P3** | Age-tuned TTS personas | §3.4.4 | ⬜ | Stable voice identity per preference |
| **P3** | Voice-tone / prosody affect | SUGGESTIONS | ⬜ | After duplex voice — not beta |
| **P3** | Guided mindfulness micro-pack | SUGGESTIONS | ⬜ | Optional L4 companion if B7 low-energy is used |

**Shipped multimodal baseline (Wave 1 — do not rebuild):** fraction bars / number line (A6), homework image upload (A4), ASCII diagrams, TTS/STT toggles, session resume + transcript search (A2), connectivity failure UX (0.3).

**Done when (Phase 4 minimum):** diagram rendering + accessibility pack + focus mode ship; voice/language items scheduled by demand.

---

## 11. Phase 5 — Platform scale & category leadership (Horizon C) · **Wave 2 scale**

**Maps to:** CAPABILITIES §3.8 remaining, Horizon C · SUGGESTIONS stretch (collab, credentials, immersive)

| Track | Work | Status |
|-------|------|--------|
| AI gateway depth | Multi-model failover chains + cost controls (adapters/BYOK already ship) | ⬜ |
| Mobile | PWA first (install, voice, offline notes); native later if needed | ⬜ |
| i18n / RTL | Full UI string extraction + RTL layout | ⬜ |
| Lifelong learner model | Cross-subject knowledge that persists years | ⬜ |
| School integrations | Optional SSO / bulk seat purchase for **individual** learner logins—no classroom product | ⬜ |
| Research instrumentation | Learning-science-grade event schema & consent | ⬜ |
| Enterprise | Multi-region hosting, admin, compliance packs | ⬜ |
| Privacy deepen | Retention controls UX, regional hosting options beyond baseline export/delete | ⬜ |
| Peer / global collaboration | SUGGESTIONS “global collab” — not until strategy changes | ⬜ deferred |
| Credential portfolios | Employer/university-recognized portfolios — post-PMF | ⬜ deferred |
| Immersive / VR lessons | Virtual labs & story environments — post Phase 4 media | ⬜ deferred |

---

## 12. Cross-cutting engineering standards

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

## 13. Suggested milestone map

| Milestone | Name | Includes | Outcome |
|-----------|------|----------|---------|
| **M0** | Deployable | Phase 0 | Staging on Postgres, observability, safety floor |
| **M1** | Continuity | A2 + resilience | Families can pause/resume real lessons |
| **M2** | Trust math | A3 + A1 start | Graded mastery on pilot math |
| **M3** | Multimodal help | A4 + A6 | Photo homework + one manipulative |
| **M4** | Family loop | A5 + digest job | Weekly parent clarity without shaming |
| **M5** | Adaptive depth | Phase 2 | Graduated help + misconceptions + examples |
| **M5.5** | Session rhythm | Phase 2.5 · B7, B8, C1 v1, C5 lite, G1 | Start/end rituals + review spark + light challenge — **Wave 1 complete** |
| **M6** | Wave 2 product | Phase 3 subset (C1+, C6/C7/C8, C4 single-learner export) | Assessment + playbooks + eval; **never** multi-child/classroom products |
| **M6.5** | Wave 2 experience | Phase 4 P0–P1 | Diagrams, a11y, focus mode, attachment generalize |
| **M7** | Wave 2 scale | Phase 5 as needed | PWA, gateway failover, i18n, school SSO |

---

## 14. Traceability: CAPABILITIES §3 → plan phases

| §3 area | Item | Phase / epic |
|---------|------|----------------|
| 3.1 Pedagogy | True mastery model | Phase 1 · A1 |
| 3.1 | Curriculum graph | Phase 1 · A1 (pilot); expand later |
| 3.1 | Worked-example library | Phase 2 · B4 |
| 3.1 | Retrieval / spaced review | Phase 2.5 · **C1 v1** ✅; deepen **Wave 2 · C1+** |
| 3.1 | Misconception engine | Phase 2 · B5 ✅ |
| 3.1 | Multi-step problem solving | Phase 2 · B6 ✅ |
| 3.1 | Assessment modes | **Wave 2 · Phase 3 · C6** ⬜ |
| 3.1 | Teacher/tutor playbooks | **Wave 2 · Phase 3 · C7** ⬜ |
| 3.2 Intervention | Richer struggle signals | Phase 2 · B1 ✅ |
| 3.2 | Graduated interventions | Phase 2 · B2 ✅ |
| 3.2 | Affective check-ins | Phase 2 · B3 ✅; session-start Phase 2.5 · B7 ✅ |
| 3.2 | Parent/teacher alerts | A5 digest email ✅; optional stuck email on same channel **C10** ⬜ |
| 3.3 Multimodal | Interactive visuals | Phase 1 · A6 ✅ |
| 3.3 | Rendered diagrams | **Wave 2 · Phase 4 P0** ⬜ |
| 3.3 | Image input | Phase 1 · A4 ✅ |
| 3.3 | Whiteboard | **Wave 2 · Phase 4 P2** ⬜ |
| 3.3 | Video micro-lessons | **Wave 2 · Phase 4 P2** ⬜ |
| 3.3 | Accessible content | **Wave 2 · Phase 4 P0** ⬜ (reduced-motion partial) |
| 3.4 Voice & language | Duplex / i18n / personas | **Wave 2 · Phase 4–5** ⬜ |
| 3.5 Progress & institutions | Parent multi-child accounts | ❌ **Never** — digest email only (A5) |
| 3.5 | Teacher/classroom product | ❌ **Never** — institutions = per-seat subscriptions only |
| 3.5 | Standards reports | **Wave 2 · Phase 3 · C4** (single student export) ⬜ |
| 3.5 | Goals & plans | Phase 2.5 · **C5 lite** ✅; full **Wave 2 · C5+** (student-owned) ⬜ |
| 3.5 | Portfolios / credentials | Phase 5 stretch ⬜; light challenge = G1 ✅ |
| 3.5 | End-of-session reflection | Phase 2.5 · **B8** ✅ |
| 3.6 Trust | Child-safe policies | Phase 0 · 0.4 ✅ |
| 3.6 | Answer correctness | Phase 1 · A3 ✅ |
| 3.6 | Human-in-the-loop | **Wave 2 · Phase 3 · C9** ⬜ |
| 3.6 | Privacy by design | Phase 0 baseline ✅; deepen Phase 5 ⬜ |
| 3.6 | Eval harness | **Wave 2 · Phase 3 · C8** ⬜ |
| 3.7 Experience | Offline / flaky network | Phase 0 · 0.3 ✅; offline packs Phase 4 ⬜ |
| 3.7 | Session history & resume | Phase 1 · A2 ✅ |
| 3.7 | Attachments | Phase 1 · A4 ✅; generalize Phase 4 ⬜ |
| 3.7 | Keyboard / focus | **Wave 2 · Phase 4** ⬜ |
| 3.7 | Theming | **Wave 2 · Phase 4** ⬜ |
| 3.8 Platform | Postgres | Phase 0 · **0.1** ⬜ (Wave 2 deploy track) |
| 3.8 | Background jobs | Phase 0 · 0.5 ✅ skeleton; production cron = beta P0 |
| 3.8 | Observability | Phase 0 · 0.2 ✅ |
| 3.8 | Provider flexibility | Gateway/BYOK ✅; failover/cost **Wave 2 · Phase 5** ⬜ |
| 3.8 | Mobile apps | **Wave 2 · Phase 5** PWA ⬜ |
| 3.8 | Internationalization | **Wave 2 · Phase 5** ⬜ |

---

## 15. Wave 2 — Second development cycle (post Phase 2.5)

**Context:** Wave 1 delivered the adaptive tutor, intervention depth, and session-rhythm retention slice. CAPABILITIES §3 items that remain open are the **Wave 2 backlog**. Default commercial model remains **one account = one learner**.

### 15.1 Wave 1 complete (do not restart)

| Area | Epics / phases | Status |
|------|----------------|--------|
| Platform floor (minus Postgres host) | 0.2–0.5 | ✅ |
| Horizon A product | A1–A6 | ✅ |
| Intervention depth | B1–B6 | ✅ |
| Session rhythm | B7, B8, C1 v1, C5 lite, G1 | ✅ |
| UX usability pass | Nav, home, lesson chrome, skeletons | ✅ (2026-09) |

### 15.2 Wave 2 tracks (priority order)

Execute **Track D** in parallel with product tracks. **Never** add multi-child households or classroom/roster products—schools and multi-child parents buy **separate seats** only.

#### Track D — Deployable production closeout (hard gate for external beta)

Maps to: CAPABILITIES §3.8.1–3.8.3 remaining · [`BETA_LAUNCH.md`](./BETA_LAUNCH.md) **P0**

| ID | Work | PLAN | Status |
|----|------|------|--------|
| D.1 | Postgres + migrations on staging/prod | Phase 0 · 0.1 | ⬜ |
| D.2 | Host + HTTPS + `ALLOWED_HOSTS` / CORS / `DEBUG=0` | Beta P0 | ⬜ |
| D.3 | Secrets out of repo; platform AI key server-side or capped proxy | Beta P0 | ⬜ |
| D.4 | Real email (ESP) for digests + transactional | Beta P0 | ⬜ |
| D.5 | Cron: `run_scheduled_jobs` (digest, review_schedule, heartbeat) | 0.5 + C1 | ⬜ |
| D.6 | Per-student billing (Checkout or invoice) + daily AI caps | Beta P0 | ⬜ |
| D.7 | Backup + restore drill; support + Terms/Privacy links | Beta P0 | ⬜ |

**Done when:** A stranger can complete signup → lesson → (optional) pay on staging without SSH folklore.

#### Track P — Pedagogy depth (highest product leverage after deploy)

Maps to: CAPABILITIES §3.1.4 depth, §3.1.7–3.1.8, §3.6.5

| ID | Work | PLAN epic | Status |
|----|------|-----------|--------|
| P.1 | Spaced review depth (multi-subject, schedule UX) | **C1+** | ⬜ |
| P.2 | Assessment modes (end-of-topic / low-stakes quiz) | **C6** | ⬜ |
| P.3 | Domain playbook #2 (science or writing thin pack) | **C7** | ⬜ |
| P.4 | Eval harness v1 (or manual rubric bridge) | **C8** | ⬜ |
| P.5 | Expand skill graph / standards codes beyond pilot as needed for C4/C6 | A1 expand | ⬜ |

#### Track R — Shareable progress (single learner only)

Maps to: CAPABILITIES §3.5.3–3.5.4, §3.2.4 · **A5 digests remain the only adult channel**

| ID | Work | PLAN epic | Status |
|----|------|-----------|--------|
| R.1 | A5 digest polish (preview send, clearer copy, student configures recipient email) | A5 polish · Beta P2.1 | ⬜ |
| R.2 | Optional stuck-session email on the **same** digest address (student opt-in) | **C10** | ⬜ |
| R.3 | Standards-aligned export for **this** student | **C4** | ⬜ |
| R.4 | Full goals/plans (exam timelines) — student-owned | **C5+** | ⬜ |
| R.5 | Ops support flags (distress / repeated fail) — admin only | **C9** | ⬜ |
| — | Multi-child parent accounts / classroom rosters | **C2 / C3** | ❌ never |

#### Track X — Experience & multimodal polish

Maps to: CAPABILITIES §3.3.2/6, §3.7.3–3.7.5

| ID | Work | PLAN | Status |
|----|------|------|--------|
| X.1 | Mermaid/SVG/geometry diagram rendering | Phase 4 P0 | ⬜ |
| X.2 | Accessibility pack (contrast, type, captions, keyboard lesson) | Phase 4 P0 | ⬜ |
| X.3 | Focus mode + keyboard shortcuts | Phase 4 P1 | ⬜ |
| X.4 | Theme toggle (incl. high contrast) | Phase 4 P1 | ⬜ |
| X.5 | Generalize attachments (PDF/docs) | Phase 4 P1 | ⬜ |
| X.6 | Offline practice packs | Phase 4 P1 | ⬜ |

#### Track V — Voice & language (demand-driven)

Maps to: CAPABILITIES §3.4

| ID | Work | Status |
|----|------|--------|
| V.1 | Low-latency duplex voice lesson mode | ⬜ |
| V.2 | Multi-language UI + tutor pairs / EAL | ⬜ |
| V.3 | TTS personas; pronunciation later | ⬜ |

#### Track S — Scale & category leadership

Maps to: CAPABILITIES §3.8 remaining · Horizon C

| ID | Work | Status |
|----|------|--------|
| S.1 | Gateway failover chains + cost controls | ⬜ |
| S.2 | PWA install + reliable mobile voice | ⬜ |
| S.3 | Full i18n + RTL | ⬜ |
| S.4 | School LMS/SSO; multi-region compliance | ⬜ |
| S.5 | Lifelong cross-subject learner model | ⬜ |

### 15.3 Suggested Wave 2 sequencing

```text
Wave 2a — Hostable beta (Track D)
  D.1–D.7 until staging dogfood is boring
  Keep product changes limited to beta blockers

Wave 2b — Retention depth (Track P, while beta runs)
  P.1 C1+ review depth
  P.2 C6 assessment mode (one thin path)
  P.4 C8 manual rubric → automated later
  P.3 C7 second domain only if sessions leave math

Wave 2c — Teach medium (Track X P0–P1)
  X.1 diagrams + X.2 a11y + X.3 focus mode
  X.5 attachments if homework PDF demand appears

Wave 2d — Shareable progress (Track R) — still one seat per learner
  R.1 digest polish first (cheap; student configures email)
  R.2 optional stuck email on same channel
  R.3 single-student standards export (forwardable by email)
  R.4 full goals planner last (lite already ships)
  Never: parent multi-profile login, household SKUs, classroom dashboards

Wave 2e — Scale (Tracks V + S) — post PMF signals
  S.1 cost/failover if COGS hurts
  S.2 PWA if mobile majority
  V.* only if voice is a top interview theme
```

### 15.4 Wave 2 exit criteria (definition of “second wave done enough”)

- [ ] External staging/prod path green (Track D)  
- [ ] C1+ or C6 ships measurable retention/assessment lift beyond Wave 1  
- [ ] Phase 4 P0 (diagrams + a11y) shipped or explicitly deferred with reason  
- [x] Strategy lock: no multi-child / classroom products; multi-learner = multi-seat  
- [ ] CAPABILITIES §3 / this plan still agree on ✅ vs ⬜ / ❌

### 15.5 Immediate next actions (start here)

1. **Track D** — follow [`BETA_LAUNCH.md`](./BETA_LAUNCH.md) P0 (Postgres, host, email, cron, billing, caps).  
2. **Do not re-implement** Wave 1 epics (A1–A6, B1–B8, C1 v1, C5 lite, G1).  
3. After D is green, pull **P.1 / P.2** from Track P; Track R = digest polish + single-learner export only.  
4. Optional digests: student configures recipient email—**not** a parent account product. Multi-child families buy multiple seats.  

### Historical bootstrap checklist (Wave 1 — completed)

1. **Stand up Phase 0.2–0.5** — observability, failure UX, safety doc, jobs ✅ (Postgres staging still open → Track D).  
2. **Ship M1–M5** — resume, correctness, mastery, homework, visuals, digests, B1–B6 ✅.  
3. **Ship M5.5 session rhythm** — B7, B8, C1 v1, C5 lite, G1 ✅.  
4. **Update this plan** when Wave 2 epics land (changelog §18).

---

## 16. Out of scope (permanent or deferred)

**Permanent product exclusions (do not re-open without a full strategy rewrite)**

- **Multi-child household accounts** / parent multi-profile hierarchy (**C2**)  
- **Family multi-seat SKUs** or “manage my kids” parent portal  
- **Classroom mode**: rosters, class assignments, class leaderboards, teacher org product (**C3**)  
- LMS class sync that implies multi-learner management UI (seat provisioning APIs for bulk purchase may exist later; **no class product**)  

**How multi-learner buyers work instead**

- Parent of 3 children → **3 separate student subscriptions**  
- School / tutoring center → **N individual seats** (billing/ops), each learner logs in as themselves  
- Adults who want progress notes → student turns on **digest email** to that address (A5)

**Platform / market deferred (not excluded forever)**

- Full multi-region compliance / enterprise admin  
- Research-grade multi-year learner model  
- Native mobile apps (prefer PWA first)  
- Complete bilingual product localization  
- Whiteboard and video micro-lessons before review depth sticks  
- School SSO for **single-learner** login convenience (still one seat per account)

**From SUGGESTIONS — explicitly not “now”** (do not sneak into beta sprints)

- Wearables or voice-tone / prosody mood sensing  
- VR / immersive virtual environments or digital chem labs  
- Global peer collaboration / multiplayer projects  
- Employer- or university-recognized badge portfolios  
- Heavy quest / unlock economies (G1 light challenge is the ceiling for gamification)  
- External book / Coursera / side-project recommender without curated quality bar  
- Full guided mindfulness content library (optional later companion to B7 L4 path)

---

## 17. Success metrics (product)

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
| Review spark start → complete rate (C1) | Spaced review is used, not ignored |
| Session-start check-in completion % (B7) | Ritual is light enough to use |
| End reflection completion % (B8) | Growth beat without friction |
| D7 / D14 return among students with ≥1 review due | Multi-day adaptive loop works |

---

## 18. Document control

| Field | Value |
|-------|--------|
| Based on | `CAPABILITIES.md` §3, §4, §5; feasible slice of `SUGGESTIONS.md` |
| Codebase | `frontend/` + `backend/` monorepo |
| Status | Active execution plan — **Wave 2** backlog live; Wave 1 shipped |
| Last updated | 2026-09-01 |

### Changelog

| Date | Note |
|------|------|
| 2026-09-01 | **Strategy lock:** Kindling is permanently **one student = one seat**. C2 multi-child and C3 classroom marked ❌ never; digests stay student-configured email (A5). Schools/multi-child parents buy separate seats. Wave 2 Track R reframed to shareable single-learner progress only. |
| 2026-09-01 | **Wave 2** defined: compared CAPABILITIES §3 pending items vs shipped Phase 0–2.5; expanded Phase 3 epic sketches (C1+, C4–C10), Phase 4/5 status table; new §15 Wave 2 tracks (D deploy, P pedagogy, R shareable progress, X experience, V voice, S scale). Marked C5 lite + G1 complete in Phase 2.5. |
| 2026-08-31 | Phase 2.5 Epic **G1** light spark challenge: Dashboard card, 3 solid turns, celebration chips, `challenge.*` events. |
| 2026-08-31 | Phase 2.5 Epic **C5 lite** goals surface: path/tools/header chips, `week_focus`, tutor + B8 echo. |
| 2026-08-30 | Phase 2.5 Epic **C1** spaced review v1: `SkillReviewItem`, review_schedule job, GET/POST reviews API, Dashboard + My Subjects Review spark, lesson review mode, SM-2-lite complete; B8 CTA prefers due items. |
| 2026-08-30 | Phase 2.5 Epic **B8** implemented: Wrap up → reflection card (what clicked / what’s next / optional note), `session.reflect` events, profile + resume note, Review spark CTA (thin until C1); smoke + browser verify. |
| 2026-08-30 | Phase 2.5 Epic **B7** implemented: session-start energy chip, `reason=session_start` events, low→softer directives + L4 break/easier offer, greeting wait ≤14s; smoke + browser verify. |
| 2026-08-30 | Phase **2.5 Session rhythm** from SUGGESTIONS feasible set: **B7** start check-in, **B8** end reflection, **C1** spaced review detail, **C5 lite** goals, optional **G1** spark challenge; defer VR/collab/credentials/wearables to §16 / Phase 5. |
| 2026-08-17 | Point immediate actions at `BETA_LAUNCH.md` for paid **student** beta (individual seats; P0 deploy/billing, C1 spaced review v1); mark historical M1–M2 checklist complete. |
| 2026-08-17 | Commercial framing: student-first subscriptions; family multi-seat / C2 not beta-critical. |
| 2026-08-13 | Phase 2 Epic B6: multi-step show-your-work (panel, intermediate checks, partial credit). |
| 2026-08-13 | Phase 2 Epic B5: misconception engine (catalog, playbooks, detect/remediate, mastery boost). |
| 2026-08-13 | Phase 2 Epic B4: worked-example library (DB + seed + API + tutor prefer + tools button). |
| 2026-08-13 | Phase 2 Epic B3: affective check-ins + persistence celebration (events, tutor directives, parent digest). |
| 2026-08-13 | Phase 2 Epic B2: graduated intervention ladder (micro-hint → worked example → full guide → break/easier skill). |
| 2026-08-13 | Phase 2 Epic B1: richer struggle signals (idle nudge/offer, short answers, thrashing, rapid guessing, off-topic) + `struggle.signal` events. |
| 2026-08-12 | Initial PLAN.md created from CAPABILITIES “excellent go-to tutor” section and Horizon A–C priorities. |
| 2026-08-12 | Phase 0.2 Observability implemented (skipped 0.1 Postgres per product decision). |
| 2026-08-12 | Phase 0.3 Resilience & failure UX (AI recovery, connectivity banner, durable queue/history). |
| 2026-08-12 | Phase 0.4 Child safety floor (age policies, distress escalation, export/delete, safety doc). |
| 2026-08-12 | Phase 0.5 Background jobs skeleton (heartbeat + digest/mastery/review placeholders, cron runner). |
| 2026-08-12 | Phase 1 Epic A1: skill graph + BKT-lite mastery (Math Foundations pilot, sparks UI). |
| 2026-08-12 | Phase 1 Epic A2: session continue cards, resume snapshots, transcript search. |
| 2026-08-12 | Phase 1 Epic A3: math correctness verifier (tags + Fraction check, prefer checker). |
| 2026-08-12 | Phase 1 Epic A4: homework photo upload, vision analysis, guided remediation. |
| 2026-08-12 | Phase 1 Epic A6: fraction bar + number line manipulatives, tutor visual tags. |
| 2026-08-12 | Phase 1 Epic A5: parent digests (opt-in, weekly job, Dashboard family panel). |

---

*When product intent and execution disagree, update CAPABILITIES for vision and this PLAN for sequencing—then keep them cross-linked. Feasible day-in-the-life ideas live in `SUGGESTIONS.md` and land here only when promoted.*
