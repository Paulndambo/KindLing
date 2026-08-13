# Kindling — Capabilities & Roadmap

**Kindling** is an AI-powered adaptive tutoring platform: a warm, patient private tutor that teaches in real time, watches how a learner responds, and adapts pacing, scaffolding, and delivery. This document captures what Kindling can do **today** and the improvements that would make it a definitive go-to tutor.

---

## 1. Product vision (current)

Kindling aims to deliver **private-school-quality 1-on-1 teaching** to every learner by combining:

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
| One profile per user account | ✅ | Student-centric model (no multi-child parent hierarchy yet) |

### 2.2 Curriculum & subjects

| Capability | Status | Notes |
|------------|--------|--------|
| Custom subjects | ✅ | Student-owned subjects (Math, Science, coding, languages, etc.) |
| Topic paths per subject | ✅ | Topics form a lesson path; switch mid-session |
| Seed data | ✅ | Backend `seed_kindling` management command |
| Live lesson path UI | ✅ | Left sidebar with done / active / upcoming topics; collapsible on desktop |

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

### 2.9 Platform & engineering

| Area | Stack / notes |
|------|----------------|
| Frontend | React 19, Vite, Lucide, vanilla CSS design system |
| Backend | Django 5.1, DRF, SimpleJWT, CORS, SQLite by default |
| AI | Google Gemini chat + TTS |
| Data | Student profile, curriculum, learning events, sessions, topic mastery |
| Seed | Demo student + sample curriculum |

---

## 3. What “excellent go-to tutor” requires next

The following improvements would move Kindling from a strong adaptive prototype to a product families and schools trust as a default tutor.

### 3.1 Pedagogy & cognition (highest product leverage)

1. **True mastery model**  
   Bayesian knowledge tracing or similar per skill, not only heuristic scores. Map curriculum standards → skills → items.

2. **Curriculum graph**  
   Prerequisites, recommended next topics, spiral review, and “you’re ready for X” routing.

3. **Worked-example library** ✅  
   Curated, age-appropriate examples and counterexamples per pilot skill (DB + API; tutor prefers library over free generation).

4. **Retrieval practice & spaced review**  
   Auto-schedule short reviews from weak mastery and forgotten topics.

5. **Misconception engine** ✅  
   Stored catalog per domain + remediation playbooks; detect → tutor directives; remediation feeds skill mastery.

6. **Multi-step problem solving** ✅  
   Show-your-work mode with intermediate checks (A3 verifier), partial credit, and step-list UI (pilot: adding unlike fractions, one-step equations).

7. **Assessment modes**  
   Low-stakes quizzes, end-of-topic checks, and optional timed practice separate from open chat.

8. **Teacher/tutor playbooks**  
   Domain packs (early math, algebra, writing, coding) with proven scaffolds Kindling follows consistently.

### 3.2 Intervention & emotional support

1. **Richer struggle signals** ✅  
   Idle time, repeated short answers, topic thrashing, rapid guessing, off-topic drift.

2. **Graduated interventions** ✅  
   Micro-hint → worked example → full guide → suggest break / easier related skill.

3. **Affective check-ins** ✅  
   Gentle “how are you feeling about this?” flows; celebrate persistence, not only accuracy.

4. **Parent/teacher alerts (opt-in)**  
   “Stuck on fractions three sessions in a row” without shaming the student in chat.

### 3.3 Content, media & multimodal teaching

1. **Interactive visuals**  
   Manipulatives (fraction bars, number lines), canvas, drag-and-drop—not only text diagrams.

2. **Rendered diagrams (Mermaid / SVG / geometry)**  
   True flowchart and geometry rendering beyond ASCII source blocks.

3. **Image input**  
   Photo of homework / notebook handwriting → OCR + guided help.

4. **Whiteboard co-drawing**  
   Shared sketch space for the tutor and student.

5. **Video micro-lessons**  
   Optional short clips when explanation density is high.

6. **Accessible content**  
   Dyslexia-friendly fonts, high contrast, captions for TTS, keyboard-first lesson UI.

### 3.4 Voice & language

1. **Low-latency duplex voice**  
   Continuous conversation mode (less “type then wait”).

