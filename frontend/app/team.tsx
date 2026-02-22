import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Switch, Modal, Platform, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp, PlayerData } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const FORMATS = ['5v5', '7v7', '9v9', '11v11'];
const AGE_GROUPS = ['U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'Senior'];
const isUnder13 = (age: string) => ['U8', 'U9', 'U10', 'U11', 'U12'].includes(age);
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'];

type Tab = 'overview' | 'squad' | 'squad-detail';

export default function TeamPage() {
  const router = useRouter();
  const { currentTeam, setCurrentTeam, saveTeam, token } = useApp();
  const { width } = useWindowDimensions();
  const isWide = width >= 600;

  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [playerStats, setPlayerStats] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  const [showSettings, setShowSettings] = useState(false);
  const [editFormat, setEditFormat] = useState('');
  const [editAge, setEditAge] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPosition, setNewPosition] = useState('CM');
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

  const menuItems = [
    { key: 'squad', icon: 'account-group', label: 'Squad', color: '#3B82F6' },
    { key: 'tactics', icon: 'strategy', label: 'Tactics', color: Colors.primary },
    { key: 'training', icon: 'whistle', label: 'Training', color: '#8B5CF6' },
    { key: 'history', icon: 'history', label: 'History', color: '#F59E0B' },
    { key: 'match', icon: 'play-circle', label: 'Match', color: '#EF4444' },
  ];

  const navigateMenu = (key: string) => {
    if (key === 'squad') setTab('squad');
    else if (key === 'tactics') router.push('/tactics');
    else if (key === 'training') router.push('/training');
    else if (key === 'history') router.push(`/match-history?teamId=${currentTeam?.id}`);
    else if (key === 'match') router.push('/match');
  };

  // =============== SIDEBAR NAV ===============
  const renderSidebar = () => (
    <View style={[s.sidebar, !isWide && s.sidebarHoriz]}>
      {menuItems.map(item => (
        <TouchableOpacity
          key={item.key}
          testID={`menu-${item.key}`}
          style={[s.sideItem, !isWide && s.sideItemHoriz]}
          onPress={() => navigateMenu(item.key)}
        >
          <View style={[s.sideIcon, { backgroundColor: item.color + '18' }]}>
            <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
          </View>
          <Text style={s.sideLabel}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // =============== OVERVIEW TAB ===============
  const renderOverview = () => (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      {/* Compact team header */}
      <View style={s.infoBar}>
        <View style={s.badge}>
          <MaterialCommunityIcons name="shield-half-full" size={24} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.teamName}>{currentTeam?.name}</Text>
          <View style={s.tagRow}>
            <View style={s.tag}><Text style={s.tagText}>{currentTeam?.format}</Text></View>
            <View style={s.tag}><Text style={s.tagText}>{currentTeam?.sport}</Text></View>
            {ageGroup ? <View style={s.tag}><Text style={s.tagText}>{ageGroup}</Text></View> : null}
          </View>
        </View>
        <View style={s.miniStats}>
          <Text style={s.miniNum}>{players.length}</Text>
          <Text style={s.miniLbl}>PLR</Text>
        </View>
        <View style={s.miniStats}>
          <Text style={[s.miniNum, { color: Colors.primary }]}>{availableCount}</Text>
          <Text style={s.miniLbl}>AVL</Text>
        </View>
        <TouchableOpacity testID="team-settings-btn" style={s.settingsBtn} onPress={() => { setEditFormat(currentTeam?.format || ''); setEditAge(ageGroup); setShowSettings(true); }}>
          <MaterialCommunityIcons name="cog" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Main content: sidebar + table */}
      <View style={[s.mainRow, !isWide && { flexDirection: 'column' }]}>
        {renderSidebar()}

        {/* Player table */}
        <View style={s.tableWrap}>
          <View style={s.tableHeader}>
            <Text style={s.sectionTitle}>SQUAD ({players.length})</Text>
            <TouchableOpacity testID="add-player-btn" style={s.addBtn} onPress={() => setShowAdd(true)}>
              <MaterialCommunityIcons name="plus" size={12} color={Colors.white} />
              <Text style={s.addBtnText}>ADD</Text>
            </TouchableOpacity>
          </View>
          <View style={s.tHead}>
            <Text style={[s.th, { width: 26 }]}>#</Text>
            <Text style={[s.th, { flex: 1 }]}>Name</Text>
            <Text style={[s.th, { width: 34, textAlign: 'center' }]}>Pos</Text>
            <Text style={[s.th, { width: 40, textAlign: 'center' }]}>Avl</Text>
          </View>
          {players.map(p => (
            <TouchableOpacity key={p.id} testID={`player-row-${p.id}`} style={[s.tRow, !p.available && { opacity: 0.35 }]} onPress={() => openEdit(p)} activeOpacity={0.7}>
              <Text style={[s.tdNum, { width: 26 }]}>{p.number}</Text>
              <Text style={[s.tdName, { flex: 1 }]} numberOfLines={1}>{p.name}</Text>
              <Text style={[s.tdPos, { width: 34, textAlign: 'center' }]}>{p.position}</Text>
              <View style={{ width: 40, alignItems: 'center' }}>
                <View style={[s.dot, { backgroundColor: p.available ? Colors.primary : Colors.destructive }]} />
              </View>
            </TouchableOpacity>
          ))}
          {players.length === 0 && (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>No players yet. Add your first player.</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  // =============== SQUAD TAB ===============
  const renderSquad = () => (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.squadHeader}>
        <View style={s.squadTabs}>
          <TouchableOpacity testID="tab-basic" style={[s.sqTab, tab === 'squad' && s.sqTabActive]} onPress={() => setTab('squad')}>
            <Text style={[s.sqTabText, tab === 'squad' && s.sqTabTextActive]}>Availability</Text>
          </TouchableOpacity>
          {!under13 && (
            <TouchableOpacity testID="tab-detail" style={[s.sqTab, tab === 'squad-detail' && s.sqTabActive]} onPress={() => setTab('squad-detail')}>
              <Text style={[s.sqTabText, tab === 'squad-detail' && s.sqTabTextActive]}>Statistics</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity testID="squad-add-player-btn" style={s.addBtn} onPress={() => setShowAdd(true)}>
          <MaterialCommunityIcons name="plus" size={12} color={Colors.white} />
          <Text style={s.addBtnText}>ADD</Text>
        </TouchableOpacity>
      </View>

      {tab === 'squad' && players.map(p => (
        <View key={p.id} style={[s.playerCard, !p.available && s.playerCardOff]}>
          <View style={s.playerLeft}>
            <View style={[s.numCircle, !p.available && s.numCircleOff]}>
              <Text style={s.numText}>{p.number}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.plName, !p.available && { color: Colors.textMuted }]}>{p.name}</Text>
              <View style={s.plMeta}>
                <View style={[s.posBadge, !p.available && { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                  <Text style={[s.posText, !p.available && { color: Colors.textMuted }]}>{p.position || '-'}</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={s.playerRight}>
            <TouchableOpacity testID={`edit-${p.id}`} style={s.eBtn} onPress={() => openEdit(p)}><MaterialCommunityIcons name="pencil-outline" size={14} color={Colors.textMuted} /></TouchableOpacity>
            <TouchableOpacity testID={`rm-${p.id}`} style={s.eBtn} onPress={() => removePlayer(p.id)}><MaterialCommunityIcons name="close" size={14} color={Colors.destructive} /></TouchableOpacity>
            <Switch testID={`toggle-${p.id}`} value={p.available} onValueChange={() => toggleAvailable(p.id)} trackColor={{ false: Colors.border, true: 'rgba(0,200,83,0.3)' }} thumbColor={p.available ? Colors.primary : Colors.textMuted} style={Platform.OS === 'web' ? { transform: [{ scale: 0.7 }] } : undefined} />
          </View>
        </View>
      ))}

      {tab === 'squad-detail' && !under13 && (
        <>
          <View style={s.detailHead}>
            <Text style={[s.dh, { width: 26 }]}>#</Text>
            <Text style={[s.dh, { flex: 1 }]}>Name</Text>
            <Text style={[s.dh, { width: 34 }]}>Min</Text>
            <Text style={[s.dh, { width: 26 }]}>Avg</Text>
            <Text style={[s.dh, { width: 20 }]}>G</Text>
            <Text style={[s.dh, { width: 20 }]}>A</Text>
            <Text style={[s.dh, { width: 20 }]}>Y</Text>
            <Text style={[s.dh, { width: 20 }]}>R</Text>
          </View>
          {players.map(p => {
            const st = typeof playerStats[p.id] === 'object' ? playerStats[p.id] : {};
            return (
              <View key={p.id} style={s.detailRow}>
                <Text style={[s.dd, { width: 26, fontWeight: '800' }]}>{p.number}</Text>
                <Text style={[s.dd, { flex: 1, textAlign: 'left' }]} numberOfLines={1}>{p.name}</Text>
                <Text style={[s.dd, { width: 34 }]}>{st.minutes || 0}</Text>
                <Text style={[s.dd, { width: 26, color: (st.avg_rating || 0) >= 7 ? Colors.primary : Colors.textSecondary }]}>{st.avg_rating || '-'}</Text>
                <Text style={[s.dd, { width: 20 }]}>{st.goals || 0}</Text>
                <Text style={[s.dd, { width: 20 }]}>{st.assists || 0}</Text>
                <Text style={[s.dd, { width: 20, color: st.yellow ? '#F59E0B' : Colors.textMuted }]}>{st.yellow || 0}</Text>
                <Text style={[s.dd, { width: 20, color: st.red ? Colors.destructive : Colors.textMuted }]}>{st.red || 0}</Text>
              </View>
            );
          })}
        </>
      )}

      {under13 && tab === 'squad-detail' && (
        <View style={s.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={16} color={Colors.warning} />
          <Text style={s.infoText}>Detailed statistics are not available for teams under 13.</Text>
        </View>
      )}
      <View style={{ height: 60 }} />
    </ScrollView>
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity testID="back-btn" onPress={() => { if (tab !== 'overview') setTab('overview'); else router.back(); }} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{currentTeam?.name || 'Team'}</Text>
          <Text style={s.headerSub}>
            {tab === 'overview' ? `${currentTeam?.format} · ${currentTeam?.sport}` : tab === 'squad' ? 'Availability' : 'Statistics'}
          </Text>
        </View>
        {saving && <Text style={s.savingText}>Saving...</Text>}
      </View>

      {tab === 'overview' ? renderOverview() : renderSquad()}

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHead}><Text style={s.modalTitle}>Team Settings</Text><TouchableOpacity onPress={() => setShowSettings(false)}><MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} /></TouchableOpacity></View>
            <Text style={s.fieldLabel}>FORMAT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {FORMATS.map(f => <TouchableOpacity key={f} style={[s.chip, editFormat === f && s.chipActive]} onPress={() => setEditFormat(f)}><Text style={[s.chipText, editFormat === f && s.chipTextActive]}>{f}</Text></TouchableOpacity>)}
            </ScrollView>
            <Text style={s.fieldLabel}>AGE GROUP</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {AGE_GROUPS.map(a => <TouchableOpacity key={a} style={[s.chip, editAge === a && s.chipActive]} onPress={() => setEditAge(a)}><Text style={[s.chipText, editAge === a && s.chipTextActive]}>{a}</Text></TouchableOpacity>)}
            </ScrollView>
            <TouchableOpacity testID="save-settings-btn" style={s.confirmBtn} onPress={saveSettings}><Text style={s.confirmBtnText}>SAVE CHANGES</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Player Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHead}><Text style={s.modalTitle}>Add Player</Text><TouchableOpacity onPress={() => setShowAdd(false)}><MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} /></TouchableOpacity></View>
            <Text style={s.fieldLabel}>NAME</Text>
            <TextInput testID="new-player-name" style={s.input} value={newName} onChangeText={setNewName} placeholder="Player name" placeholderTextColor={Colors.textMuted} autoFocus />
            <Text style={s.fieldLabel}>NUMBER</Text>
            <TextInput testID="new-player-number" style={s.input} value={newNumber} onChangeText={setNewNumber} placeholder={String(players.length + 1)} placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />
            <Text style={s.fieldLabel}>POSITION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>{POSITIONS.map(pos => <TouchableOpacity key={pos} style={[s.chip, newPosition === pos && s.chipActive]} onPress={() => setNewPosition(pos)}><Text style={[s.chipText, newPosition === pos && s.chipTextActive]}>{pos}</Text></TouchableOpacity>)}</ScrollView>
            <TouchableOpacity testID="confirm-add-player" style={s.confirmBtn} onPress={addPlayer}><MaterialCommunityIcons name="plus" size={16} color={Colors.white} /><Text style={s.confirmBtnText}>ADD PLAYER</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Player Modal */}
      <Modal visible={editPlayer !== null} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHead}><Text style={s.modalTitle}>Edit Player</Text><TouchableOpacity onPress={() => setEditPlayer(null)}><MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} /></TouchableOpacity></View>
            <Text style={s.fieldLabel}>NAME</Text>
            <TextInput style={s.input} value={editPlayerName} onChangeText={setEditPlayerName} placeholder="Name" placeholderTextColor={Colors.textMuted} />
            <Text style={s.fieldLabel}>NUMBER</Text>
            <TextInput style={s.input} value={editPlayerNum} onChangeText={setEditPlayerNum} keyboardType="number-pad" placeholderTextColor={Colors.textMuted} />
            <Text style={s.fieldLabel}>POSITION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>{POSITIONS.map(pos => <TouchableOpacity key={pos} style={[s.chip, editPlayerPos === pos && s.chipActive]} onPress={() => setEditPlayerPos(pos)}><Text style={[s.chipText, editPlayerPos === pos && s.chipTextActive]}>{pos}</Text></TouchableOpacity>)}</ScrollView>
            <TouchableOpacity testID="save-edit-player" style={s.confirmBtn} onPress={saveEdit}><MaterialCommunityIcons name="check" size={16} color={Colors.white} /><Text style={s.confirmBtnText}>SAVE</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  savingText: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  scroll: { padding: 12, paddingBottom: 30 },

  // Compact info bar
  infoBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.backgroundSecondary, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  badge: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,200,83,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,200,83,0.2)' },
  teamName: { fontSize: 16, fontWeight: '800', color: Colors.white },
  tagRow: { flexDirection: 'row', gap: 4, marginTop: 2 },
  tag: { backgroundColor: 'rgba(0,200,83,0.1)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3 },
  tagText: { fontSize: 9, fontWeight: '700', color: Colors.primary },
  miniStats: { alignItems: 'center', paddingHorizontal: 6 },
  miniNum: { fontSize: 16, fontWeight: '800', color: Colors.white },
  miniLbl: { fontSize: 8, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  settingsBtn: { padding: 6, borderRadius: 6, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },

  // Main row with sidebar
  mainRow: { flexDirection: 'row', gap: 10 },

  // Sidebar
  sidebar: { width: 72, gap: 4 },
  sidebarHoriz: { width: '100%', flexDirection: 'row', gap: 4, marginBottom: 10 },
  sideItem: { alignItems: 'center', backgroundColor: Colors.backgroundSecondary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 4, borderWidth: 1, borderColor: Colors.border },
  sideItemHoriz: { flex: 1 },
  sideIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 3 },
  sideLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, textAlign: 'center' },

  // Player table
  tableWrap: { flex: 1 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  addBtnText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  tHead: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  th: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  tRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border + '30' },
  tdNum: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  tdName: { fontSize: 12, fontWeight: '600', color: Colors.white },
  tdPos: { fontSize: 10, fontWeight: '600', color: Colors.textMuted },
  dot: { width: 7, height: 7, borderRadius: 4 },
  emptyBox: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 12, color: Colors.textMuted },

  // Squad tab
  squadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  squadTabs: { flexDirection: 'row', gap: 4 },
  sqTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  sqTabActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.08)' },
  sqTabText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  sqTabTextActive: { color: Colors.primary },
  playerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundSecondary, borderRadius: 8, padding: 6, marginBottom: 3, borderWidth: 1, borderColor: Colors.border },
  playerCardOff: { opacity: 0.4 },
  playerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  numCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,200,83,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.primary },
  numCircleOff: { borderColor: Colors.border, backgroundColor: 'rgba(255,255,255,0.03)' },
  numText: { fontSize: 11, fontWeight: '900', color: Colors.white },
  plName: { fontSize: 12, fontWeight: '700', color: Colors.white },
  plMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  posBadge: { backgroundColor: 'rgba(0,200,83,0.08)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  posText: { fontSize: 8, fontWeight: '700', color: Colors.primary },
  playerRight: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  eBtn: { padding: 4 },

  // Detail view
  detailHead: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dh: { fontSize: 8, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, textAlign: 'center' },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border + '30' },
  dd: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 8, padding: 10, marginTop: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  infoText: { fontSize: 12, color: Colors.warning, flex: 1 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.backgroundSecondary, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 36 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.white },
  fieldLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 5, marginTop: 4 },
  input: { height: 42, backgroundColor: Colors.card, borderRadius: 8, paddingHorizontal: 12, color: Colors.white, fontSize: 13, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 5, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  chipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.1)' },
  chipText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  chipTextActive: { color: Colors.primary },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, height: 42, borderRadius: 8, gap: 6 },
  confirmBtnText: { fontSize: 12, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
});
