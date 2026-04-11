# AI Ad Studio

🚀 Turn any product URL into a fully generated ad video (script, scenes, voiceover, and visuals)

🔗 Live Demo: https://ai-adtool.vercel.app/studio

---

### ✨ What it does
- Paste a product or business URL  
- AI generates a complete ad (script + scene direction + visuals)  
- Auto voiceover + multi-scene video  
- Fully editable timeline (text, styling, audio, layout)  
- Export-ready ad creatives  

---

### 🧠 Why it’s interesting
This project is not just ad generation — it’s a full **AI creative pipeline** combining:
- content extraction  
- structured generation (director-style planning)  
- programmatic video rendering  

Built to explore how AI can compress the entire ad creation workflow into seconds.


**AI-assisted video ad authoring** — turn a brand URL into a multi-scene storyboard, editable timeline, and exportable **16:9** creative. Built as a production-minded **Next.js** app with **Remotion** for programmatic video, **Gemini** for planning and copy, and **PostgreSQL** for project state.

---

## Why this exists

Marketing and growth teams iterate on short-form ads constantly. This prototype **compresses the loop**: scrape on-brand assets from a site, let an LLM propose **scenes, headlines, and voiceover**, refine in a **multi-track editor**, then **generate narration** and **export MP4** when infrastructure allows. It is a credible foundation for a product demo, technical interview walkthrough, or investor narrative around **generative + structured** creative tooling.

---

## What you can do (feature surface)

| Area | Capability |
|------|------------|
| **Ingestion** | Scrape marketing pages via **Firecrawl**; extract images (markdown + `og:image`), contact hints, and brand context. |
| **Planning** | **Google Gemini** produces a validated **director plan**: scenes, copy, `productImageUrls`, brand kit fields — with rules for duration, CTA end card, and TTS-safe voiceover. |
| **Images** | Server-side enrichment ranks **on-site** imagery first; optional **SerpApi** Google Images and curated niche stock only to fill gaps (automotive and other verticals have guardrails). |
| **Voice** | **Unreal Speech** API generates timeline voiceover (MP3); uploads go to **Vercel Blob** in production (no writing under `/public` on serverless). |
| **Editor** | **Zustand** + **Immer** timeline: visual / audio / text tracks, Remotion **Player** preview, director panel, export modal. |
| **Export** | **Remotion** composition + **Vercel Sandbox** pipeline (with Blob upload) for MP4 output; hobby-tier limits apply (`maxDuration`, bundle size). |
| **Persistence** | **Prisma** + **PostgreSQL**: projects, tracks, clips, JSON metadata for brand and export settings. |

---

## Tech stack

- **Framework:** [Next.js 15](https://nextjs.org) (App Router, React 19, Server Actions, Route Handlers)
- **Language:** TypeScript 5
- **UI:** Tailwind CSS 4, Radix primitives, shadcn-style components, Framer Motion, Lucide
- **Video:** [Remotion 4](https://www.remotion.dev) (`@remotion/player`, `@remotion/media`, CLI bundle, `@remotion/vercel` for cloud render path)
- **AI & data:** `@google/generative-ai`, Zod for schema validation / repair flows
- **Database:** Prisma 7 + `pg` (adapter pattern); schema under `prisma/schema.prisma`
- **Cloud (optional deploy):** Vercel Blob, Vercel Functions (`waitUntil`), Vercel Sandbox
- **Tooling:** ESLint (Next core-web-vitals), Node **≥ 22** (see `.nvmrc`)

---

## Architecture (high level)

```
Landing / Studio entrance → URL scrape (Firecrawl)
    → Image candidate ranking + optional Serp
    → Gemini director + neural script / VO policy
    → Timeline hydrate (build-from-director)
    → Editor (Remotion preview, actions, Blob-backed media)
    → Export API (bundle + sandbox render + Blob URL)
```

Serverless-sensitive paths (large dependencies) are isolated where possible — e.g. voice and export do not rely on shipping ONNX-sized models on Vercel.

---

## Local setup

1. **Node:** `nvm use` (or install Node 22+).

2. **Install**

   ```bash
   npm install
   ```

3. **Environment** — copy `.env.example` → `.env` / `.env.local` and fill values:

   - `DATABASE_URL` — Postgres (local, [Neon](https://neon.tech), [Supabase](https://supabase.com), etc.)
   - `GEMINI_API_KEY` — [Google AI Studio](https://aistudio.google.com/)
   - `FIRECRAWL_API_KEY` — [Firecrawl](https://firecrawl.dev/)
   - `UNREALSPEECH_API_KEY` — [Unreal Speech](https://unrealspeech.com/) (voiceover)
   - Optional: `SERPAPI_API_KEY` if you use Google Images enrichment in code
   - Optional: `BLOB_READ_WRITE_TOKEN`, `VERCEL_OIDC_TOKEN` for export / local sandbox (see comments in `.env.example`)

4. **Database**

   ```bash
   npx prisma db push
   # or: npm run db:migrate
   ```

5. **Dev server**

   ```bash
   npm run dev
   ```

   Root `/` redirects to `/studio`. If `.next` misbehaves under cloud sync (e.g. OneDrive), use `npm run dev:clean` or set `NEXT_DIST_DIR` as documented in `.env.example`.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next dev server |
| `npm run dev:clean` | Clear `.next` then dev |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run vercel:remotion-snapshot` | Build Remotion bundle artifact (used with Vercel deploy flow) |
| `npm run db:*` | Prisma generate / migrate / studio |

---

## Deploying (Vercel)

- Connect the repo; set **all** env vars from `.env.example` for **Production** (and Preview if needed).
- Redeploy after changing env vars.
- For Remotion export on Vercel: follow `.env.example` — Blob token, optional `REMOTION_EXPORT_PUBLIC_URL` for audio proxy scenarios, and the documented **build** command that runs `vercel:remotion-snapshot` before `next build` if you use the snapshot workflow.
- **Hobby** limits apply to serverless `maxDuration` and bundle size; heavy local-only workflows belong in docs, not in the default server bundle.

---

## Repository layout (orientation)

| Path | Role |
|------|------|
| `src/app/` | Routes: `studio`, `studio/[projectId]`, `api/export-ad`, `api/remotion-audio-proxy`, server actions |
| `src/components/editor/` | Timeline, Remotion player, director panel, export modal, studio chrome |
| `src/components/studio/` | Entrance, scrape screen |
| `src/lib/services/` | Gemini director/refiner, Firecrawl, Unreal Speech, image enrichment, etc. |
| `src/lib/stores/` | Zustand stores (timeline, studio entrance) |
| `src/remotion/` | `AdStudioComposition`, entry, Root |
| `prisma/` | Schema & migrations |

---

## License & attribution

Private prototype (`"private": true` in `package.json`). Third-party APIs (Gemini, Firecrawl, Unreal Speech, Vercel, etc.) are subject to their respective terms.

---

*Built to demonstrate full-stack fluency: product thinking, LLM integration, video pipeline awareness, and deployable TypeScript on modern React.*
