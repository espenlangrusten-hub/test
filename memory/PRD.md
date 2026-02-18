# PRD — Tactical Lineup (Football & Futsal Coach Assistant)

## Original Problem Statement
Build a football and futsal team management application with team setup, tactics board, live match management, substitution planning, coaching suggestions, and match history.

## Core Features (Implemented)
- **Team Management**: Create, edit, delete teams. Football (5v5, 7v7, 9v9, 11v11) and Futsal (5v5) formats
- **Team Page**: New intermediate page between home and tactics. Shows all players with edit (name/number/position), remove, add, green toggle for match availability, and per-player match statistics.
- **Tactics Board**: Formation selection, player placement, drag-to-reposition, tap-to-swap. CUSTOMIZE mode. Only shows available players.
- **Match Mode**: Halftime-based duration, opponent entry, auto/manual sub modes
- **Auto-Substitution**: Rotational algorithm for equal playing time (exc. GK). Players sub in and out multiple times. Shows expected playing time per player + full substitution plan before match starts.
- **Dynamic Re-planning**: Manual sub during auto mode recalculates remaining plan
- **Live Match**: Timer with 1st/2nd half, halftime pause, scoreboard, manual sub, coaching panel
- **In-Match Coaching**: 3 categories (Team Level, Defensive Line, Attack) with tactical cards showing quote/problem/principle/actions. Applying a tactic draws arrows on the pitch.
- **Post-Match Review**: Player ratings, notes, match saving
- **Match History**: Shows score, starting lineup, formation, opponent, date

## Architecture
- Frontend: React Native (Expo) + TypeScript + Expo Router
- Backend: FastAPI (Python) + MongoDB
- State: React Context (AppContext)
- Styling: React Native StyleSheet, dark theme

## Key Files
- `frontend/app/index.tsx` — Home/sport selection, routes to /team
- `frontend/app/team.tsx` — Team page with player management + availability
- `frontend/app/format.tsx` — Format selection (5v5/7v7/9v9/11v11)
- `frontend/app/tactics.tsx` — Tactics board (available players only)
- `frontend/app/match.tsx` — Match setup + live match + post-match
- `frontend/app/match-history.tsx` — Match history with scores + lineup
- `frontend/src/components/PitchView.tsx` — Pitch component with tactical arrows
- `frontend/src/lib/coaching-data.ts` — Coaching data (3 categories, 6 tactics)
- `frontend/src/constants/formations.ts` — Formation data for all formats
- `backend/server.py` — FastAPI server with teams, matches, player-stats endpoints

## Known Issues
- **Formation Switching Bug (P1)**: Players may disappear when switching formations on tactics screen.

## Backlog
- P1: Fix formation switching bug
- P2: Refactor match.tsx substitution logic into useSubstitutions.ts hook
- P2: Match detail page improvements
- P3: Team statistics / analytics dashboard

## Changelog
- 2026-02-18: New Team Page with player management, availability toggle, match stats. Tactics filters to available-only players.
- 2026-02-17: Added 9v9 format, "MATCH MODE" button, halftime-based duration, rotational auto-sub algorithm, coaching panel overhaul with tactical arrows on pitch.
