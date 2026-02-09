import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, Alert, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp, PlayerData } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';
import { getFormations, Formation, PositionSlot, SET_PIECE_ROLES, STARTERS_COUNT } from '../src/constants/formations';
import PitchView from '../src/components/PitchView';

export default function TacticsScreen() {
  const router = useRouter();
  const { sport, format, currentTeam, saveTeam } = useApp();

  const formations = getFormations(sport, format);
  const startersCount = STARTERS_COUNT[format] || 5;

  const [selectedFormation, setSelectedFormation] = useState<Formation>(formations[0]);
  const [assignments, setAssignments] = useState<{ [key: number]: PlayerData | null }>({});
  const [selectedPosIdx, setSelectedPosIdx] = useState<number | null>(null);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [showSetPiece, setShowSetPiece] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customPositions, setCustomPositions] = useState<PositionSlot[] | null>(null);

  const allPlayers = currentTeam?.players || [];

  useEffect(() => {
    if (currentTeam?.formation) {
      const found = formations.find(f => f.name === currentTeam.formation || f.id === currentTeam.formation);
      if (found) setSelectedFormation(found);
    }
    // Auto-assign starters
    const initialAssign: { [key: number]: PlayerData | null } = {};
    const starters = allPlayers.filter(p => p.is_starter);
    const toAssign = starters.length > 0 ? starters : allPlayers;
    (selectedFormation?.positions || []).forEach((_, idx) => {
      if (idx < toAssign.length) {
        initialAssign[idx] = toAssign[idx];
      }
    });
    setAssignments(initialAssign);
  }, []);

  const changeFormation = (f: Formation) => {
    setSelectedFormation(f);
    setAssignments({});
  };

  const assignedIds = Object.values(assignments).filter(Boolean).map(p => p!.id);
  const unassignedPlayers = allPlayers.filter(p => !assignedIds.includes(p.id));
  const benchPlayers = allPlayers.filter(p => !assignedIds.includes(p.id));

  const handlePositionPress = (idx: number) => {
    if (assignments[idx]) {
      // Unassign
      Alert.alert(
        assignments[idx]!.name,
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: assignments[idx]!.is_captain ? 'Remove Captain' : 'Make Captain',
            onPress: () => toggleCaptain(idx),
          },
          {
            text: 'Remove from Position',
            style: 'destructive',
            onPress: () => {
              const updated = { ...assignments };
              delete updated[idx];
              setAssignments(updated);
            },
          },
        ]
      );
    } else {
      setSelectedPosIdx(idx);
      setShowPlayerPicker(true);
    }
  };

  const assignPlayer = (player: PlayerData) => {
    if (selectedPosIdx !== null) {
      setAssignments(prev => ({ ...prev, [selectedPosIdx]: player }));
    }
    setShowPlayerPicker(false);
    setSelectedPosIdx(null);
  };

  const toggleCaptain = (idx: number) => {
    const player = assignments[idx];
    if (!player) return;
    // Remove captain from all, set this one
    const newAssignments = { ...assignments };
    Object.keys(newAssignments).forEach(k => {
      const p = newAssignments[Number(k)];
      if (p) newAssignments[Number(k)] = { ...p, is_captain: false };
    });
    newAssignments[idx] = { ...player, is_captain: !player.is_captain };
    setAssignments(newAssignments);
  };

  const toggleSetPieceRole = (playerId: string, role: string) => {
    const idx = Object.entries(assignments).find(([, p]) => p?.id === playerId)?.[0];
    if (idx === undefined) return;
    const player = assignments[Number(idx)]!;
    const roles = player.set_piece_roles.includes(role)
      ? player.set_piece_roles.filter(r => r !== role)
      : [...player.set_piece_roles, role];
    setAssignments(prev => ({
      ...prev,
      [Number(idx)]: { ...player, set_piece_roles: roles },
    }));
  };

  const handleSaveAndMatch = async () => {
    const assignedCount = Object.values(assignments).filter(Boolean).length;
    if (assignedCount < startersCount) {
      return Alert.alert('Incomplete', `Assign all ${startersCount} starting positions`);
    }
    setSaving(true);
    try {
      const starters = Object.values(assignments).filter(Boolean) as PlayerData[];
      const starterIds = starters.map(p => p.id);
      const updatedPlayers = allPlayers.map(p => ({
        ...p,
        is_starter: starterIds.includes(p.id),
        is_captain: starters.find(s => s.id === p.id)?.is_captain || false,
        set_piece_roles: starters.find(s => s.id === p.id)?.set_piece_roles || p.set_piece_roles,
      }));
      await saveTeam({
        players: updatedPlayers,
        formation: selectedFormation.name,
        tactic_name: selectedFormation.displayName,
      });
      router.push('/match');
    } catch {
      Alert.alert('Error', 'Failed to save tactics');
    }
    setSaving(false);
  };

  const startersList = Object.values(assignments).filter(Boolean) as PlayerData[];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Formation Picker */}
        <Text style={styles.sectionTitle}>FORMATION</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formationScroll}>
          {formations.map((f) => (
            <TouchableOpacity
              key={f.id}
              testID={`formation-${f.id}`}
              style={[
                styles.formationCard,
                selectedFormation.id === f.id && styles.formationCardActive,
              ]}
              onPress={() => changeFormation(f)}
            >
              <Text style={[
                styles.formationName,
                selectedFormation.id === f.id && styles.formationNameActive,
              ]}>{f.name}</Text>
              {f.managerName && (
                <Text style={styles.formationManager}>{f.managerName}</Text>
              )}
              {!f.managerName && (
                <Text style={styles.formationManager}>{f.displayName}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Formation Description */}
        {selectedFormation.description && (
          <View style={styles.descCard}>
            {selectedFormation.managerName && (
              <View style={styles.managerRow}>
                <MaterialCommunityIcons name="account-tie" size={16} color={Colors.primary} />
                <Text style={styles.managerName}>{selectedFormation.managerName}</Text>
                {selectedFormation.managerStyle && (
                  <View style={styles.styleBadge}>
                    <Text style={styles.styleText}>{selectedFormation.managerStyle}</Text>
                  </View>
                )}
              </View>
            )}
            <Text style={styles.descText}>{selectedFormation.description}</Text>
          </View>
        )}

        {/* Pitch View */}
        <Text style={styles.sectionTitle}>PITCH VIEW</Text>
        <Text style={styles.hint}>Tap empty positions to assign players</Text>
        <PitchView
          positions={selectedFormation.positions}
          assignedPlayers={assignments}
          onPositionPress={handlePositionPress}
          sport={sport}
        />

        {/* Bench */}
        {benchPlayers.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              BENCH ({benchPlayers.length})
            </Text>
            <View style={styles.benchRow}>
              {benchPlayers.map((p) => (
                <View key={p.id} style={styles.benchChip}>
                  <Text style={styles.benchNumber}>{p.number}</Text>
                  <Text style={styles.benchName}>{p.name}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Tactic Guide */}
        <TouchableOpacity
          testID="tactic-guide-btn"
          style={styles.actionRow}
          onPress={() => router.push('/tactic-guide')}
        >
          <MaterialCommunityIcons name="clipboard-text-outline" size={20} color={Colors.primary} />
          <Text style={styles.actionText}>Tactic Guide — Focus Areas</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Set Piece Takers */}
        <TouchableOpacity
          testID="set-piece-btn"
          style={styles.actionRow}
          onPress={() => setShowSetPiece(true)}
        >
          <MaterialCommunityIcons name="flag-triangle" size={20} color={Colors.primary} />
          <Text style={styles.actionText}>Set Piece Takers</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          testID="save-match-btn"
          style={[styles.matchBtn, saving && styles.disabledBtn]}
          onPress={handleSaveAndMatch}
          disabled={saving}
        >
          <MaterialCommunityIcons name="whistle" size={20} color={Colors.white} />
          <Text style={styles.matchBtnText}>
            {saving ? 'SAVING...' : 'START MATCH'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Player Picker Modal */}
      <Modal visible={showPlayerPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Assign to {selectedPosIdx !== null ? selectedFormation.positions[selectedPosIdx]?.role : ''}
              </Text>
              <TouchableOpacity testID="close-picker" onPress={() => setShowPlayerPicker(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={unassignedPlayers}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  testID={`pick-player-${item.id}`}
                  style={styles.pickerRow}
                  onPress={() => assignPlayer(item)}
                >
                  <View style={styles.pickerNum}>
                    <Text style={styles.pickerNumText}>{item.number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerName}>{item.name}</Text>
                    <Text style={styles.pickerPos}>{item.position}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>All players assigned</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Set Piece Modal */}
      <Modal visible={showSetPiece} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Piece Takers</Text>
              <TouchableOpacity testID="close-setpiece" onPress={() => setShowSetPiece(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {SET_PIECE_ROLES.map((role) => (
                <View key={role} style={styles.setPieceSection}>
                  <Text style={styles.setPieceRole}>{role}</Text>
                  <View style={styles.setPieceChips}>
                    {startersList.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        testID={`sp-${role}-${p.id}`}
                        style={[
                          styles.spChip,
                          p.set_piece_roles.includes(role) && styles.spChipActive,
                        ]}
                        onPress={() => toggleSetPieceRole(p.id, role)}
                      >
                        <Text style={[
                          styles.spChipText,
                          p.set_piece_roles.includes(role) && styles.spChipTextActive,
                        ]}>
                          {p.number} {p.name.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 120 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 2.5, marginBottom: 8, marginTop: 8,
  },
  hint: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  formationScroll: { marginBottom: 12 },
  formationCard: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary, marginRight: 8,
    borderWidth: 1, borderColor: Colors.border, minWidth: 90, alignItems: 'center',
  },
  formationCardActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.1)' },
  formationName: { fontSize: 16, fontWeight: '800', color: Colors.textSecondary },
  formationNameActive: { color: Colors.primary },
  formationManager: { fontSize: 10, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  descCard: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 10,
    padding: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  managerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  managerName: { fontSize: 13, fontWeight: '700', color: Colors.white },
  styleBadge: {
    backgroundColor: 'rgba(0,200,83,0.12)', paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 4,
  },
  styleText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  descText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  benchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  benchChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.backgroundSecondary, paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
  },
  benchNumber: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  benchName: { fontSize: 13, color: Colors.textSecondary },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.backgroundSecondary, borderRadius: 10,
    padding: 14, marginTop: 16, borderWidth: 1, borderColor: Colors.border,
  },
  actionText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.white },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32, backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  matchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, height: 52, borderRadius: 12, gap: 8,
  },
  disabledBtn: { opacity: 0.4 },
  matchBtnText: { fontSize: 15, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.backgroundSecondary, borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.white },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pickerNum: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary, justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  pickerNumText: { fontSize: 14, fontWeight: '900', color: Colors.white },
  pickerName: { fontSize: 15, fontWeight: '600', color: Colors.white },
  pickerPos: { fontSize: 12, color: Colors.textMuted },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  setPieceSection: { marginBottom: 16 },
  setPieceRole: {
    fontSize: 13, fontWeight: '700', color: Colors.white,
    marginBottom: 8, letterSpacing: 0.5,
  },
  setPieceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  spChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  spChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  spChipText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  spChipTextActive: { color: Colors.white },
});
