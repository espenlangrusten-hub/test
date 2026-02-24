"""
Test Suite for Stats Counting and Event Preservation
Verifies bug fix: doEndMatch was overwriting structured events with text-only events
Now tests that goals, assists, yellow cards are properly counted in player-stats
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://match-network-1.preview.emergentagent.com"


class TestStatsAndEvents:
    """Tests for stats counting and event preservation after the bug fix"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user and auth"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        # Register/login test user
        self.email = f"statstest_{uuid.uuid4().hex[:6]}@test.com"
        self.password = "test123"
        
        # Try register first, fall back to login
        reg_res = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.email,
            "password": self.password,
            "name": "Stats Tester"
        })
        if reg_res.status_code == 201 or reg_res.status_code == 200:
            data = reg_res.json()
            self.token = data.get("token")
        else:
            # Try login
            login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": "statstest2@test.com",
                "password": "test123"
            })
            if login_res.status_code == 200:
                self.token = login_res.json().get("token")
            else:
                pytest.skip("Auth failed")
        
        self.session.headers.update({'Authorization': f'Bearer {self.token}'})
        yield
        # Cleanup done via unique email per test run
    
    def test_1_stats_counting_full_flow(self):
        """
        CRITICAL TEST: Create team, create match, log events (goal, assist, yellow),
        complete match, verify player-stats counts all events correctly.
        This tests the bug fix where doEndMatch was overwriting events.
        """
        # Step 1: Create a team with players
        players = [
            {"id": f"p1-{uuid.uuid4().hex[:6]}", "name": "Goal Scorer", "number": 9, "position": "ST", "is_starter": True},
            {"id": f"p2-{uuid.uuid4().hex[:6]}", "name": "Assist King", "number": 10, "position": "CAM", "is_starter": True},
            {"id": f"p3-{uuid.uuid4().hex[:6]}", "name": "Yellow Card", "number": 4, "position": "CB", "is_starter": True},
            {"id": f"p4-{uuid.uuid4().hex[:6]}", "name": "GK Player", "number": 1, "position": "GK", "is_starter": True},
            {"id": f"p5-{uuid.uuid4().hex[:6]}", "name": "Sub Player", "number": 12, "position": "MID", "is_starter": False},
        ]
        
        team_res = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": f"TEST_StatsTeam_{uuid.uuid4().hex[:4]}",
            "sport": "football",
            "format": "11v11",
            "age_group": "adult",
            "players": players,
            "formation": "4-3-3"
        })
        assert team_res.status_code in [200, 201], f"Team creation failed: {team_res.text}"
        team = team_res.json()
        team_id = team["id"]
        
        # Step 2: Create a match with starters
        starter_ids = [p["id"] for p in players if p.get("is_starter")]
        sub_ids = [p["id"] for p in players if not p.get("is_starter")]
        
        match_res = self.session.post(f"{BASE_URL}/api/matches", json={
            "team_id": team_id,
            "opponent": "Test Opponent FC",
            "formation": "4-3-3",
            "duration_minutes": 90,
            "starters": starter_ids,
            "subs": sub_ids,
            "score_home": 0,
            "score_away": 0
        })
        assert match_res.status_code in [200, 201], f"Match creation failed: {match_res.text}"
        match = match_res.json()
        match_id = match["id"]
        
        # Step 3: Log events - goal, assist, yellow card
        goal_player_id = players[0]["id"]  # Goal Scorer
        assist_player_id = players[1]["id"]  # Assist King
        yellow_player_id = players[2]["id"]  # Yellow Card
        
        # Log GOAL event
        goal_res = self.session.post(f"{BASE_URL}/api/matches/{match_id}/events", json={
            "type": "goal",
            "minute": 25,
            "player_id": goal_player_id,
            "detail": f"GOAL by Goal Scorer"
        })
        assert goal_res.status_code in [200, 201], f"Goal event failed: {goal_res.text}"
        
        # Log ASSIST event
        assist_res = self.session.post(f"{BASE_URL}/api/matches/{match_id}/events", json={
            "type": "assist",
            "minute": 25,
            "player_id": assist_player_id,
            "detail": f"ASSIST by Assist King"
        })
        assert assist_res.status_code in [200, 201], f"Assist event failed: {assist_res.text}"
        
        # Log YELLOW card event
        yellow_res = self.session.post(f"{BASE_URL}/api/matches/{match_id}/events", json={
            "type": "yellow",
            "minute": 45,
            "player_id": yellow_player_id,
            "detail": f"YELLOW CARD: Yellow Card"
        })
        assert yellow_res.status_code in [200, 201], f"Yellow event failed: {yellow_res.text}"
        
        # Step 4: Complete the match (this is where the bug was - events were being overwritten)
        complete_res = self.session.put(f"{BASE_URL}/api/matches/{match_id}", json={
            "status": "completed",
            "score_home": 1,
            "score_away": 0
        })
        assert complete_res.status_code == 200, f"Match completion failed: {complete_res.text}"
        
        # Step 5: Verify events are preserved (GET match and check events array)
        match_get = self.session.get(f"{BASE_URL}/api/matches/{match_id}")
        assert match_get.status_code == 200, f"Get match failed: {match_get.text}"
        match_data = match_get.json()
        
        events = match_data.get("events", [])
        assert len(events) >= 3, f"Expected at least 3 events, got {len(events)}: {events}"
        
        # Verify events have structured data (not just text)
        goal_events = [e for e in events if e.get("type") == "goal" and e.get("player_id")]
        assist_events = [e for e in events if e.get("type") == "assist" and e.get("player_id")]
        yellow_events = [e for e in events if e.get("type") == "yellow" and e.get("player_id")]
        
        assert len(goal_events) >= 1, f"Goal event not preserved with player_id: {events}"
        assert len(assist_events) >= 1, f"Assist event not preserved with player_id: {events}"
        assert len(yellow_events) >= 1, f"Yellow event not preserved with player_id: {events}"
        
        # Step 6: Check player-stats endpoint counts correctly
        stats_res = self.session.get(f"{BASE_URL}/api/teams/{team_id}/player-stats")
        assert stats_res.status_code == 200, f"Get player-stats failed: {stats_res.text}"
        stats = stats_res.json()
        
        # Verify goals counted for goal scorer
        goal_scorer_stats = stats.get(goal_player_id, {})
        assert goal_scorer_stats.get("goals", 0) >= 1, f"Goal not counted for {goal_player_id}: {goal_scorer_stats}"
        
        # Verify assists counted for assist player
        assist_stats = stats.get(assist_player_id, {})
        assert assist_stats.get("assists", 0) >= 1, f"Assist not counted for {assist_player_id}: {assist_stats}"
        
        # Verify yellow cards counted
        yellow_stats = stats.get(yellow_player_id, {})
        assert yellow_stats.get("yellow", 0) >= 1, f"Yellow card not counted for {yellow_player_id}: {yellow_stats}"
        
        print("SUCCESS: Stats counting verified - goals, assists, yellow cards all counted correctly")

    def test_2_event_preservation_after_match_completion(self):
        """
        Test that structured events (with type, player_id, detail) are preserved
        after match completion and NOT overwritten with text-only events.
        """
        # Create minimal team
        player_id = f"evttest-{uuid.uuid4().hex[:6]}"
        team_res = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": f"TEST_EventTeam_{uuid.uuid4().hex[:4]}",
            "sport": "football",
            "format": "5v5",
            "players": [{"id": player_id, "name": "Event Player", "number": 7, "position": "MID", "is_starter": True}]
        })
        assert team_res.status_code in [200, 201]
        team_id = team_res.json()["id"]
        
        # Create match
        match_res = self.session.post(f"{BASE_URL}/api/matches", json={
            "team_id": team_id,
            "opponent": "EventTest FC",
            "duration_minutes": 40,
            "starters": [player_id]
        })
        assert match_res.status_code in [200, 201]
        match_id = match_res.json()["id"]
        
        # Log structured event
        event_res = self.session.post(f"{BASE_URL}/api/matches/{match_id}/events", json={
            "type": "goal",
            "minute": 10,
            "player_id": player_id,
            "detail": "Header from corner"
        })
        assert event_res.status_code in [200, 201]
        
        # Complete match
        complete_res = self.session.put(f"{BASE_URL}/api/matches/{match_id}", json={
            "status": "completed",
            "score_home": 1,
            "score_away": 0
        })
        assert complete_res.status_code == 200
        
        # Verify event preservation
        match_data = self.session.get(f"{BASE_URL}/api/matches/{match_id}").json()
        events = match_data.get("events", [])
        
        # Find the goal event
        goal_event = next((e for e in events if e.get("type") == "goal"), None)
        assert goal_event is not None, f"Goal event not found: {events}"
        assert goal_event.get("player_id") == player_id, f"player_id not preserved: {goal_event}"
        assert goal_event.get("minute") == 10, f"minute not preserved: {goal_event}"
        assert "Header" in goal_event.get("detail", ""), f"detail not preserved: {goal_event}"
        
        print("SUCCESS: Event preservation verified - structured events preserved after match completion")

    def test_3_score_editing(self):
        """Test PUT /api/matches/{match_id} with score_home and score_away updates"""
        # Create team and match
        team_res = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": f"TEST_ScoreTeam_{uuid.uuid4().hex[:4]}",
            "sport": "football",
            "format": "5v5",
            "players": [{"id": f"score-{uuid.uuid4().hex[:6]}", "name": "P1", "number": 1, "position": "GK", "is_starter": True}]
        })
        assert team_res.status_code in [200, 201]
        team_id = team_res.json()["id"]
        
        match_res = self.session.post(f"{BASE_URL}/api/matches", json={
            "team_id": team_id,
            "opponent": "Score Test FC",
            "score_home": 0,
            "score_away": 0
        })
        assert match_res.status_code in [200, 201]
        match_id = match_res.json()["id"]
        
        # Update score
        update_res = self.session.put(f"{BASE_URL}/api/matches/{match_id}", json={
            "score_home": 3,
            "score_away": 2
        })
        assert update_res.status_code == 200, f"Score update failed: {update_res.text}"
        updated = update_res.json()
        
        assert updated.get("score_home") == 3, f"score_home not updated: {updated}"
        assert updated.get("score_away") == 2, f"score_away not updated: {updated}"
        
        # Verify with GET
        get_res = self.session.get(f"{BASE_URL}/api/matches/{match_id}")
        assert get_res.status_code == 200
        match_data = get_res.json()
        assert match_data.get("score_home") == 3
        assert match_data.get("score_away") == 2
        
        print("SUCCESS: Score editing verified")

    def test_4_post_match_event_amendment(self):
        """
        Test POST /api/matches/{match_id}/events on a completed match.
        Verify the event is added and player-stats reflects the change.
        """
        player_id = f"postmatch-{uuid.uuid4().hex[:6]}"
        
        # Create team
        team_res = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": f"TEST_PostMatch_{uuid.uuid4().hex[:4]}",
            "sport": "football",
            "format": "5v5",
            "players": [{"id": player_id, "name": "Post Match Player", "number": 9, "position": "ST", "is_starter": True}]
        })
        assert team_res.status_code in [200, 201]
        team_id = team_res.json()["id"]
        
        # Create and complete match
        match_res = self.session.post(f"{BASE_URL}/api/matches", json={
            "team_id": team_id,
            "opponent": "Post Match FC",
            "starters": [player_id]
        })
        assert match_res.status_code in [200, 201]
        match_id = match_res.json()["id"]
        
        # Complete match first
        self.session.put(f"{BASE_URL}/api/matches/{match_id}", json={"status": "completed", "score_home": 0, "score_away": 0})
        
        # Get initial stats
        stats_before = self.session.get(f"{BASE_URL}/api/teams/{team_id}/player-stats").json()
        goals_before = stats_before.get(player_id, {}).get("goals", 0)
        
        # Add event to completed match (post-match amendment)
        event_res = self.session.post(f"{BASE_URL}/api/matches/{match_id}/events", json={
            "type": "goal",
            "minute": 88,
            "player_id": player_id,
            "detail": "Late winner added post-match"
        })
        assert event_res.status_code in [200, 201], f"Post-match event add failed: {event_res.text}"
        
        # Verify event is in match
        match_data = self.session.get(f"{BASE_URL}/api/matches/{match_id}").json()
        events = match_data.get("events", [])
        post_match_goal = next((e for e in events if "Late winner" in e.get("detail", "")), None)
        assert post_match_goal is not None, f"Post-match event not found: {events}"
        
        # Verify stats updated
        stats_after = self.session.get(f"{BASE_URL}/api/teams/{team_id}/player-stats").json()
        goals_after = stats_after.get(player_id, {}).get("goals", 0)
        assert goals_after == goals_before + 1, f"Stats not updated: before={goals_before}, after={goals_after}"
        
        print("SUCCESS: Post-match event amendment verified")

    def test_5_delete_event_via_put(self):
        """Test deleting an event by PUTting events array with one event removed"""
        player_id = f"delevt-{uuid.uuid4().hex[:6]}"
        
        # Create team and match
        team_res = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": f"TEST_DelEvent_{uuid.uuid4().hex[:4]}",
            "sport": "football",
            "format": "5v5",
            "players": [{"id": player_id, "name": "Del Event Player", "number": 5, "position": "MID", "is_starter": True}]
        })
        assert team_res.status_code in [200, 201]
        team_id = team_res.json()["id"]
        
        match_res = self.session.post(f"{BASE_URL}/api/matches", json={
            "team_id": team_id,
            "opponent": "Del Event FC",
            "starters": [player_id]
        })
        assert match_res.status_code in [200, 201]
        match_id = match_res.json()["id"]
        
        # Add two events
        self.session.post(f"{BASE_URL}/api/matches/{match_id}/events", json={
            "type": "goal", "minute": 10, "player_id": player_id, "detail": "First goal"
        })
        self.session.post(f"{BASE_URL}/api/matches/{match_id}/events", json={
            "type": "yellow", "minute": 30, "player_id": player_id, "detail": "Yellow card to delete"
        })
        
        # Get current events
        match_data = self.session.get(f"{BASE_URL}/api/matches/{match_id}").json()
        events = match_data.get("events", [])
        assert len(events) == 2, f"Expected 2 events: {events}"
        
        # Remove the yellow card event
        filtered_events = [e for e in events if e.get("type") != "yellow"]
        assert len(filtered_events) == 1
        
        # PUT with reduced events array
        update_res = self.session.put(f"{BASE_URL}/api/matches/{match_id}", json={
            "events": filtered_events
        })
        assert update_res.status_code == 200, f"Event deletion failed: {update_res.text}"
        
        # Verify
        match_after = self.session.get(f"{BASE_URL}/api/matches/{match_id}").json()
        events_after = match_after.get("events", [])
        assert len(events_after) == 1, f"Event not deleted: {events_after}"
        assert events_after[0].get("type") == "goal", f"Wrong event kept: {events_after}"
        
        print("SUCCESS: Event deletion via PUT verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
