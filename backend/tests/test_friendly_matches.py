"""
Test Suite for Enhanced Friendly Match System
Tests: Create invite, Respond/Accept, Cancel, Amend, Delete
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://match-network-1.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "demo@test.com"
TEST_PASSWORD = "demo123"

# Global state for tests
test_state = {
    "token": None,
    "user_id": None,
    "team_id": None,
    "team_code": None,
    "invite_id": None,
    "accepted_invite_id": None,
}


class TestFriendlyMatchSystem:
    """Test the friendly match invite system"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token, get first team"""
        if test_state["token"] is None:
            # Login
            resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            assert resp.status_code == 200, f"Login failed: {resp.text}"
            data = resp.json()
            test_state["token"] = data["token"]
            test_state["user_id"] = data["user_id"]
            
            # Get teams to find team_id
            headers = {"Authorization": f"Bearer {test_state['token']}"}
            teams_resp = requests.get(f"{BASE_URL}/api/teams", headers=headers)
            assert teams_resp.status_code == 200, f"Failed to get teams: {teams_resp.text}"
            teams = teams_resp.json()
            assert len(teams) > 0, "No teams found for demo user"
            test_state["team_id"] = teams[0]["id"]
            test_state["team_code"] = teams[0].get("team_code", "")
            print(f"Using team: {teams[0]['name']} (ID: {test_state['team_id']}, Code: {test_state['team_code']})")
        
        self.token = test_state["token"]
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        self.team_id = test_state["team_id"]

    def test_01_create_friendly_invite(self):
        """POST /api/friendly-invites - Create invite to Monolitten 2012 (MUH227)"""
        # Create invite with proposed dates
        payload = {
            "from_team_id": self.team_id,
            "to_team_code": "MUH2Z7",  # Monolitten 2012's code from network
            "proposed_dates": [
                {"date": "2026-02-15", "time_slots": ["10:00", "14:00"]},
                {"date": "2026-02-16", "time_slots": ["11:00"]}
            ],
            "home_away": "home",
            "pitch_name": "Test Stadium",
            "pitch_address": "123 Test Street"
        }
        
        resp = requests.post(f"{BASE_URL}/api/friendly-invites", json=payload, headers=self.headers)
        print(f"Create invite response: {resp.status_code} - {resp.text[:500] if resp.text else 'empty'}")
        
        # Check status code
        assert resp.status_code == 200, f"Create invite failed: {resp.text}"
        
        # Validate response data
        data = resp.json()
        assert "id" in data, "Response missing 'id'"
        assert data["from_team_id"] == self.team_id
        assert data["to_team_code"] == "MUH227"
        assert data["status"] == "pending"
        assert len(data["proposed_dates"]) == 2
        assert data["home_away"] == "home"
        assert data["pitch_name"] == "Test Stadium"
        
        test_state["invite_id"] = data["id"]
        print(f"Created invite ID: {test_state['invite_id']}")

    def test_02_get_friendly_invites(self):
        """GET /api/friendly-invites - List all invites"""
        resp = requests.get(f"{BASE_URL}/api/friendly-invites", headers=self.headers)
        assert resp.status_code == 200, f"Get invites failed: {resp.text}"
        
        invites = resp.json()
        assert isinstance(invites, list)
        print(f"Found {len(invites)} invites")
        
        # Verify our created invite is in the list
        if test_state["invite_id"]:
            found = any(i["id"] == test_state["invite_id"] for i in invites)
            assert found, f"Created invite {test_state['invite_id']} not found in list"

    def test_03_get_single_invite(self):
        """GET /api/friendly-invites/{id} - Get single invite"""
        if not test_state["invite_id"]:
            pytest.skip("No invite created yet")
        
        resp = requests.get(f"{BASE_URL}/api/friendly-invites/{test_state['invite_id']}", headers=self.headers)
        assert resp.status_code == 200, f"Get invite failed: {resp.text}"
        
        data = resp.json()
        assert data["id"] == test_state["invite_id"]
        assert data["status"] == "pending"
        print(f"Invite details: {data['from_team_name']} vs {data['to_team_name']}")

    def test_04_respond_accept_invite(self):
        """PUT /api/friendly-invites/{id}/respond - Accept an invite"""
        if not test_state["invite_id"]:
            pytest.skip("No invite created yet")
        
        # Accept with a selected date
        payload = {
            "status": "accepted",
            "accepted_date": "2026-02-15",
            "accepted_time": "10:00"
        }
        
        resp = requests.put(
            f"{BASE_URL}/api/friendly-invites/{test_state['invite_id']}/respond",
            json=payload,
            headers=self.headers
        )
        print(f"Accept invite response: {resp.status_code} - {resp.text[:500] if resp.text else 'empty'}")
        
        assert resp.status_code == 200, f"Accept invite failed: {resp.text}"
        
        data = resp.json()
        assert data["status"] == "accepted"
        assert data["accepted_date"] == "2026-02-15"
        assert data["accepted_time"] == "10:00"
        
        test_state["accepted_invite_id"] = data["id"]
        print(f"Accepted invite: {data['id']}")

    def test_05_cancel_accepted_match(self):
        """PUT /api/friendly-invites/{id}/cancel - Cancel an accepted match"""
        if not test_state["accepted_invite_id"]:
            pytest.skip("No accepted invite yet")
        
        resp = requests.put(
            f"{BASE_URL}/api/friendly-invites/{test_state['accepted_invite_id']}/cancel",
            headers=self.headers
        )
        print(f"Cancel response: {resp.status_code} - {resp.text[:500] if resp.text else 'empty'}")
        
        assert resp.status_code == 200, f"Cancel failed: {resp.text}"
        
        data = resp.json()
        assert "message" in data or "status" in data
        
        # Verify status changed to cancelled
        verify_resp = requests.get(
            f"{BASE_URL}/api/friendly-invites/{test_state['accepted_invite_id']}",
            headers=self.headers
        )
        assert verify_resp.status_code == 200
        verify_data = verify_resp.json()
        assert verify_data["status"] == "cancelled", f"Expected cancelled status, got: {verify_data['status']}"
        print(f"Match cancelled successfully")

    def test_06_delete_cancelled_invite(self):
        """DELETE /api/friendly-invites/{id} - Delete a cancelled match"""
        if not test_state["accepted_invite_id"]:
            pytest.skip("No cancelled invite yet")
        
        resp = requests.delete(
            f"{BASE_URL}/api/friendly-invites/{test_state['accepted_invite_id']}",
            headers=self.headers
        )
        print(f"Delete response: {resp.status_code} - {resp.text[:500] if resp.text else 'empty'}")
        
        assert resp.status_code == 200, f"Delete failed: {resp.text}"
        
        # Verify it's deleted - should return 404
        verify_resp = requests.get(
            f"{BASE_URL}/api/friendly-invites/{test_state['accepted_invite_id']}",
            headers=self.headers
        )
        assert verify_resp.status_code == 404, f"Expected 404 after deletion, got: {verify_resp.status_code}"
        print(f"Invite deleted successfully")

    def test_07_create_and_amend_invite(self):
        """Test create -> accept -> amend flow"""
        # Create new invite
        payload = {
            "from_team_id": self.team_id,
            "to_team_code": "MUH2Z7",
            "proposed_dates": [
                {"date": "2026-03-10", "time_slots": ["15:00"]}
            ],
            "home_away": "away",
            "pitch_name": "Away Stadium",
            "pitch_address": ""
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/friendly-invites", json=payload, headers=self.headers)
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        invite_id = create_resp.json()["id"]
        
        # Accept the invite
        accept_payload = {
            "status": "accepted",
            "accepted_date": "2026-03-10",
            "accepted_time": "15:00"
        }
        accept_resp = requests.put(
            f"{BASE_URL}/api/friendly-invites/{invite_id}/respond",
            json=accept_payload,
            headers=self.headers
        )
        assert accept_resp.status_code == 200, f"Accept failed: {accept_resp.text}"
        
        # Verify it's accepted
        verify1 = requests.get(f"{BASE_URL}/api/friendly-invites/{invite_id}", headers=self.headers)
        assert verify1.json()["status"] == "accepted"
        
        # Now AMEND with new dates
        amend_payload = {
            "proposed_dates": [
                {"date": "2026-03-20", "time_slots": ["10:00", "16:00"]},
                {"date": "2026-03-21", "time_slots": ["11:00"]}
            ]
        }
        amend_resp = requests.put(
            f"{BASE_URL}/api/friendly-invites/{invite_id}/amend",
            json=amend_payload,
            headers=self.headers
        )
        print(f"Amend response: {amend_resp.status_code} - {amend_resp.text[:500] if amend_resp.text else 'empty'}")
        
        assert amend_resp.status_code == 200, f"Amend failed: {amend_resp.text}"
        
        # Verify status changed to pending with new dates
        verify2 = requests.get(f"{BASE_URL}/api/friendly-invites/{invite_id}", headers=self.headers)
        verify_data = verify2.json()
        
        assert verify_data["status"] == "pending", f"Expected pending after amend, got: {verify_data['status']}"
        assert verify_data["accepted_date"] == "", "accepted_date should be cleared after amend"
        assert len(verify_data["proposed_dates"]) == 2, f"Expected 2 proposed dates, got: {len(verify_data['proposed_dates'])}"
        assert verify_data["proposed_dates"][0]["date"] == "2026-03-20"
        
        print(f"Amend successful - status: {verify_data['status']}, new dates: {len(verify_data['proposed_dates'])}")
        
        # Cleanup - accept again then cancel then delete
        re_accept = requests.put(
            f"{BASE_URL}/api/friendly-invites/{invite_id}/respond",
            json={"status": "accepted", "accepted_date": "2026-03-20", "accepted_time": "10:00"},
            headers=self.headers
        )
        requests.put(f"{BASE_URL}/api/friendly-invites/{invite_id}/cancel", headers=self.headers)
        requests.delete(f"{BASE_URL}/api/friendly-invites/{invite_id}", headers=self.headers)

    def test_08_decline_invite_and_delete(self):
        """Test decline flow - declined invites should be deletable"""
        # Create invite
        payload = {
            "from_team_id": self.team_id,
            "to_team_code": "MUH2Z7",
            "proposed_dates": [{"date": "2026-04-01", "time_slots": ["09:00"]}],
            "home_away": "home",
            "pitch_name": "",
            "pitch_address": ""
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/friendly-invites", json=payload, headers=self.headers)
        assert create_resp.status_code == 200
        invite_id = create_resp.json()["id"]
        
        # Decline the invite
        decline_resp = requests.put(
            f"{BASE_URL}/api/friendly-invites/{invite_id}/respond",
            json={"status": "declined", "accepted_date": "", "accepted_time": ""},
            headers=self.headers
        )
        print(f"Decline response: {decline_resp.status_code}")
        assert decline_resp.status_code == 200, f"Decline failed: {decline_resp.text}"
        
        # Verify declined status
        verify = requests.get(f"{BASE_URL}/api/friendly-invites/{invite_id}", headers=self.headers)
        assert verify.json()["status"] == "declined"
        
        # Delete declined invite
        delete_resp = requests.delete(f"{BASE_URL}/api/friendly-invites/{invite_id}", headers=self.headers)
        assert delete_resp.status_code == 200, f"Delete declined invite failed: {delete_resp.text}"
        
        print("Decline and delete flow successful")

    def test_09_cannot_delete_pending_invite(self):
        """Verify that pending invites cannot be deleted"""
        # Create invite
        payload = {
            "from_team_id": self.team_id,
            "to_team_code": "MUH2Z7",
            "proposed_dates": [{"date": "2026-05-01", "time_slots": ["12:00"]}],
            "home_away": "home",
            "pitch_name": "",
            "pitch_address": ""
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/friendly-invites", json=payload, headers=self.headers)
        assert create_resp.status_code == 200
        invite_id = create_resp.json()["id"]
        
        # Try to delete pending invite - should fail
        delete_resp = requests.delete(f"{BASE_URL}/api/friendly-invites/{invite_id}", headers=self.headers)
        print(f"Delete pending response: {delete_resp.status_code}")
        
        # Should return 404 (can only delete cancelled/declined)
        assert delete_resp.status_code == 404, f"Expected 404 for pending delete, got: {delete_resp.status_code}"
        
        # Cleanup - accept, cancel, then delete
        requests.put(
            f"{BASE_URL}/api/friendly-invites/{invite_id}/respond",
            json={"status": "accepted", "accepted_date": "2026-05-01", "accepted_time": "12:00"},
            headers=self.headers
        )
        requests.put(f"{BASE_URL}/api/friendly-invites/{invite_id}/cancel", headers=self.headers)
        requests.delete(f"{BASE_URL}/api/friendly-invites/{invite_id}", headers=self.headers)
        
        print("Cannot delete pending invite - verified")

    def test_10_verify_network_endpoint(self):
        """GET /api/network - Verify network teams are available"""
        resp = requests.get(f"{BASE_URL}/api/network", headers=self.headers)
        assert resp.status_code == 200, f"Get network failed: {resp.text}"
        
        network = resp.json()
        print(f"Network contains {len(network)} teams")
        
        # Look for Monolitten 2012 with code MUH2Z7
        monolitten = None
        for n in network:
            print(f"  - {n.get('friend_team_name', '?')} ({n.get('friend_team_code', '?')})")
            if n.get("friend_team_code") == "MUH2Z7":
                monolitten = n
        
        if monolitten:
            print(f"Found Monolitten 2012 in network: {monolitten['friend_team_name']}")
            assert monolitten["friend_team_code"] == "MUH2Z7"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
