"""
Test Direct Messages API - specifically the DELETE conversation endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@test.com"
TEST_PASSWORD = "demo123"
OTHER_USER_ID = "4e1080dd-06ee-48ce-b66d-b248406b27fc"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data["token"], data["user_id"]

@pytest.fixture
def api_client(auth_token):
    """Shared requests session with auth header"""
    token, user_id = auth_token
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    })
    return session, user_id


class TestDirectMessagesAPI:
    """Test Direct Messages endpoints"""
    
    def test_get_conversations(self, api_client):
        """Test GET /api/direct-messages/conversations - should return conversation list"""
        session, user_id = api_client
        response = session.get(f"{BASE_URL}/api/direct-messages/conversations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} conversations")
    
    def test_send_direct_message(self, api_client):
        """Test POST /api/direct-messages - send a message to create/update conversation"""
        session, user_id = api_client
        
        # Get teams first
        teams_resp = session.get(f"{BASE_URL}/api/teams")
        assert teams_resp.status_code == 200
        teams = teams_resp.json()
        assert len(teams) > 0, "No teams found for user"
        my_team_id = teams[0]["id"]
        
        # Send message
        payload = {
            "to_user_id": OTHER_USER_ID,
            "from_team_id": my_team_id,
            "to_team_id": "e10eebf8-2f7b-42ce-9371-f38664702140",
            "content": "TEST_direct_message_for_deletion_test"
        }
        response = session.post(f"{BASE_URL}/api/direct-messages", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["content"] == payload["content"]
        print(f"Created message ID: {data['id']}")
        return data["id"]
    
    def test_get_conversation_messages(self, api_client):
        """Test GET /api/direct-messages/conversation/{other_user_id}"""
        session, user_id = api_client
        response = session.get(f"{BASE_URL}/api/direct-messages/conversation/{OTHER_USER_ID}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Conversation has {len(data)} messages")
    
    def test_delete_conversation(self, api_client):
        """Test DELETE /api/direct-messages/conversation/{other_user_id} - deletes all messages in conversation"""
        session, user_id = api_client
        
        # First ensure we have a conversation
        # Send a test message first
        teams_resp = session.get(f"{BASE_URL}/api/teams")
        teams = teams_resp.json()
        my_team_id = teams[0]["id"] if teams else ""
        
        payload = {
            "to_user_id": OTHER_USER_ID,
            "from_team_id": my_team_id,
            "to_team_id": "e10eebf8-2f7b-42ce-9371-f38664702140",
            "content": "TEST_message_before_delete_test"
        }
        session.post(f"{BASE_URL}/api/direct-messages", json=payload)
        
        # Now delete the entire conversation
        response = session.delete(f"{BASE_URL}/api/direct-messages/conversation/{OTHER_USER_ID}")
        assert response.status_code == 200
        data = response.json()
        assert "deleted" in data
        deleted_count = data["deleted"]
        print(f"Deleted {deleted_count} messages from conversation")
        
        # Verify conversation is empty
        verify_resp = session.get(f"{BASE_URL}/api/direct-messages/conversation/{OTHER_USER_ID}")
        assert verify_resp.status_code == 200
        messages = verify_resp.json()
        assert len(messages) == 0, f"Expected empty conversation but found {len(messages)} messages"
        print("Conversation is now empty - delete verified")
    
    def test_delete_conversation_returns_count(self, api_client):
        """Test that DELETE conversation returns the count of deleted messages"""
        session, user_id = api_client
        
        # Create 3 test messages
        teams_resp = session.get(f"{BASE_URL}/api/teams")
        teams = teams_resp.json()
        my_team_id = teams[0]["id"] if teams else ""
        
        for i in range(3):
            payload = {
                "to_user_id": OTHER_USER_ID,
                "from_team_id": my_team_id,
                "to_team_id": "e10eebf8-2f7b-42ce-9371-f38664702140",
                "content": f"TEST_message_{i}_for_count_test"
            }
            session.post(f"{BASE_URL}/api/direct-messages", json=payload)
        
        # Delete all
        response = session.delete(f"{BASE_URL}/api/direct-messages/conversation/{OTHER_USER_ID}")
        assert response.status_code == 200
        data = response.json()
        assert data["deleted"] >= 3, f"Expected at least 3 deleted, got {data['deleted']}"
        print(f"Delete returned count: {data['deleted']}")
    
    def test_delete_nonexistent_conversation(self, api_client):
        """Test DELETE on a conversation with no messages"""
        session, user_id = api_client
        
        # First ensure conversation is empty
        session.delete(f"{BASE_URL}/api/direct-messages/conversation/{OTHER_USER_ID}")
        
        # Try to delete again - should return 0 deleted
        response = session.delete(f"{BASE_URL}/api/direct-messages/conversation/{OTHER_USER_ID}")
        assert response.status_code == 200
        data = response.json()
        assert data["deleted"] == 0
        print("Delete on empty conversation returned 0 as expected")


class TestConversationCleanup:
    """Cleanup after tests"""
    
    def test_restore_test_conversation(self, api_client):
        """Re-create conversation for future testing"""
        session, user_id = api_client
        
        teams_resp = session.get(f"{BASE_URL}/api/teams")
        teams = teams_resp.json()
        my_team_id = teams[0]["id"] if teams else ""
        
        payload = {
            "to_user_id": OTHER_USER_ID,
            "from_team_id": my_team_id,
            "to_team_id": "e10eebf8-2f7b-42ce-9371-f38664702140",
            "content": "Hello! Testing the new messenger."
        }
        response = session.post(f"{BASE_URL}/api/direct-messages", json=payload)
        assert response.status_code == 200
        print("Restored test conversation for future testing")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
