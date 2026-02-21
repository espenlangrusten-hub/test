from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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
    players: List[Player] = []
    formation: str = ""
    tactic_name: str = ""

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


# ---- Team Endpoints (scoped to user) ----

@api_router.post("/teams")
async def create_team(team: TeamCreate, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        **team.dict(),
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
        {"_id": 0, "starters": 1, "subs": 1, "starting_lineup": 1, "events": 1}
    ).to_list(500)
    stats = {}
    for match in matches:
        all_ids = set(match.get("starters", []))
        for ev in match.get("events", []):
            pid = ev.get("player_in_id")
            if pid:
                all_ids.add(pid)
        for pid in all_ids:
            stats[pid] = stats.get(pid, 0) + 1
    return stats


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
