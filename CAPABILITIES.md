# Kindling — Capabilities & Roadmap

**Kindling** is an AI-powered adaptive tutoring platform: a warm, patient private tutor that teaches in real time, watches how a learner responds, and adapts pacing, scaffolding, and delivery. This document captures what Kindling can do **today** and the improvements that would make it a definitive go-to tutor.

---

## 1. Product vision (current)

Kindling aims to deliver **warm, adaptive 1-on-1 tutoring** to every learner by combining:

- Conversational tutoring (Socratic by default, guided when stuck)
- Continuous learning signals (correctness, affect, confidence, engagement)
- Curriculum and profile alignment (grade, country, curriculum, interests, learning style)
- Family-visible progress (dashboard, mastery signals, session history)
- Accessible interaction (voice in/out, rich visual presentation of explanations)

---

## 2. Capabilities as of now

### 2.1 Accounts, identity & onboarding

| Capability | Status | Notes |
|------------|--------|--------|
| Student registration & login | ✅ | JWT auth via Django backend |
| Demo student login | ✅ | Seeded demo credentials |
| Rich student profile | ✅ | Name, grade, country, school, curriculum, learning style, interests, academic target, avatar |
| Guided onboarding modal | ✅ | Captures profile before live teaching |
| One profile per user account | ✅ | **Permanent model:** one account = one learner = one seat (no multi-child hierarchy) |

### 2.2 Curriculum & subjects

| Capability | Status | Notes |
|------------|--------|--------|
| Custom subjects | ✅ | Student-owned subjects (Math, Science, coding, languages, etc.) |
| Topic paths per subject | ✅ | Topics form a lesson path; switch mid-session |
| Topic familiarity + learning goals | ✅ | Captured on subject/topic create; drives first-session pacing |
| Week focus line (lite) | ✅ | C5: student-editable “this week I’m working on…” on profile / Dashboard |
| Seed data | ✅ | Backend `seed_kindling` management command |
| Live lesson path UI | ✅ | Left sidebar with done / active / upcoming topics; collapsible on desktop |
| Goals surface in lesson | ✅ | C5 lite: goal + familiarity chips on path, tools “Your focus”, chat header; tutor prompt injection |

### 2.3 Live tutoring session

| Capability | Status | Notes |
|------------|--------|--------|
| Streaming AI chat | ✅ | Google Gemini (`@google/genai`), token-streamed replies |
| Socratic tutoring default | ✅ | Guides discovery; avoids giving answers away in normal mode |
| Profile-aware system prompts | ✅ | Grade, curriculum, country spelling/standards, interests, learning style |
| Longitudinal personalization | ✅ | Live learner model directives injected into the tutor prompt |
| Hints on demand | ✅ | Visible “Get a hint” control in the tools panel |
| Lesson restart | ✅ | Restart topic / chat session |
| Live difficulty indicator | ✅ | Progress bar + labels from mastery + session accuracy |
| Collapsible lesson path | ✅ | More room for chat when path is hidden |
| Wider tools sidebar | ✅ | Room for learner pulse and controls without heavy wrapping |
| Mobile panel tabs | ✅ | Path / Chat / Tools on small screens |

### 2.4 Intervention mode (step-by-step guide)

When Kindling detects struggle, it can step in with structured help.

