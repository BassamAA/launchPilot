# LaunchPilot Mobile

Expo + React Native mobile app focused on execution.

## Run

```bash
cd mobile
cp .env.example .env
npm install
npm run dev
```

## Required env

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## Current scope

- auth screen
- overview with next-action framing
- queue with manual posting flow
- library as reference-only
- results as lightweight health view
- site switcher
- error / empty states
