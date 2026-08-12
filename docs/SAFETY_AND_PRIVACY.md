# Kindling — Safety & Privacy Baseline

**Status:** Phase 0.4 child safety floor  
**Last updated:** 2026-08-12  

This document describes what Kindling stores, how child-safe tutoring is enforced today, and how learners (or guardians) can export or delete account data. It is a product baseline—not legal advice.

---

## 1. Product context

Kindling is an **AI tutoring product for learners**, including school-age children. Tutoring runs in the browser with Google Gemini for chat/TTS when configured. Learning analytics, profiles, and curriculum data may be stored on the Kindling Django API.

**Non-negotiable principles** (also in `CAPABILITIES.md` §5):

1. Respect the learner — normalize struggle; never shame.  
2. Guide before giving — Socratic by default.  
3. Safety and privacy scale with trust — especially for children.

---

## 2. Age-aware tutoring policies

Kindling derives a coarse **age band** from the learner’s grade label:

| Band | Typical grades | Policy stance |
|------|----------------|---------------|
| `child` | ~3rd–6th | Strictest: simple language, no mature themes |
| `teen` | ~7th–12th | School-appropriate; still no sexual/harmful content |
| `adult` | College / professional | Adult tone OK; still refuse illegal/harmful content |
| `unknown` | Missing grade | **Defaults to child-safe** |

### Enforcement today

1. **Tutor system prompt** — every lesson injects `buildAgeAwarePolicyBlock()` (`frontend/src/services/safety/policy.js`) into Gemini’s system instruction: no sexual content, no self-harm/weapons instructions, escalate distress to trusted adults, no shaming.  
2. **Server policy notes** — `GET /api/safety/policy/?grade=…` returns the age band and rule ids for ops/clients (`backend/core/safety.py`).  
3. **Not** a substitute for parental consent, age verification, or regulated COPPA/GDPR processes—those remain product/legal work for Horizon C.

---

## 3. Distress & content escalation

### Detection (client)

Before a student message is sent to the tutor model, Kindling runs lightweight pattern checks (`detectDistress` in `frontend/src/services/safety/distressDetector.js`).

| Severity | Behavior |
|----------|----------|
| **high** (suicide/self-harm ideation, abuse disclosure, clear crisis language) | **Do not call the AI.** Show a calm escalation card. Point to trusted adults and general crisis resources. Log a scrubbed safety event. |
| **low** | Optional future soft check-ins (not blocking today). |
| Academic venting (“I’m dying at this test”) | Filtered out when possible to reduce false positives. |

### Escalation UX

- Card copy is warm and non-shaming.  
- Kindling states it is a **tutor, not a counselor**.  
- Learner can pause tutoring or choose “I’m OK — go back to the lesson.”  
- International Association for Suicide Prevention resource index is linked as a generic locator: https://www.iasp.info/suicidalthoughts/

### Server audit

`POST /api/safety/events/` stores **category, code, severity, age band, session id** — **not** the raw student utterance. Events appear in Django admin (`SafetyEvent`) and structured logs (`event=safety.escalation`).

---

## 4. Data Kindling may hold

| Category | Examples | Where |
|----------|----------|--------|
| Account | Email, username, password hash | Django `User` |
| Student profile | Name, grade, school, curriculum, interests, avatar | `StudentProfile` |
| Curriculum | Custom subjects & topics | `Subject` / `Topic` |
| Learning analytics | Sessions, turns, events, mastery profile | `learning` app |
| Conversations | Chat transcripts / API history for resume | `TopicConversation` (+ browser `localStorage`) |
| Telemetry | Client errors, product metrics (scrubbed) | `ClientErrorReport`, `ProductMetric` |
| Safety events | Distress category codes only | `SafetyEvent` |
| Homework photos | Worksheet images + vision analysis JSON (Epic A4) | `HomeworkUpload` + `MEDIA_ROOT` |
| AI traffic | Lesson text / homework images to Gemini when the browser has an API key | Google (per Gemini terms) |

Browser **localStorage** may also cache profiles, conversation shelves, and learning event queues until cleared.

---

## 5. Export & delete (self-service API)

Authenticated endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/auth/export/` | JSON export of account + profile + learning data |
| `DELETE` | `/api/auth/account/` | Permanent account deletion (body: `{"confirm": true}`) |

Notes:

- The shared **demo account** (`student@kindling.edu`) cannot be deleted.  
- Deletion cascades student-owned curriculum and learning rows via ORM FKs.  
- Local browser caches are **not** wiped by the API—users should clear site data or log out after delete.  
- For manual requests, operators can use Django admin or these APIs.

Example:

```bash
# Export
curl -H "Authorization: Bearer $ACCESS" http://127.0.0.1:8000/api/auth/export/

# Delete
curl -X DELETE -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d "{\"confirm\": true}" \
  http://127.0.0.1:8000/api/auth/account/
```

---

## 6. Retention (current baseline)

| Data | Retention intent |
|------|------------------|
| Active account data | Until user deletes account or operator removes it |
| Learning events / sessions | Same as account (cascade on delete) |
| Safety events | Kept for safety review; operators may purge old rows |
| Client error telemetry | Operational; scrub PII at ingest |
| Homework images | Default **30 days** (`KINDLING_HOMEWORK_RETENTION_DAYS`); students may delete via API |
| LocalStorage | User device; survives until cleared |

No automated multi-year purge job yet (see Phase 0.5 / platform backlog).

---

## 7. Operator checklist

1. Review `SafetyEvent` in Django admin after production incidents.  
2. Confirm tutor prompts still include the safety block after prompt edits.  
3. Never paste full student crisis messages into third-party tickets—use category codes.  
4. Keep this doc linked from the root README.

---

## 8. Known limits (honest)

- Pattern-based detection will miss some crises and can false-positive rarely.  
- Gemini still generates free text; prompt policy reduces but does not eliminate risk.  
- No human moderation queue, parental consent flow, or regional data residency yet.  
- No formal DPA / subprocessors list in this baseline—add before commercial child deployments.

---

*Aligned with PLAN.md Phase 0.4 and CAPABILITIES.md §3.6.*