| Capability | Status | Notes |
|------------|--------|--------|
| Struggle detection | ✅ | Incorrect streaks, hint streaks, frustration + B1 signals (idle, short answers, thrashing, rapid guessing, off-topic) |
| Soft idle nudge | ✅ | After ~45s wait: gentle “Still thinking?” card before full offer |
| Graduated help ladder | ✅ | B2: micro-hint → worked example → full guide → break/easier skill |
| Offer to enter help | ✅ | In-chat card with level-aware CTA; optional level picker |
| Auto-enter help | ✅ | Stronger struggle picks a heavier ladder level |
| Manual start help | ✅ | Tools panel Help ladder (4 rungs) anytime |
| Worked-example pack (pilot) | ✅ | Local pilot examples preferred when topic/skill matches |
| Step-by-step teaching | ✅ | Level 3 full guide: explanations, examples, demos |
| Escalate help | ✅ | “More help” while active; auto-offer escalate after more misses |
| Exit help anytime | ✅ | Exit control in chat bar and tools panel (every level) |
| Learning events | ✅ | `intervention.*` (+ `level` / `levelId`) + `struggle.signal` + `affect.checkin` / `affect.persistence` |
| Scaffolding bias | ✅ | Session + profile bias rises on short/rapid answers; feeds tutor directives |
| Affective check-ins | ✅ | B3: gentle feeling card after frustration streaks / long sessions |
| Session-start energy check-in | ✅ | B7: optional ready/okay/low/break chip on lesson open; low → softer pace + L4 offer |
| End-of-session reflection | ✅ | B8: Wrap up → what clicked / what’s next / optional note; `session.reflect`; next-open directives; Review spark CTA when due |
| Spaced review (Review spark) | ✅ | C1: weak/rusty pilot skills scheduled; Dashboard + My Subjects; short review lesson mode; SM-2-lite reschedule |
| Light spark challenge | ✅ | G1: optional 3 solid graded turns on a weak pilot skill; Dashboard card; progress banner; persistence/skill-spark celebration only (no badges) |
| Persistence celebration | ✅ | Effort chips, tutor directives, parent digest “Effort & heart” |
| Worked-example library | ✅ | B4: DB catalog linked to skills; grade bands; API; tools “Show library example” |
| Misconception engine | ✅ | B5: catalog + playbooks; detect/remediate events; mastery boost on success |
| Multi-step show-your-work | ✅ | B6: step panel, intermediate checks, partial credit; pilot skills |

### 2.5 Learning intelligence (signals & profile)

Kindling maintains a **live pulse** on the learner without breaking tutor character.

| Capability | Status | Notes |
|------------|--------|--------|
| Exchange analysis | ✅ | Correctness (correct / partial / incorrect / exploring), affect, confidence, engagement |
| Linguistic heuristics | ✅ | Infer correctness from tutor language; affect from student language |
| Response timing | ✅ | Think-time between prompt and answer |
| Misconception cues | ✅ | Small built-in set (e.g. fractions-related) |
| Delivery preferences | ✅ | Visual / story / step-by-step signals |
| Session tracker | ✅ | Turns, counters, tools, intervention state |
| Local learning profile | ✅ | Mastery, strengths, focus areas, rolling histories |
| Personalization directives | ✅ | Fed back into the next tutor behavior |
| Event pipeline | ✅ | Queue + POST to learning API (or local mock) |
| Server-side profile recompute | ✅ | Django learning app mirrors frontend profile logic |

### 2.6 Presentation quality (tutor → learner)

Presentation is treated as part of the product, not a polish step.

| Capability | Status | Notes |
|------------|--------|--------|
| Rich Markdown rendering | ✅ | Paragraphs, lists, emphasis, links, blockquotes |
| Code blocks | ✅ | Language label + copy button |
| Math (LaTeX) | ✅ | KaTeX via `$...$` / `$$...$$` |
| Tables | ✅ | GFM tables, scrollable |
| ASCII / text diagrams | ✅ | Monospace diagram cards |
| Streaming-safe UI | ✅ | Content updates while tokens stream |
| Safe by default | ✅ | No raw HTML from the model |

### 2.7 Voice & multimodal I/O

| Capability | Status | Notes |
|------------|--------|--------|
| Voice output (TTS) | ✅ | Gemini TTS; chunked playback; “Read aloud” per message |
| Voice input (STT) | ✅ | Browser speech recognition into the chat input |
| Markdown stripped for speech | ✅ | Cleaner spoken output |
| Toggle voice output | ✅ | Tools panel |

### 2.8 Family / progress surfaces

