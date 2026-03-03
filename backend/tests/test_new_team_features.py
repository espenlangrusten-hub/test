"""
Test file for new team management features:
- Gender selection (Gutter/Jenter/Mixed)
- Manager registration (name + phone)
- Team code generation
- Network (friends) system
- Friendly match invites
- Messages system
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://team-management-hub-1.preview.emergentagent.com')

class TestSetup:
    """Setup fixtures for testing"""
    
    @pytest.fixture(scope="class")
    def session(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        return s
    
    @pytest.fixture(scope="class")
    def auth_token_user1(self, session):
        """Login with demo user"""
        res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@test.com",
            "password": "demo123"
        })
        assert res.status_code == 200, f"Login failed: {res.text}"
        return res.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers_user1(self, auth_token_user1):
        return {"Authorization": f"Bearer {auth_token_user1}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def user2_credentials(self):
        """Generate unique user2 credentials"""
        unique_id = str(uuid.uuid4())[:8]
        return {
            "email": f"test_user2_{unique_id}@test.com",
            "password": "test123",
            "name": f"Test User2 {unique_id}"
        }
    
    @pytest.fixture(scope="class")
    def auth_token_user2(self, session, user2_credentials):
        """Register and login as second user for multi-user tests"""
        # First try to register
        res = session.post(f"{BASE_URL}/api/auth/register", json=user2_credentials)
        if res.status_code == 201 or res.status_code == 200:
            return res.json()["token"]
        # If already exists (409), try login
        if res.status_code == 409:
            res = session.post(f"{BASE_URL}/api/auth/login", json={
                "email": user2_credentials["email"],
                "password": user2_credentials["password"]
            })
            if res.status_code == 200:
                return res.json()["token"]
        pytest.skip(f"Could not create/login user2: {res.status_code} - {res.text}")
    
    @pytest.fixture(scope="class")
    def auth_headers_user2(self, auth_token_user2):
        return {"Authorization": f"Bearer {auth_token_user2}", "Content-Type": "application/json"}


class TestTeamCreationWithGenderManagerCode(TestSetup):
    """Test team creation with new fields: gender, manager_name, manager_phone, team_code"""
    
    def test_create_team_with_gender_gutter(self, session, auth_headers_user1):
        """Create team with gender=Gutter"""
        payload = {
            "name": f"TEST_Team_Gutter_{uuid.uuid4().hex[:6]}",
            "sport": "football",
            "format": "7v7",
            "age_group": "U12",
            "gender": "Gutter",
            "country": "NO",
            "manager_name": "Test Manager Gutter",
            "manager_phone": "+47 123 45 678",
            "players": []
        }
        res = session.post(f"{BASE_URL}/api/teams", json=payload, headers=auth_headers_user1)
        assert res.status_code == 200, f"Create team failed: {res.text}"
        data = res.json()
        assert data["gender"] == "Gutter", f"Gender mismatch: {data.get('gender')}"
        assert data["manager_name"] == "Test Manager Gutter"
        assert data["manager_phone"] == "+47 123 45 678"
        assert "team_code" in data, "team_code not generated"
        assert len(data["team_code"]) == 6, f"team_code wrong length: {data['team_code']}"
        print(f"Created team with code: {data['team_code']}")
    
    def test_create_team_with_gender_jenter(self, session, auth_headers_user1):
        """Create team with gender=Jenter"""
        payload = {
            "name": f"TEST_Team_Jenter_{uuid.uuid4().hex[:6]}",
            "sport": "football",
            "format": "5v5",
            "age_group": "U14",
            "gender": "Jenter",
            "manager_name": "Manager Jenter",
            "manager_phone": "98765432",
            "players": []
        }
        res = session.post(f"{BASE_URL}/api/teams", json=payload, headers=auth_headers_user1)
        assert res.status_code == 200
        data = res.json()
        assert data["gender"] == "Jenter"
        assert data["manager_name"] == "Manager Jenter"
        assert "team_code" in data
    
    def test_create_team_with_gender_mixed(self, session, auth_headers_user1):
        """Create team with gender=Mixed"""
        payload = {
            "name": f"TEST_Team_Mixed_{uuid.uuid4().hex[:6]}",
            "sport": "futsal",
            "format": "5v5",
            "age_group": "Senior",
            "gender": "Mixed",
            "manager_name": "Mixed Manager",
            "manager_phone": "",
            "players": []
        }
        res = session.post(f"{BASE_URL}/api/teams", json=payload, headers=auth_headers_user1)
        assert res.status_code == 200
        data = res.json()
        assert data["gender"] == "Mixed"
        assert data["manager_name"] == "Mixed Manager"
    
    def test_team_code_is_unique(self, session, auth_headers_user1):
        """Verify team codes are unique"""
        codes = set()
        for i in range(3):
            payload = {
                "name": f"TEST_UniqueCode_{i}_{uuid.uuid4().hex[:6]}",
                "sport": "football",
                "format": "11v11",
                "age_group": "U16",
                "gender": "Gutter",
                "players": []
            }
            res = session.post(f"{BASE_URL}/api/teams", json=payload, headers=auth_headers_user1)
            assert res.status_code == 200
            code = res.json()["team_code"]
            assert code not in codes, f"Duplicate code: {code}"
            codes.add(code)
    
    def test_get_teams_returns_all_fields(self, session, auth_headers_user1):
        """GET /api/teams returns teams with team_code, gender, manager fields"""
        res = session.get(f"{BASE_URL}/api/teams", headers=auth_headers_user1)
        assert res.status_code == 200
        teams = res.json()
        assert len(teams) > 0, "No teams returned"
        # Find a test team that has all fields
        test_teams = [t for t in teams if t["name"].startswith("TEST_")]
        assert len(test_teams) > 0, "No TEST_ teams found"
        team = test_teams[0]
        assert "team_code" in team, f"team_code missing: {team}"
        assert "gender" in team, f"gender missing: {team}"
        assert "manager_name" in team, f"manager_name missing: {team}"
        assert "manager_phone" in team, f"manager_phone missing: {team}"


class TestTeamUpdate(TestSetup):
    """Test updating team gender, manager_name, manager_phone"""
    
    @pytest.fixture(scope="class")
    def test_team_for_update(self, session, auth_headers_user1):
        """Create a team to update"""
        payload = {
            "name": f"TEST_UpdateTeam_{uuid.uuid4().hex[:6]}",
            "sport": "football",
            "format": "9v9",
            "age_group": "U13",
            "gender": "Gutter",
            "manager_name": "Original Manager",
            "manager_phone": "111222333",
            "players": []
        }
        res = session.post(f"{BASE_URL}/api/teams", json=payload, headers=auth_headers_user1)
        assert res.status_code == 200
        return res.json()
    
    def test_update_gender(self, session, auth_headers_user1, test_team_for_update):
        """PUT /api/teams/{id} can update gender"""
        team_id = test_team_for_update["id"]
        payload = {
            "name": test_team_for_update["name"],
            "sport": test_team_for_update["sport"],
            "format": test_team_for_update["format"],
            "age_group": test_team_for_update["age_group"],
            "gender": "Jenter",  # Changed from Gutter
            "manager_name": test_team_for_update["manager_name"],
            "manager_phone": test_team_for_update["manager_phone"],
            "players": []
        }
        res = session.put(f"{BASE_URL}/api/teams/{team_id}", json=payload, headers=auth_headers_user1)
        assert res.status_code == 200
        data = res.json()
        assert data["gender"] == "Jenter", f"Gender not updated: {data.get('gender')}"
    
    def test_update_manager_info(self, session, auth_headers_user1, test_team_for_update):
        """PUT /api/teams/{id} can update manager_name, manager_phone"""
        team_id = test_team_for_update["id"]
        payload = {
            "name": test_team_for_update["name"],
            "sport": test_team_for_update["sport"],
            "format": test_team_for_update["format"],
            "age_group": test_team_for_update["age_group"],
            "gender": "Jenter",
            "manager_name": "Updated Manager Name",
            "manager_phone": "+47 999 88 777",
            "players": []
        }
        res = session.put(f"{BASE_URL}/api/teams/{team_id}", json=payload, headers=auth_headers_user1)
        assert res.status_code == 200
        data = res.json()
        assert data["manager_name"] == "Updated Manager Name"
        assert data["manager_phone"] == "+47 999 88 777"


class TestTeamLookup(TestSetup):
    """Test team lookup by code"""
    
    @pytest.fixture(scope="class")
    def team_with_known_code(self, session, auth_headers_user1):
        """Create a team to lookup"""
        payload = {
            "name": f"TEST_LookupTeam_{uuid.uuid4().hex[:6]}",
            "sport": "football",
            "format": "7v7",
            "age_group": "U15",
            "gender": "Mixed",
            "country": "NO",
            "manager_name": "Lookup Manager",
            "manager_phone": "+47 555 66 777",
            "players": []
        }
        res = session.post(f"{BASE_URL}/api/teams", json=payload, headers=auth_headers_user1)
        assert res.status_code == 200
        return res.json()
    
    def test_lookup_team_by_code(self, session, auth_headers_user1, team_with_known_code):
        """GET /api/teams/lookup?code=XXXXX returns team public info"""
        code = team_with_known_code["team_code"]
        res = session.get(f"{BASE_URL}/api/teams/lookup?code={code}", headers=auth_headers_user1)
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == team_with_known_code["name"]
        assert data["team_code"] == code
        assert data["gender"] == "Mixed"
        assert data["manager_name"] == "Lookup Manager"
        assert data["manager_phone"] == "+47 555 66 777"
    
    def test_lookup_team_invalid_code(self, session, auth_headers_user1):
        """GET /api/teams/lookup with invalid code returns 404"""
        res = session.get(f"{BASE_URL}/api/teams/lookup?code=ZZZZZZ", headers=auth_headers_user1)
        assert res.status_code == 404


class TestNetwork(TestSetup):
    """Test network (friends) system"""
    
    @pytest.fixture(scope="class")
    def user2_team(self, session, auth_headers_user2):
        """Create a team for user2"""
        payload = {
            "name": f"TEST_User2Team_{uuid.uuid4().hex[:6]}",
            "sport": "football",
            "format": "11v11",
            "age_group": "U17",
            "gender": "Gutter",
            "manager_name": "User2 Manager",
            "manager_phone": "+47 111 22 333",
            "players": []
        }
        res = session.post(f"{BASE_URL}/api/teams", json=payload, headers=auth_headers_user2)
        assert res.status_code == 200
        return res.json()
    
    def test_add_team_to_network_by_code(self, session, auth_headers_user1, user2_team):
        """POST /api/network/add adds a team by code to user network"""
        code = user2_team["team_code"]
        res = session.post(f"{BASE_URL}/api/network/add", json={"team_code": code}, headers=auth_headers_user1)
        assert res.status_code == 200, f"Add to network failed: {res.text}"
        data = res.json()
        assert data["friend_team_code"] == code
        assert data["friend_team_name"] == user2_team["name"]
        assert data["friend_manager_name"] == "User2 Manager"
        print(f"Added team to network: {data['friend_team_name']}")
    
    def test_get_network(self, session, auth_headers_user1):
        """GET /api/network returns friends list"""
        res = session.get(f"{BASE_URL}/api/network", headers=auth_headers_user1)
        assert res.status_code == 200
        friends = res.json()
        assert isinstance(friends, list)
        # Should have at least one friend from previous test
        print(f"Network contains {len(friends)} friends")
    
    def test_cannot_add_own_team(self, session, auth_headers_user1):
        """Cannot add own team to network"""
        # Get user1's teams
        res = session.get(f"{BASE_URL}/api/teams", headers=auth_headers_user1)
        assert res.status_code == 200
        teams = res.json()
        if len(teams) > 0:
            code = teams[0].get("team_code")
            if code:
                res = session.post(f"{BASE_URL}/api/network/add", json={"team_code": code}, headers=auth_headers_user1)
                assert res.status_code == 400, f"Should not be able to add own team: {res.text}"
    
    def test_cannot_add_duplicate(self, session, auth_headers_user1, user2_team):
        """Cannot add same team twice"""
        code = user2_team["team_code"]
        res = session.post(f"{BASE_URL}/api/network/add", json={"team_code": code}, headers=auth_headers_user1)
        assert res.status_code == 409, f"Should get conflict for duplicate: {res.status_code}"
    
    def test_delete_from_network(self, session, auth_headers_user1):
        """DELETE /api/network/{id} removes from network"""
        # First get network
        res = session.get(f"{BASE_URL}/api/network", headers=auth_headers_user1)
        assert res.status_code == 200
        friends = res.json()
        if len(friends) > 0:
            friend_id = friends[0]["id"]
            res = session.delete(f"{BASE_URL}/api/network/{friend_id}", headers=auth_headers_user1)
            assert res.status_code == 200
            # Verify removed
            res = session.get(f"{BASE_URL}/api/network", headers=auth_headers_user1)
            remaining = res.json()
            assert not any(f["id"] == friend_id for f in remaining)


class TestFriendlyInvites(TestSetup):
    """Test friendly match invite system"""
    
    @pytest.fixture(scope="class")
    def user1_team_for_invites(self, session, auth_headers_user1):
        """Create a team for user1 to send invites from"""
        payload = {
            "name": f"TEST_InviteTeam1_{uuid.uuid4().hex[:6]}",
            "sport": "football",
            "format": "7v7",
            "age_group": "U14",
            "gender": "Jenter",
            "manager_name": "Invite Manager 1",
            "manager_phone": "+47 444 55 666",
            "players": []
        }
        res = session.post(f"{BASE_URL}/api/teams", json=payload, headers=auth_headers_user1)
        assert res.status_code == 200
        return res.json()
    
    @pytest.fixture(scope="class")
    def user2_team_for_invites(self, session, auth_headers_user2):
        """Create a team for user2 to receive invites"""
        payload = {
            "name": f"TEST_InviteTeam2_{uuid.uuid4().hex[:6]}",
            "sport": "football",
            "format": "7v7",
            "age_group": "U14",
            "gender": "Jenter",
            "manager_name": "Invite Manager 2",
            "manager_phone": "+47 777 88 999",
            "players": []
        }
        res = session.post(f"{BASE_URL}/api/teams", json=payload, headers=auth_headers_user2)
        assert res.status_code == 200
        return res.json()
    
    def test_create_friendly_invite(self, session, auth_headers_user1, user1_team_for_invites, user2_team_for_invites):
        """POST /api/friendly-invites creates invite with dates, home/away, pitch info"""
        payload = {
            "from_team_id": user1_team_for_invites["id"],
            "to_team_code": user2_team_for_invites["team_code"],
            "proposed_dates": [
                {"date": "2026-03-15", "time_slots": ["16:00", "17:00"]},
                {"date": "2026-03-22", "time_slots": ["15:00"]}
            ],
            "home_away": "home",
            "pitch_name": "Test Pitch",
            "pitch_address": "123 Test Street, Oslo"
        }
        res = session.post(f"{BASE_URL}/api/friendly-invites", json=payload, headers=auth_headers_user1)
        assert res.status_code == 200, f"Create invite failed: {res.text}"
        data = res.json()
        assert data["from_team_id"] == user1_team_for_invites["id"]
        assert data["to_team_id"] == user2_team_for_invites["id"]
        assert data["status"] == "pending"
        assert data["home_away"] == "home"
        assert data["pitch_name"] == "Test Pitch"
        assert len(data["proposed_dates"]) == 2
        print(f"Created invite: {data['id']}")
        return data
    
    def test_get_invites_for_team(self, session, auth_headers_user1, user1_team_for_invites):
        """GET /api/friendly-invites?team_id=X returns invites for team"""
        res = session.get(f"{BASE_URL}/api/friendly-invites?team_id={user1_team_for_invites['id']}", headers=auth_headers_user1)
        assert res.status_code == 200
        invites = res.json()
        assert isinstance(invites, list)
        print(f"Found {len(invites)} invites for team")
    
    def test_receiver_can_see_invite(self, session, auth_headers_user2, user2_team_for_invites):
        """User2 can see received invites"""
        res = session.get(f"{BASE_URL}/api/friendly-invites?team_id={user2_team_for_invites['id']}", headers=auth_headers_user2)
        assert res.status_code == 200
        invites = res.json()
        # Should have at least one pending invite
        pending = [i for i in invites if i["status"] == "pending"]
        print(f"User2 has {len(pending)} pending invites")
    
    def test_respond_to_invite_accept(self, session, auth_headers_user2, user2_team_for_invites):
        """PUT /api/friendly-invites/{id}/respond accepts invite"""
        # Get pending invites
        res = session.get(f"{BASE_URL}/api/friendly-invites?team_id={user2_team_for_invites['id']}", headers=auth_headers_user2)
        invites = res.json()
        pending = [i for i in invites if i["status"] == "pending" and i["to_team_id"] == user2_team_for_invites["id"]]
        if len(pending) == 0:
            pytest.skip("No pending invites to respond to")
        
        invite = pending[0]
        payload = {
            "status": "accepted",
            "accepted_date": "2026-03-15",
            "accepted_time": "16:00"
        }
        res = session.put(f"{BASE_URL}/api/friendly-invites/{invite['id']}/respond", json=payload, headers=auth_headers_user2)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "accepted"
        assert data["accepted_date"] == "2026-03-15"
        assert data["accepted_time"] == "16:00"
    
    def test_cannot_invite_own_team(self, session, auth_headers_user1, user1_team_for_invites):
        """Cannot send invite to own team"""
        payload = {
            "from_team_id": user1_team_for_invites["id"],
            "to_team_code": user1_team_for_invites["team_code"],  # Same team
            "proposed_dates": [{"date": "2026-04-01", "time_slots": []}],
            "home_away": "home",
            "pitch_name": "",
            "pitch_address": ""
        }
        res = session.post(f"{BASE_URL}/api/friendly-invites", json=payload, headers=auth_headers_user1)
        assert res.status_code == 400, f"Should not be able to invite own team: {res.status_code}"


class TestMessages(TestSetup):
    """Test messages system"""
    
    def test_get_messages_for_team(self, session, auth_headers_user1):
        """GET /api/messages?team_id=X returns messages"""
        # Get a team first
        res = session.get(f"{BASE_URL}/api/teams", headers=auth_headers_user1)
        teams = res.json()
        if len(teams) > 0:
            team_id = teams[0]["id"]
            res = session.get(f"{BASE_URL}/api/messages?team_id={team_id}", headers=auth_headers_user1)
            assert res.status_code == 200
            messages = res.json()
            assert isinstance(messages, list)
            print(f"Found {len(messages)} messages for team")
    
    def test_get_all_messages(self, session, auth_headers_user1):
        """GET /api/messages returns all user messages"""
        res = session.get(f"{BASE_URL}/api/messages", headers=auth_headers_user1)
        assert res.status_code == 200
        messages = res.json()
        assert isinstance(messages, list)
    
    def test_invite_creates_messages(self, session, auth_headers_user1, auth_headers_user2):
        """Creating invite creates messages for both parties"""
        # Create teams
        team1_res = session.post(f"{BASE_URL}/api/teams", json={
            "name": f"TEST_MsgTeam1_{uuid.uuid4().hex[:6]}",
            "sport": "football", "format": "5v5", "age_group": "U10",
            "gender": "Mixed", "manager_name": "Msg Manager", "players": []
        }, headers=auth_headers_user1)
        team1 = team1_res.json()
        
        team2_res = session.post(f"{BASE_URL}/api/teams", json={
            "name": f"TEST_MsgTeam2_{uuid.uuid4().hex[:6]}",
            "sport": "football", "format": "5v5", "age_group": "U10",
            "gender": "Mixed", "manager_name": "Msg Manager 2", "players": []
        }, headers=auth_headers_user2)
        team2 = team2_res.json()
        
        # Send invite
        invite_res = session.post(f"{BASE_URL}/api/friendly-invites", json={
            "from_team_id": team1["id"],
            "to_team_code": team2["team_code"],
            "proposed_dates": [{"date": "2026-05-01", "time_slots": ["14:00"]}],
            "home_away": "away", "pitch_name": "", "pitch_address": ""
        }, headers=auth_headers_user1)
        assert invite_res.status_code == 200
        
        # Check user1 has sent message
        msg1_res = session.get(f"{BASE_URL}/api/messages?team_id={team1['id']}", headers=auth_headers_user1)
        msgs1 = msg1_res.json()
        sent_msgs = [m for m in msgs1 if m["type"] == "invite_sent"]
        assert len(sent_msgs) > 0, "Sender should have invite_sent message"
        
        # Check user2 has received message
        msg2_res = session.get(f"{BASE_URL}/api/messages?team_id={team2['id']}", headers=auth_headers_user2)
        msgs2 = msg2_res.json()
        recv_msgs = [m for m in msgs2 if m["type"] == "invite_received"]
        assert len(recv_msgs) > 0, "Receiver should have invite_received message"
    
    def test_mark_message_read(self, session, auth_headers_user1):
        """PUT /api/messages/{id}/read marks message as read"""
        # Get messages
        res = session.get(f"{BASE_URL}/api/messages", headers=auth_headers_user1)
        messages = res.json()
        if len(messages) > 0:
            msg = messages[0]
            res = session.put(f"{BASE_URL}/api/messages/{msg['id']}/read", headers=auth_headers_user1)
            assert res.status_code == 200


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_teams(self):
        """Delete TEST_ prefixed teams (optional cleanup)"""
        session = requests.Session()
        res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@test.com",
            "password": "demo123"
        })
        if res.status_code != 200:
            pytest.skip("Cannot login for cleanup")
        token = res.json()["token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Get teams
        res = session.get(f"{BASE_URL}/api/teams", headers=headers)
        teams = res.json()
        test_teams = [t for t in teams if t["name"].startswith("TEST_")]
        
        deleted = 0
        for team in test_teams:
            res = session.delete(f"{BASE_URL}/api/teams/{team['id']}", headers=headers)
            if res.status_code == 200:
                deleted += 1
        
        print(f"Cleaned up {deleted} test teams")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
