# Kindling — Paid Student Beta Launch Checklist

**Product stance (permanent):** Kindling is an **individual student subscription** product. **One account = one learner = one seat.** The student (or an adult paying *for that seat*) subscribes. A parent with more than one child buys **a separate subscription per child**. Schools and learning institutions do the same—**N seats for N learners**—never a household or classroom product. Optional **email digests** are configured by the student (recipient can be a parent or teacher); there is no parent multi-profile login.

**Goal:** Run a careful **paid private beta** with ~**25 students** in one geography, prove retention and unit economics, then decide what to build next.

**Not the goal:** Family multi-seat SKUs, multi-child parent accounts, classroom/roster software, or “every subject equally deep.”

| Doc | Role |
|-----|------|
| [CAPABILITIES.md](./CAPABILITIES.md) | What the product is / wants to be |
| [PLAN.md](./PLAN.md) | Full multi-horizon plan — **Wave 1 shipped**; **Wave 2** = §15 (deploy + Phases 3–5) |
| **This file** | **Beta-only must-ship order** (subset of PLAN; product pedagogy mostly done) |

**Beachhead promise (say this, nothing broader):**  
*Kindling is your adaptive AI tutor—it notices when you’re stuck and teaches through it. Strongest today on Math Foundations (fractions → early algebra); you can add other subjects you need. Resume where you left off. Optionally share a weekly progress note with a parent or guardian.*

**Stage after this checklist:** private paid beta live · not “market ready at scale.”

---

## 1. Success criteria (exit beta successfully)

Ship only what moves these. Measure weekly. **Unit of analysis = student account.**

| Metric | Target (directional) | Why | Source today |
|--------|----------------------|-----|----------------|
| **Activated students** | 25 with ≥1 real lesson in week 1 | Top of funnel | Accounts + `session.started` metrics |
| **Sessions / student / week** | ≥3 median among actives | Habit | Learning sessions / telemetry |
| **D14 return** | ≥40% of activated students back in days 8–14 | Stickiness | Session timestamps |
| **Intervention accept → complete** | Track baseline; aim ≥50% accept when offered | Help is useful | `intervention.*` events |
| **Post-help success** | Noticeable lift vs pre-help miss streak | Pedagogy works | Graded turns + mastery |
| **Optional digest engage** | Among students who opt in a guardian email: ≥50% open or in-app view | Trust add-on works when used | Digest delivery + dashboard |
| **Paid conversion / collection** | 100% of cohort on trial→pay path or invoice paid | Real buyers (student or payer-for-student) | Stripe / invoice log |
| **Support load** | &lt;1 critical ticket / student / week | Ops viable | Shared inbox |
| **Gross margin feel** | Platform AI cost &lt; ~40% of ARPU on Ember | Unit economics | Provider usage + plan price |
| **NPS / interview** | ≥8 qualitative “would miss it” signals from **learners** (and payers if different) | PMF signal | 10 end-of-beta calls |

**Kill / pivot signals:** &lt;2 sessions/week after week 2, support dominated by “AI wrong / blank lesson,” or COGS blows past ARPU with no routing fix. Guardian digests being ignored is **not** a kill signal if students still return.

---

## 2. Scope fences (do not build in the beta window)

Explicitly **out** unless a design partner blocks without it:

| Out of scope | PLAN home | Why wait |
|--------------|-----------|----------|
| **Family / multi-seat subscriptions** | — | **Never** — one seat per child |
| **Multi-child parent hierarchy** | C2 | **Never** — digests via student-configured email only |
| Full classroom / rosters / LMS class product | C3 | **Never** — institutions buy individual seats |
| Multi-region compliance packs | Phase 5 | Legal program, not a sprint |
| Native apps | Phase 5 | PWA or responsive web is enough |
| Full duplex voice, whiteboard, video clips | Phase 4 | Delight, not activation |
| Full UI i18n / RTL | Phase 5 | One geo beta |
| Domain playbooks beyond pilot + light second pack | C7 | Depth &gt; breadth |
| Research-grade eval platform | C8 full | Lightweight rubric first |
| “Any subject is equally excellent” marketing | — | Honesty = trust |
| Wearables / voice-tone mood sensing | PLAN §16, Phase 4–5 | B7 text check-in is enough |
| VR, immersive labs, “virtual ancient city” | Phase 5 stretch | No activation value for pilot math |
| Global peer collaboration / multiplayer projects | Phase 5 | Fights 1:1 tutor promise |
| Employer/uni badge portfolios; heavy quests | Phase 5; G1 only post-C1 | Tutor-first, not game economy |
| External book/course recommenders | PLAN §16 | Needs curation bar first |
| Full mindfulness content library | Phase 4 P3 | B7 → existing L4 break/easier is enough |

