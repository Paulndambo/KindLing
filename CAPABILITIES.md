# Kindling — Capabilities & Roadmap

**Kindling** is an AI-powered adaptive tutoring platform: a warm, patient private tutor that teaches in real time, watches how a learner responds, and adapts pacing, scaffolding, and delivery. This document captures what Kindling can do **today** and the improvements that would make it a definitive go-to tutor.

---

## 1. Product vision (current)

Kindling aims to deliver **warm, adaptive 1-on-1 tutoring** to every learner by combining:

- Conversational tutoring (Socratic by default; graduated help when stuck; **hands-on how-to** for practical skills)
- Continuous learning signals (correctness, affect, confidence, engagement, assistance dependency)
- A formal pedagogical decision loop (LearnerState → policy action → LLM executes that move)
- Curriculum and profile alignment (grade, country, curriculum, interests, learning style)
- Family-visible progress (dashboard, mastery signals, session history, optional digests)
- Accessible interaction (voice in/out, suggestion chips, rich visual presentation of explanations)

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
| Pilot subject (Computer Science) | ✅ | Sole seeded pilot: unit → subtopic path from digital literacy through systems (see `Computer Science.MD` / `pilot_graph.py`) |
| Subject → topic → subtopic hierarchy | ✅ | Units (topics) contain lessons (subtopics); path UI + provision via `cs_provision` |
| Custom subjects | ✅ | Student-owned subjects remain supported by the API/UI |
| Topic paths per subject | ✅ | Lessons form a path; switch mid-session |
| Topic familiarity + learning goals | ✅ | Captured on subject/topic create; drives first-session pacing |
| Week focus line (lite) | ✅ | C5: student-editable “this week I’m working on…” on profile / Dashboard |
| Seed data | ✅ | Backend `seed_kindling` + CS graph ensure for demo student |
| Live lesson path UI | ✅ | Left sidebar with done / active / upcoming lessons; collapsible on desktop |
| Goals surface in lesson | ✅ | C5 lite: goal + familiarity chips on path, tools “Your focus”, chat header; tutor prompt injection |
| Skill graph on pilot | ✅ | CS literacy + foundations skills linked to lessons; BKT-lite mastery + sparks |

### 2.3 Live tutoring session

| Capability | Status | Notes |
|------------|--------|--------|
| Streaming AI chat | ✅ | Multi-provider gateway; platform default Gemini (`@google/genai`), token-streamed replies |
| Socratic tutoring default | ✅ | Guides discovery on reasoning practice; does **not** withhold how-to steps for practical skills |
| Practical how-to teaching | ✅ | Hands-on skill topics (e.g. Files & folders): numbered device steps, try-it checklists, curated guides (`practicalGuides.js`) |
| Profile-aware system prompts | ✅ | Grade, curriculum, country spelling/standards, interests, learning style |
| Longitudinal personalization | ✅ | Live learner model + L1 state + L2 pedagogy decision injected into the tutor prompt |
| Real-world example rule | ✅ | Teaching turns expected to ground ideas in everyday life |
| Suggestion chips | ✅ | 3–5 one-tap follow-ups (`⟦suggests: …⟧`); practical topics include “Show me how step by step” |
| Hints on demand | ✅ | Visible “Get a hint” control in the tools panel |
| Lesson restart | ✅ | Restart topic / chat session |
| Live difficulty indicator | ✅ | Progress bar + labels from mastery + session accuracy |
| Collapsible lesson path | ✅ | More room for chat when path is hidden |
| Wider tools sidebar | ✅ | Room for learner pulse, assessment, independence, and controls |
| Mobile panel tabs | ✅ | Path / Chat / Tools on small screens |
| Low-stakes quick check (C6) | ✅ | Offline-first MCQ assessment panel; tutor explanation after each item |
| Independence twin (L4) | ✅ | Post-ladder no-scaffold / transfer check offer |

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
| Misconception cues | ✅ | Catalog + pilot playbooks (B5); CS + math coverage growing |
| Delivery preferences | ✅ | Visual / story / step-by-step signals |
| Session tracker | ✅ | Turns, counters, tools, intervention state |
| Local learning profile | ✅ | Mastery, strengths, focus areas, rolling histories |
| Personalization directives | ✅ | Fed back into the next tutor behavior |
| **LearnerState (L1)** | ✅ | Structured snapshot: knowledge, misconceptions, behaviour, engagement, confidence, assistance, objective, interaction |
| **Pedagogical policy (L2)** | ✅ | `decidePedagogy` → closed action catalog; LLM executes only that move; `pedagogy.decision` events |
| **Assistance Dependency Index (L3)** | ✅ | ADI from help + graded turns; ladder prefers lighter help as independence rises |
| **Independence / transfer (L4)** | ✅ | No-scaffold twin after heavy help; transfer bank items |
| Next-best-action ranking | ✅ | Thin dashboard “Suggested next step” from policy + due review |
| Event pipeline | ✅ | Queue + POST to learning API (or local mock) |
| Server-side profile recompute | ✅ | Django learning app mirrors frontend profile logic |
| Eval harness (C8) | ✅ | Manual rubric + offline auto scorer + weekly sample job (`docs/EVAL_RUBRIC_C8.md`) |

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
| Seed | Demo student + **Computer Science** pilot graph (units → subtopics + skills) |