| Capability | Status | Notes |
|------------|--------|--------|
| Overview / marketing home | ✅ | Product story, subjects, quotes |
| My Subjects | ✅ | Manage subjects & topics; start lessons |
| Family-style dashboard | ✅ | Mastery path, confidence chart, progress-oriented views |
| Learning dashboard API | ✅ | Backend aggregates sessions and profile for the SPA |
| Optional progress digests | ✅ | A5: student configures recipient email (parent/teacher/self); no parent login required |
| Session resume + transcript search | ✅ | A2: continue strip, journal, keyword search |

### 2.9 Platform & engineering

| Area | Stack / notes |
|------|----------------|
| Frontend | React 19, Vite, Lucide, vanilla CSS design system |
| Backend | Django 5.1, DRF, SimpleJWT, CORS, SQLite by default (Postgres = Wave 2 deploy) |
| AI | Multi-provider gateway + BYOK; platform default Gemini chat + TTS |
| Data | Student profile, curriculum graph, learning events/sessions, mastery, digests, homework |
| Ops floor | Health probes, telemetry, safety events, jobs skeleton (`run_scheduled_jobs`) |
| Seed | Demo student + Math Foundations pilot pack |

---

## 3. What “excellent go-to tutor” requires next

Items marked ✅ are **shipped in Wave 1** (see [`PLAN.md`](./PLAN.md) Phases 0.2–2.5). Unchecked items are the **Wave 2 backlog** (PLAN §15 + Phases 3–5).

### 3.1 Pedagogy & cognition (highest product leverage)

1. **True mastery model** ✅ (pilot)  
   BKT-lite per pilot skill + standard codes; expand coverage in Wave 2 as domains grow.

2. **Curriculum graph** ✅ (pilot)  
   Prerequisites, recommended next skill, lock/ready routing on Math Foundations; multi-domain expand = Wave 2.

3. **Worked-example library** ✅  
   Curated, age-appropriate examples and counterexamples per pilot skill (DB + API; tutor prefers library over free generation).

4. **Retrieval practice & spaced review** ✅ (v1)  
   Auto-schedule short Review sparks from weak/rusty pilot skills (7-day struggle window); job + on-read; SM-2-lite reschedule. **Wave 2:** multi-subject depth, schedule UX (**C1+**).

5. **Misconception engine** ✅  
   Stored catalog per domain + remediation playbooks; detect → tutor directives; remediation feeds skill mastery.

6. **Multi-step problem solving** ✅  
   Show-your-work mode with intermediate checks (A3 verifier), partial credit, and step-list UI (pilot: adding unlike fractions, one-step equations).

7. **Assessment modes** ⬜ Wave 2 · **C6**  
   Low-stakes quizzes, end-of-topic checks, and optional timed practice separate from open chat.

8. **Teacher/tutor playbooks** ⬜ Wave 2 · **C7**  
   Domain packs (early math, algebra, writing, coding) with proven scaffolds Kindling follows consistently; second thin pack if sessions leave math.

### 3.2 Intervention & emotional support

1. **Richer struggle signals** ✅  
   Idle time, repeated short answers, topic thrashing, rapid guessing, off-topic drift.

2. **Graduated interventions** ✅  
   Micro-hint → worked example → full guide → suggest break / easier related skill.

3. **Affective check-ins** ✅  
   Mid-session feelings (B3) + session-start energy (B7) + end reflection (B8); celebrate persistence, not only accuracy.

4. **Optional email alerts (opt-in)** ⬜ Wave 2 · **C10**  
   “Stuck on fractions three sessions” can email the **same** student-configured digest address—without shaming the student in chat (A5 digests already ship). No parent app.

### 3.3 Content, media & multimodal teaching

1. **Interactive visuals** ✅ (pilot)  
   Fraction bars + number line manipulatives; expand set in later packs.

2. **Rendered diagrams (Mermaid / SVG / geometry)** ⬜ Wave 2 · Phase 4  
   True flowchart and geometry rendering beyond ASCII source blocks.

