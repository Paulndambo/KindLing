# Kindling — Investor Pitch Deck

**The AI private tutor that notices when a child is stuck—and knows how to teach.**

| | |
|---|---|
| **Company** | Kindling |
| **Stage** | Pre-seed / Seed-ready product |
| **Category** | Adaptive AI tutoring · EdTech · Consumer + B2B2C |
| **One-liner** | Private-school-quality 1-on-1 tutoring, available to every learner, that adapts in real time to how they think and struggle. |
| **Docs** | [README](./README.md) · [Capabilities & roadmap](./CAPABILITIES.md) |

> **How to use this file**  
> This is a narrative pitch deck in Markdown. Copy sections into slides (Pitch, DocSend, Google Slides) or share as a leave-behind. Replace bracketed placeholders `[like this]` with your team, numbers, and ask.

---

## Slide 1 — Title

# Kindling

### Ignite understanding. One learner at a time.

**AI-powered adaptive tutoring that teaches like a great human tutor—patient, Socratic, and present when it matters.**

Seeking investment to scale learning science, safety, and distribution.

---

## Slide 2 — The problem

### Great tutoring works. Almost no one can get it.

| Reality | Consequence |
|---------|-------------|
| **1-on-1 tutoring** is one of the highest-impact education interventions (feedback, pacing, scaffolding). | Quality human tutors are **expensive**, scarce, and unevenly distributed. |
| Schools cannot give every child a personal tutor every day. | Gaps compound: confidence drops, subjects become “I’m just bad at this.” |
| Generic homework apps and chatbots **answer questions**. | Learners get answers without building understanding—or get stuck with no rescue. |
| Parents see grades late; they rarely see *how* the child thinks mid-lesson. | Frustration at home; expensive catch-up later. |

**The gap:**  
Families need something between “YouTube + worksheets” and “$60–$100/hour private tutor”—**always on, curriculum-aware, emotionally intelligent, and pedagogically serious.**

### Pain, in one sentence

> *When a child is stuck, the moment of teaching either never arrives—or arrives as a spoon-fed answer that doesn’t stick.*

---

## Slide 3 — The insight

### Tutoring quality is not “more AI text.” It’s **judgment under uncertainty.**

A great tutor continuously answers:

1. **Do they understand?** (correctness, partial grasp, misconception)  
2. **How do they feel?** (confident, hesitant, frustrated, disengaged)  
3. **What should I do next?** (question, hint, scaffold, worked example, or step-by-step guide)  
4. **Who is this learner?** (grade, curriculum, culture, interests, goals)

Most “AI tutor” products optimize for **instant answers**.  
Kindling is built to optimize for **guided learning + timely intervention**.

---

## Slide 4 — The solution

# Kindling is a living private tutor

An adaptive AI tutor that:

- **Teaches Socratically** by default (guides discovery; doesn’t dump answers)
- **Watches the learner in real time** (signals from every exchange)
- **Intervenes when they’re stuck**—offers or auto-starts a **step-by-step guide** with explanations and examples
- **Lets the student leave guide mode** anytime (agency, not lock-in)
- **Aligns to the student**: grade, country, curriculum, learning style, interests
- **Shows progress** to families without shaming the child in-session
- **Presents beautifully**: math, lists, code, tables, diagrams—because presentation *is* pedagogy

### Product thesis

> *Kindling doesn’t just chat. It teaches—and it knows when to change how it teaches.*

---

## Slide 5 — Product: what exists today

**Working product** (frontend + backend monorepo), not a slideware mock.

### Live lesson

- Streaming AI lessons (Google Gemini)
- Lesson path (topics), tools panel, collapsible chrome for focus
- Hints, voice input/output, live difficulty & **learner pulse**
- Rich message rendering (Markdown, LaTeX/math, code, tables)

### Adaptive intelligence

- Per-turn signals: correctness, affect, confidence, engagement, timing
- Longitudinal learner profile (mastery hints, focus areas, preferences)
- Events pipeline → API for sessions and analytics

### Intervention mode (differentiator)

| Trigger | Behavior |
|---------|----------|
| 2+ consecutive incorrect (or related struggle) | **Offer** guided step-by-step help |
| Stronger struggle / frustration | **Auto-enter** guide mode |
| Student request | Manual “start guide” anytime |
| Anytime | **Exit guide** → back to practice |

### Platform foundations

