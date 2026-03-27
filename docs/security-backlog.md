# Security Backlog

## Current policy
- Keep `next` pinned to the patched `14.2.x` line for stability during this work stream.
- Run `npm run qa` on every branch and in CI.
- Run `npm audit --omit=dev --audit-level=critical` in CI.

## Deferred work
- Controlled migration from Next 14 to Next 16 after a dedicated compatibility pass.
- Stronger distributed rate limiting for public tracking endpoints beyond the current in-memory guard.
- Dedicated E2E secret-management policy for webhook and cron routes.
