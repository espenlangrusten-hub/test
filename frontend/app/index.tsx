import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator, Modal, TextInput, Alert, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';
import { getFlagForCode } from '../src/constants/countries';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const GENDER_DISPLAY: Record<string, string> = { 'Gutter': 'Boys', 'Jenter': 'Girls', 'Mixed': 'Mixed' };

export default function HomeScreen() {
  const router = useRouter();
  const { setSport, setFormat, setCurrentTeam, loadTeams, deleteTeam, user, token, logout } = useApp();
  const [teams, setTeams] = useState<any[]>([]);
  const [network, setNetwork] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamToDelete, setTeamToDelete] = useState<any>(null);
  const [showAddNetwork, setShowAddNetwork] = useState(false);
  const [networkCode, setNetworkCode] = useState('');
  const [addingNetwork, setAddingNetwork] = useState(false);
  const [expandedNetwork, setExpandedNetwork] = useState<string | null>(null);

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  useFocusEffect(useCallback(() => { fetchTeams(); fetchNetwork(); }, []));

  const fetchTeams = async () => {
    setLoading(true);
    const data = await loadTeams();
    setTeams(data);
    setLoading(false);
  };

  const fetchNetwork = async () => {
    try {
      const res = await fetch(`${API_URL}/api/network`, { headers: authHeaders() });
      if (res.ok) setNetwork(await res.json());
    } catch {}
  };

  const addToNetwork = async () => {
    if (!networkCode.trim()) return;
    setAddingNetwork(true);
    try {
      const res = await fetch(`${API_URL}/api/network/add`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ team_code: networkCode.trim().toUpperCase() }),
      });
      if (res.ok) { setNetworkCode(''); setShowAddNetwork(false); fetchNetwork(); }
      else { const err = await res.json().catch(() => ({ detail: 'Not found' })); Alert.alert('Error', err.detail || 'Team not found'); }
    } catch { Alert.alert('Error', 'Network error'); }
    setAddingNetwork(false);
  };

  const removeFromNetwork = async (id: string) => {
    try { await fetch(`${API_URL}/api/network/${id}`, { method: 'DELETE', headers: authHeaders() }); setNetwork(prev => prev.filter(n => n.id !== id)); } catch {}
  };

  const selectSport = (sport: string) => {
    setSport(sport); setCurrentTeam(null);
    if (sport === 'futsal') { setFormat('5v5'); router.push('/team-setup'); } else { router.push('/format'); }
  };

  const openTeam = (team: any) => {
    setSport(team.sport); setFormat(team.format); setCurrentTeam(team); router.push('/team');
  };

  const executeDelete = async () => {
    if (!teamToDelete) return;
    await deleteTeam(teamToDelete.id);
    setTeams(prev => prev.filter(t => t.id !== teamToDelete.id));
    setTeamToDelete(null);
  };

  const genderLabel = (g: string) => GENDER_DISPLAY[g] || g;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <SafeAreaView>

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.avatarRing}>
                <MaterialCommunityIcons name="account" size={16} color={Colors.textSecondary} />
              </View>
              <View>
                <Text style={s.greeting}>Welcome back</Text>
                <Text style={s.userName}>{user?.name || user?.email?.split('@')[0] || 'Coach'}</Text>
              </View>
            </View>
            <TouchableOpacity testID="logout-btn" style={s.logoutBtn} onPress={logout}>
              <MaterialCommunityIcons name="logout-variant" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Sport Selection - EA Sports Style 3D Cards */}
          <View style={s.sportSection}>
            <TouchableOpacity testID="select-football-btn" style={s.sportCardWrap} onPress={() => selectSport('football')} activeOpacity={0.85}>
              <LinearGradient colors={['#1C2530', '#131A24', '#0B1018']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={s.sportCard}>
                <View style={s.sportGlow} />
                <View style={s.sportIconBox}>
                  <LinearGradient colors={['rgba(16,185,129,0.2)', 'rgba(16,185,129,0.04)']} style={s.sportIconGrad}>
                    <MaterialCommunityIcons name="shoe-cleat" size={44} color="#10B981" />
                  </LinearGradient>
                </View>
                <View style={s.sportTextArea}>
                  <Text style={s.sportTitle}>FOOTBALL</Text>
                  <Text style={s.sportSub}>5v5 · 7v7 · 9v9 · 11v11</Text>
                </View>
                <View style={s.sportArrow}>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.15)" />
                </View>
                <View style={s.sportShine} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity testID="select-futsal-btn" style={s.sportCardWrap} onPress={() => selectSport('futsal')} activeOpacity={0.85}>
              <LinearGradient colors={['#2A1D30', '#1E1528', '#12101C']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={s.sportCard}>
                <View style={[s.sportGlow, { backgroundColor: 'rgba(139,92,246,0.06)' }]} />
                <View style={s.sportIconBox}>
                  <LinearGradient colors={['rgba(139,92,246,0.2)', 'rgba(139,92,246,0.04)']} style={s.sportIconGrad}>
                    <MaterialCommunityIcons name="soccer" size={44} color="#8B5CF6" />
                  </LinearGradient>
                </View>
                <View style={s.sportTextArea}>
                  <Text style={s.sportTitle}>FUTSAL</Text>
                  <Text style={[s.sportSub, { color: '#9CA3AF' }]}>5v5</Text>
                </View>
                <View style={s.sportArrow}>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.15)" />
                </View>
                <View style={[s.sportShine, { left: '60%' }]} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* MY SQUADS */}
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>MY SQUADS</Text>
            <Text style={s.sectionCount}>{teams.length}</Text>
          </View>

          {loading && <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />}

          {!loading && teams.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyText}>No squads yet. Choose a sport above to get started.</Text>
            </View>
          )}

          {!loading && teams.map((team, i) => (
            <TouchableOpacity key={team.id} testID={`team-card-${team.id}`} style={s.teamRow} onPress={() => openTeam(team)} activeOpacity={0.7}>
              <View style={s.teamRank}><Text style={s.teamRankText}>{i + 1}</Text></View>
              <View style={s.teamMain}>
                <View style={s.teamNameRow}>
                  {team.country ? <Text style={{ fontSize: 18 }}>{getFlagForCode(team.country)}</Text> : null}
                  <Text style={s.teamName} numberOfLines={1}>{team.name}</Text>
                </View>
                <View style={s.tagRow}>
                  <Text style={s.tag}>{team.format}</Text>
                  {team.gender ? <Text style={s.tagAlt}>{genderLabel(team.gender)}{team.age_group ? ` ${team.age_group}` : ''}</Text> : team.age_group ? <Text style={s.tag}>{team.age_group}</Text> : null}
                  {team.team_code ? <Text style={s.codeTag}>#{team.team_code}</Text> : null}
                </View>
              </View>
              <View style={s.teamStat}>
                <Text style={s.statVal}>{team.players?.length || 0}</Text>
                <Text style={s.statLabel}>PLR</Text>
              </View>
              <TouchableOpacity testID={`delete-team-${team.id}`} style={s.deleteHit}
                onPress={(e) => { e.stopPropagation?.(); setTeamToDelete(team); }}
                hitSlop={{top:10,bottom:10,left:10,right:10}}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={15} color={Colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          {/* NETWORK */}
          <View style={[s.sectionHead, { marginTop: 28 }]}>
            <Text style={s.sectionTitle}>NETWORK</Text>
            <TouchableOpacity testID="add-network-btn" style={s.addBtn} onPress={() => setShowAddNetwork(true)}>
              <MaterialCommunityIcons name="plus" size={14} color={Colors.primary} />
              <Text style={s.addBtnText}>ADD</Text>
            </TouchableOpacity>
          </View>

          {network.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyText}>Add teams to your network using their unique code.</Text>
            </View>
          )}

          {network.map(n => (
            <TouchableOpacity key={n.id} testID={`network-${n.id}`} style={s.netRow}
              onPress={() => setExpandedNetwork(expandedNetwork === n.id ? null : n.id)}
              activeOpacity={0.7}
            >
              <View style={s.netMain}>
                <Text style={s.netName}>{n.friend_team_name}</Text>
                <View style={s.tagRow}>
                  <Text style={s.tag}>{n.friend_team_format}</Text>
                  {n.friend_team_gender ? <Text style={s.tagAlt}>{genderLabel(n.friend_team_gender)}{n.friend_team_age_group ? ` ${n.friend_team_age_group}` : ''}</Text> : null}
                </View>
              </View>
              <MaterialCommunityIcons name={expandedNetwork === n.id ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
              {expandedNetwork === n.id && (
                <View style={s.netExpanded}>
                  <View style={s.netDetail}><Text style={s.netLabel}>Manager</Text><Text style={s.netValue}>{n.friend_manager_name || '—'}</Text></View>
                  <View style={s.netDetail}><Text style={s.netLabel}>Phone</Text><Text style={s.netValue}>{n.friend_manager_phone || '—'}</Text></View>
                  {n.friend_team_code ? <View style={s.netDetail}><Text style={s.netLabel}>Code</Text><Text style={s.netValue}>#{n.friend_team_code}</Text></View> : null}
                  <TouchableOpacity style={s.removeLink} onPress={() => removeFromNetwork(n.id)}>
                    <Text style={s.removeLinkText}>Remove from network</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}

          <View style={{ height: 40 }} />
        </SafeAreaView>
      </ScrollView>

      {/* Delete Modal */}
      <Modal visible={teamToDelete !== null} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <MaterialCommunityIcons name="alert-circle-outline" size={32} color={Colors.destructive} />
            <Text style={s.modalTitle}>Delete Team</Text>
            <Text style={s.modalDesc}>Remove "{teamToDelete?.name}" and all associated data?</Text>
            <View style={s.modalBtns}>
              <TouchableOpacity testID="confirm-delete-btn" style={s.dangerBtn} onPress={executeDelete}><Text style={s.dangerBtnText}>DELETE</Text></TouchableOpacity>
              <TouchableOpacity testID="cancel-delete-btn" style={s.cancelBtn} onPress={() => setTeamToDelete(null)}><Text style={s.cancelBtnText}>CANCEL</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Network Modal */}
      <Modal visible={showAddNetwork} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <MaterialCommunityIcons name="account-plus-outline" size={32} color={Colors.primary} />
            <Text style={s.modalTitle}>Add Team</Text>
            <Text style={s.modalDesc}>Enter the team's unique code</Text>
            <TextInput testID="network-code-input" style={s.codeInput} value={networkCode} onChangeText={setNetworkCode} placeholder="ABC123" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" autoFocus />
            <View style={s.modalBtns}>
              <TouchableOpacity testID="confirm-add-network" style={[s.primaryBtn, addingNetwork && { opacity: 0.5 }]} onPress={addToNetwork} disabled={addingNetwork}>
                <Text style={s.primaryBtnText}>{addingNetwork ? 'ADDING...' : 'ADD TO NETWORK'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowAddNetwork(false); setNetworkCode(''); }}><Text style={s.cancelBtnText}>CANCEL</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 20 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarRing: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  greeting: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  userName: { fontSize: 15, color: Colors.white, fontWeight: '700' },
  logoutBtn: { padding: 8 },

  // Sport cards - EA Sports 3D
  sportSection: { marginTop: 20, gap: 12, marginBottom: 28 },
  sportCardWrap: {},
  sportCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  sportGlow: { position: 'absolute', top: -40, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(16,185,129,0.06)' },
  sportShine: { position: 'absolute', top: -20, left: '40%' as any, width: 120, height: 3, backgroundColor: 'rgba(255,255,255,0.03)', transform: [{ rotate: '15deg' }] },
  sportIconBox: { marginRight: 18 },
  sportIconGrad: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sportTextArea: { flex: 1 },
  sportTitle: { fontSize: 24, fontWeight: '900', color: Colors.white, letterSpacing: 2 },
  sportSub: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginTop: 3, letterSpacing: 1 },
  sportArrow: { marginLeft: 8 },

  // Sections
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2 },
  sectionCount: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },

  // Team rows - clean list, no boxes
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', gap: 12 },
  teamRank: { width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center' },
  teamRankText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  teamMain: { flex: 1 },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamName: { fontSize: 16, fontWeight: '700', color: Colors.white },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  tag: { fontSize: 10, fontWeight: '600', color: Colors.primary, backgroundColor: Colors.primaryGlow, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagAlt: { fontSize: 10, fontWeight: '600', color: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  codeTag: { fontSize: 9, fontWeight: '600', color: Colors.textMuted, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  teamStat: { alignItems: 'center', marginRight: 6 },
  statVal: { fontSize: 16, fontWeight: '800', color: Colors.textSecondary },
  statLabel: { fontSize: 8, fontWeight: '600', color: Colors.textMuted, letterSpacing: 1, marginTop: 1 },
  deleteHit: { padding: 6 },

  // Empty
  emptyState: { paddingVertical: 20, paddingHorizontal: 4 },
  emptyText: { fontSize: 13, color: Colors.textMuted, fontWeight: '400', lineHeight: 20 },

  // Network rows - clean list
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', backgroundColor: Colors.primaryGlow },
  addBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  netRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', gap: 8 },
  netMain: { flex: 1 },
  netName: { fontSize: 15, fontWeight: '700', color: Colors.white },
  netExpanded: { width: '100%', paddingTop: 10, paddingLeft: 2, gap: 6 },
  netDetail: { flexDirection: 'row', alignItems: 'center' },
  netLabel: { fontSize: 11, fontWeight: '500', color: Colors.textMuted, width: 56 },
  netValue: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  removeLink: { marginTop: 4 },
  removeLinkText: { fontSize: 11, fontWeight: '600', color: Colors.destructive },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalCard: { backgroundColor: '#1A1D23', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', maxWidth: 360, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.white, marginTop: 14, marginBottom: 6 },
  modalDesc: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  modalBtns: { width: '100%', gap: 8 },
  dangerBtn: { backgroundColor: Colors.destructive, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dangerBtnText: { fontSize: 13, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  primaryBtn: { backgroundColor: Colors.primary, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { fontSize: 13, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  cancelBtn: { height: 40, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  codeInput: { width: '100%', height: 56, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 16, color: Colors.white, fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
});
