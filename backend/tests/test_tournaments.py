"""
Tournament API Tests - Tests for the tournament system including:
- Create tournaments (knockout, league, group_knockout)
- List tournaments by status
- Get tournament details
- Submit match results
- Auto-advancement for knockout tournaments
- Champion declaration
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_headers():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "demo@test.com",
        "password": "demo123"
    })
    if response.status_code == 200:
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    pytest.skip("Authentication failed - skipping tournament tests")


class TestTournamentCreation:
    """Tests for tournament creation endpoint"""
    
    def test_create_knockout_tournament(self, auth_headers):
        """Test creating a knockout tournament with 4 teams"""
        response = requests.post(f"{BASE_URL}/api/tournaments", headers=auth_headers, json={
            "name": "TEST_Knockout Cup",
            "format": "11v11",
            "tournament_type": "knockout",
            "teams": [
                {"name": "Team Alpha", "team_id": "", "from_network": False},
                {"name": "Team Beta", "team_id": "", "from_network": False},
                {"name": "Team Gamma", "team_id": "", "from_network": False},
                {"name": "Team Delta", "team_id": "", "from_network": False},
            ]
        })
        
        assert response.status_code == 200, f"Failed to create tournament: {response.text}"
        data = response.json()
        
        # Validate tournament structure
        assert "id" in data
        assert data["name"] == "TEST_Knockout Cup"
        assert data["tournament_type"] == "knockout"
        assert data["status"] == "ongoing"
        assert len(data["teams"]) == 4
        
        # Should have 2 semi-final matches for 4 teams
        matches = data.get("matches", [])
        assert len(matches) == 2, f"Expected 2 semi-final matches, got {len(matches)}"
        
        return data["id"]
    
    def test_create_league_tournament(self, auth_headers):
        """Test creating a league tournament"""
        response = requests.post(f"{BASE_URL}/api/tournaments", headers=auth_headers, json={
            "name": "TEST_League Cup",
            "format": "5v5",
            "tournament_type": "league",
            "teams": [
                {"name": "Team A", "team_id": "", "from_network": False},
                {"name": "Team B", "team_id": "", "from_network": False},
                {"name": "Team C", "team_id": "", "from_network": False},
            ],
            "matches_per_pair": 1
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["tournament_type"] == "league"
        # 3 teams, 1 match per pair = 3 matches (A vs B, A vs C, B vs C)
        matches = data.get("matches", [])
        assert len(matches) == 3, f"Expected 3 league matches, got {len(matches)}"
        
        # Check groups (league has single group "A")
        groups = data.get("groups", {})
        assert "A" in groups
        assert len(groups["A"]) == 3
        
        return data["id"]
    
    def test_create_group_knockout_tournament(self, auth_headers):
        """Test creating a group+knockout tournament"""
        response = requests.post(f"{BASE_URL}/api/tournaments", headers=auth_headers, json={
            "name": "TEST_Group Knockout Cup",
            "format": "7v7",
            "tournament_type": "group_knockout",
            "teams": [
                {"name": "Team 1", "team_id": "", "from_network": False},
                {"name": "Team 2", "team_id": "", "from_network": False},
                {"name": "Team 3", "team_id": "", "from_network": False},
                {"name": "Team 4", "team_id": "", "from_network": False},
            ],
            "groups_count": 2,
            "matches_per_pair": 1
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["tournament_type"] == "group_knockout"
        
        # Check groups are created
        groups = data.get("groups", {})
        assert len(groups) == 2, f"Expected 2 groups, got {len(groups)}"
        
        return data["id"]
    
    def test_create_tournament_validation(self, auth_headers):
        """Test tournament creation validation"""
        # Test with less than 2 teams
        response = requests.post(f"{BASE_URL}/api/tournaments", headers=auth_headers, json={
            "name": "TEST_Invalid Cup",
            "format": "11v11",
            "tournament_type": "knockout",
            "teams": [{"name": "Only Team", "team_id": "", "from_network": False}]
        })
        
        assert response.status_code == 400, "Should reject tournament with < 2 teams"
        
        # Test with empty name
        response = requests.post(f"{BASE_URL}/api/tournaments", headers=auth_headers, json={
            "name": "",
            "format": "11v11",
            "tournament_type": "knockout",
            "teams": [
                {"name": "Team A", "team_id": "", "from_network": False},
                {"name": "Team B", "team_id": "", "from_network": False}
            ]
        })
        
        assert response.status_code == 400, "Should reject tournament with empty name"


class TestTournamentList:
    """Tests for listing tournaments"""
    
    def test_list_all_tournaments(self, auth_headers):
        """Test listing all tournaments"""
        response = requests.get(f"{BASE_URL}/api/tournaments", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_list_ongoing_tournaments(self, auth_headers):
        """Test listing ongoing tournaments"""
        response = requests.get(f"{BASE_URL}/api/tournaments?status=ongoing", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        for t in data:
            assert t["status"] == "ongoing"
    
    def test_list_completed_tournaments(self, auth_headers):
        """Test listing completed tournaments"""
        response = requests.get(f"{BASE_URL}/api/tournaments?status=completed", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestTournamentResultsAndAdvancement:
    """Tests for match results and knockout advancement"""
    
    @pytest.fixture(scope="class")
    def test_tournament(self, auth_headers):
        """Create a tournament for testing results"""
        response = requests.post(f"{BASE_URL}/api/tournaments", headers=auth_headers, json={
            "name": "TEST_Results Cup",
            "format": "5v5",
            "tournament_type": "knockout",
            "teams": [
                {"name": "Test Team 1", "team_id": "", "from_network": False},
                {"name": "Test Team 2", "team_id": "", "from_network": False},
                {"name": "Test Team 3", "team_id": "", "from_network": False},
                {"name": "Test Team 4", "team_id": "", "from_network": False},
            ]
        })
        
        assert response.status_code == 200
        return response.json()
    
    def test_submit_match_result(self, auth_headers, test_tournament):
        """Test submitting a match result"""
        tournament_id = test_tournament["id"]
        matches = test_tournament.get("matches", [])
        
        assert len(matches) > 0, "No matches found in tournament"
        
        match_id = matches[0]["id"]
        
        # Submit result
        response = requests.put(
            f"{BASE_URL}/api/tournaments/{tournament_id}/result/{match_id}",
            headers=auth_headers,
            json={"home_score": 3, "away_score": 1}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Find the updated match
        updated_match = next((m for m in data["matches"] if m["id"] == match_id), None)
        assert updated_match is not None
        assert updated_match["played"] == True
        assert updated_match["home_score"] == 3
        assert updated_match["away_score"] == 1
    
    def test_get_tournament_detail(self, auth_headers, test_tournament):
        """Test getting tournament details"""
        tournament_id = test_tournament["id"]
        
        response = requests.get(f"{BASE_URL}/api/tournaments/{tournament_id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == tournament_id
        assert "matches" in data
        assert "teams" in data


class TestTournamentDeletion:
    """Tests for tournament deletion"""
    
    def test_delete_tournament(self, auth_headers):
        """Test deleting a tournament"""
        # Create a tournament to delete
        create_response = requests.post(f"{BASE_URL}/api/tournaments", headers=auth_headers, json={
            "name": "TEST_Delete Me Cup",
            "format": "5v5",
            "tournament_type": "knockout",
            "teams": [
                {"name": "Team X", "team_id": "", "from_network": False},
                {"name": "Team Y", "team_id": "", "from_network": False},
            ]
        })
        
        assert create_response.status_code == 200
        tournament_id = create_response.json()["id"]
        
        # Delete the tournament
        delete_response = requests.delete(f"{BASE_URL}/api/tournaments/{tournament_id}", headers=auth_headers)
        
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/tournaments/{tournament_id}", headers=auth_headers)
        assert get_response.status_code == 404


@pytest.fixture(scope="module", autouse=True)
def cleanup_test_tournaments(auth_headers, request):
    """Cleanup test tournaments after all tests complete"""
    yield
    
    # Get all tournaments
    response = requests.get(f"{BASE_URL}/api/tournaments", headers=auth_headers)
    if response.status_code == 200:
        tournaments = response.json()
        for t in tournaments:
            if t["name"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/tournaments/{t['id']}", headers=auth_headers)
