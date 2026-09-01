# Day-in-the-life vision vs Kindling today

Aspirational “day in the life” sketch of a personalized AI tutor, mapped against what Kindling has actually shipped (Phases 0–2 / Horizon A + intervention depth). Status is relative to **product intent**, not a promise to build VR labs or employer-recognized badges.

**Legend**

| Tag | Meaning |
|-----|---------|
| **Shipped** | Live in monorepo; usable in a lesson / dashboard |
| **Partial** | Real foundation or thin slice; vision goes further |
| **Not started** | No meaningful product surface yet |
| **Out of beta scope** | Explicitly deferred (see `BETA_LAUNCH.md` / PLAN Phase 3+) |

**Overall:** Kindling already delivers the *spine* of this story—an adaptive 1:1 tutor that checks how the learner feels, adjusts help and content from signals, and reflects progress—especially on **Math Foundations**. The sci-fi edges (VR cities, global peer quests, university skill portfolios, wearables) are still future / category-leadership territory. Closest gap for the “continuous adventure” feel is **spaced review + daily rhythm**, not more lesson chrome.

---

## Original vision

### 🌅 Student Check‑In

The tutor greets the student with a quick mood and energy scan—maybe through voice tone or wearable data or just by a quick text. If the student feels sluggish, it suggests a short mindfulness exercise before diving into lessons.

### 📚 Adaptive Lessons

Instead of a rigid timetable, the tutor dynamically adjusts. If the student mastered yesterday’s algebra, today it introduces geometry through an interactive VR puzzle. If history was tough, it revisits the topic with immersive storytelling—walking the student through a virtual ancient city.

### 🎮 Gamified Challenges

Midday, the tutor sets a “quest”: solve three science problems to unlock a simulation where the student can experiment with chemical reactions safely in a digital lab. Success earns badges that are logged into a global skills portfolio recognized by universities and employers.

### 🌍 Global Collaboration

In the afternoon, the tutor connects the student with peers worldwide. Together, they tackle a project—say, designing a sustainable railway system—guided by AI that balances contributions so everyone learns and participates equally.

### 🌙 Reflection & Growth

At the end of the day, the tutor reviews progress, highlights strengths, and gently nudges areas for improvement. It might even suggest a book, a Coursera module, or a creative side project aligned with the student’s passions.

The result? Learning feels less like “school” and more like a personalized adventure—continuous, engaging, and deeply connected to the student’s future goals.

---

## Implementation status (as of repo Phases 0–2)

### 1. Student Check‑In — **Partial (~55%)**

| Vision beat | Status | What we have |
|-------------|--------|--------------|
| Mood / energy scan (text) | **Partial → Shipped (in-session)** | Epic **B3**: in-chat “How are you feeling?” after frustration streaks or long sessions; warm options; `affect.checkin` events |
| Greeting / day-start ritual | **Not started** | No dedicated morning check-in or pre-lesson energy gate; lesson opens into tutoring, not a daily briefing |
| Voice-tone affect | **Not started** | TTS + STT exist; no prosody / tone analysis |
| Wearables | **Not started** / **Out of beta scope** | — |
| Mindfulness / break when sluggish | **Partial** | Help ladder **L4** suggests break / easier skill; persistence celebration; no guided mindfulness content pack |

**Read:** Emotional awareness is **reactive inside a lesson**, not a structured day-open. Closest path to the vision without wearables: optional session-start check-in + break activities when affect is low.

**Natural next steps:** session-start mood chip; wire low-energy → shorter/easier path or break card; keep wearables/voice-tone deferred.

---

### 2. Adaptive Lessons — **Partial / strong core (~65%)**

