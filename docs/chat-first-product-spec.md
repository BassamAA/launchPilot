# BreakthroughPilot — Multi-Surface Growth Operator Spec

## Product thesis

BreakthroughPilot is a **multi-surface conversational growth operator** for founder-led businesses.

It should behave more like OpenClaw than like a traditional SaaS dashboard.
That means:
- users can talk to it naturally across multiple surfaces
- it remembers the business and recent context
- it proactively reaches out when something matters
- it executes through tools and workflows
- the dashboard is a control panel, not the primary experience

BreakthroughPilot is not a WhatsApp product.
WhatsApp is one important surface.
The product is the **operator brain**, not the transport layer.

---

## Core promise

**Talk to your growth system like a teammate.**
BreakthroughPilot remembers your business, tells you what matters, drafts what should happen next, and helps you execute across channels.

Examples:
- “You should post this on LinkedIn today. Want a sharper version?”
- “Signups dropped after your pricing update. Want me to rewrite the messaging?”
- “Your founder posts outperform product posts. Want more of those this week?”
- “You haven’t shipped in 6 days. I drafted 3 posts from your latest feature update.”
- “What do you know about my business?”
- “What should we do this week?”

---

## Interaction surfaces

BreakthroughPilot should work across:
- WhatsApp
- web chat
- web dashboard / control panel
- email summaries
- later: Telegram / Slack / Discord if useful

Users should not care much which surface they use.
The system should preserve context across them.

### Surface roles

#### WhatsApp
Best for:
- proactive nudges
- quick approvals
- short strategy prompts
- urgent reminders
- high-engagement daily interaction

#### Web chat
Best for:
- deeper back-and-forth
- asking strategic questions
- editing drafts collaboratively
- working sessions
- debugging and clarifying context

#### Dashboard / control panel
Best for:
- onboarding
- integrations
- settings
- history
- queue review
- analytics inspection
- detailed content editing

#### Email
Best for:
- weekly summaries
- digests
- reporting
- async review

---

## ICP

Primary:
- Indie SaaS founders
- Solo technical founders
- Micro-SaaS builders
- Founder-led B2B products

Secondary later:
- agencies
- consultants
- creator businesses
- local/service businesses

Do not optimize for everyone at launch.
Start with founders who:
- are overloaded
- do not want another dashboard to babysit
- want reminders and recommendations pushed to them
- want to ask questions conversationally
- need help maintaining momentum

---

## User problem

Most founder-led businesses do not fail because they lack marketing ideas.
They fail because:
- they lose momentum
- they do not know what matters most this week
- context gets lost between work sessions
- they fail to turn product changes into distribution quickly
- they do not connect content output to outcomes

BreakthroughPilot solves that by acting like an always-on growth operator across chat and web.

---

## Product principles

1. **Operator-first, not dashboard-first**
   - Push value to the user
   - Reduce dashboard dependency

2. **Surface-agnostic core**
   - One operator brain
   - Many interaction surfaces

3. **Strategy before autopilot**
   - Explain recommendations
   - Let trust earn automation

4. **Memory matters**
   - Remember the business, audience, positioning, recent changes, performance, and decisions

5. **Action over abstraction**
   - Always orient toward: what should happen next?

6. **Control panel, not command center**
   - The web app should support setup and review, not be the only place value lives

---

## Core user journeys

### 1. Onboarding
User flow:
1. User signs up on web
2. Connects site / product URL
3. System analyzes business and builds memory foundation
4. User confirms brief / positioning
5. User chooses preferred surfaces and notifications
6. User connects optional publishing channels
7. System starts proactive support

### 2. Daily operator loop
System reaches out on the most appropriate surface:
- daily suggestion
- draft recommendation
- strategic prompt
- action request
- reminder

User replies naturally from that surface.

System acts:
- answers question
- updates strategy
- revises draft
- queues post
- explains reasoning
- updates memory

### 3. Weekly review loop
System sends:
- what happened
- what worked
- what didn’t
- what it recommends next

User responds:
- do more of this
- stop pushing that angle
- prioritize launches
- rewrite next week’s plan

### 4. Triggered opportunity loop
System notices:
- new product launch
- long silence
- conversion drop
- rising channel
- underused asset

System proactively reaches out with a recommendation.

---

## Supported user intents

### Business understanding
- what do you know about my business?
- who is our target audience?
- what’s our positioning?
- what changed recently?

### Strategy
- what should we do this week?
- which channel should we focus on?
- why are you recommending LinkedIn?
- what’s not working?
- what should we stop doing?

### Execution
- draft a LinkedIn post
- rewrite this for X
- make it more technical
- make it less cringe
- focus on CTOs
- queue it for tomorrow
- publish it now
- give me another version

### Performance
- what posts led to signups?
- what worked best this month?
- why are signups down?
- what should we do differently?

---

## Core outbound message types

### A. Daily suggestion
“You should post on LinkedIn today. Your last founder-style post outperformed product updates. Want the draft?”

### B. Draft delivery
“I drafted 3 posts from your pricing change. Want the technical, founder, or short version?”

### C. Alert
“Signups dropped 28% after your homepage change. Want me to rewrite the top section?”

