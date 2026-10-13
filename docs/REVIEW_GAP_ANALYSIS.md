# Kindling — Expert Review Gap Analysis

**Source review:** [`REVIEW_FEEDBACK.md`](./REVIEW_FEEDBACK.md)  
**Compared against:** shipped Wave 1 + Wave 2 intelligence slice (L1–L4, C6, C8, CS pilot, practical how-to, suggestion chips) as of 2026-09-10  
**Plan home:** [`NEXT_STEPS.md`](./NEXT_STEPS.md) · capability inventory: [`CAPABILITIES.md`](./CAPABILITIES.md)

This document turns the educational/technical review into a **tracked gap matrix**, maps each gap to **NEXT_STEPS epics**, and proposes an **implementation order** that strengthens Kindling as a *learning intelligence platform* without abandoning the warm tutor product.

---

## 1. Executive verdict

| Layer | Review ideal | Kindling today |
|-------|--------------|----------------|
| **Product thesis** | Learning > answers; stay when stuck | **Strong match** |
| **System skeleton** | Observe → estimate state → decide → teach → update | **Built in pieces** (signals, ladder, mastery, misconceptions, review, assess) |
| **Scientific platform** | Learning gain, independence, policy eval, longitudinal pedagogy data | **Early** — events exist; science layer does not |

**One line:** Kindling now has the **brain** of the expert model in-repo (L1 state, L2 policy, L3 ADI, L4 independence, C8 eval) plus practical how-to teaching — remaining gaps are **depth, calibration, deploy, and multi-domain coverage**, not missing core loops.

**Strategic frame (from the review, adopted here):**

- **Tutor** = conversation + UI the student experiences  
- **Learning intelligence layer** = learner state + curriculum graph + pedagogical policy  
- **LLM** = execution layer that turns a decided intervention into natural language  

Kindling already mixes these. The gap work is mostly **separating and hardening** them — not replacing the tutor chat.

---

## 2. What the review praises that we already ship

Keep and document these as non-negotiable foundations.

| Review theme | Shipped evidence | NEXT_STEPS / epic |
|--------------|------------------|-------------|
| Answers ≠ understanding | Socratic default; guide-before-give; no dump-answer practice mode | Product principles · `gemini.js` philosophy |
| Graduated help ladder | Micro-hint → example → full guide → break/easier | **B2** ✅ |
| Model the learner | Profile + skills BKT-lite + affect/engagement/confidence + behavior rates | **A1**, learning profile, session tracker |
| Struggle signals | Idle, short answers, thrashing, rapid guessing, off-topic | **B1** ✅ |
| Curriculum / skill graph | CS pilot path + skills; math packs retained | **A1** ✅ (CS live; math packs) |
| Misconceptions | Catalog + playbooks + detect/remediate events | **B5** ✅ (pilot) |
| Worked examples as data | Library linked to skills | **B4** ✅ |
| Multi-step / show work | Intermediate checks + partial credit | **B6** ✅ |
| Correctness beyond tutor wording | Math verify prefers checker | **A3** ✅ (math pilot) |
| Review / retrieval | Review sparks + SM-2-lite | **C1** ✅ v1 |
| Affect & persistence | Check-ins, energy, reflection, effort celebration | **B3**, **B7**, **B8** |
| Assessment separate from open chat | MCQ quick check + per-item tutor explanation | **C6** ✅ v1 |
| Hybrid LLM + deterministic | Gateway/BYOK + mastery/verify/MCQ/schedule | Platform + A1/A3/C1/C6 |
| Supportive interaction | Real-world example prompt rule; 3–5 one-tap chips | Prompt + `tutorSuggestions` (post-Wave-1 polish) |
| Single learner seat | One account = one student | Strategy lock §16 |

---

## 3. Gap matrix (review § → status → plan)

Status legend:

- **Done** — ships in product for pilot scope  
- **Partial** — real code path; missing formality, metrics, or breadth  
- **Missing** — not a product capability yet  
- **Horizon** — correct long-term; not a near sprint  

### 3.1 Architecture & learner model