- Auth (JWT), student onboarding/profile  
- Custom subjects & topics  
- Family-style dashboard surfaces  
- Django learning API (profiles, sessions, events)

*Detail: [CAPABILITIES.md](./CAPABILITIES.md).*

---

## Slide 6 — Demo narrative (90 seconds)

Use this script in meetings or screen-share:

1. **Onboard a student** — grade, curriculum, interests (e.g. football, art).  
2. **Start a lesson** — Kindling greets by name, curriculum-aware, one question at a time.  
3. **Show adaptation** — wrong answers → scaffolding language; learner pulse updates.  
4. **Trigger intervention** — after repeated misses, offer or auto-enter **step-by-step guide**.  
5. **Show guide quality** — clear steps, examples, math rendered properly.  
6. **Exit guide** — student returns to practice with agency.  
7. **Dashboard** — progress / mastery signal for the family story.

**Demo punchline:**  
*“Other bots give the answer. Kindling notices the struggle—and teaches through it.”*

---

## Slide 7 — Why now

| Force | Why it matters for Kindling |
|-------|------------------------------|
| **LLM capability jump** | Fluent, multi-subject dialogue is finally good enough for tutoring UX. |
| **Parents already pay** for tutoring, apps, and test prep—budget exists. |
| **Teacher shortage & post-pandemic gaps** | Demand for personalized catch-up is structural, not a fad. |
| **Consumer AI habit formation** | Families accept AI assistants; education needs *safe, pedagogical* versions. |
| **API-first AI stack** | Startups can ship product without owning foundation models—capital goes to **learning systems + distribution + trust**. |

**Window:** Build the **pedagogy + intervention + trust layer** before generic chatbots own the “homework helper” default—and relegate serious learning to a race to free answers.

---

## Slide 8 — Market opportunity

### Large, urgent, multi-sided

Illustrative framing for discussion (validate with your preferred research sources in the data room):

| Layer | Description | Shape |
|-------|-------------|--------|
| **TAM** | Global private tutoring + digital learning support | Hundreds of billions USD (offline + online) |
| **SAM** | English + major-language markets for K–12 / early higher-ed AI tutoring subscriptions | Tens of billions |
| **SOM (5-year)** | Focused beachhead: homework help + exam confidence for families in 1–2 regions + pilot schools | Low–mid hundreds of millions revenue potential at scale |

### Beachhead (recommended)

1. **Primary:** Parents of ages ~8–16 seeking affordable daily 1-on-1 help (math first).  
2. **Secondary:** Exam prep windows (high willingness to pay).  
3. **Expansion:** Schools / tutoring centers (B2B2C licenses).  
4. **Long-term:** Multi-subject lifelong learning companion.

### Why math-first

High pain, clear correctness signals, strong willingness to pay, and perfect fit for **intervention + worked examples + rendered math**.

---

## Slide 9 — Business model

### Consumer (core)

| Plan | Positioning | Example pricing *(illustrative)* |
|------|--------------|----------------------------------|
| **Free / trial** | Limited sessions; acquisition | Time-boxed trial |
| **Family** | Unlimited or generous daily lessons + dashboard | **$15–30 / month** per learner |
| **Family+** | Multi-child, parent digests, priority voice | **$25–45 / month** |
| **Exam boost** | Seasonal intensive packs | **$49–99** one-time |

### B2B2C (scale)

- School / district licenses (roster, privacy, progress reports)  
- Tutoring centers white-label or co-pilot for human tutors  
- University / access programs for bridge courses  

### Unit economics levers

- **Gross margin:** AI inference cost per session vs subscription  
- **Defend margin with:** shorter high-quality turns, caching of curriculum scaffolds, smaller models for routine steps, larger models only for hard interventions  
- **LTV drivers:** multi-year school journey, multi-child households, subject expansion  
- **CAC channels:** parent communities, creator tutors, school pilots, app stores / SEO “stuck on fractions” intent  

*Replace illustrative prices with your local willingness-to-pay tests.*

---

## Slide 10 — Go-to-market

### Phase 1 — Prove love (0–6 months post-funding)

- Launch waitlist + paid beta in **one geography**  
- Math (or one core subject) excellence  
- Measure: session completion, intervention acceptance, D7/D30 retention, NPS parents & students  
- Content loops: short demos of “stuck → guide → win”

### Phase 2 — Family growth (6–18 months)

