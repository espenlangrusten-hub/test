# PRD — Tactical Lineup: Football & Futsal Coach Assistant

## Core Concept
Subscription-based team management application for football and futsal coaches. Manage squads, formations, friendly matches, messaging, and network.

## Architecture
- **Frontend:** React Native / Expo (web) with TypeScript, Expo Router
- **Backend:** Python FastAPI
- **Database:** MongoDB
- **Styling:** Dark glassmorphism theme, green (#4ADE80) accents, LinearGradient

## File Structure
```
/app
├── backend/
│   └── server.py           # FastAPI monolith (all endpoints)
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx      # Root layout & router
│   │   ├── auth.tsx         # Login/Register
│   │   ├── index.tsx        # Dashboard (homepage)
│   │   ├── settings.tsx     # Profile & password settings
│   │   ├── messenger.tsx    # FB Messenger-inspired messaging
│   │   ├── my-network.tsx   # Dedicated network page
│   │   ├── calendar.tsx     # Match calendar
│   │   ├── friendly-matches.tsx
│   │   ├── messages.tsx     # Legacy message board
│   │   ├── team.tsx / team-setup.tsx / format.tsx
│   │   └── training.tsx     # AI training (placeholder)
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

### Friendly Matches
- `POST/GET /api/friendly-invites`, respond/cancel/amend/delete

### Calendar
- `GET /api/calendar/all` — All teams' calendar events
- `GET /api/teams/{id}/calendar` — Single team calendar

### System Messages
- `GET /api/messages`, `PUT /api/messages/{id}/read`, `DELETE /api/messages/{id}`

## Data Models
- **users**: `{id, email, password_hash, name}`
- **teams**: `{id, user_id, name, sport, format, gender, age_group, country, manager, team_code, players[], formation, tactic_name}`
- **network**: `{id, user_id, friend_team_id, friend_user_id, friend_team_name, ...}`
- **friendly_invites**: `{id, from/to_team_id, from/to_user_id, dates[], status, location}`
- **messages**: `{id, user_id, team_id, type, title, body, read, created_at}`
- **direct_messages**: `{id, from/to_user_id, from/to_team_id, content, read, created_at}`

## Changelog
- 2026-03-03: Major feature batch — Settings page, Messenger (FB-inspired DM + Notifications), My Network page, updated bottom nav (Dashboard|Messages|Calendar|Network), compact sport cards, bell icon with unread badge, inline Add button for network. All 25 tests passed 100%.
- 2026-03-03: Dashboard pixel-perfect redesign — green badges, shield icons, scrollable layout. 16/16 tests passed.
- Previous: Full app translation to English, friendly match system, social features, calendar, message board.

## Test Reports
- `/app/test_reports/iteration_25.json` (Full feature batch - 100% pass)
- `/app/test_reports/iteration_24.json` (Dashboard redesign - 100% pass)

## Test Credentials
- `demo@test.com` / `demo123`

## Pending / Upcoming Tasks
### P1 - Tournaments
- Tournament page with invite/bracket system (mirrors Friendly Matches)

### P2 - AI Training & PDFs
- AI Training Sessions UI (frontend for existing backend endpoint)
- Pre-Match page with formation/lineup
- PDF downloads for training plans and lineups
- Training drill illustrations

### Future
- Subscription/payment model
- Backend refactoring (server.py → route modules)
- Real WebSocket for messaging (currently polling)

## 3rd Party Integrations
- OpenAI GPT-4 (via Emergent LLM Key) — AI training suggestions
- expo-linear-gradient — UI styling
