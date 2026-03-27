# LaunchPilot

AI-powered marketing autopilot for indie hackers and solo developers. Paste your URL → get a complete marketing plan with generated content → approve and launch.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** (PostgreSQL, Auth, RLS)
- **Claude API** (Sonnet for generation, Haiku for classification)
- **Stripe** (subscriptions, 7-day free trial)
- **Tailwind CSS**
- **Cheerio** (server-side site crawling)
- **Vercel** (deployment + cron jobs)

## Getting Started

### 1. Clone and install

```bash
git clone <repo>
cd launchpilot
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + `STRIPE_WEBHOOK_SECRET`
- Stripe price IDs for each plan

### 3. Set up Supabase

```bash
# Install Supabase CLI
npx supabase login
npx supabase link --project-ref <your-project-ref>

# Run migrations
npx supabase db push
```

Or paste the SQL from `supabase/migrations/` directly into the Supabase SQL editor.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

### Content generation pipeline

1. User pastes URL → `/api/analyze` crawls it with Cheerio, sends to Claude Sonnet
2. Claude returns structured `MarketingBrief` JSON (product, customer, keywords, channels)
3. User confirms/edits brief → `/api/generate-plan` creates 30-day plan with action items
4. `/api/bulk-generate` generates actual content for each item using channel-specific generators
5. Content lands in approval queue → user approves/edits → marked as approved
6. Vercel Cron at 9am UTC auto-publishes `auto_executable` approved items

### File structure

```
src/
├── app/
│   ├── (auth)/          # Login, signup
│   ├── (dashboard)/     # Main app (auth-gated)
│   │   ├── sites/       # Site list + add site
│   │   ├── sites/[id]/  # Dashboard, brief, plan, queue, content, activity
│   │   └── settings/    # Account + billing
│   ├── api/             # All API routes
│   └── page.tsx         # Public landing page
├── components/
│   ├── ui/              # Base components (Button, Card, Badge, Input, etc.)
│   ├── content/         # ContentCard (approval queue)
│   ├── dashboard/       # Sidebar, StatCard
│   └── sites/           # AnalysisProgress, MarketingBriefCard
├── lib/
│   ├── claude.ts        # Claude API wrapper with retry + JSON parsing
│   ├── analyzer.ts      # Cheerio site crawler
│   ├── stripe.ts        # Stripe config + pricing plans
│   ├── supabase.ts      # Server-only Supabase client
│   ├── supabase-browser.ts  # Client-side Supabase
│   └── generators/      # Channel-specific content generators
│       ├── blog.ts
│       ├── twitter.ts
│       ├── reddit.ts
│       ├── email.ts
│       ├── tiktok.ts
│       ├── directory.ts
│       └── plan.ts
└── types/index.ts       # All TypeScript interfaces
```

## Pricing

| Plan | Price | Sites | Content/mo | Channels |
|------|-------|-------|------------|---------|
| Starter | $29/mo | 1 | 10 | Blog + Directories |
| Growth | $79/mo | 3 | 50 | All channels |
| Agency | $199/mo | 10 | Unlimited | All channels |

Free trial: 7 days of Growth, no credit card.

## Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set env vars
vercel env add ANTHROPIC_API_KEY
# ... (add all env vars)
```

The `vercel.json` configures cron jobs:
- `GET /api/cron/generate-scheduled` — daily at 6am UTC (auto-generates pending content)
- `GET /api/cron/publish-approved` — daily at 9am UTC (publishes auto-executable items)

Set `CRON_SECRET` env var to secure cron endpoints.

## Phase 2 (not yet built)

- Real publishing integrations (Twitter API, email sending via Resend, etc.)
- Analytics tracking (which content drives signups)
- A/B testing for copy variations
- Team collaboration features

## License

MIT
