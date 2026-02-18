# PRD — Tactical Lineup (Football & Futsal Coach Assistant)

## Original Problem Statement
Build a football and futsal team management application with team setup, tactics board, live match management, substitution planning, coaching suggestions, and match history.

## Core Features (Implemented)
- **Team Management**: Create, edit, delete teams. Football (5v5, 7v7, 9v9, 11v11) and Futsal (5v5) formats
- **Team Page**: Intermediate page between home and tactics. Shows all players with edit (name/number/position), remove, add, green toggle for match availability, per-player match statistics.
- **Tactics Board**: Formation selection, player placement, drag-to-reposition, tap-to-swap. CUSTOMIZE mode. Only shows available players.
- **Match Mode**: Halftime-based duration, opponent entry, auto/manual sub modes
- **Auto-Substitution**: Rotational algorithm for equal playing time (exc. GK). Players sub in and out multiple times. Shows expected playing time + full sub plan before match.
- **Dynamic Re-planning**: Manual sub during auto mode recalculates remaining plan
- **Live Match**: Timer with 1st/2nd half, halftime pause, scoreboard, manual sub, coaching panel
- **In-Match Coaching**: Format-specific tactics (different for 11v11, 9v9, 7v7, 5v5/futsal). 3 categories per format with 2 tactics each. Cards show problem/principle/actions/apply button, with coach quote at the bottom. Applying a tactic draws arrows on the pitch.
- **Post-Match Review**: Player ratings, notes, match saving
- **Match History**: Shows score, starting lineup, formation, opponent, date

## Architecture
- Frontend: React Native (Expo) + TypeScript + Expo Router
- Backend: FastAPI (Python) + MongoDB
- State: React Context (AppContext)

## Key Files
- `frontend/app/index.tsx` — Home/sport selection, routes to /team
- `frontend/app/team.tsx` — Team page with player management + availability
- `frontend/app/format.tsx` — Format selection
- `frontend/app/tactics.tsx` — Tactics board (available players only)
- `frontend/app/match.tsx` — Match setup + live match + post-match
- `frontend/app/match-history.tsx` — Match history with scores + lineup
- `frontend/src/components/PitchView.tsx` — Pitch with tactical arrows
- `frontend/src/lib/coaching-data.ts` — Format-specific coaching data (getCoachingCategories)
- `frontend/src/constants/formations.ts` — Formation data
- `backend/server.py` — FastAPI server

## Known Issues
- **Formation Switching Bug (P1)**: Players may disappear when switching formations on tactics screen.

## Backlog
- P1: Fix formation switching bug
- P2: Refactor match.tsx substitution logic into useSubstitutions.ts hook
- P3: Team statistics / analytics dashboard

## Changelog
- 2026-02-18: Coaching cards: quote moved to bottom. Format-specific coaching strategies (11v11/9v9/7v7/5v5 each have unique tactics with different coaches).
- 2026-02-18: New Team Page with player management, availability toggle, match stats. Tactics filters to available-only players.
- 2026-02-17: Added 9v9 format, "MATCH MODE" button, halftime-based duration, rotational auto-sub algorithm, coaching panel overhaul with tactical arrows on pitch.