| Vision beat | Status | What we have |
|-------------|--------|--------------|
| Not a rigid timetable | **Shipped** | Student-owned subjects/topics; pick up anytime; no bell schedule |
| Adapt from mastery | **Shipped (pilot depth)** | Skill graph + BKT-lite mastery; prerequisites; next-skill recommend; personalization directives into tutor prompt |
| Adapt when stuck | **Shipped** | Struggle signals (idle, short answers, thrashing, guessing, off-topic); graduated ladder (micro-hint → example → full guide → break/easier) |
| Revisit hard material | **Partial** | Resume + misconception remediation + easier-skill off-ramp; **spaced review scheduler still open** (PLAN **C1**, beta **P1.2**) |
| Interactive “puzzle” media | **Partial** | Fraction bars / number line manipulatives; multi-step show-your-work; homework photo → guided help; rich math/markdown |
| VR / virtual ancient city | **Not started** | Storytelling can lean on interests in the system prompt; no immersive/VR environments |
| Cross-subject day orchestration | **Not started** | No “today’s plan” that sequences math → history → science; multi-subject is manual via My Subjects |
| Domain breadth | **Partial** | Custom subjects open; **pedagogy packs** deep mainly on Math Foundations (examples, misconceptions, multistep, visuals) |

**Read:** This is Kindling’s center of gravity. Adaptation is real (mastery, interventions, profile, correctness checks). What’s missing vs the paragraph is **orchestrated multi-topic days**, **automatic revisit scheduling**, and **immersive media**—not the adaptive tutor loop itself.

**Natural next steps:** **C1 spaced review v1** (highest leverage for “yesterday hard → today revisit”); light daily focus from familiarity/goals; second thin domain pack only if sessions leave math.

---

### 3. Gamified Challenges — **Partial / light (~25%)**

| Vision beat | Status | What we have |
|-------------|--------|--------------|
| Quest framing | **Not started** | No quests, streaks-as-quests, or “solve 3 to unlock…” loops |
| Simulations / digital lab | **Not started** | No chem lab or unlockable sims; pilot interactives are fraction models + multistep panels |
| Badges | **Not started** as badges | **Skill sparks** tiers (Growing roots → Ready to spark → Catching fire → Glowing) are mastery language, not collectible badge system |
| Global skills portfolio (uni/employer) | **Not started** / **Out of beta scope** | CAPABILITIES §3.5.5 portfolios; no export credential layer |
| Midday challenge cadence | **Not started** | No time-of-day challenge engine |

**Read:** Progress *feels* slightly game-like via skill sparks and persistence chips, but Kindling is deliberately **tutor-first, not quest-first**. Full badge portfolios and employer recognition are category-leadership; thin “today’s challenge” quests could later sit on mastery without becoming a game app.

**Natural next steps (only after retention loops work):** optional “spark challenge” (3 solid turns on a weak skill); exportable work samples as a mini-portfolio—not university APIs.

---

### 4. Global Collaboration — **Not started (~0%)**

| Vision beat | Status | What we have |
|-------------|--------|--------------|
| Peer matching worldwide | **Not started** | Product is **1:1 individual seat**; no peer rooms |
| Group projects + AI facilitation | **Not started** | — |
| Balanced contribution | **Not started** | — |
| Classroom / roster collab | **Out of product** | Per-seat only; no class software. Global peer learning also out. |

**Read:** Intentionally out of current strategy. Collaboration would fight the beta promise (private adaptive tutor, individual seats). Keep as Horizon C / different product mode unless strategy changes.

**Natural next steps:** none for beta. Later: optional study buddy or classroom assignment—not “global railway design” as P0.

---

### 5. Reflection & Growth — **Partial (~50%)**

| Vision beat | Status | What we have |
|-------------|--------|--------------|
| End-of-day / progress review | **Partial** | Dashboard mastery / skill readiness / confidence; learner pulse in-lesson; no dedicated end-of-day reflection ritual |
| Strengths + gentle improvement nudges | **Partial → Shipped** | Local + server learning profile; strengths / focus areas; skill sparks; tutor directives; misconception tips |
| Family-visible growth | **Shipped (opt-in)** | Weekly guardian digest (effort-first, “Effort & heart”); Dashboard family panel |
| Suggest book / course / side project | **Not started** | Interests live on profile and shape tutoring tone; no external resource recommender |
| Tie to long-term passions / goals | **Partial** | Topic familiarity + `learning_goal` on subjects; onboarding academic target; full goals/plans epic (**C5**) still thin |
| Continuous multi-day arc | **Partial** | Resume transcripts, continue cards, search; missing auto “come back for review” (**C1**) |

