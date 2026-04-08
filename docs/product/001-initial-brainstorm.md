# Draft & Trade Game — Brainstorm

## Concept

A game/app built around the fun of **drafting** and **trading**. Inspired by Pokemon challenge drafts with friends — the draft itself is one of the most enjoyable parts.

---

## Core Mechanic Ideas

### 1. Universal Draft Engine

A platform-agnostic drafting tool where you can draft *anything* — Pokemon, movies for a watch challenge, restaurants to visit, songs for a playlist battle, fantasy sports-style picks. The draft format itself is the game. Snake drafts, auction drafts, blind bid drafts, etc.

### 2. Draft + Trade + Compete Loop

- **Draft phase**: Everyone picks from a shared pool (snake, auction, or rotating pick order)
- **Trade window**: A period where players can propose and negotiate trades
- **Compete phase**: Whatever was drafted gets scored or evaluated against some criteria
- **Repeat**: Seasons/rounds keep it going

### 3. "Market" Style Game

Think stock market but for arbitrary things. Items have fluctuating value based on supply/demand within your friend group. You draft an initial portfolio, then trade to optimize before a scoring event.

---

## What Makes Drafting Fun (design pillars)

- **Scarcity** — you can't have everything, so choices matter
- **Reading opponents** — anticipating what others will pick
- **Sleeper picks** — finding undervalued gems
- **Trade negotiation** — the social/persuasion element
- **The reveal** — seeing how your roster performs

---

## Decisions

| Question | Answer |
|----------|--------|
| Audience | Public — built for friends but goal is for others to use too |
| Compete phase | Rules engine approach — define scoring rules per game mode |
| Draft timing | Real-time (everyone online together) |
| Content pools | Both — custom pools + built-in pools (APIs, curated lists) |
| Platform | Web app |

---

## Resonating Ideas

### 1. NFL-Like Simulator Game
A draft-and-simulate experience. Draft your roster, then watch a simulated season/tournament play out. Think fantasy football but the "games" are simulated too — no need to wait for real-world events.

### 2. "Fantasize Everything" Platform
Fantasy league mechanics applied to *anything*:
- **Fantasy Stocks** — draft a portfolio, track real performance
- **Fantasy Cities** — draft cities, score on metrics (weather, events, crime stats, etc.)
- **Fantasy [Whatever]** — the platform provides the draft + trade + scoring engine, content packs plug into it

### 3. Pokemon Drafter & Challenge Tracker
A dedicated Pokemon challenge app:
- Draft Pokemon for a challenge run (Nuzlocke, Soul Link, etc.)
- Track progress of each player through their run
- Potential hook into emulators / RetroAchievements-style integration to verify progress automatically
- Leaderboards, milestones, bragging rights

---

## Emerging Vision

These ideas aren't mutually exclusive. There's a spectrum:

```
[Focused App]                                          [Platform]
Pokemon Draft Tracker  <-->  Simulator Game  <-->  "Fantasize Everything"
```

The **core engine** is the same across all of them:
1. **Lobby** — create a room, invite friends
2. **Pool** — define what's being drafted (Pokemon, stocks, players, etc.)
3. **Draft** — real-time pick phase with configurable format
4. **Trade** — negotiation window
5. **Score** — rules engine evaluates outcomes
6. **Leaderboard** — track results over time

The question is: **start focused (Pokemon) and generalize later, or build the platform from day one?**

---

## More Decisions

| Question | Answer |
|----------|--------|
| Starting point | Pokemon drafter as proof-of-concept, generalize later |
| Rules engine | Configurable by league creator |
| Social layer | Not a priority — lean on Discord for social features |
| License | MIT |
