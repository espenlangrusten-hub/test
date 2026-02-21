# PRD — Tactical Lineup (Football & Futsal Coach Assistant)

## Original Problem Statement
Build a football and futsal team management application with team setup, tactics board, live match management, substitution planning, coaching suggestions, and match history.

## Core Features (Implemented)
- **Authentication**: JWT-based email/password auth. Login + signup screens. Token stored in AsyncStorage. All routes protected. 30-day token expiry.
- **Data Isolation**: All teams, matches, and history scoped to the logged-in user via user_id.
- **Team Management**: Create, edit, delete teams. Football (5v5, 7v7, 9v9, 11v11) and Futsal (5v5) formats.
- **Team Page**: Intermediate page between home and tactics. Player management (edit, remove, add), green toggle for availability, per-player match statistics.
- **Tactics Board**: Formation selection, player placement, drag-to-reposition, tap-to-swap. Only available players shown.
- **Match Mode**: Halftime-based duration, opponent entry, auto/manual sub modes.
- **Auto-Substitution**: Rotational algorithm for equal playing time (exc. GK). Players rotate in and out. Expected playing time + full sub plan preview.
- **Live Match**: Timer with 1st/2nd half, halftime pause, scoreboard, manual sub, coaching panel.
- **In-Match Coaching**: Format-specific tactics (11v11/9v9/7v7/5v5), 3 categories x 2 tactics. Quote at bottom. Arrows on pitch.
- **Post-Match Review**: Player ratings, notes.
- **Match History**: Scores, starting lineup, formation, opponent, date.
- **Logout**: Clears token, returns to auth screen.

## Architecture
- Frontend: React Native (Expo) + TypeScript + Expo Router
- Backend: FastAPI (Python) + MongoDB + JWT auth
- State: React Context (AppContext) with AsyncStorage for token persistence

## Key Files
- `backend/server.py` — All API routes with JWT auth + user_id scoping
- `frontend/app/auth.tsx` — Login/signup screen
- `frontend/app/_layout.tsx` — Auth gating
- `frontend/src/context/AppContext.tsx` — Auth state, token storage, auth headers
- `frontend/app/index.tsx` — Home with user info + logout
- `frontend/app/team.tsx` — Team page with player management
- `frontend/app/tactics.tsx` — Tactics board (available players only)
- `frontend/app/match.tsx` — Match setup + live + post-match
- `frontend/app/match-history.tsx` — Match history
- `frontend/src/lib/coaching-data.ts` — Format-specific coaching data
- `frontend/src/components/PitchView.tsx` — Pitch with tactical arrows
- `frontend/src/constants/formations.ts` — Formation data

## Known Issues
- **Formation Switching Bug (P1)**: Players may disappear when switching formations on tactics screen.

## Backlog
- P1: Fix formation switching bug
- P2: Refactor match.tsx substitution logic
- P3: Team statistics / analytics dashboard
- Future: In-app subscriptions (Apple StoreKit / Google Play Billing) for iOS/Android

## Changelog
- 2026-02-21: JWT authentication with email/password. All API routes protected. Data fully isolated per user. Login/signup screen. Logout button on home.
- 2026-02-18: Coaching cards: quote at bottom. Format-specific coaching strategies.
- 2026-02-18: Team Page with player management, availability toggle, match stats.
- 2026-02-17: 9v9 format, MATCH MODE, halftime-based duration, rotational auto-subs, coaching arrows on pitch.
