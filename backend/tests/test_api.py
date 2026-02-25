"""
Comprehensive API tests for Football/Futsal Coaching App
Tests: Teams CRUD, Matches CRUD, Player Notes
"""
import pytest
import requests
import os
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load frontend .env to get backend URL
frontend_env = Path(__file__).parent.parent.parent / 'frontend' / '.env'
load_dotenv(frontend_env)

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL')

if not BASE_URL:
    pytest.skip("EXPO_PUBLIC_BACKEND_URL not set", allow_module_level=True)

BASE_URL = BASE_URL.rstrip('/')


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def test_team(api_client):
    """Create a test team and cleanup after test"""
    team_data = {
        "name": "TEST_FC_United",
        "sport": "football",
        "format": "11v11",
        "players": [
            {
                "id": "test-player-1",
                "name": "Test Player 1",
                "number": 1,
                "position": "GK",
                "is_captain": False,
                "is_starter": True,
                "set_piece_roles": []
            },
            {
                "id": "test-player-2",
                "name": "Test Player 2",
                "number": 10,
                "position": "CAM",
                "is_captain": True,
                "is_starter": True,
                "set_piece_roles": ["Corners", "Free Kicks"]
            }
        ],
        "formation": "4-4-2",
        "tactic_name": "Ferguson's 4-4-2"
    }
    
    response = api_client.post(f"{BASE_URL}/api/teams", json=team_data)
    team = response.json()
    
    yield team
    
    # Cleanup
    try:
        api_client.delete(f"{BASE_URL}/api/teams/{team['id']}")
    except:
        pass


