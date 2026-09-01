# Kindling — Y Combinator Pitch Materials

**Company:** Kindling  
**One-liner:** The AI private tutor that notices when a learner is stuck—and knows how to teach through it.  
**Stage:** Pre-seed · working product (consumer adaptive tutoring)  
**Category:** EdTech · AI tutoring · Individual student subscription (per-seat; multi-learner buyers purchase multiple seats)  

| Asset | Use |
|-------|-----|
| **[Kindling_YC_Pitch.pptx](./Kindling_YC_Pitch.pptx)** | 10-slide partner / interview deck |
| **This file** | Narrative + YC application answer bank + demo script + Q&A |
| [CAPABILITIES.md](./CAPABILITIES.md) | Product depth (diligence) |
| [docs/ENGINEERING.md](./docs/ENGINEERING.md) | Technical diligence |
| [README.md](./README.md) | Run the product |

> **Before you submit or send:** replace founder names, contact, ask amount, and any traction numbers marked UPDATE. Never invent metrics. YC partners notice.

---

## How YC evaluates this (and how the deck is shaped)

YC cares less about glossy TAM slides and more about:

1. **Clear problem** with a sharp insight
2. **Something real built** (demo > slides)
3. **Why you** (speed, insight, unfair advantage)
4. **Path to a big company** (wedge → expand)
5. **Honesty** about stage and risks

This package is optimized for:

- **YC application** long answers (Section A)
- **10-minute partner meeting** (Section B + PPTX)
- **Leave-behind / data room** (appendix)

**Brand position (non-negotiable):**  
Not "ChatGPT for homework."  
Yes: *the tutor that stays when learning gets hard.*

**Subject scope:** Kindling is a **multi-subject** adaptive tutor (math, science, coding, languages, and whatever subjects the learner creates). Domain depth may go deeper in some subjects first for quality—but the product and pitch are **not** a single-subject tool.

---

# A. YC application answer bank

Use these as drafts. Keep answers short, concrete, and in your own voice. Character limits on the YC form change—trim aggressively.

### Company name
Kindling

### Describe what your company does in 50 characters or less
AI tutor that teaches when kids get stuck

*(alt)* Adaptive AI private tutor for real learning

### What is your company going to make? (longer)
Kindling is an AI-powered private tutor for K–12 and lifelong learners across **any subject they bring**—math, science, coding, languages, writing, and more. It teaches like a great human tutor: Socratic by default, curriculum- and profile-aware, and explicitly intervenes when a learner is stuck.

Unlike homework chatbots that dump answers, Kindling runs a closed learning loop—signals from every turn (correctness, affect, struggle), a living learner model, a graduated help ladder (micro-hint → worked example → full guide → easier path), skill mastery, misconception playbooks, multi-step "show your work," homework photo help, and opt-in parent digests.

The product is a working monorepo (React + Django): live lessons on student-created subjects and topics, familiarity and learning goals, resume, safety floor, multi-provider AI/BYOK, and deep pedagogy packs that expand subject by subject.

### Why did you pick this idea?
Great 1-on-1 tutoring is one of the highest-impact education interventions, but quality human tutors are expensive and scarce. Generic AI gives answers; adaptive item banks do not feel like a caring tutor. We want private-tutor outcomes at software scale—especially the hard moment when a child is about to shut the book—**whatever the subject**.

### Who are your competitors? Who might become competitors?
- **Generic LLMs / ChatGPT:** answer-first, no durable learner model or child pedagogy product.
- **Homework solvers:** speed to answer is not understanding.
- **Adaptive practice platforms:** strong item banks; weaker conversational intervention and affect; often siloed by subject.
- **Tutor marketplaces:** high cost, scheduling friction.
- **Other AI tutor startups:** many chat wrappers; few with intervention ladder + event graph + mastery + family loop as product systems.

**Our wedge:** intervention and learning science as product infrastructure, not a prompt accident—plus family trust surfaces and correctness/trust tooling where it matters—across the learner's full curriculum.

### What do you understand about your users?
**Primary customer:** the **individual student** (one account = one learner = one seat). For younger teens, a parent/guardian may pay *for that seat*. A parent with multiple children buys **multiple seats**. Older learners buy and use themselves. Schools/institutions buy **per-student seats**, not a classroom product.  
Students need non-shaming help and agency (exit help anytime) on **whatever they're studying tonight**. Optional **email digests** (student configures the recipient) are a trust add-on, not a parent portal.

