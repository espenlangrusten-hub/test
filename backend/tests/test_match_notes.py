"""
Backend tests for Match Detail feature - General Match Notes
Tests: Adding and retrieving general match notes (player_id='match_general')
"""
import pytest
import requests
import os
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
        "name": "TEST_Match_Notes_FC",
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
                "set_piece_roles": []
            }
        ],
        "formation": "4-4-2",
        "tactic_name": "Test Tactics"
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
        "opponent": "TEST_Opponent FC",
        "formation": "4-4-2",
        "tactic_name": "Test Tactics",
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


class TestGeneralMatchNotes:
    """General match notes tests (player_id='match_general')"""
    
    def test_add_general_match_note(self, api_client, test_match):
        """Test adding a general match note with player_id='match_general'"""
        note_data = {
            "player_id": "match_general",
            "player_name": "Match Note",
            "note": "Team showed great defensive organization in second half",
            "rating": 0
        }
        
        response = api_client.post(f"{BASE_URL}/api/matches/{test_match['id']}/notes", json=note_data)
        assert response.status_code == 200
        
        note = response.json()
        assert note["player_id"] == "match_general"
        assert note["player_name"] == "Match Note"
        assert note["note"] == "Team showed great defensive organization in second half"
        assert note["rating"] == 0
        assert "created_at" in note
        
        # Verify note was added to match by retrieving match
        match_response = api_client.get(f"{BASE_URL}/api/matches/{test_match['id']}")
        assert match_response.status_code == 200
        
        match = match_response.json()
        assert "player_notes" in match
        assert len(match["player_notes"]) == 1
        assert match["player_notes"][0]["player_id"] == "match_general"
        assert match["player_notes"][0]["note"] == "Team showed great defensive organization in second half"
    
    def test_add_multiple_general_match_notes(self, api_client, test_match):
        """Test adding multiple general match notes"""
        notes = [
            {
                "player_id": "match_general",
                "player_name": "Match Note",
                "note": "First half: struggled with high press",
                "rating": 0
            },
            {
                "player_id": "match_general",
                "player_name": "Match Note",
                "note": "Second half: controlled midfield well",
                "rating": 0
            },
            {
                "player_id": "match_general",
                "player_name": "Match Note",
                "note": "Set pieces were effective today",
                "rating": 0
            }
        ]
        
        for note in notes:
            response = api_client.post(f"{BASE_URL}/api/matches/{test_match['id']}/notes", json=note)
            assert response.status_code == 200
        
        # Verify all notes were added
        match_response = api_client.get(f"{BASE_URL}/api/matches/{test_match['id']}")
        match = match_response.json()
        
        general_notes = [n for n in match["player_notes"] if n["player_id"] == "match_general"]
        assert len(general_notes) == 3
        
        # Verify notes content
        note_texts = [n["note"] for n in general_notes]
        assert "First half: struggled with high press" in note_texts
        assert "Second half: controlled midfield well" in note_texts
        assert "Set pieces were effective today" in note_texts
    
    def test_mix_general_and_player_notes(self, api_client, test_match):
        """Test adding both general match notes and player-specific notes"""
        # Add general match note
        general_note = {
            "player_id": "match_general",
            "player_name": "Match Note",
            "note": "Overall tactical approach was excellent",
            "rating": 0
        }
        response = api_client.post(f"{BASE_URL}/api/matches/{test_match['id']}/notes", json=general_note)
        assert response.status_code == 200
        
        # Add player-specific notes
        player_notes = [
            {
                "player_id": "test-player-1",
                "player_name": "Test Player 1",
                "note": "Made 3 crucial saves",
                "rating": 8
            },
            {
                "player_id": "test-player-2",
                "player_name": "Test Player 2",
                "note": "Scored a brace, MOTM performance",
                "rating": 9
            }
        ]
        
        for note in player_notes:
            response = api_client.post(f"{BASE_URL}/api/matches/{test_match['id']}/notes", json=note)
            assert response.status_code == 200
        
        # Verify all notes are present and correctly categorized
        match_response = api_client.get(f"{BASE_URL}/api/matches/{test_match['id']}")
        match = match_response.json()
        
        all_notes = match["player_notes"]
        assert len(all_notes) == 3
        
        # Verify general notes
        general_notes = [n for n in all_notes if n["player_id"] == "match_general"]
        assert len(general_notes) == 1
        assert general_notes[0]["rating"] == 0
        assert "tactical approach" in general_notes[0]["note"]
        
        # Verify player-specific notes
        player_specific_notes = [n for n in all_notes if n["player_id"] != "match_general"]
        assert len(player_specific_notes) == 2
        
        # Check player 1 note
        p1_notes = [n for n in player_specific_notes if n["player_id"] == "test-player-1"]
        assert len(p1_notes) == 1
        assert p1_notes[0]["rating"] == 8
        
        # Check player 2 note
        p2_notes = [n for n in player_specific_notes if n["player_id"] == "test-player-2"]
        assert len(p2_notes) == 1
        assert p2_notes[0]["rating"] == 9
    
    def test_general_note_created_at_timestamp(self, api_client, test_match):
        """Test that general match notes have proper created_at timestamp"""
        note_data = {
            "player_id": "match_general",
            "player_name": "Match Note",
            "note": "Testing timestamp",
            "rating": 0
        }
        
        response = api_client.post(f"{BASE_URL}/api/matches/{test_match['id']}/notes", json=note_data)
        assert response.status_code == 200
        
        note = response.json()
        assert "created_at" in note
        
        # Verify timestamp is ISO format (should contain 'T' and not be empty)
        created_at = note["created_at"]
        assert "T" in created_at or "-" in created_at  # ISO 8601 format check
        assert len(created_at) > 10  # Should be a proper timestamp, not empty
    
    def test_get_match_with_player_notes_structure(self, api_client, test_match):
        """Test that GET /api/matches/{id} returns proper structure with player_notes array"""
        # Add a general note first
        note_data = {
            "player_id": "match_general",
            "player_name": "Match Note",
            "note": "Test note for structure verification",
            "rating": 0
        }
        api_client.post(f"{BASE_URL}/api/matches/{test_match['id']}/notes", json=note_data)
        
        # Get match and verify structure
        response = api_client.get(f"{BASE_URL}/api/matches/{test_match['id']}")
        assert response.status_code == 200
        
        match = response.json()
        
        # Verify essential match fields
        assert "id" in match
        assert "opponent" in match
        assert "formation" in match
        assert "duration_minutes" in match
        assert "status" in match
        assert "created_at" in match
        
        # Verify player_notes field exists and is array
        assert "player_notes" in match
        assert isinstance(match["player_notes"], list)
        
        # Verify note structure
        if len(match["player_notes"]) > 0:
            note = match["player_notes"][0]
            assert "player_id" in note
            assert "player_name" in note
            assert "note" in note
            assert "rating" in note
            assert "created_at" in note
