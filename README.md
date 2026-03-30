# BreakthroughPilot

AI-powered marketing autopilot for indie hackers and solo developers. Paste your product URL, get a complete multi-channel marketing strategy with generated content, approve and publish — on repeat, automatically.

**Live:** [breakthroughpilot.com](https://breakthroughpilot.vercel.app)

## What it does

1. **Analyze** — paste your URL, the app crawls it and sends it to Claude to produce a structured `MarketingBrief` (product summary, target customer, keywords, channels)
2. **Generate** — Claude writes a 30-day content plan and generates platform-native content for every channel: blog posts, tweets, LinkedIn, Reddit, email, TikTok scripts, directory submissions
3. **Approve** — content lands in an approval queue; edit inline, reject, or approve
4. **Publish** — approved content is posted via native platform intents or API; Vercel Cron runs daily to auto-publish pre-approved items

## Stack

- **Next.js 14** — App Router, TypeScript, server actions
- **Supabase** — PostgreSQL, Auth, Row Level Security
- **Anthropic Claude** — Sonnet for generation, content strategy
- **Stripe** — subscriptions, 7-day free trial, webhook sync
- **Tailwind CSS** — dark mode, mobile-first
- **Cheerio** — server-side site crawling
- **Resend** — transactional email
- **Vercel** — deployment, cron jobs

## Architecture

### Content pipeline

```
URL input
  → /api/analyze        (Cheerio crawl + Claude → MarketingBrief JSON)
  → /api/generate-plan  (Claude → 30-day action plan)
  → /api/bulk-generate  (channel generators → content items in DB)
  → Approval queue      (user approves / edits / rejects)
  → Vercel Cron         (daily publish of auto_executable items)
```

### Channel generators (`src/lib/generators/`)

Each generator receives the `MarketingBrief` and writes platform-native content:

| File | Output |
|------|--------|
| `blog.ts` | Long-form SEO posts |
| `twitter.ts` | Tweet threads |
| `reddit.ts` | Community posts + comments |
| `instagram.ts` | Captions + hashtags |
| `email.ts` | Cold outreach sequences |
| `tiktok.ts` | Video scripts |
| `directory.ts` | Product Hunt / directory submissions |

### File structure

```
src/
├── app/
│   ├── (auth)/           # Login, signup, password reset
│   ├── (dashboard)/      # Auth-gated app
│   │   ├── overview/     # Presence dashboard, profile audit
│   │   ├── calendar/     # Unified social calendar
│   │   ├── sites/        # Site management
│   │   └── settings/     # Account, billing, integrations
│   ├── api/              # API routes
│   └── page.tsx          # Public landing page
├── components/
│   ├── ui/               # Button, Card, Badge, Input, etc.
│   └── ...               # Feature components
├── lib/
│   ├── claude.ts         # Claude wrapper (retry, JSON parsing, streaming)
│   ├── analyzer.ts       # Cheerio crawler
│   ├── stripe.ts         # Pricing plans, checkout, webhook helpers
│   ├── supabase.ts       # Server Supabase client
│   ├── supabase-browser.ts
│   └── generators/       # One file per marketing channel
└── types/index.ts
```

## Pricing

| Plan | Price | Sites | Content/mo |
|------|-------|-------|------------|
| Solo | $49/mo | 1 | 30 pieces |
| Pro | $149/mo | 5 | Unlimited |
| Scale | $499/mo | Unlimited | Unlimited |

7-day free trial on Pro, no credit card required.

## Running locally

### 1. Clone and install

```bash
git clone https://github.com/BassamAA/launchPilot
cd launchPilot
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`
- `ENCRYPTION_KEY` — random 32-char string for OAuth token encryption
- `CRON_SECRET` — random secret to secure `/api/cron/*` endpoints

### 3. Database

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Or run the SQL files in `supabase/migrations/` directly in the Supabase dashboard.

### 4. Run

```bash
npm run dev
```

## Deployment

Deploy to Vercel. Set all env vars via the Vercel dashboard or CLI:

```bash
vercel env add ANTHROPIC_API_KEY
```

Cron jobs are configured in `vercel.json` and secured with `CRON_SECRET`.

## License

MIT