### How do you know customers need this?
Structural demand: tutoring spend already exists across subjects; teacher shortage and learning gaps are not a fad; parents already pay for apps and human tutors. Product hypothesis validated by building the full struggle-to-rescue loop (not just chat). **Next proof:** paid beta retention, intervention accept rate, post-guide success—UPDATE with real interviews / waitlist data.

### How will you make money?
Consumer subscription first (**individual student seats**; pilot catalog Spark / Ember / Forge). Optional student-configured progress digests by email. Multi-child and institutional buyers = **N seats**, never a household or class SKU. Later: exam packs; bulk seat sales if useful—still one login per learner. Unit economics hinge on session design + tiered models vs ARPU per learner.

### How far along are you?
**Working product**, not slideware. Shipped **Wave 1**: production foundation (minus Postgres host) + core product slice (mastery graph, resume, correctness, homework photo, digests, manipulatives) + intervention depth (struggle ladder, affect, examples, misconceptions, multi-step) + **session rhythm** (start energy check-in, end reflection, Review spark, goals lite, light spark challenge). Learners create custom subjects and topics today. **Wave 2** (see PLAN.md §15): hostable beta deploy, assessment/review depth, single-learner export and digest polish—**not** multi-child or classroom products. Pre-revenue / private demo stage unless updated.

### How long have each of you been working on this?
UPDATE

### Equity / legal
UPDATE standard founder split · incorporated? · location

### Progress milestones (last 3–6 months)
- Full-stack adaptive lesson runtime with streaming AI + learner pulse
- Custom subjects and topics (any domain the learner chooses)
- Intervention ladder with exit anytime
- Skill mastery graph + "Skill sparks" UI
- Correctness verification where graded answers apply
- Homework photo to guided help
- Parent digest job + dashboard
- First-session orientation from familiarity and learning goals
- Safety: age-aware policy, distress escalation, export/delete

### What is the next step?
1. Paid student beta in one geography (individual seats; multi-subject usage, quality bar high)
2. Instrument PMF metrics (sessions/week, D30, intervention success, parent NPS)
3. Deepen pedagogy data flywheel + eval harness across domains
4. First school or tutoring-center design partner

---

# B. Partner meeting deck (10 slides)

*Matches [Kindling_YC_Pitch.pptx](./Kindling_YC_Pitch.pptx). Speak to slides; demo live if possible.*

### 1 — Title
**Kindling** — The AI private tutor that notices when a learner is stuck—and knows how to teach.  
Pre-seed · Working product · Adaptive tutoring across subjects

**30-second open:** "We're building Kindling—an AI tutor for the individual learner that doesn't just answer homework. It watches how a student thinks and feels, and when they're stuck it steps in with real teaching—then gets out of the way. Any subject they need help with."

### 2 — Problem
Great tutoring works. Almost nobody gets it daily. Human tutors are scarce/expensive; chatbots answer without teaching; parents see grades too late.

**Pain line:** When a child is stuck, the teaching moment either never arrives—or arrives as a spoon-fed answer that doesn't stick.

**Insight:** Tutoring quality is judgment under uncertainty—not more fluent text.

### 3 — Solution
Living private tutor for the whole school bag: Socratic default, learner model every turn, graduated intervention (exit-able), family digests, mastery and trust tooling.

**Thesis:** Kindling doesn't just chat. It teaches—and it knows when to change how it teaches.

### 4 — Product (what is real)
Working monorepo: live lessons on **student-created subjects**, intelligence pipeline, intervention ladder, pedagogy engines (examples, misconceptions, multistep), safety floor, resume/digests, familiarity-aware first session. Rich rendering for math, code, lists, and diagrams.

**Demo punchline:** Other bots give the answer. Kindling notices the struggle—and teaches through it.

### 5 — How it works
Student turn → signals → learner model → teaching policy → ladder / examples / mastery / digests.  
Rent foundation models; own the learning system. Moat path = session data × policies × curriculum graphs × parent trust.

### 6 — Why now
LLM UX ready; parents already pay; structural gaps; window to own pedagogy + trust layer before free answers become the habit.

### 7 — Market and wedge
Beachhead: learners ~8–16 (or their payer) who need **nightly 1-on-1 help across school subjects**. Expand exam prep; multi-child families and schools buy **additional seats**. Wedge is **how we teach when stuck**, not a single subject silo. Lead with wedge, not vanity TAM.

