# 🔍 QA Diagnosis — launchpilot

**Run:** 4/2/2026, 1:23:30 PM | **Duration:** 4.5s | **Findings:** 24

---

## Health Score

`██████████░░░░░░░░░░` **49/100**

> Critical — significant security and quality issues require immediate attention.

| Severity | Count |
|----------|-------|
| ⚠️ High     | 1 |
| 📋 Medium   | 10 |
| ℹ️ Low      | 13 |

---

## ⚠️ High Priority Issues

### 1. 2 required environment variable(s) missing

Variables defined in .env.example but not found in .env.local or environment: ADMIN_EMAIL, SELF_MARKETING_TWITTER_HANDLE

📍 **File:** `.env.example`
💥 **Impact:** Your app cannot be run from a fresh clone. CI/CD deployments will fail, and new developers will be blocked. Some missing vars may cause runtime crashes.

🔧 **Fix:** Copy .env.example to .env.local and fill in the missing values:
cp .env.example .env.local
# Then edit .env.local and add: ADMIN_EMAIL, SELF_MARKETING_TWITTER_HANDLE

<details><summary>Evidence</summary>

```
Missing: ADMIN_EMAIL
- SELF_MARKETING_TWITTER_HANDLE
```

</details>

---
---

## 📋 Medium Issues

### 1. Unbounded database query — no pagination or limit

src/app/api/conversions/track/route.ts fetches records without a LIMIT or pagination constraint. As your data grows, this query will become slow and expensive.

📍 **File:** `src/app/api/conversions/track/route.ts`
💥 **Impact:** A table with 100k+ rows will cause slow responses, high DB load, and potential Vercel function timeouts. At scale this becomes a denial-of-service vector.

🔧 **Fix:** Add pagination to all data-fetching queries:

// Prisma
const items = await prisma.item.findMany({ take: 50, skip: offset });

// Supabase
const { data } = await supabase.from('items').select('*').range(offset, offset + 49);

<details><summary>Evidence</summary>

```
.select('*') without .limit(N) in src/app/api/conversions/track/route.ts
```

</details>

---
### 2. Unbounded database query — no pagination or limit

src/app/api/cron/refresh-tokens/route.ts fetches records without a LIMIT or pagination constraint. As your data grows, this query will become slow and expensive.

📍 **File:** `src/app/api/cron/refresh-tokens/route.ts`
💥 **Impact:** A table with 100k+ rows will cause slow responses, high DB load, and potential Vercel function timeouts. At scale this becomes a denial-of-service vector.

🔧 **Fix:** Add pagination to all data-fetching queries:

// Prisma
const items = await prisma.item.findMany({ take: 50, skip: offset });

// Supabase
const { data } = await supabase.from('items').select('*').range(offset, offset + 49);

<details><summary>Evidence</summary>

```
.select('*') without .limit(N) in src/app/api/cron/refresh-tokens/route.ts
```

</details>

---
### 3. Unbounded database query — no pagination or limit

src/app/api/events/track/route.ts fetches records without a LIMIT or pagination constraint. As your data grows, this query will become slow and expensive.

📍 **File:** `src/app/api/events/track/route.ts`
💥 **Impact:** A table with 100k+ rows will cause slow responses, high DB load, and potential Vercel function timeouts. At scale this becomes a denial-of-service vector.

🔧 **Fix:** Add pagination to all data-fetching queries:

// Prisma
const items = await prisma.item.findMany({ take: 50, skip: offset });

// Supabase
const { data } = await supabase.from('items').select('*').range(offset, offset + 49);

<details><summary>Evidence</summary>

```
.select('*') without .limit(N) in src/app/api/events/track/route.ts
```

</details>

---
### 4. Unbounded database query — no pagination or limit

src/app/api/generate-plan/route.ts fetches records without a LIMIT or pagination constraint. As your data grows, this query will become slow and expensive.

📍 **File:** `src/app/api/generate-plan/route.ts`
💥 **Impact:** A table with 100k+ rows will cause slow responses, high DB load, and potential Vercel function timeouts. At scale this becomes a denial-of-service vector.

🔧 **Fix:** Add pagination to all data-fetching queries:

// Prisma
const items = await prisma.item.findMany({ take: 50, skip: offset });

// Supabase
const { data } = await supabase.from('items').select('*').range(offset, offset + 49);

<details><summary>Evidence</summary>

