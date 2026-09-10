# Kindling — Money

**Purpose:** Canonical thinking on **pricing**, **unit economics**, and the **pre-seed raise**.  
**Commercial invariant:** one account = one learner = one seat. Parents or schools with multiple learners buy multiple seats.

| Related | Role |
|---------|------|
| [PITCH_DECK.md](./PITCH_DECK.md) | Investor narrative |
| [BETA_LAUNCH.md](./BETA_LAUNCH.md) | Paid beta ops & success metrics |
| `backend/kindling_platform/plans.py` | Plan catalog in code (keep aligned when you lock prices) |
| `frontend/src/constants/subscription.js` | Same catalog for the SPA |

> **Status:** Directional commercial design for pre-seed / beta. Not legal advice. Update code catalogs and Stripe products when you lock these numbers for launch.

---

## 1. What the customer is actually buying

Kindling is **not** “access to a chatbot.” The seat has two economic layers:

| Layer | What it is | Who pays the AI bill |
|-------|------------|----------------------|
| **Algorithm rent** | The Kindling product: Socratic tutor UX, struggle detection, intervention ladder, mastery, misconceptions, multi-step work, safety floor, resume, digests, session rhythm | Always Kindling (subscription) |
| **AI tokens** | Inference for chat, vision, TTS, etc. | **Platform plans:** Kindling, inside a monthly allowance. **BYOK plans:** the student (via their provider keys) |

**One-liner for parents and investors:**  
*You rent the tutor that knows how to teach. Tokens are either included in the plan or billed to the keys you bring.*

That framing matters:

- Free “forever” tiers that burn platform Gemini are a COGS trap.
- BYOK is not a free ride—it is **paying for the algorithm only**, while the family pays the model vendor directly.
- Platform tiers must price **algorithm + expected token envelope**, with hard caps so one heavy user cannot erase margin.

---

## 2. Plan catalog (recommended)

Your inputs: Spark free 30 days · Ember $100/mo · Forge $50/mo · BYOK algorithm rent $30/mo.

**Adjustment (with rationale below):** collapse pure BYOK into **Forge at $30**, keep **Ember at $99** as the flagship platform tier (same spirit as $100), and make **Spark a 30-day trial only**—not a permanent free plan.

| Plan | Price (USD / seat / month) | AI tokens | Who it’s for |
|------|----------------------------|-----------|--------------|
| **Spark** | **$0 for 30 days**, then must choose Forge or Ember | Limited **platform** allowance (trial caps) | Try the product risk-free |
| **Forge** | **$30** | **BYOK** — student pays providers; optional tiny platform overflow off by default | Power users, tech-forward families, pilots who already have API keys |
| **Ember** | **$99** | **Platform AI included** up to a monthly token/lesson envelope | Default family plan: nightly tutoring without managing keys |

**Yearly (optional, ~2 months free):**

| Plan | Yearly |
|------|--------|
| Forge | $300/yr ($25/mo effective) |
| Ember | $990/yr ($82.50/mo effective) |

**Not sold as a separate SKU:** “algorithm only at $30” **is Forge.** Adding both a $30 BYOK SKU and a $50 Forge would confuse checkout and undercut the ladder.

### Why these numbers (and what we changed)

| Your number | Recommendation | Why |
|-------------|----------------|-----|
| BYOK = **$30** | **Keep** as Forge | Fair rent for a full teaching system when Kindling does **not** pay inference. Comparable to a serious SaaS seat; far below one human tutor hour. |
| Forge = **$50** | **$30** (merged with BYOK) | At $50 BYOK vs $99 platform, the gap is still fine—but a third paid tier (“$30 algorithm / $50 Forge / $99 Ember”) is hard to explain. Put multi-provider routing + priority **inside $30 Forge**; raise later if demand is strong. |
| Ember = **$100** | **$99** | Same premium position. Anchors against **human tutors at $60–100/hr**: one month of Ember ≈ one hour with a private tutor, for nightly adaptive help. Round number in copy (“about $100/mo”) is fine. |
| Spark free forever | **Free 30 days only** | A permanent free tier with platform AI destroys margin and attracts abuse. Trial proves value; then pay. |

**If you prefer your original ladder exactly:** Spark trial → Forge **$49–50** (BYOK + advanced routing) → Ember **$99–100** (platform tokens). Do **not** also list a separate $30 plan unless Forge becomes pure BYOK at $30 and you drop the $50 rung.

### What’s included (product, not just price)

| Capability | Spark (trial) | Forge | Ember |
|------------|---------------|-------|-------|
| Live adaptive lessons | ✅ capped | ✅ | ✅ |
| Intervention ladder, mastery, pedagogy engines | ✅ | ✅ | ✅ |
| Platform AI (Kindling-paid tokens) | ✅ limited | ❌ default (BYOK) | ✅ envelope |
| BYOK / multi-provider | Optional light | ✅ full | ✅ optional |
| Advanced per-task routing | — | ✅ | ✅ |
| Homework photo help | Limited | ✅ | ✅ |
| Guardian email digests | — | ✅ | ✅ |
| Priority support | — | — | ✅ |
| Soft daily lesson / token caps | Strict | N/A (their keys) | Soft + hard monthly envelope |

