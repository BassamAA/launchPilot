# LaunchPilot Mobile Implementation Plan

## Objective

Turn the mobile MVP spec into a buildable sequence with minimal disruption to the existing web product.

The core principle remains:

**Desktop handles setup and strategy. Mobile handles execution.**

## Phase order

### Phase 1 — backend prep
Add small, mobile-friendly API endpoints.

### Phase 2 — app scaffold
Create Expo app structure and wire auth.

### Phase 3 — queue workflow
Build the actual execution loop.

### Phase 4 — notifications
Push users into Queue at the right time.

### Phase 5 — polish
Refine UX after dogfooding.

## Why separate mobile endpoints
The current web app often fetches page-specific blobs and assembles UI on the server.
That is fine for Next pages, but not ideal for mobile.

For mobile, we want:
- smaller payloads
- stable shapes
- fewer desktop assumptions
- clear execution-specific responses

## Proposed endpoints

- `GET /api/mobile/sites`
- `GET /api/mobile/sites/:id/overview`
- `GET /api/mobile/sites/:id/queue`
- `GET /api/mobile/sites/:id/library`
- `GET /api/mobile/sites/:id/results`
- `POST /api/mobile/content/:id/complete`

## Shared mobile shaping layer

Suggested helpers:
- `src/lib/mobile/site-summary.ts`
- `src/lib/mobile/queue-shape.ts`
- `src/lib/mobile/results-shape.ts`

These helpers should:
- normalize statuses
- compute nextAction
- shape queue helper metadata
- avoid leaking raw desktop-only state

## Expo app architecture

Recommended sibling app folder:

```text
mobile/
```

Suggested structure:

```text
mobile/
  app/
    _layout.tsx
    auth/login.tsx
    (tabs)/overview.tsx
    (tabs)/queue.tsx
    (tabs)/library.tsx
    (tabs)/results.tsx
    queue/[itemId].tsx
  src/
    api/
    components/
    hooks/
    lib/
```

## Mobile technical choices

- Expo
- React Native
- Expo Router
- TanStack Query
- Supabase auth client
- Expo Notifications
- expo-clipboard

## Queue-first UX rules

1. Queue opens fast.
2. Queue items need minimal interpretation.
3. Every item should expose one obvious primary action.
4. Copy/open/complete should be frictionless.
5. Returning from external social apps should feel expected, not broken.

## API implementation sequence

1. add `src/lib/mobile/site-summary.ts`
2. add `src/lib/mobile/queue-shape.ts`
3. add `GET /api/mobile/sites`
4. add `GET /api/mobile/sites/[id]/overview`
5. add `GET /api/mobile/sites/[id]/queue`
6. add `POST /api/mobile/content/[id]/complete`
7. add `GET /api/mobile/sites/[id]/library`
8. add `GET /api/mobile/sites/[id]/results`

## Success criteria for MVP

A user can:
1. open the app
2. know what site needs attention
3. open Queue
4. post to a social platform manually
5. return and mark the item complete
6. feel that the app made posting easier rather than more confusing
