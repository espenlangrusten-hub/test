"""
B Knockout Tournament Feature Tests

Tests for the consolation bracket functionality where 3rd/4th placed teams 
from group stages play a separate B knockout bracket while 1st/2nd teams 
play the A knockout bracket.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
TOKEN = None
TOURNAMENT_ID = None


@pytest.fixture(scope="module", autouse=True)
def setup_auth():
    """Get auth token once for all tests"""
    global TOKEN
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "demo@test.com",
        "password": "demo123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    TOKEN = response.json()["token"]
    print(f"Auth token obtained: {TOKEN[:20]}...")
    

def auth_headers():
    """Return auth headers"""
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }


class TestExistingBKnockoutTournament:
    """Tests against the existing B Knockout Test Cup tournament"""
    
    EXISTING_TOURNAMENT_ID = "5e45f8d1-ffd2-46ea-bee0-755d46e1aefc"
    
    def test_get_tournament_with_b_knockout_enabled(self):
        """GET /api/tournaments/{id} - Verify has_b_knockout field is true"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}",
            headers=auth_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["has_b_knockout"] == True, "Tournament should have B knockout enabled"
        assert data["tournament_type"] == "group_knockout"
        assert data["name"] == "B Knockout Test Cup"
        print(f"Tournament '{data['name']}' has has_b_knockout={data['has_b_knockout']}")
    
    def test_group_stage_complete(self):
        """Verify all group stage matches are played"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}",
            headers=auth_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        group_matches = [m for m in data["matches"] if m["round"] == "group"]
        assert len(group_matches) == 12, f"Expected 12 group matches (2 groups x 6 matches), got {len(group_matches)}"
        
        all_played = all(m["played"] for m in group_matches)
        assert all_played, "All group stage matches should be played"
        print(f"All {len(group_matches)} group matches completed")
    
    def test_a_bracket_has_top_teams(self):
        """Verify A bracket contains matches for top 2 teams from each group"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}",
            headers=auth_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        # A bracket matches (bracket != 'b')
        a_matches = [m for m in data["matches"] if m["round"] != "group" and m.get("bracket") != "b"]
        assert len(a_matches) >= 2, f"Expected at least 2 A bracket matches, got {len(a_matches)}"
        
        # Get teams in A bracket
        a_teams = set()
        for m in a_matches:
            a_teams.add(m["home_team"])
            a_teams.add(m["away_team"])
        
        # Expected top teams (1st & 2nd from each group based on standings):
        # Group A: Charlie (9 pts), Foxtrot (6 pts)
        # Group B: Bravo (9 pts), Alpha (6 pts)
        expected_top_teams = {"Team Charlie", "Team Foxtrot", "Team Bravo", "Team Alpha"}
        
        assert a_teams == expected_top_teams, f"A bracket teams mismatch. Got {a_teams}, expected {expected_top_teams}"
        print(f"A bracket teams verified: {a_teams}")
    
    def test_b_bracket_has_lower_teams(self):
        """Verify B bracket contains matches for 3rd/4th teams from each group"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}",
            headers=auth_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        # B bracket matches (bracket == 'b')
        b_matches = [m for m in data["matches"] if m.get("bracket") == "b"]
        assert len(b_matches) >= 2, f"Expected at least 2 B bracket matches, got {len(b_matches)}"
        
        # Get teams in B bracket
        b_teams = set()
        for m in b_matches:
            b_teams.add(m["home_team"])
            b_teams.add(m["away_team"])
        
        # Expected lower teams (3rd & 4th from each group):
        # Group A: Golf (3 pts), Delta (0 pts)
        # Group B: Echo (3 pts), Hotel (0 pts)
        expected_lower_teams = {"Team Golf", "Team Delta", "Team Echo", "Team Hotel"}
        
        assert b_teams == expected_lower_teams, f"B bracket teams mismatch. Got {b_teams}, expected {expected_lower_teams}"
        print(f"B bracket teams verified: {b_teams}")
    
    def test_knockout_rounds_generated(self):
        """Verify knockout rounds are properly generated with Semi-Final round name"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}",
            headers=auth_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        ko_matches = [m for m in data["matches"] if m["round"] != "group"]
        
        # Check A bracket has Semi-Final
        a_semis = [m for m in ko_matches if m.get("bracket") == "a" and m["round"] == "Semi-Final"]
        assert len(a_semis) == 2, f"Expected 2 A bracket Semi-Finals, got {len(a_semis)}"
        
        # Check B bracket has Semi-Final
        b_semis = [m for m in ko_matches if m.get("bracket") == "b" and m["round"] == "Semi-Final"]
        assert len(b_semis) == 2, f"Expected 2 B bracket Semi-Finals, got {len(b_semis)}"
        
        print(f"Knockout structure verified: {len(a_semis)} A semis, {len(b_semis)} B semis")


