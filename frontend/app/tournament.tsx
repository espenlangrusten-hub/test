import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal, Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../src/context/AppContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
type TView = 'hub' | 'create' | 'detail';
type TType = 'knockout' | 'group_knockout' | 'league';

export default function TournamentScreen() {
  const router = useRouter();
  const { token } = useApp();
  const [view, setView] = useState<TView>('hub');
  const [ongoing, setOngoing] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [network, setNetwork] = useState<any[]>([]);
  const [showResult, setShowResult] = useState<any>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  // Create form state
  const [name, setName] = useState('');
  const [format, setFormat] = useState('11v11');
  const [tType, setTType] = useState<TType>('knockout');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupsCount, setGroupsCount] = useState('2');
  const [matchesPerPair, setMatchesPerPair] = useState('1');
  const [teams, setTeams] = useState<{name: string; team_id: string; from_network: boolean}[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [showNetPicker, setShowNetPicker] = useState(false);
  const [creating, setCreating] = useState(false);

  const auth = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  useFocusEffect(useCallback(() => { fetchTournaments(); fetchNetwork(); }, []));

  const fetchTournaments = async () => {
    try {
      const [onRes, compRes] = await Promise.all([
        fetch(`${API_URL}/api/tournaments?status=ongoing`, { headers: auth() }),
        fetch(`${API_URL}/api/tournaments?status=completed`, { headers: auth() }),
      ]);
      if (onRes.ok) setOngoing(await onRes.json());
      if (compRes.ok) setCompleted(await compRes.json());
    } catch {}
  };

  const fetchNetwork = async () => {
    try { const r = await fetch(`${API_URL}/api/network`, { headers: auth() }); if (r.ok) setNetwork(await r.json()); } catch {}
  };

  const openTournament = async (id: string) => {
    try {
      const r = await fetch(`${API_URL}/api/tournaments/${id}`, { headers: auth() });
      if (r.ok) { setTournament(await r.json()); setView('detail'); }
    } catch {}
  };

  const addCustomTeam = () => {
    if (!newTeamName.trim()) return;
    if (teams.find(t => t.name === newTeamName.trim())) return;
    setTeams([...teams, { name: newTeamName.trim(), team_id: '', from_network: false }]);
    setNewTeamName('');
  };

  const addNetworkTeam = (n: any) => {
    if (teams.find(t => t.team_id === n.friend_team_id)) return;
    setTeams([...teams, { name: n.friend_team_name, team_id: n.friend_team_id, from_network: true }]);
    setShowNetPicker(false);
  };

  const removeTeam = (idx: number) => setTeams(teams.filter((_, i) => i !== idx));

  const createTournament = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Enter tournament name'); return; }
    if (teams.length < 2) { Alert.alert('Error', 'Add at least 2 teams'); return; }
    setCreating(true);
    try {
      const r = await fetch(`${API_URL}/api/tournaments`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({
          name: name.trim(), format, tournament_type: tType,
          start_date: startDate, end_date: endDate,
          teams, groups_count: parseInt(groupsCount) || 2,
          matches_per_pair: parseInt(matchesPerPair) || 1,
        }),
      });
      if (r.ok) {
        const t = await r.json();
        setTournament(t); setView('detail');
        setName(''); setTeams([]); fetchTournaments();
      } else { const e = await r.json().catch(() => ({})); Alert.alert('Error', e.detail || 'Failed'); }
    } catch { Alert.alert('Error', 'Network error'); }
    setCreating(false);
  };

  const submitResult = async () => {
    if (!showResult || !tournament) return;
    try {
      const r = await fetch(`${API_URL}/api/tournaments/${tournament.id}/result/${showResult.id}`, {
        method: 'PUT', headers: auth(),
        body: JSON.stringify({ home_score: parseInt(homeScore) || 0, away_score: parseInt(awayScore) || 0 }),
      });
      if (r.ok) { setTournament(await r.json()); setShowResult(null); setHomeScore(''); setAwayScore(''); }
    } catch {}
  };

  const deleteTournament = async (id: string) => {
    const doDelete = async () => {
      await fetch(`${API_URL}/api/tournaments/${id}`, { method: 'DELETE', headers: auth() });
      fetchTournaments(); if (tournament?.id === id) setView('hub');
    };
    if (Platform.OS === 'web') { if (window.confirm('Delete this tournament?')) doDelete(); }
    else Alert.alert('Delete', 'Delete this tournament?', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: doDelete }]);
  };

  // ====== HUB ======
  const renderHub = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll}>
      <Text style={s.pageTitle}>Tournaments</Text>

      <TouchableOpacity data-testid="create-tournament-btn" style={s.createBtn} onPress={() => setView('create')}>
        <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
        <Text style={s.createBtnText}>CREATE NEW TOURNAMENT</Text>
      </TouchableOpacity>

      <Text style={s.sectionLabel}>ONGOING</Text>
      {ongoing.length === 0 && <Text style={s.empty}>No ongoing tournaments</Text>}
      {ongoing.map(t => (
        <TouchableOpacity key={t.id} style={s.tournRow} onPress={() => openTournament(t.id)}>
          <MaterialCommunityIcons name="trophy" size={20} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={s.tournName}>{t.name}</Text>
            <Text style={s.tournMeta}>{t.tournament_type} · {t.teams?.length || 0} teams · {t.format}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#555" />
        </TouchableOpacity>
      ))}

      <Text style={s.sectionLabel}>COMPLETED</Text>
      {completed.length === 0 && <Text style={s.empty}>No completed tournaments</Text>}
      {completed.map(t => (
        <TouchableOpacity key={t.id} style={s.tournRow} onPress={() => openTournament(t.id)}>
          <MaterialCommunityIcons name="trophy" size={20} color="#4ADE80" />
          <View style={{ flex: 1 }}>
            <Text style={s.tournName}>{t.name}</Text>
            <Text style={s.tournMeta}>Winner: {t.winner || '-'} · {t.teams?.length || 0} teams</Text>
          </View>
          <TouchableOpacity hitSlop={{top:10,bottom:10,left:10,right:10}} onPress={(e) => { e.stopPropagation?.(); deleteTournament(t.id); }}>
            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#555" />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ====== CREATE ======
  const renderCreate = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll}>
      <TouchableOpacity style={s.backRow} onPress={() => setView('hub')}>
        <MaterialCommunityIcons name="arrow-left" size={20} color="#EAEAEA" />
        <Text style={s.backText}>Back</Text>
      </TouchableOpacity>
      <Text style={s.pageTitle}>Create Tournament</Text>

      <Text style={s.label}>TOURNAMENT NAME</Text>
      <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. Spring Cup 2026" placeholderTextColor="#555" />

      <Text style={s.label}>FORMAT</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {['5v5', '7v7', '9v9', '11v11'].map(f => (
          <TouchableOpacity key={f} style={[s.chip, format === f && s.chipActive]} onPress={() => setFormat(f)}>
            <Text style={[s.chipText, format === f && s.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={s.label}>TOURNAMENT TYPE</Text>
      <View style={s.typeRow}>
        {([['knockout', 'Knockout'], ['group_knockout', 'Group + Knockout'], ['league', 'League']] as [TType, string][]).map(([k, v]) => (
          <TouchableOpacity key={k} style={[s.typeCard, tType === k && s.typeCardActive]} onPress={() => setTType(k)}>
            <MaterialCommunityIcons name={k === 'knockout' ? 'tournament' : k === 'league' ? 'table' : 'group'} size={22} color={tType === k ? '#4ADE80' : '#666'} />
            <Text style={[s.typeText, tType === k && s.typeTextActive]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tType === 'group_knockout' && (
        <>
          <Text style={s.label}>NUMBER OF GROUPS</Text>
          <TextInput style={[s.input, { width: 80 }]} value={groupsCount} onChangeText={setGroupsCount} keyboardType="number-pad" />
        </>
      )}

      {(tType === 'league' || tType === 'group_knockout') && (
        <>
          <Text style={s.label}>MATCHES PER PAIR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {['1', '2', '3'].map(n => (
              <TouchableOpacity key={n} style={[s.chip, matchesPerPair === n && s.chipActive]} onPress={() => setMatchesPerPair(n)}>
                <Text style={[s.chipText, matchesPerPair === n && s.chipTextActive]}>{n}x</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <Text style={s.label}>DATE</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={startDate} onChangeText={setStartDate} placeholder="Start (YYYY-MM-DD)" placeholderTextColor="#555" />
        <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={endDate} onChangeText={setEndDate} placeholder="End (optional)" placeholderTextColor="#555" />
      </View>

      <Text style={s.label}>TEAMS ({teams.length})</Text>
      {teams.map((t, i) => (
        <View key={i} style={s.teamRow}>
          <MaterialCommunityIcons name={t.from_network ? 'account-group' : 'pencil'} size={14} color={t.from_network ? '#4ADE80' : '#888'} />
          <Text style={s.teamRowName}>{t.name}</Text>
          <TouchableOpacity onPress={() => removeTeam(i)}><MaterialCommunityIcons name="close" size={16} color="#EF4444" /></TouchableOpacity>
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 8 }}>
        <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={newTeamName} onChangeText={setNewTeamName}
          placeholder="Custom team name" placeholderTextColor="#555" onSubmitEditing={addCustomTeam} />
        <TouchableOpacity style={s.addTeamBtn} onPress={addCustomTeam}>
          <Text style={s.addTeamBtnText}>ADD</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={s.netPickerBtn} onPress={() => setShowNetPicker(true)}>
        <MaterialCommunityIcons name="account-group" size={16} color="#4ADE80" />
        <Text style={s.netPickerText}>Add from Network</Text>
      </TouchableOpacity>

      <TouchableOpacity data-testid="confirm-create-tournament" style={[s.greenBtn, (creating || teams.length < 2) && { opacity: 0.4 }]}
        onPress={createTournament} disabled={creating || teams.length < 2}>
        <MaterialCommunityIcons name="trophy" size={18} color="#FFF" />
        <Text style={s.greenBtnText}>{creating ? 'CREATING...' : 'CREATE TOURNAMENT'}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Network Picker Modal */}
      <Modal visible={showNetPicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHead}><Text style={s.modalTitle}>Add from Network</Text>
              <TouchableOpacity onPress={() => setShowNetPicker(false)}><MaterialCommunityIcons name="close" size={22} color="#666" /></TouchableOpacity>
            </View>
            {network.length === 0 && <Text style={s.empty}>No network contacts</Text>}
            {network.map(n => (
              <TouchableOpacity key={n.id} style={s.netItem} onPress={() => addNetworkTeam(n)}>
                <Text style={s.netItemName}>{n.friend_team_name}</Text>
                <Text style={s.netItemMeta}>{n.friend_team_format} · {n.friend_team_age_group || ''}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  // ====== DETAIL ======
  const renderDetail = () => {
    if (!tournament) return null;
    const matches = tournament.matches || [];
    const groups = tournament.groups || {};
    const isLeague = tournament.tournament_type === 'league';
    const isGroupKO = tournament.tournament_type === 'group_knockout';

    // Build standings
    const standingsMap: Record<string, any[]> = {};
    if (isLeague || isGroupKO) {
      for (const [gName, gTeams] of Object.entries(groups)) {
        const gMatches = matches.filter((m: any) => m.group === gName);
        standingsMap[gName] = computeStandings(gMatches, gTeams as string[]);
      }
    }

    // Organize knockout matches by rounds in order
    const koMatches = matches.filter((m: any) => m.round !== 'group');
    const groupMatches = matches.filter((m: any) => m.round === 'group');
    const roundOrder: string[] = [];
    const roundsMap: Record<string, any[]> = {};
    for (const m of koMatches) {
      if (!roundsMap[m.round]) { roundsMap[m.round] = []; roundOrder.push(m.round); }
      roundsMap[m.round].push(m);
    }
    // Also group matches
    const groupRoundsMap: Record<string, any[]> = {};
    for (const m of groupMatches) {
      const key = `Group ${m.group}`;
      if (!groupRoundsMap[key]) groupRoundsMap[key] = [];
      groupRoundsMap[key].push(m);
    }

    const downloadPdf = () => {
      const url = `${API_URL}/api/tournaments/${tournament.id}/pdf`;
      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', `${tournament.name}.pdf`);
        // Need to add auth header - use fetch + blob
        fetch(url, { headers: auth() })
          .then(r => r.blob())
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            a.href = blobUrl;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
          });
      }
    };

    // Bracket visualization for knockout
    const renderBracket = () => {
      if (roundOrder.length === 0) return null;
      return (
        <View style={s.bracketWrap}>
          <View style={s.bracketHeader}>
            <Text style={s.bracketTitle}>KNOCKOUT BRACKET</Text>
            <View style={s.bracketLine} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.bracketScroll}>
            {roundOrder.map((rname, ri) => {
              const rmatches = roundsMap[rname] || [];
              const isFinal = rname === 'Final';
              return (
                <View key={rname} style={s.bracketRound}>
                  <View style={[s.roundTag, isFinal && s.roundTagFinal]}>
                    <Text style={[s.roundTagText, isFinal && { color: '#F59E0B' }]}>{rname.toUpperCase()}</Text>
                  </View>
                  <View style={s.bracketMatchList}>
                    {rmatches.map((m: any, mi: number) => {
                      const homeWon = m.played && (m.home_score ?? 0) >= (m.away_score ?? 0);
                      const awayWon = m.played && (m.away_score ?? 0) > (m.home_score ?? 0);
                      return (
                        <View key={m.id} style={[s.bracketCard, isFinal && s.bracketCardFinal]}>
                          {/* Home */}
                          <View style={[s.bracketTeamRow, homeWon && s.bracketTeamWon]}>
                            <View style={[s.bracketDot, homeWon && { backgroundColor: '#4ADE80' }]} />
                            <Text style={[s.bracketTeamName, homeWon && { color: '#4ADE80', fontWeight: '800' }]} numberOfLines={1}>{m.home_team}</Text>
                            {m.played ? (
                              <Text style={[s.bracketScore, homeWon && { color: '#4ADE80' }]}>{m.home_score}</Text>
                            ) : null}
                          </View>
                          {/* Divider */}
                          <View style={s.bracketDivider} />
                          {/* Away */}
                          <View style={[s.bracketTeamRow, awayWon && s.bracketTeamWon]}>
                            <View style={[s.bracketDot, awayWon && { backgroundColor: '#4ADE80' }]} />
                            <Text style={[s.bracketTeamName, awayWon && { color: '#4ADE80', fontWeight: '800' }]} numberOfLines={1}>{m.away_team}</Text>
                            {m.played ? (
                              <Text style={[s.bracketScore, awayWon && { color: '#4ADE80' }]}>{m.away_score}</Text>
                            ) : null}
                          </View>
                          {/* Action */}
                          {!m.played && tournament.status !== 'completed' && (
                            <TouchableOpacity style={s.bracketResultBtn} onPress={() => { setShowResult(m); setHomeScore(''); setAwayScore(''); }}>
                              <Text style={s.bracketResultText}>ENTER RESULT</Text>
                            </TouchableOpacity>
                          )}
                          {/* Connector */}
                          {ri < roundOrder.length - 1 && (
                            <View style={s.connector}>
                              <View style={s.connectorLine} />
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      );
    };

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll}>
        <TouchableOpacity style={s.backRow} onPress={() => { setView('hub'); fetchTournaments(); }}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#EAEAEA" />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>

        {/* Tournament Header - CL inspired */}
        <View style={s.detailHeader}>
          <View style={s.trophyCircle}>
            <MaterialCommunityIcons name="trophy" size={26} color={tournament.status === 'completed' ? '#F59E0B' : '#4ADE80'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.detailName}>{tournament.name}</Text>
            <Text style={s.detailMeta}>{tournament.tournament_type.replace('_', ' ').toUpperCase()} · {tournament.format} · {tournament.teams?.length} TEAMS</Text>
          </View>
        </View>

        {/* PDF Download + Status */}
        <View style={s.actionBar}>
          {tournament.status === 'completed' && (
            <View style={s.winnerBadge}>
              <MaterialCommunityIcons name="trophy" size={14} color="#F59E0B" />
              <Text style={s.winnerBadgeText}>{tournament.winner}</Text>
            </View>
          )}
          <TouchableOpacity data-testid="download-pdf-btn" style={s.pdfBtn} onPress={downloadPdf}>
            <MaterialCommunityIcons name="file-pdf-box" size={18} color="#EF4444" />
            <Text style={s.pdfBtnText}>EXPORT PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Standings Tables */}
        {Object.entries(standingsMap).map(([gName, standings]) => (
          <View key={gName} style={{ marginBottom: 16 }}>
            <Text style={s.roundLabel}>{isLeague ? 'STANDINGS' : `GROUP ${gName}`}</Text>
            <View style={s.tableHead}>
              <Text style={[s.th, { flex: 1, textAlign: 'left' }]}>Team</Text>
              <Text style={s.th}>P</Text><Text style={s.th}>W</Text><Text style={s.th}>D</Text>
              <Text style={s.th}>L</Text><Text style={s.th}>GD</Text><Text style={[s.th, { color: '#4ADE80' }]}>Pts</Text>
            </View>
            {standings.map((row: any, i: number) => (
              <View key={row.team} style={[s.tableRow, i < 2 && isGroupKO && { borderLeftWidth: 2, borderLeftColor: '#4ADE80' }]}>
                <Text style={[s.td, { flex: 1, textAlign: 'left', fontWeight: '600' }]} numberOfLines={1}>{row.team}</Text>
                <Text style={s.td}>{row.played}</Text><Text style={s.td}>{row.won}</Text>
                <Text style={s.td}>{row.drawn}</Text><Text style={s.td}>{row.lost}</Text>
                <Text style={s.td}>{row.gd}</Text><Text style={[s.td, { color: '#4ADE80', fontWeight: '700' }]}>{row.points}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Group match results */}
        {Object.entries(groupRoundsMap).map(([gName, gMatches]) => (
          <View key={gName} style={{ marginBottom: 12 }}>
            <Text style={s.roundLabel}>{gName.toUpperCase()}</Text>
            {gMatches.map((m: any) => (
              <View key={m.id} style={s.matchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.matchTeams}>{m.home_team} vs {m.away_team}</Text>
                  {m.played ? <Text style={s.matchScore}>{m.home_score} - {m.away_score}</Text> : <Text style={s.matchPending}>Not played</Text>}
                </View>
                {!m.played && tournament.status !== 'completed' && (
                  <TouchableOpacity style={s.resultBtn} onPress={() => { setShowResult(m); setHomeScore(''); setAwayScore(''); }}>
                    <Text style={s.resultBtnText}>RESULT</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ))}

        {/* Bracket Visualization */}
        {renderBracket()}

        {/* Champion Banner */}
        {tournament.status === 'completed' && (
          <View style={s.winnerCard}>
            <View style={s.winnerStars}>
              <Text style={s.starText}>★</Text>
              <MaterialCommunityIcons name="trophy" size={40} color="#F59E0B" />
              <Text style={s.starText}>★</Text>
            </View>
            <Text style={s.winnerTitle}>CHAMPION</Text>
            <Text style={s.winnerName}>{tournament.winner}</Text>
            <View style={s.winnerAccent} />
          </View>
        )}

        <View style={{ height: 40 }} />

        {/* Result Modal */}
        <Modal visible={showResult !== null} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>Enter Result</Text>
              {showResult && (
                <>
                  <View style={s.scoreRow}>
                    <View style={s.scoreTeam}>
                      <Text style={s.scoreTeamName}>{showResult.home_team}</Text>
                      <TextInput style={s.scoreInput} value={homeScore} onChangeText={setHomeScore} keyboardType="number-pad" placeholder="0" placeholderTextColor="#555" />
                    </View>
                    <Text style={s.scoreDash}>-</Text>
                    <View style={s.scoreTeam}>
                      <Text style={s.scoreTeamName}>{showResult.away_team}</Text>
                      <TextInput style={s.scoreInput} value={awayScore} onChangeText={setAwayScore} keyboardType="number-pad" placeholder="0" placeholderTextColor="#555" />
                    </View>
                  </View>
                  <TouchableOpacity style={s.greenBtn} onPress={submitResult}>
                    <Text style={s.greenBtnText}>SAVE RESULT</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={s.ghostBtn} onPress={() => setShowResult(null)}>
                <Text style={s.ghostBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1C1E22', '#161819', '#111315']} style={s.bg}>
        {view === 'hub' && renderHub()}
        {view === 'create' && renderCreate()}
        {view === 'detail' && renderDetail()}

        {/* Bottom Nav */}
        <View style={s.tabBar}>
          <TouchableOpacity style={s.navTab} onPress={() => router.push('/')}>
            <MaterialCommunityIcons name="home" size={24} color="#555" />
            <Text style={s.navLabel}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.navTab} onPress={() => router.push('/messenger')}>
            <MaterialCommunityIcons name="message-text-outline" size={24} color="#555" />
            <Text style={s.navLabel}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.navTab} onPress={() => router.push('/calendar')}>
            <MaterialCommunityIcons name="calendar-outline" size={24} color="#555" />
            <Text style={s.navLabel}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.navTab} onPress={() => router.push('/my-network')}>
            <MaterialCommunityIcons name="account-group-outline" size={24} color="#555" />
            <Text style={s.navLabel}>Network</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

function computeStandings(matches: any[], teamNames: string[]) {
  const table: Record<string, any> = {};
  for (const name of teamNames) {
    table[name] = { team: name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
  }
  for (const m of matches) {
    if (!m.played) continue;
    const h = m.home_team, a = m.away_team;
    const hs = m.home_score ?? 0, as_ = m.away_score ?? 0;
    if (table[h]) {
      table[h].played++; table[h].gf += hs; table[h].ga += as_; table[h].gd = table[h].gf - table[h].ga;
      if (hs > as_) { table[h].won++; table[h].points += 3; }
      else if (hs === as_) { table[h].drawn++; table[h].points += 1; }
      else table[h].lost++;
    }
    if (table[a]) {
      table[a].played++; table[a].gf += as_; table[a].ga += hs; table[a].gd = table[a].gf - table[a].ga;
      if (as_ > hs) { table[a].won++; table[a].points += 3; }
      else if (hs === as_) { table[a].drawn++; table[a].points += 1; }
      else table[a].lost++;
    }
  }
  return Object.values(table).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
}

const s = StyleSheet.create({
  root: { flex: 1 },
  bg: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 20 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#EAEAEA', marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#666', letterSpacing: 2.5, marginTop: 20, marginBottom: 10 },
  empty: { fontSize: 13, color: '#555', paddingVertical: 8 },

  // Hub
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', borderRadius: 12, height: 50, marginBottom: 8 },
  createBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  tournRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  tournName: { fontSize: 15, fontWeight: '700', color: '#EAEAEA' },
  tournMeta: { fontSize: 11, color: '#888', marginTop: 2 },

  // Create
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  backText: { fontSize: 14, fontWeight: '600', color: '#EAEAEA' },
  label: { fontSize: 10, fontWeight: '600', color: '#666', letterSpacing: 2, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#EAEAEA', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  chipActive: { borderColor: '#4ADE80', backgroundColor: 'rgba(74,222,128,0.08)' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#666' },
  chipTextActive: { color: '#4ADE80' },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeCard: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 4 },
  typeCardActive: { borderColor: '#4ADE80', backgroundColor: 'rgba(74,222,128,0.06)' },
  typeText: { fontSize: 11, fontWeight: '600', color: '#666', textAlign: 'center' },
  typeTextActive: { color: '#4ADE80' },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  teamRowName: { fontSize: 13, fontWeight: '600', color: '#EAEAEA', flex: 1 },
  addTeamBtn: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  addTeamBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  netPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  netPickerText: { fontSize: 13, fontWeight: '600', color: '#4ADE80' },
  greenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', borderRadius: 12, height: 50 },
  greenBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  ghostBtn: { height: 44, justifyContent: 'center', alignItems: 'center' },
  ghostBtnText: { fontSize: 12, fontWeight: '600', color: '#666' },

  // Detail header - CL inspired
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  trophyCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.3)', justifyContent: 'center', alignItems: 'center' },
  detailName: { fontSize: 20, fontWeight: '900', color: '#EAEAEA', letterSpacing: 0.5 },
  detailMeta: { fontSize: 11, color: '#888', marginTop: 3, letterSpacing: 1 },

  // Action bar
  actionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 8 },
  winnerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  winnerBadgeText: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  pdfBtnText: { fontSize: 11, fontWeight: '700', color: '#EAEAEA', letterSpacing: 0.5 },
  roundLabel: { fontSize: 11, fontWeight: '700', color: '#666', letterSpacing: 2, marginBottom: 8, marginTop: 4 },

  // Standings table
  tableHead: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  th: { width: 30, fontSize: 9, fontWeight: '700', color: '#666', textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)', paddingLeft: 4 },
  td: { width: 30, fontSize: 12, color: '#888', textAlign: 'center' },

  // Matches
  matchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  matchTeams: { fontSize: 13, fontWeight: '600', color: '#EAEAEA' },
  matchScore: { fontSize: 14, fontWeight: '800', color: '#4ADE80', marginTop: 2 },
  matchPending: { fontSize: 11, color: '#666', marginTop: 2 },
  resultBtn: { backgroundColor: 'rgba(74,222,128,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)' },
  resultBtnText: { fontSize: 10, fontWeight: '700', color: '#4ADE80' },

  // Winner
  winnerCard: { alignItems: 'center', paddingVertical: 28, marginTop: 16, borderRadius: 16, backgroundColor: 'rgba(245,158,11,0.04)', borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.2)' },
  winnerStars: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  starText: { fontSize: 20, color: '#F59E0B' },
  winnerTitle: { fontSize: 11, fontWeight: '800', color: '#666', letterSpacing: 4, marginTop: 10 },
  winnerName: { fontSize: 24, fontWeight: '900', color: '#F59E0B', marginTop: 4, letterSpacing: 1 },
  winnerAccent: { width: 60, height: 2, backgroundColor: '#F59E0B', marginTop: 10, borderRadius: 1 },

  // Bracket
  bracketWrap: { marginTop: 16, marginBottom: 12 },
  bracketHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  bracketTitle: { fontSize: 12, fontWeight: '700', color: '#4ADE80', letterSpacing: 2 },
  bracketLine: { flex: 1, height: 1, backgroundColor: 'rgba(74,222,128,0.15)' },
  bracketScroll: { gap: 4, paddingRight: 20 },
  bracketRound: { width: 170, alignItems: 'stretch' },
  roundTag: { alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 10 },
  roundTagFinal: { backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  roundTagText: { fontSize: 9, fontWeight: '800', color: '#666', letterSpacing: 1.5 },
  bracketMatchList: { gap: 16 },
  bracketCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' as const, position: 'relative' as const },
  bracketCardFinal: { borderColor: 'rgba(245,158,11,0.25)', backgroundColor: 'rgba(245,158,11,0.03)' },
  bracketTeamRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
  bracketTeamWon: { backgroundColor: 'rgba(74,222,128,0.04)' },
  bracketDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#333' },
  bracketTeamName: { flex: 1, fontSize: 12, fontWeight: '600', color: '#AAA' },
  bracketScore: { fontSize: 14, fontWeight: '900', color: '#888', minWidth: 20, textAlign: 'right' as const },
  bracketDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  bracketResultBtn: { alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  bracketResultText: { fontSize: 9, fontWeight: '700', color: '#4ADE80', letterSpacing: 1 },
  connector: { position: 'absolute' as const, right: -8, top: '35%' as any, width: 8 },
  connectorLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },

  // Score modal
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginVertical: 20 },
  scoreTeam: { alignItems: 'center', flex: 1 },
  scoreTeamName: { fontSize: 13, fontWeight: '600', color: '#EAEAEA', marginBottom: 8, textAlign: 'center' },
  scoreInput: { width: 60, height: 60, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, textAlign: 'center', color: '#EAEAEA', fontSize: 28, fontWeight: '900', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  scoreDash: { fontSize: 24, fontWeight: '800', color: '#666' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E2025', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 36 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#EAEAEA' },
  netItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  netItemName: { fontSize: 14, fontWeight: '600', color: '#EAEAEA' },
  netItemMeta: { fontSize: 11, color: '#888', marginTop: 2 },

  // Bottom Nav
  tabBar: { flexDirection: 'row', height: 60, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', backgroundColor: '#131517' },
  navTab: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 2 },
  navLabel: { fontSize: 10, fontWeight: '500', color: '#555' },
});
