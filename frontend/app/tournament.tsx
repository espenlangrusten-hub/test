import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface TournamentTeam {
  team_id: string;
  team_name: string;
  team_code: string;
}

interface TournamentMatch {
  id: string;
  home_team_id: string;
  home_team_name: string;
  away_team_id: string;
  away_team_name: string;
  score_home: number;
  score_away: number;
  date: string;
  status: string;
}

interface Tournament {
  id: string;
  name: string;
  sport: string;
  format: string;
  start_date: string;
  end_date: string;
  location: string;
  description: string;
  teams: TournamentTeam[];
  matches: TournamentMatch[];
  status: string;
  created_at: string;
}

interface Standing {
  team_id: string;
  team_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
}

type DetailTab = 'overview' | 'matches' | 'standings';

export default function TournamentScreen() {
  const router = useRouter();
  const { token, currentTeam } = useApp();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [standings, setStandings] = useState<Standing[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);

  // Create tournament modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tName, setTName] = useState('');
  const [tSport, setTSport] = useState('football');
  const [tFormat, setTFormat] = useState('11v11');
  const [tStartDate, setTStartDate] = useState('');
  const [tEndDate, setTEndDate] = useState('');
  const [tLocation, setTLocation] = useState('');
  const [tDesc, setTDesc] = useState('');

  // Add team modal
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [addingTeam, setAddingTeam] = useState(false);

  // Add match modal
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [matchHomeId, setMatchHomeId] = useState('');
  const [matchHomeName, setMatchHomeName] = useState('');
  const [matchAwayId, setMatchAwayId] = useState('');
  const [matchAwayName, setMatchAwayName] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [addingMatch, setAddingMatch] = useState(false);

  // Score modal
  const [scoreMatch, setScoreMatch] = useState<TournamentMatch | null>(null);
  const [scoreHome, setScoreHome] = useState('');
  const [scoreAway, setScoreAway] = useState('');
  const [savingScore, setSavingScore] = useState(false);

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  useFocusEffect(useCallback(() => { fetchTournaments(); }, []));

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tournaments`, { headers: authHeaders() });
      if (res.ok) setTournaments(await res.json());
    } catch {}
    setLoading(false);
  };

  const fetchStandings = async (tournamentId: string) => {
    setStandingsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tournaments/${tournamentId}/standings`, { headers: authHeaders() });
      if (res.ok) setStandings(await res.json());
    } catch {}
    setStandingsLoading(false);
  };

  const openTournament = (t: Tournament) => {
    setSelected(t);
    setDetailTab('overview');
    setStandings([]);
  };

  const handleDetailTab = (tab: DetailTab) => {
    setDetailTab(tab);
    if (tab === 'standings' && selected) fetchStandings(selected.id);
  };

  const createTournament = async () => {
    if (!tName.trim()) return Alert.alert('Error', 'Tournament name is required');
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/api/tournaments`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          name: tName.trim(), sport: tSport, format: tFormat,
          start_date: tStartDate, end_date: tEndDate,
          location: tLocation, description: tDesc,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setTournaments(prev => [created, ...prev]);
        setShowCreate(false);
        resetCreateForm();
        setSelected(created);
        setDetailTab('overview');
      } else {
        const err = await res.json().catch(() => ({ detail: 'Failed to create' }));
        Alert.alert('Error', err.detail || 'Failed to create tournament');
      }
    } catch { Alert.alert('Error', 'Network error'); }
    setCreating(false);
  };

  const resetCreateForm = () => {
    setTName(''); setTSport('football'); setTFormat('11v11');
    setTStartDate(''); setTEndDate(''); setTLocation(''); setTDesc('');
  };

  const deleteTournament = async (id: string) => {
    Alert.alert('Delete Tournament', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await fetch(`${API_URL}/api/tournaments/${id}`, { method: 'DELETE', headers: authHeaders() });
            setTournaments(prev => prev.filter(t => t.id !== id));
            if (selected?.id === id) setSelected(null);
          } catch {}
        }
      }
    ]);
  };

  const addTeam = async () => {
    if (!newTeamName.trim() || !selected) return;
    setAddingTeam(true);
    try {
      const teamId = `t-${Date.now()}`;
      const res = await fetch(`${API_URL}/api/tournaments/${selected.id}/teams`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ team_id: teamId, team_name: newTeamName.trim(), team_code: '' }),
      });
      if (res.ok) {
        const added = await res.json();
        const updated = { ...selected, teams: [...selected.teams, added] };
        setSelected(updated);
        setTournaments(prev => prev.map(t => t.id === selected.id ? updated : t));
        setNewTeamName('');
        setShowAddTeam(false);
      } else {
        const err = await res.json().catch(() => ({ detail: 'Failed' }));
        Alert.alert('Error', err.detail || 'Failed to add team');
      }
    } catch { Alert.alert('Error', 'Network error'); }
    setAddingTeam(false);
  };

  const removeTeam = async (teamId: string) => {
    if (!selected) return;
    try {
      await fetch(`${API_URL}/api/tournaments/${selected.id}/teams/${teamId}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      const updated = { ...selected, teams: selected.teams.filter(t => t.team_id !== teamId) };
      setSelected(updated);
      setTournaments(prev => prev.map(t => t.id === selected.id ? updated : t));
    } catch {}
  };

  const addMatch = async () => {
    if (!matchHomeName.trim() || !matchAwayName.trim() || !selected) {
      return Alert.alert('Error', 'Both team names are required');
    }
    setAddingMatch(true);
    const homeTeam = selected.teams.find(t => t.team_name === matchHomeName.trim());
    const awayTeam = selected.teams.find(t => t.team_name === matchAwayName.trim());
    const homeId = homeTeam?.team_id || `th-${Date.now()}`;
    const awayId = awayTeam?.team_id || `ta-${Date.now()}`;
    try {
      const res = await fetch(`${API_URL}/api/tournaments/${selected.id}/matches`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          home_team_id: homeId,
          home_team_name: matchHomeName.trim(),
          away_team_id: awayId,
          away_team_name: matchAwayName.trim(),
          date: matchDate,
        }),
      });
      if (res.ok) {
        const added = await res.json();
        const updated = { ...selected, matches: [...selected.matches, added] };
        setSelected(updated);
        setTournaments(prev => prev.map(t => t.id === selected.id ? updated : t));
        setMatchHomeName(''); setMatchAwayName(''); setMatchDate('');
        setShowAddMatch(false);
      } else {
        Alert.alert('Error', 'Failed to add match');
      }
    } catch { Alert.alert('Error', 'Network error'); }
    setAddingMatch(false);
  };

  const saveScore = async () => {
    if (!scoreMatch || !selected) return;
    const h = parseInt(scoreHome) || 0;
    const a = parseInt(scoreAway) || 0;
    setSavingScore(true);
    try {
      const res = await fetch(`${API_URL}/api/tournaments/${selected.id}/matches/${scoreMatch.id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ score_home: h, score_away: a, status: 'completed' }),
      });
      if (res.ok) {
        const updated_match = await res.json();
        const updatedMatches = selected.matches.map(m => m.id === scoreMatch.id ? updated_match : m);
        const updated = { ...selected, matches: updatedMatches };
        setSelected(updated);
        setTournaments(prev => prev.map(t => t.id === selected.id ? updated : t));
        setScoreMatch(null);
        setScoreHome(''); setScoreAway('');
      }
    } catch {}
    setSavingScore(false);
  };

  // --- Render detail view ---
  if (selected) {
    return (
      <View style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailTitle} numberOfLines={1}>{selected.name}</Text>
            <Text style={styles.detailSub}>{selected.sport.toUpperCase()} · {selected.format}</Text>
          </View>
          <TouchableOpacity onPress={() => deleteTournament(selected.id)} style={styles.deleteIconBtn}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.destructive} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          {(['overview', 'matches', 'standings'] as DetailTab[]).map(tab => (
            <TouchableOpacity key={tab} style={[styles.tab, detailTab === tab && styles.tabActive]} onPress={() => handleDetailTab(tab)}>
              <Text style={[styles.tabText, detailTab === tab && styles.tabTextActive]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {detailTab === 'overview' && (
            <>
              {/* Info */}
              {(selected.location || selected.start_date) ? (
                <View style={styles.infoCard}>
                  {selected.location ? (
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="map-marker" size={14} color={Colors.primary} />
                      <Text style={styles.infoText}>{selected.location}</Text>
                    </View>
                  ) : null}
                  {selected.start_date ? (
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="calendar" size={14} color={Colors.primary} />
                      <Text style={styles.infoText}>
                        {selected.start_date}{selected.end_date ? ` – ${selected.end_date}` : ''}
                      </Text>
                    </View>
                  ) : null}
                  {selected.description ? (
                    <Text style={styles.descText}>{selected.description}</Text>
                  ) : null}
                </View>
              ) : null}

              {/* Teams */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>TEAMS ({selected.teams.length})</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddTeam(true)}>
                  <MaterialCommunityIcons name="plus" size={14} color={Colors.white} />
                  <Text style={styles.addBtnText}>ADD</Text>
                </TouchableOpacity>
              </View>
              {selected.teams.length === 0 ? (
                <View style={styles.emptyBox}>
                  <MaterialCommunityIcons name="account-group" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No teams yet. Add teams to the tournament.</Text>
                </View>
              ) : selected.teams.map(t => (
                <View key={t.team_id} style={styles.teamRow}>
                  <MaterialCommunityIcons name="shield-half-full" size={16} color={Colors.primary} />
                  <Text style={styles.teamRowName}>{t.team_name}</Text>
                  <TouchableOpacity onPress={() => removeTeam(t.team_id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="close" size={14} color={Colors.destructive} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {detailTab === 'matches' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>FIXTURES ({selected.matches.length})</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddMatch(true)}>
                  <MaterialCommunityIcons name="plus" size={14} color={Colors.white} />
                  <Text style={styles.addBtnText}>ADD</Text>
                </TouchableOpacity>
              </View>
              {selected.matches.length === 0 ? (
                <View style={styles.emptyBox}>
                  <MaterialCommunityIcons name="soccer-field" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No matches yet. Add fixtures to the tournament.</Text>
                </View>
              ) : selected.matches.map(m => (
                <View key={m.id} style={styles.matchCard}>
                  <View style={styles.matchTeams}>
                    <Text style={styles.matchTeamName} numberOfLines={1}>{m.home_team_name}</Text>
                    <View style={styles.scoreBox}>
                      {m.status === 'completed' ? (
                        <Text style={styles.scoreText}>{m.score_home} – {m.score_away}</Text>
                      ) : (
                        <Text style={styles.vsText}>VS</Text>
                      )}
                    </View>
                    <Text style={[styles.matchTeamName, { textAlign: 'right' }]} numberOfLines={1}>{m.away_team_name}</Text>
                  </View>
                  {m.date ? (
                    <Text style={styles.matchDate}>{m.date}</Text>
                  ) : null}
                  <View style={styles.matchActions}>
                    <View style={[styles.statusBadge, m.status === 'completed' ? styles.statusComplete : styles.statusPending]}>
                      <Text style={styles.statusText}>{m.status === 'completed' ? 'FINAL' : 'SCHEDULED'}</Text>
                    </View>
                    <TouchableOpacity style={styles.scoreBtn} onPress={() => {
                      setScoreMatch(m);
                      setScoreHome(String(m.score_home));
                      setScoreAway(String(m.score_away));
                    }}>
                      <MaterialCommunityIcons name="pencil" size={12} color={Colors.primary} />
                      <Text style={styles.scoreBtnText}>SCORE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {detailTab === 'standings' && (
            <>
              <Text style={styles.sectionTitle}>STANDINGS</Text>
              {standingsLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
              ) : standings.length === 0 ? (
                <View style={styles.emptyBox}>
                  <MaterialCommunityIcons name="trophy" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No standings yet. Complete matches to see the table.</Text>
                </View>
              ) : (
                <View style={styles.standingsTable}>
                  <View style={styles.standingsHeader}>
                    <Text style={[styles.standingsCell, { flex: 3 }]}>TEAM</Text>
                    <Text style={styles.standingsCell}>P</Text>
                    <Text style={styles.standingsCell}>W</Text>
                    <Text style={styles.standingsCell}>D</Text>
                    <Text style={styles.standingsCell}>L</Text>
                    <Text style={styles.standingsCell}>GD</Text>
                    <Text style={[styles.standingsCell, styles.pointsCell]}>PTS</Text>
                  </View>
                  {standings.map((s, i) => (
                    <View key={s.team_id} style={[styles.standingsRow, i % 2 === 0 && styles.standingsRowAlt]}>
                      <View style={[styles.standingsCell, { flex: 3, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                        <Text style={styles.rankText}>{i + 1}</Text>
                        <Text style={styles.standingsTeamName} numberOfLines={1}>{s.team_name}</Text>
                      </View>
                      <Text style={styles.standingsCell}>{s.played}</Text>
                      <Text style={styles.standingsCell}>{s.won}</Text>
                      <Text style={styles.standingsCell}>{s.drawn}</Text>
                      <Text style={styles.standingsCell}>{s.lost}</Text>
                      <Text style={styles.standingsCell}>{s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}</Text>
                      <Text style={[styles.standingsCell, styles.pointsCell]}>{s.points}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Add Team Modal */}
        <Modal visible={showAddTeam} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add Team</Text>
              <TextInput
                style={styles.input}
                value={newTeamName}
                onChangeText={setNewTeamName}
                placeholder="Team name"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.primaryBtn, addingTeam && { opacity: 0.5 }]} onPress={addTeam} disabled={addingTeam}>
                  <Text style={styles.primaryBtnText}>{addingTeam ? 'ADDING...' : 'ADD TEAM'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAddTeam(false); setNewTeamName(''); }}>
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Match Modal */}
        <Modal visible={showAddMatch} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add Fixture</Text>
              <Text style={styles.inputLabel}>Home Team</Text>
              <TextInput
                style={styles.input}
                value={matchHomeName}
                onChangeText={setMatchHomeName}
                placeholder="Home team name"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>Away Team</Text>
              <TextInput
                style={styles.input}
                value={matchAwayName}
                onChangeText={setMatchAwayName}
                placeholder="Away team name"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>Date (optional)</Text>
              <TextInput
                style={styles.input}
                value={matchDate}
                onChangeText={setMatchDate}
                placeholder="e.g. 2026-06-15"
                placeholderTextColor={Colors.textMuted}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.primaryBtn, addingMatch && { opacity: 0.5 }]} onPress={addMatch} disabled={addingMatch}>
                  <Text style={styles.primaryBtnText}>{addingMatch ? 'ADDING...' : 'ADD FIXTURE'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAddMatch(false); setMatchHomeName(''); setMatchAwayName(''); setMatchDate(''); }}>
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Score Modal */}
        <Modal visible={scoreMatch !== null} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Enter Score</Text>
              {scoreMatch && <Text style={styles.modalDesc}>{scoreMatch.home_team_name} vs {scoreMatch.away_team_name}</Text>}
              <View style={styles.scoreInputRow}>
                <TextInput
                  style={[styles.input, styles.scoreInput]}
                  value={scoreHome}
                  onChangeText={setScoreHome}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                />
                <Text style={styles.scoreDash}>–</Text>
                <TextInput
                  style={[styles.input, styles.scoreInput]}
                  value={scoreAway}
                  onChangeText={setScoreAway}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.primaryBtn, savingScore && { opacity: 0.5 }]} onPress={saveScore} disabled={savingScore}>
                  <Text style={styles.primaryBtnText}>{savingScore ? 'SAVING...' : 'SAVE SCORE'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setScoreMatch(null); setScoreHome(''); setScoreAway(''); }}>
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // --- Tournament list view ---
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.white} />
        </TouchableOpacity>
        <MaterialCommunityIcons name="trophy" size={24} color={Colors.primary} />
        <Text style={styles.headerTitle}>TOURNAMENTS</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <MaterialCommunityIcons name="plus" size={14} color={Colors.white} />
          <Text style={styles.addBtnText}>NEW</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : tournaments.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="trophy-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Tournaments</Text>
            <Text style={styles.emptyText}>Create your first tournament to track teams, fixtures and standings.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.primaryBtnText}>CREATE TOURNAMENT</Text>
            </TouchableOpacity>
          </View>
        ) : tournaments.map(t => (
          <TouchableOpacity key={t.id} style={styles.tournamentCard} onPress={() => openTournament(t)} activeOpacity={0.7}>
            <View style={styles.tournamentIconWrap}>
              <MaterialCommunityIcons name="trophy" size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tournamentName}>{t.name}</Text>
              <View style={styles.tournamentMeta}>
                <View style={styles.badge}><Text style={styles.badgeText}>{t.sport.toUpperCase()}</Text></View>
                <View style={styles.badge}><Text style={styles.badgeText}>{t.format}</Text></View>
                <Text style={styles.metaText}>{t.teams.length} teams · {t.matches.length} matches</Text>
              </View>
              {t.location ? <Text style={styles.locationText}>{t.location}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => deleteTournament(t.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={Colors.destructive} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Create Tournament Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }}>
            <View style={styles.modalCard}>
              <MaterialCommunityIcons name="trophy-outline" size={32} color={Colors.primary} />
              <Text style={styles.modalTitle}>New Tournament</Text>

              <Text style={styles.inputLabel}>Tournament Name *</Text>
              <TextInput style={styles.input} value={tName} onChangeText={setTName} placeholder="e.g. Spring Cup 2026" placeholderTextColor={Colors.textMuted} />

              <Text style={styles.inputLabel}>Sport</Text>
              <View style={styles.segmentRow}>
                {['football', 'futsal'].map(s => (
                  <TouchableOpacity key={s} style={[styles.segment, tSport === s && styles.segmentActive]} onPress={() => setTSport(s)}>
                    <Text style={[styles.segmentText, tSport === s && styles.segmentTextActive]}>{s.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Format</Text>
              <View style={styles.segmentRow}>
                {['5v5', '7v7', '9v9', '11v11'].map(f => (
                  <TouchableOpacity key={f} style={[styles.segment, tFormat === f && styles.segmentActive]} onPress={() => setTFormat(f)}>
                    <Text style={[styles.segmentText, tFormat === f && styles.segmentTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Start Date</Text>
              <TextInput style={styles.input} value={tStartDate} onChangeText={setTStartDate} placeholder="e.g. 2026-05-01" placeholderTextColor={Colors.textMuted} />

              <Text style={styles.inputLabel}>End Date</Text>
              <TextInput style={styles.input} value={tEndDate} onChangeText={setTEndDate} placeholder="e.g. 2026-05-10" placeholderTextColor={Colors.textMuted} />

              <Text style={styles.inputLabel}>Location</Text>
              <TextInput style={styles.input} value={tLocation} onChangeText={setTLocation} placeholder="e.g. City Stadium" placeholderTextColor={Colors.textMuted} />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput style={[styles.input, { height: 72, textAlignVertical: 'top' }]} value={tDesc} onChangeText={setTDesc} placeholder="Optional notes..." placeholderTextColor={Colors.textMuted} multiline />

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.primaryBtn, creating && { opacity: 0.5 }]} onPress={createTournament} disabled={creating}>
                  <Text style={styles.primaryBtnText}>{creating ? 'CREATING...' : 'CREATE'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCreate(false); resetCreateForm(); }}>
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: Colors.white, letterSpacing: 1.5 },
  backBtn: { padding: 4 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailTitle: { fontSize: 18, fontWeight: '800', color: Colors.white },
  detailSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  deleteIconBtn: { padding: 6 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  tabTextActive: { color: Colors.primary },
  infoCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: Colors.textSecondary },
  descText: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  addBtnText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.white },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 20 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.backgroundSecondary, borderRadius: 8, padding: 10, marginBottom: 4, borderWidth: 1, borderColor: Colors.border },
  teamRowName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.white },
  matchCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  matchTeams: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  matchTeamName: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.white },
  scoreBox: { backgroundColor: Colors.card, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  vsText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  matchDate: { fontSize: 11, color: Colors.textMuted, marginBottom: 6 },
  matchActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  statusComplete: { backgroundColor: 'rgba(0,200,83,0.15)' },
  statusPending: { backgroundColor: 'rgba(113,113,122,0.2)' },
  statusText: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  scoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1, borderColor: Colors.primary },
  scoreBtnText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  standingsTable: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  standingsHeader: { flexDirection: 'row', backgroundColor: Colors.card, paddingVertical: 8, paddingHorizontal: 10 },
  standingsRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10 },
  standingsRowAlt: { backgroundColor: Colors.backgroundSecondary },
  standingsCell: { flex: 1, fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  standingsTeamName: { flex: 1, fontSize: 12, fontWeight: '700', color: Colors.white },
  rankText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, width: 14 },
  pointsCell: { color: Colors.primary, fontWeight: '800' },
  tournamentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  tournamentIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,200,83,0.1)', justifyContent: 'center', alignItems: 'center' },
  tournamentName: { fontSize: 15, fontWeight: '700', color: Colors.white, marginBottom: 3 },
  tournamentMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { backgroundColor: 'rgba(0,200,83,0.12)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  metaText: { fontSize: 11, color: Colors.textSecondary },
  locationText: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center' },
  modalCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 20, padding: 24, marginHorizontal: 16, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.white, marginTop: 10, marginBottom: 6 },
  modalDesc: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16, textAlign: 'center' },
  modalActions: { width: '100%', gap: 8, marginTop: 8 },
  inputLabel: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginBottom: 4, marginTop: 8 },
  input: { width: '100%', backgroundColor: Colors.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: Colors.white, fontSize: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 4 },
  segmentRow: { flexDirection: 'row', gap: 6, marginBottom: 4, flexWrap: 'wrap', alignSelf: 'flex-start' },
  segment: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  segmentTextActive: { color: Colors.white },
  primaryBtn: { backgroundColor: Colors.primary, height: 46, borderRadius: 10, justifyContent: 'center', alignItems: 'center', width: '100%' },
  primaryBtnText: { fontSize: 14, fontWeight: '800', color: Colors.white },
  cancelBtn: { height: 40, justifyContent: 'center', alignItems: 'center', width: '100%' },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  scoreInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  scoreInput: { width: 72, textAlign: 'center', fontSize: 24, fontWeight: '800' },
  scoreDash: { fontSize: 20, fontWeight: '700', color: Colors.textMuted },
});
