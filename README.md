<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# ComplyVerse

An AI-powered compliance knowledge graph: upload contracts/policies, extract
structured obligations and risks with Gemini, explore them as a 3D knowledge
graph, ask grounded questions, and simulate the downstream impact of policy
changes.

## Architecture

```
React + Vite (frontend)
        │  fetch("/api/...")
        ▼
Vercel Serverless Functions (api/*.ts)
        │
        ▼
lib/  — shared modules used by every function
  ├─ gemini.ts          Gemini client (lazy singleton)
  ├─ agents.ts          Ingestion / Graph / Simulation / Evidence agents
  ├─ graphStore.ts       In-memory graph store + best-effort disk persistence
  ├─ documentParser.ts   PDF / DOCX / XLSX → plain text extraction
  ├─ upload.ts            multer (memory storage) + serverless middleware runner
  └─ http.ts              raw JSON body reader (used where bodyParser is disabled)
```

Every route the frontend calls maps 1:1 to a file in `api/`:

| Frontend call                       | Function                        |
|--------------------------------------|----------------------------------|
| `GET /api/status`                    | `api/status.ts`                  |
| `POST /api/documents/upload`         | `api/documents/upload.ts`        |
| `POST /api/documents/commit`         | `api/documents/commit.ts`        |
| `GET /api/graph/export`              | `api/graph/export.ts`            |
| `GET /api/graph/node/:id`            | `api/graph/node/[id].ts`         |
| `GET /api/graph/search?q=...`        | `api/graph/search.ts`            |
| `DELETE /api/graph/reset`            | `api/graph/reset.ts`             |
| `POST /api/simulate`                 | `api/simulate.ts`                |
| `GET /api/evidence/feed`             | `api/evidence/feed.ts`           |

`server.ts` is a **local-development-only** convenience wrapper: it mounts the
exact same handler modules behind Express (plus Vite's dev middleware for
HMR), so there is a single source of truth for route logic and `npm run dev`
behaves identically to the deployed Vercel functions. It is never bundled or
used in production.

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and optionally set `GEMINI_API_KEY` (the app
   runs fine without it — every agent falls back to deterministic, realistic
   responses so you can demo the whole product with zero API calls)
3. Run the app: `npm run dev`
4. Open `http://localhost:3000`

Other scripts:
- `npm run build` — production frontend build (`dist/`)
- `npm run lint` — type-check the whole project (frontend, `api/`, `lib/`)
- `npm run clean` — remove `dist/`

## Deploy to Vercel

1. Push this repository to GitHub/GitLab/Bitbucket
2. Import it in [Vercel](https://vercel.com/new)
3. Set the `GEMINI_API_KEY` environment variable in Project Settings (optional
   but recommended for live AI responses instead of the fallback mode)
4. Deploy — no other configuration is required. `vercel.json` already
   describes the build command, output directory, and function settings, and
   every route in `api/` is picked up automatically as its own Serverless
   Function.

### A note on data persistence

`lib/graphStore.ts` persists the knowledge graph to disk so the app survives
process restarts. On Vercel, function filesystems are read-only except for
`/tmp`, and `/tmp` is local to a single function instance — it is **not**
shared across concurrent invocations or regions, and it's wiped on cold start.
This module already detects the Vercel environment and writes to `/tmp`
automatically, giving you working best-effort persistence for demos and light
traffic. For a durable, globally-consistent store under real production load,
swap `load()`/`persist()` in `lib/graphStore.ts` for a real database (e.g.
Postgres via Drizzle ORM, or Vercel KV) — every route and agent only calls the
public `graphStore` methods, so the storage backend can be swapped without
touching any other file.
