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

JWT_SECRET = os.environ.get('JWT_SECRET', 'tactical-lineup-secret-key-2026')
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


# ---- Health ----

@api_router.get("/health")
async def health_check():
    return {"status": "ok"}


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
