# Turkey Slice Invitational

A mobile-first web app for the Annual Turkey Slice Invitational — live on-course
scoring, gross and net leaderboards, player records, a tournament archive and a
side-bet ledger.

Built for a phone in bright sun: 17px base text, 48px minimum tap targets, a
one-tap **SUN** mode that switches to pure black on pure white, and score entry
that keeps working when the cell signal doesn't.

## Getting started

```bash
npm install
npm run seed        # demo course, 10 players, 3 past years, one live tournament
npm run dev         # http://localhost:3000
```

The seed prints the demo password. Every seeded player shares it, and
`dmarchetti` is the admin. Re-seed from scratch with `npm run seed -- --force`.

```bash
npm test            # engine unit tests (scoring, handicaps, wagers, ledger)
npm run typecheck
npm run build && npm start
```

### Configuration

| Variable | Purpose |
| --- | --- |
| `TSI_DB_PATH` | SQLite file (default `./data/tsi.db`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enable "Continue with Google". Unset = username accounts only |
| `APP_ORIGIN` | Public origin used to build the OAuth redirect URI |

Copy `.env.example` to `.env.local` to set them. The Google redirect URI is
`${APP_ORIGIN}/api/auth/google/callback`.

## What's in it

**Priority 1 — live scoring**

- Pick round → pick match → hole-by-hole entry for the whole group, with big
  +/− steppers for gross and putts and the strokes each side receives on that
  hole marked with dots.
- Every keystroke is written to `localStorage` immediately. If **Save** fails
  because there's no signal, the hole is queued and flushed automatically the
  moment the phone reconnects — the banner tells the player which state they're
  in.
- Leaderboards poll every 8 seconds (paused when the tab is hidden or the phone
  is offline) and show gross, net and match play side by side.
- Formats: **fourball** (best ball, 90% allowance), **foursome** (alternate
  shot, one ball per side, 50% of combined), **singles** (100%).

**Priority 2 — profiles and history**

- Profiles carry name, GHIN, handicap index, self-uploaded photo (downscaled in
  the browser), tenure, lifetime match record, win % per format, head-to-head
  records and partner records.
- The archive holds every past year: champion, team points, low gross/low net
  and the full scorecard for every match.

**Priority 3 — side action**

- Nassau (front, back, overall), Skins (net or gross, with carryover) and
  head-to-head match play bets.
- The ledger nets every bet into balances and then reduces them to the fewest
  payments that clear the round. v1 calculates only — no money moves.

## Scoring rules the app applies

- Course handicap = `index × (slope ÷ 113) + (rating − par)`, rounded.
- Strokes fall on holes by stroke index, wrapping past 18 for handicaps over 18;
  plus handicaps give strokes back on the easiest holes.
- Match play strokes come **off the low** subject: the lowest player (or side,
  in foursomes) plays off scratch and everyone else gets the difference at the
  round's allowance.
- The individual net leaderboard uses the full course handicap, so it stays
  comparable across rounds regardless of the format's allowance.
- A match closes out as soon as the lead exceeds the holes remaining (`3&2`),
  and holes after that are ignored.
- Nassau: each segment's stake is a pot — the losing side's players split the
  cost, the winning side splits the proceeds.
- Skins: the stake is what **each** other player pays the winner of a skin;
  tied holes carry over when carryover is on.

## Layout

```
src/lib/scoring.ts   pure scoring engine: handicaps, strokes, match play, totals
src/lib/wagers.ts    Nassau / Skins / H2H and the who-owes-whom ledger
src/lib/db.ts        SQLite schema and connection
src/lib/tsi.ts       queries and view models shared by pages and the API
src/app/api/…        JSON API (auth, scores, boards, wagers, admin setup)
src/app/…            App Router pages
src/components/…     UI, including the on-course entry screen
scripts/seed.ts      demo data
tests/               unit tests for the two engines
```

`scoring.ts` and `wagers.ts` are pure and dependency-free, so the same code
decides a match on the server and updates the screen optimistically on a phone
with no signal.

## Setting up a new year

Sign in as an admin (**the first account created on a deployment is the admin**)
and open `/admin`: add a course with its 18 pars and stroke indexes plus a tee's
rating and slope, create the tournament and its two teams, add the field, add
rounds with their formats, then set the pairings. Everything else follows from
the scores players post.

## Not built in v1

- **GHIN/USGA scraping.** Handicap indexes are entered by hand (or typed once on
  a player's profile). Scraping ghin.com isn't permitted by its terms, and there
  is no public API — so a course and a handicap index are manual entries.
- **Presses** on the Nassau, and settling up (the ledger is calculation only).
- Push notifications, and a service worker for a fully offline first load —
  score entry survives losing signal mid-round, but the app has to be loaded
  once with a connection.