**Progress digests (A5)** stay optional: the student turns them on and sets the recipient email (parent, teacher, or self). Do **not** invest any roadmap cycles in parent portals, household billing, classroom rosters, or multi-profile seat management.

**Do invest (thinly) in session rhythm** from [`SUGGESTIONS.md`](./SUGGESTIONS.md) / PLAN **Phase 2.5**: start check-in, end reflection, spaced review — these support D14 return without expanding scope fences above.

---

## 3. Must-ship vs nice-to-have

### P0 — Must ship before first paid student is live

| # | Work | PLAN map | Done when |
|---|------|----------|-----------|
| **P0.1** | **Staging/prod host** with HTTPS, health checks, env-based config | Phase 0.1, M0 | `GET /health/` green on public URL; FE points at API |
| **P0.2** | **Postgres** via `DATABASE_URL` (not SQLite) on staging/prod | Phase 0.1 | migrate + `seed_kindling` (or slim seed) on empty DB |
| **P0.3** | **Secrets & debug off** — `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, CORS for prod origins | Phase 0.1 | No insecure defaults in prod env |
| **P0.4** | **Backups** — automated DB dump + one restore drill documented | Phase 0.1 | Written runbook; restore tested once |
| **P0.5** | **Transactional email** — real SMTP/ESP (not console) for account/receipts + optional guardian digests | A5 | Test message delivers; digest path works when opted in |
| **P0.6** | **Cron** — `run_scheduled_jobs` on schedule (heartbeat, weekly_digest, retention hooks) | 0.5, A5 | Job status API shows recent success |
| **P0.7** | **Money path** — Stripe Checkout **or** documented invoice + manual `PlatformSubscription` activate **per student account** | kindling_platform | Student (or their payer) can pay or be marked paid without engineering each time |
| **P0.8** | **AI cost control** — server-held platform key preferred; daily soft/hard caps; clear “quota” UX | ENGINEERING gaps, plans entitlements | Cannot runaway-bill on one student |
| **P0.9** | **Beta access control** — invite list / flag / closed registration | Product | Random public signups cannot burn GPU budget |
| **P0.10** | **Support path** — shared inbox or form; in-app “Help / feedback”; severity rubric | Ops | Student knows how to reach a human in &lt;1 business day |
| **P0.11** | **Legal minimum** — Terms, Privacy, age-appropriate disclosures; link in app footer | SAFETY_AND_PRIVACY deepen | Counsel-reviewed or founder-accepted risk note on file |
| **P0.12** | **Incident basics** — who rotates keys, how to disable platform AI, status message | Ops | One-page runbook |

### P1 — Must ship in first 2 weeks of beta (or block expansion past ~10 students)

| # | Work | PLAN map | Done when |
|---|------|----------|-----------|
| **P1.1** | **Student progress clarity** — dashboard / mastery pulse feels owned by the learner; optional guardian digest remains one-click opt-in (not required) | A5 (optional) | Student can answer “how am I doing?” without a parent product |
| **P1.2** | **Spaced review v1** — schedule weak/rusty pilot skills; “Review spark” entry on dashboard / subjects | Phase 2.5 · **C1** | Learner sees auto-suggested review within 7 days of struggle |
| **P1.3** | **Onboarding for beta** — 5-minute path: profile → Math Foundations or custom subject → first lesson success | X + familiarity/goals | Time-to-first-helpful-turn &lt; 10 min for new student |
| **P1.4** | **Quota & failure copy** — calm banners when AI/API/quota fails; no blank chat | 0.3 | Already strong; verify on prod URLs |
| **P1.5** | **Homework photo on prod** — media storage (S3/compatible or durable disk), retention job enforced | A4 | Photo path works behind HTTPS; old files purge |
| **P1.6** | **Admin visibility** — Django admin or simple ops view: signups, last session, errors, safety events | 0.2 | You can answer “is tutoring healthy?” without SSH archaeology |
| **P1.7** | **Instrument beta metrics** — dashboard or weekly script for table in §1 (+ review / reflection funnels when shipped) | PLAN §17 | Friday metrics take &lt;30 minutes |
| **P1.8** | **Session-start energy check-in (thin)** — optional mood/energy chip on lesson open; low energy → softer pace or break/easier offer (reuse help L4) | Phase 2.5 · **B7** | Student can set energy once per session; low path changes first tutor turn or offers break without blocking start |
| **P1.9** | **End-of-session reflection** — short “what clicked / what’s next?” on wrap-up; skip always available; link to Review spark when due | Phase 2.5 · **B8** | Normal lesson exit can capture reflection in &lt;15s; next-step CTA sensible |

### P2 — Nice-to-have during beta (prioritize only if P0/P1 green)

| # | Work | PLAN map | Ship if… |
|---|------|----------|----------|
| **P2.1** | Polish **optional** guardian digest (preview send, clearer student-facing copy) | A5 | Students ask to share progress outward |
| **P2.2** | Second pedagogy thin-pack (e.g. one science or writing scaffold set) | C7 lite | &gt;40% of sessions leave math |
| **P2.3** | Lightweight **session quality rubric** (manual 10 sessions/week) | C8 lite | You need investor/teacher proof |
| **P2.4** | In-app **goals** reminder from topic `learning_goal` / familiarity (+ optional week focus line) | Phase 2.5 · **C5 lite** ✅ | First-session orientation feels weak |
| **P2.5** | PWA install + “add to home screen” | Phase 5 lite | Mobile Safari is majority traffic |
| **P2.6** | High-contrast / larger type toggle | Phase 4 a11y | Accessibility feedback appears |
| **P2.7** | Stripe customer portal (cancel/upgrade) on **student** subscription | Platform | Self-serve plan changes matter |
| **P2.8** | Human review flag on distress / repeated fail | C9 lite | Safety or trust incident |
| **P2.9** | **Light spark challenge** — optional “3 solid turns on a weak skill”; celebrate via sparks/persistence only (no badge inventory) | Phase 2.5 · **G1** ✅ | C1 live **and** learners ask for something to “beat” |

### P3 — Explicitly after beta decision

Multi-child / household / classroom products (**never**). Also after beta: C4 single-student standards export, C6 assessment modes, full C8 harness, Phase 4 multimodal/voice, Phase 5 gateway failover & optional per-seat school SSO, VR/collab/credential portfolios.

---

## 4. Suggested 6-week order

Assume **1–2 builders**. Collapse to 4 weeks by cutting P2 entirely and using **invoiced** payment instead of full Stripe portal.

```text
Week 1 — Make it hostable (M0)
  P0.1 Host + HTTPS + health
  P0.2 Postgres + migrations
  P0.3 Secrets / DEBUG / CORS / ALLOWED_HOSTS
  P0.4 Backup + one restore drill
  P0.9 Closed registration / invite gate
  P0.12 Incident runbook (draft)
  Smoke: demo login, one Math Foundations lesson on staging