### D. Weekly summary
“This week: 4 posts shipped, 2 signups attributed, LinkedIn beat X, no blog shipped. Recommendation: 2 founder posts + 1 comparison post next week.”

### E. Clarification question
“You changed pricing. Should next week’s messaging target startups or agencies?”

### F. Approval request
“This post is ready for LinkedIn. Reply ‘queue it’, ‘rewrite’, or ‘why this?’”

---

## Product architecture

### Layer 1 — Operator brain
The actual product core.
Responsible for:
- memory retrieval
- recommendation generation
- response generation
- deciding when to proactively reach out
- deciding which tools/actions to trigger

### Layer 2 — Surface router
Normalizes inbound and outbound interactions across:
- WhatsApp
- web chat
- dashboard actions
- email

### Layer 3 — Business memory
Stores:
- business profile
- brief
- audience
- positioning
- connected channels
- product updates
- user preferences
- recent decisions
- pending actions
- performance summaries

### Layer 4 — Execution engine
Uses LaunchPilot capabilities:
- brief generation
- plan generation
- content generation
- queue management
- publishing
- tracking
- performance summaries

### Layer 5 — Control panel
Used for:
- onboarding
- settings
- integrations
- queue review
- history
- analytics
- deeper editing

---

## What to keep from current LaunchPilot

Keep as execution infrastructure:
- site analysis
- business profile
- marketing brief generation
- plan generation
- content generation
- queue
- publishing integrations
- tracking
- performance summaries

These are still valuable.
They just stop being the whole UX.

---

## What to demote from the story

Do not lead with:
- AI marketing autopilot
- omnichannel automation claims
- dashboard-heavy workflows
- profile-audit-heavy onboarding
- every-channel-for-everyone messaging
- growth intelligence sprawl without actionability

---

## MVP definition

### MVP promise
“BreakthroughPilot proactively tells founders what to post and why, lets them ask natural questions about their business, and helps them execute across chat and web.”

### MVP must-have capabilities
1. Business memory foundation
2. WhatsApp outbound proactive suggestions
3. Web chat for deeper conversation
4. Inbound conversational question handling
5. Post recommendation generation
6. Draft generation for LinkedIn and X
7. Queue / approve actions
8. Explain-why responses
9. Weekly summary

### MVP nice-to-have
- direct publish from chat
- multi-channel repurposing
- conversion anomaly alerts
- richer analytics explanations
- additional messaging surfaces

---

## MVP surface strategy

### Ship first
#### 1. Web onboarding + control panel
Why:
- easiest place to connect site and integrations
- easiest place to inspect/edit source of truth
- required for setup anyway

#### 2. WhatsApp proactive outbound
Why:
- highest-engagement push surface
- ideal for reminders, prompts, and suggestions
- creates habit fast

#### 3. Web chat
Why:
- easier than building rich multi-intent workflows entirely in messaging first
- better place for longer questions and responses
- good bridge to multi-surface future

### Delay until later
- Telegram
- Slack
- Discord
- email as a full conversational surface

Use email first as a digest surface, not as the main conversation layer.

---

## Example MVP loop

1. User signs up on web and connects site
2. System builds business memory
3. System sends WhatsApp:
   “You haven’t posted in 5 days. I drafted a LinkedIn post about your pricing change. Want it?”
4. User replies:
   “Show me”
5. System sends draft
6. User replies:
   “Make it more technical and less salesy”
7. System revises draft
8. User replies:
   “Queue it for tomorrow”
9. System queues it and confirms
10. Later, user opens web chat and asks: “What should we do this week?”
11. System answers from the same memory foundation

---

## Web app role after reframing

The web app is a **control panel and workbench**.
Not the center of the product.

Primary jobs:
- onboarding
- settings
- connected accounts
- queue review
- performance history
- editing business context
- web chat work sessions

The user should not need to live there every day.

---

## Monetization hypothesis

Pricing should reflect ongoing operator value, not just content generation volume.

Potential framing:
- Starter: operator memory + recommendations + queue + limited drafts
- Pro: higher message frequency, more channels, smarter recommendations, deeper summaries
- Concierge: done-with-you setup, higher-touch strategy, premium support

The product is selling:
- strategic attention
- execution momentum
- persistent business context
- reduced founder marketing burden

Not just “AI content.”

---

## Roadmap

### Phase 1 — Reframe and stabilize
- Align product around operator thesis
- Simplify web app around setup + queue + proof
- Remove contradictory flows

### Phase 2 — Multi-surface MVP
- WhatsApp outbound suggestions
- web chat
- memory-backed responses
- recommendation engine
- queue actions

### Phase 3 — Deeper execution
- publish from chat where safe
- weekly summaries and alerts
- performance-aware recommendations
- better preference learning

### Phase 4 — Surface expansion and trust
- more messaging surfaces
- richer memory
- better explainability
- broader action coverage

---

## Feature test

Before adding any feature, ask:

1. Does this make the operator more useful across surfaces?
2. Does this reduce founder effort or confusion?
3. Does this improve trust or actionability?
4. Would the user care about this in chat, not just inside a dashboard?

If not, it is not core.