3. **Image input** ✅  
   Photo of homework / notebook → multimodal analysis + guided help.

4. **Whiteboard co-drawing** ⬜ Wave 2 · Phase 4  
   Shared sketch space for the tutor and student.

5. **Video micro-lessons** ⬜ Wave 2 · Phase 4  
   Optional short clips when explanation density is high.

6. **Accessible content** ⬜ Wave 2 · Phase 4 (partial: reduced-motion CSS)  
   Dyslexia-friendly fonts, high contrast, captions for TTS, keyboard-first lesson UI.

### 3.4 Voice & language

1. **Low-latency duplex voice** ⬜ Wave 2 · Phase 4–5  
   Continuous conversation mode (less “type then wait”). *Today:* turn-based TTS + browser STT.

2. **Multi-language tutoring** ⬜ Wave 2 · Phase 5  
   Full UI + tutor language pairs; bilingual support for EAL learners.

3. **Pronunciation coaching** ⬜ Wave 2 · Phase 5  
   Languages and early reading.

4. **Age-tuned TTS personas** ⬜ Wave 2 · Phase 4–5  
   Consistent voice identity per learner preference.

### 3.5 Progress, parents & institutions

1. **Real parent / guardian accounts** ❌ **Out of product**  
   Kindling does **not** build multi-child households or parent multi-profile logins. A parent of several children buys **one seat per child**. Progress sharing = **student-configured digest email** (A5).

2. **Teacher / classroom mode** ❌ **Out of product**  
   No rosters, class assignments, or class dashboards. Schools and learning institutions purchase **individual student seats** (same as any multi-learner buyer).

3. **Standards alignment reports** ⬜ Wave 2 · **C4**  
   Exportable progress for **this student** against curriculum frameworks (pilot skills already carry optional codes). Forwardable by email—not a class report product.

4. **Goals & plans** ✅ lite / ⬜ full  
   Lite: topic `learning_goal`, familiarity, week focus, lesson chips (**C5 lite**). Full exam timelines = Wave 2 · **C5+** (student-owned; no guardian contract product).

5. **Portfolios** ⬜ Phase 5 stretch  
   Showcase correct reasoning, projects, and writing for the single learner. Light spark challenge (G1) is **not** a portfolio/badge system.

### 3.6 Trust, safety & quality

1. **Child-safe model policies** ✅  
   Age-aware prompt policies, distress escalation, safety events.

2. **Answer correctness verification** ✅ (math pilot)  
   Symbolic/rational checks on graded turns (A3); expand domains later.

3. **Human-in-the-loop review** ⬜ Wave 2 · **C9**  
   Ops/support flags for distress or repeated fail—not a parent portal.

4. **Privacy by design** ✅ baseline / ⬜ deepen  
   Export/delete + safety doc today; retention UX + regional hosting = Phase 5.

5. **Eval harness** ⬜ Wave 2 · **C8**  
   Automated tutoring quality scores (hint quality, socratic fidelity, intervention timing).

### 3.7 Product experience

1. **Offline / flaky-network resilience** ✅ baseline / ⬜ packs  
   Clear AI/API down states + durable queue; offline practice packs = Phase 4.

2. **Session history & resume** ✅  
   Continue where we left off + transcript search.

3. **Attachments & work upload** ✅ homework photos / ⬜ generalize  
   Image homework path ships; PDF/docs generalization = Phase 4.

4. **Keyboard shortcuts & focus modes** ⬜ Wave 2 · Phase 4  
   Distraction-free lesson, larger type, reduced chrome.

5. **Theming** ⬜ Wave 2 · Phase 4  
   Light calm themes, high-contrast toggle (reduced-motion respect partial).

### 3.8 Platform & scale

1. **Production database** ⬜ Wave 2 deploy  
   Postgres, backups, migrations discipline in CI (SQLite remains default dev).