- Referral (“sibling free month”), parent digests, exam seasons  
- Partnerships with micro-schools, tutors, education creators  
- Localization for spelling/curriculum (already in product DNA)

### Phase 3 — Institutional (18–36 months)

- Classroom pilot packs  
- Standards-aligned reports  
- Human tutor co-pilot (Kindling for the hard 80% of practice; humans for mentoring)

### Brand position

**Not:** “ChatGPT for homework.”  
**Yes:** “The tutor that stays with your child when learning gets hard.”

---

## Slide 11 — Competitive landscape

| Approach | Examples *(category)* | Gap vs Kindling |
|----------|----------------------|-----------------|
| Generic AI chat | Consumer LLMs | No learner model, weak pedagogy, answer-first, poor child UX |
| Homework solvers | Photo-math style apps | Speed to answer ≠ understanding; little longitudinal care |
| Adaptive platforms | Traditional adaptive practice | Often item banks, not conversational + emotional intervention |
| Human marketplaces | Tutor marketplaces | High cost, scheduling friction, quality variance |
| AI tutor startups | Emerging AI tutors | Many chat wrappers; few with **explicit intervention mode + learning event graph + family progress** |

### Kindling’s wedge

1. **Intervention as a product feature**, not a prompt accident  
2. **Learning intelligence pipeline** (signals → profile → personalization → analytics)  
3. **Curriculum & culture awareness** baked into the tutor  
4. **Presentation quality** for real learning media (math/code/structure)  
5. **Path to trust**: child-safe, exit-able guides, family visibility  

**Moat over time:** proprietary learner interaction data + pedagogical policies + curriculum graphs + brand trust with parents—not the base LLM.

---

## Slide 12 — Technology moat (building)

```
Interaction data → Signals → Learner profile → Teaching policy
        ↑                         ↓
   Live session              Intervention engine
        ↓                         ↓
   Family dashboard ←—— Progress & mastery model
```

**Near-term defensibility**

- Intervention timing models trained on Kindling sessions  
- Domain playbooks (fractions, algebra, writing…)  
- Evaluation harness for tutor quality (Socratic fidelity, rescue success)  
- Optional correctness verification (math/code) for trust  

**Capital use of AI:**  
Own the **learning system**; rent the foundation model until/unless vertical models justify cost.

---

## Slide 13 — Traction & status

### Current status *(honest)*

| Area | Status |
|------|--------|
| Product | Functional adaptive tutor + API + dashboard foundations |
| Learning loop | Live signals, intervention mode, event ingest |
| Auth / curriculum | Student accounts, profiles, subjects/topics |
| Go-to-market | `[Pre-launch / private beta / waitlist — fill in]` |
| Revenue | `[Pre-revenue / design partners — fill in]` |
| Users | `[N waitlist / N beta families — fill in]` |

### Traction milestones to hit with this round

- `[X]` paid families or design partners  
- `[Y]%` W2 retention on weekly active learners  
- Intervention **accept rate** and **post-guide success** benchmarks  
- First school / tutoring-center LOI  

*Update this slide with real metrics before sending to investors.*

---

## Slide 14 — Roadmap (use of capital)

### Horizon A — Make it unmissable (fund focus)

| Initiative | Why investors care |
|------------|-------------------|
| Skill-level mastery + curriculum graph | Measurable learning outcomes |
| Homework photo upload + visual models | Higher willingness to pay; viral demos |
| Session history / resume | Retention |
| Parent digests + multi-child accounts | Family LTV |
| Math correctness checks | Trust & brand safety |
| Child safety & privacy hardening | Unlock school deals |

### Horizon B — Differentiation

- Spaced review engine  
- Full-duplex voice lessons  
- Classroom mode  
- Domain playbooks + automated eval scores  

### Horizon C — Category leadership

- Multi-region compliance  
- LMS/SSO integrations  
- Human+AI tutoring networks  

*See CAPABILITIES.md for full product depth.*

---

## Slide 15 — The ask

### Seeking: **`[$X00K – $X.XM]`** pre-seed / seed

**Use of funds** *(example split—adjust to plan)*:

| Allocation | % | Purpose |
|------------|---|---------|
| Product & learning science | 40% | Mastery model, intervention v2, math trust, visuals |
| Safety, privacy, infra | 15% | Child safety, monitoring, production hardening |
| Growth & community | 25% | Parent acquisition, content, partnerships |
| Operations & runway | 20% | Team, legal, compliance basics |

