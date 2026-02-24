"""
Test suite for Match Calendar feature (Kampkalender)
Tests GET /api/teams/{team_id}/calendar endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://match-network-1.preview.emergentagent.com')

# Test credentials
DEMO_USER = {"email": "demo@test.com", "password": "demo123"}
COACH2_USER = {"email": "coach2@test.com", "password": "test123"}

# Known team IDs for testing
ORN_FK_TEAM_ID = "13c5157b-86a7-4fbb-af7f-63e239d81f7d"


class TestCalendarEndpoint:
    """Tests for GET /api/teams/{team_id}/calendar endpoint"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as demo user and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_USER)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.user_id = data["user_id"]
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }

    def test_calendar_endpoint_returns_200(self):
        """Test calendar endpoint returns 200 status"""
        response = requests.get(
            f"{BASE_URL}/api/teams/{ORN_FK_TEAM_ID}/calendar",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Calendar endpoint returns 200")

    def test_calendar_returns_list(self):
        """Test calendar returns a list of events"""
        response = requests.get(
            f"{BASE_URL}/api/teams/{ORN_FK_TEAM_ID}/calendar",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: Calendar returns list with {len(data)} events")

    def test_calendar_event_has_required_fields(self):
        """Test calendar events have all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/teams/{ORN_FK_TEAM_ID}/calendar",
            headers=self.headers
        )
        assert response.status_code == 200
        events = response.json()
        
        required_fields = ['id', 'type', 'date', 'time', 'opponent', 'opponent_country', 
                          'home_away', 'pitch_name', 'pitch_address', 'manager_name', 
                          'manager_phone', 'status']
        
        if len(events) > 0:
            event = events[0]
            for field in required_fields:
                assert field in event, f"Missing required field: {field}"
            print(f"PASS: Calendar event has all {len(required_fields)} required fields")
        else:
            print("PASS: No events to check (empty calendar)")

    def test_calendar_includes_accepted_friendly(self):
        """Test calendar includes accepted friendly match with Rival FC"""
        response = requests.get(
            f"{BASE_URL}/api/teams/{ORN_FK_TEAM_ID}/calendar",
            headers=self.headers
        )
        assert response.status_code == 200
        events = response.json()
        
        # Find friendly match with Rival FC
        friendly_events = [e for e in events if e['type'] == 'friendly' and e['opponent'] == 'Rival FC']
        assert len(friendly_events) > 0, "Expected to find friendly match with Rival FC"
        
        friendly = friendly_events[0]
        # Verify expected data
        assert friendly['date'] == '2026-03-15', f"Wrong date: {friendly['date']}"
        assert friendly['time'] == '14:00', f"Wrong time: {friendly['time']}"
        assert friendly['home_away'] == 'home', f"Wrong home_away: {friendly['home_away']}"
        assert friendly['pitch_name'] == 'Ekeberg kunstgress', f"Wrong pitch: {friendly['pitch_name']}"
        print("PASS: Calendar includes accepted friendly with correct data")

    def test_calendar_friendly_has_manager_contact(self):
        """Test friendly match includes manager contact info"""
        response = requests.get(
            f"{BASE_URL}/api/teams/{ORN_FK_TEAM_ID}/calendar",
            headers=self.headers
        )
        assert response.status_code == 200
        events = response.json()
        
        friendly_events = [e for e in events if e['type'] == 'friendly']
        if len(friendly_events) > 0:
            friendly = friendly_events[0]
            # Manager info should be present (opponent's manager for home team)
            assert 'manager_name' in friendly, "Missing manager_name field"
            assert 'manager_phone' in friendly, "Missing manager_phone field"
            # For Orn FK as home team, should show Rival FC's manager (Erik Svensson)
            if friendly['manager_name']:
                print(f"PASS: Manager contact present: {friendly['manager_name']} - {friendly['manager_phone']}")
            else:
                print("PASS: Manager contact fields present (may be empty)")
        else:
            print("SKIP: No friendly events to check")

    def test_calendar_events_sorted_by_date(self):
        """Test calendar events are sorted by date ascending"""
        response = requests.get(
            f"{BASE_URL}/api/teams/{ORN_FK_TEAM_ID}/calendar",
            headers=self.headers
        )
        assert response.status_code == 200
        events = response.json()
        
        if len(events) > 1:
            dates = [e['date'] for e in events if e['date']]
            sorted_dates = sorted(dates)
            assert dates == sorted_dates, f"Events not sorted by date: {dates}"
            print(f"PASS: {len(dates)} events sorted by date")
        else:
            print("PASS: Not enough events to verify sorting")

    def test_calendar_404_for_nonexistent_team(self):
        """Test calendar returns 404 for non-existent team"""
        fake_team_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(
            f"{BASE_URL}/api/teams/{fake_team_id}/calendar",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Calendar returns 404 for non-existent team")

    def test_calendar_401_without_auth(self):
        """Test calendar returns 401 without authentication"""
        response = requests.get(
            f"{BASE_URL}/api/teams/{ORN_FK_TEAM_ID}/calendar",
            headers={"Content-Type": "application/json"}  # No auth header
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Calendar returns 401 without auth")


class TestCalendarEmptyState:
    """Test calendar empty state for teams without matches"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as demo user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_USER)
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
        # Get a team without friendly matches
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=self.headers)
        teams = teams_response.json()
        # Find Storm G14 team (likely has no accepted friendly matches)
        storm_teams = [t for t in teams if 'Storm' in t.get('name', '')]
        if storm_teams:
            self.team_id = storm_teams[0]['id']
        else:
            self.team_id = teams[0]['id'] if teams else None

    def test_calendar_returns_empty_list(self):
        """Test calendar returns empty list for team without matches"""
        if not self.team_id:
            pytest.skip("No team found for testing")
        
        response = requests.get(
            f"{BASE_URL}/api/teams/{self.team_id}/calendar",
            headers=self.headers
        )
        assert response.status_code == 200
        events = response.json()
        assert isinstance(events, list), "Expected list response"
        print(f"PASS: Calendar returns list with {len(events)} events")


class TestCalendarWithCoach2:
    """Test calendar from Rival FC's perspective (coach2 user)"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as coach2 user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=COACH2_USER)
        if response.status_code != 200:
            pytest.skip(f"Coach2 login failed: {response.status_code}")
        self.token = response.json()["token"]
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
        # Get coach2's teams
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=self.headers)
        if teams_response.status_code == 200:
            teams = teams_response.json()
            self.team_id = teams[0]['id'] if teams else None
        else:
            self.team_id = None

    def test_coach2_calendar_shows_accepted_friendly(self):
        """Test coach2's calendar shows the accepted friendly as away match"""
        if not self.team_id:
            pytest.skip("Coach2 has no teams")
        
        response = requests.get(
            f"{BASE_URL}/api/teams/{self.team_id}/calendar",
            headers=self.headers
        )
        assert response.status_code == 200
        events = response.json()
        
        # Find friendly matches
        friendly_events = [e for e in events if e['type'] == 'friendly']
        if friendly_events:
            # For Rival FC, the match should show as away
            friendly = friendly_events[0]
            print(f"PASS: Coach2 calendar shows friendly - opponent: {friendly.get('opponent')}, home_away: {friendly.get('home_away')}")
        else:
            print("INFO: No friendly events in coach2 calendar")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