2. **Background jobs** ✅ skeleton  
   Runner + digest/review/mastery hooks; production cron wiring = beta deploy track.

3. **Observability** ✅  
   Latency, client errors, product funnel metrics, health endpoints.

4. **Provider flexibility** ✅ adapters / ⬜ failover  
   Multi-provider + BYOK + Settings. Remaining: multi-model failover chains + cost controls.

5. **Mobile apps** ⬜ Wave 2 · Phase 5  
   PWA first (install, voice, offline notes); native later if needed.

6. **Internationalization** ⬜ Wave 2 · Phase 5  
   Full i18n of UI strings and RTL support.

---

## 4. Suggested priority horizons

Execution order lives in [`PLAN.md`](./PLAN.md). Mapping:

| Horizon | Intent | Wave | Status |
|---------|--------|------|--------|
| **A** | High impact on existing code | **Wave 1** | ✅ Shipped (A1–A6 + platform floor minus Postgres host) |
| **B** | Differentiation | **Wave 2** | ⬜ Phase 3 (C1+ … C10) + session-rhythm already pulled into Wave 1 |
| **C** | Category leadership | **Wave 2 scale** | ⬜ Phase 5 (+ deferred VR/collab/credentials) |

### Horizon A — Shipped product slice (Wave 1)

- Stronger mastery + skill graph for pilot subjects (fractions, early algebra)  
- Image homework upload + guided remediation  
- Session history / resume  
- Parent digest from existing learning events (student-linked)  
- Math correctness checking on graded turns  
- Interactive visual models for top struggle topics  
- Intervention depth (B1–B6) + session rhythm (B7, B8, C1 v1, C5 lite, G1)

### Horizon B — Differentiation (Wave 2 product)

- Spaced review **depth** (beyond v1)  
- Assessment modes + second domain playbook + eval harness  
- Single-learner standards export; full student-owned goals/plans  
- Digest polish + optional stuck emails on the same channel  
- Ops review flags; diagram rendering + accessibility pack (Phase 4 P0)  
- **Not in scope:** multi-child households, classroom/roster products  

### Horizon C — Category leadership (Wave 2 scale / later)

- Cross-subject lifelong learner model  
- Optional school SSO / bulk **per-seat** purchase (still one login = one learner)  
- Research-grade learning science instrumentation  
- Multi-region compliance and enterprise admin  
- Duplex voice, full i18n, PWA  
- Explicitly out: VR/collab/credential badge portfolios; family multi-seat SKUs; class management UIs  

---

## 5. Design principles to preserve

Whatever is built next, these should stay non-negotiable:

1. **Respect the learner** — normalize struggle; never shame.  
2. **Guide before giving** — Socratic by default; intervention is explicit and exit-able.  
3. **Presentation is pedagogy** — clear structure, readable math/code/diagrams.  
4. **Adapt quietly** — use scores and tracking internally; speak as a caring tutor.  
5. **Parents and students see progress differently** — student: encouragement; family: clarity.  
6. **Safety and privacy scale with trust** — especially for children.

---

## 6. Summary

**Today (Wave 1)**, Kindling is a coherent adaptive tutor: live multi-provider lessons, profile- and signal-aware teaching, graduated intervention, session start/end rituals, Review spark + light challenge, skill mastery on a pilot graph, homework photos, manipulatives, rich rendering, voice I/O, resume/search, optional guardian digests, and a Django learning API with telemetry and a safety floor.

**Wave 2** (see [`PLAN.md`](./PLAN.md) §15) should make Kindling **hostable and billable**, then deepen *assessment and review*, *single-learner shareable progress* (digest email, export), *multimodal polish* (diagrams, a11y), and *scale* (PWA, failover, i18n)—while keeping **one student per subscription** and the warm, patient teaching voice.

---

*Last updated: 2026-09-01 — single-seat commercial lock; Wave 1 vs Wave 2 aligned with monorepo + `PLAN.md` §15–16.*