Week 2 — Make it operable & billable (per student)
  P0.5 Real email (ESP)
  P0.6 Cron jobs (digest + heartbeat)
  P0.7 Stripe Checkout OR invoice playbook + admin activate (1 seat = 1 student)
  P0.8 Platform key server-side or strict capped proxy; daily caps
  P0.10 Support inbox + footer link
  P0.11 Terms + Privacy links
  Internal dogfood on staging as “Student 0”

Week 3 — Make students succeed on day one
  P1.3 Beta onboarding polish (familiarity + goal → first win)
  P1.1 Student-owned progress surfaces; digest stays optional
  P1.8 Session-start energy check-in (B7) — thin chip, reuse L4
  P1.9 End-of-session reflection (B8) — wrap-up card
  P1.5 Production media for homework photos
  P1.4 Prod failure-path QA (kill API key, kill network)
  P1.6 Ops views / telemetry summary habit
  Recruit 5 design-partner students (free or comped Ember)

Week 4 — Retention loop + first paid cohort
  P1.2 Spaced review v1 (C1) — highest product leverage left
  Wire B8 “what’s next?” → Review spark when due
  P1.7 Weekly metrics script / sheet (include review + reflection rates)
  Onboard students 6–15 (paid or trial-ending-in-pay)
  5 interview calls (30 min): stuck moments, lesson quality, pay willingness

Week 5 — Stabilize from real usage
  Fix top 3 support themes only
  P2.x only if a theme repeats (e.g. mobile install, digest polish, P2.4 goals)
  Harden caps / cost if COGS spiky
  Onboard students 16–25

