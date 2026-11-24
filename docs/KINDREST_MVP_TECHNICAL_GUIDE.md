# Kindrest MVP — Technical Guide & Founder's Map

**Last updated:** 15 September 2026
**Written for:** Non-technical founders, future developers, and collaborators
**Purpose:** A plain-language map of everything that was built — what it is, how it works, and how to hand it off or rebuild it.

---

## Table of Contents

1. [What Kindrest Is](#what-kindrest-is)
2. [Where It Lives](#where-it-lives)
3. [The Tech Stack — In Plain Terms](#the-tech-stack--in-plain-terms)
4. [Brand & Design Tokens](#brand--design-tokens)
5. [Screens Built](#screens-built)
6. [How Authentication Works](#how-authentication-works)
7. [The Database](#the-database)
8. [The Recommendation Engine](#the-recommendation-engine)
9. [API Routes — The Behind-the-Scenes Work](#api-routes--the-behind-the-scenes-work)
10. [PWA — The "Install on Your Phone" Feature](#pwa--the-install-on-your-phone-feature)
11. [Environment Variables & Secrets](#environment-variables--secrets)
12. [Security](#security)
13. [Deployment](#deployment)
14. [What's Not Built Yet](#whats-not-built-yet)
15. [The Glimmer Release — August 2026](#the-glimmer-release--august-2026)
16. [Growth Infrastructure — August 2026](#growth-infrastructure--august-2026)
17. [Attribution & the Village — 14 August 2026](#attribution--the-village--14-august-2026)
18. [Therapist Testing — 17 August 2026](#therapist-testing--17-august-2026)
19. [Positioning, Warm Lines & Pausing the Daily Email — 8 September 2026](#positioning-warm-lines--pausing-the-daily-email--8-september-2026)
20. [The Rest Card Rebuild — 8 September 2026](#the-rest-card-rebuild--8-september-2026)
21. [Counting Check-ins — 15 September 2026](#counting-check-ins--15-september-2026)
22. [Feature Log](#feature-log)
23. [If You're Handing This Off to a Developer](#if-youre-handing-this-off-to-a-developer)

---

## What Kindrest Is

Kindrest is a mobile-first wellness app designed for mothers. It helps users check in with themselves emotionally, physically, and mentally — and then offers personalized self-care recommendations (called a "care kit") based on how they're feeling in that moment.

The app learns over time. When you rate a recommendation (skip, save, or "did it"), that feedback shapes what you see next time.

---

## Where It Lives

| Thing | Location |
|---|---|
| Live app | [kindrest.co](https://kindrest.co) (also accessible at kindrest.vercel.app) |
| Code (GitHub) | [github.com/JheanelleHowellFounder/kindrest](https://github.com/JheanelleHowellFounder/kindrest) |
| Hosting | Vercel (auto-deploys when code is pushed to GitHub) |
| Database | Supabase (cloud-hosted Postgres) |
| Recommendations content | Airtable — "Kindrest Data Logic" base |

---

## The Tech Stack — In Plain Terms

Think of the app like a building. Here's what each layer does:

| Layer | Tool Used | What It Does |
|---|---|---|
| Front end (what users see) | Next.js 14 + TypeScript | Builds every screen and page |
| Styling | Tailwind CSS | Controls colors, fonts, spacing, layout |
| Database | Supabase | Stores user profiles, check-in history, ratings |
| Login / Auth | Supabase Auth + Resend | Handles sign-in links and email/password login; Resend delivers auth emails |
| Content (recommendations) | Airtable | Where the 45 care recommendations live |
| AI (care kit message) | Anthropic Claude API | Generates the warm 2-sentence message shown with each care kit |
| Email delivery | Resend | Sends all auth emails (confirmations, sign-in links) with Kindrest branding |
| Hosting | Vercel | Publishes the app and keeps it online |
| Installable on phone | PWA setup | Makes the app installable like a native app |

### Why This Stack?

- **Next.js** is a popular, well-supported React framework. Lots of developers know it.
- **Supabase** is an open-source database that's easy to set up and has built-in login tools.
- **Airtable** lets you edit recommendations without touching code — it acts like a CMS (content management system).
- **Vercel** connects to GitHub and auto-publishes whenever code changes are pushed.
- **Resend** replaces Supabase's default email sender, which has a strict rate limit of 2 emails per hour. Resend handles 3,000 emails a month with no hourly cap.

---

## Brand & Design Tokens

These are the exact colors and fonts used throughout the app. Any developer recreating the design should use these precisely.

### Colors

| Name | Hex Code | Used For |
|---|---|---|
| Chocolate | `#30211a` | Primary dark color, backgrounds, text |
| Cream | `#f8f2ee` | Light backgrounds, card surfaces |
| Beige | `#d6c9be` | Borders, secondary backgrounds |
| Mustard | `#c9981f` | Buttons, accents, highlights |
| Cream-2 | `#f0e9e2` | Outer page background |

### Fonts

| Font | Weight | Used For |
|---|---|---|
| PT Serif | Regular | Headlines and display text |
| Poppins | SemiBold (600) | Subheadings, labels |
| Open Sans | Regular | Body text, paragraphs |

### Buttons

- Background color: Mustard (`#c9981f`)
- Text: White
- Border radius: 15px
- No color change on hover (consistent look)

### Copy Rules

- No em dashes anywhere in the app
- Sentence case (not Title Case) for headings
- Second-person voice ("you", "your") throughout
- Warm and plain-spoken — never clinical

---

## Screens Built

Here is every screen in the app, what it does, and where it fits in the user journey.

---

### Navigation

**Current as of 14 October 2026.** Both navs are the same four screens, on
purpose:

**Home · Check-in · History · Profile**

`components/layout/BottomNav.tsx` (mobile) and `components/layout/SidebarNav.tsx`
(desktop) must stay in step. They drifted for months — the sidebar had Journal
and no Check-in, the bottom bar the reverse — and nobody noticed, because there
was no single list to look at. **If you add a destination, add it to both or
neither.**

**Four is comfortable, five is the ceiling** on a phone. One slot is
deliberately free, so a future destination does not force a redesign.

#### Journal, Rest Card and Glimmers are not in the nav

They are reached from **tiles on Home** — "Reflect" goes straight to `/journal`
— and that is the right place for them. Of the first 16 journal entries, 14
came from being prompted somewhere in the app and only 2 from navigating to the
page. These are things she arrives at, not places she goes.

The Home tiles are effectively a second navigation layer. Worth remembering when
adding anything: a new destination may belong there rather than in the nav.

#### `/library`

A four-line redirect to `/history`, kept so old links still work. The screen it
used to render was deleted in October 2026 — 261 lines that nothing imported.
**Do not delete the route.**

---

### 1. Onboarding Flow

**Purpose:** Gets a new user set up from their very first visit.

**Steps in order:**
1. **Crisis check** — Before anything, the app asks if the user is in crisis. If yes, it shows a resource and pauses.
2. **Name** — Simple text input.
3. **Email + password** — Collected for account creation. A confirmation email is sent via Resend.
4. **Profile setup** — Four questions:
   - Motherhood stage (e.g., pregnant, newborn, toddler, school-age, teen, adult child)
   - Time available for self-care (pre-fills the time step in future check-ins)
   - Preferred categories — shown as selectable chips matching Airtable categories exactly (e.g., "Micro Practice", "Movement", "Connection")
   - Support circle (names and relationships stored as flexible data)

Once onboarding is complete, a flag (`onboarding_completed = true`) is saved in the database so the user never sees this flow again.

---

### 2. Sign In Page

**Purpose:** For returning users.

- Email + password login
- "Forgot password" link sends a magic sign-in link to their email via Resend
- Sessions persist — users stay logged in between visits

---

### 3. Home Screen

> ⚠️ **Superseded — August 2026.** This screen was replaced by the glimmer home.
> See [The Glimmer Release](#the-glimmer-release--august-2026). The description
> below is kept as a record of what the app used to be.

**Purpose:** The daily landing place. Warm, grounding, personalized.

**What's on it:**
- Time-aware greeting (e.g., "Good morning, [Name]")
- Daily rotating quote — cycles through a curated pool of 4 quotes, one per day
- Motherhood stage card — shows the user's stage (e.g., "Toddler years"), a stage-specific emoji, and a rotating daily fact about that stage
- Streak nudge — shows how many consecutive days they've checked in and when they last checked in
- Share feedback link — a small button at the bottom for users to send feedback

---

### 4. Check-In Flow

**Purpose:** The heart of the app. A 5-step guided self-check followed by a personalized care kit.

**Steps in order:**
1. **Mood** — How are you feeling overall? (Overwhelmed / Struggling / Okay / Good / Thriving)
2. **Mental** — How's your mind? (selectable indicators like "Racing thoughts", "Can't focus")
3. **Physical** — How's your body? (selectable indicators like "Body tension", "Low energy")
4. **Emotional** — What emotions are present?
5. **Time** — How much time do you have right now? (Pre-filled from the user's onboarding preference)

**Care Kit:**
- Shows 3 personalized recommendations based on mood, time, and history
- Each recommendation can be: **Skip**, **Save**, or **Did it**
- "Try different suggestions" button fetches a fresh set — it passes the IDs of what was already shown so the engine never repeats them in the same session
- Claude generates a warm 2-sentence message acknowledging where the user is and inviting them into the care kit

The selected indicators (mental, physical, emotional) are saved to the user's profile after each session so the engine can reference patterns over time.

---

### 5. History Screen

> ⚠️ **Partly superseded — August 2026.** History now also holds a **Journal** tab;
> journaling moved here when the bottom nav changed. Everything else below still applies.

**Purpose:** Shows the user their patterns over time.

**Reading your patterns card (top of page):**
- A dynamic headline + 2-3 sentence paragraph generated from the user's actual data
- References their mood trajectory, consistency, and what categories have been working for them
- If a user has checked in 3 consecutive times feeling "struggling" or "overwhelmed", a warm mental health referral card appears above it — gently encouraging them to speak with a professional, with a link to Psychology Today's therapist finder

**Mood chart:**
- Shows mood scores over time as a connected line graph
- Toggle between: Last 30 days / 3 months / Year to date / All time
- Chart starts at the user's first data point, not an arbitrary date
- Y-axis labels: Low / Okay / Good / Thriving
- Last data point is highlighted

**Session log:**
- Every check-in session listed by date with mood emoji
- Shows ALL recommendations the user rated that day (not just one)
- Each rec shown as a chip with its category emoji, title, and Done or Saved badge

---

### 6. Library Screen

**Purpose:** A saved collection of every recommendation the user has engaged with.

**What's on it:**
- Three filter cards at the top: **Done**, **Saved**, **All** — clicking one filters the list
- Category pill filters below (only shows categories that have items)
- Every recommendation they've rated 2 (saved) or 3 (did it), deduplicated — if they've done the same rec multiple times, it appears once
- Sorted by most recent

---

### 7. Profile Screen

**Purpose:** Shows the user's account information and lets them update it.

- Displays real data pulled from the database (name, stage, preferences, support circle)
- 4-step update flow mirrors the onboarding profile setup
- Stats summary (total check-ins, active days, top categories)
- Sign out button

---

### 8. Admin Report

> ⚠️ **Updated — August 2026.** The report now also shows Rest Card bingo stats
> (unique moms completing a line in the last 7 / 14 / 30 days).

**Path:** `/admin/report`

A founder-only growth dashboard. Gated to a hardcoded list of admin email addresses — regular users are redirected away if they try to access it directly.

**What it shows:**
- Engagement funnel (signed up → opened app → checked in → retained)
- Retention rate and average check-ins per active user
- This week's signups, check-ins, and active users
- Community mood breakdown and week-by-week mood trend
- Motherhood stage breakdown of the user base
- "Needs Attention" list — users who have checked in before but gone quiet for 14+ days
- Searchable user roster with toggle cards (mood weather, check-in count, last seen, recent mood trail)
- Most used recommendation categories
- Drop-off list (signed up but never opened the app)

See Sprint 3 in the Feature Log for the full rebuild detail.

---

## How Authentication Works

Authentication is handled by Supabase, with all email delivery routed through Resend.

### Sign-up flow
1. User enters name, email, and password during onboarding
2. Supabase creates the account and triggers a confirmation email
3. The confirmation email is intercepted by a Supabase Edge Function (see below) and delivered via Resend with Kindrest branding
4. User clicks the confirmation link in their email
5. The app receives a callback at `/auth/callback`, checks if they've completed onboarding, and routes them appropriately

### Forgot password / magic link flow
1. User enters their email on the forgot password page
2. Supabase sends a one-time sign-in link via Resend
3. User clicks the link and is signed in
4. From there they can update their password in the Profile screen

### The Resend Email Hook

Supabase's built-in email sender has a hard limit of 2 emails per hour on the free tier — which breaks the experience for any real user load. To fix this, a **Supabase Edge Function** was built at `supabase/functions/auth-send-email/index.ts`.

How it works:
- Supabase Auth is configured to call this function instead of sending emails itself (Auth → Hooks → Send Email)
- The function receives the email type, user details, and a secure sign-in link
- It calls the Resend API to deliver the email
- Emails arrive in the user's inbox showing "Kindrest" as the sender

This function handles all 6 auth email types: signup confirmation, magic link, password recovery, invite, and email address changes.

The Resend API key and sender address are stored as **Supabase Edge Function secrets** (not in Vercel — these are separate from the app's environment variables).

---

## The Database

> ⚠️ **Updated — August 2026.** Four more tables were added: `glimmers`,
> `rest_cards`, `rest_card_squares`, and `gem_ledger` (now unused — see the
> Glimmer Release section). The three below are the originals.

The database lives in Supabase. It has three tables.

### Table 1: `user_profiles`

Stores the core profile information collected during onboarding.

| Column | Type | What It Stores |
|---|---|---|
| user_id | UUID | Unique identifier (auto-assigned by Supabase) |
| name | text | User's first name |
| motherhood_stage | text | E.g., "newborn", "toddler", "school-age" |
| preferred_time_window | text | How much time they have for self-care |
| support_people | jsonb | Flexible JSON — names and roles of support circle |
| onboarding_completed | boolean | True once they finish onboarding |

### Table 2: `user_preference_profile`

Stores evolving preference data that the recommendation engine uses. Updated automatically after every check-in and every rating.

| Column | Type | What It Stores |
|---|---|---|
| user_id | text | Links to the user |
| preferred_categories | text[] | Updated based on behavior |
| avoided_categories | text[] | What the user tends to skip |
| preferred_effort | text | Low / medium / high effort |
| strong_regulation_types | text[] | Regulation types they engage with most (e.g., "Emotional", "Mental") |
| recent_indicators | text[] | The indicators they selected in their most recent check-in (e.g., "Racing thoughts", "Body tension") — used to personalize the Claude message |
| total_checkins | integer | Running total of check-ins. **No longer the source of truth** — the `checkins` table is. Kept in sync (+1 per real check-in) for anything still reading it. See [Counting Check-ins](#counting-check-ins--15-september-2026). |

### Table 3: `recommendation_feedback`

Every time a user rates a recommendation, a record is saved here.

| Column | Type | What It Stores |
|---|---|---|
| user_id | text | Who gave the rating |
| rec_id | integer | Which recommendation |
| rec_title | text | The name of the recommendation |
| rating | integer | 1 = skip, 2 = save, 3 = did it |
| check_in_mood | text | What mood they were in |
| regulation_phase | text | Which phase the rec belonged to |
| regulation_type | text | E.g., "Emotional", "Mental", "Physical" |
| category | text | Which category the rec belongs to |
| effort_level | text | Low / Medium / High |
| created_at | timestamp | When it happened |

### Security on the Database (RLS)

Every table has Row Level Security (RLS) enabled. This means users can only ever see and edit their own data — never anyone else's. This is enforced at the database level, not just in the app code.

---

## The Recommendation Engine

This is the intelligence layer of the app. It lives in `lib/recommendation-engine.ts`.

### The Recommendations

> ⚠️ **Updated 24 November 2026.** There are **66 rows, 63 live**. Retiring is
> done with the `retired` checkbox, never by deleting — see *The Recommendations
> Reset* below.

All recommendations live in Airtable. They're organized across 5 "regulation phases" that correspond to different mood states:

| Mood | Regulation Phase |
|---|---|
| Overwhelmed | Contain |
| Struggling | Stabilize |
| Okay | Maintain |
| Good | Expand |
| Thriving | Anchor |

Each recommendation also has a regulation type (e.g., "Emotional", "Mental", "Physical", "Social") and a capacity level (1-4, matching time available).

### How Scoring Works

When a user completes a check-in, the engine scores every matching recommendation and surfaces the best 3. It considers:

1. **Capacity level** — Does this recommendation fit within the time they said they have?
2. **Effort alignment** — Does the effort level match their current mood state? (Overwhelmed users get low-effort recs)
3. **Preferred categories** — Recs from categories they've liked before get a boost
4. **Regulation type affinity** — If they consistently engage with certain types (e.g., "Mental"), those get a +0.3 boost
5. **Historical feedback** — Recs they've rated highly bubble up; ones they've skipped fade back
6. **Novelty** — Recs they've seen recently get a penalty so the app always feels fresh

### Smart Retry Logic

If a user taps "Try different suggestions", the app passes the IDs of every recommendation already shown in that session. The engine filters those out before scoring, guaranteeing a completely fresh set. If the pool gets too small (fewer than 3 remaining), it falls back to the full set but keeps the novelty penalty in place.

### The Feedback Loop

Every skip / save / "did it" rating is written to `recommendation_feedback`. After each rating, the app automatically recalculates the user's preference profile — updating preferred categories, avoided categories, preferred effort level, and strong regulation types. This means the app gets more personalized with every check-in.

---

## API Routes — The Behind-the-Scenes Work

Next.js has a feature called API Routes — small server-side functions that handle data requests securely. Kindrest uses five:

| Route | What It Does |
|---|---|
| `POST /api/care-kit` | Scores and returns recommendations based on current mood (**2 on hard days, 3 otherwise** — the client then shows all but one, see *The Recommendations Reset*); picks the hand-written line from the Airtable `Care Kit Lines` table (**no longer a Claude call**); records the check-in once and returns its `checkinId`; accepts `excludedIds` and `checkinId` so "Something else" stays one check-in |
| `GET /api/stats` | Returns check-in count (**times, from the `checkins` table**), streak, top techniques, active days, motherhood stage, and recent history |
| `POST /api/feedback` | Saves the user's rating and recalculates their preference profile |
| `GET /api/library` | Returns all recommendations the user has saved or completed, deduplicated |
| `POST /api/waitlist` | Email-list capture — saves to Supabase and subscribes to MailerLite. Not the signup path; that's `/onboarding`. |

These routes use the **service role key** (a highly privileged Supabase key) to make database calls. That key is never exposed to the browser — it only ever runs on the server side.

---

## PWA — The "Install on Your Phone" Feature

Kindrest is set up as a Progressive Web App (PWA). This means users on mobile can tap "Add to Home Screen" and the app installs like a native app — with its own icon, no browser bar, and a full-screen experience.

### What Was Set Up

- `manifest.json` in the `/public` folder — tells the browser about the app (name, colors, icon)
- `icon-192.png` and `icon-512.png` in `/public` — the app icon (chocolate background, mustard "K")
- `display: standalone` — hides the browser bar when installed
- Works over HTTPS via Vercel (required for PWA)

### What This Is Not

A PWA is not the same as a native iOS/Android app. It cannot be submitted to the App Store or Google Play without additional work. That's a future step (see "What's Not Built Yet").

---

## Environment Variables & Secrets

The app uses several API keys and credentials, split across two places.

### Vercel Environment Variables (for the Next.js app)

These are set in the Vercel dashboard under the project's Environment Variables settings.

| Variable | What It's For |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | The URL of your Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase key (safe to expose to browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Private Supabase key — server-side only, never in browser |
| `ANTHROPIC_API_KEY` | Key for Claude API (generates care kit warm messages) |
| `AIRTABLE_TOKEN` | Key for reading recommendations from Airtable |
| `AIRTABLE_BASE_ID` | Which Airtable base to read from (`appxPVr6mBatB2jjj`) |
| `MAILERLITE_API_KEY` | Key for adding users to MailerLite email sequences |

### Supabase Edge Function Secrets (for the auth email hook)

These are set separately, in the Supabase dashboard under Edge Functions → auth-send-email → Secrets.

| Variable | What It's For |
|---|---|
| `RESEND_API_KEY` | Key for Resend — delivers all auth emails |
| `RESEND_FROM` | The sender name and address shown in the inbox (e.g., `Kindrest <onboarding@resend.dev>`) |

**Important:** If you ever rotate or regenerate any of these keys, update them in the appropriate place (Vercel or Supabase). The app will not work without them.

---

## Security

Several security measures were put in place before the first deployment.

| Measure | What It Does |
|---|---|
| `.gitignore` protects `.env.local` | Secrets are never committed to GitHub |
| `.env.local.example` | Shows developers what's needed without exposing real values |
| RLS on all 3 tables | Users can only access their own data |
| Service role key is server-side only | The most powerful database key never reaches the browser |
| Resend for auth emails | Removes rate-limit risk; emails always deliver |
| Pre-deploy security audit | A "ship-safe" audit was run before first deploy |

---

## Deployment

### How Deployment Works

1. Code lives on GitHub at `github.com/JheanelleHowellFounder/kindrest`
2. That GitHub repository is connected to Vercel
3. Every time code is pushed to the `main` branch, Vercel automatically rebuilds and redeploys the app
4. The live URL is `kindrest.vercel.app`

This means: push code → app updates. No manual deployment steps needed.

### Custom Domain

`kindrest.co` is live and connected to Vercel. Visiting kindrest.co redirects to `www.kindrest.co`, which serves the app. The app handles routing internally — signed-out visitors see the landing page, signed-in users go straight to the home screen.

### Supabase Configuration

These settings must be correct in the Supabase dashboard (Authentication → URL Configuration):

| Setting | Value |
|---|---|
| Site URL | `https://kindrest.vercel.app` |
| Redirect URLs | `https://kindrest.vercel.app/**` |

The `**` wildcard allows magic link callbacks to work from any path.

### Supabase Edge Functions

The auth email hook lives at `supabase/functions/auth-send-email/index.ts`. It is deployed separately from the main app using the Supabase CLI:

```
npx supabase functions deploy auth-send-email --no-verify-jwt --project-ref hknalomqbdyciyqoyhny
```

It must be registered in Supabase under Auth → Hooks → Send Email, pointing to:
`https://hknalomqbdyciyqoyhny.supabase.co/functions/v1/auth-send-email`

If you recreate the Supabase project, you'll need to redeploy this function and re-register the hook.

---

## What's Not Built Yet

These features were intentionally deferred to keep the MVP focused. They're ready to be picked up in the next phase.

| Feature | Priority | Notes |
|---|---|---|
| Branded sender email (hello@kindrest.co) | When ready | Add kindrest.co as a verified domain in Resend, then update the `RESEND_FROM` secret in Supabase. Currently sends from `onboarding@resend.dev` which works fine. |
| Airtable → Supabase migration | This sprint | 45 recommendations currently live-fetched from Airtable on every check-in. Moving them into Supabase will eliminate latency and remove the external dependency. |
| ~~Event tracking / analytics~~ | ✅ **Built Aug 2026** | Vercel Analytics + a seven-event funnel. See *Growth Infrastructure*. Screen-level usage and retry-button tracking are still open. |
| Expand recommendation database | This sprint | 45 recs is thin for users who check in frequently and use retry logic. |
| ~~Journal~~ | ✅ **Built Aug 2026** | Built properly and moved into History. Supabase-backed, with `journal_profile` synthesis. |
| ~~Push notifications~~ | ↪ **Superseded Aug 2026** | Solved with a daily reminder *email* instead — no notification service, no iOS PWA install requirement, and MailerLite owns unsubscribes. Native push is still open if reach ever demands it. |
| Weekly Wellness Digest email | v2 | Claude-generated weekly summary of her patterns, via MailerLite. The daily reminder now provides the sending plumbing this would build on. |
| RAG-powered recommendations | v2 | Use journal sentiment and long-term indicator patterns as context for Claude-driven rec selection. |
| App Store submission | v2 | Requires a native app wrapper (e.g., Capacitor or React Native). |
| Accessibility audit | v2 | Screen reader support, contrast review, keyboard navigation. |
| Partner-facing report | Next | Orgs currently get numbers read off `/admin/report` by hand. Fine for two pilots, manual beyond that. |
| Per-user reminder timing | Next | The reminder sends at one fixed hour (9am ET) for everyone. `preferred_time_window` exists on the profile but no timezone is stored. |
| MailerLite failure logging | Next | Subscribe calls are fire-and-forget; a failure silently loses that person. Flagged since the Glimmer Release, still open. |

---

---

## The Glimmer Release — August 2026

The biggest change to Kindrest since launch. Everything in this release made the
app **ask less** of a mother, not more. Several things were deliberately deleted.

**The principle behind every decision:** Kindrest is a *record of what already
happened*, never a list of what she should do. Nothing scores her, nothing claims
to know how she feels, and nothing has to be finished.

---

### What a mother sees now

**The home** is a greeting, one warm line, today's glimmer, and three ways in.

1. **Greeting** — large, in mustard, with her name.
2. **One warm line** — a quote that rotates daily. (This slot is also built to hold
   a note from someone in her support circle, for when that feature ships.)
3. **Today's glimmer** — one question a day, answered in a sentence. This is the
   whole daily ask: about fifteen seconds.
4. **Three circles** — **Play** (Rest Card), **Reflect** (journal), **Check-in**.
5. **"Lately, you noticed"** — her recent glimmers quoted back to her. Appears only
   once she has a collection.

---

### The Daily Glimmer

A "glimmer" is the opposite of a trigger — a small moment of ease or self-recognition.
The term comes from Deb Dana's polyvagal work; the prompts were also shaped by
Aurélie Athan's research on matrescence (the identity shift of becoming a mother)
and Rick Hanson / Barbara Fredrickson on savouring.

- **11 prompts**, one per day, chosen from the date so every mother sees the same
  question on the same day.
- She answers in one sentence and it saves to a private timeline (`/glimmers`).
- Saving is called **"Leave it here."**

**The safety fork — the most important part.** If nothing comes to mind, she taps
"Nothing came to mind" and Kindrest asks one thing: *is today just quiet, or is it heavy?*

- **Quiet** → warm validation. Nothing's wrong. No push.
- **Heavy** → it stops asking her to find a bright side, offers a check-in, and
  surfaces the Postpartum Support International warmline — support without
  requiring a crisis.
- **Crisis language** (in anything she types, anywhere) → the full crisis card
  appears immediately. She is never blocked from writing.

Every glimmer stores a `mood_signal` of `answered`, `quiet`, or `heavy`.

---

### The Rest Card

> ⚠️ **Where the squares come from changed on 8 September 2026.** The three
> bullets below about the recommendations database, the Low-effort filter and the
> record-voice rewrite are **no longer true** — see
> [The Rest Card rebuild](#the-rest-card-rebuild--8-september-2026). Everything
> else on this list still stands.

A 3×3 card that is **a record, not a to-do list.**

- **1 free centre** ("You're here") — already true, not tappable.
- ~~**8 squares drawn live from the real recommendations database** (Airtable),
  filtered to **Low effort** only.~~ Now dealt from the hand-written
  `Rest Card Squares` table.
- ~~Chosen as a **balanced spread across all six regulation types**, weighted
  toward the categories and regulation types she actually responds to.~~ Now
  balanced across **six themes**, with no preference weighting.
- ~~**Rewritten from instruction voice into record voice.**~~ Labels are now
  written by hand and rendered exactly as stored.
- **Repeat-avoidance:** a new card skips anything from her last three cards.
- Tap to mark, tap again to undo. **Refreshes every 14 days**, silently.
- Completing a line (8 possible) shows a warm message with a soft bloom and
  drifting hearts — deliberately *not* confetti, which is the visual language of
  scores.

---

### The at-risk care nudge

If a mother has had **3+ hard days in the last 14** — either a `heavy` glimmer or a
check-in logged as *overwhelmed* or *struggling* — the home shows a gentle,
dismissible card offering the PSI warmline and a check-in.

**What it is not:** it never reads what she wrote, it is not human-monitored, it is
not a crisis service, and it never alarms. It only appears when she opens the app.
The Terms page states these limits explicitly.

---

### What was deleted, and why

A full **points-and-rewards system** was built and then removed before launch:
gems earned per action, and a "reserve" vessel that filled up.

It was deleted for two reasons:

1. **It gated rest behind earning.** A mother shouldn't have to work for her rest.
2. **It lied about her.** The reserve claimed to measure how full *she* was, but
   actually measured app activity — and the Rest Card squares are deliberately easy
   ("you went to the bathroom alone"). A mother on her worst week could tap nine
   honest squares in a minute and be told she was **"full."** That is toxic
   positivity rendered as a graphic, and the opposite of the product's purpose.

The `gem_ledger` table still exists in Supabase but is unused. Nothing writes to it.

**The rule this established:** never show a number that claims to know how she feels.

---

### New database tables

| Table | Holds |
|---|---|
| `glimmers` | One row per mother per day: the prompt, her answer, and `mood_signal` (`answered` / `quiet` / `heavy`). Unique on (user, date). |
| `rest_cards` | One active card per mother per 14-day cycle. |
| `rest_card_squares` | The 9 squares on a card: position, label, source (`free` / `self`), status, and when it was marked. |
| `gem_ledger` | **Unused.** Left from the deleted rewards system; safe to drop. |

All are protected by row-level security — a mother can only ever read her own rows.
SQL lives in `kindrest/supabase/*.sql`.

---

### New API routes

| Route | What it does |
|---|---|
| `GET/POST /api/glimmer` | Today's prompt; saves her answer and mood signal. |
| `GET /api/glimmer/timeline` | Her private collection of past glimmers. |
| `GET /api/rest-card` | Her active card, generating a fresh one when the cycle ends. |
| `POST /api/rest-card/complete` | Marks a square true, or undoes it. |
| `GET /api/at-risk` | Whether to show the care nudge (counts hard days only — never reads content). |

Every route requires a valid signed-in session and checks that the caller owns the
data they're asking for.

---

### The feature flag

The whole release shipped behind **`NEXT_PUBLIC_FF_GLIMMER`**, set in Vercel.

Important: this is a **build-time** variable, not a live switch. Changing it does
nothing until the site is rebuilt and redeployed. To turn the glimmer experience
off, remove the variable and redeploy — or run `vercel rollback`, which is instant.

---

### Legal and safety copy

Terms and Privacy were updated alongside this release:

- **Terms** gained a "Safety features & crisis support" section stating plainly that
  the detection and nudge are automated, not human-monitored, not guaranteed, and
  not a crisis service — and that in an emergency she should contact 988 or 911
  directly rather than relying on Kindrest.
- **Privacy** gained a "Sensitive health information" section covering moods,
  journal entries and glimmers, and noting these may count as consumer health data
  under some state laws.


---

### After launch — the same week

Everything above shipped, then these followed within days.

#### The admin report was silently empty (fixed)

**What happened:** the report's profile query asked for a `signup_source` column
that only exists where the Founding Moms migration has been run. Production
doesn't have it, so the query errored, the result came back empty, and the report
rendered **zero users instead of fourteen** — with no visible error.

**The fix:** the query now falls back to a version without that column, so it
can't be broken again by a schema difference between environments.

> ⚠️ **Don't remove that fallback.** If the Founding Moms migration is ever run,
> the cohort section simply starts working on its own.

#### Rest Card stats in the admin report

The report now shows how many unique mothers completed a full line in the last
**7 / 14 / 30 days**, plus an all-time total.

How it's counted, since these were judgement calls:
- A line is **dated by its last-marked square** — that's the moment it landed.
- The **free centre carries no timestamp** and is skipped in that calculation.
- Each mother counts **once**, dated from her *first* bingo. The number means
  "how many mothers reached it," not "how many lines were completed."

#### How someone actually becomes a user

Worth writing down, because it was spread across two paths that looked like one:

| Path | What happens | MailerLite group |
|---|---|---|
| **Signup** (`/onboarding`) | Creates a Supabase auth account, then a profile | **Active Users** |
| **Email list** (landing-page form) | Saves to the `waitlist` table only — no account | **Waitlist** |

Both paths add to MailerLite automatically, including the email-confirmation
route (handled in `/auth/callback`).

> ⚠️ **Known gap:** the MailerLite calls are fire-and-forget. If their API fails,
> that person silently never lands on the list and nothing reports it. Fine at
> current volume; worth a retry or a failure log before driving real traffic.

#### The landing page catching up to the product

The public page had drifted badly from what the app does:

- It still sold the old loop — *"Check In → Get Your Care Kit → Come Back"* — so
  someone could read it, sign up, and land on a glimmer question instead.
- The phone mockup showed a **streak counter**, which the app deliberately no
  longer has.
- Every CTA pointed at a **waitlist** for a product that was never gated — anyone
  could already create an account.

What it says now:

- **Hero:** "You've been taking care of everyone. / This part is for you."
- **How It Works:** Notice one thing → Take what you need → It learns you. The
  check-in and care kit are the *deeper* option, not the front door.
- A **"Room for the hard days"** card, because the quiet/heavy fork is a real
  differentiator and was nowhere on the page.
- **All CTAs go to `/onboarding`.** The email capture stays lower down, reframed
  as *"Not ready yet? Join the email list."*
- The phone mockup mirrors the real home and uses the actual nav icons.

**The rule this establishes:** the landing page describes the current daily loop.
When the loop changes, the page changes with it.

#### Small design notes

- The three home circles sit on a **chocolate ground with mustard icons** — they
  anchor the bottom of the page, which felt unweighted in white.
- The **Play icon is a die with three pips on the diagonal.** It was a 3×3 grid
  first, but that reads as a table at 22px. The diagonal still nods at a
  completed line.
- Completing a line shows a warm bloom and drifting hearts. Pure CSS, and it
  honours `prefers-reduced-motion`.

---

## Growth Infrastructure — August 2026

The Glimmer Release made the product good. This release made it *measurable* and
gave it a reason to be reopened.

### Why this exists

A week after launch the production numbers were read properly for the first time,
and they were worse than anyone had assumed:

| Signal | Reality |
|---|---|
| Accounts | 19 — last signup **66 days earlier** |
| Launch email + LinkedIn post | **0 new accounts** |
| Check-ins in the previous 14 days | **0** |
| Active users in the previous 14 days | **1** (the founder) |
| Analytics installed | **none** |

Two conclusions followed, and conflating them would have wasted the next quarter:

1. **It was not only an acquisition problem.** All 17 previously-engaged users had
   lapsed. Those 17 averaged ~18 check-ins each, so the product held people while
   they used it — but nothing brought them back.
2. **Nothing brought them back because nothing could.** The codebase had no push
   notifications, no service worker, no cron, and no scheduled email. Kindrest was
   a *daily* ritual with no daily anything. There was also no way for one user to
   invite another.

Everything below follows from that.

### The production audit — `npm run audit`

`scripts/audit.mjs` checks the things that break **silently**, against production:

1. **Routes** — every screen a user can reach still responds.
2. **Auth gates** — every protected endpoint still refuses an anonymous caller.
3. **Schema** — every write the app performs still matches the live database. It
   performs the *real* write with the exact column list the app sends, then rolls
   it back.
4. **Funnel** — whether anyone signed up recently and never finished onboarding.

Exits non-zero, so it can gate a deploy. **Run it after every `vercel --prod`.**

Section 3 is the important one: it is a direct answer to the outage where
onboarding wrote a column production didn't have and nobody noticed for days.

> ⚠️ **Two traps this audit had to learn, both of which made checks pass that
> proved nothing.**
>
> - `journal-entry`, `feedback` and `stats` validate the payload *before*
>   checking auth. Sending `{}` gets a 400, never reaches the auth line, and
>   tells you nothing about whether the endpoint is gated. The audit now sends
>   well-formed payloads and treats a 400 as "inconclusive", not "pass".
> - `/library` is an intentional `redirect('/history')`. Next answers it with a
>   307 whose target is in the RSC payload rather than a `Location` header, so
>   `fetch` stops there while browsers follow it. Verified in a real browser.

### Funnel analytics

Vercel Analytics plus seven named events in `lib/analytics.ts`:

`signup_started` → `account_created` → `onboarding_completed`, with
`onboarding_failed` (the alarm), `pilot_link_opened`, and `glimmer_saved` /
`checkin_completed` as the weekly-active numerator.

> ⚠️ **The privacy rule, which is not negotiable.** These events carry funnel
> position and error codes only. No journal text, no glimmer content, no email,
> no user id, and **no mood signal** — even though `heavy`/`quiet` would be
> analytically useful. Kindrest holds what mothers write on their hardest days;
> that belongs behind auth, not in an analytics pipeline. If you find yourself
> adding a property to answer "what did she say", the answer belongs in the
> database.

`onboarding_failed` fires the moment a signup write fails, which is precisely the
failure that previously went unnoticed for days.

### The daily reminder

> ⛔ **Paused on 8 September 2026.** Everything below describes how it worked
> while it was running. It sends nothing today — see
> [Pausing the daily email](#pausing-the-daily-email) for why and how to restart it.

One email each day carrying that day's glimmer question.

**Architecture:** a Vercel cron (`vercel.json`) calls
`/api/cron/daily-reminder`, which sends **a single MailerLite campaign** — not one
send per user. That works because the glimmer is deliberately the same question
for everyone that day. It keeps the cost inside MailerLite's free tier and means
MailerLite owns unsubscribe compliance.

**Tone:** no streak, no "you've missed 4 days", no count of what she skipped. She
is invited, not chased. A guilt-shaped reminder is the fastest way to get someone
to stop opening your email, and it would contradict the product.

**The audience is derived, never hand-kept** (`lib/reminder-audience.ts`). The
original target was the existing "Active Users" MailerLite group, which had
drifted to 56 people of whom only 14 had accounts — so a daily email claiming
*"you're getting this because you have a Kindrest account"* would have been false
for 42 of them, five real users would have been missed, and the founder's own
mentor would have started receiving daily glimmer prompts.

A dedicated **"Daily Reminder"** group is now synced from Supabase before every
send. It includes everyone with an account, not just the fully onboarded — they
all created accounts, so the email's claim holds, and the people who drifted off
mid-signup are exactly who a nudge might bring back.

> ⚠️ **Unsubscribes are sacred.** The sync only ever adds people MailerLite
> already considers `active`, and never changes an existing subscriber's status.
> Having an account does not undo an opt-out. This is a legal requirement, not a
> courtesy — do not "fix" the sync to re-add opted-out users.

**Safety switches:** sending is off unless `DAILY_REMINDER_ENABLED === 'true'`;
without it the route reports exactly who it *would* email and stops. `?preview=1`
renders the email in a browser and returns before any sync or send.

### One-tap invite

The cheapest acquisition channel, and the only one with a true zero cost.

- `referral_codes` (her permanent link) and `referrals` (who came through it) —
  two tables, so a code outlives any single invite. `supabase/referrals.sql`.
- `GET /api/invite` returns her code, creating it on first ask. `POST` claims a
  code after onboarding.
- `/i/<code>` is a deliberately quieter page than the landing page — somebody she
  trusts already made the pitch. It greets her by the sender's **first name only**
  (`/api/invite/who`, public, returns nothing else).
- `InviteCard` uses the native share sheet where it exists, clipboard otherwise.
  It appears on the home screen **only after she's answered today's glimmer** —
  the app shouldn't ask her for anything before it has given her something.

Codes use an alphabet with no `0/O/1/I/L`, because they get read aloud.

> ⚠️ Attribution is fire-and-forget after onboarding, and an unknown code returns
> "attributed: false" rather than an error. **A referral problem must never block
> a mother from signing up.**

### Local partners

`/join/<slug>` was written entirely for employers — *"your team set this aside for
you"*, *"they never see your check-ins"*. Read from a coffee shop counter that is
merely odd, and the second line plants a worry nobody had.

`organizations.kind` is now `'employer' | 'partner'`
(`supabase/organizations-kind.sql`), and a partner gets copy that fits:
*"<Name> thought of you."* `/admin/orgs` picks the type and hides the seat count
for partners, who don't have one. Everything falls back to `employer` wherever the
migration hasn't run.

This exists so any business with mother customers — cafés, salons, clinics, birth
centres — can hand out a branded link, and every signup through it is attributed
to them.

### Bingo now completes the card

Completing a line retires the card and opens a full celebration rather than the
passing toast it showed before, then deals a fresh card in place.

The copy counts what she *gave herself* and never scores her. The fresh card is
**offered, not forced** — "nothing lost if you don't" — because momentum that
implies obligation is a streak wearing better manners, and streaks were removed on
purpose.

> ⚠️ Retirement is a **conditional update** (`.eq('status','active')`), so
> un-marking and re-marking a square cannot retire the same card twice or fire a
> second celebration.

### Three bugs worth remembering

These all shared a shape: code that *looked* like it degraded gracefully, didn't.

**1. The wrong error codes, in six routes.** Handlers checked Postgres `42P01`
(undefined table) and `42703` (undefined column). But PostgREST usually answers
first from its own schema cache with **`PGRST205` / `PGRST204`** — verified against
production. Every "graceful degradation" path built on the Postgres codes would
have failed to degrade, including the migration banner on `/admin/orgs`. Now
centralised in `lib/pg-errors.ts` (`isMissingTable`, `isMissingColumn`), which
checks both vocabularies. **Use those helpers rather than comparing codes inline.**

**2. Next.js caches `fetch` GETs — even in a `force-dynamic` route.** The reminder
sync read a stale group list, looked straight past a group it had just created,
then failed to recreate it because the name was taken. All MailerLite reads now
pass `cache: 'no-store'`.

**3. MailerLite's group listing is eventually consistent.** Reading the group size
back immediately after a sync returned zero. The send path had a guard that
skipped sending when the audience was empty — so the *very first send* would have
silently done nothing and looked like success. The sync now counts what it changed
rather than re-reading.

### New environment variables

| Variable | Value | Why |
|---|---|---|
| `CRON_SECRET` | a long random string | Vercel attaches it to the scheduled request; the route refuses anything without it. **Set this before enabling sending** or the send endpoint is publicly callable. |
| `DAILY_REMINDER_ENABLED` | `true` | The on switch. Anything else keeps the route in dry-run. |

> ⚠️ Vercel's **Redeploy** button rebuilds the *same source snapshot* with new
> variables. Because Kindrest deploys from the CLI rather than a git push, there
> is no newer commit for it to pick up — so "Redeploy" applies new settings to
> **old code**. Changing a variable and shipping new code are two separate acts.

### New migrations

| File | Adds |
|---|---|
| `supabase/referrals.sql` | `referral_codes`, `referrals` |
| `supabase/organizations-kind.sql` | `organizations.kind` |

Both are additive and safe to re-run. Both degrade to the previous behaviour if
never run.

---

## Attribution & the Village — 14 August 2026

Two unrelated pieces shipped the same day: knowing where mothers come from, and
letting the people who love them say so.

### Where each mother came from

Nothing recorded how anyone found Kindrest, so every channel decision was a
guess. Now first touch is captured on arrival and follows her into signup.

- `lib/attribution.ts` writes `utm_source/medium/campaign`, referrer and a
  mobile flag into one localStorage key. **First touch wins** — if Instagram
  brought her in March and a friend's invite brought her back in April,
  Instagram gets the credit.
- Captured in the **root layout**, not on the landing page. Campaign traffic
  doesn't only land on `/`: a flyer QR lands on `/join/<slug>` and an invite on
  `/i/<code>`, and both are answers worth having. First-touch makes calling it
  everywhere harmless.
- Signup asks one optional question — *"How did you hear about Kindrest?"* —
  stored in `heard_about_us`. It is the only attribution that survives word of
  mouth, which is the channel most likely to actually be working.

> ⚠️ **Attribution is written *after* the profile upsert succeeds, never inside
> it.** Folding these columns into that upsert would put signup back at the mercy
> of a missing column — the exact bug that broke onboarding in production. If the
> attribution write fails, she is already a user and only the attribution is lost.

**PostHog** carries exactly four events: `landing_view`, `cta_click`,
`signup_completed`, `first_checkin_completed`. Autocapture and session recording
are **off** — this app has journal text on the page. It no-ops without
`NEXT_PUBLIC_POSTHOG_KEY`, which is currently unset, and nothing depends on it.

#### `first_checkin_at`, and why it exists

Activation is *"first check-in within 48 hours"*. The only dated evidence of a
check-in was `recommendation_feedback`, which is written when she **rates** a
suggestion — and of 15 real users who had checked in, only 11 ever rated. A
ratings-based definition silently misses a third of them.

`/api/care-kit` now stamps `first_checkin_at` once, when a kit is generated.
The migration backfills it from existing ratings so the report had real history
immediately.

> ⚠️ `recommendation_feedback.user_id` is a **text** column holding non-UUID
> leftovers from the persona simulations (`demo-user-001`, `sim-persona-1`).
> Comparing it to `user_profiles.user_id` raises `42883: operator does not exist:
> uuid = text`. Cast the uuid to text — the demo rows then fall away on their
> own, which is what you want.

### The admin report, reworked

Community mood and most-used categories were removed: neither answered a
question that changed what to do next. The **user roster is now collapsed by
default** — it was the longest thing on the page and buried everything else.

Added in their place:

- **By Signup Week** — signups, activated, activation rate, and returned-the-
  following-week. Weeks start Monday.
- **Landing Page** — visitors, signups, and the conversion between them, plus
  breakdowns by how they heard about Kindrest, campaign source, referrer and
  device.

Conversion needed data nothing was recording: every metric described people who
had **already signed up**, so anyone who looked and left was invisible.
`landing_views` is a daily counter and nothing else — no visitor ids, no IPs, no
sessions — incremented once per browser session.

> ⚠️ That counter is **publicly writable** by necessity: visitors aren't logged
> in. Treat it as a trend, not an audited number, and don't quote it to anyone.
> The page says so itself.

A separate `/admin/growth` page existed for a few hours and was folded into the
report. Two admin pages both answering "how is growth going" was one too many.

### The village

The narrow version of community, and **the shape is the safety argument**:

- Notes travel **one way**. Nobody leaving one can read anything of hers.
- **No account** for the person writing — asking a grandmother to sign up would
  kill the feature.
- **No feed, no discovery**, no way to reach a mother you weren't sent to.

That is what makes it a guestbook rather than a social network, and it is the
reason it shipped without the moderation machinery a public space would need.
**Keep it that way** — every one of those properties is load-bearing.

| Piece | What it is |
|---|---|
| `/for/<code>` | The public door. Two fields, no signup, built for someone who has never heard of Kindrest. |
| `/village` | Her side: share the link, read her notes, delete, close or rotate. |
| `/api/village` | Her link and notes. GET, POST (rotate/close/open), PATCH (mark seen), DELETE (hide). |
| `/api/village/note` | Public. GET resolves a code to a **first name only**; POST leaves a note. |
| `lib/village.ts` | The limits, in one place. |

Her home screen shows the newest unread note where the daily quote normally
sits. That slot was reserved in `GlimmerHome` months earlier and is now wired.

#### The limits, and why each one

Anyone holding the link can write to her on her worst day. That is the actual
risk — not lawsuits.

- **Links in notes are refused outright.** One rule removes phishing and spam,
  and is worth far more than the rare person who wanted to share a recipe.
- **280 characters**, 40 for a name.
- **8 notes per recipient per hour.** Her village is small; a flood is not her
  village.
- **Unknown and closed links return the identical page**, so guessing codes
  reveals nothing about whether one exists.
- The public endpoint returns a first name and nothing else — never her
  surname, email, user id, or a word she has written.

> ⚠️ **The two controls that matter are delete and rotate.** She must always be
> able to remove a note and change the locks without asking anyone. Rotating
> kills the old link immediately and keeps her notes — they belong to her, not
> to the link they arrived through.

Terms gained a *"Notes from your village"* section covering all of this, plus a
line addressed to the person writing.

> ⚠️ **Discoverability was broken on the first pass and is worth remembering.**
> Both entry points sat on the home screen and both were conditional — the card
> only appeared after she'd answered today's glimmer, the note preview only if
> she already had one. A mother who hadn't answered *could not reach the feature
> at all*. There is now a permanent entry at the top of Profile, and the home
> card is unconditional. The **invite** card still waits until her day is
> handled: that one asks her to give something, the village offers her support.

### New migrations

| File | Adds |
|---|---|
| `supabase/growth-attribution.sql` | Attribution columns + `first_checkin_at`. **Run as two queries** — the editor treats a block as one transaction, so a failing backfill rolls the columns back with it. |
| `supabase/landing-views.sql` | `landing_views` + `increment_landing_view()` |
| `supabase/village.sql` | `village_links`, `village_notes` |

---

## Therapist Testing — 17 August 2026

A therapist walked through Kindrest and found five things in about twenty
minutes. Two were real bugs that had been live for months.

### The check-in went blank on "Overwhelmed"

**What happened:** `CheckInFlow` mapped the mood she picks to the label the
indicator data is tagged with, using a hand-written `MOOD_TO_LABEL`. It had
drifted from the data:

| She picks | Code looked for | Data actually has | Result |
|---|---|---|---|
| Overwhelmed | `Overwhelmed` | `Struggling` | **nothing matched — empty screens** |
| Struggling | `Struggling` | `Off` | silently showed the *more severe* list |

So the worst-off users got three empty indicator screens with a Continue button,
and the second-worst got the wrong questions. The second bug hid for months
because it still rendered *something*.

**The fix:** the map is now derived from `MOODS`, which already held the correct
pairing, so the two can't drift apart again. A mood with no indicators falls back
to the Okay set rather than rendering blank.

> ⚠️ **Don't reintroduce a hand-written mood map.** The two vocabularies
> genuinely differ — the UI says "Overwhelmed", the data says "Struggling" — and
> writing that correspondence down twice is what broke it.

### Insights ignored two-thirds of the app

`/api/stats` read `recommendation_feedback` only, and returned all zeros when
there was none. A mother answering the daily glimmer every day for a fortnight
saw a completely blank Insights page — the primary loop contributed nothing to
her sense of showing up.

It now counts **glimmers, journal entries and check-ins**, and leads with the
number of days she showed up in any way at all, with the breakdown underneath.

### The safety net is now two tiers

Previously every match produced the full crisis card. That is the wrong response
to "I feel numb", and worse than wrong: it teaches her to dismiss the screen,
which costs the one moment it mattered.

| | Tier 1 — Danger | Tier 2 — Distress |
|---|---|---|
| Catches | suicidal statements, self-harm, harm to baby, hearing voices, **passive SI** | intrusive thoughts, fear of self, numbness/dissociation, wanting to escape, resentment toward baby |
| Triggers | 19 | 15 |
| Response | `CrisisCard` — 988, PSI, Crisis Text Line, 911 | `GentleCard` — "That sounds heavy", PSI warmline, **988 in smaller type** |
| Tone | emergency | an offer |

`assessSafety(text)` returns `'danger' | 'distress' | 'none'`. **Tier 1 is checked
first and wins outright** — the same sentence never produces both.
`detectCrisisLanguage()` is kept as a thin wrapper meaning "danger only", so
existing call sites keep their original meaning.

Wired into all three places she can write: the glimmer, the journal, and both
free-text doors inside a check-in.

> ⚠️ **Passive suicidal ideation belongs in Tier 1.** "they'd be better off",
> "I'm not safe" and "don't trust myself with/around" started in Tier 2, which
> gave them a warmline where the earlier single-tier build gave them 988 — a
> regression for exactly the phrases that could least afford one. Note the
> narrowing: plain "I don't trust myself" is usually about decisions and stays
> Tier 2; only the *with / around / alone* form escalates.

> ⚠️ **988 appears on the Tier 2 card too**, in smaller type. Keyword matching
> assigns a tier by phrase, not by state — "I feel numb" can mean either — so
> the number must stay reachable from the quieter card. This is the cheap
> insurance against every miscategorisation.

> ⚠️ **Ordinary venting is deliberately excluded from both tiers** — "I'm
> exhausted", "I feel like a bad mother", "I can't do this anymore". These are
> close to universal postpartum; including them would fire on nearly everyone.
> That is a judgement call pending clinical review, not a finished answer.

Boundaries are covered by 18 test cases in the commit message for `0b09201`,
including that "I killed it at work today" stays silent.

### Love Notes now hold the first note from a new sender

A note from an unrecognised name shouldn't land unfiltered on her home screen on
her worst morning — but approving every note from her own mother turns a kindness
into an inbox. So the **first** note from a name waits; allowing that sender
trusts them from then on.

- `village_notes.status` — `pending` | `kept` | `hidden`
- `village_senders` — `(user_id, name_key, status)`, matched on a lowercased name

**Blocking is silent to the sender.** They get the same success response as
everyone else, and their next note is dropped without being stored. Telling them
they'd been blocked would only invite a new name.

> ⚠️ Name matching is deliberately weak — a determined person could type a name
> she trusts. It defends against a stranger's first note arriving unannounced,
> not against impersonation. Delete and link-rotation remain the real controls.

### And the glimmer box

Two rows on a bare underline, which rendered as about a line and a half. Now a
bounded field with a border, roughly four lines.

### New migration

| File | Adds |
|---|---|
| `supabase/village-approval.sql` | `village_notes.status`, `village_senders`; backfills every existing sender as allowed so nobody is re-approved |


## Positioning, Warm Lines & Pausing the Daily Email — 8 September 2026

**Go live: 8 September 2026.**

Four things in one release: the app now says plainly what it is and isn't, the
signup path that had been quietly turning people away is fixed, the warm line on
the home screen has a real pool behind it, and the daily email is switched off.

---

### The signup path was broken, and it looked like drop-off

The most expensive bug in the guide so far, because it was invisible and it was
being misread as user behaviour.

**Two faults, stacked.** `/auth/callback` had a branch that checked whether the
app was running as an installed PWA, and if it wasn't, stopped there instead of
sending her into onboarding. Every mother who signed up in a normal browser hit
it. If she got past that, the profile save called `upsert` without an
`onConflict` key, so Supabase matched on the primary key rather than `user_id`
and failed with a `23505` unique-constraint error for anyone who already had a
row. That was the red error message on the last onboarding screen, with nothing
saved.

**Why it mattered beyond the bug:** 8 of 20 accounts had never finished
onboarding, and that number was being read as mothers losing interest. It was
not. They were being stopped. Any conclusion drawn from the funnel before this
date is suspect.

**The fix:** the PWA branch is gone, and both profile writes pass
`{ onConflict: 'user_id' }`, with a fallback write that drops `signup_source` in
case the column is missing. Onboarding also gained a fifth step, *"How did you
hear about Kindrest?"*, which writes to the attribution table.

> **The lesson, again:** every bug in this release reported success while
> failing. A route that returns 200 and goes nowhere, an audit that prints a
> pass while destroying data, an email metric read off a field that doesn't
> exist. Assume silence means broken until something proves otherwise.

---

### What Kindrest is, in the product

`components/shared/WhatKindrestIs.tsx` — one component, five placements, so a
mother is told what this is before she relies on it.

| Where | What she sees |
|---|---|
| End of onboarding (dark variant) | The full statement, before she has used it once |
| Profile | The full statement, findable later |
| Landing page, by the CTA | Short version, in readable type |
| Care kit results | One line |
| Terms | The formal version |

It leads with what Kindrest **is** and puts the boundary second. *"Not a
replacement for therapy"* as an opening reads like a legal shield and quietly
diminishes the product; the limit lands harder when it follows a claim instead of
standing in for one. On the landing page the old version of this line sat in the
footer at 25% opacity, which is the design equivalent of hoping nobody reads it.

> ⚠️ **Do not upgrade the wording.** It says the parts that carry the most
> weight are *"shaped with input from mental health professionals."* That
> describes a practice and stays true as more reviews come back. It must not
> become "reviewed by clinicians", "clinically validated", or anyone's name
> without written permission — the professionals involved were explicitly told
> we were not asking for endorsement or to use their names.

---

### The warm line has a real pool now

The line under the greeting on the home screen used to draw from **four** quotes
in one screen and ten in the other, wrapped in quotation marks, with the two home
screens disagreeing about what today's line was.

- The pool now lives only in `lib/quotes.ts` and holds **21 lines**.
- `components/home/HomeScreen.tsx` no longer keeps its own copy; it imports
  `getTodaysQuote()`. One source of truth.
- Rotation is unchanged and date-seeded: one line per day, **the same line for
  every mother**, cycling every 21 days. Not random, so it changes without
  feeling arbitrary, and two mothers comparing notes see the same thing.
- No quotation marks, no attribution, no em dashes.

**The override is untouched.** When someone in her circle has left her a Love
Note, the note takes this slot instead. They do the same job and the personal one
does it better.

---

### Pausing the daily email

The daily reminder is **off**. Not deleted.

**Why.** It was earning 46% opens and four click-throughs in two weeks, with no
sign it brought anyone back. The failure was not the subject lines or the send
time — both were tuned, and people were opening it. A daily email is a calendar
deciding that a mother owes attention today. Nothing had happened; the email was
the app asking to be thought about, and that is the first thing a busy mother
filters out.

**Two independent stops,** so neither one alone can restart it by accident:

| Stop | Effect |
|---|---|
| Both cron entries removed from `vercel.json` (now `"crons": []`) | Nothing fires |
| `DAILY_REMINDER_ENABLED` set to `false` in production and preview | Nothing sends even if something did fire, or the route is hit by hand |

**What is left intact:** the route, `lib/reminder-audience.ts`, the eleven
glimmer prompts with their subject hooks, and `?preview=1`. Restarting is putting
the two entries back and flipping one variable.

**If it comes back, it should be event-shaped rather than calendar-shaped** —
mail that goes out because something happened to *her*. A Love Note arriving is
the strongest candidate: it is true by definition, rare by nature, and the
subject line writes itself.

---

### The audit destroyed real user data, and now cannot

Recorded here because it is the worst thing that has happened to this codebase.

`scripts/audit.mjs` tests that onboarding's profile write still matches the live
schema, and it did that by upserting test values onto a **real user's row** — with
no restore. Across roughly fifteen runs it overwrote two mothers' names, stage,
time window, categories and support people, while printing a green pass.
Names were recovered from `auth.users.user_metadata`; the rest was not
recoverable.

**The fix** (`checkProfileWrite`): snapshot the row first, write the test values,
restore **before** reporting, so a failed assertion cannot skip the rollback. If
there was no row to begin with, delete rather than leave one behind.

> ⚠️ Never add a bare `upsert` against live user data to the audit. The comment
> block above that function says so, and this is why.

**Also corrected in the audit:** the funnel counted profile *rows* as completed
onboarding, which overstated completion by six. It now counts
`onboarding_completed`.

---

### Love Notes: she sees the message before she sends it

The share message is defined once as `SHARE_MESSAGE` in `app/village/page.tsx`,
shown on the page in full, and used for both the native share sheet and the
clipboard. Nobody should be asked to forward words to their own mother sight
unseen, and most people will not edit what they are handed. The message answers
the two questions a recipient has immediately: *do I need an account* (no) and
*how long will this take* (a second).

Desktop browsers without a share sheet fall through to the clipboard, and a
refused clipboard falls through to "copy the message above" rather than a button
that appears to do nothing.

---

### Numbers that were wrong, and are now right

Two figures in earlier reporting were fabrications introduced by tooling, not by
the product:

| Figure | Reported | Actual |
|---|---|---|
| Check-ins | 316 | 83 |
| Email open rate | 0% | 46% |

The open rate was read from `unique_opens_count`, a MailerLite field that does
not exist; the API returned nothing and it was rendered as zero. A decision to
kill the email was nearly made on that number. Check any metric against the
provider's actual response shape before acting on it.

---

### Files changed

| File | Change |
|---|---|
| `lib/quotes.ts` | 21 warm lines, single source of truth |
| `components/home/HomeScreen.tsx` | Imports `getTodaysQuote()`; local four-quote pool deleted |
| `components/shared/WhatKindrestIs.tsx` | New — the positioning statement, light and dark variants |
| `app/auth/callback/page.tsx` | PWA dead end removed |
| `components/onboarding/OnboardingProfileFlow.tsx` | `onConflict: 'user_id'` on both writes; step 5; attribution |
| `app/village/page.tsx` | `SHARE_MESSAGE` shown and shared |
| `vercel.json` | `"crons": []` |
| `app/api/cron/daily-reminder/route.ts` | Paused, with the reason recorded at the top |
| `scripts/audit.mjs` | `checkProfileWrite` snapshot-and-restore; funnel counts completion |

**No database migrations in this release.**


## The Rest Card Rebuild — 8 September 2026

**Go live: 8 September 2026.** Full working notes in the repo:
`docs/rest-card-audit.md` (what was wrong) and `docs/rest-card-rebuild.md`
(what replaced it).

The Rest Card no longer derives its squares from the Recommendations table. It
deals from **`Rest Card Squares`**, a new Airtable table of hand-written labels,
and renders them exactly as stored.

---

### Why it had to change

The old card took recommendation titles written as **instructions** and converted
them to past tense by conjugating the first verb. It shipped this to a real card:

> You got one thing out of your head and **ontoed** paper

along with six tense mismatches ("You moved your body in a way that *feels*
celebratory"), two questions rendered as records, and an em dash.

The deeper problem was that the content was **derived rather than written**.
Every square was a side effect of copy authored for the check-in screen. Nobody
had ever written a Rest Card square.

---

### The new content source

**Table: `Rest Card Squares`** — 84 rows.

| Field | Type | Used for |
|---|---|---|
| `#` | number | Display order in Airtable. Not read by the app. |
| `label` | multilineText | The square text, rendered verbatim. |
| `theme` | singleSelect: `body, mind, space, people, play, me` | The balancing axis. |
| `stage` | singleSelect | `all`, or one specific stage. |
| `active` | checkbox | Whether the square can be dealt. |

Themes: body 15, people 15, play 15, me 15, mind 12, space 12 — all comfortably
above the 8 a card needs.

**The voice changed deliberately.** Labels are first person with the subject
dropped — *"Drank water before coffee"*, *"Ate sitting down"* — so the card reads
as her own account of the day rather than the app narrating it back to her.

> **What this means for the founder:** copy fixes no longer need a developer or a
> deploy. Edit the Airtable row, wait ten minutes for the cache, done.

---

### How a card is dealt now

1. Pool = **active** rows tagged `all` or her own stage.
2. Drop anything from her **last three cards**.
3. If that leaves fewer than 8, fall back to the full stage-eligible pool. **This
   is the only fallback.**
4. Take **one square at random from each of the six themes**, in random theme order.
5. Top up to 8 at random from what is left, then **shuffle the positions** so
   themes don't land in the same cells every time.

**No preference weighting.** `user_preference_profile` is not read by this route
at all. The card describes an ordinary day; steering it toward what she already
likes narrows the day rather than recording it.

---

### Stage mapping

Onboarding collects six stages; the table needs one value each. Nothing is
collapsed — preschool is its own transition, and so is the 3-to-12-month stretch.

| Onboarding | Airtable `stage` |
|---|---|
| `expecting` | `pregnant` |
| `newborn` (0-3mo) | `newborn` |
| `infant` (3-12mo) | `infant` |
| `toddler` (1-3yr) | `toddler` |
| `preschool` (3-5yr) | `preschool` |
| `school_age` (5+) | `school` |

A mother draws squares tagged `all` **or** her own stage. No stage set means
`all` only. **All 84 rows are `all` today**, so the filter is a no-op until
stage-specific rows are written. It needs no code change when they are.

---

### The `active` checkbox is not a plain boolean

Airtable **omits an unticked checkbox from the API response entirely**, so a
retired square and a table with no `active` column are identical on the wire.

- `active ?? true` would make unticking do nothing.
- `active === true` would empty the board the moment the column was added but
  before anything was ticked.

`getRestCardSquares()` decides per fetch instead: if **no** row anywhere carries
the field, the column doesn't exist and every square is active; if **any** row
does, the column is in use and absent means retired. Correct before, during and
after the column was added.

---

### Bugs closed

| | |
|---|---|
| **F1 — a card could carry the same square twice.** The old dealer padded short deals from a hardcoded list *by index*, with no uniqueness check. | `buildCardSquares()` now returns `null` rather than padding, and a `unique (card_id, label)` constraint means a future change can't quietly reintroduce it. |
| **F7 — two taps could deal two cards.** The route read, archived, then inserted with nothing in between. | A partial unique index on `rest_cards (user_id) where status = 'active'`. The losing request catches `23505` and returns the winning card, so a double tap is invisible. |
| **Airtable reads stopped at row 100.** `fetchTable()` never read the `offset`, so content would have silently ceased to exist at row 101 — no error, no warning. | Follows the offset, with a 20-page stop. This fixed `getRecommendations()` too, which the check-in flow still uses. |

---

### Deleted

`toRecordVoice()`, `IRREGULAR` (60 verbs), `RECORD_VOICE_OVERRIDES`, and
`SELF_ACTIONS` (23 hardcoded squares). **There is no rewriting layer left.** If a
square reads wrong, the fix is the Airtable row — never a transform in the code.

---

### Errors are loud now

An empty or unreachable table returns **503** with a logged error, and the UI
shows *"Your card is on its way."* There is no silent substitute card, because a
card built from placeholder copy is worse than no card and tells you nothing is
wrong.

If the squares insert fails after the card row is created, the card is deleted
rather than left active — a half-dealt card would otherwise block every future
deal.

---

### Verification

3000 simulated deals against the live 84 rows:

| Check | Result |
|---|---|
| Cards with a duplicate square | **0** |
| Repeats against the previous card | **0** |
| Malformed cards | **0** |
| Cards containing all six themes | **3000 of 3000** |
| A retired square appearing on a card | **0 of 2000** |
| Stage-eligible pool, each of the 7 mappings | 84, all above the 8 needed |

**Bingo was tested end to end against the live database**, on an account with no
Rest Cards so nothing real was touched: a completed line registers, `bingo: true`
fires the congratulations, re-marking can't fire it twice, a fresh card deals
straight after with zero repeats from the finished card, and a second *active*
card is correctly rejected with `23505`.

---

### Not changed

Free centre, tap to mark and unmark, the 14-day cycle, line completion retiring
the card, the bloom and drifting hearts, the "nothing lost if you don't" offer,
and the admin report stats. `/api/rest-card/complete`, `completedLines()` and
`LINES` were not touched.

**Existing cards were left alone.** Nobody's active card was redealt; old content
rolls off within 14 days.

---

### Migration

`supabase/rest-card-integrity.sql` — deletes 4 squares with empty labels (all on
one archived prototype card, rendering as blank cells), then adds the two
constraints above. Run 8 September 2026; `rest_card_squares` went from 77 rows to
73.

---

### Files changed

| File | Change |
|---|---|
| `lib/airtable.ts` | `getRestCardSquares()`; offset pagination for every table |
| `lib/restcard.ts` | Rewriting layer and hardcoded pool deleted; theme-based deal; returns `null` rather than padding |
| `lib/types.ts` | `RestCardSquare`, `AirtableStage`, `STAGE_TO_AIRTABLE` |
| `app/api/rest-card/route.ts` | Deals from the new table; stage filter; no preference profile; 503 on an empty pool |
| `components/glimmer/RestCard.tsx` | Docblock only |
| `supabase/rest-card-integrity.sql` | New migration |


## Counting Check-ins — 15 September 2026

**Go live: 15 September 2026.** Plan and the full map: `docs/checkin-count-plan.md`.

### The rule

> **A check-in is one time she goes through the check-in process and reaches her care kit.**
> "Something else" changes what she is offered. It does not change the fact that she showed up, so it is **the same check-in.**

Taking **"I'm not sure, let's write it out"** counts too. She came to check in and chose to write.

---

### What was wrong

Kindrest had **no record of a check-in**. It inferred them two ways, and both were wrong, in opposite directions.

| Signal | How it was made | The problem |
|---|---|---|
| A counter (`user_preference_profile.total_checkins`) | +1 every time a care kit was built | **Overcounted.** Every "Something else" tap added another. |
| Days with a rating (`recommendation_feedback`) | Any day she tapped Done or Save | **Undercounted.** A check-in where she rated nothing did not exist. Two check-ins in one day counted as one. |

Measured across 17 real users at the time of the fix:

- The counter said **27** check-ins. Rating-days said **15**.
- **6 mothers had checked in and were invisible** to the admin report, their History calendar, and the hard-day nudge.
- The History screen returned **zero** check-ins for those mothers and stopped before counting anything else.

The hard-day nudge mattered most: it only counted hard days on which she rated something, so **a mother who checked in Overwhelmed and could not manage anything else was exactly who it missed.**

---

### The `checkins` table

One row per check-in (`supabase/checkins.sql`).

| Column | What it stores |
|---|---|
| `id` | Identifies the check-in, so a retry can say "same one" |
| `user_id` | Whose |
| `mood` | Null for the "I'm not sure" path |
| `time_available` | Context |
| `source` | `care_kit`, `journal`, or a `backfill_*` value |
| `estimated` | True only for rows reconstructed from before this table existed |
| `created_at` | When she showed up |

**Row-level security is on, with a select-own policy and deliberately no insert policy.** Rows can only ever be written by the server. That is what makes "Something else" provably the same check-in: a check-in cannot be faked or double-counted by replaying a request from the phone.

**How the reuse works** (`lib/checkins.ts`):

1. First care kit: the server creates the row and returns its `id`.
2. "Something else": the app sends that `id` back. The server confirms it belongs to her and is less than **3 hours** old, and creates nothing.
3. If the id is missing, invalid, not hers, or older than that, it is treated as a new check-in. The count errs toward her having shown up, and the page never breaks.

---

### What now reads the record

| Where | What changed |
|---|---|
| History: "N days you showed up" | Counts check-in **times**, not days |
| History: calendar and trend | Marks days she checked in, rated or not |
| History for a mother who never rated | Was blank. Now shows her check-ins. |
| Admin: per-user check-ins, retention (3+), averages, total, this week | From the record |
| Admin: pilot org numbers | From the record — **this is what partners are told** |
| Admin: at-risk list, cohort activation and "returned" | From the record |
| Hard-day nudge | Hard moods from the check-in itself, so an unrated Overwhelmed check-in counts |
| Analytics `checkin_completed` | Fires **once per check-in**; it used to fire again on every swap |
| `total_checkins` counter and `first_checkin_at` | Still updated, but only on a **new** check-in |
| `scripts/audit.mjs` | Checks the table accepts writes, so silent loss of counting fails the audit |

---

### The past is estimated, and says so

Nothing recorded check-ins before this, so history was reconstructed: **one check-in per day she rated something, plus each mother's `first_checkin_at`** where that day had no rating. Every backfilled row carries `estimated = true`.

- **40 rows** backfilled: 39 from rating days, 1 from a first check-in. 24 on the founder's own accounts, **16 across 12 other mothers**, spanning 6 April to 10 September 2026.
- **5 mothers could not be recovered at all.** Their check-ins were never dated anywhere. They count correctly from their next one.
- The admin report prints **"Check-ins before 15 September 2026 are estimated"** so nobody reads the old numbers as exact.

---

### Verification

Tested end to end on a dedicated test account in production, from a baseline of zero:

| Step | Result |
|---|---|
| One check-in, then three or four "Something else" taps | **1** row (would have been 4 or 5 before) |
| A second, separate check-in | **2** rows total |
| "I'm not sure" → wrote and saved | **3** rows, the third with no mood and source `journal` |
| Counter | Moved 6 → 9, once per real check-in |
| History | 3 check-ins across 1 day — the "times, not days" rule |

An earlier attempt at this test ran against the **live site instead of the preview**, because a magic-link sign-in always opens kindrest.co and a session does not carry across domains. It looked like a failure and was not: production was still the older code. Worth remembering when testing anything signed-in on a preview link.

---

### Files

| File | Change |
|---|---|
| `supabase/checkins.sql` | New table, security, and the estimated backfill |
| `lib/checkins.ts` | Creates a check-in once; reuses it on "Something else" |
| `app/api/care-kit/route.ts` | Records the check-in, returns `checkinId` and `isNewCheckin` |
| `app/api/journal-entry/route.ts` | Records a check-in for the "I'm not sure" path |
| `app/api/stats/route.ts` | History counts from the record; no longer blank for non-raters |
| `app/api/admin/report/route.ts`, `app/admin/report/page.tsx` | Every check-in metric, plus the "estimated before" note |
| `app/api/at-risk/route.ts` | Hard days from the check-in record |
| `components/check-in/CheckInFlow.tsx` | Sends the check-in back on a swap; fires analytics once |
| `scripts/audit.mjs` | Check-in write check |

---

## Journal Starters, and Who Owns the List — 2 October 2026

The journal was a blank box, and a blank box was not working. Of the first 16
entries, **14 came from being prompted somewhere else in the app** — 7 from the
check-in's "I'm not sure" door, 7 from reflection recommendations — and only
**2 were free writes** from the journal page itself. Median entry: 14 words,
from 2 writers. The box was not the problem. Having nothing to answer was.

### The rule the starters are built to

The check-in already asks her state three ways a day: how she is, her mind, her
body, her heart. So **nothing in the journal is answerable with a mood.** The
check-in asks her state; the starters ask her story.

This killed several otherwise decent prompts. "What's taking up space in your
mind?" is the check-in's mind question in different words. "What is your body
telling you right now?" is its body question. Two others were cut for
duplicating prompts already in the daily glimmer bank — "what are you looking
forward to" and "where do you feel most like yourself" both already exist in
`lib/glimmers.ts`, and a mother would have met the same question twice in a day.

A second rule emerged from what the founder kept and cut: **no guilt, no task,
no grievance.** Drafts asking what she regretted saying yes to, what would make
tomorrow easier, and what decision she kept putting off were all cut — they turn
the journal into a complaint or a to-do list. What survived invites noticing.

Three starters exist for one specific job: *"What were you worried about a month
ago that isn't true anymore?"*, *"What are you better at now than a year ago?"*,
*"What's one thing you've stopped apologizing for?"* They show her she has
moved, which a mother in month four cannot see from the inside because every day
looks identical from in there.

Two more are deliberately low-effort — *"what happened today that you want to
remember"*, *"the last thing that made you laugh out loud"*. Ten seconds to
answer, and once she is typing she keeps typing. Without them every prompt in
the set needs real excavation, and a mother with four minutes skips all of them.

### Where they live

`lib/journal-prompts.ts`. **Not Airtable**, unlike the care kit lines and Rest
Card squares — the founder wrote and selected all 16 herself across several
rounds, and the list is small and stable enough that a deploy per edit is not a
burden. If the set starts changing weekly, move it to Airtable following the
`Care Kit Lines` pattern in `lib/airtable.ts`; the token cannot create tables or
select options, so that is a manual step for her first.

`shuffledPrompts()` returns the whole set weighted-shuffled. One prompt has
`weight: 2` — *"What does rest actually look like for you right now?"*, the
product's thesis asked out loud — so it comes up about twice as often. The
shuffle is what guarantees "Another" never repeats a question until the set is
exhausted, then refills.

Random, not deterministic by date. Unlike the daily glimmer there is no reason
every mother should see the same starter, and reshuffling means the box looks
different the second time she opens it.

### One at a time, not three

The first build showed three starters as plain text lines. Two problems, both
found in preview before it shipped: they read as body copy and gave no sign they
could be tapped, and they were the most text on the screen — the same complaint
that had already been made about the care kit.

They were also initially placed *below* the box, stranding them under 140px of
empty textarea, which is a long way to look for help.

What shipped: one question at a time in a mustard panel, with **Use this** and
**Another**. The panel is the same one the question moves into once taken, so
accepting it barely moves the page.

### The keyboard bug the preview caught

Tapping a starter took focus with it. On a phone that drops the keyboard and
makes her tap the box a second time before she can type. `chooseStarter()` hands
focus straight back via `requestAnimationFrame`. Worth remembering as a class of
bug: anything that changes what's on screen mid-entry can steal the keyboard.

### Her words stay hers

Tapping a starter puts it **above** the box as a heading. It is never typed into
the textarea. If it were, her saved journal would be full of Kindrest's words
instead of her own.

The question is stored in a new `journal_entries.prompt` column so the entry is
readable later — "the dog sneezing" means nothing without its question — and
rendered in serif at 45% opacity above the entry in History, so it reads as
context rather than as something she wrote.

### Measuring whether it worked

A prompted entry saves as `source: 'journal_prompted'` instead of `'journal'`,
badged "From a prompt". This is the only way to tell whether offering her a way
in is what got her writing. **The baseline to compare against: 2 of 16 entries
were free writes from the blank box.** If prompted entries start appearing, it
worked. If they don't, the prompts were not the problem.

### The journal stopped duplicating History

`/journal` listed her past entries. History's Journal tab listed the same rows
from the same table with the same query. `/journal` is not even in the bottom
nav — she only ever arrives there from a link — so the split was already there
and the list was the only thing blurring it.

**`/journal` is where she writes. History is where she reads.** The page now
opens straight into the box with the cursor in it; the "New Journal Entry"
button that used to guard it was guarding an empty room.

Two things were kept deliberately:

- **"This space is yours."** Shown only when she has never written an entry.
  It is the warmest copy on the page and does real onboarding work. The page
  counts entries with `head: true` rather than fetching them, since it no longer
  needs the rows.
- **A link out to History.** Without it, a mother who wrote yesterday opens the
  page, sees nothing, and reasonably concludes it was lost.

Rejected: showing her most recent entry as "last time you wrote". That is the
list again in a smaller coat.

Never put on this page: streaks, entry counts, or any other score. A journal
that keeps score stops being a private space. Those belong in Insights.

### "Today's glimmer" is now "Something to notice"

In the app only. *Glimmer* is a term from polyvagal work — the founder knows it
from the research; a mother meeting it for the first time on four hours' sleep
has to guess. The landing page keeps the word, where being unfamiliar is part of
what makes it catch, and the code keeps it everywhere: table name, analytics
events, file names. None of that is user-facing.

### Check-in was missing from the desktop sidebar

`components/layout/SidebarNav.tsx` had Home / History / Journal / Profile.
Mobile is the mirror image — it has Check-in but no Journal. Check-in was added
in the same second slot it occupies on mobile. **The two navs still differ**:
`BottomNav` has no Journal. Worth deciding deliberately rather than leaving it
as an accident.

### Migration

Run before deploying — until the column exists, saving a prompted entry fails
with `PGRST204`:

```sql
alter table journal_entries
  add column if not exists prompt text;
```

Nullable on purpose. Every existing entry and every free write has no prompt.

### Verification

The writing flow was verified in the browser: starter placement, tapping, focus
handling, the heading, the reshuffle. The saved-entry rendering and the badge
were **not** verified in a signed-in session — local sign-in sends the magic
link to kindrest.co, so a local session cannot be had. They were typechecked and
reviewed on a Vercel preview by the founder before deploy.

Reminder, because it has now cost two sessions: **a magic link always opens
kindrest.co and sessions are per-origin.** Testing a preview link while signed
in via magic link silently tests production. Sign in with email and password to
stay on the preview.

### Files changed

| File | Change |
|---|---|
| `lib/journal-prompts.ts` | **New.** The 16 starters, weighting, `shuffledPrompts()` |
| `supabase/journal-prompt-column.sql` | **New.** The `prompt` column |
| `components/journal/JournalScreen.tsx` | Rewritten: always-open box, one starter, no entry list |
| `components/history/HistoryScreen.tsx` | Reads and renders `prompt`; "From a prompt" badge |
| `app/api/journal-entry/route.ts` | Accepts and stores `prompt` |
| `components/glimmer/GlimmerHome.tsx` | "Something to notice" |
| `components/layout/SidebarNav.tsx` | Check-in added, items renumbered 01–05 |

Shipped as `32df14e`.

### Parked: the care plan

Branch **`care-plan-v0`** (`eaf776d`), pushed to GitHub, **not live**. It adds
`/plan`, a "Your plan" card on the home screen, and a change to `CheckInFlow`.
It was built and rejected in review for looking almost identical to the care kit
a check-in already produces — same three recommendation cards, same Done/Save
buttons, no assembly. The founder's words: it should look "more like a recipe."

It was deliberately excluded when `32df14e` was pushed. Before it can ship it
needs a name (there is a four-way collision between care plan, care kit, Rest
Card and recommendations), her section labels, and the eight theme phrases.


---

## Her Timezone, the Mood Chart and Top Strategies — 14 October 2026

Three fixes with one shape between them: a number that looked alive and was
not. The same shape as the check-in counter, the cached Airtable table and the
unticked checkbox before them.

### Whose day is a day

Every date in Kindrest was computed in UTC, by three different routes:

| | How the date was made | Clock |
|---|---|---|
| `journal_entries.entry_date` | `new Date().toISOString().split('T')[0]` | UTC |
| `glimmers.entry_date` | `localDateKey()` — the server's own Y/M/D | server-local, UTC on Vercel |
| check-ins and ratings | `iso.slice(0, 10)` in `/api/stats` | UTC |

They agreed only because Vercel runs UTC, and nothing enforced that. **The real
problem was the mother.** Anything written after 8pm in New York was filed under
tomorrow — and evening is when most of this gets written.

That was invisible while History showed totals. It stops being invisible the
moment anything is grouped by day, which is why this was fixed *before* any
day-grouped view was built rather than after.

`user_preference_profile.timezone` holds an IANA name, learned from the browser
by `components/shared/TimezoneSync.tsx` — mounted in `AppShell`, renders
nothing, fires once per session and again if the zone changes, because mothers
move and travel.

**`lib/days.ts` does every conversion**, and returns UTC whenever the zone is
null, unparseable or unrecognised. That matters more than it sounds: a bad zone
string stored once would otherwise throw on every later read of her history. A
mother who has not opened the app since this shipped sees no change at all.

Verified directly: 8:30pm Tue 14 Oct in New York files under **14 Oct** with her
zone and **15 Oct** without; an invalid zone falls back silently; an unparseable
date returns empty rather than throwing; a US DST boundary resolves correctly.

Now timezone-aware: journal and glimmer `entry_date`, the days-you-showed-up
counts, the week windows, the calendar and the streak.

**Existing rows keep their original UTC dates.** Re-dating them would be
guessing — we never knew where those mothers were.

**Found while in there:** the home screen picked the daily glimmer prompt on the
*browser's* day while the server stored the answer under the *server's* day. In
the Americas after 8pm those disagreed, so she could answer one question and
have it saved against another. `promptForDayKey()` now derives both from the
same key.

### The mood chart was plotting the wrong table

It was built from `recommendation_feedback.check_in_mood` — a copy taken when
she tapped Done or Save — via `recentHistory`, which is `feedback.slice(0, 20)`.

Two consequences, both bad:

1. **A check-in where she rated nothing had no point at all.** `checkins.mood`
   existed, was correct, and `/api/stats` did not even fetch it. The mother who
   checked in Overwhelmed and could not manage anything else was invisible on
   the graph of her own mood, and she is exactly who it is for.
2. **The range toggles were decorative.** "3 months / Year to date / All time"
   over a series of the last 20 rated items: past a few weeks, widening the
   window added nothing.

Now `/api/stats` returns `moodSeries` — one point per day she told us how she
was, keyed by her own day, from `checkins.mood`, with ratings filling in days
from before that table existed where they are the only record there is. Toggles
are **14 / 30 / 60** and mean what they say.

**Below five points the line is withheld** and the page says plainly how many
check-ins there were and that it is not enough to show a direction. A line
through three points reads as "you are getting worse" when it is noise. That is
a picture claiming to know how she feels — the rule the deleted reserve vessel
established, applied to a chart.

### Top strategies was a frozen leaderboard

The card ranked by `b.liked - a.liked`: cumulative likes since she joined, no
window at all. All-time leaderboards freeze, and this one had.

Measured on the busiest real account (81 ratings, 25 techniques):

- Rank 2 was last touched **19 June** and still sat above things done that week.
- Rank 1 had 9 lifetime likes. A newcomer needed 10, against **16 ratings in the
  last 30 days** spread across many techniques. Most of a year to displace it.

Three changes:

**It follows the 14/30/60 window**, and lives inside the mood card, so there is
one range control on the screen and the window is named once.

**Rating 3 only.** Rating 2 is "saved for later", and a card headed "what's
working for you" should mean she did it. On that account **33 of 81 ratings were
saves** — a third of what fed the old card was things she bookmarked and never
did.

**The row shows what it is and what it costs**, not a count and a date. A count
and a date are a receipt: they tell her what she already knows and give her
nothing to act on. "Reflection · Low effort" lets a mother with four minutes
choose on capacity. Frequency and recency still *rank* the list; they are simply
not reported.

**And the rows do something.** Tapping one writes the same `/api/feedback`
record the care kit writes, so it teaches her profile identically. The row says
"Marked done" immediately — a tap that appears to do nothing reads as broken —
and reverts on a failed write rather than lying.

The deeper point, worth keeping: **no statistic would have fixed that card.** It
was a read-only receipt, and a list of things she already did is only useful if
she can act on it.

Mood was dropped from the payload as well as the display. There was no reason to
send her mood history to the browser for something nothing shows.

### Layout

The ranked serif numeral is not decoration: it carries the ranking the use-count
used to, and gives the rows a left edge so long titles do not drift. Four
treatments were compared in a throwaway page before choosing. The mustard
eyebrow and serif heading were restored after a first attempt flattened them to
a plain `h4` and read, correctly, as bland.

### Migrations

Both already run in production.

```sql
alter table journal_entries
  add column if not exists prompt text;

alter table user_preference_profile
  add column if not exists timezone text;
```

### Files changed

| File | Change |
|---|---|
| `lib/days.ts` | **New.** Every day-key conversion, UTC fallback on anything unknown |
| `lib/user-timezone.ts` | **New.** Her stored zone for server code; null on any error |
| `app/api/timezone/route.ts` | **New.** Learns the zone from the browser, validates before storing |
| `components/shared/TimezoneSync.tsx` | **New.** Renders nothing; sends it once per session |
| `supabase/timezone.sql` | **New.** The column |
| `lib/glimmers.ts` | `promptForDayKey()` so prompt and `entry_date` cannot disagree |
| `app/api/stats/route.ts` | Her-timezone grouping, `moodSeries`, `doneEvents` |
| `app/api/journal-entry/route.ts`, `app/api/glimmer/route.ts` | Date entries in her timezone |
| `components/history/HistoryScreen.tsx` | 14/30/60, chart from `moodSeries`, the strategies card |

Shipped as `c468759` and `5a498a5`.

### Still open, deliberately

- **`recommendation_feedback` has no `checkin_id`.** A check-in and its ratings
  can only be linked by time, so two check-ins in one day cannot be told apart.
  Fixable going forward; **not backfillable**.
- **The 40 estimated backfill rows** carry `estimated = true` and a reconstructed
  `created_at`. The admin report says so; nothing mother-facing does. A
  day-grouped view would present them as real moments.
- **Query limits**: 200 ratings, 400 glimmers, 400 journal entries, 2000
  check-ins. Fine for totals; a long day-by-day timeline would truncate silently.
- ~~**Two navs still disagree.**~~ Fixed 14 October: both are Home / Check-in /
  History / Profile, with one slot deliberately free. See **Navigation** above.
- **History still has four sub-tabs** — Insights, Log, Journal, Library. Each is
  genuinely distinct, so they were left alone rather than merged ahead of
  knowing what else is coming. Merging them now would mean doing it twice.
- **No rate limiting.** `middleware.ts` guards `/admin` only. An abuse surface,
  not a load one — at 50 active users the architecture is comfortable.


---

## The Recommendations Reset — 24 November 2026

A full read-only audit of the library, then three changes that followed from it.
Audit: `docs/recs-audit.md`. Founder's edits: `docs/recs-changes-2026-11-24.md`.

### What the audit found

60 recommendations, judged against one test: does this lower a barrier, fit its
stated time, and read like permission rather than a task?

**Keep 39 · Rewrite 18 · Retire 3 · Move 0.**

No rec was a product or outside service, so nothing moved. No phase fell below
the floor of 6.

**The real finding was capacity, not wording.** Ten of the twelve Level 1 recs
sat in Contain. A mother who said she was *struggling* and had two minutes had
**nothing** sized for her, and nor did a mother who was doing well:

| phase | Level 1 before | after |
|---|---|---|
| Contain | 10 | 10 |
| Stabilize | **0** | 2 |
| Maintain | 1 | 2 |
| Expand | **0** | 2 |
| Anchor | 1 | 2 |

Fixed by writing six new Level 1 recs (#75–80), not by rewriting existing ones.

Two other things worth recording: **there are no em dashes anywhere in the set**
— it uses a spaced hyphen throughout, so that rewrite trigger fired on nothing —
and two recs were simply mis-tagged rather than badly written (#27 asked for ten
minutes at Level 2, #41 said "one minute" at Level 4).

### Retiring, and why the column is `retired` and not `active`

**Airtable leaves unticked checkboxes out of the API response entirely.** With a
column called `active`, "unticked" and "this row predates the column" are
indistinguishable on the wire — which is why `getRestCardSquares` has to probe
whether *any* row carries the field before trusting it.

Inverting the column removes the problem rather than defending against it.
Absent means live, which is already correct for every existing row. No probe, no
backfill, no edge case:

```ts
const live = records.filter(r => r.fields.rec_id != null && r.fields.retired !== true)
```

**This distinction is not academic.** The original brief for this work specified
the `active` rule applied to the `retired` column. Run against the live table,
that would have left **3 recommendations out of 66** — the moment one row is
ticked the field "exists", so every *unticked* row reads as retired. Every
mother would have got an empty care kit.

**Rows are never deleted.** `recommendation_feedback` references `rec_id`;
deleting a row would orphan a mother's record of what she actually did.

`getRecommendations` also warns, per phase, below 3 live recs — the care kit
serves 3 (2 on a hard day), and a total can look healthy while one phase is
empty.

### The care kit holds one card back

Three cards asked a depleted mother to choose, and choosing is work. The kit now
shows all but one and holds the last behind **"Want more?"**. They are already
in hand, so revealing costs no fetch.

| Mood | Fetched | Shown | Reveals |
|---|---|---|---|
| Overwhelmed | 2 | 1 | 2nd |
| Struggling | 2 | 1 | 2nd |
| Okay / Good / Thriving | 3 | 2 | 3rd |

The sliding scale lives **only** in the API's `count`. The component's rule is
"all but one", which produces 1 from 2 and 2 from 3 on its own — so there is no
mood logic on the client and no second place for the rule to drift.

An intermediate version led with a single card on every mood. It was rejected in
review: two is right on a normal day, and the reason for showing fewer was never
"fewer is better", it was that capacity is lower on a hard day.

**Collapses on every new result**, including "Something else", so each result
leads the same way.

**Unrevealed cards record nothing.** They are not rendered, so there is no
button to rate, and nothing auto-logs a skip. This is a deliberate cost: she
used to skip or save the cards she didn't pick, and that trained
`preferred_categories`, `avoided_categories` and Top strategies. Those will now
learn more slowly. The new **`care_kit_expanded`** event is how we find out
whether one less card was worth it — it fires on all five moods, so the rates
are comparable.

### What did not exist

The same brief asked to remove a Support screen's "suggested activities" and all
marketplace routes, components and nav items. **None of it existed.** Support and
the marketplace were designed in detail (see the Support tab spec) and never
built. The only artifact was `app/demo-support/`, an untracked wireframe that
never reached GitHub but shipped with every Vercel deploy and was reachable in
production. It has been deleted.

### Files changed

| File | Change |
|---|---|
| `lib/airtable.ts` | `retired` filter, per-phase floor warning |
| `components/check-in/CheckInFlow.tsx` | all-but-one display, "Want more?", collapse on new result, matching skeleton |
| `lib/analytics.ts` | `care_kit_expanded` |
| `app/demo-support/` | **deleted** |
| `docs/recs-audit.md`, `docs/recs-changes-2026-11-24.md` | the audit and the founder's edits |

Shipped as `676f920` and `9a9484d`.

### Airtable, as it now stands

66 rows, 63 live. Retired: #21, #23, #29. New: #75–80.
15 descriptions rewritten, 1 title changed (#25), 3 capacity levels corrected
(#19 → L3, #27 → L3, #41 → L2).

**To retire a rec:** tick `retired`. It stops being served within the cache
window. Untick to bring it back. Never delete the row.



## Feature Log

**24 November 2026 — The recommendations reset.** A read-only audit of all 60
recs found the real problem was not wording but capacity: ten of the twelve
Level 1 recs sat in Contain, so a mother who was struggling with two minutes had
nothing sized for her. Six new Level 1 recs fixed it, 15 descriptions were
rewritten, and three recs were retired with a new `retired` checkbox rather than
deleted, because recommendation_feedback references rec_id. The column is
`retired` and not `active` on purpose — Airtable omits unticked checkboxes, and
the inverted rule would have left 3 recs live out of 66. The care kit now shows
all but one card and holds the last behind "Want more?", which is 1 of 2 on a
hard day and 2 of 3 otherwise.


**14 October 2026 — One nav, and a slot held open.** The bottom bar and the
sidebar had drifted apart in both directions, which is how Check-in stayed
missing from desktop for months: there was no single list to look at. Both are
now Home / Check-in / History / Profile. Journal keeps its door on Home rather
than taking a slot, which matches how mothers actually reach it. That leaves one
free slot on mobile without having to decide yet what fills it. Also deleted
`components/library/LibraryScreen.tsx`, 261 lines nothing imported; `/library`
stays as a redirect so old links still work.


**14 October 2026 — Her days are hers, and two cards stopped lying.** Every
date was computed in UTC, so a mother in New York had her evenings filed under
tomorrow; a timezone is now learned from the browser and `lib/days.ts` does
every conversion, falling back to UTC whenever it is unknown. The mood chart was
plotting ratings rather than check-ins, so a mother who checked in Overwhelmed
and managed nothing else had no point on the graph of her own mood; it now plots
`checkins.mood`, the toggles are 14/30/60 and mean what they say, and the line
is withheld below five points because three points joined up claim a direction
they cannot support. Top strategies was an all-time leaderboard that had frozen
— rank 2 had not been touched in four months — and now ranks inside the chosen
window, counts only what she did rather than what she saved, shows what a
strategy is and what it costs instead of a count and a date, and can be tapped
to do it again.


**2 October 2026 — The journal gives her a way in, and stops duplicating her
history.** A blank box produced 2 free writes in 16 entries; the other 14 all
came from being prompted elsewhere. The journal now offers one starter at a
time from a bank of 16, with "Use this" and "Another". The starters avoid the
check-in's ground entirely — it asks her state, they ask her story — and three
of them exist to show her she has moved. The question is stored alongside the
entry rather than typed into it, so her words stay hers and a short entry still
makes sense months later. The page stopped listing her past entries, which
History already showed from the same table, and now opens straight into the box.
"Today's glimmer" reads "Something to notice" in the app. Check-in was missing
from the desktop sidebar and was added.


**15 September 2026 — Check-ins are counted from a record.** Kindrest never
recorded a check-in; it inferred them from a counter that rose on every
"Something else" tap, and from days on which she rated something. Six real
mothers had checked in without rating and were invisible to the admin report,
their calendar and the hard-day nudge. A check-in is now one row in `checkins`,
created by the server and reused on a swap, counting times rather than days and
including the "I'm not sure, write it out" path. History, the admin report
(including pilot partner numbers), the hard-day nudge and the analytics event
all read it. 40 rows of history were backfilled and labelled estimated; five
mothers' past check-ins could not be recovered.

**8 September 2026 — Rest Card rebuilt on written content.** The card stopped
deriving its squares from the Recommendations table, where instruction titles
were converted to past tense by conjugating the first verb — an approach that
shipped "You got one thing out of your head and ontoed paper" plus six tense
mismatches. Squares now come from a new hand-written Airtable table of 84 rows
and render exactly as stored; the whole rewriting layer is deleted, so copy fixes
no longer need a deploy. One square per theme across six themes, then two more,
positions shuffled, no preference weighting. Closed two audit findings: a card
could carry the same square twice, and two taps could deal two cards. Added
offset pagination to every Airtable read, which had been silently stopping at row
100.

**8 September 2026 — Positioning, warm lines, daily email paused.** Fixed the
signup path: `/auth/callback` had been stopping every browser signup before
onboarding, and the profile save was missing `onConflict`, so it failed for
anyone with an existing row. What had looked like 8 of 20 mothers losing interest
was a broken route. Added `WhatKindrestIs` in five places so the app states what
it is and isn't. Replaced the home screen's four-quote pool with 21 warm lines in
`lib/quotes.ts`, one per day, same for everyone, with the Love Note override
untouched. Paused the daily reminder email at 46% opens and four click-throughs:
crons removed and `DAILY_REMINDER_ENABLED` set to false. Fixed the audit, which
had been overwriting real users' profiles while reporting a pass.

**August 2026 — Therapist testing.** Five fixes from a clinician walkthrough.
Check-in indicator screens rendered empty on "Overwhelmed" and showed the wrong
list on "Struggling" — a hand-written mood map had drifted from the data, now
derived from it. Insights counted check-ins only, so daily-glimmer users saw a
blank page; it now counts glimmers and journal entries too. The safety net split
into two tiers so "I feel numb" no longer triggers the 988 screen. Love Notes
hold the first note from an unrecognised sender for approval. Glimmer text box
enlarged.

**August 2026 — Attribution & the Village.** First-touch attribution captured on
arrival and written onto her profile at signup, plus one optional "how did you
hear about Kindrest?" question; PostHog with four events. `first_checkin_at`
added so activation isn't understated by a third. The admin report reworked:
community mood and category breakdown removed, roster collapsed, and two new
sections — signups by week (activated / returned) and landing-page conversion,
backed by a privacy-clean daily view counter. And the village: a private link
she shares so the people who love her can leave her a note, with no account, no
feed, and no way for them to see anything she has written.

**August 2026 — Growth Infrastructure.** A production audit (`npm run audit`)
covering routes, auth gates, schema drift and the signup funnel; Vercel Analytics
with a seven-event funnel and an alarm that fires the moment signup breaks; a
daily reminder email carrying that day's glimmer question, with its audience
synced from Supabase accounts rather than a hand-kept list; one-tap invite with
`/i/<code>` attribution; local-partner join pages alongside employer pilots; and
bingo now retiring the card and dealing a fresh one. Fixed three silent-failure
bugs: six routes checking Postgres error codes where PostgREST answers its own,
Next caching `fetch` GETs inside a `force-dynamic` route, and a MailerLite
consistency race that would have skipped the first send.

**August 2026 — The Glimmer Release.** Daily glimmer replaces the check-in as the
daily ask; quiet/heavy safety fork; 3×3 Rest Card drawn from the recommendations
database in record voice; at-risk care nudge; nav changed to Home · Check-in ·
History · Profile; journal moved into History; Terms & Privacy updated. A
points-and-rewards system was built and deliberately deleted before launch.
Followed the same week by: an admin-report fix (a schema mismatch had it showing
zero users), Rest Card bingo stats, and a landing-page rewrite that caught the
public page up to the actual product — including retiring the waitlist as the
primary call to action, since signup was never gated.
Details: [The Glimmer Release](#the-glimmer-release--august-2026).


A running record of every feature built, when it shipped, what it does, and the user impact. Update this when new features are added.

---

### Core MVP — April 2026

| Feature | Function | User Impact |
|---|---|---|
| Onboarding flow | 4-step setup: crisis check, name, email/password, profile questions (stage, time, categories, support circle) | First-time users get a personalized starting point before ever checking in |
| Email/password auth | Supabase-powered account creation and sign-in | Users have a persistent account; data is saved across sessions |
| Auth routing | Signed-out visitors see the landing page; signed-in users go to the home screen | Seamless experience — no wrong-door moments |
| Home screen | Greeting, daily quote, streak nudge, stage card, share feedback link | Daily re-entry point that feels personal and grounding |
| Check-in flow | 5-step guided self-check (mood, mental, physical, emotional, time) | Helps users get specific about how they're feeling before receiving care suggestions |
| Care kit | 3 personalized recommendations served after each check-in; skip / save / did it rating | The core value delivery — gives moms something actionable matched to how they feel right now |
| Claude warm message | 2-sentence acknowledgment generated by the Claude API, shown with each care kit | Makes the care kit feel like it came from a person, not an algorithm |
| Recommendation engine | Scores all matching recs by phase, time, effort, preferences, feedback history, and novelty | Personalization improves with every check-in; recs stay relevant and fresh |
| Feedback loop | Ratings (skip/save/did it) written to database; preference profile updated automatically after each rating | App gets smarter about each user over time without them having to do anything extra |
| History screen (original) | Showed check-in counts, streak, active days, and a basic past-recs log | Gave users a sense of their progress over time |
| Profile screen | Displays account info; 4-step update flow mirrors onboarding | Users can keep their profile current as their life changes |
| Admin report | Internal dashboard at `/admin/report` showing live usage stats | Founder visibility into how the app is being used |
| PWA setup | App is installable on phone via "Add to Home Screen" | Feels like a native app — no browser bar, app icon on home screen |
| Library screen foundation | API route and data structure for all saved/completed recs | Groundwork for the Library screen |
| Email list + MailerLite | Landing-page form → saves to Supabase, subscribes to MailerLite | Captures people who aren't ready to sign up yet. Signup itself goes to `/onboarding`. |
| Row Level Security | All database tables locked to each user's own data | Users can never see or modify each other's data |
| kindrest.co live | Custom domain connected to Vercel; app serves at kindrest.co | Users reach the app at a real brand URL, not a Vercel subdomain |

---

### Sprint 2 — June 2026

| Feature | Function | User Impact |
|---|---|---|
| Daily rotating quote | Pool of 4 curated quotes, one shown per day based on day of year | Home screen feels fresh daily; reflects the app's warm tone |
| Motherhood stage card | Shows user's stage, a stage-specific emoji, and a rotating daily fact | Makes the home screen feel specific to where the user actually is in motherhood |
| Streak nudge | Shows consecutive check-in days and time since last check-in | Encourages consistency without pressure; celebrates showing up |
| "Reading your patterns" card | Dynamic headline + 2-3 sentence paragraph generated from real check-in data (mood trajectory, consistency, top working categories) | Gives users a quick, plain-language summary of their patterns — no data interpretation needed |
| Mood chart with time toggle | Line chart of mood over time; toggle between 30 days / 3 months / YTD / all time; starts at first data point; Y-axis labeled Low to Thriving | Visual sense of emotional patterns over time; range toggle lets users zoom in or out |
| Full session log | Every check-in listed by date with mood emoji; shows ALL recommendations rated that day as chips with category and Done/Saved badge | Users can see exactly what they did each day, not just that they checked in |
| Mental health safety card | Detects 3 consecutive check-ins at "struggling" or "overwhelmed"; shows a warm referral message with a link to Psychology Today's therapist finder | Proactive safety net for users who may need more than self-care tools |
| Library screen | Full screen showing all saved and completed recommendations; filter by Done / Saved / All; secondary filter by category | Users have a personal collection of what's worked for them — a resource they can return to |
| Smart retry logic | "Try different suggestions" passes all shown rec IDs as excluded; engine never repeats a rec in the same session | Users always get genuinely new suggestions when they retry — not the same recs reshuffled |
| Regulation type affinity scoring | Engine gives a +0.3 boost to recs matching the user's most-engaged regulation types (e.g., "Mental", "Emotional") | Personalization reflects not just category preferences but the type of support each user gravitates toward |
| Recent indicators stored | Selected indicators (e.g., "Racing thoughts", "Body tension") saved to user profile after each check-in | Claude's warm message becomes more contextually aware over time; future sessions reference past patterns |
| Preferred time pre-fill | Check-in time step pre-selects from the user's onboarding preference | Removes a small friction point for users who always have the same time available |
| Desktop layout fix | AppShell rendering was duplicating the app on desktop (macOS Safari/Chrome), creating a ghost overlay that blocked all click events | Buttons and links now work correctly on MacBook; fixed the broken desktop experience reported by a real user |
| Resend auth email hook | Supabase Edge Function intercepts all auth emails and delivers them via Resend with Kindrest branding | Removes the 2/hour rate limit on Supabase's default sender; auth emails always arrive; "Kindrest" shows as the sender name |

---

### Sprint 3 — July 2026

#### Admin Report — Full Rebuild

The original admin report was a basic summary page that undercounted activity and missed users entirely. It was rebuilt from the ground up as a proper founder dashboard with accurate data and a clear visual hierarchy.

**What was wrong with the original:**

- Check-in count was calculated by dividing feedback rows by 3 (assumed exactly 3 ratings per session — wrong and unreliable)
- `auth.admin.listUsers()` was called without pagination, silently returning only the first 50 users; anyone who signed up after that was invisible in the report
- Active users were only counted if they had rated a recommendation — moms who used the app without rating anything showed as inactive
- No per-user activity detail — could not tell from the report whether a specific user had actually checked in
- Mood breakdown was inflated — counted once per feedback row, not once per session, so a single check-in with 5 recs rated counted as 5 mood data points

**What was rebuilt and why:**

| Fix | What Changed | Why It Matters |
|---|---|---|
| Pagination on auth users | `listUsers()` now loops through all pages (1,000 per page) until exhausted | All users appear in the report, not just the first 50 |
| ~~Accurate check-in counting~~ | ~~Sessions are counted as unique (user_id + date) pairs, not by dividing feedback rows.~~ **Superseded 15 September 2026.** This was better than dividing by 3, but still counted only days on which she *rated* something, so a check-in with no rating didn't exist and two check-ins in a day counted as one. Now counted from the `checkins` table. See [Counting Check-ins](#counting-check-ins--15-september-2026). | ~~One day of activity = one check-in session~~ → one row per time she goes through the check-in |
| Per-user activity | Each user row now includes total check-ins, last check-in date, last seen in app, and up to 5 recent session moods | Can see at a glance whether a specific user is active or has gone quiet |
| Mood deduplication | ~~Mood is counted once per session (first feedback row per user per day), not once per rating.~~ **Superseded 15 September 2026:** mood now comes from the check-in record itself, so a check-in with no rating still has a mood. | Mood breakdown reflects actual check-ins, not inflated rating counts |
| `last_sign_in_at` exposed | Auth users' last sign-in timestamp now surfaces on each user card | "Last seen in app" is independent of whether they rated a rec — catches users who browse without rating |

**New sections added to the dashboard:**

| Section | What It Shows |
|---|---|
| Engagement Funnel | Four-step drop-off visual: Signed Up → Opened App → Checked In → Retained (3+ sessions). Includes retention rate % and average check-ins per active user. |
| This Week | New signups, check-ins, and active users for the past 7 days side by side, with week-over-week signup change |
| ~~Community Mood~~ | ↪ **Removed Aug 2026** — it didn't answer a question that changed what to do next. See *Attribution & the Village*. |
| Who's in the Community | Motherhood stage breakdown — shows which stages are most represented in the current user base |
| Needs Attention | Moms who have checked in before but have not been seen in 14+ days. Intended for direct outreach. |
| User Roster | **Collapsed by default since Aug 2026** — tap the header to open. Searchable list of all in-app users as toggle cards — collapsed view shows name, check-in count, last seen, and mood weather emoji; expanded view shows email, stage, recent mood trail, all three timestamps |
| ~~Most Used Categories~~ | ↪ **Replaced Aug 2026** by the Landing Page section. See *Attribution & the Village*. |

**Mood weather:** *(still on each user card; only the community-wide mood section was removed)*
Each user card shows a single "mood weather" emoji derived from their dominant mood across their last 5 sessions (⛈️ overwhelmed → ☀️ thriving). Card background color also reflects the mood (red tones for heavy, green tones for positive). The recent mood trail shows up to 5 session mood emojis in order so you can see if someone is trending up or down.

**Search:**
The User Roster has a live search bar that filters across all three buckets simultaneously — active users, never-checked-in users, and drop-offs (users who signed up but never opened the app). Searching by name or email returns results from all three groups, making it possible to look up any specific user regardless of their activity status.

**Files changed:**
- `app/api/admin/report/route.ts` — complete rewrite; all new metrics computed server-side
- `app/admin/report/page.tsx` — full redesign; new sections, toggle user cards, search
- `tsconfig.json` — added `supabase/` to the exclude list so Deno-based edge function code no longer causes TypeScript build failures in the Next.js build pipeline

---

## If You're Handing This Off to a Developer

Here's what a new developer needs to get started:

### Access to Grant Them

- [ ] GitHub repo — invite as a collaborator
- [ ] Supabase project — invite under Settings → Team
- [ ] Vercel project — invite under Settings → Members
- [ ] Airtable base — share "Kindrest Data Logic"
- [ ] Anthropic account — share API key or create a new one
- [ ] Resend account — share API key or create a new one

### What They'll Need to Run It Locally

1. Clone the GitHub repo
2. Copy `.env.local.example` to `.env.local` and fill in real values
3. Run `npm install` to install dependencies
4. Run `npm run dev` to start the local server
5. Open `http://localhost:3000`

### Key Files to Understand

| File / Folder | What It Does |
|---|---|
| `app/` | All pages and routes (Next.js App Router structure) |
| `app/api/` | Server-side API routes (care-kit, stats, feedback, library) |
| `lib/recommendation-engine.ts` | The scoring logic for recommendations |
| `lib/airtable.ts` | Fetches and pre-filters recommendations from Airtable |
| `lib/supabase.ts` | Database connection setup |
| `components/check-in/CheckInFlow.tsx` | The 5-step check-in + care kit UI |
| `components/history/HistoryScreen.tsx` | Trend analysis, mood chart, session log |
| `components/library/LibraryScreen.tsx` | Saved and completed recommendations |
| `supabase/functions/auth-send-email/index.ts` | Edge Function that delivers auth emails via Resend |
| `scripts/audit.mjs` | Production audit — run after every deploy |
| `lib/attribution.ts` | First-touch capture; the first-touch rule lives here |
| `lib/village.ts` | Note limits — length, rate, and the no-links rule |
| `lib/safety.ts` | The two tiers. Read the header before changing either list |
| `app/api/village/note/route.ts` | The public door. Read this before changing anything about the village |
| `lib/pg-errors.ts` | Missing-table/column detection (Postgres **and** PostgREST codes) |
| `lib/analytics.ts` | Funnel events, and the rule about what must never be sent |
| `lib/reminder-audience.ts` | Derives the daily-reminder audience from accounts |
| `app/api/cron/daily-reminder/route.ts` | The daily email, and its safety switches |
| `app/api/invite/route.ts` | Referral codes and attribution |
| `public/manifest.json` | PWA configuration |
| `.env.local.example` | Template for environment variables |
| `tailwind.config.js` | Brand colors and font configuration |

### Questions They Should Be Able to Answer Before Starting

- What database tables exist and what's the RLS policy on each?
- How does the recommendation scoring work, and what signals does it use?
- Where do recommendations come from (Airtable) and how are they fetched?
- What happens at `/auth/callback` and why?
- How does the Resend email hook work, and where are its secrets stored?
- Why does `lib/pg-errors.ts` check two different sets of error codes?
- What stops the daily reminder from emailing someone who unsubscribed?
- What does `npm run audit` check that a passing build would not catch?
- Why can someone leave a village note without an account, and what stops that being dangerous?
- What are the two things she must always be able to do to a note she's been left?
- What is the difference between Tier 1 and Tier 2, and why does that difference exist?

If they can explain all five clearly, they're ready to work on Kindrest.

---

*This document was last updated 24 November 2026. If significant changes are made to the architecture, update this guide so the next person has an accurate map.*
