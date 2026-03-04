"""
Backend API tests for Country Selection feature (P0)
Tests: POST /api/teams with country, PUT /api/teams/{id} with country, GET /api/teams returns country
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://league-organizer-7.preview.emergentagent.com').rstrip('/')

class TestCountryFeature:
    """Country field API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        # Use demo credentials
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@test.com",
            "password": "demo123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        # If demo user doesn't exist, register
        unique_email = f"test_country_{uuid.uuid4().hex[:8]}@example.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123",
            "name": "Country Test User"
        })
        if reg_response.status_code in [200, 201]:
            return reg_response.json().get("token")
        pytest.skip("Unable to authenticate")

    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Create headers with auth token"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        }
    
    def test_create_team_with_country_norway(self, auth_headers):
        """Test POST /api/teams with country='NO' (Norway)"""
        team_data = {
            "name": f"TEST_Norway_Team_{uuid.uuid4().hex[:6]}",
            "sport": "football",
            "format": "11v11",
            "age_group": "U15",
            "country": "NO",  # Norway
            "players": [
                {"id": f"p{i}", "name": f"Player {i}", "number": i, "position": "CM", "is_captain": False, "is_starter": True, "available": True, "set_piece_roles": []}
                for i in range(1, 12)
            ],
            "formation": "4-3-3",
            "tactic_name": "Test Tactic"
        }
        
        response = requests.post(f"{BASE_URL}/api/teams", json=team_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain team id"
        assert data["country"] == "NO", f"Expected country 'NO', got '{data.get('country')}'"
        assert data["name"] == team_data["name"]
        
        # Store team ID for cleanup
        self.__class__.test_team_id = data["id"]
        print(f"✓ Created team with country 'NO': {data['id']}")
        return data
    
    def test_create_team_with_country_england(self, auth_headers):
        """Test POST /api/teams with country='GB-ENG' (England)"""
        team_data = {
            "name": f"TEST_England_Team_{uuid.uuid4().hex[:6]}",
            "sport": "football",
            "format": "11v11",
            "age_group": "Senior",
            "country": "GB-ENG",  # England
            "players": [
                {"id": f"p{i}", "name": f"England Player {i}", "number": i, "position": "GK" if i == 1 else "ST", "is_captain": i == 10, "is_starter": True, "available": True, "set_piece_roles": []}
                for i in range(1, 12)
            ],
            "formation": "4-4-2",
            "tactic_name": ""
        }
        
        response = requests.post(f"{BASE_URL}/api/teams", json=team_data, headers=auth_headers)
        assert response.status_code in [200, 201]
        
        data = response.json()
        assert data["country"] == "GB-ENG", f"Expected 'GB-ENG', got '{data.get('country')}'"
        
        self.__class__.england_team_id = data["id"]
        print(f"✓ Created team with country 'GB-ENG': {data['id']}")
        return data
    
    def test_create_team_without_country(self, auth_headers):
        """Test POST /api/teams without country field (should default to empty string)"""
        team_data = {
            "name": f"TEST_NoCountry_Team_{uuid.uuid4().hex[:6]}",
            "sport": "futsal",
            "format": "5v5",
            "age_group": "U12",
            "players": [
                {"id": f"p{i}", "name": f"Futsal Player {i}", "number": i, "position": "GK" if i == 1 else "Pivot", "is_captain": False, "is_starter": True, "available": True, "set_piece_roles": []}
                for i in range(1, 6)
            ],
            "formation": "",
            "tactic_name": ""
        }
        
        response = requests.post(f"{BASE_URL}/api/teams", json=team_data, headers=auth_headers)
        assert response.status_code in [200, 201]
        
        data = response.json()
        # Country should be empty string by default
        assert data.get("country", "") == "", f"Expected empty country, got '{data.get('country')}'"
        
        self.__class__.no_country_team_id = data["id"]
        print(f"✓ Created team without country: {data['id']}")
        return data
    
    def test_get_teams_returns_country_field(self, auth_headers):
        """Test GET /api/teams returns country field for all teams"""
        response = requests.get(f"{BASE_URL}/api/teams", headers=auth_headers)
        assert response.status_code == 200
        
        teams = response.json()
        assert isinstance(teams, list), "Response should be a list of teams"
        
        # Check that all teams have country field
        for team in teams:
            assert "country" in team, f"Team {team.get('name')} missing 'country' field"
            print(f"  Team: {team.get('name')} - Country: '{team.get('country')}'")
        
        # Find our test teams
        test_teams = [t for t in teams if t.get("name", "").startswith("TEST_")]
        assert len(test_teams) >= 1, "Should find at least one test team"
        print(f"✓ GET /api/teams returns country field for {len(teams)} teams")
    
    def test_get_single_team_returns_country(self, auth_headers):
        """Test GET /api/teams/{id} returns country field"""
        team_id = getattr(self.__class__, 'test_team_id', None)
        if not team_id:
            pytest.skip("No test team available")
        
        response = requests.get(f"{BASE_URL}/api/teams/{team_id}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "country" in data, "Single team GET should include country"
        assert data["country"] == "NO", f"Expected 'NO', got '{data.get('country')}'"
        print(f"✓ GET /api/teams/{team_id} returns country: '{data['country']}'")
    
    def test_update_team_country_to_sweden(self, auth_headers):
        """Test PUT /api/teams/{id} to change country from NO to SE"""
        team_id = getattr(self.__class__, 'test_team_id', None)
        if not team_id:
            pytest.skip("No test team available")
        
        # First get current team data
        get_response = requests.get(f"{BASE_URL}/api/teams/{team_id}", headers=auth_headers)
        assert get_response.status_code == 200
        current_team = get_response.json()
        
        # Update with new country
        update_data = {
            "name": current_team["name"],
            "sport": current_team["sport"],
            "format": current_team["format"],
            "age_group": current_team.get("age_group", ""),
            "country": "SE",  # Change from NO to SE (Sweden)
            "players": current_team["players"],
            "formation": current_team.get("formation", ""),
            "tactic_name": current_team.get("tactic_name", "")
        }
        
        response = requests.put(f"{BASE_URL}/api/teams/{team_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["country"] == "SE", f"Expected 'SE', got '{data.get('country')}'"
        
        # Verify with GET
        verify_response = requests.get(f"{BASE_URL}/api/teams/{team_id}", headers=auth_headers)
        verify_data = verify_response.json()
        assert verify_data["country"] == "SE", "Country change should persist in database"
        print(f"✓ Updated team country from 'NO' to 'SE' successfully")
    
    def test_update_team_country_to_germany(self, auth_headers):
        """Test PUT /api/teams/{id} to change country to DE (Germany)"""
        team_id = getattr(self.__class__, 'england_team_id', None)
        if not team_id:
            pytest.skip("No England test team available")
        
        get_response = requests.get(f"{BASE_URL}/api/teams/{team_id}", headers=auth_headers)
        assert get_response.status_code == 200
        current_team = get_response.json()
        
        update_data = {
            "name": current_team["name"],
            "sport": current_team["sport"],
            "format": current_team["format"],
            "age_group": current_team.get("age_group", ""),
            "country": "DE",  # Change to Germany
            "players": current_team["players"],
            "formation": current_team.get("formation", ""),
            "tactic_name": current_team.get("tactic_name", "")
        }
        
        response = requests.put(f"{BASE_URL}/api/teams/{team_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["country"] == "DE", f"Expected 'DE', got '{data.get('country')}'"
        print(f"✓ Updated team country from 'GB-ENG' to 'DE' successfully")
    
    def test_update_team_clear_country(self, auth_headers):
        """Test PUT /api/teams/{id} to clear country field"""
        team_id = getattr(self.__class__, 'no_country_team_id', None)
        if not team_id:
            pytest.skip("No no-country test team available")
        
        get_response = requests.get(f"{BASE_URL}/api/teams/{team_id}", headers=auth_headers)
        assert get_response.status_code == 200
        current_team = get_response.json()
        
        # First set a country
        update_data = {
            "name": current_team["name"],
            "sport": current_team["sport"],
            "format": current_team["format"],
            "age_group": current_team.get("age_group", ""),
            "country": "FI",  # Finland
            "players": current_team["players"],
            "formation": current_team.get("formation", ""),
            "tactic_name": current_team.get("tactic_name", "")
        }
        
        response = requests.put(f"{BASE_URL}/api/teams/{team_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["country"] == "FI"
        
        # Now clear it
        update_data["country"] = ""
        response = requests.put(f"{BASE_URL}/api/teams/{team_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("country", "") == "", f"Expected empty country, got '{data.get('country')}'"
        print("✓ Successfully cleared country field")

    @pytest.fixture(scope="class", autouse=True)
    def cleanup_test_teams(self, auth_headers, request):
        """Cleanup test teams after all tests complete"""
        yield
        # Cleanup
        for team_id_attr in ['test_team_id', 'england_team_id', 'no_country_team_id']:
            team_id = getattr(self.__class__, team_id_attr, None)
            if team_id:
                try:
                    requests.delete(f"{BASE_URL}/api/teams/{team_id}", headers=auth_headers)
                    print(f"Cleaned up test team: {team_id}")
                except:
                    pass


class TestAllCountryCodes:
    """Test all supported country codes"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@test.com",
            "password": "demo123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        unique_email = f"test_allcountries_{uuid.uuid4().hex[:8]}@example.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123",
            "name": "All Countries Test"
        })
        if reg_response.status_code in [200, 201]:
            return reg_response.json().get("token")
        pytest.skip("Unable to authenticate")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        }
    
    @pytest.mark.parametrize("country_code,country_name", [
        ("NO", "Norway"),
        ("SE", "Sweden"),
        ("DK", "Denmark"),
        ("FI", "Finland"),
        ("GB-ENG", "England"),
        ("GB-SCT", "Scotland"),
        ("IE", "Ireland"),
        ("GB-WLS", "Wales"),
        ("DE", "Germany"),
        ("NL", "Netherlands"),
        ("BE", "Belgium"),
        ("FR", "France"),
        ("ES", "Spain"),
        ("IT", "Italy"),
        ("PT", "Portugal"),
    ])
    def test_create_team_with_each_country(self, auth_headers, country_code, country_name):
        """Test creating team with each supported country code"""
        team_data = {
            "name": f"TEST_{country_code}_Team",
            "sport": "football",
            "format": "11v11",
            "country": country_code,
            "players": [],
            "formation": "",
            "tactic_name": ""
        }
        
        response = requests.post(f"{BASE_URL}/api/teams", json=team_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed to create team for {country_name}: {response.text}"
        
        data = response.json()
        assert data["country"] == country_code, f"Expected '{country_code}', got '{data.get('country')}'"
        
        # Cleanup
        team_id = data.get("id")
        if team_id:
            requests.delete(f"{BASE_URL}/api/teams/{team_id}", headers=auth_headers)
        
        print(f"✓ {country_name} ({country_code}) works correctly")