```
.select('*') without .limit(N) in src/app/api/generate-plan/route.ts
```

</details>

---
### 5. Unbounded database query — no pagination or limit

src/app/api/sites/[id]/operator-suggest/route.ts fetches records without a LIMIT or pagination constraint. As your data grows, this query will become slow and expensive.

📍 **File:** `src/app/api/sites/[id]/operator-suggest/route.ts`
💥 **Impact:** A table with 100k+ rows will cause slow responses, high DB load, and potential Vercel function timeouts. At scale this becomes a denial-of-service vector.

🔧 **Fix:** Add pagination to all data-fetching queries:

// Prisma
const items = await prisma.item.findMany({ take: 50, skip: offset });

// Supabase
const { data } = await supabase.from('items').select('*').range(offset, offset + 49);

<details><summary>Evidence</summary>

```
.select('*') without .limit(N) in src/app/api/sites/[id]/operator-suggest/route.ts
```

</details>

---
### 6. Unbounded database query — no pagination or limit

src/app/api/sites/[id]/partners/route.ts fetches records without a LIMIT or pagination constraint. As your data grows, this query will become slow and expensive.

📍 **File:** `src/app/api/sites/[id]/partners/route.ts`
💥 **Impact:** A table with 100k+ rows will cause slow responses, high DB load, and potential Vercel function timeouts. At scale this becomes a denial-of-service vector.

🔧 **Fix:** Add pagination to all data-fetching queries:

// Prisma
const items = await prisma.item.findMany({ take: 50, skip: offset });

// Supabase
const { data } = await supabase.from('items').select('*').range(offset, offset + 49);

<details><summary>Evidence</summary>

```
.select('*') without .limit(N) in src/app/api/sites/[id]/partners/route.ts
```

</details>

---
### 7. Unbounded database query — no pagination or limit

src/app/api/sites/[id]/plan/route.ts fetches records without a LIMIT or pagination constraint. As your data grows, this query will become slow and expensive.

📍 **File:** `src/app/api/sites/[id]/plan/route.ts`
💥 **Impact:** A table with 100k+ rows will cause slow responses, high DB load, and potential Vercel function timeouts. At scale this becomes a denial-of-service vector.

🔧 **Fix:** Add pagination to all data-fetching queries:

// Prisma
const items = await prisma.item.findMany({ take: 50, skip: offset });

// Supabase
const { data } = await supabase.from('items').select('*').range(offset, offset + 49);

<details><summary>Evidence</summary>

```
.select('*') without .limit(N) in src/app/api/sites/[id]/plan/route.ts
```

</details>

---
### 8. Unbounded database query — no pagination or limit

src/app/api/sites/[id]/route.ts fetches records without a LIMIT or pagination constraint. As your data grows, this query will become slow and expensive.

📍 **File:** `src/app/api/sites/[id]/route.ts`
💥 **Impact:** A table with 100k+ rows will cause slow responses, high DB load, and potential Vercel function timeouts. At scale this becomes a denial-of-service vector.

🔧 **Fix:** Add pagination to all data-fetching queries:

// Prisma
const items = await prisma.item.findMany({ take: 50, skip: offset });

// Supabase
const { data } = await supabase.from('items').select('*').range(offset, offset + 49);

<details><summary>Evidence</summary>

```
.select('*') without .limit(N) in src/app/api/sites/[id]/route.ts
```

</details>

---
### 9. Unbounded database query — no pagination or limit

src/app/api/sites/[id]/surfaces/route.ts fetches records without a LIMIT or pagination constraint. As your data grows, this query will become slow and expensive.

📍 **File:** `src/app/api/sites/[id]/surfaces/route.ts`
💥 **Impact:** A table with 100k+ rows will cause slow responses, high DB load, and potential Vercel function timeouts. At scale this becomes a denial-of-service vector.

🔧 **Fix:** Add pagination to all data-fetching queries:

// Prisma
const items = await prisma.item.findMany({ take: 50, skip: offset });

// Supabase
const { data } = await supabase.from('items').select('*').range(offset, offset + 49);

<details><summary>Evidence</summary>

```
.select('*') without .limit(N) in src/app/api/sites/[id]/surfaces/route.ts
```

</details>

---
### 10. Unbounded database query — no pagination or limit

src/lib/operator-actions.ts fetches records without a LIMIT or pagination constraint. As your data grows, this query will become slow and expensive.