| ID | Review § | Ask | Status | Evidence today | Gap | NEXT_STEPS map | Priority |
|----|----------|-----|--------|----------------|-----|----------|----------|
| G01 | §2–3 | Dynamic learner state after every interaction | **Partial** → **Done** (L1) | `buildLearnerState` / `learner_state.py`; pulse + profile API + snapshot payload | Policy engine (L2) still next consumer | **L1** ✅ · feeds A1/B5 · **L2** next | P0 |
| G02 | §4 | Separate Knowledge / Misconception / Behaviour / Engagement / Confidence / Assistance | **Done** (L1) | All slices on `LearnerState` incl. assistance + objective + interaction | L2/L3 consume for decisions / ADI | **L1** ✅ | P0 |
| G03 | §4 | High knowledge + low confidence → challenge, not more lecture | **Done** (L2) | `decidePedagogy` → CHALLENGE on underconfident + competence | — | **L2.1** ✅ | P1 |
| G04 | §3 | Current learning objective as state | **Partial** | L1 `objective` slice from C5 goals + pulse | Not yet driving every L2 decision | **L1** ✅ surface · **C5+** / **L2** | P2 |
| G05 | §3 | Interaction prefs (visual, low typing) | **Partial** → **Done** (L1 slice) | `interaction` slice: visual/story/step/energetic + `lowTypingTolerance` | Deeper modality policy later | **L1** ✅ | P2 |

### 3.2 Pedagogical decision engine

| ID | Review § | Ask | Status | Evidence today | Gap | NEXT_STEPS map | Priority |
|----|----------|-----|--------|----------------|-----|----------|----------|
| G06 | §5–6 | Formal “what next?” action enum | **Done** (L2) | `PedagogicalAction` + `decidePedagogy()` | C8 decision-compliance scoring later | **L2.1** ✅ | P0 |
| G07 | §5 | Actions: EXPLAIN, HINT, ASSESS, REVIEW, REMEDIATE_PREREQ, … | **Done** (L2) | Full catalog incl. REMEDIATE_PREREQUISITE, ASSESS, REVIEW, CHALLENGE… | Expand modes over time | **L2.1** ✅ | P0 |
| G08 | §6 | LLM is execution-only | **Done** (L2 thin) | `buildPedagogyPromptBlock` injected into system prompt — EXECUTE ONLY THIS MOVE | Compliance scoring = C8 | **L2.2** ✅ | P0 |
| G09 | §13 | Explicit closed-loop control cycle (desired vs gap) | **Partial** → **Done** thin | `gap.desired/observed` on decision + `pedagogy.decision` events | Full L5 trajectory schema later | **L2.2** ✅ · **L5** next | P1 |

### 3.3 Curriculum, misconceptions, help

| ID | Review § | Ask | Status | Evidence today | Gap | NEXT_STEPS map | Priority |
|----|----------|-----|--------|----------------|-----|----------|----------|
| G10 | §7 | Full skill graph + backward prereq move | **Partial** → **Done** thin (L2.3) | Policy rule fires REMEDIATE_PREREQUISITE on stuck + blocking prereq | Multi-domain graph still A1/C7 | **L2.3** ✅ · **A1 expand** | P1 |
| G11 | §8 | Misconception confidence + multi-session evidence + fixed remediation protocol | **Partial** | Catalog, counts, playbooks | Weak confidence model; protocol not enforced | **B5+** (extend B5) | P1 |
| G12 | §9 | Adaptive ladder amount per learner over time | **Partial** → **Done** (L3.2 thin) | `selectInterventionLevel` + `applyAdiLadderPreference` fade when ADI prefers lighter help | Full L2 policy still owns micro-moves | **L3.2** ✅ | P1 |
| G13 | §9–10 | Assistance Dependency Index | **Done** (L3) | `adi.js` / `adi.py`; `learning.adi` events; pulse independence line; digest line | Lifetime ADI trends / research export later | **L3** ✅ | P0 |

### 3.4 Measurement beyond immediate correctness

