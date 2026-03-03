# PRD — Tactical Lineup (Football & Futsal Coach Assistant)

## Original Problem Statement
Build a subscription-based football and futsal team management application for iOS and Android with team setup, tactics board, live match management, substitution planning, coaching suggestions, AI training sessions, match history, and social features (network + friendly matches).

## Core Features (Implemented)

### Authentication & Data Isolation
- JWT-based email/password auth (login + signup screens)
- Token stored in AsyncStorage, 30-day expiry
- All routes protected, data fully isolated per user via `user_id`

### Team Management
- Create, edit, delete teams (Football 5v5/7v7/9v9/11v11, Futsal 5v5)
- **Gender selection**: Gutter / Jenter / Mixed
- **Age group**: U8-U19, Senior
- **Country selection** with flag emoji display (15 countries)
- **Manager registration**: Name + phone number stored with team
- **Unique team code**: 6-char alphanumeric, auto-generated, used for network/invites
- Format, age group, gender, country, manager editable via team settings modal

### Team Hub Page (Simplified)
- Overview tab: team info bar with flag, name, tags, player/available counts, settings
- Team code display with sharing hint
- Manager info display
- Unread messages badge with link to messages
- Navigation menu: Squad, Tactics, Friendly, Training, History, Match
- Squad management moved to separate tab (not on overview)

### My Network (Home Page)
- Add teams by unique code
- View friend teams: name, age/gender, country, manager contact info
- Remove from network

### Match Calendar
- Chronological list of all upcoming matches per team
- Grouped by month with English month names
- Shows: date, day of week, type badge (Friendly/Match), opponent, time, home/away, pitch, manager contact
- Days-until countdown (e.g. "Today", "Tomorrow", "In 19 days")
- Refresh button, empty state for teams without matches
- Accessible from team page menu (Calendar icon)

### Friendly Matches
- Send invite via opponent's team code
- Multiple date/time proposals
- Home/away selection
- Pitch name and address
- Respond to invites: select date, accept/decline
- Accepted matches show with full details and manager contact info

### Message Board
- Per-team messages for invite events
- Types: invite_received, invite_sent, invite_accepted, invite_declined
- Unread indicator (blue dot)
- Click message to navigate to friendly matches

### Squad Management
- Availability toggles per player
- Add/edit/remove players with position selection
- Statistics tab: Min, Avg Rating, Goals, Assists, Yellow, Red columns
- U13 privacy: Statistics hidden for teams U8-U12

### Tactics Board
- Formation selection and persistence (SAVE button + MATCH MODE)
- Player placement, drag-to-reposition, tap-to-swap

### Match Mode
- Halftime-based duration, opponent entry
- Auto/manual substitution modes
- Mid-match formation change with smart auto-fill
- In-match event logging: Goal / Assist / Yellow / Red / Sub

### Match History & Amendments
- Match list with opponent, score, date
- Editable match detail page: edit score, view/add/delete events, player ratings, notes

### AI Training Sessions
- Backend endpoint complete (`/api/teams/{team_id}/training-suggestions`)
- Frontend UI exists (training.tsx)

## Architecture
- **Frontend**: React Native (Expo) + TypeScript + Expo Router, web mode
- **Backend**: FastAPI (Python) + MongoDB + JWT auth
- **AI**: OpenAI via Emergent LLM Key

## Key API Endpoints
- Auth: `POST /api/auth/register`, `POST /api/auth/login`
- Teams: `GET/POST /api/teams`, `GET /api/teams/lookup?code=X`, `GET/PUT/DELETE /api/teams/{team_id}`
- Stats: `GET /api/teams/{team_id}/player-stats`
- Training: `POST /api/teams/{team_id}/training-suggestions`
- Network: `GET/POST /api/network`, `DELETE /api/network/{id}`
- Friendly: `GET/POST /api/friendly-invites`, `GET /api/friendly-invites/{id}`, `PUT /api/friendly-invites/{id}/respond`
- Messages: `GET /api/messages`, `PUT /api/messages/{id}/read`
- Matches: `GET/POST /api/matches`, `GET/PUT/DELETE /api/matches/{match_id}`, `POST /api/matches/{match_id}/events`

