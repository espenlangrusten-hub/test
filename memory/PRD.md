# Tactical Lineup - PRD

## Overview
Football & Futsal Coach Strategy Planner app. Helps coaches plan team setups, formations, substitutions, and track player performance.

## Core Features
- **Sport Selection**: Football (5v5, 7v7, 11v11) and Futsal (5v5)
- **Team Management**: Create squads, add players with name/number/position
- **Tactics Board**: Visual pitch with 18+ formations from famous managers (Guardiola, Mourinho, Klopp, Conte, Ferguson, Simeone, Bielsa)
- **Position Assignment**: Tap pitch positions to assign starters, auto-assign available
- **Set Piece Takers**: Assign corners, free kicks, penalties, throw-ins
- **Captain Selection**: Tap any starter to toggle captain
- **Match Timer**: Configurable duration (20-90 min), start/pause/resume/end controls
- **Auto Substitution**: Calculates equal playing time for all outfield players (exc. GK)
- **Manual Substitution**: Coach decides when to sub
- **Substitution Alerts**: Modal popup at calculated times with confirm/skip
- **Player Notes**: Per-player performance notes with 1-10 rating system
- **Match History**: View all past matches with formation, duration, and notes count
- **Tactic Guide**: Formation-specific attacking & defensive focus areas for team and each individual player (18 formations covered)

## Tech Stack
- **Frontend**: React Native (Expo SDK 54), expo-router, StyleSheet
- **Backend**: FastAPI, Motor (async MongoDB), Pydantic
- **Database**: MongoDB
- **State**: React Context + backend API

## Screens
1. Home - Sport selection + saved teams
2. Format Selection - 5v5/7v7/11v11
3. Squad Setup - Player roster management
4. Tactics Board - Formation picker + visual pitch
5. Match Day - Timer + substitution management
6. Player Notes - Per-player notes and ratings
7. Match History - Past matches list

## API Endpoints
- `POST/GET/PUT/DELETE /api/teams` - Team CRUD
- `POST/GET/PUT/DELETE /api/matches` - Match CRUD
- `POST /api/matches/{id}/notes` - Add player note
- `GET /api/players/{id}/notes` - Get player notes
- `GET /api/health` - Health check