### 8 — Business model and GTM
Consumer per-seat subscription first; bulk seats for schools later (still one account per learner). GTM: paid beta one geo → student/payer loops → creators/micro-schools buying seats.  
North stars: sessions/learner/week · intervention success · D30 · parent NPS · GM after AI COGS.

### 9 — Competition
| | Gap |
|--|-----|
| ChatGPT et al. | No child learning product system |
| Solvers | Answer ≠ mastery |
| Adaptive banks | Weak conversational rescue + affect; often subject-siloed |
| Human marketplaces | Cost and logistics |
| AI tutor apps | Often wrappers; thin intervention/mastery |

**Kindling:** intervention ladder + event graph + mastery + family loop + safety as product—**across subjects**.

### 10 — Team, status, ask
Honest status (working product; UPDATE GTM/revenue/users). Team UPDATE.  
Raising UPDATE pre-seed for 12–18 months: paid beta PMF, learning science, safety, parent acquisition.  
**Close:** We're not building a better answer engine. We're building the tutor that stays—especially when learning is hard.

---

# C. Live demo script (90 seconds)

1. Profile — grade, interests.  
2. Show **custom subjects** (or pick any subject the learner cares about).  
3. New topic — familiarity "Brand new" + a goal.  
4. First message — comprehensive gentle intro.  
5. Struggle — short/wrong answers → help ladder.  
6. Guide — example/steps; clear presentation.  
7. Exit help — agency.  
8. Parent surface — spark or digest.  

**Line:** The product is the loop—not the chat box. The subject is whatever they're learning.

---

# D. Anticipated YC questions

| Question | Tight answer |
|----------|----------------|
| Why won't OpenAI crush you? | Horizontal assistants vs vertical learning policy, child UX, family trust, outcomes instrumentation. Start narrow on distribution. |
| Isn't this a wrapper? | Event schema, mastery engine, intervention state machine, catalogs, safety, digests, verifiers. LLM is a component. |
| Are you only math? | No. Learners create any subject/topic today. We deepen pedagogy packs domain by domain; the product is the teaching system. |
| How do you measure learning? | Graded turns + mastery signals + post-intervention success; domain checkers where useful; later spaced review + eval harness. |
| Child safety? | Age-aware prompts, distress can block model, scrubbed events, export/delete. Deepen for schools. |
| Unit economics? | Short high-value turns; tier models; platform vs BYOK; price to usage. |
| Why education (hard mode)? | Nightly pain + WTP; multi-year LTV if we own the struggle moment across subjects. |
| 10-year company? | Default learning companion + institutions; humans for mentorship; Kindling for infinite patient practice. |

---

# E. Risks (say them first)

| Risk | Mitigation |
|------|------------|
| Hallucination / wrong answers | Domain checkers where applicable; playbooks; human escalation later |
| Safety incident | Policy + distress stop; parental controls roadmap |
| Inference cost | Session design, model tiers, pricing |
| Commoditization | Data flywheel + brand + schools |
| Retention | Intervention quality, goals, digests, spaced review |
| Uneven depth by subject | Expand pedagogy packs deliberately; keep core loop domain-agnostic |

---

# F. Metrics to put on the deck when real

Waitlist / WAU · sessions/learner/week · subjects used · D7/D30 · intervention accept % · post-guide success · parent NPS · paid conversion · GM after model COGS

Until then: show the product and shipping velocity. Do not invent numbers.

---

# G. Email blurb (YC intro / AngelList)

Kindling is an AI private tutor that teaches Socratically across the subjects a learner actually studies, models how they think and feel in real time, and steps in with a graduated help ladder when they are stuck—then lets them return to practice on their own terms. We have built a working full-stack product (live lessons, custom subjects, mastery, homework photos, parent digests, child-safety floor). We are not an answer engine—we are the tutor that stays when learning is hard.

---

# H. Pre-interview checklist

- [ ] Founder names + contact on title slide
- [ ] Ask amount + one-line use of funds
- [ ] No fabricated traction
- [ ] Demo environment works (backup video)
- [ ] One sentence each: problem, insight, solution, wedge
- [ ] Pitch never implies math-only
- [ ] Delete any slide you cannot defend in 20 seconds
- [ ] PPTX opens on the laptop you will present from

---

*Market sizes and example prices are directional. Product claims match the Kindling monorepo through Phase 0–2 pedagogy depth. Update traction and team before external send.*