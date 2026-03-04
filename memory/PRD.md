# Tactical Lineup - Product Requirements Document

## Original Problem Statement
Build a subscription-based football and futsal team management application with comprehensive team management, tactics, tournaments, and social features.

## Core Architecture
- **Frontend**: React Native / Expo (TypeScript), Expo Router
- **Backend**: Python FastAPI, MongoDB
- **Integrations**: OpenAI GPT-4 (via Emergent LLM Key), reportlab (PDF), expo-linear-gradient

## What's Been Implemented

### Authentication & User Management
- JWT-based auth (login/register)
- Profile settings page (name, password)
- Demo user: `demo@test.com` / `demo123`

### Team Management
- Create teams (football 5v5/7v7/9v9/11v11, futsal 5v5)
- Player management (add, edit, availability)
- Team codes for sharing/inviting
- Feed-style team page with quick action grid

### Tactics System (Updated Mar 4, 2026)
- **TV-Inspired Pitch View**: Dark background (#1A1D23), 3D perspective projection, red player dots (#DC2626), player names (first name small, last name bold)
- Formation picker with named formations (e.g., Ferguson's 4-4-2, Guardiola's 4-3-3)
- Drag-to-customize positions
- **Auto-save**: Debounced 800ms save on any assignment change with "Saved" indicator
- Player swap/selection from bench
- Captain and set-piece role assignment
- Match mode view

### Tournaments
- Group stage + knockout brackets
- B-Knockout (consolation) brackets for eliminated teams
- Champions League-style visual bracket
- Result submission
- PDF export
- Tournament delete functionality

### Social Features
- Network/invite system between teams
- Messenger with horizontal network contact bar at top
- Direct messaging with conversation deletion
- Notification bell with unread count

### Scheduling
- Calendar view (per team and all teams)
- Friendly match proposals with date negotiation

### UI/UX
- EA Sports-inspired dark theme
- Persistent bottom navigation bar on all pages
- Compact headline spacing for mobile screens (Mar 4, 2026)

## Completed Tasks (Mar 4, 2026)
- [x] P0: Verified messenger page shows all network contacts in horizontal top bar
- [x] P1: Removed redundant bottomNav StyleSheet from index.tsx and team.tsx
- [x] Design: Reduced headline/spacing on dashboard and team pages for Expo fit
- [x] TV-inspired pitch view with 3D perspective (TVPitchView.tsx component)
- [x] Auto-save team selection in tactics page
- [x] Back button on tactics page, hidden Stack header
- [x] Feed items on team page are now clickable (navigate to relevant pages)
- [x] Fixed double back icon on friendly-matches and messages pages (headerShown: false)
- [x] Brightened text on friendly-matches page (section headers, match info, cancelled items)
- [x] Share Lineup PDF: Backend endpoint + frontend button to export formation as PDF

## Prioritized Backlog

### P2 - Upcoming
- Build AI Training Sessions UI (frontend/src/app/training.tsx)
- Build Pre-Match Page & PDF Downloads (frontend/src/app/pre-match.tsx)
- Illustrations for Training Drills

### Future
- Subscription Model implementation
- Backend refactoring: Break server.py monolith into modular route files

## Key Files
- `frontend/app/tactics.tsx` - Tactics page with TVPitchView
- `frontend/src/components/TVPitchView.tsx` - TV broadcast pitch component
- `frontend/src/components/PitchView.tsx` - Original green pitch (used in match.tsx)
- `frontend/src/components/BottomNav.tsx` - Shared bottom navigation
- `frontend/app/_layout.tsx` - Route layout
- `backend/src/server.py` - Monolithic backend

## API Endpoints
- Auth: POST `/api/auth/login`, POST `/api/auth/register`
- Teams: GET/PUT `/api/teams/{id}`, POST `/api/teams`
- Tournaments: CRUD `/api/tournaments/{id}`, POST `.../submit_result`, GET `.../export_pdf`
- Messages: GET `/api/messages/user/{id}`, POST `/api/messages/send`, DELETE `/api/messages/conversation/{id}`
- Profile: GET/PUT `/api/profile`, PUT `/api/profile/password`
- Notifications: GET `/api/notifications/unread-count`
- Calendar: GET `/api/calendar/all`
- Network: GET `/api/network`