---

## 3. Token economics (how not to lose money)

### 3.1 Principle

```
Ember price  ≥  algorithm value + expected P95 token COGS + support + payment fees + margin
Forge price  ≥  algorithm value + support + fees + margin   (tokens paid by user)
```

Target **gross margin after AI COGS ≥ 60%** on Ember at median usage; **≥ 70%** on Forge (almost no inference COGS).

### 3.2 Rough COGS intuition (order of magnitude)

Actuals depend on model mix (Flash vs Pro), TTS, vision, and session length. Directional only:

| Usage pattern | Sessions / mo | Ballpark platform AI COGS |
|---------------|---------------|---------------------------|
| Light | 8–12 short lessons | ~$2–8 |
| Target nightly | 16–24 medium lessons | ~$8–25 |
| Heavy + TTS + photos | 30+ long sessions | ~$25–60+ |

At **$99 Ember**, median nightly use can stay healthy if you:

1. **Default cheap-capable models** for routine turns; escalate model only when needed.
2. Publish a clear **monthly envelope** (e.g. “~X full lessons or YM tokens—enough for nightly homework help”).
3. Enforce **soft cap → warn → hard cap** (upgrade prompt, not silent $500 bills).
4. Prefer **Forge (BYOK)** for power users who would otherwise blow the envelope.

Beta metric from [BETA_LAUNCH.md](./BETA_LAUNCH.md): keep platform AI cost **&lt; ~40% of ARPU** on Ember while learning true distributions—then tighten envelopes.

### 3.3 Suggested Ember envelope (v1 — tune in beta)

| Control | v1 suggestion |
|---------|----------------|
| Soft monthly AI budget | ~$25 COGS equivalent per seat |
| Hard monthly AI budget | ~$40 COGS equivalent per seat |
| Soft daily lessons | ~4 started lessons / day |
| Hard daily | ~6; then “come back tomorrow” or offer Forge |

Copy for families: *Ember includes AI for regular nightly tutoring. Extreme all-day use may pause until the next cycle—or switch to Forge and use your own keys.*

### 3.4 Spark trial caps (protect the funnel)

| Control | v1 suggestion |
|---------|----------------|
| Duration | 30 days from signup |
| Platform AI | Tight daily + lifetime trial budget (e.g. ~$5–8 total COGS / trial) |
| After day 30 | Read-only or blocked lessons until Forge/Ember |

No open-ended free platform AI.

### 3.5 Forge / BYOK

- Student (or payer) attaches keys; **provider invoices them**.
- Kindling charges **$30/mo algorithm rent** only.
- Optional: paid platform “overflow pack” later—not required for v1.
- Abuse risk is low on tokens; still rate-limit API/product misuse.

---

## 4. Positioning vs alternatives

| Alternative | Typical spend | Kindling angle |
|-------------|---------------|----------------|
| Human tutor | $60–100 / hour | Ember ≈ **one tutor hour per month**, every night |
| ChatGPT Plus / generic AI | ~$20 / mo | Answers ≠ teaching system, child UX, mastery, family loop |
| Cheap homework apps | $5–15 / mo | Kindling is **outcomes and rescue**, not worksheets |
| Tutor marketplace | High + scheduling | Always on; no calendar |

**Ember at ~$100 is premium consumer EdTech.** It is reasonable **if** the demo shows stuck → teach → mastery and parents already pay for tutoring. It is **wrong** if you market against free ChatGPT without a sharp wedge. Lead with the stuck moment, not “AI chat.”

**Forge at $30** is the honest “I bring my own model spend” seat—attractive to builders and cost-conscious technical parents.

---

## 5. Packaging rules

1. **Per learner, always.** Two kids = two seats (2× Forge or 2× Ember or mix).
2. **Payer may differ from learner** (parent card, student account)—still one seat in product.
3. **Institutions:** volume = N seats; optional future bulk discount (e.g. 10% at 25+ seats)—never a classroom SKU.
4. **No multi-child household plan.**
5. **Exam packs (later):** seasonal add-on ($20–40 one-time) on top of a seat—not a substitute for subscription.
6. **Refunds / cancel:** standard monthly cancel end-of-period; trial requires card-on-file preferred for conversion measurement.

---

## 6. Unit economics snapshot (planning targets)

| Metric | Target |
|--------|--------|
| Blended paid ARPU | $55–85 early (mix of Forge + Ember); higher as Ember share grows |
| Ember AI COGS / revenue | &lt; 40% in beta; &lt; 25–30% at scale with routing |
| Forge COGS / revenue | &lt; 10% (infra + support; no model bill) |
| Payment fees | ~3% + fixed |
| Support | Keep &lt; 1 critical ticket / student / week (beta) |
| LTV:CAC (steady state) | &gt; 3:1 after paid acquisition exists |
| Payback | &lt; 6 months once growth spend starts |

**Example month (illustrative, not a forecast):**

| Mix | Seats | MRR |
|-----|-------|-----|
| 40 Forge × $30 | 40 | $1,200 |
| 60 Ember × $99 | 60 | $5,940 |
| **100 paid seats** | | **~$7,140 MRR** |

