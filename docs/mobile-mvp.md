# LaunchPilot Mobile MVP

## Goal

Build a focused mobile app around the actual execution workflow, not the entire desktop product.

The mobile app exists to answer one question clearly:

**What should the client do right now?**

The answer should almost always route them into Queue.

---

## Product thesis

Desktop is good for setup, strategy, and review.
Phone is better for execution.

That means the mobile app should optimize for:
- checking what is ready
- opening the right site/client
- copying content fast
- jumping into the native social app
- marking work complete
- capturing the final live URL if available

It should not try to replicate the entire desktop information architecture in v1.

---

## Core user stories

### 1. Client / founder posts from phone
- open app
- see which sites need attention
- open Queue
- tap a content item
- copy content
- open the target platform
- post it manually
- return and mark posted
- optionally paste the live URL

### 2. Operator checks what is blocked
- open app
- see if a site is missing plan / queue / tracking
- know the next action immediately

### 3. User reviews what already went out
- open app
- view recent published items
- check lightweight performance signals

---

## V1 scope

### Include
- authentication
- site switcher
- overview screen
- queue screen
- queue item detail / action sheet
- copy-to-clipboard
- open-platform handoff
- mark-posted flow
- optional published URL capture
- simple library view
- simple results view
- push notifications for queue-ready states

### Exclude
- full strategy editing
- complete onboarding wizard
- settings parity with web
- full analytics dashboard
- social OAuth expansion
- media asset generation/editing
- native scheduling/automation beyond notifications
- complex approvals matrix

---

## Recommended app structure

### Bottom tabs
- Overview
- Queue
- Library
- Results

### Global elements
- current site switcher in header
- notification badge on Queue
- persistent “next action” card on Overview

---

## Screen-by-screen spec

## 1. Auth

### Purpose
Get the user into the app fast and keep them signed in.

### Needs
- email/password or magic link, depending on current web auth support
- restore session on launch
- logout

### UX rule
No extra onboarding in mobile v1.

---

## 2. Overview screen

### Purpose
Immediate orientation.

### Must answer
- which site am I looking at?
- what needs action?
- what should I do next?

### Content
- current site name
- status chips:
  - brief ready / missing
  - plan ready / missing
  - queue count
  - tracking ready / live
- one primary CTA only:
  - Open Queue
  - or Generate Plan / Confirm Brief if blocked upstream
- compact “today” summary
- recent activity preview

### Design rule
This is not a dashboard full of charts.
It is a decision screen.

---

## 3. Queue screen

### Purpose
This is the center of the mobile app.

### Queue card fields
- platform
- title
- short preview
- scheduled date / due now label
- status
- optional tags (reddit, tiktok, instagram, etc.)

### Main actions per item
- Copy content
- Open platform
- Mark posted
- Add live URL
- View full text

### Queue detail view
When a user taps an item, show:
- full body text
- posting notes
- target subreddit / target thread / hashtags / hook / CTA when relevant
- copy button
- open platform button
- mark posted button
- paste live URL field

### Platform-specific helper behavior
#### Twitter / X
- copy optional
- open intent URL or x.com
- mark posted

#### LinkedIn
- copy text
- open linkedin feed
- mark posted

#### Instagram
- copy caption
- show hashtags separately if available
- open Instagram
- mark posted

#### Reddit
- show target subreddit and target thread if available
- open exact thread/subreddit if available
- mark posted with optional URL

#### TikTok
- show hook + script + caption
- copy relevant text blocks
- open TikTok
- mark posted

#### Facebook
- copy post body
- open Facebook
- mark posted

### Design rule
The user should never wonder where to go next from Queue.

---

## 4. Library screen

### Purpose
Reference, not execution.

### Features
- browse content by site
- filter by platform
- filter by status
- open live URL if published
- send user to Queue for actionable items

### Design rule
No duplicate publishing workflow here.

---

## 5. Results screen

### Purpose
Quick health check.

### V1 metrics only
- published count
- queue completed this week
- basic conversions / clicks if available
- recent published items
- simple per-channel rollup

### Design rule
This is a lightweight status view, not the full desktop analytics suite.

---

## Notifications

## V1 notifications
- posts ready today
- new items entered queue
- reminder: items still waiting to be posted

### Example notifications
- “3 posts ready for Acme today”
- “Instagram and Reddit drafts are waiting in Queue”
- “You still have 2 items unposted today”

### Notification tap behavior
Always deep-link into Queue, filtered to the relevant site if possible.

---

## Data / API requirements

The app should reuse current backend wherever possible.

## Minimum read endpoints needed
- authenticated current user
- list sites user can access
- site summary / dashboard status
- queue items for site
- content library for site
- basic results/performance summary for site

## Minimum write endpoints needed
- mark content item as posted/published
- save optional published URL
- maybe reject / snooze later, but not required for v1

## Strong recommendation
Create mobile-friendly response shapes instead of sending huge desktop payloads.

Example:
- `/api/mobile/sites`
- `/api/mobile/sites/:id/overview`
- `/api/mobile/sites/:id/queue`
- `/api/mobile/sites/:id/library`
- `/api/mobile/sites/:id/results`
- `/api/mobile/content/:id/complete`

This avoids coupling the app to messy desktop-specific page data.

---

## Suggested technical stack

## App
- Expo
- React Native
- TypeScript
- Expo Router
- React Query / TanStack Query
- Supabase auth client if appropriate

## Native capabilities
- push notifications via Expo Notifications
- clipboard support
- deep links / external linking
- secure token storage

## Why Expo
- fastest iOS + Android path
- enough native support for this workflow
- low ceremony for MVP
- easier iteration than separate native apps

---

## Suggested project structure

```text
mobile/
  app/
    (tabs)/
      overview.tsx
      queue.tsx
      library.tsx
      results.tsx
    queue/
      [itemId].tsx
    site/
      switcher.tsx
    auth/
      login.tsx
  src/
    api/
      client.ts
      auth.ts
      sites.ts
      queue.ts
      library.ts
      results.ts
    components/
      QueueCard.tsx
      SiteSwitcher.tsx
      StatusPill.tsx
      NextActionCard.tsx
      PlatformHelper.tsx
    hooks/
      useSession.ts
      useSites.ts
      useQueue.ts
    lib/
      platform.ts
      notifications.ts
      clipboard.ts
```

---

## Platform helper model

Create one shared mobile helper module for platform-specific behavior.

It should define:
- platform label
- icon
- open-platform URL
- copy-before-open behavior
- URL label placeholder
- field grouping for body / caption / hashtags / script / notes

That keeps Queue consistent across social channels.

---

## 1-week MVP build plan

## Day 1
- scaffold Expo app
- wire auth
- session restore
- base navigation

## Day 2
- site list + current site switcher
- overview API integration
- queue list API integration

## Day 3
- queue item cards
- detail screen
- copy/open-platform flow

## Day 4
- mark-posted flow
- save published URL flow
- queue state refresh

## Day 5
- library screen
- results screen
- empty/loading/error states

## Day 6
- push notifications
- deep links into queue
- polish queue UX

## Day 7
- internal QA
- TestFlight / Android internal build
- dogfood with real posting workflow

---

## Product rules

1. Mobile is for execution first.
2. Queue is the center of the app.
3. One obvious next action per screen.
4. No duplicate publish flows across screens.
5. Strategy and analytics stay lighter than desktop in v1.
6. Every notification should pull the user toward Queue.

---

## Recommendation

Do not start by making the whole web app mobile.
Do not start with a webview wrapper unless you only want a temporary placeholder.

Build the **Queue app** first.
That is the strongest wedge and the highest-utility mobile use case.
