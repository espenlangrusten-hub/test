# PRD — Tactical Lineup: Football & Futsal Coach Assistant

## Core Concept
Subscription-based team management application for football and futsal coaches. Manage squads, formations, friendly matches, messaging, tournaments, and network.

## Architecture
- **Frontend:** React Native / Expo (web) with TypeScript, Expo Router
- **Backend:** Python FastAPI
- **Database:** MongoDB
- **Styling:** Dark glassmorphism theme, green (#4ADE80) accents, LinearGradient

## File Structure
```
/app
├── backend/
│   ├── server.py              # FastAPI monolith (all endpoints)
│   └── tests/test_tournaments.py
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx        # Root layout & router
│   │   ├── auth.tsx           # Login/Register
│   │   ├── index.tsx          # Dashboard (homepage)
│   │   ├── team.tsx           # Team page (redesigned with Feed)
│   │   ├── settings.tsx       # Profile & password settings
│   │   ├── messenger.tsx      # FB Messenger-inspired messaging
│   │   ├── my-network.tsx     # Dedicated network page
│   │   ├── calendar.tsx       # Match calendar
│   │   ├── tournament.tsx     # Full tournament system
│   │   ├── friendly-matches.tsx
│   │   ├── messages.tsx       # Legacy message board
│   │   ├── team-setup.tsx / format.tsx
│   │   └── training.tsx       # AI training (placeholder)
│   └── src/
│       ├── context/AppContext.tsx
│       ├── constants/colors.ts, countries.ts
│       └── lib/coaching-data.ts
```

## Key API Endpoints
### Auth & Profile
- `POST /api/auth/login`, `POST /api/auth/register`
- `PUT /api/auth/profile` — Update user name
- `PUT /api/auth/password` — Change password

### Teams & Players
- `GET/POST /api/teams`, `PUT/DELETE /api/teams/{id}`
- `GET /api/teams/{id}/player-stats`

### Network
- `GET /api/network`, `POST /api/network/add`, `DELETE /api/network/{id}`

### Direct Messaging
- `GET /api/direct-messages/conversations` — List all conversations
- `GET /api/direct-messages/conversation/{other_user_id}` — Messages with user
- `POST /api/direct-messages` — Send DM
- `DELETE /api/direct-messages/{msg_id}` — Delete DM

### Notifications
- `GET /api/notifications/unread` — Unread count (messages + DMs)

### Tournaments
- `POST /api/tournaments` — Create tournament (generates fixtures automatically)
- `GET /api/tournaments` — List (filter by status)
- `GET /api/tournaments/{id}` — Detail with matches, groups, standings
- `PUT /api/tournaments/{id}/result/{match_id}` — Submit match result (auto-advances rounds)
- `DELETE /api/tournaments/{id}` — Delete

### Calendar
- `GET /api/calendar/all` — All teams' calendar events

## Data Models
- **users**: `{id, email, password_hash, name}`
- **teams**: `{id, user_id, name, sport, format, gender, age_group, country, manager, team_code, players[], formation}`
- **network**: `{id, user_id, friend_team_id, friend_user_id, friend_team_name, ...}`
- **friendly_invites**: `{id, from/to_team_id, dates[], status, location}`
- **messages**: `{id, user_id, team_id, type, title, body, read, created_at}`
- **direct_messages**: `{id, from/to_user_id, from/to_team_id, content, read, created_at}`
- **tournaments**: `{id, user_id, name, format, tournament_type, teams[], groups{}, matches[], status, winner}`

## Changelog
- 2026-03-03 (Session 14): Team page redesign (Feed replacing Message Board, Quick Actions menu, no boxes, same dark theme/bottom nav). Full tournament system (knockout/group+knockout/league with auto fixtures, byes, results, standings, advancement, champion). Fixed knockout advancement bug. 20/20 backend tests + 95% frontend pass → fixed to 100%.
- 2026-03-03 (Session 13): Dashboard redesign, settings page, messenger, my-network page, updated bottom nav. 25/25 tests passed.

## Test Reports
- `/app/test_reports/iteration_26.json` (Team page + Tournament - 95%→100% after bugfix)
- `/app/test_reports/iteration_25.json` (Dashboard + Messenger + Settings - 100%)

## Test Credentials
- `demo@test.com` / `demo123`

## Pending / Upcoming
### P2 - AI Training & PDFs
- AI Training Sessions UI polish
- Pre-Match page with formation/lineup
- PDF downloads for training plans and lineups

### Future
- Subscription/payment model
- Backend refactoring (server.py → route modules)
- WebSocket for real-time messaging
- Training drill illustrations

## 3rd Party Integrations
- OpenAI GPT-4 (via Emergent LLM Key) — AI training suggestions
- expo-linear-gradient — UI styling
