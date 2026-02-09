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
  const { setSport, setFormat, setCurrentTeam, loadTeams, deleteTeam } = useApp();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamToDelete, setTeamToDelete] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      fetchTeams();
    }, [])
  );

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
    router.push('/tactics');
  };

  const editTeam = (team: any) => {
    setSport(team.sport);
    setFormat(team.format);
    setCurrentTeam(team);
    router.push('/team-setup');
  };

  const confirmDeleteTeam = (team: any) => {
    setTeamToDelete(team);
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
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <MaterialCommunityIcons name="strategy" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.title}>TACTICAL{'\n'}LINEUP</Text>
          <Text style={styles.subtitle}>FOOTBALL & FUTSAL COACH ASSISTANT</Text>
        </View>

        <Text style={styles.sectionTitle}>SELECT SPORT</Text>
        <View style={styles.sportRow}>
          <TouchableOpacity
            testID="select-football-btn"
            style={styles.sportCard}
            onPress={() => selectSport('football')}
            activeOpacity={0.8}
          >
            <View style={styles.sportIconWrap}>
              <MaterialCommunityIcons name="shoe-cleat" size={44} color={Colors.primary} />
            </View>
            <Text style={styles.sportName}>FOOTBALL</Text>
            <Text style={styles.sportFormats}>5v5 · 7v7 · 11v11</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="select-futsal-btn"
            style={styles.sportCard}
            onPress={() => selectSport('futsal')}
            activeOpacity={0.8}
          >
            <View style={[styles.sportIconWrap, { backgroundColor: 'rgba(0,230,118,0.08)' }]}>
              <MaterialCommunityIcons name="soccer" size={44} color={Colors.accent} />
            </View>
            <Text style={styles.sportName}>FUTSAL</Text>
            <Text style={styles.sportFormats}>5v5</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 32 }} />
        )}

        {!loading && teams.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>YOUR TEAMS</Text>
            {teams.map((team) => (
              <View key={team.id} style={styles.teamCard}>
                <TouchableOpacity
                  testID={`team-card-${team.id}`}
                  style={styles.teamCardMain}
                  onPress={() => openTeam(team)}
                  activeOpacity={0.7}
                >
                  <View style={styles.teamIconWrap}>
                    <MaterialCommunityIcons
                      name={team.sport === 'futsal' ? 'shoe-cleat' : 'shield-half-full'}
                      size={24}
                      color={Colors.primary}
                    />
                  </View>
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    <View style={styles.teamMeta}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{team.sport.toUpperCase()}</Text>
                      </View>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{team.format}</Text>
                      </View>
                      <Text style={styles.playerCount}>
                        {team.players?.length || 0} players
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <View style={styles.teamActions}>
                  <TouchableOpacity
                    testID={`edit-team-${team.id}`}
                    style={styles.teamActionBtn}
                    onPress={() => editTeam(team)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="pencil" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID={`delete-team-${team.id}`}
                    style={styles.teamActionBtn}
                    onPress={() => confirmDeleteTeam(team)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        <TouchableOpacity
          testID="match-history-btn"
          style={styles.linkButton}
          onPress={() => router.push('/match-history')}
        >
          <MaterialCommunityIcons name="history" size={20} color={Colors.primary} />
          <Text style={styles.linkButtonText}>Match History</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={teamToDelete !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <MaterialCommunityIcons name="trash-can-outline" size={32} color={Colors.destructive} />
            </View>
            <Text style={styles.modalTitle}>Delete Team</Text>
            <Text style={styles.modalDesc}>
              Remove "{teamToDelete?.name}" and all its data? This cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                testID="confirm-delete-btn"
                style={styles.deleteConfirmBtn}
                onPress={executeDelete}
              >
                <Text style={styles.deleteConfirmText}>DELETE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="cancel-delete-btn"
                style={styles.cancelBtn}
                onPress={() => setTeamToDelete(null)}
              >
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
  header: { alignItems: 'center', paddingTop: 48, paddingBottom: 36 },
  logoRow: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,200,83,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  title: {
    fontSize: 44, fontWeight: '900', color: Colors.white,
    textAlign: 'center', letterSpacing: -2, lineHeight: 46,
  },
  subtitle: {
    fontSize: 11, color: Colors.textMuted, marginTop: 10,
    letterSpacing: 3, textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 2.5, marginBottom: 12, marginTop: 4,
  },
  sportRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  sportCard: {
    flex: 1, backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  sportIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,200,83,0.08)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  sportName: {
    fontSize: 17, fontWeight: '800', color: Colors.white, letterSpacing: 1.5,
  },
  sportFormats: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  teamCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary, borderRadius: 12,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  teamCardMain: {
    flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14,
  },
  teamIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,200,83,0.1)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 16, fontWeight: '700', color: Colors.white },
  teamMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 6 },
  badge: {
    backgroundColor: 'rgba(0,200,83,0.12)', paddingHorizontal: 7,
    paddingVertical: 2, borderRadius: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  playerCount: { fontSize: 11, color: Colors.textSecondary },
  teamActions: {
    flexDirection: 'column', gap: 4, paddingRight: 10, paddingVertical: 8,
    borderLeftWidth: 1, borderLeftColor: Colors.border, paddingLeft: 10,
  },
  teamActionBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center',
  },
  linkButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, marginTop: 20, gap: 8,
  },
  linkButtonText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalCard: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 20,
    padding: 28, alignItems: 'center', width: '100%',
    borderWidth: 1, borderColor: Colors.border,
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.white, marginBottom: 8 },
  modalDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalActions: { width: '100%', gap: 8 },
  deleteConfirmBtn: {
    backgroundColor: Colors.destructive, height: 48, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  deleteConfirmText: { fontSize: 14, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  cancelBtn: { height: 44, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
});
