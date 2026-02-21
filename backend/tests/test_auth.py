"""
Auth Tests for Football/Futsal Coaching App
Tests: Registration, Login, JWT Token, Protected routes, Data isolation
"""
import pytest
import requests
import os
import uuid
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
def unique_email():
    """Generate a unique email for each test"""
    return f"test_{uuid.uuid4().hex[:8]}@test.com"


@pytest.fixture
def auth_user_a(api_client):
    """Create User A for testing - returns token and user data"""
    email = f"test_userA_{uuid.uuid4().hex[:8]}@test.com"
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "test123",
        "name": "Coach A"
    })
    if response.status_code == 409:
        # User exists, login instead
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "test123"
        })
    
    data = response.json()
    return {
        "token": data["token"],
        "user_id": data["user_id"],
        "email": data["email"],
        "name": data["name"]
    }


@pytest.fixture
def auth_user_b(api_client):
    """Create User B for testing - returns token and user data"""
    email = f"test_userB_{uuid.uuid4().hex[:8]}@test.com"
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "test456",
        "name": "Coach B"
    })
    if response.status_code == 409:
        # User exists, login instead
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "test456"
        })
    
    data = response.json()
    return {
        "token": data["token"],
        "user_id": data["user_id"],
        "email": data["email"],
        "name": data["name"]
    }


