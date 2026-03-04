# PRD — Tactical Lineup: Football & Futsal Coach Assistant

## Core Concept
Subscription-based team management application for football and futsal coaches.

## Architecture
- **Frontend:** React Native / Expo (web) with TypeScript, Expo Router
- **Backend:** Python FastAPI + reportlab (PDF generation)
- **Database:** MongoDB
- **Styling:** Dark glassmorphism theme, green (#4ADE80) accents

## Key Pages & Components
- **Dashboard** (`index.tsx`): Sport cards, bell badge, teams list, network section
- **Team** (`team.tsx`): Fixed header (back arrow, badges, stats) + Quick Actions grid (8 colorful items) + scrollable FEED
- **Tournament** (`tournament.tsx`): Hub with back arrow, bracket visualization, PDF export, A+B knockouts
- **Messenger** (`messenger.tsx`): Tabs (DMs/Notifications), horizontal network contacts, conversation list with team badges, bold unread, delete icon, chat view with team picker
- **Settings** (`settings.tsx`): Profile/password management
- **My Network** (`my-network.tsx`): Full network contacts
- **Calendar** (`calendar.tsx`): All-teams match calendar with back arrow
- **Training** (`training.tsx`): AI training sessions with back arrow
- **BottomNav** (`src/components/BottomNav.tsx`): Persistent bottom nav on all 8 pages

## Key API Endpoints
- Auth, Teams, Network, Direct Messages (incl. DELETE conversation), Notifications, Tournaments, Calendar, Training

## Changelog
- 2026-03-04 (Session 17): Team page redesign (no duplicate name, prominent Quick Actions, scrollable Feed only). Messenger rewrite (horizontal network contacts, conversation list with team badges, bold unread, delete icon). Back arrows on all team-linked pages. Persistent BottomNav on all pages. Brighter headlines (#999). Delete icon for tournaments. 100% tests (7/7 backend + all frontend).
- 2026-03-04 (Session 16): B Knockout feature verified E2E (15/15 tests).
- 2026-03-04 (Session 15): CL-style bracket viz, PDF export, tournament to team page.
- 2026-03-03 (Session 14): Team page redesign + tournament system.
- 2026-03-03 (Session 13): Dashboard redesign + settings/messenger/network pages.

## Test Reports
- `/app/test_reports/iteration_29.json` (UI redesign + messenger - 100%)
- `/app/test_reports/iteration_28.json` (B Knockout E2E - 100%)

## Test Credentials
- `demo@test.com` / `demo123`

## Pending / Upcoming
### P2 - AI Training & PDFs
- AI Training Sessions UI polish
- Pre-Match page with formation/lineup
- PDF downloads for training plans and lineups

### Future
- Subscription/payment model
- Backend refactoring (server.py -> route modules)
- WebSocket for real-time messaging
- Training drill illustrations
