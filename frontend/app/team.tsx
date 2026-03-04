import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Switch, Modal, Platform, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp, PlayerData } from '../src/context/AppContext';
import { COUNTRIES, getFlagForCode } from '../src/constants/countries';
import BottomNav from '../src/components/BottomNav';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const FORMATS = ['5v5', '7v7', '9v9', '11v11'];
const AGE_GROUPS = ['U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'Senior'];
const GENDERS = ['Gutter', 'Jenter', 'Mixed'];
const GENDER_DISPLAY: Record<string, string> = { 'Gutter': 'Boys', 'Jenter': 'Girls', 'Mixed': 'Mixed' };
const isUnder13 = (age: string) => ['U8', 'U9', 'U10', 'U11', 'U12'].includes(age);
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'];

type Tab = 'overview' | 'squad' | 'squad-detail';

export default function TeamPage() {
  const router = useRouter();
  const { currentTeam, setCurrentTeam, saveTeam, token } = useApp();
  const { width } = useWindowDimensions();

  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [playerStats, setPlayerStats] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  const [showSettings, setShowSettings] = useState(false);
  const [editFormat, setEditFormat] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editManagerName, setEditManagerName] = useState('');
  const [editManagerPhone, setEditManagerPhone] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPosition, setNewPosition] = useState('CM');
  const [editPlayer, setEditPlayer] = useState<PlayerData | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editPlayerNum, setEditPlayerNum] = useState('');
  const [editPlayerPos, setEditPlayerPos] = useState('');

  const auth = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  useEffect(() => {
    if (currentTeam?.players) {
      setPlayers(currentTeam.players.map(p => ({ ...p, available: p.available !== undefined ? p.available : true })));
    }
    if (currentTeam?.id) { fetchStats(); fetchFeed(); fetchInvites(); }
  }, [currentTeam?.id]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/teams/${currentTeam!.id}/player-stats`, { headers: auth() });
      if (res.ok) setPlayerStats(await res.json());
    } catch {}
  };

  const fetchFeed = async () => {
    try {
      // Get team messages/notifications
      const res = await fetch(`${API_URL}/api/messages?team_id=${currentTeam!.id}`, { headers: auth() });
      if (res.ok) setFeedItems((await res.json()).slice(0, 5));
      // Get calendar for next match
      const cal = await fetch(`${API_URL}/api/teams/${currentTeam!.id}/calendar`, { headers: auth() });
      if (cal.ok) {
        const events = await cal.json();
        const upcoming = events.filter((e: any) => e.status === 'upcoming' && e.date >= new Date().toISOString().split('T')[0]);
        if (upcoming.length > 0) setNextMatch(upcoming[0]);
      }
    } catch {}
  };

  const fetchInvites = async () => {
    try {
      const res = await fetch(`${API_URL}/api/friendly-invites?team_id=${currentTeam!.id}`, { headers: auth() });
      if (res.ok) {
        const all = await res.json();
        setPendingInvites(all.filter((i: any) => i.status === 'pending'));
      }
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
    try {
      await saveTeam({
        format: editFormat, age_group: editAge, gender: editGender,
        country: editCountry, manager_name: editManagerName, manager_phone: editManagerPhone,
      });
    } catch {}
    setSaving(false);
    setShowSettings(false);
  };

  const openSettings = () => {
    setEditFormat(currentTeam?.format || '');
    setEditAge(currentTeam?.age_group || '');
    setEditGender(currentTeam?.gender || '');
    setEditCountry(currentTeam?.country || '');
    setEditManagerName(currentTeam?.manager_name || '');
    setEditManagerPhone(currentTeam?.manager_phone || '');
    setShowSettings(true);
  };

  const ageGroup = currentTeam?.age_group || '';
  const under13 = isUnder13(ageGroup);
  const availableCount = players.filter(p => p.available).length;

  const menuItems = [
    { key: 'squad', icon: 'account-group', label: 'Squad', color: '#3B82F6' },
    { key: 'tactics', icon: 'strategy', label: 'Tactics', color: '#4ADE80' },
    { key: 'calendar', icon: 'calendar-month', label: 'Calendar', color: '#06B6D4' },
    { key: 'friendly', icon: 'handshake', label: 'Friendly', color: '#10B981' },
    { key: 'tournament', icon: 'trophy', label: 'Tournament', color: '#F59E0B' },
    { key: 'training', icon: 'whistle', label: 'Training', color: '#8B5CF6' },
    { key: 'history', icon: 'history', label: 'History', color: '#F59E0B' },
    { key: 'match', icon: 'play-circle', label: 'Match', color: '#EF4444' },
  ];

  const navigateMenu = (key: string) => {
    if (key === 'squad') setTab('squad');
    else if (key === 'tactics') router.push('/tactics');
    else if (key === 'calendar') router.push(`/calendar?teamId=${currentTeam?.id}`);
    else if (key === 'friendly') router.push(`/friendly-matches?teamId=${currentTeam?.id}`);
    else if (key === 'tournament') router.push('/tournament');
    else if (key === 'training') router.push('/training');
    else if (key === 'history') router.push(`/match-history?teamId=${currentTeam?.id}`);
    else if (key === 'match') router.push('/match');
  };

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // =============== OVERVIEW ===============
  const renderOverview = () => (
    <View style={{ flex: 1 }}>
      {/* Fixed Header Section */}
      <View style={s.scroll}>
        {/* Team Header */}
        <View style={s.teamHeader}>
          <View style={s.shieldWrap}>
            {currentTeam?.country ? (
              <View style={s.shieldInner}>
                <Text style={{ fontSize: 22 }}>{getFlagForCode(currentTeam.country)}</Text>
              </View>
            ) : <MaterialCommunityIcons name="shield-half-full" size={32} color="#555" />}
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.badgeRow}>
              <View style={s.badge}><Text style={s.badgeText}>{currentTeam?.format}</Text></View>
              {ageGroup ? <View style={s.badge}><Text style={s.badgeText}>{ageGroup}</Text></View> : null}
              <View style={s.badge}><Text style={s.badgeText}>{currentTeam?.sport}</Text></View>
            </View>
          </View>
          <View style={s.statsGroup}>
            <View style={s.statItem}><Text style={s.statNum}>{players.length}</Text><Text style={s.statLbl}>PLR</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: '#4ADE80' }]}>{availableCount}</Text><Text style={s.statLbl}>AVL</Text></View>
          </View>
          <TouchableOpacity data-testid="team-settings-btn" style={s.settingsIcon} onPress={openSettings}>
            <MaterialCommunityIcons name="cog-outline" size={20} color="#777" />
          </TouchableOpacity>
        </View>

        {/* Team Code */}
        {currentTeam?.team_code ? (
          <View style={s.codeRow}>
            <MaterialCommunityIcons name="key-variant" size={14} color="#4ADE80" />
            <Text style={s.codeLabel}>CODE</Text>
            <Text style={s.codeValue}>{currentTeam.team_code}</Text>
            <Text style={s.codeHint}>Share to invite</Text>
          </View>
        ) : null}

        {/* Manager */}
        {currentTeam?.manager_name ? (
          <View style={s.managerRow}>
            <MaterialCommunityIcons name="account-tie" size={14} color="#666" />
            <Text style={s.managerText}>{currentTeam.manager_name}{currentTeam.manager_phone ? ` · ${currentTeam.manager_phone}` : ''}</Text>
          </View>
        ) : null}

        {/* Quick Actions Menu */}
        <View style={s.menuGrid}>
          {menuItems.map(item => (
            <TouchableOpacity key={item.key} data-testid={`menu-${item.key}`} style={s.menuItem} onPress={() => navigateMenu(item.key)} activeOpacity={0.7}>
              <View style={[s.menuIconWrap, { backgroundColor: item.color + '18' }]}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={s.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Scrollable Feed Section */}
      <Text style={[s.sectionLabel, { paddingHorizontal: 16 }]}>FEED</Text>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Next Match Highlight */}
      {nextMatch && (
        <View style={s.matchCard}>
          <View style={s.matchBadge}><Text style={s.matchBadgeText}>NEXT MATCH</Text></View>
          <Text style={s.matchTitle}>{nextMatch.opponent || 'TBD'}</Text>
          <Text style={s.matchDate}>{nextMatch.date}{nextMatch.time ? ` · ${nextMatch.time}` : ''}{nextMatch.pitch_name ? ` · ${nextMatch.pitch_name}` : ''}</Text>
        </View>
      )}

      {/* Pending Invites Reminder */}
      {pendingInvites.length > 0 && (
        <TouchableOpacity style={s.reminderRow} onPress={() => router.push(`/friendly-matches?teamId=${currentTeam?.id}`)}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#F59E0B" />
          <Text style={s.reminderText}>{pendingInvites.length} pending friendly request{pendingInvites.length > 1 ? 's' : ''} — tap to respond</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color="#666" />
        </TouchableOpacity>
      )}

      {/* Feed Items */}
      {feedItems.length === 0 && !nextMatch && pendingInvites.length === 0 && (
        <Text style={s.emptyText}>No activity yet. Schedule a match or invite a team!</Text>
      )}
      {feedItems.map(item => (
        <TouchableOpacity key={item.id} style={s.feedRow} activeOpacity={0.7}
          onPress={() => {
            if (item.type?.includes('invite') || item.type?.includes('friendly')) router.push(`/friendly-matches?teamId=${currentTeam?.id}`);
            else if (item.type?.includes('network')) router.push('/my-network');
            else router.push(`/friendly-matches?teamId=${currentTeam?.id}`);
          }}>
          <MaterialCommunityIcons
            name={item.type?.includes('invite') ? 'handshake' : item.type?.includes('network') ? 'account-plus' : 'bell-outline'}
            size={16} color={item.read ? '#555' : '#4ADE80'} />
          <View style={{ flex: 1 }}>
            <Text style={[s.feedTitle, !item.read && { color: '#EAEAEA' }]}>{item.title}</Text>
            <Text style={s.feedTime}>{formatTime(item.created_at)}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={16} color="#444" />
        </TouchableOpacity>
      ))}

      <View style={{ height: 20 }} />
    </ScrollView>
    </View>
  );

  // =============== SQUAD ===============
  const renderSquad = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.squadHeader}>
        <View style={s.squadTabs}>
          <TouchableOpacity data-testid="tab-basic" style={[s.sqTab, tab === 'squad' && s.sqTabActive]} onPress={() => setTab('squad')}>
            <Text style={[s.sqTabText, tab === 'squad' && s.sqTabTextActive]}>Availability</Text>
          </TouchableOpacity>
          {!under13 && (
            <TouchableOpacity data-testid="tab-detail" style={[s.sqTab, tab === 'squad-detail' && s.sqTabActive]} onPress={() => setTab('squad-detail')}>
              <Text style={[s.sqTabText, tab === 'squad-detail' && s.sqTabTextActive]}>Statistics</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity data-testid="squad-add-player-btn" style={s.addPlayerBtn} onPress={() => setShowAdd(true)}>
          <MaterialCommunityIcons name="plus" size={14} color="#FFF" />
          <Text style={s.addPlayerText}>ADD</Text>
        </TouchableOpacity>
      </View>

      {tab === 'squad' && players.map(p => (
        <View key={p.id} style={[s.playerRow, !p.available && { opacity: 0.35 }]}>
          <View style={[s.numCircle, !p.available && { borderColor: '#333', backgroundColor: 'rgba(255,255,255,0.02)' }]}>
            <Text style={s.numText}>{p.number}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.plName}>{p.name}</Text>
            <View style={s.badgeRow}>
              <View style={[s.badge, { borderColor: '#3B82F6' }]}><Text style={[s.badgeText, { color: '#3B82F6' }]}>{p.position || '-'}</Text></View>
            </View>
          </View>
          <TouchableOpacity data-testid={`edit-${p.id}`} style={s.actionBtn} onPress={() => openEdit(p)}>
            <MaterialCommunityIcons name="pencil-outline" size={14} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity data-testid={`rm-${p.id}`} style={s.actionBtn} onPress={() => removePlayer(p.id)}>
            <MaterialCommunityIcons name="close" size={14} color="#EF4444" />
          </TouchableOpacity>
          <Switch data-testid={`toggle-${p.id}`} value={p.available} onValueChange={() => toggleAvailable(p.id)}
            trackColor={{ false: '#333', true: 'rgba(74,222,128,0.3)' }}
            thumbColor={p.available ? '#4ADE80' : '#666'}
            style={Platform.OS === 'web' ? { transform: [{ scale: 0.7 }] } : undefined} />
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
                <Text style={[s.dd, { width: 26, color: (st.avg_rating || 0) >= 7 ? '#4ADE80' : '#888' }]}>{st.avg_rating || '-'}</Text>
                <Text style={[s.dd, { width: 20 }]}>{st.goals || 0}</Text>
                <Text style={[s.dd, { width: 20 }]}>{st.assists || 0}</Text>
                <Text style={[s.dd, { width: 20, color: st.yellow ? '#F59E0B' : '#555' }]}>{st.yellow || 0}</Text>
                <Text style={[s.dd, { width: 20, color: st.red ? '#EF4444' : '#555' }]}>{st.red || 0}</Text>
              </View>
            );
          })}
        </>
      )}

      {under13 && tab === 'squad-detail' && (
        <View style={s.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#F59E0B" />
          <Text style={s.infoBoxText}>Detailed statistics not available for teams under 13.</Text>
        </View>
      )}
      <View style={{ height: 80 }} />
    </ScrollView>
  );

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1C1E22', '#161819', '#111315']} style={s.bg}>
        {/* Top Header */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.push('/')} style={{ padding: 4 }}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#888" />
          </TouchableOpacity>
          <Text style={s.pageName}>{tab === 'overview' ? currentTeam?.name || 'Team' : tab === 'squad' ? 'Availability' : 'Statistics'}</Text>
          <View style={s.topRight}>
            {saving && <Text style={s.savingText}>Saving...</Text>}
            {tab !== 'overview' && (
              <TouchableOpacity onPress={() => setTab('overview')}>
                <Text style={s.backLink}>Overview</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {tab === 'overview' ? renderOverview() : renderSquad()}
      </LinearGradient>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <ScrollView contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }}>
            <View style={s.modalContent}>
              <View style={s.modalHead}><Text style={s.modalTitle}>Team Settings</Text><TouchableOpacity onPress={() => setShowSettings(false)}><MaterialCommunityIcons name="close" size={22} color="#666" /></TouchableOpacity></View>
              <Text style={s.fieldLabel}>FORMAT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {FORMATS.map(f => <TouchableOpacity key={f} style={[s.chip, editFormat === f && s.chipActive]} onPress={() => setEditFormat(f)}><Text style={[s.chipText, editFormat === f && s.chipTextActive]}>{f}</Text></TouchableOpacity>)}
              </ScrollView>
              <Text style={s.fieldLabel}>GENDER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {GENDERS.map(g => <TouchableOpacity key={g} data-testid={`settings-gender-${g}`} style={[s.chip, editGender === g && s.chipActive]} onPress={() => setEditGender(g)}><Text style={[s.chipText, editGender === g && s.chipTextActive]}>{GENDER_DISPLAY[g] || g}</Text></TouchableOpacity>)}
              </ScrollView>
              <Text style={s.fieldLabel}>AGE GROUP</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {AGE_GROUPS.map(a => <TouchableOpacity key={a} style={[s.chip, editAge === a && s.chipActive]} onPress={() => setEditAge(a)}><Text style={[s.chipText, editAge === a && s.chipTextActive]}>{a}</Text></TouchableOpacity>)}
              </ScrollView>
              <Text style={s.fieldLabel}>COUNTRY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {COUNTRIES.map(c => <TouchableOpacity key={c.code} data-testid={`settings-country-${c.code}`} style={[s.countryChip, editCountry === c.code && s.countryChipActive]} onPress={() => setEditCountry(c.code)}><Text style={{ fontSize: 16 }}>{c.flag}</Text><Text style={[s.chipText, editCountry === c.code && s.chipTextActive]}>{c.name}</Text></TouchableOpacity>)}
              </ScrollView>
              <Text style={s.fieldLabel}>MANAGER NAME</Text>
              <TextInput style={s.input} value={editManagerName} onChangeText={setEditManagerName} placeholder="Manager name" placeholderTextColor="#555" />
              <Text style={s.fieldLabel}>PHONE</Text>
              <TextInput style={s.input} value={editManagerPhone} onChangeText={setEditManagerPhone} placeholder="Phone number" placeholderTextColor="#555" keyboardType="phone-pad" />
              <TouchableOpacity data-testid="save-settings-btn" style={s.confirmBtn} onPress={saveSettings}><Text style={s.confirmBtnText}>SAVE CHANGES</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Player Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHead}><Text style={s.modalTitle}>Add Player</Text><TouchableOpacity onPress={() => setShowAdd(false)}><MaterialCommunityIcons name="close" size={22} color="#666" /></TouchableOpacity></View>
            <Text style={s.fieldLabel}>NAME</Text>
            <TextInput data-testid="new-player-name" style={s.input} value={newName} onChangeText={setNewName} placeholder="Player name" placeholderTextColor="#555" autoFocus />
            <Text style={s.fieldLabel}>NUMBER</Text>
            <TextInput data-testid="new-player-number" style={s.input} value={newNumber} onChangeText={setNewNumber} placeholder={String(players.length + 1)} placeholderTextColor="#555" keyboardType="number-pad" />
            <Text style={s.fieldLabel}>POSITION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>{POSITIONS.map(pos => <TouchableOpacity key={pos} style={[s.chip, newPosition === pos && s.chipActive]} onPress={() => setNewPosition(pos)}><Text style={[s.chipText, newPosition === pos && s.chipTextActive]}>{pos}</Text></TouchableOpacity>)}</ScrollView>
            <TouchableOpacity data-testid="confirm-add-player" style={s.confirmBtn} onPress={addPlayer}><MaterialCommunityIcons name="plus" size={16} color="#FFF" /><Text style={s.confirmBtnText}>ADD PLAYER</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Player Modal */}
      <Modal visible={editPlayer !== null} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHead}><Text style={s.modalTitle}>Edit Player</Text><TouchableOpacity onPress={() => setEditPlayer(null)}><MaterialCommunityIcons name="close" size={22} color="#666" /></TouchableOpacity></View>
            <Text style={s.fieldLabel}>NAME</Text>
            <TextInput style={s.input} value={editPlayerName} onChangeText={setEditPlayerName} placeholder="Name" placeholderTextColor="#555" />
            <Text style={s.fieldLabel}>NUMBER</Text>
            <TextInput style={s.input} value={editPlayerNum} onChangeText={setEditPlayerNum} keyboardType="number-pad" placeholderTextColor="#555" />
            <Text style={s.fieldLabel}>POSITION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>{POSITIONS.map(pos => <TouchableOpacity key={pos} style={[s.chip, editPlayerPos === pos && s.chipActive]} onPress={() => setEditPlayerPos(pos)}><Text style={[s.chipText, editPlayerPos === pos && s.chipTextActive]}>{pos}</Text></TouchableOpacity>)}</ScrollView>
            <TouchableOpacity data-testid="save-edit-player" style={s.confirmBtn} onPress={saveEdit}><MaterialCommunityIcons name="check" size={16} color="#FFF" /><Text style={s.confirmBtnText}>SAVE</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
      <BottomNav />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  bg: { flex: 1 },
  scroll: { padding: 14, paddingBottom: 20 },

  // Top bar
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  pageName: { fontSize: 18, fontWeight: '800', color: '#EAEAEA' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  savingText: { fontSize: 11, color: '#4ADE80', fontWeight: '600' },
  backLink: { fontSize: 13, fontWeight: '600', color: '#4ADE80' },

  // Team header
  teamHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  shieldWrap: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  shieldInner: { width: 46, height: 44, borderRadius: 10, backgroundColor: '#2A2C30', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  teamName: { fontSize: 18, fontWeight: '800', color: '#EAEAEA' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3, flexWrap: 'wrap' },
  badge: { borderWidth: 1, borderColor: '#4ADE80', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#4ADE80' },
  statsGroup: { flexDirection: 'row', gap: 12 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: '#EAEAEA' },
  statLbl: { fontSize: 8, fontWeight: '700', color: '#666', letterSpacing: 1 },
  settingsIcon: { padding: 6 },

  // Code row
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  codeLabel: { fontSize: 9, fontWeight: '700', color: '#666', letterSpacing: 1 },
  codeValue: { fontSize: 15, fontWeight: '900', color: '#4ADE80', letterSpacing: 3, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  codeHint: { fontSize: 9, color: '#555', flex: 1, textAlign: 'right' },

  // Manager
  managerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  managerText: { fontSize: 12, color: '#888' },

  // Section
  sectionLabel: { fontSize: 11, fontWeight: '600', color: '#999', letterSpacing: 2.5, marginTop: 12, marginBottom: 8 },

  // Menu grid
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  menuItem: { width: '22%' as any, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  menuIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  menuLabel: { fontSize: 10, fontWeight: '700', color: '#BBB', marginTop: 2 },

  // Feed
  matchCard: { backgroundColor: 'rgba(74,222,128,0.06)', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(74,222,128,0.15)' },
  matchBadge: { backgroundColor: 'rgba(74,222,128,0.15)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 6 },
  matchBadgeText: { fontSize: 9, fontWeight: '800', color: '#4ADE80', letterSpacing: 1 },
  matchTitle: { fontSize: 16, fontWeight: '700', color: '#EAEAEA' },
  matchDate: { fontSize: 12, color: '#888', marginTop: 2 },

  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  reminderText: { fontSize: 12, fontWeight: '500', color: '#F59E0B', flex: 1 },

  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  feedTitle: { fontSize: 13, fontWeight: '500', color: '#888' },
  feedTime: { fontSize: 10, color: '#555', marginTop: 1 },

  emptyText: { fontSize: 13, color: '#555', paddingVertical: 12 },

  // Squad
  squadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  squadTabs: { flexDirection: 'row', gap: 6 },
  sqTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  sqTabActive: { borderColor: '#4ADE80', backgroundColor: 'rgba(74,222,128,0.06)' },
  sqTabText: { fontSize: 12, fontWeight: '600', color: '#666' },
  sqTabTextActive: { color: '#4ADE80' },
  addPlayerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addPlayerText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  numCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(74,222,128,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#4ADE80' },
  numText: { fontSize: 12, fontWeight: '900', color: '#EAEAEA' },
  plName: { fontSize: 13, fontWeight: '700', color: '#EAEAEA' },
  actionBtn: { padding: 6 },

  // Detail
  detailHead: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  dh: { fontSize: 9, fontWeight: '700', color: '#666', letterSpacing: 1, textAlign: 'center' },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  dd: { fontSize: 12, fontWeight: '600', color: '#888', textAlign: 'center' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 10 },
  infoBoxText: { fontSize: 12, color: '#F59E0B', flex: 1 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E2025', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 36 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#EAEAEA' },
  fieldLabel: { fontSize: 9, fontWeight: '700', color: '#666', letterSpacing: 1.5, marginBottom: 5, marginTop: 4 },
  input: { height: 44, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingHorizontal: 14, color: '#EAEAEA', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, marginRight: 6, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  chipActive: { borderColor: '#4ADE80', backgroundColor: 'rgba(74,222,128,0.08)' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#666' },
  chipTextActive: { color: '#4ADE80' },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', height: 46, borderRadius: 10, gap: 6 },
  confirmBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  countryChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, marginRight: 6, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  countryChipActive: { borderColor: '#4ADE80', backgroundColor: 'rgba(74,222,128,0.08)' },
});
