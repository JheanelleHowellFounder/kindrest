# Kindrest — Next.js Prototype

Personalized wellness for mothers. Built with Next.js 14 + Tailwind CSS.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000)

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in your values
2. Run `npm install`
3. Run `npm run dev`

## Project Structure

```
app/              # Next.js App Router pages
  page.tsx        # Home / Dashboard
  check-in/       # Multi-step check-in flow
  journal/        # Journal screen
  history/        # History + Insights
  profile/        # Profile + Update flow

components/
  layout/         # BottomNav
  home/           # HomeScreen
  check-in/       # CheckInFlow (full 9-step flow)
  journal/        # JournalScreen
  history/        # HistoryScreen
  profile/        # ProfileScreen + Update flow

lib/
  types.ts                # TypeScript types
  mock-data.ts            # Seed data + mock user
  recommendation-engine.ts # Scoring algorithm
```

## Screens

- **Home** — Daily affirmation, Start Check-In CTA, stats
- **Check-In** — 9-step flow: mood → mental/physical/emotional indicators → time → guided moment → care kit + rating
- **Journal** — Write entries, filter by sentiment
- **History** — Insights (wellness profile, what works, calendar) + Activity history
- **Profile** — Stats, top techniques, personalization, 6-step update flow

## Recommendation Engine

Located in `lib/recommendation-engine.ts`. Scores recommendations using:
1. Regulation phase match (mood → phase)
2. Time availability filter
3. Effort level alignment
4. Feedback weights from past ratings
5. Novelty bonus (avoids repetition)

## Next Steps

See `../KINDREST_V1_PROJECT_PLAN.md` for the full roadmap including:
- Supabase integration
- Claude API for sentiment analysis
- Feedback loop architecture
- Airtable migration script