| ID | Review § | Ask | Status | Evidence today | Gap | NEXT_STEPS map | Priority |
|----|----------|-----|--------|----------------|-----|----------|----------|
| G14 | §11 | Immediate performance | **Done** (pilot) | A3, MCQ, linguistic | Expand domains later | A3 expand | — |
| G15 | §11 | Independent performance (no scaffold) | **Done** (L4.1) | Post-ladder independence twin (no hints); `independence.*` events | Rate in digest later | **L4.1** ✅ | P1 |
| G16 | §11 | Transfer (structurally new item) | **Done** thin (L4.2) | `transfer: true` bank items + prefer-transfer after L3 help | Expand bank coverage | **L4.2** ✅ | P2 |
| G17 | §11 | Retention (1d / 7d / 30d) | **Partial** | C1+.5 rolling 30-day recall outcomes plus first-lesson D7/D14/D30 return cohorts | Sustained review lift still needs longitudinal comparison | **C1+** | P1 |
| G18 | §11 | Explanation quality (“why”) | **Partial** | Conversational | Not scored | **C8** rubric dimension | P2 |
| G19 | §11 | Confidence–competence calibration | **Partial** | L1.3 `calibration` + `calibrationError` on state; pulse copy | Digest/dashboard surface later | **L1.3** ✅ thin | P2 |

### 3.5 Spaced learning & recommendations

| ID | Review § | Ask | Status | Evidence today | Gap | NEXT_STEPS map | Priority |
|----|----------|-----|--------|----------------|-----|----------|----------|
| G20 | §12 | Systematic spaced engine | **Partial** | C1 SM-2-lite | Stronger interval progression and study-grade retention windows | **C1+** | P1 |
| G21 | §12 | “What should I review today?” default | **Partial** | Dashboard Review spark card | Not always primary home surface | **C1+**.2 | P1 |
| G22 | §18 | Learning recommendation engine (highest-value next action) | **Partial** → **Done** thin | `rankNextBestActions` + dashboard “Suggested next step” | Deeper lifelong NBA = S.5 | **L2.4** ✅ thin | P2 |
| G23 | §18 | Teach-back / change representation / video as actions | **Partial / Missing** | Manipulatives = representation; no teach-back mode; no video | Modes + policy hooks | Phase 4 X.1 · teach-back = **L4** optional | P3 |

### 3.6 Evaluation, data moat, research

| ID | Review § | Ask | Status | Evidence today | Gap | NEXT_STEPS map | Priority |
|----|----------|-----|--------|----------------|-----|----------|----------|
| G24 | §15 | Learning gain (pre/post) | **Partial** | C6.7 alternate-form pilot + aggregate skill/band calibration report | Optional Math and Science checks report paired means, gain spread, and a confidence interval; empirical cohort calibration and longitudinal comparison are still needed | **C8** + thin **C6** pre/post pilot | P1 |
| G25 | §15 | Tutor efficiency / gain per interaction | **Missing** | Telemetry volume only | No learning-science KPI | **C8** | P2 |
| G26 | §16 | Scenario benchmark (policies A vs B) | **Partial** | C8.3 manual + C8.1 auto scores + MAE compare | Full policy A/B harness still later | **C8.1** ✅ thin | P1 |
| G27 | §17 | Longitudinal intervention→outcome dataset | **Partial** | Learning events ingest | Schema not optimized for pedagogy research; no offline export for policy mining | **L5** event schema + export · builds on events API | P2 |
| G28 | §14 | Deterministic core vs LLM edge | **Partial** | See hybrid row above | Codify boundaries in ENGINEERING | Docs + **L2** | P1 |

### 3.7 Explicitly out of product (do not schedule from this review)

| Review-adjacent idea | Kindling stance |
|----------------------|-----------------|
| Multi-child parent portal | ❌ Never — digest email only (**C2**) |
| Classroom / roster product | ❌ Never — per-seat only (**C3**) |
| Replacing teachers | Not the mission — 1:1 seat tutor |

---

## 4. New work packages (proposed NEXT_STEPS-facing IDs)

These are **additions** the review implies that are not fully covered by existing epic letters. Implement as Phase 3 “Track L — Learning intelligence” (or fold into C-series where noted).

