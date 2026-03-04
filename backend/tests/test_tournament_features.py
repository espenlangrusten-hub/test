"""
Test Tournament Features - Iteration 27
Tests: Tournament Hub, Bracket Visualization, PDF Export, Tournament CRUD
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tournament-bracket-3.preview.emergentagent.com')

class TestTournamentFeatures:
    """Tests for tournament system features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication for all tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@test.com",
            "password": "demo123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data['token']
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.token}'
        }
    
    def test_list_tournaments(self):
        """Test GET /api/tournaments returns list of tournaments"""
        response = requests.get(f"{BASE_URL}/api/tournaments", headers=self.headers)
        assert response.status_code == 200
        tournaments = response.json()
        assert isinstance(tournaments, list)
        print(f"✓ Found {len(tournaments)} tournaments")
        
        # Verify at least one tournament exists
        assert len(tournaments) >= 1, "Expected at least one tournament"
    
    def test_list_tournaments_by_status(self):
        """Test filtering tournaments by status"""
        # Test ongoing
        response = requests.get(f"{BASE_URL}/api/tournaments?status=ongoing", headers=self.headers)
        assert response.status_code == 200
        ongoing = response.json()
        for t in ongoing:
            assert t.get('status') == 'ongoing', f"Expected ongoing, got {t.get('status')}"
        print(f"✓ Found {len(ongoing)} ongoing tournaments")
        
        # Test completed
        response = requests.get(f"{BASE_URL}/api/tournaments?status=completed", headers=self.headers)
        assert response.status_code == 200
        completed = response.json()
        for t in completed:
            assert t.get('status') == 'completed', f"Expected completed, got {t.get('status')}"
        print(f"✓ Found {len(completed)} completed tournaments")
    
    def test_get_completed_tournament_spring_cup(self):
        """Test GET /api/tournaments/{id} for Spring Cup 2026 (completed with bracket)"""
        # First find Spring Cup 2026
        response = requests.get(f"{BASE_URL}/api/tournaments?status=completed", headers=self.headers)
        assert response.status_code == 200
        tournaments = response.json()
        
        spring_cup = None
        for t in tournaments:
            if t.get('name') == 'Spring Cup 2026':
                spring_cup = t
                break
        
        assert spring_cup is not None, "Spring Cup 2026 not found in completed tournaments"
        
        # Get full tournament details
        response = requests.get(f"{BASE_URL}/api/tournaments/{spring_cup['id']}", headers=self.headers)
        assert response.status_code == 200
        tournament = response.json()
        
        # Verify bracket structure
        assert tournament.get('tournament_type') == 'knockout', "Expected knockout type"
        assert tournament.get('status') == 'completed', "Expected completed status"
        assert tournament.get('winner') == 'Bayern Munich', f"Expected Bayern Munich winner, got {tournament.get('winner')}"
        
        # Verify matches (bracket)
        matches = tournament.get('matches', [])
        assert len(matches) >= 3, f"Expected at least 3 matches (2 semis + 1 final), got {len(matches)}"
        
        # Check for Semi-Final and Final rounds
        rounds = set(m.get('round') for m in matches)
        assert 'Semi-Final' in rounds, "Missing Semi-Final round"
        assert 'Final' in rounds, "Missing Final round"
        
        # Verify Semi-Final matches
        semi_finals = [m for m in matches if m.get('round') == 'Semi-Final']
        assert len(semi_finals) == 2, f"Expected 2 semi-finals, got {len(semi_finals)}"
        for sf in semi_finals:
            assert sf.get('played') == True, "Semi-final should be played"
        
        # Verify Final match
        finals = [m for m in matches if m.get('round') == 'Final']
        assert len(finals) >= 1, "Expected at least 1 final match"
        final = finals[0]
        assert final.get('played') == True, "Final should be played"
        assert final.get('home_team') == 'Bayern Munich' or final.get('away_team') == 'Bayern Munich', "Bayern Munich should be in final"
        
        print(f"✓ Spring Cup 2026 bracket verified - Winner: {tournament.get('winner')}")
        print(f"  Semi-Finals: {len(semi_finals)}, Finals: {len(finals)}")
    
    def test_tournament_pdf_export(self):
        """Test GET /api/tournaments/{id}/pdf returns valid PDF"""
        # Get Spring Cup tournament
        response = requests.get(f"{BASE_URL}/api/tournaments?status=completed", headers=self.headers)
        tournaments = response.json()
        
        spring_cup = None
        for t in tournaments:
            if t.get('name') == 'Spring Cup 2026':
                spring_cup = t
                break
        
        assert spring_cup is not None, "Spring Cup 2026 not found"
        
        # Request PDF
        response = requests.get(f"{BASE_URL}/api/tournaments/{spring_cup['id']}/pdf", headers=self.headers)
        
        assert response.status_code == 200, f"PDF request failed with {response.status_code}: {response.text[:100]}"
        assert response.headers.get('content-type') == 'application/pdf', f"Expected application/pdf, got {response.headers.get('content-type')}"
        
        # Verify Content-Disposition header for download
        content_disposition = response.headers.get('content-disposition', '')
        assert 'attachment' in content_disposition, "Expected attachment in Content-Disposition"
        assert '.pdf' in content_disposition, "Expected .pdf in filename"
        
        # Verify PDF content starts with PDF magic bytes (%PDF-)
        assert response.content[:4] == b'%PDF', f"Expected PDF magic bytes, got {response.content[:10]}"
        
        print(f"✓ PDF export working - Size: {len(response.content)} bytes")
        print(f"  Content-Disposition: {content_disposition}")
    
    def test_create_knockout_tournament(self):
        """Test creating a new knockout tournament"""
        tournament_name = "TEST_Playoffs_2026"
        
        payload = {
            "name": tournament_name,
            "format": "11v11",
            "tournament_type": "knockout",
            "start_date": "2026-05-01",
            "end_date": "2026-05-15",
            "teams": [
                {"name": "Alpha FC", "team_id": "", "from_network": False},
                {"name": "Beta United", "team_id": "", "from_network": False},
                {"name": "Gamma City", "team_id": "", "from_network": False},
                {"name": "Delta Town", "team_id": "", "from_network": False}
            ],
            "groups_count": 2,
            "matches_per_pair": 1
        }
        
        response = requests.post(f"{BASE_URL}/api/tournaments", headers=self.headers, json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        tournament = response.json()
        assert tournament.get('name') == tournament_name
        assert tournament.get('tournament_type') == 'knockout'
        assert tournament.get('status') == 'ongoing'
        assert len(tournament.get('teams', [])) == 4
        
        # Verify fixtures auto-generated
        matches = tournament.get('matches', [])
        assert len(matches) >= 2, f"Expected at least 2 semi-final matches, got {len(matches)}"
        
        # Verify Semi-Final round created
        round_names = set(m.get('round') for m in matches)
        assert 'Semi-Final' in round_names, f"Expected Semi-Final round, got {round_names}"
        
        print(f"✓ Created tournament: {tournament_name}")
        print(f"  Matches generated: {len(matches)}")
        print(f"  Rounds: {round_names}")
        
        # Cleanup
        tournament_id = tournament.get('id')
        if tournament_id:
            requests.delete(f"{BASE_URL}/api/tournaments/{tournament_id}", headers=self.headers)
            print(f"  ✓ Cleaned up test tournament")
    
    def test_enter_match_result(self):
        """Test entering a result for a tournament match"""
        # Create a test tournament
        payload = {
            "name": "TEST_Result_Tournament",
            "format": "5v5",
            "tournament_type": "knockout",
            "teams": [
                {"name": "Red Team", "team_id": "", "from_network": False},
                {"name": "Blue Team", "team_id": "", "from_network": False},
                {"name": "Green Team", "team_id": "", "from_network": False},
                {"name": "Yellow Team", "team_id": "", "from_network": False}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/tournaments", headers=self.headers, json=payload)
        assert response.status_code == 200
        tournament = response.json()
        tournament_id = tournament['id']
        
        try:
            # Get an unplayed match
            matches = tournament.get('matches', [])
            unplayed = [m for m in matches if not m.get('played')]
            assert len(unplayed) > 0, "No unplayed matches found"
            
            match_to_play = unplayed[0]
            match_id = match_to_play['id']
            
            # Submit result
            result_payload = {
                "home_score": 3,
                "away_score": 1
            }
            
            response = requests.put(
                f"{BASE_URL}/api/tournaments/{tournament_id}/result/{match_id}",
                headers=self.headers,
                json=result_payload
            )
            assert response.status_code == 200, f"Submit result failed: {response.text}"
            
            updated = response.json()
            
            # Verify result was recorded
            updated_matches = updated.get('matches', [])
            played_match = next((m for m in updated_matches if m['id'] == match_id), None)
            assert played_match is not None
            assert played_match.get('played') == True
            assert played_match.get('home_score') == 3
            assert played_match.get('away_score') == 1
            
            print(f"✓ Match result recorded: {match_to_play['home_team']} 3 - 1 {match_to_play['away_team']}")
            
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/tournaments/{tournament_id}", headers=self.headers)
            print(f"  ✓ Cleaned up test tournament")
    
    def test_tournament_404_for_invalid_id(self):
        """Test that invalid tournament ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/tournaments/invalid-id-12345", headers=self.headers)
        assert response.status_code == 404
        print("✓ Invalid tournament ID returns 404")
    
    def test_pdf_404_for_invalid_tournament(self):
        """Test that PDF export returns 404 for invalid tournament"""
        response = requests.get(f"{BASE_URL}/api/tournaments/invalid-id-12345/pdf", headers=self.headers)
        assert response.status_code == 404
        print("✓ PDF for invalid tournament returns 404")


class TestTeamTournamentAccess:
    """Test accessing tournament from team page Quick Actions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@test.com",
            "password": "demo123"
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data['token']
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.token}'
        }
    
    def test_teams_exist(self):
        """Verify teams exist for testing team page navigation"""
        response = requests.get(f"{BASE_URL}/api/teams", headers=self.headers)
        assert response.status_code == 200
        teams = response.json()
        assert len(teams) >= 1, "Expected at least one team"
        
        # Check team has required fields
        team = teams[0]
        assert 'id' in team
        assert 'name' in team
        print(f"✓ Found {len(teams)} teams - First: {team.get('name')}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