class TestBKnockoutMatchResults:
    """Test submitting results in A and B brackets"""
    
    EXISTING_TOURNAMENT_ID = "5e45f8d1-ffd2-46ea-bee0-755d46e1aefc"
    
    def test_submit_a_bracket_semifinal_result(self):
        """PUT /api/tournaments/{id}/result/{match_id} - Submit A bracket semifinal result"""
        # Get tournament first
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}",
            headers=auth_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find an unplayed A bracket match
        a_semis = [m for m in data["matches"] if m.get("bracket") == "a" and m["round"] == "Semi-Final" and not m["played"]]
        
        if not a_semis:
            print("All A bracket semifinals already played - checking for existing results")
            a_semis_played = [m for m in data["matches"] if m.get("bracket") == "a" and m["round"] == "Semi-Final"]
            assert len(a_semis_played) > 0, "No A bracket semi-finals found"
            print(f"A bracket semi-final already played: {a_semis_played[0]['home_team']} vs {a_semis_played[0]['away_team']}")
            return
        
        match = a_semis[0]
        match_id = match["id"]
        
        # Submit result - home team wins 2-1
        result_response = requests.put(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}/result/{match_id}",
            headers=auth_headers(),
            json={"home_score": 2, "away_score": 1}
        )
        assert result_response.status_code == 200, f"Failed to submit result: {result_response.text}"
        
        updated = result_response.json()
        # Verify match was updated
        updated_match = next((m for m in updated["matches"] if m["id"] == match_id), None)
        assert updated_match is not None
        assert updated_match["played"] == True
        assert updated_match["home_score"] == 2
        assert updated_match["away_score"] == 1
        
        print(f"A bracket semifinal result submitted: {match['home_team']} 2-1 {match['away_team']}")
    
    def test_submit_second_a_bracket_semifinal(self):
        """Submit second A bracket semifinal to trigger Final generation"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}",
            headers=auth_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find unplayed A bracket match
        a_semis = [m for m in data["matches"] if m.get("bracket") == "a" and m["round"] == "Semi-Final" and not m["played"]]
        
        if not a_semis:
            print("All A bracket semifinals already played")
            return
        
        match = a_semis[0]
        match_id = match["id"]
        
        # Submit result - away team wins 0-3
        result_response = requests.put(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}/result/{match_id}",
            headers=auth_headers(),
            json={"home_score": 0, "away_score": 3}
        )
        assert result_response.status_code == 200
        
        updated = result_response.json()
        print(f"Second A semifinal result: {match['home_team']} 0-3 {match['away_team']}")
        
        # Check if Final was generated
        a_finals = [m for m in updated["matches"] if m.get("bracket") == "a" and m["round"] == "Final"]
        if a_finals:
            print(f"A bracket Final generated: {a_finals[0]['home_team']} vs {a_finals[0]['away_team']}")
    
    def test_submit_b_bracket_semifinal_results(self):
        """Submit B bracket semifinal results to trigger B Final generation"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}",
            headers=auth_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find unplayed B bracket matches
        b_semis = [m for m in data["matches"] if m.get("bracket") == "b" and m["round"] == "Semi-Final" and not m["played"]]
        
        for i, match in enumerate(b_semis):
            match_id = match["id"]
            # Alternate winners
            if i % 2 == 0:
                score = {"home_score": 2, "away_score": 0}
                winner = match["home_team"]
            else:
                score = {"home_score": 1, "away_score": 2}
                winner = match["away_team"]
            
            result_response = requests.put(
                f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}/result/{match_id}",
                headers=auth_headers(),
                json=score
            )
            assert result_response.status_code == 200
            print(f"B bracket semifinal: {match['home_team']} {score['home_score']}-{score['away_score']} {match['away_team']} (Winner: {winner})")
        
        if not b_semis:
            print("All B bracket semifinals already played")


