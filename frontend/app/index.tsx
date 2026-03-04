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
import BottomNav from '../src/components/BottomNav';
import { getFlagForCode } from '../src/constants/countries';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
  const [unreadCount, setUnreadCount] = useState(0);

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  useFocusEffect(useCallback(() => { fetchTeams(); fetchNetwork(); fetchUnread(); }, []));

  const fetchTeams = async () => { setLoading(true); const data = await loadTeams(); setTeams(data); setLoading(false); };
  const fetchNetwork = async () => { try { const res = await fetch(`${API_URL}/api/network`, { headers: authHeaders() }); if (res.ok) setNetwork(await res.json()); } catch {} };
  const fetchUnread = async () => { try { const res = await fetch(`${API_URL}/api/notifications/unread`, { headers: authHeaders() }); if (res.ok) { const d = await res.json(); setUnreadCount(d.total); } } catch {} };

  const addToNetwork = async () => {
    if (!networkCode.trim()) return;
    setAddingNetwork(true);
    try {
      const res = await fetch(`${API_URL}/api/network/add`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ team_code: networkCode.trim().toUpperCase() }) });
      if (res.ok) { setNetworkCode(''); setShowAddNetwork(false); fetchNetwork(); }
      else { const err = await res.json().catch(() => ({ detail: 'Not found' })); Alert.alert('Error', err.detail || 'Team not found'); }
    } catch { Alert.alert('Error', 'Network error'); }
    setAddingNetwork(false);
  };

  const removeFromNetwork = async (id: string) => { try { await fetch(`${API_URL}/api/network/${id}`, { method: 'DELETE', headers: authHeaders() }); setNetwork(prev => prev.filter(n => n.id !== id)); } catch {} };

  const selectSport = (sport: string) => {
    setSport(sport); setCurrentTeam(null);
    if (sport === 'futsal') { setFormat('5v5'); router.push('/team-setup'); } else router.push('/format');
  };

  const openTeam = (team: any) => { setSport(team.sport); setFormat(team.format); setCurrentTeam(team); router.push('/team'); };
  const executeDelete = async () => { if (!teamToDelete) return; await deleteTeam(teamToDelete.id); setTeams(prev => prev.filter(t => t.id !== teamToDelete.id)); setTeamToDelete(null); };
  const availableCount = (team: any) => team.players?.filter((p: any) => p.available !== false).length || 0;

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1C1E22', '#161819', '#111315']} style={s.bg}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

            {/* Top Bar */}
            <View style={s.topBar}>
              <View style={s.topLeft}>
                <View style={s.profileCircle}>
                  <MaterialCommunityIcons name="account" size={20} color="#888" />
                </View>
                <Text style={s.profileName}>{user?.name || user?.email?.split('@')[0] || 'Coach'}</Text>
              </View>
              <View style={s.topRight}>
                <TouchableOpacity data-testid="settings-btn" style={s.topIcon} onPress={() => router.push('/settings')}>
                  <MaterialCommunityIcons name="cog-outline" size={24} color="#777" />
                </TouchableOpacity>
                <TouchableOpacity data-testid="bell-btn" style={s.topIcon} onPress={() => router.push('/messenger')}>
                  <MaterialCommunityIcons name="bell-outline" size={24} color="#777" />
                  {unreadCount > 0 && (
                    <View style={s.bellBadge}>
                      <Text style={s.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Branding */}
            <View style={s.brand}>
              <MaterialCommunityIcons name="strategy" size={40} color="#4ADE80" />
              <Text style={s.brandTitle}>TACTICAL LINEUP</Text>
              <Text style={s.brandSub}>FOOTBALL & FUTSAL COACH ASSISTANT</Text>
            </View>

            {/* CREATE NEW SQUAD */}
            <Text style={s.sectionLabel}>CREATE NEW SQUAD</Text>
            <View style={s.sportRow}>
              <TouchableOpacity testID="select-football-btn" style={s.sportCard} onPress={() => selectSport('football')} activeOpacity={0.8}>
                <LinearGradient colors={['#252830', '#1E2025', '#1A1C1F']} style={s.sportGrad}>
                  <View style={s.sportIconArea}>
                    <MaterialCommunityIcons name="shoe-cleat" size={48} color="#94A3B8" />
                  </View>
                  <Text style={s.sportName}>FOOTBALL</Text>
                  <Text style={s.sportFormats}>5v5 · 7v7 · 9v9 · 11v11</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity testID="select-futsal-btn" style={s.sportCard} onPress={() => selectSport('futsal')} activeOpacity={0.8}>
                <LinearGradient colors={['#252830', '#1E2025', '#1A1C1F']} style={s.sportGrad}>
                  <View style={s.sportIconArea}>
                    <MaterialCommunityIcons name="soccer" size={48} color="#94A3B8" />
                  </View>
                  <Text style={s.sportName}>FUTSAL</Text>
                  <Text style={s.sportFormats}>5v5</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* MY ACTIVE TEAMS */}
            <Text style={s.sectionLabel}>MY ACTIVE TEAMS</Text>
            {loading && <ActivityIndicator size="large" color="#4ADE80" style={{ marginVertical: 20 }} />}
            {!loading && teams.length === 0 && <Text style={s.emptyText}>No teams yet. Create your first squad above.</Text>}
            {!loading && teams.map((team) => (
              <TouchableOpacity key={team.id} testID={`team-card-${team.id}`} style={s.teamRow} onPress={() => openTeam(team)} activeOpacity={0.7}>
                <View style={s.shieldWrap}>
                  {team.country ? (
                    <View style={s.shieldInner}>
                      <Text style={{ fontSize: 18 }}>{getFlagForCode(team.country)}</Text>
                    </View>
                  ) : <MaterialCommunityIcons name="shield-half-full" size={28} color="#555" />}
                  <View style={s.shieldPoint} />
                </View>
                <View style={s.teamInfo}>
                  <Text style={s.teamName}>{team.name}</Text>
                  <View style={s.badgeRow}>
                    <View style={s.badge}><Text style={s.badgeText}>{team.format}</Text></View>
                    {team.age_group ? <View style={s.badge}><Text style={s.badgeText}>{team.age_group}</Text></View> : null}
                    {team.team_code ? <Text style={s.codeText}>· #{team.team_code}</Text> : null}
                  </View>
                </View>
                <Text style={s.statText}>{team.players?.length || 0} PLR, {availableCount(team)} AVL</Text>
                <TouchableOpacity testID={`delete-team-${team.id}`} style={s.delBtn}
                  onPress={(e) => { e.stopPropagation?.(); setTeamToDelete(team); }} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color="#444" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {/* MY NETWORK */}
            <View style={s.netHeader}>
              <Text style={[s.sectionLabel, { marginTop: 28, marginBottom: 0 }]}>MY NETWORK</Text>
              <TouchableOpacity data-testid="add-network-inline-btn" style={s.addNetInline} onPress={() => setShowAddNetwork(true)}>
                <MaterialCommunityIcons name="plus" size={16} color="#4ADE80" />
                <Text style={s.addNetInlineText}>Add</Text>
              </TouchableOpacity>
            </View>
            {network.length === 0 && <Text style={s.emptyText}>No teams in network.</Text>}
            {network.map(n => (
              <TouchableOpacity key={n.id} testID={`network-${n.id}`} style={s.netRow}
                onPress={() => setExpandedNetwork(expandedNetwork === n.id ? null : n.id)}
                activeOpacity={0.7}
              >
                <View style={s.netMain}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.netName}>{n.friend_team_name}</Text>
                    <MaterialCommunityIcons name={expandedNetwork === n.id ? 'chevron-up' : 'chevron-down'} size={16} color="#666" />
                  </View>
                  <View style={s.badgeRow}>
                    {n.friend_team_age_group ? <View style={s.badge}><Text style={s.badgeText}>{n.friend_team_age_group}</Text></View> : null}
                    {n.friend_team_format ? <View style={s.badge}><Text style={s.badgeText}>{n.friend_team_format}</Text></View> : null}
                    {n.friend_team_code ? <Text style={s.codeText}>· #{n.friend_team_code}</Text> : null}
                  </View>
                </View>
                {expandedNetwork === n.id && (
                  <View style={s.netExpanded}>
                    <View style={s.netDetailRow}><Text style={s.netLabel}>Manager</Text><Text style={s.netVal}>{n.friend_manager_name || '—'}</Text></View>
                    <View style={s.netDetailRow}><Text style={s.netLabel}>Phone</Text><Text style={s.netVal}>{n.friend_manager_phone || '—'}</Text></View>
                    <TouchableOpacity style={s.removeLink} onPress={() => removeFromNetwork(n.id)}>
                      <Text style={s.removeLinkText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            <View style={{ height: 20 }} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Delete Modal */}
      <Modal visible={teamToDelete !== null} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <MaterialCommunityIcons name="alert-circle-outline" size={32} color={Colors.destructive} />
            <Text style={s.modalTitle}>Delete Team</Text>
            <Text style={s.modalDesc}>Remove "{teamToDelete?.name}" and all data?</Text>
            <View style={s.modalBtns}>
              <TouchableOpacity testID="confirm-delete-btn" style={s.dangerBtn} onPress={executeDelete}><Text style={s.btnText}>DELETE</Text></TouchableOpacity>
              <TouchableOpacity testID="cancel-delete-btn" style={s.ghostBtn} onPress={() => setTeamToDelete(null)}><Text style={s.ghostText}>CANCEL</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Network Modal */}
      <Modal visible={showAddNetwork} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <MaterialCommunityIcons name="account-plus-outline" size={32} color="#4ADE80" />
            <Text style={s.modalTitle}>Add Team</Text>
            <Text style={s.modalDesc}>Enter the team's unique code</Text>
            <TextInput testID="network-code-input" style={s.codeInput} value={networkCode} onChangeText={setNetworkCode} placeholder="ABC123" placeholderTextColor="#555" autoCapitalize="characters" autoFocus />
            <View style={s.modalBtns}>
              <TouchableOpacity testID="confirm-add-network" style={[s.greenBtn, addingNetwork && { opacity: 0.5 }]} onPress={addToNetwork} disabled={addingNetwork}>
                <Text style={s.btnText}>{addingNetwork ? 'ADDING...' : 'ADD TO NETWORK'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ghostBtn} onPress={() => { setShowAddNetwork(false); setNetworkCode(''); }}><Text style={s.ghostText}>CANCEL</Text></TouchableOpacity>
            </View>
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
  scroll: { paddingHorizontal: 20, paddingBottom: 30 },

  // Top bar
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, paddingBottom: 10 },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2A2C30', justifyContent: 'center', alignItems: 'center' },
  profileName: { fontSize: 15, fontWeight: '600', color: '#CDCDCD' },
  topRight: { flexDirection: 'row', gap: 14 },
  topIcon: { padding: 2 },

  // Brand
  brand: { alignItems: 'center', paddingTop: 16, paddingBottom: 20 },
  brandTitle: { fontSize: 30, fontWeight: '900', color: '#EAEAEA', letterSpacing: 2, marginTop: 8 },
  brandSub: { fontSize: 11, fontWeight: '400', color: '#777', letterSpacing: 2, marginTop: 2 },

  // Section label
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#999', letterSpacing: 2.5, marginBottom: 14, marginTop: 8 },

  // Sport cards
  sportRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  sportCard: { flex: 1 },
  sportGrad: { borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  sportIconArea: { height: 54, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  sportName: { fontSize: 18, fontWeight: '800', color: '#EAEAEA', letterSpacing: 1.5, textAlign: 'center' },
  sportFormats: { fontSize: 11, color: '#777', fontWeight: '400', marginTop: 2, textAlign: 'center' },

  // Team rows
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', gap: 12 },
  shieldWrap: { width: 44, height: 48, justifyContent: 'center', alignItems: 'center', position: 'relative' as const },
  shieldInner: { width: 42, height: 40, borderRadius: 8, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: '#2A2C30', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  shieldPoint: { position: 'absolute' as const, bottom: 0, width: 0, height: 0, borderLeftWidth: 21, borderRightWidth: 21, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#2A2C30' },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 17, fontWeight: '700', color: '#EAEAEA' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  badge: { borderWidth: 1, borderColor: '#4ADE80', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#4ADE80' },
  codeText: { fontSize: 11, color: '#666', fontWeight: '500', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  statText: { fontSize: 12, fontWeight: '500', color: '#888' },
  delBtn: { padding: 6 },

  // Empty
  emptyText: { fontSize: 13, color: '#555', fontWeight: '400', paddingVertical: 12 },

  // Network rows
  netRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  netMain: {},
  netName: { fontSize: 16, fontWeight: '700', color: '#EAEAEA' },
  netExpanded: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', gap: 5 },
  netDetailRow: { flexDirection: 'row', alignItems: 'center' },
  netLabel: { fontSize: 11, fontWeight: '500', color: '#666', width: 56 },
  netVal: { fontSize: 12, fontWeight: '600', color: '#AAA' },
  removeLink: { marginTop: 4 },
  removeLinkText: { fontSize: 11, fontWeight: '600', color: '#EF4444' },

  // Network header with inline Add button
  netHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 10 },
  addNetInline: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)', backgroundColor: 'rgba(74,222,128,0.06)' },
  addNetInlineText: { fontSize: 12, fontWeight: '600', color: '#4ADE80' },

  // Bottom Tab Bar
  tabBar: { flexDirection: 'row', height: 60, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', backgroundColor: '#131517' },
  tab: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 10, fontWeight: '500', color: '#555' },
  navDot: { position: 'absolute' as const, top: -2, right: -6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },

  // Bell badge
  bellBadge: { position: 'absolute' as const, top: -6, right: -8, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  bellBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalCard: { backgroundColor: '#1E2025', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', maxWidth: 360, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#EAEAEA', marginTop: 14, marginBottom: 6 },
  modalDesc: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  modalBtns: { width: '100%', gap: 8 },
  dangerBtn: { backgroundColor: '#EF4444', height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  greenBtn: { backgroundColor: '#10B981', height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 13, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  ghostBtn: { height: 40, justifyContent: 'center', alignItems: 'center' },
  ghostText: { fontSize: 12, fontWeight: '700', color: '#666' },
  codeInput: { width: '100%', height: 56, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 16, color: '#EAEAEA', fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
});