**Read:** Reflection exists as **dashboard + digest + in-session pulse**, not as a closing ceremony or curated growth plan. Effort-first language already matches the vision’s tone.

**Natural next steps:** short end-of-session “what clicked / what’s next” card; surface learning_goal in UI (**P2.4**); spaced review as the real multi-day growth loop; external course/book suggestions only when quality curation exists.

---

## Scorecard (vision → product)

| Vision chapter | Coverage | Kindling reality in one line |
|----------------|----------|------------------------------|
| 🌅 Check-in | ~55% | In-lesson affect check-ins + break off-ramp; no day-start / wearables |
| 📚 Adaptive lessons | ~65% | Core product: mastery, interventions, pilot pedagogy depth; no VR or auto day plan |
| 🎮 Gamified challenges | ~25% | Skill sparks / persistence flavor only; no quests, labs, credential badges |
| 🌍 Global collaboration | ~0% | Out of scope for individual-tutor beta |
| 🌙 Reflection & growth | ~50% | Dashboard + digests + profile; no ritual close or external learning paths |
| **Whole “adventure day”** | **~40%** | Strong **private adaptive tutor**; weak **orchestrated day**, **social**, **credential game layer** |

Percentages are judgment calls for prioritization, not metrics.

---

## What this means for building next

Aligned with `BETA_LAUNCH.md` and `PLAN.md`—not a second roadmap.

**Wave 1 (shipped — PLAN Phase 2.5 + prior):** feasible session-rhythm items are **done**:

| Item | PLAN epic | Beta | Status |
|------|-----------|------|--------|
| Spaced review v1 | **C1** | **P1.2** | ✅ |
| Session-start energy check-in (thin) | **B7** | **P1.8** | ✅ |
| End-of-session reflection | **B8** | **P1.9** | ✅ |
| Goals surface (lite) | **C5 lite** | **P2.4** | ✅ |
| Light spark challenge (post-C1 only) | **G1** | **P2.9** | ✅ |

**Wave 2 (next — PLAN §15):** deploy/Postgres (Track D), review depth (**C1+**), assessment (**C6**), domain playbooks (**C7**), eval (**C8**), diagrams/a11y (Phase 4 P0), digest polish + single-learner export (**C4**). **Never:** multi-child parent accounts or classroom products—multi-learner buyers purchase separate seats.

Still deferred (PLAN §16 / beta scope fences): VR, wearables, voice-tone, global collab, credential badges, heavy quests, external course/book recommenders, full mindfulness packs.

---

## Mapping to repo docs

| Vision theme | Primary shipped work (Wave 1) | Wave 2 next | Still deferred |
|--------------|------------------------------|-------------|----------------|
| Check-in | B3 affect; **B7** session-start; help L4 | Mindfulness micro-pack only if asked | Wearables, prosody |
| Adaptive | A1–A6, B1–B6, **C1** review v1 | **C1+** depth; **C6** assessment | VR day orchestration |
| Gamified | Skill sparks; persistence; **G1** challenge | — | Badge portfolios, labs |
| Collaboration | — | ❌ no classroom product (per-seat only) | Global peers |
| Reflection | Dashboard, A5, **B8** wrap-up; **C5 lite** goals | **C5+** full planner; external recs only with curation | Credential portfolios |

---

*Last reviewed 2026-09-01. Wave 1 session-rhythm shipped; Wave 2 backlog in PLAN §15 + CAPABILITIES §3 unchecked items.*