---

## 3. What “excellent go-to tutor” requires next

Items marked ✅ are **shipped** (Wave 1 + early Wave 2 intelligence slice — see [`PLAN.md`](./PLAN.md)). Unchecked items remain the **active Wave 2 backlog** (PLAN §15 + Phases 3–5).

### 3.1 Pedagogy & cognition (highest product leverage)

1. **True mastery model** ✅ (pilot)  
   BKT-lite per pilot skill + standard codes; expand coverage in Wave 2 as domains grow.

2. **Curriculum graph** ✅ (pilot)  
   Prerequisites, recommended next skill, lock/ready routing on the **Computer Science** pilot (literacy → foundations → programming path). Math Foundations skill/example packs remain in-repo for fraction pedagogy. Multi-domain expand = Wave 2.

3. **Worked-example library** ✅  
   Curated, age-appropriate examples and counterexamples per pilot skill (DB + API; tutor prefers library over free generation).

4. **Retrieval practice & spaced review** ✅ (v1)  
   Auto-schedule short Review sparks from weak/rusty pilot skills (7-day struggle window); job + on-read; SM-2-lite reschedule. **Wave 2:** multi-subject depth, schedule UX (**C1+**).

5. **Misconception engine** ✅  
   Stored catalog per domain + remediation playbooks; detect → tutor directives; remediation feeds skill mastery.

6. **Multi-step problem solving** ✅  
   Show-your-work mode with intermediate checks (A3 verifier), partial credit, and step-list UI (pilot packs).

7. **Assessment modes** ✅ (v1) · **C6**  
   Low-stakes offline-first MCQ quick checks (one question at a time) with tutor explanation after every answer; end-of-topic / readiness offer; results feed mastery. Math Foundations has three items per core skill with an optional alternate-form before/after pilot; each of eight science scaffold areas has five explained items, including an applied transfer item, and topics with two items in each form can use the same optional check. Both report percentage-point change as an informal signal. **Remaining:** wider subject coverage and cohort calibration.

8. **Practical how-to teaching** ✅  
   Hands-on skill topics get numbered device procedures + try-it checklists (not theory-only). Curated CS literacy guides include files/folders, browser search, password habits, and downloading a trusted file across devices; Socratic carve-out so procedures are not withheld. **Wave 2:** add deeper guides and domain coverage (**C7**).

9. **Teacher/tutor playbooks** ⚡ Partial · **C7**
   Data-backed early-math/algebra and science scaffold packs guide lesson prompts; C8 samples surface non-scoring math and science consistency cues for human review. Further domain expansion follows session mix.

10. **Learning intelligence loop (L1–L4)** ✅  
    LearnerState → pedagogical policy → ADI → independence twins. **Remaining:** L5 trajectory export, decision-compliance scoring depth, lifelong cross-subject model.

### 3.2 Intervention & emotional support

1. **Richer struggle signals** ✅  
   Idle time, repeated short answers, topic thrashing, rapid guessing, off-topic drift.

2. **Graduated interventions** ✅  
   Micro-hint → worked example → full guide → suggest break / easier related skill.

3. **Affective check-ins** ✅  
   Mid-session feelings (B3) + session-start energy (B7) + end reflection (B8); celebrate persistence, not only accuracy.

4. **Optional email alerts (opt-in)** ✅ Wave 2 · **C10**
   A daily rule sends a gentle support note to the same student-configured A5 digest address after repeated-fail flags span three sessions in 14 days. It uses the digest opt-in and observes a seven-day cooldown. No parent app.

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

3. **Standards alignment reports** ⚡ Partial · Wave 2 · **C4**
   Authenticated CSV and email-ready text summary of this student's progress against the internal CS pilot references are available. These are not externally reviewed standards; external alignment remains open. This is not a class report product.

4. **Goals & plans** ✅ lite / ⬜ full  
   Lite: topic `learning_goal`, familiarity, week focus, lesson chips (**C5 lite**). Optional student-owned target date + countdown (**C5+.1**) and focused homework windows (**C5+.2**) ship; full planning remains Wave 2 · **C5+** (no guardian contract product).

5. **Portfolios** ⬜ Phase 5 stretch  
   Showcase correct reasoning, projects, and writing for the single learner. Light spark challenge (G1) is **not** a portfolio/badge system.