| Package | Name | Intent | Primary gaps |
|---------|------|--------|--------------|
| **L1** | LearnerState contract | Single structured snapshot: knowledge, misconceptions, behaviour, engagement, confidence, assistance, objective, interaction prefs | G01–G05, G19 |
| **L2** | Pedagogical policy engine | `decide(state, context) → PedagogicalDecision`; prompt must execute decision; log `pedagogy.decision` | G06–G10, G22 |
| **L3** | Assistance Dependency Index (ADI) | Metric + optional learner-pulse / digest line; ladder prefers lower help as ADI falls & mastery rises | G12–G13 |
| **L4** | Independence & transfer checks | After heavy help, schedule no-scaffold twin; optional transfer item; score independence | G15–G16, G18 |
| **L5** | Pedagogy event schema | Normalize `state_before`, `decision`, `intervention`, `outcome` for longitudinal mining | G09, G27 |

**Existing epics that absorb review depth:**

| Epic | Absorbs |
|------|---------|
| **C1+** | G17, G20–G21 |
| **C6** (depth) | G15–G16, cohort calibration after C6.7 alternate-form pilot; timed flag C6.3 |
| **C7** | G10 multi-domain scaffolds |
| **C8** | G18, G24–G26, G28 scoring |
| **B5+** | G11 misconception confidence + protocol |
| **A1 expand** | G10 graph breadth · **P.5** |
| **C5+** | G04 richer objectives (student-owned) |

---

## 5. Suggested implementation order

Aligned with Wave 2 sequencing in NEXT_STEPS §15.3, but **inserts Track L early** because the review’s moat is intelligence, not only deploy polish.

```text
Wave 2a — Hostable beta (Track D)          [unchanged]
  Deploy/Postgres/staging dogfood

Wave 2b — Learning intelligence core       [NEW — review P0]
  L1  LearnerState contract (+ learner pulse consumes it)
  L3  Assistance Dependency Index (events → metric → optional UI)
  L2  Pedagogical policy v1 (action enum + decision event + prompt bind)
  C8.3 Manual 10-session rubric bridge (beta) → C8.1 automated path

Wave 2c — Retention & assessment depth     [Track P, refined]
  C1+ Spaced review depth
  C6 depth: broader science banks and cohort calibration (timed UI + alternate-form pre/post pilot shipped; L4 independence twin shipped)
  L4  Independence/transfer checks wired to C6 + post-ladder
  C7  Playbook #2 only if sessions leave math
  A1 expand / P.5 as needed for C4/C6/C1+

Wave 2d — Teach medium                     [Track X]
  Diagrams, a11y, focus mode (supports CHANGE_REPRESENTATION)

Wave 2e — Shareable progress               [Track R]
  Digest polish; C4 single-learner export
  Surface ADI / independence gently in digest (never shame)

Wave 2f — Scale & data moat                [Tracks V + S + L5]
  L5 pedagogy event export / research schema
  Failover, PWA, i18n as demand requires
  Lifelong cross-subject model (S.5) only after L1 stable
```

### 5.1 Sprint-sized slices (first concrete backlog)

| Order | Slice | Done when | Gaps |
|------:|-------|-----------|------|
| 1 | **L1.1** Define `LearnerState` TS + Python mirror; build from profile + session | Unit tests; tools “Learner pulse” reads structured slices | G01–G02 |
| 2 | **L3.1** Compute ADI from last N graded turns + intervention levels | Event `learning.adi` or payload field; smoke test | G13 |
| 3 | **L3.2** Show ADI sparingly (tools pulse or digest “gaining independence”) | No shame copy; high ADI + high score → encourage independence | G12–G13 |
| 4 | **L2.1** Action enum + `decidePedagogy()` pure function (rules v1) | Golden tests for stuck / guessing / low energy / due review | G06–G07 |
| 5 | **L2.2** Emit `pedagogy.decision` event; inject decision block into system prompt | Transcript shows decision id; LLM told to execute only that move | G08–G09 |
| 6 | **L2.3** Rule: severe stuck on skill with weak prereq → REMEDIATE_PREREQUISITE | Uses pilot graph edge | G10 |
| 7 | **C8.3** Manual rubric sheet + 10 recorded sessions | ✅ tooling; complete 10 human scores for baseline | G26 |
| 8 | **C1+**.1–.2 Multi-subject due + schedule UX | Dashboard “Review today” clearer | G20–G21 |
| 9 | **L4.1** After ladder L2/L3 success, offer 1 no-help twin (chat or C6 item) | Independence outcome logged | G15 |
| 10 | **C6** depth + cohort calibration of the one-skill pre/post pilot | Calibrated learning-gain signal | G16, G24 |
| 11 | **B5+** Misconception confidence + forced check item after remediation | Playbook steps tracked | G11 |
| 12 | **C8.1–.2** Offline scorer CLI | C8.1 ✅ · C8.2 ✅ `weekly_eval_sample` | G24–G26 |
| 13 | **L5** Export pedagogy trajectories (JSONL) | Research-ready dump from events | G27 |
| 14 | **C7** Second domain pack | Graph + examples + misconceptions thin | G10 breadth |

