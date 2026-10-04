# Kindling — Frontend

React + Vite SPA for the Kindling adaptive tutoring platform.

For monorepo setup, demo login, pedagogy features, and roadmap, start at the **[root README](../README.md)**. Product inventory: [CAPABILITIES.md](../CAPABILITIES.md). API detail: [backend/README.md](../backend/README.md).

---

## Stack

- **React 19** + **Vite**
- **Lucide** icons, vanilla CSS design system
- **AI gateway** (`src/services/ai/`) — platform Gemini and/or BYOK (Gemini, OpenAI-compatible, Anthropic, Groq, OpenRouter)
- Learning analytics, intervention ladder, L1–L4 intelligence, practical how-to guides, and pilot pedagogy engines under `src/services/learning/`

---

## Quick start

```bash
cd frontend
npm install
```

Create `.env` (optional if you only use BYOK in **Settings → AI providers**):

```env
VITE_API_URL=http://127.0.0.1:8000
```

```bash
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). Run the Django API in parallel for auth, subjects, mastery, digests, and resume (see root README).

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Django API base (recommended) |
| `VITE_LEARNING_API_URL` | Optional override for event ingest |
| `VITE_TELEMETRY` | Set `false` to disable client error/metric posts |

---

## Project structure

```
frontend/
├── src/
│   ├── components/     # Lesson, dashboard, auth, subjects, settings, overview
│   ├── hooks/          # Auth, chat, learning, assessment, independence, multi-step, speech
│   ├── services/
│   │   ├── ai/         # Multi-provider gateway + key vault
│   │   ├── api/        # REST client
│   │   ├── learning/   # Signals, L1–L4, policy, how-to guides, assessment, …
│   │   └── safety/     # Age policy + distress client
│   ├── styles/         # Lesson + tutor content CSS
│   ├── App.jsx
│   └── main.jsx
├── scripts/            # Pedagogy smokes + Playwright verifies (L1–L4, C6, how-to, …)
├── package.json
└── vite.config.js
```

### Learning engines (high signal)

| Module | Role |
|--------|------|
| `learnerState.js` | L1 structured snapshot |
| `pedagogicalPolicy.js` | L2 `decidePedagogy` + prompt execution brief |
| `adi.js` | L3 assistance dependency |
| `independenceCheck.js` | L4 no-scaffold / transfer twins |
| `practicalGuides.js` | Hands-on how-to library + prompt blocks |
| `tutorSuggestions.js` | Suggestion chips + real-world prompt rule |
| `assessmentEngine.js` / banks | C6 quick checks |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

Pedagogy smokes (see each file header for any bundle step):

```bash
node scripts/smoke-struggle-b1.mjs
node scripts/smoke-struggle-b2.mjs
node scripts/smoke-affect-b3.mjs
node scripts/smoke-worked-b4.mjs
node scripts/smoke-misconception-b5.mjs
node scripts/smoke-multistep-b6.mjs
```

---

## Main surfaces (SPA)

- **Overview**, **Auth / onboarding**, **My Subjects**, **Live lesson** (path + chat + tools)
- **Help ladder**, worked-example library, multi-step **Show your work**, manipulatives, homework photo
- **Dashboard** (mastery + family digest), **Settings** (AI providers / plans)