2. **Multi-language tutoring**  
   Full UI + tutor language pairs; bilingual support for EAL learners.

3. **Pronunciation coaching**  
   Languages and early reading.

4. **Age-tuned TTS personas**  
   Consistent voice identity per learner preference.

### 3.5 Progress, parents & institutions

1. **Real parent / guardian accounts**  
   Multi-child households, permissions, weekly email digests.

2. **Teacher / classroom mode**  
   Rosters, assignments, shared standards, privacy-safe aggregates.

3. **Standards alignment reports**  
   Exportable progress against curriculum frameworks (e.g. national / state standards).

4. **Goals & plans**  
   Exam prep timelines, homework help windows, weekly focus contracts.

5. **Portfolios**  
   Showcase correct reasoning, projects, and writing over time.

### 3.6 Trust, safety & quality

1. **Child-safe model policies**  
   Age gates, content filters, escalation for distress language.

2. **Answer correctness verification**  
   Especially for math/code: symbolic check or unit tests so the tutor doesn’t confidently err.

3. **Human-in-the-loop review**  
   Flagged sessions for parent/teacher review.

4. **Privacy by design**  
   Data minimization, retention controls, export/delete (GDPR-style), regional hosting options.

5. **Eval harness**  
   Automated tutoring quality scores (hint quality, socratic fidelity, intervention timing).

### 3.7 Product experience

1. **Offline / flaky-network resilience**  
   Clear states when AI or API is down; offline practice packs.

2. **Session history & resume**  
   “Continue where we left off” with full transcript search.

3. **Attachments & work upload**  
   Wire the existing “attach work” control to real uploads and feedback.

4. **Keyboard shortcuts & focus modes**  
   Distraction-free lesson, larger type, reduced chrome.

5. **Theming**  
   Light calm themes, high-contrast, optional reduced motion.

### 3.8 Platform & scale

1. **Production database**  
   Postgres, backups, migrations discipline in CI.

2. **Background jobs**  
   Weekly digests, mastery recompute, review scheduling.

3. **Observability**  
   Latency, TTS failures, intervention rates, drop-off funnels.

4. **Provider flexibility**  
   ✅ AI gateway with multi-provider adapters (Gemini, OpenAI, Anthropic, Groq, OpenRouter), BYOK key vault, routing modes (platform / byok / auto), hot-switch, and Settings UI. Remaining: multi-model failover chains + cost controls.

5. **Mobile apps**  
   Native or PWA with reliable voice and offline notes.

6. **Internationalization**  
   Full i18n of UI strings and RTL support.

---

## 4. Suggested priority horizons

### Horizon A — Next product slice (high impact, builds on existing code)

- Stronger mastery + skill graph for 1–2 pilot subjects (e.g. fractions, early algebra)  
- Image homework upload + guided remediation  
- Session history / resume  
- Parent digest from existing learning events  
- Math correctness checking on graded turns  
- Interactive visual models for top struggle topics  

### Horizon B — Differentiation

- Spaced review engine  
- Classroom / multi-child accounts  
- Full duplex voice lessons  
- Standards-aligned reports  
- Domain playbooks with eval scores  

### Horizon C — Category leadership

- Cross-subject lifelong learner model  
- School integrations (LMS, SSO)  
- Research-grade learning science instrumentation  
- Multi-region compliance and enterprise admin  

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

**Today**, Kindling is already a coherent adaptive tutor: live Gemini lessons, profile- and signal-aware teaching, intervention mode when students struggle, rich message rendering, voice I/O, custom curriculum, and a learning event/profile pipeline with a Django API and family-facing dashboard surfaces.

**To become the go-to tutor**, Kindling should deepen *learning science* (mastery, curriculum graphs, spaced review, misconception repair), *multimodal teaching* (visuals, homework photos, whiteboard), *trust* (correctness checks, safety, privacy), and *relationships* (parents, teachers, long-term plans)—while keeping the warm, patient voice that defines the product.

---

*Last updated: aligned with the Kindling monorepo (`frontend/` + `backend/`) including live sessions, intervention mode, learning intelligence, and rich tutor message rendering.*