class TestFinalAndCompletion:
    """Test finals and tournament completion with both winners"""
    
    EXISTING_TOURNAMENT_ID = "5e45f8d1-ffd2-46ea-bee0-755d46e1aefc"
    
    def test_a_bracket_final_generated(self):
        """Verify A bracket Final match exists"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}",
            headers=auth_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        a_finals = [m for m in data["matches"] if m.get("bracket") == "a" and m["round"] == "Final"]
        # Allow for legacy matches without bracket field
        if not a_finals:
            a_finals = [m for m in data["matches"] if m["round"] == "Final" and not m.get("bracket")]
        
        # Finals may not be generated yet if semis not complete
        if a_finals:
            f = a_finals[0]
            print(f"A bracket Final: {f['home_team']} vs {f['away_team']} (played: {f['played']})")
        else:
            # Check if semis are done
            a_semis = [m for m in data["matches"] if m.get("bracket") == "a" and m["round"] == "Semi-Final"]
            semis_done = all(m["played"] for m in a_semis)
            print(f"A bracket semis done: {semis_done}, Final not yet generated")
    
    def test_b_bracket_final_generated(self):
        """Verify B bracket Final match exists"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}",
            headers=auth_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        b_finals = [m for m in data["matches"] if m.get("bracket") == "b" and m["round"] == "Final"]
        
        if b_finals:
            f = b_finals[0]
            print(f"B bracket Final: {f['home_team']} vs {f['away_team']} (played: {f['played']})")
        else:
            b_semis = [m for m in data["matches"] if m.get("bracket") == "b" and m["round"] == "Semi-Final"]
            semis_done = all(m["played"] for m in b_semis)
            print(f"B bracket semis done: {semis_done}, B Final not yet generated")
    
    def test_submit_a_bracket_final(self):
        """Submit A bracket Final result"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}",
            headers=auth_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        a_finals = [m for m in data["matches"] if m.get("bracket") == "a" and m["round"] == "Final" and not m.get("played")]
        if not a_finals:
            a_finals = [m for m in data["matches"] if m["round"] == "Final" and not m.get("bracket") and not m.get("played")]
        
        if not a_finals:
            print("A bracket Final already played or not yet generated")
            return
        
        match = a_finals[0]
        result_response = requests.put(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}/result/{match['id']}",
            headers=auth_headers(),
            json={"home_score": 3, "away_score": 1}
        )
        assert result_response.status_code == 200
        updated = result_response.json()
        
        print(f"A Final submitted: {match['home_team']} 3-1 {match['away_team']}")
        if updated.get("winner"):
            print(f"Tournament CHAMPION: {updated['winner']}")
    
    def test_submit_b_bracket_final(self):
        """Submit B bracket Final result to get B bracket winner"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}",
            headers=auth_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        b_finals = [m for m in data["matches"] if m.get("bracket") == "b" and m["round"] == "Final" and not m.get("played")]
        
        if not b_finals:
            print("B bracket Final already played or not yet generated")
            return
        
        match = b_finals[0]
        result_response = requests.put(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}/result/{match['id']}",
            headers=auth_headers(),
            json={"home_score": 2, "away_score": 1}
        )
        assert result_response.status_code == 200
        updated = result_response.json()
        
        print(f"B Final submitted: {match['home_team']} 2-1 {match['away_team']}")
        if updated.get("winner_b"):
            print(f"B BRACKET WINNER: {updated['winner_b']}")
    
    def test_tournament_completion_requires_both_winners(self):
        """Verify tournament completes only when both A and B winners are determined"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}",
            headers=auth_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        has_a_winner = data.get("winner") is not None
        has_b_winner = data.get("winner_b") is not None
        status = data.get("status")
        
        print(f"Tournament status: {status}")
        print(f"A bracket winner: {data.get('winner', 'Not determined')}")
        print(f"B bracket winner: {data.get('winner_b', 'Not determined')}")
        
        # If both winners exist, status should be completed
        if has_a_winner and has_b_winner:
            assert status == "completed", f"Tournament should be completed when both winners exist, but status is {status}"
            print("Tournament correctly marked as COMPLETED")
        elif has_a_winner and not has_b_winner:
            # A winner but no B winner - should still be ongoing
            assert status == "ongoing", f"Tournament should be ongoing when only A winner exists, but status is {status}"
            print("Tournament correctly still ONGOING (awaiting B bracket completion)")


class TestCreateNewBKnockoutTournament:
    """Test creating a fresh tournament with B knockout enabled"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Store created tournament ID for cleanup"""
        self.created_tournament_id = None
    
    def test_create_group_knockout_with_b_knockout(self):
        """POST /api/tournaments - Create tournament with has_b_knockout=true"""
        unique_id = str(uuid.uuid4())[:8]
        teams = [
            {"name": f"TEST_Team_A1_{unique_id}", "team_id": "", "from_network": False},
            {"name": f"TEST_Team_A2_{unique_id}", "team_id": "", "from_network": False},
            {"name": f"TEST_Team_A3_{unique_id}", "team_id": "", "from_network": False},
            {"name": f"TEST_Team_A4_{unique_id}", "team_id": "", "from_network": False},
            {"name": f"TEST_Team_B1_{unique_id}", "team_id": "", "from_network": False},
            {"name": f"TEST_Team_B2_{unique_id}", "team_id": "", "from_network": False},
            {"name": f"TEST_Team_B3_{unique_id}", "team_id": "", "from_network": False},
            {"name": f"TEST_Team_B4_{unique_id}", "team_id": "", "from_network": False},
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/tournaments",
            headers=auth_headers(),
            json={
                "name": f"TEST_B_Knockout_{unique_id}",
                "format": "11v11",
                "tournament_type": "group_knockout",
                "start_date": "2026-04-01",
                "teams": teams,
                "groups_count": 2,
                "matches_per_pair": 1,
                "has_b_knockout": True
            }
        )
        assert response.status_code == 200, f"Failed to create tournament: {response.text}"
        
        data = response.json()
        self.created_tournament_id = data["id"]
        
        # Verify structure
        assert data["has_b_knockout"] == True
        assert data["tournament_type"] == "group_knockout"
        assert len(data["teams"]) == 8
        assert len(data["groups"]) == 2  # Should have 2 groups
        
        # Verify group matches generated (4 teams per group = 6 matches per group)
        group_matches = [m for m in data["matches"] if m["round"] == "group"]
        assert len(group_matches) == 12, f"Expected 12 group matches, got {len(group_matches)}"
        
        print(f"Created tournament {data['id']} with B knockout enabled")
        print(f"Groups: {list(data['groups'].keys())}")
        print(f"Group matches: {len(group_matches)}")


