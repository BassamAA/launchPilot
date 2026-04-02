# BreakthroughPilot — Social Handoff MVP

## Goal
From chat, recommend what to post, generate the draft, and hand the user into the target app with the least friction possible.

## Core loop
1. Detect opportunity
2. Message user in chat
3. Include draft
4. Include platform handoff action
5. User posts in native app
6. System records outcome / follows up

## MVP promise
BreakthroughPilot tells founders what to post and gives them one-tap handoff into the apps they already use.

## First platforms
### Tier 1
- X / Twitter
- LinkedIn
- Email

### Tier 2
- Reddit
- Instagram

### Tier 3
- TikTok
- Facebook
- others

## Handoff model
### Best case
- deep link or intent link opens compose flow with prefilled text

### Fallback
- copy text to clipboard
- open target app/web
- user pastes manually

## UX in chat
Example:

You should post this on LinkedIn today.

[draft]

Actions:
- Open in LinkedIn
- Open in X
- Copy
- Shorter
- More technical
- Another version

## Platform support expectations
### X
- strong intent support
- should be first-class

### LinkedIn
- handoff support is weaker / varies
- support best possible open + copy fallback

### Email
- strong support
- easy win

### Reddit
- partial support
- subreddit-aware flows later

### Instagram
- mostly copy + open fallback

## MVP success
User receives a message, taps once, and can post with near-zero friction.

## Not in MVP
- perfect native support for every platform
- full autonomous posting everywhere
- media-heavy workflows
