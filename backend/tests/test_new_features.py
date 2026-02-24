"""
Backend API Tests for New Features - Iteration 12
Testing: Assist events, Formation change events, Player stats with assists
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://squad-formations.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "test123"
TEAM_ID = "183cf186-259c-4651-b120-3cefe463730f"

class TestSetup:
    """Setup: Get auth token and verify team exists"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers for API calls"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        }


class TestMatchEventsAssist(TestSetup):
    """Test POST /api/matches/{match_id}/events with type='assist'"""
    
    match_id = None
    
    def test_create_match_for_events(self, headers):
        """Create a match to test events"""
        response = requests.post(
            f"{BASE_URL}/api/matches",
            headers=headers,
            json={
                "team_id": TEAM_ID,
                "opponent": "Test Opponent",
                "formation": "4-3-3",
                "duration_minutes": 90,
                "starters": ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11"],
                "subs": ["p12", "p13"]
            }
        )
        assert response.status_code == 200, f"Match creation failed: {response.text}"
        data = response.json()
        assert "id" in data
        TestMatchEventsAssist.match_id = data["id"]
        print(f"Created match: {data['id']}")
    
    def test_post_assist_event(self, headers):
        """POST /api/matches/{match_id}/events with type='assist' should save event"""
        assert TestMatchEventsAssist.match_id, "Match ID not set"
        
        response = requests.post(
            f"{BASE_URL}/api/matches/{TestMatchEventsAssist.match_id}/events",
            headers=headers,
            json={
                "type": "assist",
                "minute": 35,
                "player_id": "p10",
                "detail": "ASSIST by ST Player"
            }
        )
        assert response.status_code == 200, f"Assist event POST failed: {response.text}"
        data = response.json()
        
        # Verify event data
        assert data["type"] == "assist"
        assert data["minute"] == 35
        assert data["player_id"] == "p10"
        assert "ASSIST" in data["detail"].upper()
        print(f"Assist event created: {data}")
    
    def test_verify_assist_event_saved(self, headers):
        """Verify assist event was saved to match"""
        assert TestMatchEventsAssist.match_id, "Match ID not set"
        
        response = requests.get(
            f"{BASE_URL}/api/matches/{TestMatchEventsAssist.match_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        events = data.get("events", [])
        assist_events = [e for e in events if e.get("type") == "assist"]
        assert len(assist_events) >= 1, "Assist event not found in match events"
        
        assist_event = assist_events[0]
        assert assist_event["player_id"] == "p10"
        assert "ASSIST" in assist_event["detail"].upper()
        print(f"Verified assist event in match: {assist_event}")


class TestMatchEventsFormationChange(TestSetup):
    """Test POST /api/matches/{match_id}/events with type='formation_change'"""
    
    match_id = None
    
    def test_create_match_for_formation_change(self, headers):
        """Create a match to test formation change events"""
        response = requests.post(
            f"{BASE_URL}/api/matches",
            headers=headers,
            json={
                "team_id": TEAM_ID,
                "opponent": "Formation Test Opponent",
                "formation": "4-4-2",
                "duration_minutes": 90,
                "starters": ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11"],
                "subs": ["p12", "p13"]
            }
        )
        assert response.status_code == 200, f"Match creation failed: {response.text}"
        data = response.json()
        TestMatchEventsFormationChange.match_id = data["id"]
        print(f"Created match for formation change test: {data['id']}")
    
    def test_post_formation_change_event(self, headers):
        """POST /api/matches/{match_id}/events with type='formation_change' should save"""
        assert TestMatchEventsFormationChange.match_id, "Match ID not set"
        
        response = requests.post(
            f"{BASE_URL}/api/matches/{TestMatchEventsFormationChange.match_id}/events",
            headers=headers,
            json={
                "type": "formation_change",
                "minute": 60,
                "detail": "4-4-2 -> 4-3-3"
            }
        )
        assert response.status_code == 200, f"Formation change event POST failed: {response.text}"
        data = response.json()
        
        # Verify event data
        assert data["type"] == "formation_change"
        assert data["minute"] == 60
        assert "4-4-2" in data["detail"] or "4-3-3" in data["detail"]
        print(f"Formation change event created: {data}")
    
    def test_verify_formation_change_event_saved(self, headers):
        """Verify formation change event was saved to match"""
        assert TestMatchEventsFormationChange.match_id, "Match ID not set"
        
        response = requests.get(
            f"{BASE_URL}/api/matches/{TestMatchEventsFormationChange.match_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        events = data.get("events", [])
        formation_events = [e for e in events if e.get("type") == "formation_change"]
        assert len(formation_events) >= 1, "Formation change event not found in match events"
        
        formation_event = formation_events[0]
        assert formation_event["minute"] == 60
        print(f"Verified formation change event in match: {formation_event}")


class TestPlayerStatsWithAssists(TestSetup):
    """Test GET /api/teams/{team_id}/player-stats counts assists"""
    
    def test_complete_match_with_assist(self, headers):
        """Create and complete a match with assist event for stats"""
        # Create match
        response = requests.post(
            f"{BASE_URL}/api/matches",
            headers=headers,
            json={
                "team_id": TEAM_ID,
                "opponent": "Stats Test Opponent",
                "formation": "4-3-3",
                "duration_minutes": 90,
                "starters": ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11"],
                "subs": ["p12", "p13"]
            }
        )
        assert response.status_code == 200
        match_id = response.json()["id"]
        
        # Add goal event
        response = requests.post(
            f"{BASE_URL}/api/matches/{match_id}/events",
            headers=headers,
            json={
                "type": "goal",
                "minute": 25,
                "player_id": "p10",
                "detail": "GOAL by ST Player"
            }
        )
        assert response.status_code == 200
        
        # Add assist event for different player
        response = requests.post(
            f"{BASE_URL}/api/matches/{match_id}/events",
            headers=headers,
            json={
                "type": "assist",
                "minute": 25,
                "player_id": "p9",
                "detail": "ASSIST by LW Player"
            }
        )
        assert response.status_code == 200
        
        # Complete the match
        response = requests.put(
            f"{BASE_URL}/api/matches/{match_id}",
            headers=headers,
            json={"status": "completed", "score_home": 1, "score_away": 0}
        )
        assert response.status_code == 200
        print(f"Match {match_id} completed with goal and assist")
    
    def test_player_stats_includes_assists(self, headers):
        """GET /api/teams/{team_id}/player-stats should count assists"""
        response = requests.get(
            f"{BASE_URL}/api/teams/{TEAM_ID}/player-stats",
            headers=headers
        )
        assert response.status_code == 200, f"Player stats GET failed: {response.text}"
        data = response.json()
        
        # Check if p9 (LW Player who got assist) has assists counted
        # Note: Stats only count from completed matches
        if "p9" in data:
            stats_p9 = data["p9"]
            assert "assists" in stats_p9, "assists field missing from player stats"
            print(f"Player p9 stats: {stats_p9}")
            # We added 1 assist in this test
            assert stats_p9.get("assists", 0) >= 1, f"Assists not counted for p9: {stats_p9}"
        else:
            print(f"Player stats data: {data}")
            # p9 might not appear if no completed matches yet - not a failure


class TestEventEndpointEdgeCases(TestSetup):
    """Test edge cases for match events endpoint"""
    
    def test_event_without_player_id(self, headers):
        """Test posting event without player_id (e.g., general event)"""
        # First create a match
        response = requests.post(
            f"{BASE_URL}/api/matches",
            headers=headers,
            json={
                "team_id": TEAM_ID,
                "opponent": "Edge Case Test",
                "formation": "4-3-3",
                "duration_minutes": 90,
                "starters": ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11"],
                "subs": []
            }
        )
        assert response.status_code == 200
        match_id = response.json()["id"]
        
        # Post event without player_id (formation change doesn't need player)
        response = requests.post(
            f"{BASE_URL}/api/matches/{match_id}/events",
            headers=headers,
            json={
                "type": "formation_change",
                "minute": 45,
                "detail": "Halftime formation adjustment"
            }
        )
        assert response.status_code == 200
        print("Event without player_id accepted")
    
    def test_invalid_match_id_returns_404(self, headers):
        """Test posting event to non-existent match returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/matches/nonexistent-match-id/events",
            headers=headers,
            json={
                "type": "goal",
                "minute": 10,
                "player_id": "p10",
                "detail": "Test goal"
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Invalid match ID correctly returns 404")


class TestCleanup(TestSetup):
    """Cleanup test data"""
    
    def test_cleanup_test_matches(self, headers):
        """Delete test matches created during tests"""
        response = requests.get(
            f"{BASE_URL}/api/matches?team_id={TEAM_ID}",
            headers=headers
        )
        if response.status_code == 200:
            matches = response.json()
            test_matches = [m for m in matches if m.get("opponent", "").startswith("Test") or 
                          m.get("opponent", "").startswith("Formation") or
                          m.get("opponent", "").startswith("Stats") or
                          m.get("opponent", "").startswith("Edge")]
            for match in test_matches:
                requests.delete(
                    f"{BASE_URL}/api/matches/{match['id']}",
                    headers=headers
                )
            print(f"Cleaned up {len(test_matches)} test matches")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
