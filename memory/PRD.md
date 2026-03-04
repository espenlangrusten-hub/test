# PRD — Tactical Lineup: Football & Futsal Coach Assistant

## Core Concept
Subscription-based team management application for football and futsal coaches. Manage squads, formations, friendly matches, messaging, tournaments, and network.

## Architecture
- **Frontend:** React Native / Expo (web) with TypeScript, Expo Router
- **Backend:** Python FastAPI + reportlab (PDF generation)
- **Database:** MongoDB
- **Styling:** Dark glassmorphism theme, green (#4ADE80) accents, gold (#F59E0B) for tournaments

## Key Pages
- **Dashboard** (`index.tsx`): Compact sport cards, bell badge, teams list, network section
- **Team** (`team.tsx`): Feed (replacing message board), Quick Actions (Squad/Tactics/Calendar/Friendly/Tournament/Training/History/Match)
- **Tournament** (`tournament.tsx`): Hub (ongoing/completed/create), bracket visualization, PDF export
- **Messenger** (`messenger.tsx`): FB-inspired DMs + notifications with 5s polling
- **Settings** (`settings.tsx`): Profile/password management
- **My Network** (`my-network.tsx`): Full network contacts list
- **Calendar** (`calendar.tsx`): All-teams match calendar

## Key API Endpoints
- Auth: login, register, profile update, password change
- Teams: CRUD, player stats
- Network: list, add, remove
- Direct Messages: conversations, send, delete
- Notifications: unread count
- Tournaments: create, list, detail, submit result, PDF export
- Calendar: all-teams events

## Data Models
- **tournaments**: `{id, user_id, name, format, tournament_type, start_date, end_date, teams[], groups{}, matches[], status, winner, created_at}`
  - tournament_type: knockout | group_knockout | league
  - matches auto-generated with byes for non-power-of-2 team counts

## Changelog
- 2026-03-04 (Session 15): Moved tournament link from dashboard to team Quick Actions. Added CL-inspired knockout bracket visualization (horizontal rounds, green winners, gold Final tag). Added PDF export with dark theme (reportlab). Hidden router headers on major pages. 100% tests (9/9 backend + all frontend).
- 2026-03-03 (Session 14): Team page redesign + full tournament system. 
- 2026-03-03 (Session 13): Dashboard redesign + settings/messenger/network pages.

## Test Reports
- `/app/test_reports/iteration_27.json` (Bracket viz + PDF + move link - 100%)
- `/app/test_reports/iteration_26.json` (Tournament system - 100%)
- `/app/test_reports/iteration_25.json` (Dashboard + Messenger - 100%)

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
