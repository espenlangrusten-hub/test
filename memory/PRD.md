# PRD — Tactical Lineup (Football & Futsal Coach Assistant)

## Original Problem Statement
Build a subscription-based football and futsal team management application for iOS and Android with team setup, tactics board, live match management, substitution planning, coaching suggestions, AI training sessions, and match history.

## Core Features (Implemented)

### Authentication & Data Isolation
- JWT-based email/password auth (login + signup screens)
- Token stored in AsyncStorage, 30-day expiry
- All routes protected, data fully isolated per user via `user_id`

### Team Management
- Create, edit, delete teams (Football 5v5/7v7/9v9/11v11, Futsal 5v5)
- Mandatory age group selection (U8-U19, Senior)
- Format and age group editable without recreating team

### Team Hub Page (Compact Sidebar Layout)
- Compact info bar with team name, tags, player/available counts, settings gear
- Sidebar navigation (left) with Squad, Tactics, Training, History, Match
- Compact player table (right) with #, Name, Pos, Avl columns
- **Clickable availability dots** on team overview — toggle available/unavailable without going to squad page
- Responsive: sidebar goes horizontal on narrow screens

### Squad Management
- Availability toggles per player
- Add/edit/remove players with position selection
- Statistics tab: Min, Avg Rating, Goals, Assists, Yellow, Red columns
- U13 privacy: Statistics hidden for teams U8-U12

### Tactics Board
- Formation selection and persistence (SAVE button + MATCH MODE)
- Player placement, drag-to-reposition, tap-to-swap
- **Formation is saved and remembered** between sessions
- Only available players shown

### Match Mode
- Halftime-based duration, opponent entry
- Auto/manual substitution modes
- Rotational algorithm for equal playing time (exc. GK)
- Live timer, scoreboard, halftime pause
- **Mid-match formation change** with smart auto-fill (priority: last position > preferred position)
- Formation picker accessible via FORM button in live controls

### In-Match Event Logging
- Tap player on pitch → popup with **Goal / Assist / Yellow Card / Red Card / Sub** buttons
- Events saved to match log via `POST /api/matches/{match_id}/events`
- Events feed into player statistics (goals, assists, cards tracked)
- Formation changes logged as events

### In-Match Coaching Panel
- Format-specific tactics (11v11/9v9/7v7/5v5)
- 3 categories x 2 tactics, tactical arrows on pitch

### AI Training Sessions
- Page calling `POST /api/teams/{team_id}/training-suggestions`
- Categories: General, Defensive, Attacking
- Uses OpenAI GPT via Emergent LLM Key

### Post-Match Review
- Player ratings (1-10), notes per player
- Match history with scores, formations, opponents

## Architecture
- **Frontend**: React Native (Expo) + TypeScript + Expo Router, web mode
- **Backend**: FastAPI (Python) + MongoDB + JWT auth
- **AI**: OpenAI via Emergent LLM Key (emergentintegrations library)

## Key API Endpoints
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/teams`, `GET/PUT/DELETE /api/teams/{team_id}`
- `GET /api/teams/{team_id}/player-stats`
- `POST /api/teams/{team_id}/training-suggestions`
- `GET/POST /api/matches`, `GET/PUT/DELETE /api/matches/{match_id}`
- `POST /api/matches/{match_id}/events`

## Remaining Backlog

### P2 - Pre-Match Page
- Build `pre-match.tsx` showing formation, lineup, planned subs, set-piece takers
- PDF download capability

### P2 - PDF Downloads
- Add PDF export to training sessions and pre-match pages

### P2 - Training Drill Illustrations
- Visual illustrations for AI-generated training drills

### P3 - Additional Enhancements
- Match analytics/reporting dashboard
- Subscription/payment integration

## Changelog
- 2026-02-22 (Session 2): Team page availability toggle on dots, Formation persistence with SAVE button in tactics, Mid-match formation change with smart auto-fill, Assist event in match popup, Formation picker during live match, Backend assist/formation_change event types.
- 2026-02-22 (Session 1): P0 compact team hub with sidebar, P1 in-match event logging, P2 AI training sessions UI, Backend match events endpoint.
- 2026-02-21: JWT auth, data isolation, team creation with age groups, squad management with stats, U13 privacy, format-specific coaching.

## Testing
- Backend: All API tests passing (auth, team CRUD, match events, player stats)
- Frontend: Verified via Playwright (team hub, tactics save, match controls)
- Test reports: `/app/test_reports/iteration_12.json`