Week 6 — Prove or adjust
  Full metrics read vs §1 targets
  5 more interviews + short NPS (learners first)
  Decision memo: expand geo / second domain pack / deepen review / pause
  Optional: P2.3 quality rubric sample for deck; P2.9 spark challenge only if asked
```

### 4-week compressed variant

| Week | Focus |
|------|--------|
| 1 | P0.1–P0.4, P0.9, P0.12 |
| 2 | P0.5–P0.8, P0.10–P0.11, dogfood |
| 3 | P1.1, P1.3–P1.6, **P1.8–P1.9** (B7/B8 thin), students 1–10 (invoice OK) |
| 4 | **P1.2 spaced review**, P1.7, students 11–25, decision snapshot |

Do **not** skip P0.2/P0.3/P0.8 or P1.2 if you care about paid retention. Prefer shipping **P1.8/P1.9** thin over polishing P2.

---

## 5. Epic mapping (PLAN → beta)

| Beta item | PLAN / epic | Beta depth |
|-----------|-------------|------------|
| Host + Postgres + secrets + backups | Phase 0.1, M0 | **Full for one env** |
| Observability / health | Phase 0.2 | Already ✅ — **use in prod** |
| Failure UX | Phase 0.3 | Already ✅ — **re-verify on prod** |
| Safety floor | Phase 0.4 | Already ✅ — add **legal links** |
| Jobs + optional digest email | 0.5, **A5** | Wire **real SMTP** + cron; keep opt-in |
| Resume, mastery, math check, homework, visuals, ladder, etc. | A1–A6, B1–B6 | **Already ✅** — protect quality, don’t rebuild |
| Spaced review | Phase 2.5 · **C1** | **v1 ✅** (pilot skills) — measure start→complete in beta |
| Session-start energy check-in | Phase 2.5 · **B7** | **✅** thin chip + low→L4/softer pace (**P1.8**) |
| End-of-session reflection | Phase 2.5 · **B8** | **✅** wrap-up card; link to review when due (**P1.9**) |
| Goals surface | Phase 2.5 · **C5 lite** | **✅** `learning_goal` / week focus; no exam planner (**P2.4**) |
| Light spark challenge | Phase 2.5 · **G1** | **✅** optional post-C1 (**P2.9**) |
| Parent / multi-child accounts | **C2** | ❌ **Never** — digest email only |
| Classroom / roster product | **C3** | ❌ **Never** — per-seat sales only |
| Eval harness | **C8** · Wave 2 Track P | Manual rubric sample in beta; automation post-beta |
| Assessment / 2nd domain pack | **C6** / **C7** · Wave 2 | Only if beta proves need |
| Billing | kindling_platform | **Per-student** checkout or invoice; multi-child = multi-checkout |
| AI gateway failover chains | Phase 5 · Wave 2 Track S | Caps + one reliable platform path first |
| VR / collab / credential badges | PLAN §16, Phase 5 | **Out of beta** — see scope fences |

**After beta decision:** use PLAN **§15 Wave 2**. Default next bets if retention is green: **C1+** review depth, **C6** assessment, Phase 4 diagrams/a11y, digest polish—not household or classroom software.

---

## 6. Student beta package (ops, not code)

Use the same package for every invite:

1. **Who:** One learner per account. Ideal ages ~9–16 for Math Foundations; older self-directed learners welcome. If under 13, payer/guardian consent per your legal baseline—still **one student seat**, not a family plan.  
2. **Offer:** 4–6 week Ember trial or $1–full-price test on **that student’s** subscription; card on file preferred.  
3. **Expect:** 3 short sessions/week; one homework photo optional; guardian digest **off by default** unless they want it. When live: optional energy chip at start, short wrap-up at end, Review spark if something was hard earlier in the week.  
4. **Promise boundary:** Best on fractions/early algebra; other subjects available but less “pack depth.”  
5. **Kickoff:** 15-min video or Loom — login, start lesson, Tools (hint ladder), Continue later; mention Review spark once C1 ships.  
6. **Check-ins:** Day 3 (activated?), Day 14 (still here?), Day 28 (interview).  
7. **Data:** Prefer real schoolwork; remind export/delete exists (`SAFETY_AND_PRIVACY.md`).  
8. **Feedback:** One channel only (e.g. `beta@…` or Form) tagged: bug / teaching / billing / other.

**Recruiting order:** your network → classmates/tutoring circles → 2–3 teacher referrers (students they know need 1:1 help). Avoid Product Hunt–style blasts until P0 is green and caps hold.

---

## 7. Launch day gate (go / no-go)

**Go** only if all are true:

- [ ] Staging **and** prod (or single prod) on Postgres; health green  
- [ ] `DEBUG=False`; secrets from env; backups verified once  
- [ ] Platform AI key not shipped in public frontend bundle **or** strict proxy + cap  
- [ ] Invite gate on; support inbox watched  
- [ ] Terms + Privacy linked; safety escalation still works on prod  
- [ ] One founder completed a full lesson + homework photo on prod as a **student**  
- [ ] Payment or invoice path tested end-to-end once **for one student account**  
- [ ] Cron healthy (heartbeat); digest dry-run OK if you keep A5 enabled  

**No-go** if any P0 row is wishful. Invite fewer students; do not “launch soft” on SQLite laptops.

---

## 8. Weekly operating rhythm (during weeks 3–6)

| Cadence | Action |
|---------|--------|
| **Daily** | Skim telemetry summary + error reports; unblock P0 outages same day |
| **2× week** | Triage support; ship only fixes that unblock sessions or billing |
| **Friday** | Fill §1 metrics; note top teaching failure mode |
| **Biweekly** | 3–5 **learner** interviews; update decision memo |
| **Never** | Household billing, parent multi-profile, classroom rosters, Phase 4 whiteboard, VR/collab/badge portfolios “because it’s cool” |

---

## 9. Decision memo template (end of week 6)

Copy into a short note:

1. Metrics vs §1 (table) — **per student**.  
2. What learners loved (quotes).  
3. What broke trust (wrong math, blank AI, confusing UX).  
4. COGS vs ARPU per seat.  
5. **Next bet (pick one primary):**  
   - (A) Spaced review depth + session-rhythm polish (B7/B8) + second domain pack  
   - (B) Broader acquisition (still closed beta)  
   - (C) Older self-serve learner GTM polish  
   - (D) Pause paid; fix quality  
6. Explicit **not doing** ever without strategy rewrite: multi-child accounts, classroom product; also not next month: VR/collab/credentials.

---

## 10. Checklist summary (print this)

### Before any paid student

- [ ] P0.1 Host/HTTPS/health  
- [ ] P0.2 Postgres  
- [ ] P0.3 Secrets / DEBUG  
- [ ] P0.4 Backups  
- [ ] P0.5 Real email  
- [ ] P0.6 Cron  
- [ ] P0.7 Pay or invoice **per student**  
- [ ] P0.8 AI caps  
- [ ] P0.9 Invite gate  
- [ ] P0.10 Support  
- [ ] P0.11 Legal links  
- [ ] P0.12 Incident page  

### Before scaling to 25

- [ ] P1.1 Student progress clarity (digest optional)  
- [x] P1.2 Spaced review v1 (**C1** shipped — measure in beta)  
- [ ] P1.3 Onboarding polish on prod  
- [ ] P1.5 Media on prod  
- [ ] P1.6 Ops visibility  
- [ ] P1.7 Weekly metrics  
- [x] P1.8 Session-start energy check-in (B7 shipped)  
- [x] P1.9 End-of-session reflection (B8 shipped)  

### Only if needed

- [x] P2.4 Goals surface lite (shipped)  
- [x] P2.9 Spark challenge (shipped)  
- [ ] Other P2.x from real complaints, not roadmap envy  

**Post-beta product backlog:** PLAN **Wave 2** §15 (not reinvented here).

---

## 11. Document control

| Field | Value |
|-------|--------|
| Based on | Market-readiness review + PLAN.md Wave 1 done / Wave 2 §15; SUGGESTIONS feasible slice |
| Commercial model | **Individual student subscription** (1 account = 1 learner) |
| Cohort | ~25 students, one geography |
| Horizon | 4–6 weeks to decision |
| Status | Active beta operating guide |
| Last updated | 2026-09-01 (single-seat commercial lock) |

*When this file and PLAN.md disagree on sequencing for the next six weeks, **this file wins**. When they disagree on long-term product vision, **CAPABILITIES.md** wins. Day-in-the-life ideas stay in **SUGGESTIONS.md** until promoted here/PLAN. Commercial model: student-first unless founders explicitly change it.*
