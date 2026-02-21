import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator, Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';

export default function HomeScreen() {
  const router = useRouter();
  const { setSport, setFormat, setCurrentTeam, loadTeams, deleteTeam, user, logout } = useApp();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamToDelete, setTeamToDelete] = useState<any>(null);

  useFocusEffect(useCallback(() => { fetchTeams(); }, []));

  const fetchTeams = async () => {
    setLoading(true);
    const data = await loadTeams();
    setTeams(data);
    setLoading(false);
  };

  const selectSport = (sport: string) => {
    setSport(sport);
    setCurrentTeam(null);
    if (sport === 'futsal') {
      setFormat('5v5');
      router.push('/team-setup');
    } else {
      router.push('/format');
    }
  };

  const openTeam = (team: any) => {
    setSport(team.sport);
    setFormat(team.format);
    setCurrentTeam(team);
    router.push('/team');
  };

  const executeDelete = async () => {
    if (!teamToDelete) return;
    await deleteTeam(teamToDelete.id);
    setTeams(prev => prev.filter(t => t.id !== teamToDelete.id));
    setTeamToDelete(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topRow}>
          <View style={styles.userInfo}>
            <MaterialCommunityIcons name="account-circle" size={22} color={Colors.primary} />
            <Text style={styles.userName}>{user?.name || user?.email || ''}</Text>
          </View>
          <TouchableOpacity testID="logout-btn" style={styles.logoutBtn} onPress={logout}>
            <MaterialCommunityIcons name="logout" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="strategy" size={32} color={Colors.primary} />
          <Text style={styles.title}>TACTICAL LINEUP</Text>
          <Text style={styles.subtitle}>FOOTBALL & FUTSAL COACH ASSISTANT</Text>
        </View>

        {/* Create Team */}
        <Text style={styles.sectionTitle}>CREATE TEAM</Text>
        <View style={styles.sportRow}>
          <TouchableOpacity testID="select-football-btn" style={styles.sportCard} onPress={() => selectSport('football')}>
            <MaterialCommunityIcons name="shoe-cleat" size={32} color={Colors.primary} />
            <Text style={styles.sportName}>FOOTBALL</Text>
            <Text style={styles.sportFormats}>5v5 · 7v7 · 9v9 · 11v11</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="select-futsal-btn" style={styles.sportCard} onPress={() => selectSport('futsal')}>
            <MaterialCommunityIcons name="soccer" size={32} color={Colors.accent} />
            <Text style={styles.sportName}>FUTSAL</Text>
            <Text style={styles.sportFormats}>5v5</Text>
          </TouchableOpacity>
        </View>

        {/* My Teams */}
        <Text style={styles.sectionTitle}>MY TEAMS</Text>
        {loading && <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 16 }} />}
        {!loading && teams.length === 0 && (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="soccer-field" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No teams yet. Create your first team above.</Text>
          </View>
        )}
        {!loading && teams.map((team) => (
          <TouchableOpacity key={team.id} testID={`team-card-${team.id}`} style={styles.teamCard} onPress={() => openTeam(team)} activeOpacity={0.7}>
            <View style={styles.teamIconWrap}>
              <MaterialCommunityIcons name={team.sport === 'futsal' ? 'soccer' : 'shield-half-full'} size={22} color={Colors.primary} />
            </View>
            <View style={styles.teamInfo}>
              <Text style={styles.teamName}>{team.name}</Text>
              <View style={styles.teamMeta}>
                <View style={styles.badge}><Text style={styles.badgeText}>{team.format}</Text></View>
                {team.age_group ? <View style={styles.badge}><Text style={styles.badgeText}>{team.age_group}</Text></View> : null}
                <Text style={styles.playerCount}>{team.players?.length || 0} players</Text>
              </View>
            </View>
            <TouchableOpacity testID={`delete-team-${team.id}`} style={styles.deleteBtn} onPress={(e) => { e.stopPropagation?.(); setTeamToDelete(team); }} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={Colors.destructive} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Delete Modal */}
      <Modal visible={teamToDelete !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <MaterialCommunityIcons name="trash-can-outline" size={32} color={Colors.destructive} />
            <Text style={styles.modalTitle}>Delete Team</Text>
            <Text style={styles.modalDesc}>Remove "{teamToDelete?.name}" and all its data?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity testID="confirm-delete-btn" style={styles.deleteConfirmBtn} onPress={executeDelete}>
                <Text style={styles.deleteConfirmText}>DELETE</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="cancel-delete-btn" style={styles.cancelBtn} onPress={() => setTeamToDelete(null)}>
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16, paddingBottom: 48 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginBottom: 8 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  logoutBtn: { padding: 8, borderRadius: 8, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border },
  header: { alignItems: 'center', paddingVertical: 24 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.white, letterSpacing: 2, marginTop: 8 },
  subtitle: { fontSize: 10, color: Colors.textMuted, marginTop: 4, letterSpacing: 2.5 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2.5, marginBottom: 10, marginTop: 8 },
  sportRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  sportCard: {
    flex: 1, backgroundColor: Colors.backgroundSecondary, borderRadius: 14, padding: 18,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 6,
  },
  sportName: { fontSize: 14, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  sportFormats: { fontSize: 11, color: Colors.textMuted },
  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, color: Colors.textMuted },
  teamCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  teamIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,200,83,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 15, fontWeight: '700', color: Colors.white },
  teamMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 6 },
  badge: { backgroundColor: 'rgba(0,200,83,0.12)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  playerCount: { fontSize: 11, color: Colors.textSecondary },
  deleteBtn: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.white, marginTop: 12, marginBottom: 8 },
  modalDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  modalActions: { width: '100%', gap: 8 },
  deleteConfirmBtn: { backgroundColor: Colors.destructive, height: 46, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  deleteConfirmText: { fontSize: 14, fontWeight: '800', color: Colors.white },
  cancelBtn: { height: 42, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
});
