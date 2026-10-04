# Kindling — Session eval rubric (Epic C8.3)

**Status:** C8.3 manual rubric **shipped**; C8.1 offline auto scorer **shipped**; C8.2 weekly sample job **shipped**. Remaining work = human-label calibration and decision-compliance depth, not building the harness from scratch.  
**Goal:** Score **10 recorded sessions** with humans, store means as a baseline, compare to auto scores.

Related: L2 `pedagogy.decision` events · L3 ADI · L1 learner state · L4 independence · practical how-to / real-world dimensions.

---

## Why this exists

Kindling’s learning-intelligence layer (state → ADI → policy) is only as good as measured outcomes. C8.3 is a **human rubric** on real sessions so we can:

1. Spot systemic tutor failures (shame tone, answer-dumping, late help).  
2. Measure **decision compliance** (did the LLM execute the L2 action?).  
3. Feed **C8.1** with labeled ground truth.

Evaluate the **system**, never the child. Notes must not shame learners.

---

## Protocol (10-session cohort)

1. **Dogfood or beta:** complete ≥10 real lessons with turn data + events.  
2. **Export sample:**

   ```bash
   cd backend
   python manage.py eval_sample_export --limit 10 --out eval_samples --cohort beta-c8.3
   ```

3. **Score each session** (1–5 per dimension, blank if not observable):

   ```bash
   python manage.py eval_score --session-id <SESSION_ID> --cohort beta-c8.3 --scorer yourname \
     --scores socratic=4,hint=4,timing=3,decision=4,affect=5,mc=3,realworld=4,independence=4,persistence=4,overall=4 \
     --notes "Short free-text; no student shame"
   ```

   Or fill `eval_samples/<id>.json` → `scoreSheet.dimensions[].score` and:

   ```bash
   python manage.py eval_score --from-json eval_samples/<id>.json --cohort beta-c8.3
   ```

4. **Report:**

   ```bash
   python manage.py eval_report --cohort beta-c8.3 --out eval_samples/report.md
   ```

5. When **10/10** are scored, treat dimension means as the **C8.1 baseline**. Automate the weakest dimensions first.

Admin UI: **Learning → Manual session evals (C8.3)**.

---

## Dimensions (v1)

| Id | Label | What “5” looks like |
|----|--------|---------------------|
| `socratic_fidelity` | Socratic fidelity | Guide-before-give; one question at a time |
| `hint_quality` | Hint / scaffold quality | Right-sized, not spoilers |
| `intervention_timing` | Intervention timing | Help after struggle, not random full guides |
| `decision_compliance` | Decision compliance (L2) | Tutor executes logged `pedagogy.decision` |
| `affect_respect` | Affect & respect | Warm, no shame; handles frustration |
| `misconception_handling` | Misconception handling | Gentle rework + check |
| `real_world_clarity` | Real-world clarity | Everyday hooks / clear models |
| `independence_orientation` | Independence (L3) | Fades help when ready; healthy scaffolds OK |
| `persistence_support` | Persistence support | Notices effort / bounce-backs |
| `overall_learning_quality` | Overall learning quality | Holistic pilot bar |

**Scale:** 1 = weak / harmful pattern · 3 = adequate · 5 = excellent for pilot.

**Aliases for CLI:** `socratic`, `hint`, `timing`, `decision`, `affect`, `mc`, `realworld`, `independence`, `persistence`, `overall`.

---

## Auto evidence (scorer hints)

Exports attach:

- Turn previews (student / tutor snippets)  
- `pedagogy.decision` actions  
- Intervention lifecycle events  
- ADI snapshots  
- Struggle + misconception events  

These **do not auto-score** (that is C8.1). They speed human review.

---

## C8.1 — Automated offline scorer

Heuristic scorer on the same dimensions (`learning/eval_scorer.py`).

```bash
# Preview last 10 sessions
python manage.py eval_auto_score --limit 10

# Persist under cohort auto-c8.1
python manage.py eval_auto_score --limit 10 --save --cohort auto-c8.1

# Report
python manage.py eval_report --cohort auto-c8.1 --out eval_samples/auto_report.md

# Compare against human C8.3 labels (per-dimension MAE, bias, agreement, and sample readiness)
python manage.py eval_auto_score --limit 20 --compare-cohort beta-c8.3
```

The comparison uses only non-automated score rows from the named cohort and only sessions shared by the automated run and human labels. The report includes per-dimension MAE, signed bias (positive means the heuristic scores higher), exact agreement, within-one-point agreement, and whether at least 10 matched human-scored sessions are available. Fewer than 10 matches are diagnostic only and do not count as calibration.

**Notes:** Scores are pilot heuristics (questions vs dumps, shame/warm lexicon, decision-action text cues, ADI/intervention events). Use the per-dimension summary to choose what to inspect, then spot-check transcripts and improve weak dimensions. A sufficient sample is a readiness threshold, not evidence by itself that the scorer is valid.

### C7 playbook spot-check cues

C8.1 session results, C8.2 weekly reports, and C8.3 manual score-sheet exports include a supplemental `playbookAudit` for math/algebra and science sessions. Math cues cover representation, sequenced steps, understanding checks, and fade/transfer invitations. Science cues cover scientific representations, evidence/reasoning, investigation sequence, understanding checks, and prediction/transfer.

These cues are **not rubric dimensions or quality scores**. Their absence does not prove a playbook was ignored: a session may not need a visible model or a transfer prompt. Surface phrase matches also cannot establish scientific accuracy. Review the transcript and judge whether the selected scaffold fit the topic, learner, and moment.

## C8.2 — Weekly eval sample job

Scheduled pipeline (also runnable manually):

```bash
# Preview (no DB / no files)
python manage.py eval_weekly_sample --dry-run
python manage.py run_job weekly_eval_sample --dry-run

# Persist scores + write MEDIA/eval_reports/auto-weekly-YYYY-Www_*.md
python manage.py eval_weekly_sample
python manage.py run_job weekly_eval_sample

# List recent weekly cohorts
python manage.py eval_weekly_sample --list-cohorts

# Cron (with other jobs)
python manage.py run_scheduled_jobs
```

- **Interval:** 7 days (`KINDLING_JOBS["weekly_eval_sample"]`)
- **Cohort:** `auto-weekly-YYYY-Www` (ISO week)
- **JobRun result:** counts + means only (no transcript PII)

## After C8.2

| Next | Work |
|------|------|
| **C8.1+** | Collect ≥10 matched human C8.3 labels and review the per-dimension calibration report (`--compare-cohort`) |
| **L4** | Independence twins — separate product metric |
| **C1+** | Spaced review depth |

---

*Rubric version: 1 · Target sample: 10 sessions · Epics: C8.3 + C8.1 + C8.2*
