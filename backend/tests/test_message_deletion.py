"""
Test message deletion feature - DELETE /api/messages/{message_id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://team-management-hub-1.preview.emergentagent.com')

@pytest.fixture(scope="module")
def api_session():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_session):
    """Get authentication token for demo user"""
    response = api_session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "demo@test.com",
        "password": "demo123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def authenticated_session(api_session, auth_token):
    """Session with auth header"""
    api_session.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_session


class TestMessageDeletion:
    """Test DELETE /api/messages/{message_id} endpoint"""
    
    def test_get_messages(self, authenticated_session):
        """Get list of messages for authenticated user"""
        response = authenticated_session.get(f"{BASE_URL}/api/messages")
        assert response.status_code == 200
        messages = response.json()
        assert isinstance(messages, list)
        print(f"Found {len(messages)} messages")
        return messages
    
    def test_delete_message_success(self, authenticated_session):
        """Test deleting an existing message - should succeed"""
        # First get messages
        response = authenticated_session.get(f"{BASE_URL}/api/messages")
        assert response.status_code == 200
        messages = response.json()
        
        if len(messages) == 0:
            pytest.skip("No messages to delete")
        
        # Get the last message ID
        message_to_delete = messages[-1]
        message_id = message_to_delete["id"]
        print(f"Deleting message: {message_id} - {message_to_delete.get('title', 'No title')}")
        
        # Delete the message
        delete_response = authenticated_session.delete(f"{BASE_URL}/api/messages/{message_id}")
        assert delete_response.status_code == 200
        result = delete_response.json()
        assert "message" in result
        print(f"Delete response: {result}")
        
        # Verify message is gone
        verify_response = authenticated_session.get(f"{BASE_URL}/api/messages")
        assert verify_response.status_code == 200
        remaining = verify_response.json()
        remaining_ids = [m["id"] for m in remaining]
        assert message_id not in remaining_ids, "Message should be deleted"
        print(f"Message successfully deleted. Remaining: {len(remaining)} messages")
    
    def test_delete_message_not_found(self, authenticated_session):
        """Test deleting a non-existent message - should return 404"""
        fake_id = "non-existent-message-id-12345"
        response = authenticated_session.delete(f"{BASE_URL}/api/messages/{fake_id}")
        assert response.status_code == 404
        print(f"404 response as expected for non-existent message")
    
    def test_delete_message_unauthorized(self, api_session):
        """Test deleting without authentication - should return 401"""
        # Remove auth header temporarily
        session_without_auth = requests.Session()
        session_without_auth.headers.update({"Content-Type": "application/json"})
        
        response = session_without_auth.delete(f"{BASE_URL}/api/messages/any-message-id")
        assert response.status_code == 401
        print(f"401 response as expected for unauthorized request")


class TestNetworkEndpoint:
    """Test network endpoint for add-to-network feature"""
    
    def test_get_network(self, authenticated_session):
        """Get user's network list"""
        response = authenticated_session.get(f"{BASE_URL}/api/network")
        assert response.status_code == 200
        network = response.json()
        assert isinstance(network, list)
        print(f"Network has {len(network)} teams")
        for n in network:
            print(f"  - {n.get('friend_team_name', 'Unknown')} (#{n.get('friend_team_code', 'N/A')})")


class TestFriendlyInvitesWithOpponentDetails:
    """Test friendly invites return opponent details needed for expansion"""
    
    def test_get_friendly_invites_with_manager_details(self, authenticated_session):
        """Verify friendly invites include manager name and phone for opponent expansion"""
        response = authenticated_session.get(f"{BASE_URL}/api/friendly-invites")
        assert response.status_code == 200
        invites = response.json()
        
        print(f"Found {len(invites)} friendly invites")
        
        for inv in invites:
            # Check that opponent details fields exist
            assert "from_team_name" in inv
            assert "to_team_name" in inv
            assert "from_manager_name" in inv
            assert "from_manager_phone" in inv
            assert "to_manager_name" in inv
            assert "to_manager_phone" in inv
            assert "from_team_code" in inv
            assert "to_team_code" in inv
            
            print(f"Invite: {inv['from_team_name']} vs {inv['to_team_name']} - status: {inv['status']}")
            print(f"  From manager: {inv.get('from_manager_name', 'N/A')} ({inv.get('from_manager_phone', 'N/A')})")
            print(f"  To manager: {inv.get('to_manager_name', 'N/A')} ({inv.get('to_manager_phone', 'N/A')})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