---

## 6. Epic checklist (merge into NEXT_STEPS when scheduling)

### Track L — Learning intelligence (proposed)

| Step | Work | Status | Gaps |
|------|------|--------|------|
| L1.1 | `LearnerState` schema + builder (FE + BE mirror) | ✅ | G01–G02 |
| L1.2 | Learner pulse UI binds to L1 slices | ✅ | G01 |
| L1.3 | Confidence×competence calibration signal | ✅ thin | G03, G19 |
| L2.1 | Action enum + pure `decidePedagogy` | ✅ | G06–G07 |
| L2.2 | `pedagogy.decision` events + prompt execution contract | ✅ | G08–G09 |
| L2.3 | Prereq remediate rule on pilot graph | ✅ | G10 |
| L2.4 | Next-best-action ranking for dashboard (thin) | ✅ | G22 |
| L3.1 | ADI computation + tests | ✅ | G13 |
| L3.2 | ADI → ladder preference (fade help) | ✅ | G12 |
| L3.3 | ADI in digest (optional, non-shaming) | ✅ thin | G13 |
| L4.1 | Independence twin after heavy help | ✅ | G15 |
| L4.2 | Transfer item flag in assessment bank | ✅ | G16 |
| L5.1 | Normalize pedagogy trajectory fields on events | ⬜ | G27 |
| L5.2 | Ops/research export JSONL | ⬜ | G27 |

### Existing epics — review-driven emphasis

| Epic | Status | Review-driven next step |
|------|--------|-------------------------|
| **C1** Review v1 | ✅ | — |
| **C1+** | ⚡ Partial | Multi-subject selection/balancing ✅; upcoming/reason + 1/3/7-day snooze ✅; bounded recall intervals ✅; week-focus tie-in ✅; rolling 30-day recall and first-lesson D7/D14/D30 cohorts shipped; sustained review lift remains (G20–G21, G17) |
| **C6** Assessment | ⚡ Offline v1 + timed; Math Foundations pilot has 3 items per core skill and science has 5 per scaffold area, including applied transfer; optional alternate-form pre/post checks cover both pilot domains | Wider subject coverage + cohort learning-gain calibration; L4 covers independence/transfer |
| **C7** Playbooks | ⚡ Partial | Math/algebra and science packs plus C8 non-scoring sample cues for both domains; further domain breadth remains (G10) |
| **C8** Eval | C8.3 ✅ · C8.1 ✅ · C8.2 ✅ · C8.4 ✅ | Manual + auto scorer + weekly job + per-dimension human-label diagnostics; validation on ≥10 matched human-scored sessions remains (G24–G26) |
| **B5** Misconceptions | ✅ pilot | B5+: confidence + enforced remediation check (G11) |
| **A1** Skill graph | ✅ pilot | Expand coverage for C4/C6/C1+ (G10) |
| **C4** Standards export | ⬜ | Single-learner only; can include mastery + ADI later |
| **C5 / C5+** Goals | lite ✅ | Active objective in L1 (G04) |
| **C9 / C10** | ✅ | C9 staff queue and C10 opt-in support email shipped; R.1 student-owned recipient and unsent preview UX also shipped; live email delivery remains in Track D |

### NEXT_STEPS §15 Track P status note

