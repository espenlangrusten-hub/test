"""
Test suite for Tactics page features:
- Team save API (auto-save)
- Formation persistence
- Network contacts for messenger
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tournament-bracket-3.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "demo@test.com"
TEST_PASSWORD = "demo123"


class TestTacticsFeatures:
    """Tests for Tactics page auto-save and related features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.user_id = data["user_id"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Get teams to find Storm G14
        teams_response = requests.get(
            f"{BASE_URL}/api/teams",
            headers=self.headers
        )
        assert teams_response.status_code == 200
        teams = teams_response.json()
        self.storm_team = next((t for t in teams if "Storm" in t.get("name", "")), None)
    
    def test_login_works(self):
        """Verify login endpoint returns valid token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user_id" in data
        print(f"PASS: Login returns token for user {data['email']}")
    
    def test_get_teams(self):
        """Verify teams endpoint returns user's teams"""
        response = requests.get(
            f"{BASE_URL}/api/teams",
            headers=self.headers
        )
        assert response.status_code == 200
        teams = response.json()
        assert isinstance(teams, list)
        assert len(teams) > 0, "User should have at least one team"
        print(f"PASS: Got {len(teams)} teams for user")
    
    def test_storm_g14_team_exists(self):
        """Verify Storm G14 team exists with players"""
        assert self.storm_team is not None, "Storm G14 team should exist"
        assert "players" in self.storm_team
        assert len(self.storm_team["players"]) > 0, "Storm G14 should have players"
        print(f"PASS: Storm G14 has {len(self.storm_team['players'])} players")
    
    def test_team_save_endpoint(self):
        """Test PUT /teams/{id} endpoint for auto-save functionality"""
        if not self.storm_team:
            pytest.skip("Storm G14 team not found")
        
        team_id = self.storm_team["id"]
        
        # Update formation
        update_data = {
            "name": self.storm_team.get("name", "Storm G14"),
            "sport": self.storm_team.get("sport", "football"),
            "format": self.storm_team.get("format", "9v9"),
            "formation": "2-4-1",
            "tactic_name": "Possession Style",
            "players": self.storm_team.get("players", [])
        }
        
        response = requests.put(
            f"{BASE_URL}/api/teams/{team_id}",
            headers=self.headers,
            json=update_data
        )
        assert response.status_code == 200, f"Team save failed: {response.text}"
        
        # Verify formation was saved
        updated = response.json()
        assert updated.get("formation") == "2-4-1"
        assert updated.get("tactic_name") == "Possession Style"
        print(f"PASS: Team formation saved as 2-4-1")
    
    def test_team_save_persists(self):
        """Verify saved formation persists on GET"""
        if not self.storm_team:
            pytest.skip("Storm G14 team not found")
        
        team_id = self.storm_team["id"]
        
        # Get the team again
        response = requests.get(
            f"{BASE_URL}/api/teams/{team_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        team = response.json()
        
        # Check formation was persisted
        assert team.get("formation") in ["2-4-1", "3-2-3", "3-3-2", "2-3-2-1"], "Formation should be valid"
        print(f"PASS: Team formation persisted as '{team.get('formation')}'")
    
    def test_network_contacts(self):
        """Verify network endpoint returns contacts for messenger"""
        response = requests.get(
            f"{BASE_URL}/api/network",
            headers=self.headers
        )
        assert response.status_code == 200
        network = response.json()
        assert isinstance(network, list)
        print(f"PASS: Network has {len(network)} contacts")
        
        # Check contact structure
        if network:
            contact = network[0]
            assert "friend_team_name" in contact
            assert "friend_user_id" in contact
            print(f"PASS: First contact is '{contact.get('friend_team_name')}'")
    
    def test_direct_messages_conversations(self):
        """Verify direct messages conversations endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/direct-messages/conversations",
            headers=self.headers
        )
        assert response.status_code == 200
        convos = response.json()
        assert isinstance(convos, list)
        print(f"PASS: Got {len(convos)} conversations")
    
    def test_notifications_unread(self):
        """Verify notifications/unread endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "messages" in data
        assert "direct_messages" in data
        print(f"PASS: Unread notifications: {data['total']} total")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
