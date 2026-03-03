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
      if (res.ok) {
        setNetworkCode('');
        setShowAddNetwork(false);
        fetchNetwork();
      } else {
        const err = await res.json().catch(() => ({ detail: 'Not found' }));
        Alert.alert('Error', err.detail || 'Team not found');
      }
    } catch { Alert.alert('Error', 'Network error'); }
    setAddingNetwork(false);
  };

  const removeFromNetwork = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/network/${id}`, { method: 'DELETE', headers: authHeaders() });
      setNetwork(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  const selectSport = (sport: string) => {
    setSport(sport);
    setCurrentTeam(null);
    if (sport === 'futsal') { setFormat('5v5'); router.push('/team-setup'); }
    else { router.push('/format'); }
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
  const availableCount = (team: any) => team.players?.filter((p: any) => p.available !== false).length || 0;

  return (
    <LinearGradient colors={['#0F1115', '#131720', '#0F1115']} style={s.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Top bar */}
          <View style={s.topBar}>
            <View style={s.userRow}>
              <View style={s.avatar}>
                <MaterialCommunityIcons name="account" size={18} color={Colors.textSecondary} />
              </View>
              <Text style={s.userName}>{user?.name || user?.email || ''}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity testID="logout-btn" style={s.iconBtn} onPress={logout}>
                <MaterialCommunityIcons name="logout" size={17} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Branding */}
          <View style={s.branding}>
            <MaterialCommunityIcons name="strategy" size={28} color={Colors.primary} />
            <Text style={s.brandTitle}>TACTICAL LINEUP</Text>
            <Text style={s.brandSub}>THE ELITE COACH ASSISTANT</Text>
          </View>

          {/* Create New Squad */}
          <Text style={s.sectionLabel}>CREATE NEW SQUAD</Text>
          <View style={s.sportRow}>
            <TouchableOpacity testID="select-football-btn" style={s.sportCard} onPress={() => selectSport('football')} activeOpacity={0.8}>
              <View style={s.sportIconWrap}>
                <MaterialCommunityIcons name="shoe-cleat" size={36} color="#94A3B8" />
              </View>
              <Text style={s.sportName}>FOOTBALL</Text>
              <Text style={s.sportFormats}>5v5 · 7v7 · 9v9 · 11v11</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="select-futsal-btn" style={s.sportCard} onPress={() => selectSport('futsal')} activeOpacity={0.8}>
              <View style={s.sportIconWrap}>
                <MaterialCommunityIcons name="soccer" size={36} color="#94A3B8" />
              </View>
              <Text style={s.sportName}>FUTSAL</Text>
              <Text style={s.sportFormats}>5v5</Text>
            </TouchableOpacity>
          </View>

          {/* My Active Teams */}
          <Text style={s.sectionLabel}>MY ACTIVE TEAMS</Text>
          {loading && <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />}
          {!loading && teams.length === 0 && (
            <View style={s.emptyCard}>
              <MaterialCommunityIcons name="soccer-field" size={28} color={Colors.textMuted} />
              <Text style={s.emptyText}>No teams yet. Create your first squad above.</Text>
            </View>
          )}
          {!loading && teams.map((team) => (
            <TouchableOpacity key={team.id} testID={`team-card-${team.id}`} style={s.teamCard} onPress={() => openTeam(team)} activeOpacity={0.75}>
              <View style={s.teamShield}>
                <MaterialCommunityIcons name={team.sport === 'futsal' ? 'soccer' : 'shield-half-full'} size={24} color={Colors.textSecondary} />
              </View>
              <View style={s.teamInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {team.country ? <Text style={{ fontSize: 20 }}>{getFlagForCode(team.country)}</Text> : null}
                  <Text style={s.teamName}>{team.name}</Text>
                </View>
                <View style={s.metaRow}>
                  <View style={s.badge}><Text style={s.badgeText}>{team.format}</Text></View>
                  {team.gender ? <View style={[s.badge, s.badgeAlt]}><Text style={[s.badgeText, s.badgeAltText]}>{genderLabel(team.gender)}{team.age_group ? ` ${team.age_group}` : ''}</Text></View> : team.age_group ? <View style={s.badge}><Text style={s.badgeText}>{team.age_group}</Text></View> : null}
                  {team.team_code ? <Text style={s.teamCode}>#{team.team_code}</Text> : null}
                </View>
              </View>
              <View style={s.teamStats}>
                <Text style={s.statNum}>{team.players?.length || 0} PLR</Text>
                <Text style={s.statSub}>{availableCount(team)} AVL</Text>
              </View>
              <TouchableOpacity testID={`delete-team-${team.id}`} style={s.trashBtn} onPress={(e) => { e.stopPropagation?.(); setTeamToDelete(team); }} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <MaterialCommunityIcons name="trash-can-outline" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          {/* My Network */}
          <View style={s.networkHead}>
            <Text style={s.sectionLabel}>MY NETWORK</Text>
          </View>
          {network.length === 0 && (
            <View style={s.emptyCard}>
              <MaterialCommunityIcons name="account-group" size={24} color={Colors.textMuted} />
              <Text style={s.emptyText}>No teams in network yet.</Text>
            </View>
          )}
          <View style={s.networkGrid}>
            {network.map(n => (
              <TouchableOpacity key={n.id} testID={`network-${n.id}`} style={s.netCard}
                onPress={() => setExpandedNetwork(expandedNetwork === n.id ? null : n.id)}
                activeOpacity={0.75}
              >
                <View style={s.netCardInner}>
                  <Text style={s.netName}>{n.friend_team_name}</Text>
                  <View style={s.metaRow}>
                    {n.friend_team_gender || n.friend_team_age_group ? (
                      <View style={[s.badge, s.badgeAlt]}><Text style={[s.badgeText, s.badgeAltText]}>{genderLabel(n.friend_team_gender)}{n.friend_team_age_group ? ` ${n.friend_team_age_group}` : ''}</Text></View>
                    ) : null}
                    <View style={s.badge}><Text style={s.badgeText}>{n.friend_team_format}</Text></View>
                    {n.friend_team_code ? <Text style={s.teamCode}>#{n.friend_team_code}</Text> : null}
                  </View>
                </View>
                {expandedNetwork === n.id && (
                  <View style={s.contactBox}>
                    <View style={s.contactRow}><MaterialCommunityIcons name="account-outline" size={13} color={Colors.primary} /><Text style={s.contactLabel}>Manager</Text><Text style={s.contactVal}>{n.friend_manager_name || '—'}</Text></View>
                    <View style={s.contactRow}><MaterialCommunityIcons name="phone-outline" size={13} color={Colors.primary} /><Text style={s.contactLabel}>Phone</Text><Text style={s.contactVal}>{n.friend_manager_phone || '—'}</Text></View>
                    <TouchableOpacity style={s.removeNet} onPress={() => removeFromNetwork(n.id)}>
                      <MaterialCommunityIcons name="close" size={12} color={Colors.destructive} />
                      <Text style={s.removeNetText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Add to Network Button */}
          <TouchableOpacity testID="add-network-btn" style={s.addNetworkBtn} onPress={() => setShowAddNetwork(true)} activeOpacity={0.8}>
            <Text style={s.addNetworkText}>+ Add to Network</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>

      {/* Delete Modal */}
      <Modal visible={teamToDelete !== null} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <MaterialCommunityIcons name="trash-can-outline" size={28} color={Colors.destructive} />
            <Text style={s.modalTitle}>Delete Team</Text>
            <Text style={s.modalDesc}>Remove "{teamToDelete?.name}" and all data?</Text>
            <View style={s.modalActions}>
              <TouchableOpacity testID="confirm-delete-btn" style={s.dangerBtn} onPress={executeDelete}><Text style={s.dangerBtnText}>DELETE</Text></TouchableOpacity>
              <TouchableOpacity testID="cancel-delete-btn" style={s.ghostBtn} onPress={() => setTeamToDelete(null)}><Text style={s.ghostBtnText}>CANCEL</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Network Modal */}
      <Modal visible={showAddNetwork} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <MaterialCommunityIcons name="account-plus-outline" size={28} color={Colors.primary} />
            <Text style={s.modalTitle}>Add Team</Text>
            <Text style={s.modalDesc}>Enter the team's unique code</Text>
            <TextInput testID="network-code-input" style={s.codeInput} value={networkCode} onChangeText={setNetworkCode} placeholder="e.g. ABC123" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" autoFocus />
            <View style={s.modalActions}>
              <TouchableOpacity testID="confirm-add-network" style={[s.primaryBtn, addingNetwork && { opacity: 0.5 }]} onPress={addToNetwork} disabled={addingNetwork}>
                <Text style={s.primaryBtnText}>{addingNetwork ? 'ADDING...' : 'ADD TO NETWORK'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ghostBtn} onPress={() => { setShowAddNetwork(false); setNetworkCode(''); }}><Text style={s.ghostBtnText}>CANCEL</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const GLASS = {
  backgroundColor: Colors.glass,
  borderWidth: 1,
  borderColor: Colors.glassBorder,
};

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 60 },

  // Top bar
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, marginBottom: 6 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.glassBorder },
  userName: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  iconBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.glassBorder },

  // Branding
  branding: { alignItems: 'center', paddingVertical: 28 },
  brandTitle: { fontSize: 30, fontWeight: '900', color: Colors.white, letterSpacing: 3, marginTop: 10 },
  brandSub: { fontSize: 11, fontWeight: '500', color: Colors.textMuted, letterSpacing: 3, marginTop: 4 },

  // Sections
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2.5, marginBottom: 12, marginTop: 16 },

  // Sport cards
  sportRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  sportCard: { flex: 1, ...GLASS, borderRadius: 16, padding: 20, alignItems: 'center', gap: 8 },
  sportIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center' },
  sportName: { fontSize: 16, fontWeight: '800', color: Colors.white, letterSpacing: 1.5 },
  sportFormats: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },

  // Team cards
  teamCard: { flexDirection: 'row', alignItems: 'center', ...GLASS, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  teamShield: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.glassBorder },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 16, fontWeight: '700', color: Colors.white },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6, flexWrap: 'wrap' },
  badge: { backgroundColor: Colors.primaryGlow, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  badgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  badgeAlt: { backgroundColor: 'rgba(239,68,68,0.1)' },
  badgeAltText: { color: '#EF4444' },
  teamCode: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  teamStats: { alignItems: 'flex-end', marginRight: 4 },
  statNum: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  statSub: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, marginTop: 1 },
  trashBtn: { padding: 6 },

  // Empty
  emptyCard: { ...GLASS, borderRadius: 14, padding: 28, alignItems: 'center', gap: 8, marginBottom: 8 },
  emptyText: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },

  // Network
  networkHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  networkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  netCard: { width: '48%' as any, ...GLASS, borderRadius: 12, padding: 12, marginBottom: 4 },
  netCardInner: { gap: 4 },
  netName: { fontSize: 14, fontWeight: '700', color: Colors.white },
  contactBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.glassBorder, gap: 5 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, width: 52 },
  contactVal: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, flex: 1 },
  removeNet: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  removeNetText: { fontSize: 10, fontWeight: '600', color: Colors.destructive },

  // Add Network Button
  addNetworkBtn: { alignSelf: 'center', marginTop: 16, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
  addNetworkText: { fontSize: 13, fontWeight: '700', color: Colors.primary, letterSpacing: 0.5 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalCard: { backgroundColor: Colors.card, borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', maxWidth: 360, borderWidth: 1, borderColor: Colors.glassBorder },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.white, marginTop: 12, marginBottom: 6 },
  modalDesc: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  modalActions: { width: '100%', gap: 8 },
  dangerBtn: { backgroundColor: Colors.destructive, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dangerBtnText: { fontSize: 13, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  primaryBtn: { backgroundColor: Colors.primary, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { fontSize: 13, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  ghostBtn: { height: 42, justifyContent: 'center', alignItems: 'center' },
  ghostBtnText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  codeInput: { width: '100%', height: 56, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 16, color: Colors.white, fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: 5, borderWidth: 1, borderColor: Colors.glassBorder, marginBottom: 16 },
});
