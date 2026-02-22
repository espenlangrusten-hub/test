# PRD — Tactical Lineup (Football & Futsal Coach Assistant)

## Original Problem Statement
Build a subscription-based football and futsal team management application for iOS and Android with team setup, tactics board, live match management, substitution planning, coaching suggestions, AI training sessions, and match history.

## User Personas
- **Youth/Amateur Football Coach**: Manages team lineups, formations, substitutions, and player availability for match day
- **Futsal Coach**: Same needs adapted for 5v5 format

## Core Features (Implemented)

### Authentication & Data Isolation
- JWT-based email/password auth (login + signup screens)
- Token stored in AsyncStorage, 30-day expiry
- All routes protected, data fully isolated per user via `user_id`

### Team Management
- Create, edit, delete teams (Football 5v5/7v7/9v9/11v11, Futsal 5v5)
- Mandatory age group selection (U8-U19, Senior)
- Format and age group editable without recreating team

### Team Hub Page (P0 - COMPLETED)
- Compact info bar with team name, tags, player/available counts, settings gear
- **Sidebar navigation** (left) with Squad, Tactics, Training, History, Match icons
- **Compact player table** (right) with #, Name, Pos, Avl columns
- Responsive: sidebar goes horizontal on narrow screens

### Squad Management
- Availability toggles per player (green/red dots)
- Add/edit/remove players with position selection
- **Statistics tab**: Min, Avg Rating, Goals, Assists, Yellow, Red columns
- **U13 privacy**: Statistics hidden for teams designated U8-U12

### Tactics Board
- Formation selection, player placement, drag-to-reposition, tap-to-swap
- Only available players shown

### Match Mode
- Halftime-based duration, opponent entry
- Auto/manual substitution modes
- Rotational algorithm for equal playing time (exc. GK)
- Live timer, scoreboard, halftime pause

### In-Match Event Logging (P1 - COMPLETED)
- Tap player on pitch → popup with Goal / Yellow Card / Red Card / Sub buttons
- Events saved to match log via `POST /api/matches/{match_id}/events`
- Events feed into player statistics (goals, cards tracked)

### In-Match Coaching Panel
- Format-specific tactics (11v11/9v9/7v7/5v5)
- 3 categories x 2 tactics, tactical arrows on pitch
- Coaching quotes and action items

### AI Training Sessions (P2 - COMPLETED)
- Page calling `POST /api/teams/{team_id}/training-suggestions`
- Categories: General, Defensive, Attacking
- Shows session title, duration, focus, description, drills with coaching points
- Uses OpenAI GPT via Emergent LLM Key

### Post-Match Review
- Player ratings (1-10), notes per player
- Match history with scores, formations, opponents

## Architecture
- **Frontend**: React Native (Expo) + TypeScript + Expo Router, web mode
- **Backend**: FastAPI (Python) + MongoDB + JWT auth
- **State**: React Context (AppContext) with AsyncStorage for token persistence
- **AI**: OpenAI via Emergent LLM Key (emergentintegrations library)

## Key Files
- `backend/server.py` — All API routes with JWT auth + user_id scoping
- `frontend/app/auth.tsx` — Login/signup screen
- `frontend/app/_layout.tsx` — Auth gating & route definitions
- `frontend/src/context/AppContext.tsx` — Auth state, token storage, auth headers
- `frontend/app/index.tsx` — Home dashboard
- `frontend/app/team.tsx` — Team hub with compact sidebar layout
- `frontend/app/training.tsx` — AI training sessions page
- `frontend/app/match.tsx` — Match setup + live + event logging + post-match
- `frontend/app/tactics.tsx` — Tactics board
- `frontend/app/match-history.tsx` — Match history

## Key API Endpoints
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/teams`, `GET/PUT/DELETE /api/teams/{team_id}`
- `GET /api/teams/{team_id}/player-stats`
- `POST /api/teams/{team_id}/training-suggestions`
- `GET/POST /api/matches`, `GET/PUT/DELETE /api/matches/{match_id}`
- `POST /api/matches/{match_id}/events`
- `POST /api/matches/{match_id}/notes`

## DB Schema
- **users**: `{id, email, password_hash, name, created_at}`
- **teams**: `{id, user_id, name, sport, format, age_group, players[], formation, tactic_name}`
- **matches**: `{id, user_id, team_id, opponent, formation, duration_minutes, starters[], subs[], sub_plan[], events[], player_notes[], coaching_notes[], status, score_home, score_away}`

## Remaining Backlog

### P2 - Pre-Match Page
- Build `pre-match.tsx` showing formation, lineup, planned subs, set-piece takers
- PDF download capability

### P2 - PDF Downloads
- Add PDF export to training sessions and pre-match pages
- Use `expo-print` + `expo-sharing`

### P2 - Training Drill Illustrations
- Visual illustrations for AI-generated training drills

### P3 - Additional Enhancements
- Match analytics/reporting dashboard
- Subscription/payment integration (Apple StoreKit / Google Play Billing)

## Changelog
- 2026-02-22: P0 Compact team hub with sidebar navigation layout. P1 In-match event logging popup (goal/yellow/red/sub). P2 AI training sessions UI page. Backend match events endpoint.
- 2026-02-21: JWT auth, data isolation, team creation with age groups, squad management with stats, U13 privacy, format-specific coaching.
- 2026-02-18: Coaching cards, format-specific strategies, team page with availability toggle.
- 2026-02-17: 9v9 format, match mode, auto-subs, coaching arrows.

## Testing
- Backend: 24 pytest tests (100% pass) at `/app/backend/tests/test_team_mgmt.py`
- Frontend: 10 Playwright scenarios verified
- Test reports: `/app/test_reports/iteration_11.json`