**Runway target:** 12–18 months to **product-market fit metrics** and a priced seed/Series A story.

**What we offer investors**

- Clear category narrative (adaptive intervention tutor)  
- Working product to diligence  
- Path to consumer subscription + B2B2C  
- Data flywheel that improves teaching policy over time  

---

## Slide 16 — Team

| Role | Name | Background |
|------|------|------------|
| CEO / Product | `[Name]` | `[Education / consumer / prior exits]` |
| CTO / Eng | `[Name]` | `[AI systems / full-stack]` |
| Learning science advisor | `[Name]` | `[Research / classroom]` |
| Growth | `[Name]` | `[Consumer subscription]` |

### Why this team wins

- `[Obsessed with teaching quality, not chatbot novelty]`  
- `[Can ship full-stack product + learning systems]`  
- `[Access to schools / parent communities / domain experts]`  

*Add photos and LinkedIn in the slide version.*

---

## Slide 17 — Vision

### Near term  
Every evening, a child who would have shut the book **gets a patient tutor that notices they’re stuck**—and walks them through until confidence returns.

### Medium term  
Kindling becomes the **default learning companion** across subjects: knows strengths, plans review, partners with parents and teachers.

### Long term  
**Private-tutor outcomes at population scale**—human mentors where only humans belong; Kindling for the infinite practice, scaffolding, and care in between.

---

## Slide 18 — Closing

# Kindling

**Ignite understanding.**

We’re not building a better answer engine.  
We’re building the tutor that **stays**—especially when learning is hard.

### Contact

| | |
|---|---|
| Email | `[founders@kindling.example]` |
| Deck / data room | `[link]` |
| Demo | `[calendly / passworded demo]` |
| Product docs | README · CAPABILITIES |

---

# Appendix (for data room / Q&A)

## A. Product differentiation checklist

- [x] Streaming adaptive lessons  
- [x] Profile & curriculum-aware tutoring  
- [x] Real-time struggle detection  
- [x] Offer + auto intervention modes  
- [x] Student-controlled exit from guide mode  
- [x] Learning event schema & profile pipeline  
- [x] Family-facing progress surfaces  
- [x] Rich pedagogical rendering (math/code/structure)  
- [x] Voice I/O foundations  
- [ ] Longitudinal RCTs / learning outcome studies *(post-funding)*  
- [ ] Multi-child parent accounts *(roadmap)*  
- [ ] School admin & SSO *(roadmap)*  

## B. Key risks & mitigations

| Risk | Mitigation |
|------|------------|
| LLM hallucination / wrong math | Correctness checkers; domain playbooks; human escalation |
| Child safety | Age-aware policies, filters, parental controls, incident process |
| Inference costs | Tiered models; session design; pricing that matches usage |
| Commoditization by big tech | Own pedagogy, data flywheel, brand trust, school relationships |
| Low retention | Intervention quality, spaced review, parent loops, goal setting |

## C. Metrics that matter (operating cadence)

| Metric | Why |
|--------|-----|
| WAU / MAU learners | Habit |
| Sessions / learner / week | Engagement depth |
| Intervention offer → accept rate | Feature value |
| Post-intervention success (correct within N turns) | Pedagogy works |
| D30 retention | PMF proxy |
| Parent NPS | Willingness to pay & refer |
| Gross margin after AI COGS | Business viability |
| CAC payback | Growth efficiency |

## D. Suggested 12-slide cut (for live pitch)

1. Title  
2. Problem  
3. Solution  
4. Product / demo  
5. Why now  
6. Market  
7. Business model  
8. Go-to-market  
9. Competition  
10. Traction  
11. Team  
12. Ask  

Keep this full Markdown as the **long-form leave-behind**.

## E. One-paragraph blurb (email / AngelList)

> Kindling is an AI private tutor that teaches Socratically, tracks how each learner thinks and feels in real time, and steps in with a step-by-step guide when they’re stuck—then lets them return to practice on their own terms. Built for families who want private-tutor quality without private-tutor prices, Kindling combines adaptive learning intelligence, curriculum-aware personalization, and presentation-grade explanations. We’re raising to deepen learning science, trust & safety, and parent distribution.

---

*Kindling pitch materials — align numbers and team before investor distribution. Market sizes and pricing in this deck are directional unless replaced with sourced research.*