Path to meaningful revenue is **retention and Ember conversion**, not vanity signups on Spark.

---

## 7. Pre-seed raise

### 7.1 Stage truth

- Working full-stack product (not slideware)
- Pre-revenue / private demo until paid beta
- Consumer EdTech (trust + safety + longer sales cycles than pure B2B SaaS)
- Moat path = session data × intervention policy × curriculum graphs × trust—not the base LLM

### 7.2 Recommended ask

| | Recommendation |
|--|----------------|
| **Round** | Pre-seed |
| **Raise** | **$1.0M – $1.5M** |
| **Primary target** | **$1.25M** (single number for decks/applications) |
| **Runway goal** | **15–18 months** to paid beta → PMF metrics → seed decision |
| **Instrument** | SAFE (or standard pre-seed equity); uncapped or reasonable cap per counsel / market |
| **Valuation** | Market-dependent; do not invent a post-money on the deck until a lead sets terms. For planning only, many working-product pre-seeds clear roughly **$6M–$12M post** range—**use live comps, not this doc, in negotiation.** |

### 7.3 Why not lower / higher

| Ask | When it fits | Risk |
|-----|--------------|------|
| **$500–750k** | Ultra-lean solo, heavy BYOK beta, minimal paid acquisition | May force a bridge before PMF; little room for safety + eval + mistakes |
| **$1.0–1.5M** | **Default for Kindling** | Enough for hostable prod, paid beta cohort, learning-science eval, light parent acquisition, 2–3 people + AI COGS buffer |
| **$2M+** | Multiple founders, clear early revenue, or aggressive multi-geo | Harder pre-revenue; more dilution / higher bar without traction |

### 7.4 Use of funds (indicative split on $1.25M)

| Bucket | ~% | What it buys |
|--------|----|--------------|
| Product & pedagogy | 35% | Wave 2 depth, eval harness, domain packs, intervention quality |
| Infrastructure & safety | 15% | Prod host, Postgres, monitoring, safety/privacy hardening, AI caps |
| AI / COGS buffer | 15% | Platform tokens for beta + Ember early adopters while pricing learns |
| GTM & research | 20% | Paid beta ops, parent acquisition tests, interviews, content |
| People / ops | 10% | Founder subsistence / first hire or contractors |
| Reserve | 5% | Surprise compliance, incidents, runway slip |

### 7.5 What “good” looks like before the next round

From beta north stars (see [BETA_LAUNCH.md](./BETA_LAUNCH.md)):

- Paid seats with real collection (not only comps)
- Sessions / learner / week and D14/D30 retention that imply habit
- Intervention accept → success tracked
- Ember AI COGS under control
- Qualitative “would miss it” from learners (and payers)

Seed then funds **scale acquisition + deeper curriculum coverage**, not “find out if tutoring matters.”

### 7.6 Deck one-liner

**Raising $1.25M pre-seed · 15–18 months runway · paid beta → PMF on the struggle→teach loop · algorithm rent + token-aware plans (Forge $30 BYOK / Ember $99 platform).**

---

## 8. Implementation checklist

When you lock this for launch:

- [ ] Update `backend/kindling_platform/plans.py` prices, taglines, entitlements, caps  
- [ ] Update `frontend/src/constants/subscription.js` to match  
- [ ] Stripe products: Spark trial, Forge monthly/yearly, Ember monthly/yearly  
- [ ] Enforce trial end, Ember envelope, Forge BYOK-default routing  
- [ ] In-app copy: algorithm rent vs included tokens (no surprise bills)  
- [ ] Refresh [PITCH_DECK.md](./PITCH_DECK.md) / PPTX ask line with **$1.25M** when ready  
- [ ] Beta: invoice or Checkout per [BETA_LAUNCH.md](./BETA_LAUNCH.md) P0.7  

---

## 9. Open decisions (do not block the doc)

| Topic | Options | Lean |
|-------|---------|------|
| Card on file for Spark trial | Required vs optional | **Required** for clean conversion data |
| Ember hard-cap behavior | Pause vs auto-offer Forge vs paid top-up | Pause + Forge CTA in v1 |
| Geographic pricing | Single USD vs PPP | Single USD for beta geo |
| Student vs parent invoice name | Either | Whoever pays; seat still = learner |
| Forge at $30 vs $49 | Simple ladder vs more ARPU | **$30** until sold out on value |

---

## 10. Summary

| Item | Number |
|------|--------|
| Spark | **$0 · 30-day trial** (capped platform AI) |
| Forge | **$30/mo** — rent Kindling algorithm · **BYOK tokens** |
| Ember | **$99/mo** — algorithm + **included platform token envelope** |
| Seat model | **1 learner = 1 subscription** |
| Pre-seed raise | **$1.0–1.5M** (target **$1.25M**) · **15–18 mo** runway |

**Pricing thesis:** families pay for a **tutor that stays when learning is hard**. Tokens are either **metered inside Ember** or **owned by the user on Forge**. Never give away unlimited platform inference for free.

*Update this file when beta COGS and conversion data replace assumptions.*