## DB Collections
- `users`: id, email, hashed_password, name
- `teams`: id, user_id, name, sport, format, age_group, gender, country, manager_name, manager_phone, team_code, players, formation, tactic_name
- `matches`: id, user_id, teamId, status, events, scores, ratings, notes
- `network`: id, user_id, friend_team_id, friend_user_id, friend_team_name, friend_team_gender, friend_team_age_group, friend_team_country, friend_manager_name, friend_manager_phone
- `friendly_invites`: id, from_user_id, from_team_id, to_user_id, to_team_id, proposed_dates, home_away, pitch_name, pitch_address, status, accepted_date, accepted_time
- `messages`: id, team_id, user_id, type, title, body, related_invite_id, read

## Remaining Backlog
- **P1**: Tournament page (similar flow to friendly matches but for multiple teams)
- **P1**: AI Training Sessions UI polish & PDF download
- **P2**: Pre-match page with formation/lineup + PDF download
- **P2**: General search function for teams (deferred - user concerned about fake teams)
- **P3**: Match analytics dashboard, subscription/payment integration, training drill illustrations

## Changelog
- 2026-03-03 (Session 12): Premium glassmorphism dark theme redesign - dark gradient background, semi-transparent glass cards, softer emerald accent (#10B981), improved typography hierarchy, more whitespace. Updated colors system, auth page, and complete dashboard rewrite inspired by Strava/Football Manager.
- 2026-02-25 (Session 11): Bug fixes: Cancel button now works on web (window.confirm), cancelled matches show in calendar with red badge + strikethrough, amended matches properly move in calendar (status→pending clears old date, re-acceptance sets new date).
- 2026-02-24 (Session 10): Message trash icon deletion. Friendly matches: clickable opponent name expands to show manager contact details + "Add to Network" button if not already connected.
- 2026-02-24 (Session 9): Enhanced Friendly Match system - Cancel matches (removes from calendar, alerts other team), Amend dates (calendar popup, sets status to pending), "Team A vs Team B" headlines, "Go to Match" button, Delete cancelled/declined matches (trash icon), Pick opponent from My Network dropdown in addition to team code.
- 2026-02-24 (Session 8): Five new features: (1) Network Add Alert - messages sent when team added to network with Add Back button, (2) Network Contact Details - click-to-expand manager info in network list, (3) Calendar Popup - visual date picker replacing text input in friendly match invites, (4) Match Mode rework - compact pitch lineup replacing play time bars with Change Tactics link, (5) Tactics auto-save on formation click with Save button removed.
- 2026-02-24 (Session 7): Full English translation across all pages. Bigger sidebar icons (52x52/size 30). MESSAGE BOARD section at bottom of team page with "No new messages" empty state. Backend messages translated to English. Gender display mapping: Gutter→Boys, Jenter→Girls.
- 2026-02-24 (Session 6): Added Match Calendar (Kampkalender) - chronological list of all upcoming matches per team, grouped by month with Norwegian labels, countdown, opponent/pitch/manager details.
- 2026-02-24 (Session 5): Implemented gender selection (Gutter/Jenter/Mixed), manager registration, unique team codes, My Network, friendly matches invite system, message board. Simplified team page overview.
- 2026-02-24 (Session 4): Country Selection with flag display.
- 2026-02-22 (Session 3): Fixed stats bug, rebuilt match-detail with editable score/events/ratings/notes.
- 2026-02-22 (Session 2): Availability toggle, formation persistence, mid-match formation change, assist event.
- 2026-02-22 (Session 1): Compact team hub, in-match event logging, AI training backend.

## Test Reports
- `/app/test_reports/iteration_22.json` (UI redesign verification - 100% pass, all flows working)
- `/app/test_reports/iteration_21.json` (Cancel/Calendar/Amend bug fixes - 100% pass)
- `/app/test_reports/iteration_17.json` (English translation + UI changes - 100% pass)
- `/app/test_reports/iteration_16.json` (Calendar feature - 100% pass)
- `/app/test_reports/iteration_15.json` (All new features - 100% pass)
- `/app/test_reports/iteration_14.json` (Country feature)
- `/app/test_reports/iteration_6.json` (Match stats/editing)
