from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import string
import random
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.hash import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET environment variable is required. "
        "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
    )
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 720  # 30 days

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---- Auth helpers ----

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"user_id": payload["user_id"], "email": payload["email"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---- Models ----

class AuthRegister(BaseModel):
    email: str
    password: str
    name: str = ""

class AuthLogin(BaseModel):
    email: str
    password: str

class ProfileUpdate(BaseModel):
    name: str = ""

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class DirectMessageSend(BaseModel):
    to_user_id: str
    from_team_id: str = ""
    to_team_id: str = ""
    content: str

class TournamentTeam(BaseModel):
    name: str
    team_id: str = ""
    from_network: bool = False

class TournamentCreate(BaseModel):
    name: str
    format: str = "5v5"
    tournament_type: str = "knockout"  # knockout | group_knockout | league
    start_date: str = ""
    end_date: str = ""
    teams: List[TournamentTeam] = []
    groups_count: int = 2
    matches_per_pair: int = 1
    has_b_knockout: bool = False  # Lower bracket for 3rd/4th placed teams

class MatchResult(BaseModel):
    home_score: int
    away_score: int

class Player(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    number: int
    position: str = ""
    is_captain: bool = False
    is_starter: bool = True
    available: bool = True
    set_piece_roles: List[str] = []

class TeamCreate(BaseModel):
    name: str
    sport: str
    format: str
    age_group: str = ""
    gender: str = ""
    country: str = ""
    manager_name: str = ""
    manager_phone: str = ""
    players: List[Player] = []
    formation: str = ""
    tactic_name: str = ""

class NetworkAdd(BaseModel):
    team_code: str

class ProposedDate(BaseModel):
    date: str
    time_slots: List[str] = []

class FriendlyInviteCreate(BaseModel):
    from_team_id: str
    to_team_code: str
    proposed_dates: List[ProposedDate] = []
    home_away: str = "home"
    pitch_name: str = ""
    pitch_address: str = ""

class FriendlyInviteRespond(BaseModel):
    accepted_date: str = ""
    accepted_time: str = ""
    status: str = "accepted"

class FriendlyInviteAmend(BaseModel):
    proposed_dates: List[ProposedDate] = []

class SubPlan(BaseModel):
    minute: int
    player_out_id: str
    player_in_id: str
    player_out_name: str = ""
    player_in_name: str = ""

class MatchEvent(BaseModel):
    type: str
    minute: int
    player_id: Optional[str] = None
    player_out_id: Optional[str] = None
    player_in_id: Optional[str] = None
    detail: str = ""

class PlayerNote(BaseModel):
    player_id: str
    player_name: str = ""
    note: str
    rating: int = 5
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MatchCreate(BaseModel):
    team_id: str
    opponent: str = ""
    formation: str = ""
    tactic_name: str = ""
    duration_minutes: int = 90
    starters: List[str] = []
    subs: List[str] = []
    sub_mode: str = "manual"
    sub_plan: List[SubPlan] = []
    score_home: int = 0
    score_away: int = 0
    starting_lineup: List[dict] = []

class MatchUpdate(BaseModel):
    opponent: Optional[str] = None
    formation: Optional[str] = None
    tactic_name: Optional[str] = None
    duration_minutes: Optional[int] = None
    starters: Optional[List[str]] = None
    subs: Optional[List[str]] = None
    sub_mode: Optional[str] = None
    sub_plan: Optional[List[SubPlan]] = None
    events: Optional[List[MatchEvent]] = None
    player_notes: Optional[List[PlayerNote]] = None
    status: Optional[str] = None
    score_home: Optional[int] = None
    score_away: Optional[int] = None
    starting_lineup: Optional[List[dict]] = None
    coaching_notes: Optional[List[dict]] = None


class TournamentTeam(BaseModel):
    team_id: str
    team_name: str
    team_code: str = ""

class TournamentMatch(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    home_team_id: str
    home_team_name: str
    away_team_id: str
    away_team_name: str
    score_home: int = 0
    score_away: int = 0
    date: str = ""
    status: str = "scheduled"  # scheduled | completed

class TournamentCreate(BaseModel):
    name: str
    sport: str = "football"
    format: str = "11v11"
    start_date: str = ""
    end_date: str = ""
    location: str = ""
    description: str = ""

class TournamentMatchCreate(BaseModel):
    home_team_id: str
    home_team_name: str
    away_team_id: str
    away_team_name: str
    date: str = ""

class TournamentMatchUpdate(BaseModel):
    score_home: Optional[int] = None
    score_away: Optional[int] = None
    date: Optional[str] = None
    status: Optional[str] = None


# ---- Auth Endpoints ----

@api_router.post("/auth/register")
async def register(body: AuthRegister):
    email = body.email.strip().lower()
    if not email or not body.password:
        raise HTTPException(status_code=400, detail="Email and password required")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user_id = str(uuid.uuid4())
    hashed = bcrypt.hash(body.password)
    await db.users.insert_one({
        "id": user_id,
        "email": email,
        "password_hash": hashed,
        "name": body.name.strip() or email.split("@")[0],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    token = create_token(user_id, email)
    return {"token": token, "user_id": user_id, "email": email, "name": body.name.strip() or email.split("@")[0]}


@api_router.post("/auth/login")
async def login(body: AuthLogin):
    email = body.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not bcrypt.verify(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], email)
    return {"token": token, "user_id": user["id"], "email": email, "name": user.get("name", "")}


@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    u = await db.users.find_one({"id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return u


def generate_team_code(length=6):
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))


# ---- Team Endpoints (scoped to user) ----

@api_router.post("/teams")
async def create_team(team: TeamCreate, user: dict = Depends(get_current_user)):
    # Generate unique team code
    team_code = generate_team_code()
    while await db.teams.find_one({"team_code": team_code}):
        team_code = generate_team_code()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        **team.dict(),
        "team_code": team_code,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.teams.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/teams")
async def get_teams(sport: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["user_id"]}
    if sport:
        query["sport"] = sport
    teams = await db.teams.find(query, {"_id": 0}).sort("updated_at", -1).to_list(100)
    return teams


# IMPORTANT: /teams/lookup must be defined BEFORE /teams/{team_id} for correct routing
@api_router.get("/teams/lookup")
async def lookup_team_by_code(code: str, user: dict = Depends(get_current_user)):
    """Lookup a team by its unique 6-character code (public info)"""
    team = await db.teams.find_one(
        {"team_code": code.strip().upper()},
        {"_id": 0, "id": 1, "name": 1, "sport": 1, "format": 1, "age_group": 1,
         "gender": 1, "country": 1, "manager_name": 1, "manager_phone": 1,
         "team_code": 1, "user_id": 1}
    )
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@api_router.get("/teams/{team_id}")
async def get_team(team_id: str, user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"id": team_id, "user_id": user["user_id"]}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@api_router.put("/teams/{team_id}")
async def update_team(team_id: str, team: TeamCreate, user: dict = Depends(get_current_user)):
    update_data = team.dict()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.teams.update_one({"id": team_id, "user_id": user["user_id"]}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    updated = await db.teams.find_one({"id": team_id}, {"_id": 0})
    return updated


@api_router.delete("/teams/{team_id}")
async def delete_team(team_id: str, user: dict = Depends(get_current_user)):
    result = await db.teams.delete_one({"id": team_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Team deleted"}


# ---- Match Endpoints (scoped to user) ----

@api_router.post("/matches")
async def create_match(match: MatchCreate, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        **match.dict(),
        "events": [],
        "player_notes": [],
        "coaching_notes": [],
        "status": "planned",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.matches.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/matches")
async def get_matches(team_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["user_id"]}
    if team_id:
        query["team_id"] = team_id
    matches = await db.matches.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return matches


@api_router.get("/matches/{match_id}")
async def get_match(match_id: str, user: dict = Depends(get_current_user)):
    match = await db.matches.find_one({"id": match_id, "user_id": user["user_id"]}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@api_router.put("/matches/{match_id}")
async def update_match(match_id: str, match_data: MatchUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in match_data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.matches.update_one({"id": match_id, "user_id": user["user_id"]}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    updated = await db.matches.find_one({"id": match_id}, {"_id": 0})
    return updated


@api_router.delete("/matches/{match_id}")
async def delete_match(match_id: str, user: dict = Depends(get_current_user)):
    result = await db.matches.delete_one({"id": match_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    return {"message": "Match deleted"}


# ---- Player Notes ----

@api_router.post("/matches/{match_id}/notes")
async def add_player_note(match_id: str, note: PlayerNote, user: dict = Depends(get_current_user)):
    note_dict = note.dict()
    note_dict["match_id"] = match_id
    result = await db.matches.update_one(
        {"id": match_id, "user_id": user["user_id"]},
        {"$push": {"player_notes": note_dict}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    return note_dict


@api_router.get("/players/{player_id}/notes")
async def get_player_notes(player_id: str, user: dict = Depends(get_current_user)):
    matches = await db.matches.find(
        {"player_notes.player_id": player_id, "user_id": user["user_id"]},
        {"_id": 0, "id": 1, "opponent": 1, "created_at": 1, "player_notes": 1}
    ).to_list(100)
    notes = []
    for match in matches:
        for n in match.get("player_notes", []):
            if n.get("player_id") == player_id:
                notes.append({
                    **n,
                    "match_id": match.get("id", ""),
                    "opponent": match.get("opponent", ""),
                    "match_date": match.get("created_at", ""),
                })
    return notes


@api_router.get("/teams/{team_id}/player-stats")
async def get_player_stats(team_id: str, user: dict = Depends(get_current_user)):
    matches = await db.matches.find(
        {"team_id": team_id, "user_id": user["user_id"], "status": "completed"},
        {"_id": 0, "starters": 1, "subs": 1, "starting_lineup": 1, "events": 1, "duration_minutes": 1}
    ).to_list(500)
    stats = {}
    for match in matches:
        all_ids = set(match.get("starters", []))
        for ev in match.get("events", []):
            detail = ev.get("detail", "")
            pid = ev.get("player_id", "")
            etype = ev.get("type", "")
            if ev.get("player_in_id"):
                all_ids.add(ev["player_in_id"])
            if pid and (etype == "goal" or "GOAL" in detail.upper()):
                stats.setdefault(pid, {"matches": 0, "goals": 0, "assists": 0, "yellow": 0, "red": 0, "minutes": 0})
                stats[pid]["goals"] += 1
            if pid and (etype == "assist" or "ASSIST" in detail.upper()):
                stats.setdefault(pid, {"matches": 0, "goals": 0, "assists": 0, "yellow": 0, "red": 0, "minutes": 0})
                stats[pid]["assists"] += 1
            if pid and (etype == "yellow" or "YELLOW" in detail.upper()):
                stats.setdefault(pid, {"matches": 0, "goals": 0, "assists": 0, "yellow": 0, "red": 0, "minutes": 0})
                stats[pid]["yellow"] += 1
            if pid and (etype == "red" or "RED" in detail.upper()):
                stats.setdefault(pid, {"matches": 0, "goals": 0, "assists": 0, "yellow": 0, "red": 0, "minutes": 0})
                stats[pid]["red"] += 1
        dur = match.get("duration_minutes", 0)
        for pid in all_ids:
            stats.setdefault(pid, {"matches": 0, "goals": 0, "assists": 0, "yellow": 0, "red": 0, "minutes": 0})
            stats[pid]["matches"] += 1
            stats[pid]["minutes"] += dur
    # Add average rating
    for pid in stats:
        notes = await db.matches.find(
            {"team_id": team_id, "user_id": user["user_id"], "player_notes.player_id": pid},
            {"_id": 0, "player_notes": 1}
        ).to_list(500)
        ratings = []
        for m in notes:
            for n in m.get("player_notes", []):
                if n.get("player_id") == pid and n.get("rating"):
                    ratings.append(n["rating"])
        stats[pid]["avg_rating"] = round(sum(ratings) / len(ratings), 1) if ratings else 0
    return stats


@api_router.post("/matches/{match_id}/events")
async def add_match_event(match_id: str, event: MatchEvent, user: dict = Depends(get_current_user)):
    event_dict = event.dict()
    result = await db.matches.update_one(
        {"id": match_id, "user_id": user["user_id"]},
        {"$push": {"events": event_dict}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    return event_dict


# ---- Match Calendar ----

@api_router.get("/teams/{team_id}/calendar")
async def get_team_calendar(team_id: str, user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"id": team_id, "user_id": user["user_id"]}, {"_id": 0, "id": 1})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    events = []
    # 1) Accepted friendly invites
    friendly = await db.friendly_invites.find(
        {"$or": [{"from_team_id": team_id}, {"to_team_id": team_id}], "status": {"$in": ["accepted", "cancelled"]}},
        {"_id": 0}
    ).to_list(200)
    for inv in friendly:
        is_home = inv["from_team_id"] == team_id
        opponent = inv["to_team_name"] if is_home else inv["from_team_name"]
        opponent_country = "" if is_home else inv.get("from_country", "")
        events.append({
            "id": inv["id"],
            "type": "friendly",
            "date": inv.get("accepted_date", ""),
            "time": inv.get("accepted_time", ""),
            "opponent": opponent,
            "opponent_country": opponent_country,
            "home_away": inv.get("home_away", ""),
            "pitch_name": inv.get("pitch_name", ""),
            "pitch_address": inv.get("pitch_address", ""),
            "manager_name": inv.get("to_manager_name", "") if is_home else inv.get("from_manager_name", ""),
            "manager_phone": inv.get("to_manager_phone", "") if is_home else inv.get("from_manager_phone", ""),
            "status": "cancelled" if inv.get("status") == "cancelled" else "upcoming",
        })
    # 2) Scheduled matches (not completed)
    matches = await db.matches.find(
        {"team_id": team_id, "user_id": user["user_id"], "status": {"$ne": "completed"}},
        {"_id": 0, "id": 1, "opponent": 1, "date": 1, "status": 1}
    ).to_list(200)
    for m in matches:
        events.append({
            "id": m["id"],
            "type": "match",
            "date": m.get("date", ""),
            "time": "",
            "opponent": m.get("opponent", "Unknown"),
            "opponent_country": "",
            "home_away": "",
            "pitch_name": "",
            "pitch_address": "",
            "manager_name": "",
            "manager_phone": "",
            "status": m.get("status", "scheduled"),
        })
    # Sort by date
    events.sort(key=lambda e: e.get("date", "") or "9999")
    return events


# ---- Network (Friends) ----

@api_router.post("/network/add")
async def add_to_network(body: NetworkAdd, user: dict = Depends(get_current_user)):
    code = body.team_code.strip().upper()
    team = await db.teams.find_one({"team_code": code}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found with this code")
    if team.get("user_id") == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot add your own team")
    existing = await db.network.find_one({
        "user_id": user["user_id"],
        "friend_team_id": team["id"]
    })
    if existing:
        raise HTTPException(status_code=409, detail="Team already in your network")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "friend_team_id": team["id"],
        "friend_user_id": team.get("user_id", ""),
        "friend_team_name": team.get("name", ""),
        "friend_team_gender": team.get("gender", ""),
        "friend_team_age_group": team.get("age_group", ""),
        "friend_team_country": team.get("country", ""),
        "friend_team_format": team.get("format", ""),
        "friend_team_sport": team.get("sport", ""),
        "friend_manager_name": team.get("manager_name", ""),
        "friend_manager_phone": team.get("manager_phone", ""),
        "friend_team_code": code,
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.network.insert_one(doc)
    doc.pop("_id", None)

    # Send alert message to the added team's owner
    adder_teams = await db.teams.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(10)
    adder_name = user.get("name", user.get("email", "Someone"))
    adder_team_codes = [t.get("team_code", "") for t in adder_teams if t.get("team_code")]
    msg = {
        "id": str(uuid.uuid4()),
        "team_id": team["id"],
        "user_id": team.get("user_id", ""),
        "type": "network_add",
        "title": f"{adder_name} added your team to their network",
        "body": f"Add them back to connect!",
        "read": False,
        "adder_user_id": user["user_id"],
        "adder_team_codes": adder_team_codes,
        "adder_teams": [{"id": t["id"], "name": t.get("name",""), "team_code": t.get("team_code",""), "format": t.get("format",""), "gender": t.get("gender",""), "age_group": t.get("age_group","")} for t in adder_teams],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(msg)

    return doc


@api_router.get("/network")
async def get_network(user: dict = Depends(get_current_user)):
    friends = await db.network.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("added_at", -1).to_list(100)
    return friends


@api_router.delete("/network/{network_id}")
async def remove_from_network(network_id: str, user: dict = Depends(get_current_user)):
    result = await db.network.delete_one({"id": network_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Removed from network"}


# ---- Friendly Invites ----

@api_router.post("/friendly-invites")
async def create_friendly_invite(body: FriendlyInviteCreate, user: dict = Depends(get_current_user)):
    from_team = await db.teams.find_one({"id": body.from_team_id, "user_id": user["user_id"]}, {"_id": 0})
    if not from_team:
        raise HTTPException(status_code=404, detail="Your team not found")
    to_team = await db.teams.find_one({"team_code": body.to_team_code.strip().upper()}, {"_id": 0})
    if not to_team:
        raise HTTPException(status_code=404, detail="Opponent team not found with this code")
    if to_team.get("user_id") == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot invite your own team")
    doc = {
        "id": str(uuid.uuid4()),
        "from_user_id": user["user_id"],
        "from_team_id": from_team["id"],
        "from_team_name": from_team.get("name", ""),
        "from_team_code": from_team.get("team_code", ""),
        "from_manager_name": from_team.get("manager_name", ""),
        "from_manager_phone": from_team.get("manager_phone", ""),
        "from_gender": from_team.get("gender", ""),
        "from_age_group": from_team.get("age_group", ""),
        "from_country": from_team.get("country", ""),
        "to_user_id": to_team.get("user_id", ""),
        "to_team_id": to_team["id"],
        "to_team_name": to_team.get("name", ""),
        "to_team_code": to_team.get("team_code", ""),
        "to_manager_name": to_team.get("manager_name", ""),
        "to_manager_phone": to_team.get("manager_phone", ""),
        "proposed_dates": [d.dict() for d in body.proposed_dates],
        "home_away": body.home_away,
        "pitch_name": body.pitch_name,
        "pitch_address": body.pitch_address,
        "status": "pending",
        "accepted_date": "",
        "accepted_time": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.friendly_invites.insert_one(doc)
    doc.pop("_id", None)
    # Create message for receiver
    msg = {
        "id": str(uuid.uuid4()),
        "team_id": to_team["id"],
        "user_id": to_team.get("user_id", ""),
        "type": "invite_received",
        "title": f"Friendly match invitation from {from_team.get('name', '')}",
        "body": f"{from_team.get('name', '')} invites you to a friendly match. {len(body.proposed_dates)} date proposals.",
        "related_invite_id": doc["id"],
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(msg)
    # Create message for sender
    msg_sent = {
        "id": str(uuid.uuid4()),
        "team_id": from_team["id"],
        "user_id": user["user_id"],
        "type": "invite_sent",
        "title": f"Invitation sent to {to_team.get('name', '')}",
        "body": f"Friendly match invitation sent. Awaiting response.",
        "related_invite_id": doc["id"],
        "read": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(msg_sent)
    return doc


@api_router.get("/friendly-invites")
async def get_friendly_invites(team_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"$or": [{"from_user_id": user["user_id"]}, {"to_user_id": user["user_id"]}]}
    if team_id:
        query = {"$or": [
            {"from_team_id": team_id, "from_user_id": user["user_id"]},
            {"to_team_id": team_id, "to_user_id": user["user_id"]},
        ]}
    invites = await db.friendly_invites.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return invites


@api_router.get("/friendly-invites/{invite_id}")
async def get_friendly_invite(invite_id: str, user: dict = Depends(get_current_user)):
    invite = await db.friendly_invites.find_one(
        {"id": invite_id, "$or": [{"from_user_id": user["user_id"]}, {"to_user_id": user["user_id"]}]},
        {"_id": 0}
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    return invite


@api_router.put("/friendly-invites/{invite_id}/respond")
async def respond_to_invite(invite_id: str, body: FriendlyInviteRespond, user: dict = Depends(get_current_user)):
    invite = await db.friendly_invites.find_one(
        {"id": invite_id, "$or": [{"to_user_id": user["user_id"]}, {"from_user_id": user["user_id"]}], "status": "pending"},
        {"_id": 0}
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or already responded")
    # Determine who is the responder
    is_original_receiver = invite["to_user_id"] == user["user_id"]
    responder_team_name = invite["to_team_name"] if is_original_receiver else invite["from_team_name"]
    notified_user_id = invite["from_user_id"] if is_original_receiver else invite["to_user_id"]
    notified_team_id = invite["from_team_id"] if is_original_receiver else invite["to_team_id"]
    update = {"status": body.status}
    if body.status == "accepted":
        update["accepted_date"] = body.accepted_date
        update["accepted_time"] = body.accepted_time
    await db.friendly_invites.update_one({"id": invite_id}, {"$set": update})
    # Create message for the other party
    status_text = "accepted" if body.status == "accepted" else "declined"
    msg = {
        "id": str(uuid.uuid4()),
        "team_id": notified_team_id,
        "user_id": notified_user_id,
        "type": f"invite_{body.status}",
        "title": f"Invitation {status_text} by {responder_team_name}",
        "body": f"Date: {body.accepted_date} {body.accepted_time}" if body.status == "accepted" else "The invitation was declined.",
        "related_invite_id": invite_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(msg)
    updated = await db.friendly_invites.find_one({"id": invite_id}, {"_id": 0})
    return updated


@api_router.put("/friendly-invites/{invite_id}/cancel")
async def cancel_friendly_invite(invite_id: str, user: dict = Depends(get_current_user)):
    invite = await db.friendly_invites.find_one(
        {"id": invite_id, "$or": [{"from_user_id": user["user_id"]}, {"to_user_id": user["user_id"]}],
         "status": {"$in": ["accepted", "pending"]}},
        {"_id": 0}
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    await db.friendly_invites.update_one({"id": invite_id}, {"$set": {"status": "cancelled"}})
    # Determine who to notify (the other party)
    is_sender = invite["from_user_id"] == user["user_id"]
    other_user_id = invite["to_user_id"] if is_sender else invite["from_user_id"]
    other_team_id = invite["to_team_id"] if is_sender else invite["from_team_id"]
    canceller_name = invite["from_team_name"] if is_sender else invite["to_team_name"]
    msg = {
        "id": str(uuid.uuid4()),
        "team_id": other_team_id,
        "user_id": other_user_id,
        "type": "invite_cancelled",
        "title": f"Match cancelled by {canceller_name}",
        "body": f"The friendly match {invite.get('from_team_name','')} vs {invite.get('to_team_name','')} has been cancelled.",
        "related_invite_id": invite_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(msg)
    return {"message": "Match cancelled"}


@api_router.put("/friendly-invites/{invite_id}/amend")
async def amend_friendly_invite(invite_id: str, body: FriendlyInviteAmend, user: dict = Depends(get_current_user)):
    invite = await db.friendly_invites.find_one(
        {"id": invite_id, "$or": [{"from_user_id": user["user_id"]}, {"to_user_id": user["user_id"]}],
         "status": "accepted"},
        {"_id": 0}
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or not accepted")
    await db.friendly_invites.update_one({"id": invite_id}, {"$set": {
        "status": "pending",
        "proposed_dates": [d.dict() for d in body.proposed_dates],
        "accepted_date": "",
        "accepted_time": "",
    }})
    # Notify the other party
    is_sender = invite["from_user_id"] == user["user_id"]
    other_user_id = invite["to_user_id"] if is_sender else invite["from_user_id"]
    other_team_id = invite["to_team_id"] if is_sender else invite["from_team_id"]
    amender_name = invite["from_team_name"] if is_sender else invite["to_team_name"]
    msg = {
        "id": str(uuid.uuid4()),
        "team_id": other_team_id,
        "user_id": other_user_id,
        "type": "invite_amended",
        "title": f"New dates proposed by {amender_name}",
        "body": f"{amender_name} proposed {len(body.proposed_dates)} new date(s) for {invite.get('from_team_name','')} vs {invite.get('to_team_name','')}. Please select your preferred date.",
        "related_invite_id": invite_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(msg)
    updated = await db.friendly_invites.find_one({"id": invite_id}, {"_id": 0})
    return updated


@api_router.delete("/friendly-invites/{invite_id}")
async def delete_friendly_invite(invite_id: str, user: dict = Depends(get_current_user)):
    invite = await db.friendly_invites.find_one(
        {"id": invite_id, "$or": [{"from_user_id": user["user_id"]}, {"to_user_id": user["user_id"]}],
         "status": {"$in": ["cancelled", "declined"]}},
        {"_id": 0}
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Can only delete cancelled or declined matches")
    await db.friendly_invites.delete_one({"id": invite_id})
    return {"message": "Deleted"}


# ---- Messages (Team Board) ----

@api_router.get("/messages")
async def get_messages(team_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["user_id"]}
    if team_id:
        query["team_id"] = team_id
    messages = await db.messages.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return messages


@api_router.put("/messages/{message_id}/read")
async def mark_message_read(message_id: str, user: dict = Depends(get_current_user)):
    await db.messages.update_one(
        {"id": message_id, "user_id": user["user_id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}


@api_router.delete("/messages/{message_id}")
async def delete_message(message_id: str, user: dict = Depends(get_current_user)):
    result = await db.messages.delete_one({"id": message_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Deleted"}


# ---- Tournaments ----

@api_router.post("/tournaments")
async def create_tournament(body: TournamentCreate, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        **body.dict(),
        "teams": [],
        "matches": [],
        "status": "upcoming",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tournaments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/tournaments")
async def get_tournaments(user: dict = Depends(get_current_user)):
    tournaments = await db.tournaments.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return tournaments


@api_router.get("/tournaments/{tournament_id}")
async def get_tournament(tournament_id: str, user: dict = Depends(get_current_user)):
    t = await db.tournaments.find_one({"id": tournament_id, "user_id": user["user_id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return t


@api_router.put("/tournaments/{tournament_id}")
async def update_tournament(tournament_id: str, body: TournamentCreate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in body.dict().items()}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.tournaments.update_one(
        {"id": tournament_id, "user_id": user["user_id"]}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})


@api_router.delete("/tournaments/{tournament_id}")
async def delete_tournament(tournament_id: str, user: dict = Depends(get_current_user)):
    result = await db.tournaments.delete_one({"id": tournament_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {"message": "Tournament deleted"}


@api_router.post("/tournaments/{tournament_id}/teams")
async def add_team_to_tournament(tournament_id: str, body: TournamentTeam, user: dict = Depends(get_current_user)):
    t = await db.tournaments.find_one({"id": tournament_id, "user_id": user["user_id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    for existing in t.get("teams", []):
        if existing["team_id"] == body.team_id:
            raise HTTPException(status_code=409, detail="Team already in tournament")
    team_entry = body.dict()
    await db.tournaments.update_one(
        {"id": tournament_id},
        {"$push": {"teams": team_entry}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return team_entry


@api_router.delete("/tournaments/{tournament_id}/teams/{team_id}")
async def remove_team_from_tournament(tournament_id: str, team_id: str, user: dict = Depends(get_current_user)):
    result = await db.tournaments.update_one(
        {"id": tournament_id, "user_id": user["user_id"]},
        {"$pull": {"teams": {"team_id": team_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {"message": "Team removed"}


@api_router.post("/tournaments/{tournament_id}/matches")
async def add_tournament_match(tournament_id: str, body: TournamentMatchCreate, user: dict = Depends(get_current_user)):
    t = await db.tournaments.find_one({"id": tournament_id, "user_id": user["user_id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    match_doc = {
        "id": str(uuid.uuid4()),
        "home_team_id": body.home_team_id,
        "home_team_name": body.home_team_name,
        "away_team_id": body.away_team_id,
        "away_team_name": body.away_team_name,
        "score_home": 0,
        "score_away": 0,
        "date": body.date,
        "status": "scheduled",
    }
    await db.tournaments.update_one(
        {"id": tournament_id},
        {"$push": {"matches": match_doc}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return match_doc


@api_router.put("/tournaments/{tournament_id}/matches/{match_id}")
async def update_tournament_match(tournament_id: str, match_id: str, body: TournamentMatchUpdate, user: dict = Depends(get_current_user)):
    t = await db.tournaments.find_one({"id": tournament_id, "user_id": user["user_id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    matches = t.get("matches", [])
    updated = False
    for m in matches:
        if m["id"] == match_id:
            if body.score_home is not None:
                m["score_home"] = body.score_home
            if body.score_away is not None:
                m["score_away"] = body.score_away
            if body.date is not None:
                m["date"] = body.date
            if body.status is not None:
                m["status"] = body.status
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Match not found")
    await db.tournaments.update_one(
        {"id": tournament_id},
        {"$set": {"matches": matches, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return next(m for m in matches if m["id"] == match_id)


@api_router.get("/tournaments/{tournament_id}/standings")
async def get_tournament_standings(tournament_id: str, user: dict = Depends(get_current_user)):
    t = await db.tournaments.find_one({"id": tournament_id, "user_id": user["user_id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    standings: dict = {}
    for team in t.get("teams", []):
        standings[team["team_id"]] = {
            "team_id": team["team_id"],
            "team_name": team["team_name"],
            "played": 0, "won": 0, "drawn": 0, "lost": 0,
            "goals_for": 0, "goals_against": 0, "goal_diff": 0, "points": 0,
        }
    for match in t.get("matches", []):
        if match.get("status") != "completed":
            continue
        h_id = match["home_team_id"]
        a_id = match["away_team_id"]
        sh = match.get("score_home", 0)
        sa = match.get("score_away", 0)
        for tid in [h_id, a_id]:
            if tid not in standings:
                standings[tid] = {
                    "team_id": tid,
                    "team_name": match["home_team_name"] if tid == h_id else match["away_team_name"],
                    "played": 0, "won": 0, "drawn": 0, "lost": 0,
                    "goals_for": 0, "goals_against": 0, "goal_diff": 0, "points": 0,
                }
        h = standings[h_id]
        a = standings[a_id]
        h["played"] += 1; a["played"] += 1
        h["goals_for"] += sh; h["goals_against"] += sa
        a["goals_for"] += sa; a["goals_against"] += sh
        if sh > sa:
            h["won"] += 1; h["points"] += 3; a["lost"] += 1
        elif sh < sa:
            a["won"] += 1; a["points"] += 3; h["lost"] += 1
        else:
            h["drawn"] += 1; h["points"] += 1
            a["drawn"] += 1; a["points"] += 1
    for s in standings.values():
        s["goal_diff"] = s["goals_for"] - s["goals_against"]
    sorted_standings = sorted(
        standings.values(),
        key=lambda x: (-x["points"], -x["goal_diff"], -x["goals_for"])
    )
    return sorted_standings


@api_router.post("/teams/{team_id}/training-suggestions")
async def get_training_suggestions(team_id: str, body: dict, user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"id": team_id, "user_id": user["user_id"]}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    from emergentintegrations.llm.chat import LlmChat, UserMessage
    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    category = body.get("category", "general")

    matches = await db.matches.find(
        {"team_id": team_id, "user_id": user["user_id"], "status": "completed"},
        {"_id": 0, "opponent": 1, "score_home": 1, "score_away": 1, "formation": 1, "events": 1}
    ).sort("created_at", -1).to_list(5)

    match_summary = ""
    for m in matches:
        sh = m.get("score_home", 0)
        sa = m.get("score_away", 0)
        result = "W" if sh > sa else "L" if sh < sa else "D"
        match_summary += f"vs {m.get('opponent','?')} {sh}-{sa} ({result}, {m.get('formation','?')})\n"

    prompt = f"""You are a football/futsal coach. Generate 3 training session suggestions for a {team.get('age_group', 'youth')} team playing {team.get('format', '11v11')} {team.get('sport', 'football')}.

Category: {category} (general/defensive/attacking)
Preferred formation: {team.get('formation', 'not set')}

Recent match results:
{match_summary or 'No matches yet'}

For each session provide:
1. title: Short session name
2. duration: How long (e.g. "60 min")
3. focus: Key focus area
4. description: 2-3 sentence overview
5. drills: Array of 3-4 drills, each with:
   - name: Drill name
   - duration: e.g. "10 min"
   - description: What to do
   - setup: How to set up
   - coaching_points: 2-3 key coaching points

Return valid JSON array of 3 sessions. No markdown, just the JSON array."""

    chat = LlmChat(api_key=llm_key, session_id=f"training-{team_id}-{category}", system_message="You are a professional football coach assistant. Return only valid JSON.")
    chat.with_model("openai", "gpt-5.2")
    response = await chat.send_message(UserMessage(text=prompt))

    import json as json_mod
    try:
        sessions = json_mod.loads(response)
    except:
        try:
            start = response.index('[')
            end = response.rindex(']') + 1
            sessions = json_mod.loads(response[start:end])
        except:
            sessions = [{"title": "Error", "description": response, "drills": []}]

    return {"sessions": sessions, "category": category}


# ---- Profile & Settings ----

@api_router.put("/auth/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    update = {}
    if body.name.strip():
        update["name"] = body.name.strip()
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.users.update_one({"id": user["user_id"]}, {"$set": update})
    u = await db.users.find_one({"id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return u


@api_router.put("/auth/password")
async def change_password(body: PasswordChange, user: dict = Depends(get_current_user)):
    u = await db.users.find_one({"id": user["user_id"]})
    if not u or not bcrypt.verify(body.current_password, u["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    new_hash = bcrypt.hash(body.new_password)
    await db.users.update_one({"id": user["user_id"]}, {"$set": {"password_hash": new_hash}})
    return {"message": "Password updated"}


# ---- Notifications / Unread Count ----

@api_router.get("/notifications/unread")
async def get_unread_count(user: dict = Depends(get_current_user)):
    msg_count = await db.messages.count_documents({"user_id": user["user_id"], "read": False})
    dm_count = await db.direct_messages.count_documents({"to_user_id": user["user_id"], "read": False})
    return {"total": msg_count + dm_count, "messages": msg_count, "direct_messages": dm_count}


# ---- Direct Messages (Manager-to-Manager) ----

@api_router.get("/direct-messages/conversations")
async def get_dm_conversations(user: dict = Depends(get_current_user)):
    # Get all DMs involving this user
    dms = await db.direct_messages.find(
        {"$or": [{"from_user_id": user["user_id"]}, {"to_user_id": user["user_id"]}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    # Group by other user
    convos = {}
    for m in dms:
        other = m["to_user_id"] if m["from_user_id"] == user["user_id"] else m["from_user_id"]
        if other not in convos:
            convos[other] = {
                "other_user_id": other,
                "other_user_name": m.get("to_user_name", "") if m["from_user_id"] == user["user_id"] else m.get("from_user_name", ""),
                "other_team_name": m.get("to_team_name", "") if m["from_user_id"] == user["user_id"] else m.get("from_team_name", ""),
                "other_team_id": m.get("to_team_id", "") if m["from_user_id"] == user["user_id"] else m.get("from_team_id", ""),
                "last_message": m.get("content", ""),
                "last_message_at": m.get("created_at", ""),
                "unread_count": 0,
            }
        if m["to_user_id"] == user["user_id"] and not m.get("read"):
            convos[other]["unread_count"] += 1
    return list(convos.values())


@api_router.get("/direct-messages/conversation/{other_user_id}")
async def get_dm_conversation(other_user_id: str, user: dict = Depends(get_current_user)):
    dms = await db.direct_messages.find(
        {"$or": [
            {"from_user_id": user["user_id"], "to_user_id": other_user_id},
            {"from_user_id": other_user_id, "to_user_id": user["user_id"]},
        ]},
        {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    # Mark received as read
    await db.direct_messages.update_many(
        {"from_user_id": other_user_id, "to_user_id": user["user_id"], "read": False},
        {"$set": {"read": True}}
    )
    return dms


@api_router.post("/direct-messages")
async def send_direct_message(body: DirectMessageSend, user: dict = Depends(get_current_user)):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    # Get sender info
    sender = await db.users.find_one({"id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    recipient = await db.users.find_one({"id": body.to_user_id}, {"_id": 0, "password_hash": 0})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    # Get team names if provided
    from_team_name = ""
    to_team_name = ""
    if body.from_team_id:
        ft = await db.teams.find_one({"id": body.from_team_id}, {"_id": 0, "name": 1})
        from_team_name = ft.get("name", "") if ft else ""
    if body.to_team_id:
        tt = await db.teams.find_one({"id": body.to_team_id}, {"_id": 0, "name": 1})
        to_team_name = tt.get("name", "") if tt else ""
    doc = {
        "id": str(uuid.uuid4()),
        "from_user_id": user["user_id"],
        "from_user_name": sender.get("name", "") if sender else "",
        "from_team_id": body.from_team_id,
        "from_team_name": from_team_name,
        "to_user_id": body.to_user_id,
        "to_user_name": recipient.get("name", "") if recipient else "",
        "to_team_id": body.to_team_id,
        "to_team_name": to_team_name,
        "content": body.content.strip(),
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.direct_messages.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/direct-messages/{message_id}")
async def delete_direct_message(message_id: str, user: dict = Depends(get_current_user)):
    result = await db.direct_messages.delete_one({
        "id": message_id,
        "$or": [{"from_user_id": user["user_id"]}, {"to_user_id": user["user_id"]}]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Deleted"}

@api_router.delete("/direct-messages/conversation/{other_user_id}")
async def delete_conversation(other_user_id: str, user: dict = Depends(get_current_user)):
    result = await db.direct_messages.delete_many({
        "$or": [
            {"from_user_id": user["user_id"], "to_user_id": other_user_id},
            {"from_user_id": other_user_id, "to_user_id": user["user_id"]}
        ]
    })
    return {"deleted": result.deleted_count}



# ---- All-Teams Calendar ----

@api_router.get("/calendar/all")
async def get_all_teams_calendar(user: dict = Depends(get_current_user)):
    teams = await db.teams.find({"user_id": user["user_id"]}, {"_id": 0, "id": 1, "name": 1}).to_list(50)
    team_ids = [t["id"] for t in teams]
    team_map = {t["id"]: t["name"] for t in teams}
    events = []
    # Friendly invites
    if team_ids:
        friendly = await db.friendly_invites.find(
            {"$or": [{"from_team_id": {"$in": team_ids}}, {"to_team_id": {"$in": team_ids}}],
             "status": {"$in": ["accepted", "cancelled"]}},
            {"_id": 0}
        ).to_list(500)
        for inv in friendly:
            my_team_id = inv["from_team_id"] if inv["from_team_id"] in team_ids else inv["to_team_id"]
            is_home = inv["from_team_id"] in team_ids
            opponent = inv["to_team_name"] if is_home else inv["from_team_name"]
            events.append({
                "id": inv["id"],
                "type": "friendly",
                "team_name": team_map.get(my_team_id, ""),
                "team_id": my_team_id,
                "date": inv.get("accepted_date", ""),
                "time": inv.get("accepted_time", ""),
                "opponent": opponent,
                "home_away": inv.get("home_away", ""),
                "pitch_name": inv.get("pitch_name", ""),
                "status": "cancelled" if inv.get("status") == "cancelled" else "upcoming",
            })
    events.sort(key=lambda e: e.get("date", "") or "9999")
    return events


# ---- Tournaments ----

import math, random

def generate_fixtures(teams_list, tournament_type, groups_count, matches_per_pair):
    """Generate fixtures for a tournament. Returns matches and group assignments."""
    random.shuffle(teams_list)
    groups = {}
    matches = []
    
    if tournament_type == "league":
        # Round-robin league
        groups = {"A": [t["name"] for t in teams_list]}
        match_num = 1
        for r in range(matches_per_pair):
            for i in range(len(teams_list)):
                for j in range(i + 1, len(teams_list)):
                    matches.append({
                        "id": str(uuid.uuid4()),
                        "match_number": match_num,
                        "round": "league",
                        "group": "A",
                        "home_team": teams_list[i]["name"],
                        "away_team": teams_list[j]["name"],
                        "home_team_id": teams_list[i].get("team_id", ""),
                        "away_team_id": teams_list[j].get("team_id", ""),
                        "home_score": None,
                        "away_score": None,
                        "played": False,
                    })
                    match_num += 1
    
    elif tournament_type == "knockout":
        # Single-elimination bracket with byes
        n = len(teams_list)
        next_pow2 = 2 ** math.ceil(math.log2(max(n, 2)))
        byes = next_pow2 - n
        round_name = _round_name(next_pow2)
        match_num = 1
        # First round: teams that don't get byes play
        playing = teams_list[byes:]  # these play first round
        bye_teams = teams_list[:byes]  # these get byes
        for i in range(0, len(playing), 2):
            if i + 1 < len(playing):
                matches.append({
                    "id": str(uuid.uuid4()),
                    "match_number": match_num,
                    "round": round_name,
                    "group": "",
                    "home_team": playing[i]["name"],
                    "away_team": playing[i + 1]["name"],
                    "home_team_id": playing[i].get("team_id", ""),
                    "away_team_id": playing[i + 1].get("team_id", ""),
                    "home_score": None,
                    "away_score": None,
                    "played": False,
                })
                match_num += 1
        # Bye teams auto-advance - create placeholder next round matches
        # (These will be populated when first round completes)
    
    elif tournament_type == "group_knockout":
        # Group stage then knockout
        gc = max(2, min(groups_count, len(teams_list) // 2))
        group_names = [chr(65 + i) for i in range(gc)]
        for i, t in enumerate(teams_list):
            g = group_names[i % gc]
            if g not in groups:
                groups[g] = []
            groups[g].append(t["name"])
        
        match_num = 1
        for g_name, g_teams_names in groups.items():
            g_teams = [t for t in teams_list if t["name"] in g_teams_names]
            for r in range(matches_per_pair):
                for i in range(len(g_teams)):
                    for j in range(i + 1, len(g_teams)):
                        matches.append({
                            "id": str(uuid.uuid4()),
                            "match_number": match_num,
                            "round": "group",
                            "group": g_name,
                            "home_team": g_teams[i]["name"],
                            "away_team": g_teams[j]["name"],
                            "home_team_id": g_teams[i].get("team_id", ""),
                            "away_team_id": g_teams[j].get("team_id", ""),
                            "home_score": None,
                            "away_score": None,
                            "played": False,
                        })
                        match_num += 1
    
    return matches, groups


def _round_name(size):
    if size <= 2: return "Final"
    if size <= 4: return "Semi-Final"
    if size <= 8: return "Quarter-Final"
    if size <= 16: return "Round of 16"
    return f"Round of {size}"


def compute_standings(matches, group_teams):
    """Compute league/group standings from matches."""
    table = {}
    for name in group_teams:
        table[name] = {"team": name, "played": 0, "won": 0, "drawn": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "points": 0}
    for m in matches:
        if not m.get("played"): continue
        h, a = m["home_team"], m["away_team"]
        hs, as_ = m.get("home_score", 0) or 0, m.get("away_score", 0) or 0
        if h in table:
            table[h]["played"] += 1; table[h]["gf"] += hs; table[h]["ga"] += as_; table[h]["gd"] = table[h]["gf"] - table[h]["ga"]
            if hs > as_: table[h]["won"] += 1; table[h]["points"] += 3
            elif hs == as_: table[h]["drawn"] += 1; table[h]["points"] += 1
            else: table[h]["lost"] += 1
        if a in table:
            table[a]["played"] += 1; table[a]["gf"] += as_; table[a]["ga"] += hs; table[a]["gd"] = table[a]["gf"] - table[a]["ga"]
            if as_ > hs: table[a]["won"] += 1; table[a]["points"] += 3
            elif hs == as_: table[a]["drawn"] += 1; table[a]["points"] += 1
            else: table[a]["lost"] += 1
    return sorted(table.values(), key=lambda x: (-x["points"], -x["gd"], -x["gf"]))


def advance_knockout(tournament):
    """After a knockout match result, generate next round matches if needed."""
    matches = tournament.get("matches", [])
    t_type = tournament.get("tournament_type", "")
    teams_list = tournament.get("teams", [])
    
    # Don't advance if already completed
    if tournament.get("status") == "completed" or tournament.get("winner"):
        return matches
    
    if t_type == "knockout":
        # Check if current round is complete
        current_rounds = set(m["round"] for m in matches if not m.get("played") or m.get("played"))
        for round_name in current_rounds:
            round_matches = [m for m in matches if m["round"] == round_name]
            all_played = all(m.get("played") for m in round_matches)
            if not all_played: continue
            # All matches in this round played - determine winners
            winners = []
            for m in round_matches:
                if (m.get("home_score", 0) or 0) >= (m.get("away_score", 0) or 0):
                    winners.append({"name": m["home_team"], "team_id": m.get("home_team_id", "")})
                else:
                    winners.append({"name": m["away_team"], "team_id": m.get("away_team_id", "")})
            # Add bye teams that didn't play in first round
            n = len(teams_list)
            next_pow2 = 2 ** math.ceil(math.log2(max(n, 2)))
            byes = next_pow2 - n
            if round_name == _round_name(next_pow2) and byes > 0:
                bye_names = [t["name"] for t in teams_list[:byes]]
                for bn in bye_names:
                    t = next((tt for tt in teams_list if tt["name"] == bn), {"name": bn, "team_id": ""})
                    winners.append(t)
            # Check if there are already next round matches
            existing_next = [m for m in matches if m["round"] != round_name and not m.get("played")]
            if existing_next or len(winners) < 2: continue
            # Generate next round
            next_round = _round_name(len(winners))
            match_num = max((m.get("match_number", 0) for m in matches), default=0) + 1
            for i in range(0, len(winners), 2):
                if i + 1 < len(winners):
                    matches.append({
                        "id": str(uuid.uuid4()),
                        "match_number": match_num,
                        "round": next_round,
                        "group": "",
                        "home_team": winners[i]["name"],
                        "away_team": winners[i + 1]["name"],
                        "home_team_id": winners[i].get("team_id", ""),
                        "away_team_id": winners[i + 1].get("team_id", ""),
                        "home_score": None,
                        "away_score": None,
                        "played": False,
                    })
                    match_num += 1
    
    elif t_type == "group_knockout":
        groups = tournament.get("groups", {})
        has_b = tournament.get("has_b_knockout", False)
        group_matches = [m for m in matches if m["round"] == "group"]
        all_group_played = all(m.get("played") for m in group_matches)
        existing_ko_a = [m for m in matches if m["round"] != "group" and m.get("bracket") != "b"]
        existing_ko_b = [m for m in matches if m.get("bracket") == "b"]
        
        if all_group_played and group_matches and not existing_ko_a:
            # Advance top 2 from each group to A knockout
            qualifiers_a = []
            qualifiers_b = []
            for g_name, g_teams in groups.items():
                g_ms = [m for m in group_matches if m["group"] == g_name]
                standings = compute_standings(g_ms, g_teams)
                for i, s in enumerate(standings):
                    t = next((tt for tt in teams_list if tt["name"] == s["team"]), {"name": s["team"], "team_id": ""})
                    if i < 2:
                        qualifiers_a.append(t)
                    elif has_b:
                        qualifiers_b.append(t)
            
            match_num = max((m.get("match_number", 0) for m in matches), default=0) + 1
            
            # A bracket
            random.shuffle(qualifiers_a)
            next_pow2_a = 2 ** math.ceil(math.log2(max(len(qualifiers_a), 2)))
            round_name_a = _round_name(next_pow2_a)
            for i in range(0, len(qualifiers_a), 2):
                if i + 1 < len(qualifiers_a):
                    matches.append({
                        "id": str(uuid.uuid4()), "match_number": match_num,
                        "round": round_name_a, "group": "", "bracket": "a",
                        "home_team": qualifiers_a[i]["name"], "away_team": qualifiers_a[i + 1]["name"],
                        "home_team_id": qualifiers_a[i].get("team_id", ""), "away_team_id": qualifiers_a[i + 1].get("team_id", ""),
                        "home_score": None, "away_score": None, "played": False,
                    })
                    match_num += 1
            
            # B bracket
            if has_b and len(qualifiers_b) >= 2:
                random.shuffle(qualifiers_b)
                next_pow2_b = 2 ** math.ceil(math.log2(max(len(qualifiers_b), 2)))
                round_name_b = _round_name(next_pow2_b)
                for i in range(0, len(qualifiers_b), 2):
                    if i + 1 < len(qualifiers_b):
                        matches.append({
                            "id": str(uuid.uuid4()), "match_number": match_num,
                            "round": round_name_b, "group": "", "bracket": "b",
                            "home_team": qualifiers_b[i]["name"], "away_team": qualifiers_b[i + 1]["name"],
                            "home_team_id": qualifiers_b[i].get("team_id", ""), "away_team_id": qualifiers_b[i + 1].get("team_id", ""),
                            "home_score": None, "away_score": None, "played": False,
                        })
                        match_num += 1
        
        else:
            # Handle knockout advancement for both A and B brackets
            for bracket_type in ["a", "b"]:
                ko_matches = [m for m in matches if m.get("bracket") == bracket_type and m["round"] != "group"]
                if not ko_matches:
                    # Legacy: matches without bracket field → treat as "a"
                    if bracket_type == "a":
                        ko_matches = [m for m in matches if m["round"] != "group" and not m.get("bracket")]
                    if not ko_matches:
                        continue
                ko_rounds = set(m["round"] for m in ko_matches)
                for rn in ko_rounds:
                    rmatches = [m for m in ko_matches if m["round"] == rn]
                    if not all(m.get("played") for m in rmatches): continue
                    winners = []
                    for m in rmatches:
                        if (m.get("home_score", 0) or 0) >= (m.get("away_score", 0) or 0):
                            winners.append({"name": m["home_team"], "team_id": m.get("home_team_id", "")})
                        else:
                            winners.append({"name": m["away_team"], "team_id": m.get("away_team_id", "")})
                    next_existing = [m for m in ko_matches if m["round"] != rn and not m.get("played")]
                    if next_existing or len(winners) < 2: continue
                    next_round = _round_name(len(winners))
                    match_num = max((m.get("match_number", 0) for m in matches), default=0) + 1
                    for i in range(0, len(winners), 2):
                        if i + 1 < len(winners):
                            matches.append({
                                "id": str(uuid.uuid4()), "match_number": match_num,
                                "round": next_round, "group": "", "bracket": bracket_type,
                                "home_team": winners[i]["name"], "away_team": winners[i + 1]["name"],
                                "home_team_id": winners[i].get("team_id", ""), "away_team_id": winners[i + 1].get("team_id", ""),
                                "home_score": None, "away_score": None, "played": False,
                            })
                            match_num += 1
    
    return matches


def check_winner(tournament):
    """Check if tournament has a winner (and B bracket winner)."""
    matches = tournament.get("matches", [])
    t_type = tournament.get("tournament_type", "")
    has_b = tournament.get("has_b_knockout", False)
    
    result = {"winner": None, "winner_b": None}
    
    if t_type == "league":
        all_played = all(m.get("played") for m in matches)
        if all_played and matches:
            teams_in = list(set([m["home_team"] for m in matches] + [m["away_team"] for m in matches]))
            standings = compute_standings(matches, teams_in)
            result["winner"] = standings[0]["team"] if standings else None
    else:
        # A bracket finals
        a_finals = [m for m in matches if m["round"] == "Final" and m.get("bracket") != "b"]
        if not a_finals:
            a_finals = [m for m in matches if m["round"] == "Final" and not m.get("bracket")]
        if a_finals and all(m.get("played") for m in a_finals):
            f = a_finals[0]
            result["winner"] = f["home_team"] if (f.get("home_score", 0) or 0) >= (f.get("away_score", 0) or 0) else f["away_team"]
        
        # B bracket finals
        if has_b:
            b_finals = [m for m in matches if m["round"] == "Final" and m.get("bracket") == "b"]
            if b_finals and all(m.get("played") for m in b_finals):
                fb = b_finals[0]
                result["winner_b"] = fb["home_team"] if (fb.get("home_score", 0) or 0) >= (fb.get("away_score", 0) or 0) else fb["away_team"]
    
    return result


@api_router.post("/tournaments")
async def create_tournament(body: TournamentCreate, user: dict = Depends(get_current_user)):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Tournament name required")
    if len(body.teams) < 2:
        raise HTTPException(status_code=400, detail="At least 2 teams required")
    
    teams_data = [{"name": t.name, "team_id": t.team_id, "from_network": t.from_network} for t in body.teams]
    matches, groups = generate_fixtures(teams_data, body.tournament_type, body.groups_count, body.matches_per_pair)
    
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "name": body.name.strip(),
        "format": body.format,
        "tournament_type": body.tournament_type,
        "start_date": body.start_date,
        "end_date": body.end_date,
        "teams": teams_data,
        "groups": groups,
        "matches": matches,
        "has_b_knockout": body.has_b_knockout,
        "status": "ongoing",
        "winner": None,
        "winner_b": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tournaments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/tournaments")
async def list_tournaments(status: str = "", user: dict = Depends(get_current_user)):
    query = {"user_id": user["user_id"]}
    if status:
        query["status"] = status
    tournaments = await db.tournaments.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return tournaments


@api_router.get("/tournaments/{tournament_id}")
async def get_tournament(tournament_id: str, user: dict = Depends(get_current_user)):
    t = await db.tournaments.find_one({"id": tournament_id, "user_id": user["user_id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return t


@api_router.put("/tournaments/{tournament_id}/result/{match_id}")
async def submit_match_result(tournament_id: str, match_id: str, body: MatchResult, user: dict = Depends(get_current_user)):
    t = await db.tournaments.find_one({"id": tournament_id, "user_id": user["user_id"]})
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    matches = t.get("matches", [])
    found = False
    for m in matches:
        if m["id"] == match_id:
            m["home_score"] = body.home_score
            m["away_score"] = body.away_score
            m["played"] = True
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Match not found")
    
    t["matches"] = matches
    # Check winner first
    result = check_winner(t)
    if not result.get("winner"):
        # Only advance if no A bracket winner yet
        t["matches"] = advance_knockout(t)
        result = check_winner(t)
    update = {"matches": t["matches"]}
    if result.get("winner"):
        update["winner"] = result["winner"]
    if result.get("winner_b"):
        update["winner_b"] = result["winner_b"]
    # Complete if A winner found (and B winner too if B bracket exists)
    has_b = t.get("has_b_knockout", False)
    if result.get("winner"):
        if has_b:
            # Both brackets need winners
            if result.get("winner_b"):
                update["status"] = "completed"
        else:
            update["status"] = "completed"
    
    await db.tournaments.update_one({"id": tournament_id}, {"$set": update})
    t.pop("_id", None)
    t.update(update)
    return t


@api_router.delete("/tournaments/{tournament_id}")
async def delete_tournament(tournament_id: str, user: dict = Depends(get_current_user)):
    result = await db.tournaments.delete_one({"id": tournament_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}


@api_router.get("/tournaments/{tournament_id}/pdf")
async def tournament_pdf(tournament_id: str, user: dict = Depends(get_current_user)):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor, white, black
    from reportlab.pdfgen import canvas
    from reportlab.lib.enums import TA_CENTER
    import io

    t = await db.tournaments.find_one({"id": tournament_id, "user_id": user["user_id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    
    # Colors
    dark_bg = HexColor('#0D1117')
    card_bg = HexColor('#161B22')
    green = HexColor('#4ADE80')
    gold = HexColor('#F59E0B')
    gray = HexColor('#8B949E')
    light = HexColor('#C9D1D9')
    
    # Background
    c.setFillColor(dark_bg)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    
    # Header stripe
    c.setFillColor(HexColor('#1A2332'))
    c.rect(0, h - 100, w, 100, fill=1, stroke=0)
    c.setStrokeColor(green)
    c.setLineWidth(2)
    c.line(20, h - 100, w - 20, h - 100)
    
    # Trophy icon (star shape)
    c.setFillColor(gold)
    cx, cy = w / 2, h - 40
    c.circle(cx, cy, 12, fill=1, stroke=0)
    c.setFillColor(dark_bg)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(cx, cy - 5, "★")
    
    # Title
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(w / 2, h - 70, t["name"].upper())
    c.setFillColor(gray)
    c.setFont("Helvetica", 10)
    c.drawCentredString(w / 2, h - 88, f"{t.get('tournament_type', '').replace('_', ' ').upper()} · {t.get('format', '')} · {len(t.get('teams', []))} TEAMS")
    
    y = h - 130
    matches = t.get("matches", [])
    groups = t.get("groups", {})
    teams_list = t.get("teams", [])
    t_type = t.get("tournament_type", "")
    
    # Standings table for league / group_knockout
    if t_type in ("league", "group_knockout") and groups:
        for g_name, g_teams in groups.items():
            g_matches = [m for m in matches if m.get("group") == g_name]
            standings = compute_standings(g_matches, g_teams)
            
            c.setFillColor(green)
            c.setFont("Helvetica-Bold", 12)
            label = "STANDINGS" if t_type == "league" else f"GROUP {g_name}"
            c.drawString(30, y, label)
            y -= 18
            
            # Table header
            c.setFillColor(card_bg)
            c.rect(25, y - 4, w - 50, 18, fill=1, stroke=0)
            c.setFillColor(gray)
            c.setFont("Helvetica-Bold", 8)
            cols = [("Team", 30), ("P", 220), ("W", 255), ("D", 285), ("L", 315), ("GF", 345), ("GA", 375), ("GD", 405), ("Pts", 440)]
            for label, x_pos in cols:
                c.drawString(x_pos, y, label)
            y -= 16
            
            for i, row in enumerate(standings):
                if i < 2 and t_type == "group_knockout":
                    c.setStrokeColor(green)
                    c.setLineWidth(1)
                    c.line(25, y + 10, 25, y - 6)
                c.setFillColor(light)
                c.setFont("Helvetica", 9)
                c.drawString(30, y, row["team"][:22])
                vals = [row["played"], row["won"], row["drawn"], row["lost"], row["gf"], row["ga"], row["gd"], row["points"]]
                x_positions = [220, 255, 285, 315, 345, 375, 405, 440]
                for v, xp in zip(vals, x_positions):
                    c.setFillColor(green if xp == 440 else light)
                    c.drawString(xp, y, str(v))
                y -= 14
            y -= 10
    
    # Bracket visualization for knockout / group_knockout knockout phase
    ko_matches = [m for m in matches if m.get("round") != "group"]
    if ko_matches or t_type == "knockout":
        bracket_matches = ko_matches if ko_matches else matches
        
        c.setFillColor(green)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(30, y, "KNOCKOUT BRACKET")
        y -= 10
        
        # Organize by rounds
        round_order = []
        seen_rounds = set()
        for m in bracket_matches:
            rn = m.get("round", "")
            if rn and rn not in seen_rounds:
                round_order.append(rn)
                seen_rounds.add(rn)
        
        if round_order:
            num_rounds = len(round_order)
            round_width = (w - 60) / max(num_rounds, 1)
            
            for ri, rname in enumerate(round_order):
                rx = 30 + ri * round_width
                rmatches = [m for m in bracket_matches if m.get("round") == rname]
                
                # Round label
                c.setFillColor(gray)
                c.setFont("Helvetica-Bold", 8)
                c.drawString(rx, y, rname.upper())
                
                match_h = 36
                gap = 12
                start_y = y - 20
                total_h = len(rmatches) * (match_h + gap)
                offset_y = start_y
                
                for mi, m in enumerate(rmatches):
                    # Match card
                    c.setFillColor(card_bg)
                    c.roundRect(rx, offset_y - match_h, round_width - 15, match_h, 4, fill=1, stroke=0)
                    
                    # Border accent
                    if m.get("played"):
                        c.setStrokeColor(green)
                    else:
                        c.setStrokeColor(gray)
                    c.setLineWidth(0.5)
                    c.line(rx, offset_y - match_h + 4, rx, offset_y - 4)
                    
                    hs = m.get("home_score")
                    as_ = m.get("away_score")
                    home_won = m.get("played") and (hs or 0) >= (as_ or 0)
                    away_won = m.get("played") and (as_ or 0) > (hs or 0)
                    
                    # Home team
                    c.setFillColor(green if home_won else (light if not m.get("played") else gray))
                    c.setFont("Helvetica-Bold" if home_won else "Helvetica", 8)
                    c.drawString(rx + 6, offset_y - 14, m["home_team"][:16])
                    if m.get("played"):
                        c.drawRightString(rx + round_width - 22, offset_y - 14, str(hs))
                    
                    # Away team
                    c.setFillColor(green if away_won else (light if not m.get("played") else gray))
                    c.setFont("Helvetica-Bold" if away_won else "Helvetica", 8)
                    c.drawString(rx + 6, offset_y - match_h + 8, m["away_team"][:16])
                    if m.get("played"):
                        c.drawRightString(rx + round_width - 22, offset_y - match_h + 8, str(as_))
                    
                    # Connector lines to next round
                    if ri < num_rounds - 1:
                        mid_y = offset_y - match_h / 2
                        c.setStrokeColor(HexColor('#30363D'))
                        c.setLineWidth(1)
                        c.line(rx + round_width - 15, mid_y, rx + round_width - 5, mid_y)
                    
                    offset_y -= (match_h + gap)
                
                y_bottom = offset_y
            
            y = min(y_bottom - 10, y - 20 - len(bracket_matches) * 25)
    
    # Match results list
    if y > 120:
        c.setFillColor(green)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(30, y, "ALL RESULTS")
        y -= 18
        
        for m in matches:
            if y < 40:
                c.showPage()
                c.setFillColor(dark_bg)
                c.rect(0, 0, w, h, fill=1, stroke=0)
                y = h - 40
            
            c.setFillColor(card_bg)
            c.roundRect(25, y - 16, w - 50, 20, 3, fill=1, stroke=0)
            
            label = m.get("group", "") or m.get("round", "")
            c.setFillColor(gray)
            c.setFont("Helvetica", 7)
            c.drawString(30, y - 12, label)
            
            c.setFillColor(light)
            c.setFont("Helvetica", 9)
            c.drawString(100, y - 12, m["home_team"])
            
            if m.get("played"):
                c.setFillColor(green)
                c.setFont("Helvetica-Bold", 10)
                score_str = f"{m.get('home_score', 0)} - {m.get('away_score', 0)}"
                c.drawCentredString(w / 2, y - 12, score_str)
            else:
                c.setFillColor(gray)
                c.setFont("Helvetica", 8)
                c.drawCentredString(w / 2, y - 12, "vs")
            
            c.setFillColor(light)
            c.setFont("Helvetica", 9)
            c.drawRightString(w - 30, y - 12, m["away_team"])
            y -= 22
    
    # Winner banner
    if t.get("winner"):
        if y < 80:
            c.showPage()
            c.setFillColor(dark_bg)
            c.rect(0, 0, w, h, fill=1, stroke=0)
            y = h - 60
        
        c.setFillColor(HexColor('#1A2332'))
        c.roundRect(40, y - 60, w - 80, 55, 8, fill=1, stroke=0)
        c.setStrokeColor(gold)
        c.setLineWidth(1.5)
        c.roundRect(40, y - 60, w - 80, 55, 8, fill=0, stroke=1)
        
        c.setFillColor(gold)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(w / 2, y - 22, "★  CHAMPION  ★")
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(w / 2, y - 46, t["winner"])
    
    # Footer
    c.setFillColor(HexColor('#30363D'))
    c.setFont("Helvetica", 7)
    c.drawCentredString(w / 2, 15, f"TACTICAL LINEUP · {t['name']} · Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d')}")
    
    c.save()
    buf.seek(0)
    
    from starlette.responses import StreamingResponse
    filename = f"{t['name'].replace(' ', '_')}_tournament.pdf"
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ---- Health ----

@api_router.get("/health")
async def health_check():
    return {"status": "ok"}


@api_router.post("/tactics/export_pdf")
async def export_tactics_pdf(request: Request, user: dict = Depends(get_current_user)):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.colors import HexColor, white
    from reportlab.pdfgen import canvas
    import io, math

    data = await request.json()
    team_name = data.get("team_name", "Team")
    formation_name = data.get("formation_name", "Formation")
    manager_style = data.get("manager_style", "")
    positions = data.get("positions", [])
    players = data.get("players", {})
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    dark_bg = HexColor('#0F1115')
    pitch_bg = HexColor('#1A1D23')
    red_dot = HexColor('#DC2626')
    green = HexColor('#10B981')
    gray = HexColor('#8B949E')
    light = HexColor('#E0E0E0')
    c.setFillColor(dark_bg)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setFillColor(HexColor('#161B22'))
    c.rect(0, h - 90, w, 90, fill=1, stroke=0)
    c.setStrokeColor(green)
    c.setLineWidth(1.5)
    c.line(20, h - 90, w - 20, h - 90)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(w / 2, h - 40, team_name.upper())
    c.setFillColor(green)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(w / 2, h - 58, formation_name.upper())
    if manager_style:
        c.setFillColor(gray)
        c.setFont("Helvetica", 9)
        c.drawCentredString(w / 2, h - 72, manager_style)
    pitch_top = h - 110
    pitch_bottom = 100
    pitch_height = pitch_top - pitch_bottom
    pitch_cx = w / 2
    pitch_left = 60
    pitch_right = w - 60
    pitch_width = pitch_right - pitch_left
    c.setFillColor(pitch_bg)
    c.roundRect(pitch_left - 10, pitch_bottom - 10, pitch_width + 20, pitch_height + 20, 6, fill=1, stroke=0)
    line_color = HexColor('#FFFFFF')
    def pm(x_pct, y_pct):
        y_norm = y_pct / 100.0
        squeeze = 0.72 + 0.28 * y_norm
        px = pitch_cx + (x_pct / 100.0 - 0.5) * pitch_width * squeeze
        py = pitch_top - (y_pct / 100.0) * pitch_height
        return px, py
    def draw_line(x1, y1, x2, y2, alpha=0.3):
        c.saveState()
        c.setStrokeColor(line_color)
        c.setStrokeAlpha(alpha)
        c.setLineWidth(0.6)
        p1x, p1y = pm(x1, y1)
        p2x, p2y = pm(x2, y2)
        c.line(p1x, p1y, p2x, p2y)
        c.restoreState()
    draw_line(0, 0, 100, 0, 0.4)
    draw_line(100, 0, 100, 100, 0.4)
    draw_line(100, 100, 0, 100, 0.4)
    draw_line(0, 100, 0, 0, 0.4)
    draw_line(0, 50, 100, 50, 0.3)
    for i in range(36):
        a1 = (i / 36) * 2 * math.pi
        a2 = ((i + 1) / 36) * 2 * math.pi
        draw_line(50 + 12 * math.cos(a1), 50 + 8 * math.sin(a1), 50 + 12 * math.cos(a2), 50 + 8 * math.sin(a2), 0.25)
    draw_line(22, 0, 22, 16, 0.3)
    draw_line(78, 0, 78, 16, 0.3)
    draw_line(22, 16, 78, 16, 0.3)
    draw_line(34, 0, 34, 6, 0.3)
    draw_line(66, 0, 66, 6, 0.3)
    draw_line(34, 6, 66, 6, 0.3)
    draw_line(22, 100, 22, 84, 0.35)
    draw_line(78, 100, 78, 84, 0.35)
    draw_line(22, 84, 78, 84, 0.35)
    draw_line(34, 100, 34, 94, 0.35)
    draw_line(66, 100, 66, 94, 0.35)
    draw_line(34, 94, 66, 94, 0.35)
    for i, pos in enumerate(positions):
        idx = str(i)
        px, py = pm(pos["x"], pos["y"])
        player = players.get(idx)
        if player:
            c.setFillColor(red_dot)
            c.circle(px, py, 5, fill=1, stroke=0)
            name = player.get("name", "")
            parts = name.split(" ")
            first = parts[0] if len(parts) > 1 else ""
            last = " ".join(parts[1:]) if len(parts) > 1 else parts[0] if parts else ""
            cap = "(C) " if player.get("is_captain") else ""
            if first:
                c.setFillColor(HexColor('#BBBBBB'))
                c.setFont("Helvetica", 7)
                c.drawCentredString(px, py - 11, f"{cap}{first}")
            c.setFillColor(white)
            c.setFont("Helvetica-Bold", 8.5)
            c.drawCentredString(px, py - (20 if first else 11), f"{'' if first else cap}{last}")
        else:
            c.saveState()
            c.setFillColor(white)
            c.setFillAlpha(0.15)
            c.circle(px, py, 4, fill=1, stroke=0)
            c.restoreState()
            c.setFillColor(gray)
            c.setFont("Helvetica", 6)
            c.drawCentredString(px, py - 9, pos.get("role", ""))
    y_lineup = pitch_bottom - 25
    starters = [(int(k), v) for k, v in players.items() if v]
    starters.sort(key=lambda x: x[0])
    if starters:
        c.setFillColor(green)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(pitch_left, y_lineup, "LINEUP")
        y_lineup -= 14
        cols = 3
        col_w = pitch_width / cols
        for ci, (idx, p) in enumerate(starters):
            col = ci % cols
            row = ci // cols
            cx_pos = pitch_left + col * col_w
            cy_pos = y_lineup - row * 13
            role = positions[idx]["role"] if idx < len(positions) else ""
            cap = " (C)" if p.get("is_captain") else ""
            c.setFillColor(light)
            c.setFont("Helvetica", 7.5)
            c.drawString(cx_pos, cy_pos, f"#{p.get('number', '')} {p.get('name', '')}{cap}")
            c.setFillColor(gray)
            c.setFont("Helvetica", 6)
            c.drawString(cx_pos + col_w - 25, cy_pos, role)
    c.setFillColor(HexColor('#444444'))
    c.setFont("Helvetica", 7)
    c.drawCentredString(w / 2, 20, "TACTICAL LINEUP")
    c.save()
    buf.seek(0)
    from starlette.responses import StreamingResponse
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="{team_name}_lineup.pdf"'})


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
