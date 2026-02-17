# Football & Futsal Coach Assistant - PRD

## Original Problem Statement
Build a football and futsal team management application with tactical boards, match management, and player rotation features.

## Core Requirements
- Team creation with multiple formats (Football: 5v5, 7v7, 9v9, 11v11 | Futsal: 5v5)
- Tactics board with formation selection and player positioning
- Match mode with timer, scoring, substitutions, and coaching
- Match history with scores and lineup review
- Post-match player ratings

## Architecture
- **Frontend**: React Native (Expo) with TypeScript, Expo Router
- **Backend**: FastAPI (Python) with SQLite
- **State**: Zustand + Context API

## What's Been Implemented

### Team Management
- Team CRUD with sport/format selection
- Player add/delete on tactics screen
- Tap-to-select-and-swap player positions

### Tactics Board
- Formation selection (4-4-2, 4-3-3, 4-2-3-1, 4-3-3 Klopp, 3-5-2, 4-4-2 Simeone, 3-4-3)
- 9v9 formations (3-3-2, 3-2-3, 2-4-2, 2-3-3, 3-2-2-1)
- PitchView component with player dots and names
- Custom position drag support
- Formation switching with proper player reassignment (FIXED)

### Match Mode
- "MATCH MODE" button on tactics (was "START MATCH")
- Match setup with opponent, halftime duration, sub mode
- **Halftime-based duration**: Minutes per half (total = half x 2)
- **Auto-sub equal play time**: Rotational algorithm distributing playing time equally across all outfield players (exc. GK)
- **Expected Playing Time preview**: Bar chart showing projected minutes per player
- **Substitution Plan preview**: List of all planned subs with minute markers
- **Dynamic re-planning**: Manual subs during auto mode trigger recalculation
- Live match with timer, halftime tracking, scoreboard
- Manual substitution modal
- In-match coaching panel with tactical suggestions
- Visual coaching overlay on pitch
- Post-match review with player ratings

### Match History
- Match list with score display
- Starting lineup shown per match
- Formation badges, player notes

## Known Issues
- None currently blocking

## Backlog / Future Tasks
- P2: Refactor match.tsx substitution logic into useSubstitutions.ts hook
- P2: More 9v9 team creation flow testing
- P3: Push notifications for sub alerts (mobile)
- P3: Season/tournament management