📍 **File:** `src/lib/operator-actions.ts`
💥 **Impact:** A table with 100k+ rows will cause slow responses, high DB load, and potential Vercel function timeouts. At scale this becomes a denial-of-service vector.

🔧 **Fix:** Add pagination to all data-fetching queries:

// Prisma
const items = await prisma.item.findMany({ take: 50, skip: offset });

// Supabase
const { data } = await supabase.from('items').select('*').range(offset, offset + 49);

<details><summary>Evidence</summary>

```
.select('*') without .limit(N) in src/lib/operator-actions.ts
```

</details>

---
---

## ℹ️ Low Priority / Suggestions

- ℹ️ **List rendering without empty state in src/components/content/ContentLibrary.tsx** _(src/components/content/ContentLibrary.tsx)_
- ℹ️ **List rendering without empty state in src/components/dashboard/MobileNav.tsx** _(src/components/dashboard/MobileNav.tsx)_
- ℹ️ **List rendering without empty state in src/components/dashboard/PresencePanel.tsx** _(src/components/dashboard/PresencePanel.tsx)_
- ℹ️ **List rendering without empty state in src/components/dashboard/PriorityActionsBar.tsx** _(src/components/dashboard/PriorityActionsBar.tsx)_
- ℹ️ **List rendering without empty state in src/components/dashboard/Sidebar.tsx** _(src/components/dashboard/Sidebar.tsx)_
- ℹ️ **List rendering without empty state in src/components/onboarding/OnboardingPageClient.tsx** _(src/components/onboarding/OnboardingPageClient.tsx)_
- ℹ️ **List rendering without empty state in src/components/onboarding/OnboardingWizard.tsx** _(src/components/onboarding/OnboardingWizard.tsx)_
- ℹ️ **List rendering without empty state in src/components/sites/AnalysisProgress.tsx** _(src/components/sites/AnalysisProgress.tsx)_
- ℹ️ **List rendering without empty state in src/components/sites/EmailCampaignComposer.tsx** _(src/components/sites/EmailCampaignComposer.tsx)_
- ℹ️ **List rendering without empty state in src/components/sites/MarketingBriefCard.tsx** _(src/components/sites/MarketingBriefCard.tsx)_
- ℹ️ **List rendering without empty state in src/components/sites/SelfMarketingReviewPanel.tsx** _(src/components/sites/SelfMarketingReviewPanel.tsx)_
- ℹ️ **List rendering without empty state in src/components/sites/SiteConnectionsPanel.tsx** _(src/components/sites/SiteConnectionsPanel.tsx)_
- ℹ️ **List rendering without empty state in src/components/social/AngleGaps.tsx** _(src/components/social/AngleGaps.tsx)_

---

## ✅ What's Good

- Unauthenticated Api Access ✓
- Protected Page Rendering ✓
- Token Storage ✓
- Supabase Rls ✓
- Service Role Exposure ✓
- Input Validation ✓
- Db Constraints ✓
- Race Conditions ✓
- Webhook Verification ✓
- Price Manipulation ✓
- Subscription Status ✓
- Webhook Exposure ✓
- Http Methods ✓
- Rate Limiting ✓
- Error Leakage ✓
- Response Times ✓
- Cors Policy ✓
- Hardcoded Secrets ✓
- Next Config ✓
- Env Separation ✓
- Accessibility ✓

---

## 📊 Coverage Summary

| Category      | Checks Run | Passed | Failed | Skipped |
|---------------|-----------|--------|--------|---------|
| Auth         |          6 |      5 |      0 |       1 |
| Data         |          4 |      3 |      1 |       0 |
| Payments     |          4 |      4 |      0 |       0 |
| API          |          5 |      5 |      0 |       0 |
| Config       |          4 |      3 |      1 |       0 |
| Frontend     |          5 |      1 |      1 |       3 |

---

## 🗺️ Next Steps

1. **2 required environment variable(s) missing**  
   ~10–20 min
2. **Unbounded database query — no pagination or limit**  
   ~5–10 min
3. **Unbounded database query — no pagination or limit**  
   ~5–10 min
4. **Unbounded database query — no pagination or limit**  
   ~5–10 min
5. **Unbounded database query — no pagination or limit**  
   ~5–10 min

> Fixing the top 3 issues would bring your health score from **49** → **63**.

---

_Generated by [qa-agent](https://github.com/your/qa-agent)_
