import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Switch, Modal, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp, PlayerData } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const FORMATS = ['5v5', '7v7', '9v9', '11v11'];
const AGE_GROUPS = ['U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'Senior'];
const isUnder13 = (age: string) => ['U8', 'U9', 'U10', 'U11', 'U12'].includes(age);

type Tab = 'overview' | 'squad' | 'squad-detail';

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'];

export default function TeamPage() {
  const router = useRouter();
  const { currentTeam, setCurrentTeam, saveTeam, token } = useApp();
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [playerStats, setPlayerStats] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  // Edit team settings
  const [showSettings, setShowSettings] = useState(false);
  const [editFormat, setEditFormat] = useState('');
  const [editAge, setEditAge] = useState('');

  // Add player modal
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPosition, setNewPosition] = useState('CM');

  // Edit player modal
  const [editPlayer, setEditPlayer] = useState<PlayerData | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editPlayerNum, setEditPlayerNum] = useState('');
  const [editPlayerPos, setEditPlayerPos] = useState('');

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  useEffect(() => {
    if (currentTeam?.players) {
      setPlayers(currentTeam.players.map(p => ({ ...p, available: p.available !== undefined ? p.available : true })));
    }
    if (currentTeam?.id) fetchStats();
  }, [currentTeam?.id]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/teams/${currentTeam!.id}/player-stats`, { headers: authHeaders() });
      const data = await res.json();
      setPlayerStats(data);
    } catch {}
  };

  const persist = async (updated: PlayerData[]) => {
    setPlayers(updated);
    setSaving(true);
    try { await saveTeam({ players: updated }); } catch {}
    setSaving(false);
  };

  const toggleAvailable = (id: string) => persist(players.map(p => p.id === id ? { ...p, available: !p.available } : p));
  const removePlayer = (id: string) => persist(players.filter(p => p.id !== id));

  const addPlayer = () => {
    if (!newName.trim()) return;
    const player: PlayerData = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newName.trim(), number: parseInt(newNumber) || (players.length + 1),
      position: newPosition, is_captain: false, is_starter: false,
      available: true, set_piece_roles: [],
    };
    persist([...players, player]);
    setNewName(''); setNewNumber(''); setNewPosition('CM'); setShowAdd(false);
  };

  const openEdit = (p: PlayerData) => {
    setEditPlayer(p); setEditPlayerName(p.name);
    setEditPlayerNum(String(p.number)); setEditPlayerPos(p.position);
  };

  const saveEdit = () => {
    if (!editPlayer || !editPlayerName.trim()) return;
    persist(players.map(p =>
      p.id === editPlayer.id ? { ...p, name: editPlayerName.trim(), number: parseInt(editPlayerNum) || p.number, position: editPlayerPos } : p
    ));
    setEditPlayer(null);
  };

  const saveSettings = async () => {
    setSaving(true);
    try { await saveTeam({ format: editFormat, age_group: editAge }); } catch {}
    setSaving(false);
    setShowSettings(false);
  };

  const ageGroup = currentTeam?.age_group || '';
  const under13 = isUnder13(ageGroup);
  const availableCount = players.filter(p => p.available).length;

  // =============== OVERVIEW TAB ===============
  const renderOverview = () => (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Team info card */}
      <View style={styles.infoCard}>
        <View style={styles.infoTop}>
          <View style={styles.teamBadge}>
            <MaterialCommunityIcons name="shield-half-full" size={32} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.teamNameLg}>{currentTeam?.name}</Text>
            <View style={styles.tagRow}>
              <View style={styles.tag}><Text style={styles.tagText}>{currentTeam?.format}</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>{currentTeam?.sport}</Text></View>
              {ageGroup ? <View style={styles.tag}><Text style={styles.tagText}>{ageGroup}</Text></View> : null}
            </View>
          </View>
          <TouchableOpacity testID="team-settings-btn" style={styles.settingsBtn} onPress={() => { setEditFormat(currentTeam?.format || ''); setEditAge(ageGroup); setShowSettings(true); }}>
            <MaterialCommunityIcons name="cog" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.statRow}>
          <View style={styles.stat}><Text style={styles.statNum}>{players.length}</Text><Text style={styles.statLbl}>Players</Text></View>
          <View style={styles.stat}><Text style={[styles.statNum, { color: Colors.primary }]}>{availableCount}</Text><Text style={styles.statLbl}>Available</Text></View>
          <View style={styles.stat}><Text style={styles.statNum}>{currentTeam?.formation || '—'}</Text><Text style={styles.statLbl}>Formation</Text></View>
        </View>
      </View>

      {/* Player table */}
      <Text style={styles.sectionTitle}>SQUAD ({players.length})</Text>
      <View style={styles.tableHead}>
        <Text style={[styles.thText, { width: 28 }]}>#</Text>
        <Text style={[styles.thText, { flex: 1 }]}>Name</Text>
        <Text style={[styles.thText, { width: 40, textAlign: 'center' }]}>Pos</Text>
        <Text style={[styles.thText, { width: 50, textAlign: 'center' }]}>Status</Text>
      </View>
      {players.map(p => (
        <View key={p.id} style={[styles.tableRow, !p.available && { opacity: 0.4 }]}>
          <Text style={[styles.tdNum, { width: 28 }]}>{p.number}</Text>
          <Text style={[styles.tdName, { flex: 1 }]} numberOfLines={1}>{p.name}</Text>
          <Text style={[styles.tdPos, { width: 40, textAlign: 'center' }]}>{p.position}</Text>
          <View style={{ width: 50, alignItems: 'center' }}>
            <View style={[styles.statusDot, { backgroundColor: p.available ? Colors.primary : Colors.destructive }]} />
          </View>
        </View>
      ))}

      {/* Navigation menu */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>TEAM MENU</Text>
      {[
        { key: 'squad', icon: 'account-group', label: 'Squad', desc: 'Manage players & availability', color: '#3B82F6' },
        { key: 'tactics', icon: 'strategy', label: 'Tactics & Formation', desc: 'Set up formation and positions', color: Colors.primary },
        { key: 'training', icon: 'whistle', label: 'Training Sessions', desc: 'AI suggested drills & sessions', color: '#8B5CF6' },
        { key: 'history', icon: 'history', label: 'Match History', desc: 'Past matches and results', color: '#F59E0B' },
        { key: 'match', icon: 'play-circle', label: 'Match Mode', desc: 'Go to match with current setup', color: '#EF4444' },
      ].map(item => (
        <TouchableOpacity
          key={item.key}
          testID={`menu-${item.key}`}
          style={styles.menuItem}
          onPress={() => {
            if (item.key === 'squad') setTab('squad');
            else if (item.key === 'tactics') router.push('/tactics');
            else if (item.key === 'training') router.push('/training');
            else if (item.key === 'history') router.push(`/match-history?teamId=${currentTeam?.id}`);
            else if (item.key === 'match') router.push('/match');
          }}
        >
          <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
            <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuDesc}>{item.desc}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  // =============== SQUAD TAB ===============
  const renderSquad = () => (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.squadHeader}>
        <View style={styles.squadTabs}>
          <TouchableOpacity testID="tab-basic" style={[styles.sqTab, tab === 'squad' && styles.sqTabActive]} onPress={() => setTab('squad')}>
            <Text style={[styles.sqTabText, tab === 'squad' && styles.sqTabTextActive]}>Availability</Text>
          </TouchableOpacity>
          {!under13 && (
            <TouchableOpacity testID="tab-detail" style={[styles.sqTab, tab === 'squad-detail' && styles.sqTabActive]} onPress={() => setTab('squad-detail')}>
              <Text style={[styles.sqTabText, tab === 'squad-detail' && styles.sqTabTextActive]}>Statistics</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity testID="add-player-btn" style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <MaterialCommunityIcons name="plus" size={14} color={Colors.white} />
          <Text style={styles.addBtnText}>ADD</Text>
        </TouchableOpacity>
      </View>

      {tab === 'squad' && players.map(p => {
        const st = playerStats[p.id];
        const matches = typeof st === 'object' ? st?.matches : (typeof st === 'number' ? st : 0);
        return (
          <View key={p.id} style={[styles.playerCard, !p.available && styles.playerCardOff]}>
            <View style={styles.playerLeft}>
              <View style={[styles.numCircle, !p.available && styles.numCircleOff]}>
                <Text style={styles.numText}>{p.number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.plName, !p.available && { color: Colors.textMuted }]}>{p.name}</Text>
                <View style={styles.plMeta}>
                  <View style={[styles.posBadge, !p.available && { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                    <Text style={[styles.posText, !p.available && { color: Colors.textMuted }]}>{p.position || '—'}</Text>
                  </View>
                  {matches > 0 && <Text style={styles.matchCnt}>{matches} match{matches !== 1 ? 'es' : ''}</Text>}
                </View>
              </View>
            </View>
            <View style={styles.playerRight}>
              <TouchableOpacity testID={`edit-${p.id}`} style={styles.eBtn} onPress={() => openEdit(p)}><MaterialCommunityIcons name="pencil-outline" size={14} color={Colors.textMuted} /></TouchableOpacity>
              <TouchableOpacity testID={`rm-${p.id}`} style={styles.eBtn} onPress={() => removePlayer(p.id)}><MaterialCommunityIcons name="close" size={14} color={Colors.destructive} /></TouchableOpacity>
              <Switch testID={`toggle-${p.id}`} value={p.available} onValueChange={() => toggleAvailable(p.id)} trackColor={{ false: Colors.border, true: 'rgba(0,200,83,0.3)' }} thumbColor={p.available ? Colors.primary : Colors.textMuted} style={Platform.OS === 'web' ? { transform: [{ scale: 0.75 }] } : undefined} />
            </View>
          </View>
        );
      })}

      {tab === 'squad-detail' && !under13 && (
        <>
          <View style={styles.detailHead}>
            <Text style={[styles.dh, { width: 28 }]}>#</Text>
            <Text style={[styles.dh, { flex: 1 }]}>Name</Text>
            <Text style={[styles.dh, { width: 36 }]}>Min</Text>
            <Text style={[styles.dh, { width: 28 }]}>Avg</Text>
            <Text style={[styles.dh, { width: 22 }]}>G</Text>
            <Text style={[styles.dh, { width: 22 }]}>A</Text>
            <Text style={[styles.dh, { width: 22 }]}>Y</Text>
            <Text style={[styles.dh, { width: 22 }]}>R</Text>
          </View>
          {players.map(p => {
            const st = typeof playerStats[p.id] === 'object' ? playerStats[p.id] : { matches: 0, minutes: 0, avg_rating: 0, goals: 0, assists: 0, yellow: 0, red: 0 };
            return (
              <View key={p.id} style={styles.detailRow}>
                <Text style={[styles.dd, { width: 28, fontWeight: '800' }]}>{p.number}</Text>
                <Text style={[styles.dd, { flex: 1 }]} numberOfLines={1}>{p.name}</Text>
                <Text style={[styles.dd, { width: 36 }]}>{st.minutes || 0}</Text>
                <Text style={[styles.dd, { width: 28, color: (st.avg_rating || 0) >= 7 ? Colors.primary : Colors.textSecondary }]}>{st.avg_rating || '—'}</Text>
                <Text style={[styles.dd, { width: 22 }]}>{st.goals || 0}</Text>
                <Text style={[styles.dd, { width: 22 }]}>{st.assists || 0}</Text>
                <Text style={[styles.dd, { width: 22, color: st.yellow ? '#F59E0B' : Colors.textMuted }]}>{st.yellow || 0}</Text>
                <Text style={[styles.dd, { width: 22, color: st.red ? Colors.destructive : Colors.textMuted }]}>{st.red || 0}</Text>
              </View>
            );
          })}
        </>
      )}

      {under13 && tab === 'squad-detail' && (
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={16} color={Colors.warning} />
          <Text style={styles.infoText}>Detailed statistics are not available for teams under 13 years old.</Text>
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="back-btn" onPress={() => { if (tab !== 'overview') setTab('overview'); else router.back(); }} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{currentTeam?.name || 'Team'}</Text>
          <Text style={styles.headerSub}>
            {tab === 'overview' ? `${currentTeam?.format} · ${currentTeam?.sport}` : tab === 'squad' ? 'Squad · Availability' : 'Squad · Statistics'}
          </Text>
        </View>
        {saving && <Text style={styles.savingText}>Saving...</Text>}
      </View>

      {tab === 'overview' ? renderOverview() : renderSquad()}

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHead}><Text style={styles.modalTitle}>Team Settings</Text><TouchableOpacity onPress={() => setShowSettings(false)}><MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} /></TouchableOpacity></View>
            <Text style={styles.fieldLabel}>FORMAT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {FORMATS.map(f => <TouchableOpacity key={f} style={[styles.chip, editFormat === f && styles.chipActive]} onPress={() => setEditFormat(f)}><Text style={[styles.chipText, editFormat === f && styles.chipTextActive]}>{f}</Text></TouchableOpacity>)}
            </ScrollView>
            <Text style={styles.fieldLabel}>AGE GROUP</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {AGE_GROUPS.map(a => <TouchableOpacity key={a} style={[styles.chip, editAge === a && styles.chipActive]} onPress={() => setEditAge(a)}><Text style={[styles.chipText, editAge === a && styles.chipTextActive]}>{a}</Text></TouchableOpacity>)}
            </ScrollView>
            <TouchableOpacity style={styles.confirmBtn} onPress={saveSettings}><Text style={styles.confirmBtnText}>SAVE CHANGES</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Player Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHead}><Text style={styles.modalTitle}>Add Player</Text><TouchableOpacity onPress={() => setShowAdd(false)}><MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} /></TouchableOpacity></View>
            <Text style={styles.fieldLabel}>NAME</Text>
            <TextInput testID="new-player-name" style={styles.input} value={newName} onChangeText={setNewName} placeholder="Player name" placeholderTextColor={Colors.textMuted} autoFocus />
            <Text style={styles.fieldLabel}>NUMBER</Text>
            <TextInput testID="new-player-number" style={styles.input} value={newNumber} onChangeText={setNewNumber} placeholder={String(players.length + 1)} placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />
            <Text style={styles.fieldLabel}>POSITION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>{POSITIONS.map(pos => <TouchableOpacity key={pos} style={[styles.chip, newPosition === pos && styles.chipActive]} onPress={() => setNewPosition(pos)}><Text style={[styles.chipText, newPosition === pos && styles.chipTextActive]}>{pos}</Text></TouchableOpacity>)}</ScrollView>
            <TouchableOpacity testID="confirm-add-player" style={styles.confirmBtn} onPress={addPlayer}><MaterialCommunityIcons name="plus" size={16} color={Colors.white} /><Text style={styles.confirmBtnText}>ADD PLAYER</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Player Modal */}
      <Modal visible={editPlayer !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHead}><Text style={styles.modalTitle}>Edit Player</Text><TouchableOpacity onPress={() => setEditPlayer(null)}><MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} /></TouchableOpacity></View>
            <Text style={styles.fieldLabel}>NAME</Text>
            <TextInput style={styles.input} value={editPlayerName} onChangeText={setEditPlayerName} placeholder="Name" placeholderTextColor={Colors.textMuted} />
            <Text style={styles.fieldLabel}>NUMBER</Text>
            <TextInput style={styles.input} value={editPlayerNum} onChangeText={setEditPlayerNum} keyboardType="number-pad" placeholderTextColor={Colors.textMuted} />
            <Text style={styles.fieldLabel}>POSITION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>{POSITIONS.map(pos => <TouchableOpacity key={pos} style={[styles.chip, editPlayerPos === pos && styles.chipActive]} onPress={() => setEditPlayerPos(pos)}><Text style={[styles.chipText, editPlayerPos === pos && styles.chipTextActive]}>{pos}</Text></TouchableOpacity>)}</ScrollView>
            <TouchableOpacity style={styles.confirmBtn} onPress={saveEdit}><MaterialCommunityIcons name="check" size={16} color={Colors.white} /><Text style={styles.confirmBtnText}>SAVE</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  savingText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  scroll: { padding: 16, paddingBottom: 40 },
  infoCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  infoTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  teamBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,200,83,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(0,200,83,0.2)' },
  teamNameLg: { fontSize: 20, fontWeight: '800', color: Colors.white },
  tagRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  tag: { backgroundColor: 'rgba(0,200,83,0.1)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  settingsBtn: { padding: 8, borderRadius: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  statRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: Colors.card, borderRadius: 8, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  statNum: { fontSize: 18, fontWeight: '800', color: Colors.white },
  statLbl: { fontSize: 9, fontWeight: '600', color: Colors.textMuted, letterSpacing: 1, marginTop: 2, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2.5, marginBottom: 8 },
  tableHead: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  thText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border + '30' },
  tdNum: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  tdName: { fontSize: 13, fontWeight: '600', color: Colors.white },
  tdPos: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundSecondary, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '700', color: Colors.white },
  menuDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  // Squad tab
  squadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  squadTabs: { flexDirection: 'row', gap: 4 },
  sqTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  sqTabActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.08)' },
  sqTabText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  sqTabTextActive: { color: Colors.primary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  playerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundSecondary, borderRadius: 10, padding: 8, marginBottom: 4, borderWidth: 1, borderColor: Colors.border },
  playerCardOff: { opacity: 0.45 },
  playerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  numCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,200,83,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.primary },
  numCircleOff: { borderColor: Colors.border, backgroundColor: 'rgba(255,255,255,0.03)' },
  numText: { fontSize: 12, fontWeight: '900', color: Colors.white },
  plName: { fontSize: 13, fontWeight: '700', color: Colors.white },
  plMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  posBadge: { backgroundColor: 'rgba(0,200,83,0.08)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  posText: { fontSize: 9, fontWeight: '700', color: Colors.primary },
  matchCnt: { fontSize: 9, color: Colors.textMuted },
  playerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eBtn: { padding: 5 },
  // Detail view
  detailHead: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dh: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, textAlign: 'center' },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border + '30' },
  dd: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 8, padding: 12, marginTop: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  infoText: { fontSize: 13, color: Colors.warning, flex: 1 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.backgroundSecondary, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.white },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 6, marginTop: 4 },
  input: { height: 44, backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 14, color: Colors.white, fontSize: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, marginRight: 6, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  chipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.1)' },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  chipTextActive: { color: Colors.primary },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, height: 46, borderRadius: 10, gap: 6 },
  confirmBtnText: { fontSize: 13, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
});
