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
- **Country selection** with flag emoji display (15 countries: NO, SE, DK, FI, GB-ENG, GB-SCT, IE, GB-WLS, DE, NL, BE, FR, ES, IT, PT)
- Format, age group, and country editable via team settings modal

### Team Hub Page (Compact Sidebar Layout)
- Compact info bar with team name, flag, tags, player/available counts, settings gear
- Sidebar navigation (left) with Squad, Tactics, Training, History, Match
- Compact player table (right) with clickable availability dots

### Squad Management
- Availability toggles per player
- Add/edit/remove players with position selection
- Statistics tab: Min, Avg Rating, Goals, Assists, Yellow, Red columns
- U13 privacy: Statistics hidden for teams U8-U12

### Tactics Board
- Formation selection and persistence (SAVE button + MATCH MODE)
- Player placement, drag-to-reposition, tap-to-swap
- Formation saved and remembered between sessions

### Match Mode
- Halftime-based duration, opponent entry
- Auto/manual substitution modes
- Mid-match formation change with smart auto-fill
- In-match event logging: Tap player → Goal / Assist / Yellow / Red / Sub

### Match History & Amendments
- Match list with opponent, score, date
- Editable match detail page: edit score, view/add/delete events, player ratings, notes
- All amendments reflected in player statistics

### In-Match Coaching Panel
- Format-specific tactics (11v11/9v9/7v7/5v5)
- 3 categories x 2 tactics, tactical arrows on pitch

### AI Training Sessions
- Categories: General, Defensive, Attacking
- Uses OpenAI GPT via Emergent LLM Key
- Backend endpoint complete, frontend UI exists

## Architecture
- **Frontend**: React Native (Expo) + TypeScript + Expo Router, web mode
- **Backend**: FastAPI (Python) + MongoDB + JWT auth
- **AI**: OpenAI via Emergent LLM Key

## Key API Endpoints
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET/POST /api/teams`, `GET/PUT/DELETE /api/teams/{team_id}`
- `GET /api/teams/{team_id}/player-stats`
- `POST /api/teams/{team_id}/training-suggestions`
- `GET/POST /api/matches`, `GET/PUT/DELETE /api/matches/{match_id}`
- `POST /api/matches/{match_id}/events`
- `POST /api/matches/{match_id}/notes`

## Remaining Backlog
- **P1**: AI Training Sessions UI polish & PDF download
- **P2**: Pre-match page with formation/lineup + PDF download
- **P2**: PDF exports for training sessions
- **P2**: Training drill illustrations
- **P3**: Match analytics dashboard, subscription/payment integration

## Changelog
- 2026-02-24 (Session 4): Implemented Country Selection (P0) - country picker on team-setup, flag display on home/team pages, country editing in team settings modal. Created shared countries.ts constants.
- 2026-02-22 (Session 3): Fixed stats counting bug. Rebuilt match-detail.tsx with editable score, events, player ratings, match notes.
- 2026-02-22 (Session 2): Team page availability toggle, formation persistence, mid-match formation change, assist event.
- 2026-02-22 (Session 1): Compact team hub with sidebar, in-match event logging, AI training sessions UI.
- 2026-02-21: JWT auth, data isolation, team creation with age groups, squad management.

## Testing
- Test reports: `/app/test_reports/iteration_14.json` (Country feature)
- Backend tests: `/app/backend/tests/test_country_feature.py`