@pytest.fixture
def authenticated_client_a(api_client, auth_user_a):
    """Session with User A auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_user_a['token']}"})
    return api_client


class TestAuthEndpoints:
    """Auth endpoint tests - /api/auth/*"""
    
    def test_register_success(self, api_client, unique_email):
        """Test successful registration"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "password123",
            "name": "Test Coach"
        })
        
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user_id" in data
        assert data["email"] == unique_email.lower()
        assert data["name"] == "Test Coach"
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0
    
    def test_register_duplicate_email(self, api_client, auth_user_a):
        """Test registration with already registered email returns 409"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": auth_user_a["email"],
            "password": "differentpass",
            "name": "Different Name"
        })
        
        assert response.status_code == 409
        data = response.json()
        assert "already registered" in data["detail"].lower()
    
    def test_register_empty_email(self, api_client):
        """Test registration with empty email returns 400"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": "",
            "password": "password123",
            "name": "Test"
        })
        
        assert response.status_code == 400
    
    def test_register_empty_password(self, api_client, unique_email):
        """Test registration with empty password returns 400"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "",
            "name": "Test"
        })
        
        assert response.status_code == 400
    
    def test_login_success(self, api_client, auth_user_a):
        """Test successful login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": auth_user_a["email"],
            "password": "test123"
        })
        
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert data["user_id"] == auth_user_a["user_id"]
        assert data["email"] == auth_user_a["email"]
        assert data["name"] == auth_user_a["name"]
    
    def test_login_wrong_password(self, api_client, auth_user_a):
        """Test login with wrong password returns 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": auth_user_a["email"],
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "invalid" in data["detail"].lower()
    
    def test_login_nonexistent_user(self, api_client):
        """Test login with non-existent email returns 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "anypassword"
        })
        
        assert response.status_code == 401
    
    def test_get_me_authenticated(self, api_client, auth_user_a):
        """Test /api/auth/me returns user info when authenticated"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_user_a['token']}"}
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == auth_user_a["user_id"]
        assert data["email"] == auth_user_a["email"]
        assert "password_hash" not in data  # Should not expose password
    
    def test_get_me_unauthenticated(self, api_client):
        """Test /api/auth/me returns 401 without token"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401
    
    def test_get_me_invalid_token(self, api_client):
        """Test /api/auth/me returns 401 with invalid token"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid-token-here"}
        )
        
        assert response.status_code == 401


class TestAPIProtection:
    """Test that protected routes require authentication"""
    
    def test_teams_get_requires_auth(self, api_client):
        """Test GET /api/teams returns 401 without auth"""
        response = api_client.get(f"{BASE_URL}/api/teams")
        assert response.status_code == 401
    
    def test_teams_post_requires_auth(self, api_client):
        """Test POST /api/teams returns 401 without auth"""
        response = api_client.post(f"{BASE_URL}/api/teams", json={
            "name": "Test Team",
            "sport": "football",
            "format": "11v11"
        })
        assert response.status_code == 401
    
    def test_matches_get_requires_auth(self, api_client):
        """Test GET /api/matches returns 401 without auth"""
        response = api_client.get(f"{BASE_URL}/api/matches")
        assert response.status_code == 401
    
    def test_matches_post_requires_auth(self, api_client):
        """Test POST /api/matches returns 401 without auth"""
        response = api_client.post(f"{BASE_URL}/api/matches", json={
            "team_id": "some-id",
            "opponent": "Test"
        })
        assert response.status_code == 401
    
    def test_player_stats_requires_auth(self, api_client):
        """Test GET /api/teams/{id}/player-stats requires auth"""
        response = api_client.get(f"{BASE_URL}/api/teams/some-id/player-stats")
        assert response.status_code == 401
    
    def test_player_notes_get_requires_auth(self, api_client):
        """Test GET /api/players/{id}/notes requires auth"""
        response = api_client.get(f"{BASE_URL}/api/players/some-id/notes")
        assert response.status_code == 401


class TestDataIsolation:
    """Test that users cannot access each other's data"""
    
    def test_user_a_cannot_see_user_b_teams(self, api_client, auth_user_a, auth_user_b):
        """Test User A cannot see User B's teams"""
        # User B creates a team
        response = api_client.post(
            f"{BASE_URL}/api/teams",
            headers={"Authorization": f"Bearer {auth_user_b['token']}"},
            json={
                "name": "TEST_UserB_Private_Team",
                "sport": "football",
                "format": "11v11",
                "players": [],
                "formation": "4-3-3",
                "tactic_name": "Test"
            }
        )
        assert response.status_code == 200
        team_b = response.json()
        
        # User A gets teams - should NOT see User B's team
        response = api_client.get(
            f"{BASE_URL}/api/teams",
            headers={"Authorization": f"Bearer {auth_user_a['token']}"}
        )
        assert response.status_code == 200
        teams_a = response.json()
        
        team_ids = [t["id"] for t in teams_a]
        assert team_b["id"] not in team_ids, "User A should NOT see User B's team"
        
        # Cleanup
        api_client.delete(
            f"{BASE_URL}/api/teams/{team_b['id']}",
            headers={"Authorization": f"Bearer {auth_user_b['token']}"}
        )
    
    def test_user_a_cannot_access_user_b_team_directly(self, api_client, auth_user_a, auth_user_b):
        """Test User A cannot access User B's team by ID"""
        # User B creates a team
        response = api_client.post(
            f"{BASE_URL}/api/teams",
            headers={"Authorization": f"Bearer {auth_user_b['token']}"},
            json={
                "name": "TEST_UserB_Direct_Access_Team",
                "sport": "football",
                "format": "11v11",
                "players": [],
                "formation": "",
                "tactic_name": ""
            }
        )
        assert response.status_code == 200
        team_b = response.json()
        
        # User A tries to access User B's team directly
        response = api_client.get(
            f"{BASE_URL}/api/teams/{team_b['id']}",
            headers={"Authorization": f"Bearer {auth_user_a['token']}"}
        )
        assert response.status_code == 404, "User A should get 404 for User B's team"
        
        # Cleanup
        api_client.delete(
            f"{BASE_URL}/api/teams/{team_b['id']}",
            headers={"Authorization": f"Bearer {auth_user_b['token']}"}
        )
    
    def test_user_a_cannot_update_user_b_team(self, api_client, auth_user_a, auth_user_b):
        """Test User A cannot update User B's team"""
        # User B creates a team
        response = api_client.post(
            f"{BASE_URL}/api/teams",
            headers={"Authorization": f"Bearer {auth_user_b['token']}"},
            json={
                "name": "TEST_UserB_Update_Team",
                "sport": "football",
                "format": "11v11",
                "players": [],
                "formation": "",
                "tactic_name": ""
            }
        )
        assert response.status_code == 200
        team_b = response.json()
        
        # User A tries to update User B's team
        response = api_client.put(
            f"{BASE_URL}/api/teams/{team_b['id']}",
            headers={"Authorization": f"Bearer {auth_user_a['token']}"},
            json={
                "name": "HACKED_Name",
                "sport": "football",
                "format": "11v11",
                "players": [],
                "formation": "",
                "tactic_name": ""
            }
        )
        assert response.status_code == 404, "User A should get 404 when trying to update User B's team"
        
        # Verify team wasn't changed
        response = api_client.get(
            f"{BASE_URL}/api/teams/{team_b['id']}",
            headers={"Authorization": f"Bearer {auth_user_b['token']}"}
        )
        team = response.json()
        assert team["name"] == "TEST_UserB_Update_Team", "Team should not be modified"
        
        # Cleanup
        api_client.delete(
            f"{BASE_URL}/api/teams/{team_b['id']}",
            headers={"Authorization": f"Bearer {auth_user_b['token']}"}
        )
    
    def test_user_a_cannot_delete_user_b_team(self, api_client, auth_user_a, auth_user_b):
        """Test User A cannot delete User B's team"""
        # User B creates a team
        response = api_client.post(
            f"{BASE_URL}/api/teams",
            headers={"Authorization": f"Bearer {auth_user_b['token']}"},
            json={
                "name": "TEST_UserB_Delete_Team",
                "sport": "football",
                "format": "11v11",
                "players": [],
                "formation": "",
                "tactic_name": ""
            }
        )
        assert response.status_code == 200
        team_b = response.json()
        
        # User A tries to delete User B's team
        response = api_client.delete(
            f"{BASE_URL}/api/teams/{team_b['id']}",
            headers={"Authorization": f"Bearer {auth_user_a['token']}"}
        )
        assert response.status_code == 404, "User A should get 404 when trying to delete User B's team"
        
        # Verify team still exists
        response = api_client.get(
            f"{BASE_URL}/api/teams/{team_b['id']}",
            headers={"Authorization": f"Bearer {auth_user_b['token']}"}
        )
        assert response.status_code == 200, "Team should still exist"
        
        # Cleanup
        api_client.delete(
            f"{BASE_URL}/api/teams/{team_b['id']}",
            headers={"Authorization": f"Bearer {auth_user_b['token']}"}
        )
    
    def test_match_isolation(self, api_client, auth_user_a, auth_user_b):
        """Test matches are isolated between users"""
        # User A creates a team and match
        team_resp = api_client.post(
            f"{BASE_URL}/api/teams",
            headers={"Authorization": f"Bearer {auth_user_a['token']}"},
            json={
                "name": "TEST_UserA_Match_Team",
                "sport": "football",
                "format": "11v11",
                "players": [],
                "formation": "",
                "tactic_name": ""
            }
        )
        team_a = team_resp.json()
        
        match_resp = api_client.post(
            f"{BASE_URL}/api/matches",
            headers={"Authorization": f"Bearer {auth_user_a['token']}"},
            json={
                "team_id": team_a["id"],
                "opponent": "TEST_Rival",
                "duration_minutes": 90,
                "starters": [],
                "subs": [],
                "sub_mode": "manual",
                "sub_plan": []
            }
        )
        match_a = match_resp.json()
        
        # User B gets matches - should NOT see User A's match
        response = api_client.get(
            f"{BASE_URL}/api/matches",
            headers={"Authorization": f"Bearer {auth_user_b['token']}"}
        )
        matches_b = response.json()
        
        match_ids = [m["id"] for m in matches_b]
        assert match_a["id"] not in match_ids, "User B should NOT see User A's match"
        
        # Cleanup
        api_client.delete(
            f"{BASE_URL}/api/matches/{match_a['id']}",
            headers={"Authorization": f"Bearer {auth_user_a['token']}"}
        )
        api_client.delete(
            f"{BASE_URL}/api/teams/{team_a['id']}",
            headers={"Authorization": f"Bearer {auth_user_a['token']}"}
        )


class TestAuthenticatedCRUD:
    """Test CRUD operations with authentication"""
    
    def test_create_and_get_team_authenticated(self, api_client, auth_user_a):
        """Test creating and getting team with auth"""
        # Create team
        response = api_client.post(
            f"{BASE_URL}/api/teams",
            headers={"Authorization": f"Bearer {auth_user_a['token']}"},
            json={
                "name": "TEST_Auth_Team",
                "sport": "football",
                "format": "11v11",
                "players": [],
                "formation": "4-4-2",
                "tactic_name": "Test"
            }
        )
        assert response.status_code == 200
        team = response.json()
        assert team["user_id"] == auth_user_a["user_id"]
        
        # Get team
        response = api_client.get(
            f"{BASE_URL}/api/teams/{team['id']}",
            headers={"Authorization": f"Bearer {auth_user_a['token']}"}
        )
        assert response.status_code == 200
        retrieved = response.json()
        assert retrieved["name"] == "TEST_Auth_Team"
        
        # Cleanup
        api_client.delete(
            f"{BASE_URL}/api/teams/{team['id']}",
            headers={"Authorization": f"Bearer {auth_user_a['token']}"}
        )
    
    def test_list_only_own_teams(self, api_client, auth_user_a):
        """Test listing teams returns only user's teams"""
        # Create team
        response = api_client.post(
            f"{BASE_URL}/api/teams",
            headers={"Authorization": f"Bearer {auth_user_a['token']}"},
            json={
                "name": "TEST_Own_Teams_Test",
                "sport": "futsal",
                "format": "5v5",
                "players": [],
                "formation": "",
                "tactic_name": ""
            }
        )
        team = response.json()
        
        # Get all teams
        response = api_client.get(
            f"{BASE_URL}/api/teams",
            headers={"Authorization": f"Bearer {auth_user_a['token']}"}
        )
        assert response.status_code == 200
        teams = response.json()
        
        # All teams should belong to the user
        for t in teams:
            assert t["user_id"] == auth_user_a["user_id"]
        
        # Cleanup
        api_client.delete(
            f"{BASE_URL}/api/teams/{team['id']}",
            headers={"Authorization": f"Bearer {auth_user_a['token']}"}
        )


class TestHealthEndpoint:
    """Health check should NOT require auth"""
    
    def test_health_no_auth_required(self, api_client):
        """Test health check works without authentication"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
