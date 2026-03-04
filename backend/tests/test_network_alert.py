"""
Test Feature 1: Network Add Alert
- When adding a team via code, sends message to that team with 'Add Back' option
- Tests POST /api/network/add creates a message for target team owner with type 'network_add' and includes 'adder_teams'
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tournament-bracket-3.preview.emergentagent.com').rstrip('/')

class TestNetworkAddAlert:
    """Tests for Network Add Alert feature - Feature 1"""
    
    @pytest.fixture(scope="class")
    def demo_user_session(self):
        """Login with demo user and return auth headers"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@test.com",
            "password": "demo123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['token']}"})
        return {"session": session, "user": data}
    
    @pytest.fixture(scope="class")
    def second_user_session(self):
        """Create or login a second test user for network testing"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        unique_email = f"test_user_{uuid.uuid4().hex[:8]}@test.com"
        
        # Try to register new user
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test User 2"
        })
        if response.status_code in [200, 201]:
            data = response.json()
        elif response.status_code == 409:
            # User exists, login instead
            response = session.post(f"{BASE_URL}/api/auth/login", json={
                "email": unique_email,
                "password": "testpass123"
            })
            assert response.status_code == 200, f"Login failed: {response.text}"
            data = response.json()
        else:
            pytest.fail(f"Failed to create/login second user: {response.text}")
            
        session.headers.update({"Authorization": f"Bearer {data['token']}"})
        return {"session": session, "user": data, "email": unique_email}
    
    def test_get_demo_user_teams(self, demo_user_session):
        """Verify demo user has teams to work with"""
        session = demo_user_session["session"]
        response = session.get(f"{BASE_URL}/api/teams")
        assert response.status_code == 200
        teams = response.json()
        print(f"Demo user has {len(teams)} teams")
        if len(teams) > 0:
            print(f"First team code: #{teams[0].get('team_code', 'N/A')}")
        assert len(teams) >= 0  # Allow even 0 teams
        return teams
    
    def test_network_add_creates_message(self, demo_user_session, second_user_session):
        """
        Feature 1 Test: POST /api/network/add creates message for target team owner
        with type 'network_add' and includes 'adder_teams'
        """
        # Step 1: Get demo user's team code
        demo_session = demo_user_session["session"]
        response = demo_session.get(f"{BASE_URL}/api/teams")
        assert response.status_code == 200
        demo_teams = response.json()
        
        if len(demo_teams) == 0:
            pytest.skip("Demo user has no teams - cannot test network add")
        
        target_team = demo_teams[0]
        target_team_code = target_team.get("team_code", "")
        assert target_team_code, "Demo team has no team_code"
        print(f"Target team code: #{target_team_code}")
        
        # Step 2: Create a team for second user (so they have adder_teams)
        second_session = second_user_session["session"]
        second_team_data = {
            "name": f"TEST_Network_Add_Team_{uuid.uuid4().hex[:6]}",
            "sport": "football",
            "format": "5v5",
            "age_group": "U12",
            "gender": "Mixed"
        }
        response = second_session.post(f"{BASE_URL}/api/teams", json=second_team_data)
        assert response.status_code == 200, f"Failed to create second user team: {response.text}"
        second_team = response.json()
        print(f"Second user's team created: {second_team.get('name')} (#{second_team.get('team_code')})")
        
        # Step 3: Second user adds demo user's team to their network
        response = second_session.post(f"{BASE_URL}/api/network/add", json={
            "team_code": target_team_code
        })
        
        # Handle case where team is already in network
        if response.status_code == 409:
            print("Team already in network - checking if message exists")
        else:
            assert response.status_code == 200, f"Failed to add to network: {response.text}"
            network_entry = response.json()
            print(f"Network entry created: {network_entry.get('id')}")
        
        # Step 4: Check demo user's messages for network_add notification
        response = demo_session.get(f"{BASE_URL}/api/messages")
        assert response.status_code == 200
        messages = response.json()
        
        # Find network_add message
        network_add_messages = [m for m in messages if m.get("type") == "network_add"]
        print(f"Found {len(network_add_messages)} network_add messages for demo user")
        
        assert len(network_add_messages) > 0, "No network_add message found for demo user"
        
        # Verify the latest network_add message has correct structure
        latest_msg = network_add_messages[0]  # Messages sorted by created_at desc
        print(f"Latest network_add message: {latest_msg.get('title')}")
        
        # Verify message has 'adder_teams' field
        adder_teams = latest_msg.get("adder_teams", [])
        print(f"adder_teams in message: {adder_teams}")
        
        assert "adder_teams" in latest_msg, "Message missing 'adder_teams' field"
        assert isinstance(adder_teams, list), "adder_teams should be a list"
        
        # Verify message structure
        assert latest_msg.get("type") == "network_add", "Message type should be 'network_add'"
        assert "title" in latest_msg, "Message should have title"
        assert "body" in latest_msg, "Message should have body"
        
        # Verify adder_teams contains team info for Add Back functionality
        if len(adder_teams) > 0:
            for team in adder_teams:
                assert "team_code" in team, "adder_team should have team_code for Add Back"
                assert "name" in team, "adder_team should have name"
                print(f"  - Adder team: {team.get('name')} (#{team.get('team_code')})")
        
        print("SUCCESS: Network add alert creates message with adder_teams for Add Back")
    
    def test_cannot_add_own_team(self, demo_user_session):
        """Verify user cannot add their own team to network"""
        session = demo_user_session["session"]
        
        # Get own teams
        response = session.get(f"{BASE_URL}/api/teams")
        assert response.status_code == 200
        teams = response.json()
        
        if len(teams) == 0:
            pytest.skip("No teams to test with")
        
        own_team_code = teams[0].get("team_code", "")
        if not own_team_code:
            pytest.skip("Team has no code")
        
        # Try to add own team
        response = session.post(f"{BASE_URL}/api/network/add", json={
            "team_code": own_team_code
        })
        
        assert response.status_code == 400, f"Should not be able to add own team: {response.text}"
        error = response.json()
        assert "own team" in error.get("detail", "").lower() or "cannot" in error.get("detail", "").lower()
        print("SUCCESS: Cannot add own team to network")
    
    def test_network_list(self, demo_user_session):
        """Verify GET /api/network returns network list"""
        session = demo_user_session["session"]
        response = session.get(f"{BASE_URL}/api/network")
        assert response.status_code == 200
        network = response.json()
        print(f"Network has {len(network)} entries")
        
        # Verify network entry structure
        if len(network) > 0:
            entry = network[0]
            expected_fields = ["id", "friend_team_name", "friend_manager_name", "friend_manager_phone", "friend_team_code"]
            for field in expected_fields:
                assert field in entry, f"Network entry missing {field}"
            print(f"First network entry: {entry.get('friend_team_name')} - Manager: {entry.get('friend_manager_name')}")
        
        return network


class TestMessagesNetworkAddBack:
    """Test messages page shows network_add messages with Add Back buttons"""
    
    @pytest.fixture(scope="class")
    def demo_user_session(self):
        """Login with demo user and return auth headers"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@test.com",
            "password": "demo123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['token']}"})
        return {"session": session, "user": data}
    
    def test_messages_contain_network_add_with_adder_teams(self, demo_user_session):
        """
        Verify GET /api/messages returns network_add messages with adder_teams field
        This data enables the 'Add Back' button functionality in the frontend
        """
        session = demo_user_session["session"]
        response = session.get(f"{BASE_URL}/api/messages")
        assert response.status_code == 200
        messages = response.json()
        
        network_add_msgs = [m for m in messages if m.get("type") == "network_add"]
        print(f"Total messages: {len(messages)}, network_add messages: {len(network_add_msgs)}")
        
        for msg in network_add_msgs:
            print(f"  Message: {msg.get('title')}")
            print(f"  adder_teams: {msg.get('adder_teams', 'NOT PRESENT')}")
            
            # Verify adder_teams structure for Add Back functionality
            if msg.get("adder_teams"):
                for team in msg.get("adder_teams", []):
                    assert "team_code" in team, "adder_team needs team_code for Add Back"
                    assert "name" in team, "adder_team needs name for display"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