| ID | NEXT_STEPS work | Update |
|----|-----------|--------|
| P.1 | C1+ | Partial — cross-subject selection, schedule controls, snooze, bounded intervals, week-focus ranking, rolling recall, and first-lesson D7/D14/D30 cohorts shipped; sustained review lift remains |
| P.2 | C6 assessment | **v1 + timed practice ✅**; Math Foundations and all 8 science scaffold areas have usable offline banks with applied transfer items, optional alternate-form pre/post checks in both domains, and aggregate skill/band paired-gain calibration — remaining = wider coverage and empirical cohort calibration; L4 covers independence/transfer |
| P.3 | C7 | Partial — math/algebra and science packs plus C8 sample audits; further domain breadth remains demand-gated |
| P.4 | C8 | C8.3 ✅ · C8.1 ✅ · C8.2 ✅ |
| P.5 | A1 expand | ⬜ as needed |

---

## 7. Success metrics (product + science)

Do not only track messages/session length. From the review, prefer:

| Metric | Definition (practical v1) | Depends on |
|--------|---------------------------|------------|
| **ADI ↓ over mastery ↑** | Assistance weight per solid correct declines as skill score rises | L3 |
| **Independence rate** | % success on no-scaffold twins after help | L4 |
| **Misconception resolution** | Detected MC clears after remediation + check | B5+ |
| **Review hit rate** | Due sparks completed; post-review retention proxy | C1+ |
| **Decision compliance** | Tutor turns that match logged pedagogical action | L2 |
| **Learning gain (pilot)** | Post − pre on one skill pack in beta cohort | C6 + C8 |
| **Intervention success** | Post-ladder graded success without immediate re-enter | B2 events |
| **Calibration error** | \|confidence − accuracy\| rolling | L1.3 |

Product metrics (retention, sessions/week) remain necessary for beta — they are **not** substitutes for the above.

---

## 8. Design principles (preserve while closing gaps)

From CAPABILITIES §5 + review spirit:

1. Respect the learner — never shame; ADI is for *independence*, not punishment.  
2. Guide before giving — policy defaults to HINT before FULL_GUIDE.  
3. Adapt quietly — state/scores internal; speech stays tutor-warm.  
4. Presentation is pedagogy — examples + chips stay.  
5. Single seat — no household/classroom detour “for data.”  
6. Measure learning, not chatter — C8/L3/L4 over vanity messaging stats.

---

## 9. Traceability

| Doc | Role |
|-----|------|
| [`REVIEW_FEEDBACK.md`](./REVIEW_FEEDBACK.md) | Expert source narrative (§1–18) |
| **This file** | Gap IDs, status, NEXT_STEPS map, order |
| [`NEXT_STEPS.md`](./NEXT_STEPS.md) | Execution epics & Wave 2 tracks — **§15.1a** lists shipped L1–L4 / C6 / C8 |
| [`CAPABILITIES.md`](./CAPABILITIES.md) | ✅/⬜ inventory — L*/C6/C8/how-to flipped shipped |
| [`ENGINEERING.md`](./ENGINEERING.md) | Closed-loop architecture including L1/L2/ADI/how-to |

---

## 10. Summary for stakeholders

**Already true:** Kindling is not a thin chatbot wrapper. It has struggle detection, a help ladder, pilot mastery and misconceptions, review sparks, assessment checks, a living profile, a **formal LearnerState + pedagogical policy loop (L1–L2)**, **ADI (L3)**, **independence twins (L4)**, **C8 eval tooling**, a **Computer Science** pilot path, and **practical how-to** teaching for hands-on skills.

**Still open (science / product depth):** multi-subject review depth (**C1+**), broader domain playbooks (**C7**), decision-compliance scoring at scale, cohort calibration of the C6.7 pre/post pilot, L5 trajectory export, and hostable deploy (Track D) so beta cohorts can generate longitudinal data.

**Do next:** **Track D (deploy)** in parallel with **C1+ / C7 / C4** as demand requires — not a second build of L1–L4.  
The moat is **longitudinal pedagogical intelligence**, not prettier chat.

---

*Created: 2026-09-09 · Updated: 2026-10-04 — P.6.1 download how-to guide, C6.10 science transfer checks, C7.4 science sample cues, C6.9 science alternate-form pre/post pilot, C8.4 human-label calibration diagnostics, and C6.8 science assessment depth reflected; actual scorer validation, wider coverage, and cohort learning-gain calibration remain open.*