@pytest.fixture
def test_match(api_client, test_team):
    """Create a test match and cleanup after test"""
    match_data = {
        "team_id": test_team["id"],
        "opponent": "TEST_Rival FC",
        "formation": "4-4-2",
        "tactic_name": "Ferguson's 4-4-2",
        "duration_minutes": 90,
        "starters": ["test-player-1", "test-player-2"],
        "subs": [],
        "sub_mode": "manual",
        "sub_plan": []
    }
    
    response = api_client.post(f"{BASE_URL}/api/matches", json=match_data)
    match = response.json()
    
    yield match
    
    # Cleanup
    try:
        api_client.delete(f"{BASE_URL}/api/matches/{match['id']}")
    except:
        pass


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self, api_client):
        """Test health check returns 200"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"


class TestTeamsCRUD:
    """Team CRUD operations tests"""
    
    def test_create_team_success(self, api_client):
        """Test creating a team with valid data"""
        team_data = {
            "name": "TEST_Manchester FC",
            "sport": "football",
            "format": "11v11",
            "players": [
                {
                    "id": "p1",
                    "name": "Player One",
                    "number": 1,
                    "position": "GK",
                    "is_captain": False,
                    "is_starter": True,
                    "set_piece_roles": []
                }
            ],
            "formation": "4-3-3",
            "tactic_name": "Guardiola's 4-3-3"
        }
        
        response = api_client.post(f"{BASE_URL}/api/teams", json=team_data)
        assert response.status_code == 200
        
        team = response.json()
        assert team["name"] == "TEST_Manchester FC"
        assert team["sport"] == "football"
        assert team["format"] == "11v11"
        assert "id" in team
        assert "created_at" in team
        assert "updated_at" in team
        assert len(team["players"]) == 1
        assert team["players"][0]["name"] == "Player One"
        
        # Verify persistence with GET
        get_response = api_client.get(f"{BASE_URL}/api/teams/{team['id']}")
        assert get_response.status_code == 200
        retrieved = get_response.json()
        assert retrieved["name"] == team_data["name"]
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/teams/{team['id']}")
    
    def test_create_futsal_team(self, api_client):
        """Test creating a futsal team"""
        team_data = {
            "name": "TEST_Futsal Warriors",
            "sport": "futsal",
            "format": "5v5",
            "players": [],
            "formation": "1-2-1",
            "tactic_name": "Diamond"
        }
        
        response = api_client.post(f"{BASE_URL}/api/teams", json=team_data)
        assert response.status_code == 200
        
        team = response.json()
        assert team["sport"] == "futsal"
        assert team["format"] == "5v5"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/teams/{team['id']}")
    
    def test_get_all_teams(self, api_client, test_team):
        """Test retrieving all teams"""
        response = api_client.get(f"{BASE_URL}/api/teams")
        assert response.status_code == 200
        
        teams = response.json()
        assert isinstance(teams, list)
        
        # Our test team should be in the list
        team_ids = [t["id"] for t in teams]
        assert test_team["id"] in team_ids
    
    def test_get_teams_by_sport(self, api_client, test_team):
        """Test filtering teams by sport"""
        response = api_client.get(f"{BASE_URL}/api/teams?sport=football")
        assert response.status_code == 200
        
        teams = response.json()
        assert isinstance(teams, list)
        
        # All teams should be football
        for team in teams:
            assert team["sport"] == "football"
    
    def test_get_team_by_id(self, api_client, test_team):
        """Test retrieving a specific team"""
        response = api_client.get(f"{BASE_URL}/api/teams/{test_team['id']}")
        assert response.status_code == 200
        
        team = response.json()
        assert team["id"] == test_team["id"]
        assert team["name"] == test_team["name"]
        assert len(team["players"]) == 2
    
    def test_get_team_not_found(self, api_client):
        """Test getting non-existent team returns 404"""
        response = api_client.get(f"{BASE_URL}/api/teams/nonexistent-id-12345")
        assert response.status_code == 404
    
    def test_update_team(self, api_client, test_team):
        """Test updating a team"""
        update_data = {
            "name": "TEST_Updated Team Name",
            "sport": test_team["sport"],
            "format": test_team["format"],
            "players": test_team["players"],
            "formation": "4-2-3-1",
            "tactic_name": "Mourinho's 4-2-3-1"
        }
        
        response = api_client.put(f"{BASE_URL}/api/teams/{test_team['id']}", json=update_data)
        assert response.status_code == 200
        
        updated = response.json()
        assert updated["name"] == "TEST_Updated Team Name"
        assert updated["formation"] == "4-2-3-1"
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/teams/{test_team['id']}")
        retrieved = get_response.json()
        assert retrieved["name"] == "TEST_Updated Team Name"
    
    def test_update_nonexistent_team(self, api_client):
        """Test updating non-existent team returns 404"""
        update_data = {
            "name": "TEST_Ghost Team",
            "sport": "football",
            "format": "11v11",
            "players": [],
            "formation": "",
            "tactic_name": ""
        }
        
        response = api_client.put(f"{BASE_URL}/api/teams/nonexistent-id", json=update_data)
        assert response.status_code == 404
    
    def test_delete_team(self, api_client):
        """Test deleting a team"""
        # Create a team to delete
        team_data = {
            "name": "TEST_Team To Delete",
            "sport": "football",
            "format": "7v7",
            "players": [],
            "formation": "",
            "tactic_name": ""
        }
        create_response = api_client.post(f"{BASE_URL}/api/teams", json=team_data)
        team = create_response.json()
        
        # Delete it
        delete_response = api_client.delete(f"{BASE_URL}/api/teams/{team['id']}")
        assert delete_response.status_code == 200
        
        data = delete_response.json()
        assert "message" in data
        
        # Verify it's gone
        get_response = api_client.get(f"{BASE_URL}/api/teams/{team['id']}")
        assert get_response.status_code == 404
    
    def test_delete_nonexistent_team(self, api_client):
        """Test deleting non-existent team returns 404"""
        response = api_client.delete(f"{BASE_URL}/api/teams/nonexistent-id")
        assert response.status_code == 404


class TestMatchesCRUD:
    """Match CRUD operations tests"""
    
    def test_create_match(self, api_client, test_team):
        """Test creating a match"""
        match_data = {
            "team_id": test_team["id"],
            "opponent": "TEST_Arsenal",
            "formation": "4-3-3",
            "tactic_name": "Attacking",
            "duration_minutes": 90,
            "starters": ["test-player-1"],
            "subs": ["test-player-2"],
            "sub_mode": "auto",
            "sub_plan": [
                {
                    "minute": 45,
                    "player_out_id": "test-player-1",
                    "player_in_id": "test-player-2",
                    "player_out_name": "Test Player 1",
                    "player_in_name": "Test Player 2"
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/matches", json=match_data)
        assert response.status_code == 200
        
        match = response.json()
        assert match["team_id"] == test_team["id"]
        assert match["opponent"] == "TEST_Arsenal"
        assert match["duration_minutes"] == 90
        assert match["status"] == "planned"
        assert "id" in match
        assert "created_at" in match
        assert "events" in match
        assert "player_notes" in match
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/matches/{match['id']}")
        assert get_response.status_code == 200
        retrieved = get_response.json()
        assert retrieved["opponent"] == "TEST_Arsenal"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/matches/{match['id']}")
    
    def test_get_all_matches(self, api_client, test_match):
        """Test retrieving all matches"""
        response = api_client.get(f"{BASE_URL}/api/matches")
        assert response.status_code == 200
        
        matches = response.json()
        assert isinstance(matches, list)
        
        # Our test match should be in the list
        match_ids = [m["id"] for m in matches]
        assert test_match["id"] in match_ids
    
    def test_get_matches_by_team(self, api_client, test_match, test_team):
        """Test filtering matches by team_id"""
        response = api_client.get(f"{BASE_URL}/api/matches?team_id={test_team['id']}")
        assert response.status_code == 200
        
        matches = response.json()
        assert isinstance(matches, list)
        
        # All matches should belong to the test team
        for match in matches:
            assert match["team_id"] == test_team["id"]
    
    def test_get_match_by_id(self, api_client, test_match):
        """Test retrieving a specific match"""
        response = api_client.get(f"{BASE_URL}/api/matches/{test_match['id']}")
        assert response.status_code == 200
        
        match = response.json()
        assert match["id"] == test_match["id"]
        assert match["opponent"] == test_match["opponent"]
    
    def test_get_match_not_found(self, api_client):
        """Test getting non-existent match returns 404"""
        response = api_client.get(f"{BASE_URL}/api/matches/nonexistent-match-id")
        assert response.status_code == 404
    
    def test_update_match_status(self, api_client, test_match):
        """Test updating match status"""
        update_data = {"status": "completed"}
        
        response = api_client.put(f"{BASE_URL}/api/matches/{test_match['id']}", json=update_data)
        assert response.status_code == 200
        
        updated = response.json()
        assert updated["status"] == "completed"
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/matches/{test_match['id']}")
        retrieved = get_response.json()
        assert retrieved["status"] == "completed"
    
    def test_update_match_events(self, api_client, test_match):
        """Test adding events to a match"""
        update_data = {
            "events": [
                {
                    "type": "goal",
                    "minute": 23,
                    "player_id": "test-player-2",
                    "detail": "Header from corner"
                },
                {
                    "type": "substitution",
                    "minute": 60,
                    "player_out_id": "test-player-1",
                    "player_in_id": "test-player-2",
                    "detail": "Tactical change"
                }
            ]
        }
        
        response = api_client.put(f"{BASE_URL}/api/matches/{test_match['id']}", json=update_data)
        assert response.status_code == 200
        
        updated = response.json()
        assert len(updated["events"]) == 2
        assert updated["events"][0]["type"] == "goal"
    
    def test_update_match_no_data(self, api_client, test_match):
        """Test updating with no data returns 400"""
        response = api_client.put(f"{BASE_URL}/api/matches/{test_match['id']}", json={})
        assert response.status_code == 400
    
    def test_update_nonexistent_match(self, api_client):
        """Test updating non-existent match returns 404"""
        update_data = {"status": "completed"}
        
        response = api_client.put(f"{BASE_URL}/api/matches/nonexistent-id", json=update_data)
        assert response.status_code == 404
    
    def test_delete_match(self, api_client, test_team):
        """Test deleting a match"""
        # Create a match to delete
        match_data = {
            "team_id": test_team["id"],
            "opponent": "TEST_To Delete",
            "duration_minutes": 90,
            "starters": [],
            "subs": [],
            "sub_mode": "manual",
            "sub_plan": []
        }
        create_response = api_client.post(f"{BASE_URL}/api/matches", json=match_data)
        match = create_response.json()
        
        # Delete it
        delete_response = api_client.delete(f"{BASE_URL}/api/matches/{match['id']}")
        assert delete_response.status_code == 200
        
        # Verify it's gone
        get_response = api_client.get(f"{BASE_URL}/api/matches/{match['id']}")
        assert get_response.status_code == 404
    
    def test_delete_nonexistent_match(self, api_client):
        """Test deleting non-existent match returns 404"""
        response = api_client.delete(f"{BASE_URL}/api/matches/nonexistent-id")
        assert response.status_code == 404


class TestPlayerNotes:
    """Player notes tests"""
    
    def test_add_player_note(self, api_client, test_match):
        """Test adding a note to a match"""
        note_data = {
            "player_id": "test-player-2",
            "player_name": "Test Player 2",
            "note": "Excellent performance, scored a hat-trick",
            "rating": 9
        }
        
        response = api_client.post(f"{BASE_URL}/api/matches/{test_match['id']}/notes", json=note_data)
        assert response.status_code == 200
        
        note = response.json()
        assert note["player_id"] == "test-player-2"
        assert note["note"] == "Excellent performance, scored a hat-trick"
        assert note["rating"] == 9
        
        # Verify note was added to match
        match_response = api_client.get(f"{BASE_URL}/api/matches/{test_match['id']}")
        match = match_response.json()
        assert len(match["player_notes"]) == 1
        assert match["player_notes"][0]["player_id"] == "test-player-2"
    
    def test_add_note_to_nonexistent_match(self, api_client):
        """Test adding note to non-existent match returns 404"""
        note_data = {
            "player_id": "p1",
            "player_name": "Player",
            "note": "Good",
            "rating": 7
        }
        
        response = api_client.post(f"{BASE_URL}/api/matches/nonexistent-id/notes", json=note_data)
        assert response.status_code == 404
    
    def test_get_player_notes(self, api_client, test_match):
        """Test retrieving all notes for a player"""
        # Add multiple notes
        notes = [
            {
                "player_id": "test-player-1",
                "player_name": "Test Player 1",
                "note": "Solid defensive display",
                "rating": 7
            },
            {
                "player_id": "test-player-1",
                "player_name": "Test Player 1",
                "note": "Made crucial saves",
                "rating": 8
            }
        ]
        
        for note in notes:
            api_client.post(f"{BASE_URL}/api/matches/{test_match['id']}/notes", json=note)
        
        # Get all notes for the player
        response = api_client.get(f"{BASE_URL}/api/players/test-player-1/notes")
        assert response.status_code == 200
        
        player_notes = response.json()
        assert isinstance(player_notes, list)
        assert len(player_notes) >= 2
        
        # Check notes contain expected data
        for note in player_notes:
            if note.get("match_id") == test_match["id"]:
                assert note["player_id"] == "test-player-1"
                assert "note" in note
                assert "rating" in note
                assert "match_id" in note
    
    def test_get_notes_for_nonexistent_player(self, api_client):
        """Test getting notes for player with no notes returns empty list"""
        response = api_client.get(f"{BASE_URL}/api/players/nonexistent-player-999/notes")
        assert response.status_code == 200
        
        notes = response.json()
        assert isinstance(notes, list)
        assert len(notes) == 0


class TestPlayerStats:
    """Player stats endpoint tests - GET /api/teams/{team_id}/player-stats"""
    
    def test_get_player_stats_success(self, api_client, test_team, test_match):
        """Test getting player stats returns match counts"""
        # First complete the match so it counts in stats
        update_data = {"status": "completed"}
        api_client.put(f"{BASE_URL}/api/matches/{test_match['id']}", json=update_data)
        
        response = api_client.get(f"{BASE_URL}/api/teams/{test_team['id']}/player-stats")
        assert response.status_code == 200
        
        stats = response.json()
        assert isinstance(stats, dict)
        # Player stats should include starters from completed matches
        for player_id in stats:
            assert isinstance(stats[player_id], int)
    
    def test_get_player_stats_empty_team(self, api_client):
        """Test getting player stats for team with no completed matches"""
        # Create a fresh team
        team_data = {
            "name": "TEST_Empty Stats Team",
            "sport": "football",
            "format": "11v11",
            "players": [],
            "formation": "",
            "tactic_name": ""
        }
        response = api_client.post(f"{BASE_URL}/api/teams", json=team_data)
        team = response.json()
        
        # Get stats (should be empty since no completed matches)
        stats_response = api_client.get(f"{BASE_URL}/api/teams/{team['id']}/player-stats")
        assert stats_response.status_code == 200
        
        stats = stats_response.json()
        assert isinstance(stats, dict)
        assert len(stats) == 0
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/teams/{team['id']}")


class TestPlayerAvailability:
    """Tests for player 'available' field in team operations"""
    
    def test_create_team_with_available_players(self, api_client):
        """Test creating a team with players that have available field"""
        team_data = {
            "name": "TEST_Available Players Team",
            "sport": "football",
            "format": "11v11",
            "players": [
                {
                    "id": "avail-player-1",
                    "name": "Available Player",
                    "number": 1,
                    "position": "GK",
                    "is_captain": False,
                    "is_starter": True,
                    "available": True,
                    "set_piece_roles": []
                },
                {
                    "id": "unavail-player-2",
                    "name": "Unavailable Player",
                    "number": 2,
                    "position": "CB",
                    "is_captain": False,
                    "is_starter": False,
                    "available": False,
                    "set_piece_roles": []
                }
            ],
            "formation": "4-3-3",
            "tactic_name": "Test"
        }
        
        response = api_client.post(f"{BASE_URL}/api/teams", json=team_data)
        assert response.status_code == 200
        
        team = response.json()
        assert len(team["players"]) == 2
        
        # Find players and verify availability
        available_player = next((p for p in team["players"] if p["id"] == "avail-player-1"), None)
        unavailable_player = next((p for p in team["players"] if p["id"] == "unavail-player-2"), None)
        
        assert available_player is not None
        assert available_player.get("available", True) == True
        
        assert unavailable_player is not None
        assert unavailable_player.get("available", True) == False
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/teams/{team['id']}")
    
    def test_update_player_availability(self, api_client, test_team):
        """Test updating player availability"""
        # Get current players
        initial_players = test_team["players"]
        
        # Update first player to unavailable
        updated_players = []
        for p in initial_players:
            updated_player = {**p}
            if p["id"] == "test-player-1":
                updated_player["available"] = False
            else:
                updated_player["available"] = True
            updated_players.append(updated_player)
        
        update_data = {
            "name": test_team["name"],
            "sport": test_team["sport"],
            "format": test_team["format"],
            "players": updated_players,
            "formation": test_team["formation"],
            "tactic_name": test_team["tactic_name"]
        }
        
        response = api_client.put(f"{BASE_URL}/api/teams/{test_team['id']}", json=update_data)
        assert response.status_code == 200
        
        updated = response.json()
        
        # Verify changes persisted
        unavailable_player = next((p for p in updated["players"] if p["id"] == "test-player-1"), None)
        assert unavailable_player is not None
        assert unavailable_player.get("available", True) == False


class TestEdgeCases:
    """Edge cases and validation tests"""
    
    def test_team_with_many_players(self, api_client):
        """Test creating team with full 11v11 squad"""
        players = []
        for i in range(18):  # 11 starters + 7 subs
            players.append({
                "id": f"player-{i}",
                "name": f"Player {i}",
                "number": i + 1,
                "position": "MID",
                "is_captain": i == 0,
                "is_starter": i < 11,
                "set_piece_roles": []
            })
        
        team_data = {
            "name": "TEST_Full Squad",
            "sport": "football",
            "format": "11v11",
            "players": players,
            "formation": "4-4-2",
            "tactic_name": "Standard"
        }
        
        response = api_client.post(f"{BASE_URL}/api/teams", json=team_data)
        assert response.status_code == 200
        
        team = response.json()
        assert len(team["players"]) == 18
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/teams/{team['id']}")
    
    def test_match_with_90_min_duration(self, api_client, test_team):
        """Test match with standard 90-minute duration"""
        match_data = {
            "team_id": test_team["id"],
            "opponent": "TEST_Standard Match",
            "duration_minutes": 90,
            "starters": [],
            "subs": [],
            "sub_mode": "manual",
            "sub_plan": []
        }
        
        response = api_client.post(f"{BASE_URL}/api/matches", json=match_data)
        assert response.status_code == 200
        
        match = response.json()
        assert match["duration_minutes"] == 90
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/matches/{match['id']}")
    
    def test_match_with_custom_duration(self, api_client, test_team):
        """Test match with custom duration (youth format)"""
        match_data = {
            "team_id": test_team["id"],
            "opponent": "TEST_Youth Match",
            "duration_minutes": 60,
            "starters": [],
            "subs": [],
            "sub_mode": "manual",
            "sub_plan": []
        }
        
        response = api_client.post(f"{BASE_URL}/api/matches", json=match_data)
        assert response.status_code == 200
        
        match = response.json()
        assert match["duration_minutes"] == 60
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/matches/{match['id']}")