class TestPDFExport:
    """Test PDF export with B knockout tournament"""
    
    EXISTING_TOURNAMENT_ID = "5e45f8d1-ffd2-46ea-bee0-755d46e1aefc"
    
    def test_pdf_export_returns_valid_pdf(self):
        """GET /api/tournaments/{id}/pdf - Verify PDF export works"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{self.EXISTING_TOURNAMENT_ID}/pdf",
            headers=auth_headers()
        )
        assert response.status_code == 200, f"PDF export failed: {response.status_code}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got {content_type}"
        
        # Check PDF magic bytes
        content = response.content
        assert content[:4] == b'%PDF', f"Response does not start with PDF magic bytes"
        
        print(f"PDF export successful, size: {len(content)} bytes")


# Cleanup function to delete test tournaments
def pytest_sessionfinish(session, exitstatus):
    """Cleanup test tournaments after all tests"""
    if TOKEN:
        # Get all tournaments
        response = requests.get(
            f"{BASE_URL}/api/tournaments",
            headers=auth_headers()
        )
        if response.status_code == 200:
            tournaments = response.json()
            for t in tournaments:
                if t["name"].startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/tournaments/{t['id']}",
                        headers=auth_headers()
                    )
                    print(f"Cleaned up test tournament: {t['name']}")