### 3.6 Trust, safety & quality

1. **Child-safe model policies** ✅  
   Age-aware prompt policies, distress escalation, safety events.

2. **Answer correctness verification** ✅ (math pilot)  
   Symbolic/rational checks on graded turns (A3); expand domains later.

3. **Human-in-the-loop review** ✅ Wave 2 · **C9**
   Staff can review scrubbed support flags for high-severity safety distress and repeated learning difficulty in the internal admin queue. This is not a parent portal.

4. **Privacy by design** ✅ baseline / ⬜ deepen  
   Export/delete + safety doc today; retention UX + regional hosting = Phase 5.

5. **Eval harness** ✅ v1 Wave 2 · **C8**  
   Manual rubric · offline auto scorer · weekly job — `docs/EVAL_RUBRIC_C8.md`.

6. **Independence / transfer twins** ✅ · **L4**  
   No-scaffold check after heavy ladder help; `transfer` bank items; `independence.*` events.

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
| **B** | Differentiation | **Wave 1.5–2** | ⚡ Partial — L1–L4, C6 v1, C8, practical how-to, CS pilot, first C7 math/algebra + science packs, and rolling C1+ recall measurement shipped; sustained C1+ lift, further C7 coverage, C4/deploy remain |
| **C** | Category leadership | **Wave 2 scale** | ⬜ Phase 5 (+ deferred VR/collab/credentials) |

### Horizon A — Shipped product slice (Wave 1)

- Stronger mastery + skill graph (pilot skills; CS path is the live seeded subject)  
- Image homework upload + guided remediation  
- Session history / resume  
- Parent digest from existing learning events (student-linked)  
- Math correctness checking on graded turns  
- Interactive visual models for top struggle topics  
- Intervention depth (B1–B6) + session rhythm (B7, B8, C1 v1, C5 lite, G1)

### Horizon B — Differentiation (in progress)

**Shipped early Wave 2 intelligence / pedagogy**

- LearnerState (L1), pedagogical policy (L2), ADI (L3), independence twins (L4)  
- Assessment quick checks (C6 v1) + eval harness (C8.1–C8.3)  
- Computer Science pilot curriculum (units → subtopics)  
- Practical how-to teaching + suggestion chips + real-world example rule  

**Still open**

- Spaced review **depth** (beyond v1) · **C1+**  
- Additional domain playbook breadth · **C7**
- External standards alignment · **C4**; full goals planner · **C5+**
- Digest polish · **A5**
- Diagram rendering + accessibility pack (Phase 4 P0)
- Hostable deploy / Postgres · Track D  
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
2. **Guide before giving** — Socratic by default on reasoning; intervention is explicit and exit-able.  
3. **Show how for practical skills** — procedures get numbered, replicable how-tos + try-it checks (theory alone is a failure mode).  
4. **Presentation is pedagogy** — clear structure, readable math/code/diagrams.  
5. **Adapt quietly** — use scores and tracking internally; speak as a caring tutor.  
6. **Parents and students see progress differently** — student: encouragement; family: clarity.  
7. **Safety and privacy scale with trust** — especially for children.

---

## 6. Summary

**Today**, Kindling is a coherent adaptive tutor with a closed learning loop: live multi-provider lessons, L1 learner state + L2 pedagogical decisions, graduated intervention + ADI (L3), independence twins (L4), practical how-to teaching for skill topics, suggestion chips, Review spark + light challenge + C6 quick checks, skill mastery on the **Computer Science** pilot graph, homework photos, manipulatives, rich rendering, voice I/O, resume/search, optional guardian digests, C8 eval tooling, and a Django learning API with telemetry and a safety floor.

**Still ahead (Wave 2)** (see [`PLAN.md`](./PLAN.md) §15): make Kindling **hostable and billable** (Track D), then deepen *review/assessment coverage*, *domain playbooks*, *single-learner shareable progress* (digest polish, standards export), *multimodal polish* (diagrams, a11y), and *scale* (PWA, failover, i18n)—while keeping **one student per subscription** and the warm, patient teaching voice.

---

*Last updated: 2026-10-04 — P.6 download how-to guide, R.1 student-owned digest recipient and unsent preview UX, C6.10 science transfer checks, C7.4 science playbook sample cues, C6.9 science alternate-form learning-gain pilot, C8.4 human-label calibration diagnostics, C6.8 science assessment depth, C6.7 math alternate-form pilot, C9 scrubbed support-flag review queue, and C10 opt-in support email reflected alongside CS pilot, L1–L4, C6/C8, practical how-to, and suggestion chips; Wave 2 Track D still the external-beta gate for live email. Expert review gaps: [`REVIEW_GAP_ANALYSIS.md`](./REVIEW_GAP_ANALYSIS.md).*
