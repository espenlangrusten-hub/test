import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, FlatList, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp, PlayerData } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';
import { getFormations, Formation, PositionSlot, SET_PIECE_ROLES, STARTERS_COUNT, getPositionsForFormat } from '../src/constants/formations';
import PitchView from '../src/components/PitchView';

const genId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

export default function TacticsScreen() {
  const router = useRouter();
  const { sport, format, currentTeam, saveTeam } = useApp();

  const formations = getFormations(sport, format);
  const startersCount = STARTERS_COUNT[format] || 5;
  const positionOptions = getPositionsForFormat(sport, format);

  const [selectedFormation, setSelectedFormation] = useState<Formation>(formations[0]);
  const [assignments, setAssignments] = useState<{ [key: number]: PlayerData | null }>({});
  const [selectedPosIdx, setSelectedPosIdx] = useState<number | null>(null);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [showSetPiece, setShowSetPiece] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customPositions, setCustomPositions] = useState<PositionSlot[] | null>(null);

  // Lineup management
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>(currentTeam?.players || []);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [newPlayerPos, setNewPlayerPos] = useState('');
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null);

  // Positional affinity groups
  const POSITION_GROUPS: Record<string, string[]> = {
    GK: ['GK'],
    DEF: ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF', 'Fixo'],
    MID: ['CM', 'CDM', 'CAM', 'LM', 'RM', 'LAM', 'RAM', 'MID', 'Ala'],
    FWD: ['ST', 'CF', 'LW', 'RW', 'FWD', 'Pivot'],
  };
  const getGroup = (role: string): string => {
    for (const [group, roles] of Object.entries(POSITION_GROUPS)) {
      if (roles.includes(role)) return group;
    }
    return 'MID';
  };

  useEffect(() => {
    if (currentTeam?.formation) {
      const found = formations.find(f => f.name === currentTeam.formation || f.id === currentTeam.formation);
      if (found) setSelectedFormation(found);
    }
    const initialAssign: { [key: number]: PlayerData | null } = {};
    const starters = allPlayers.filter(p => p.is_starter);
    const toAssign = starters.length > 0 ? starters : allPlayers;
    (selectedFormation?.positions || []).forEach((_, idx) => {
      if (idx < toAssign.length) initialAssign[idx] = toAssign[idx];
    });
    setAssignments(initialAssign);
  }, []);

  // Sync allPlayers when currentTeam changes
  useEffect(() => {
    if (currentTeam?.players) setAllPlayers(currentTeam.players);
  }, [currentTeam?.players]);

  const changeFormation = (f: Formation) => {
    setSelectedFormation(f);
    setIsCustomizing(false);
    setCustomPositions(null);
    setAssignments(prev => {
      const currentPlayers = Object.values(prev).filter(Boolean) as PlayerData[];
      const playersToAssign = currentPlayers.length > 0 ? currentPlayers : allPlayers.slice(0, f.positions.length);
      if (playersToAssign.length === 0) return {};
      const newA: { [key: number]: PlayerData | null } = {};
      const used = new Set<string>();
      // Pass 1: exact
      f.positions.forEach((slot, idx) => {
        const m = playersToAssign.find(p => !used.has(p.id) && p.position === slot.role);
        if (m) { newA[idx] = m; used.add(m.id); }
      });
      // Pass 2: group
      f.positions.forEach((slot, idx) => {
        if (newA[idx]) return;
        const g = getGroup(slot.role);
        const m = playersToAssign.find(p => !used.has(p.id) && getGroup(p.position) === g);
        if (m) { newA[idx] = m; used.add(m.id); }
      });
      // Pass 3: any
      f.positions.forEach((_, idx) => {
        if (newA[idx]) return;
        const m = playersToAssign.find(p => !used.has(p.id));
        if (m) { newA[idx] = m; used.add(m.id); }
      });
      return newA;
    });
  };

  const activePositions = customPositions || selectedFormation.positions;
  const assignedIds = Object.values(assignments).filter(Boolean).map(p => p!.id);
  const benchPlayers = allPlayers.filter(p => !assignedIds.includes(p.id));
  const unassignedPlayers = allPlayers.filter(p => !assignedIds.includes(p.id));

  // Selection state for swap mode
  const [selectedSwapIdx, setSelectedSwapIdx] = useState<number | null>(null);

  const handlePositionPress = (idx: number) => {
    if (selectedSwapIdx !== null) {
      // Second tap — perform action
      if (selectedSwapIdx === idx) {
        // Tapped same player again → deselect
        setSelectedSwapIdx(null);
        return;
      }
      if (assignments[idx]) {
        // Both positions have players → SWAP them
        setAssignments(prev => ({
          ...prev,
          [idx]: prev[selectedSwapIdx],
          [selectedSwapIdx]: prev[idx],
        }));
      } else {
        // Empty position → MOVE selected player there
        setAssignments(prev => {
          const updated = { ...prev };
          updated[idx] = updated[selectedSwapIdx];
          delete updated[selectedSwapIdx];
          return updated;
        });
      }
      setSelectedSwapIdx(null);
    } else {
      if (assignments[idx]) {
        // First tap on a player → SELECT for swap
        setSelectedSwapIdx(idx);
      } else {
        // Tap on empty position → open player picker from bench
        setSelectedPosIdx(idx);
        setShowPlayerPicker(true);
      }
    }
  };

  // Move selected player to bench
  const moveSelectedToBench = () => {
    if (selectedSwapIdx !== null && assignments[selectedSwapIdx]) {
      const updated = { ...assignments };
      delete updated[selectedSwapIdx];
      setAssignments(updated);
      setSelectedSwapIdx(null);
    }
  };

  const assignPlayer = (player: PlayerData) => {
    if (selectedPosIdx !== null) {
      setAssignments(prev => ({ ...prev, [selectedPosIdx]: player }));
    }
    setShowPlayerPicker(false);
    setSelectedPosIdx(null);
  };

  // Swap player from bench to pitch (replace a starter)
  const swapBenchToPitch = (benchPlayer: PlayerData) => {
    // Find first empty slot or show picker
    const emptyIdx = activePositions.findIndex((_, i) => !assignments[i]);
    if (emptyIdx !== -1) {
      setAssignments(prev => ({ ...prev, [emptyIdx]: benchPlayer }));
    } else {
      // No empty slot — open picker to select who to replace
      setSelectedPosIdx(null);
      setShowPlayerPicker(true);
    }
  };

  const toggleCaptain = (playerId: string) => {
    const idx = Object.entries(assignments).find(([, p]) => p?.id === playerId)?.[0];
    if (idx === undefined) return;
    const player = assignments[Number(idx)]!;
    const newA = { ...assignments };
    Object.keys(newA).forEach(k => {
      const p = newA[Number(k)];
      if (p) newA[Number(k)] = { ...p, is_captain: false };
    });
    newA[Number(idx)] = { ...player, is_captain: !player.is_captain };
    setAssignments(newA);
  };

  const toggleSetPieceRole = (playerId: string, role: string) => {
    const idx = Object.entries(assignments).find(([, p]) => p?.id === playerId)?.[0];
    if (idx === undefined) return;
    const player = assignments[Number(idx)]!;
    const roles = player.set_piece_roles.includes(role)
      ? player.set_piece_roles.filter(r => r !== role)
      : [...player.set_piece_roles, role];
    setAssignments(prev => ({ ...prev, [Number(idx)]: { ...player, set_piece_roles: roles } }));
  };

  // Add new player
  const addNewPlayer = () => {
    if (!newPlayerName.trim()) return;
    const num = parseInt(newPlayerNumber) || allPlayers.length + 1;
    const np: PlayerData = {
      id: genId(), name: newPlayerName.trim(), number: num,
      position: newPlayerPos || 'CM', is_captain: false, is_starter: false, set_piece_roles: [],
    };
    setAllPlayers(prev => [...prev, np]);
    setShowAddPlayer(false);
    setNewPlayerName(''); setNewPlayerNumber(''); setNewPlayerPos('');
  };

  // Delete player
  const confirmDeletePlayer = (id: string) => {
    setAllPlayers(prev => prev.filter(p => p.id !== id));
    // Remove from assignments if assigned
    setAssignments(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => {
        if (updated[Number(k)]?.id === id) delete updated[Number(k)];
      });
      return updated;
    });
    setDeletePlayerId(null);
  };

  const handleSaveAndMatch = async () => {
    const assignedCount = Object.values(assignments).filter(Boolean).length;
    if (assignedCount < startersCount) return;
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
        formation: isCustomizing ? `${selectedFormation.name} (Custom)` : selectedFormation.name,
        tactic_name: isCustomizing ? `Custom ${selectedFormation.displayName}` : selectedFormation.displayName,
      });
      router.push('/match');
    } catch { }
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
              key={f.id} testID={`formation-${f.id}`}
              style={[styles.formationCard, selectedFormation.id === f.id && styles.formationCardActive]}
              onPress={() => changeFormation(f)}
            >
              <Text style={[styles.formationName, selectedFormation.id === f.id && styles.formationNameActive]}>{f.name}</Text>
              <Text style={styles.formationManager}>{f.managerName || f.displayName}</Text>
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
        <View style={styles.pitchHeader}>
          <View>
            <Text style={styles.sectionTitle}>PITCH VIEW</Text>
            <Text style={styles.hint}>
              {isCustomizing ? 'Drag players to reposition' : 
               selectedSwapIdx !== null ? 'Tap another player to SWAP, or empty slot to MOVE' : 
               'Tap player to select, then swap positions'}
            </Text>
          </View>
          <TouchableOpacity
            testID="customize-toggle-btn"
            style={[styles.customizeBtn, isCustomizing && styles.customizeBtnActive]}
            onPress={() => {
              if (!isCustomizing) { setCustomPositions([...activePositions]); setIsCustomizing(true); }
              else { setIsCustomizing(false); }
            }}
          >
            <MaterialCommunityIcons name={isCustomizing ? 'check' : 'cursor-move'} size={16} color={isCustomizing ? Colors.white : Colors.primary} />
            <Text style={[styles.customizeBtnText, isCustomizing && { color: Colors.white }]}>
              {isCustomizing ? 'DONE' : 'CUSTOMIZE'}
            </Text>
          </TouchableOpacity>
        </View>
        {isCustomizing && (
          <TouchableOpacity testID="reset-positions-btn" style={styles.resetRow}
            onPress={() => setCustomPositions([...selectedFormation.positions])}>
            <MaterialCommunityIcons name="refresh" size={14} color={Colors.warning} />
            <Text style={styles.resetText}>Reset to default positions</Text>
          </TouchableOpacity>
        )}
        <PitchView
          key={selectedFormation.id + '-' + Object.keys(assignments).length}
          positions={activePositions} assignedPlayers={assignments}
          onPositionPress={isCustomizing ? undefined : handlePositionPress}
          sport={sport} draggable={isCustomizing}
          selectedIndex={selectedSwapIdx}
          onPositionDrag={(idx, newX, newY) => {
            if (customPositions) {
              const updated = [...customPositions];
              updated[idx] = { ...updated[idx], x: newX, y: newY };
              setCustomPositions(updated);
            }
          }}
        />

        {/* Selection action bar */}
        {selectedSwapIdx !== null && assignments[selectedSwapIdx] && (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionText}>
              Selected: {assignments[selectedSwapIdx]!.name} (#{assignments[selectedSwapIdx]!.number})
            </Text>
            <TouchableOpacity style={styles.benchMoveBtn} onPress={moveSelectedToBench}>
              <MaterialCommunityIcons name="arrow-down-bold" size={14} color={Colors.white} />
              <Text style={styles.benchMoveText}>TO BENCH</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deselectBtn} onPress={() => setSelectedSwapIdx(null)}>
              <MaterialCommunityIcons name="close" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Bench — Tap to move to pitch */}
        <View style={styles.benchHeader}>
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>BENCH ({benchPlayers.length})</Text>
          <TouchableOpacity style={styles.addPlayerBtn} onPress={() => {
            setNewPlayerNumber(String(allPlayers.length + 1));
            setNewPlayerPos(positionOptions[0] || 'CM');
            setShowAddPlayer(true);
          }}>
            <MaterialCommunityIcons name="plus" size={16} color={Colors.white} />
            <Text style={styles.addPlayerBtnText}>ADD PLAYER</Text>
          </TouchableOpacity>
        </View>
        {benchPlayers.length > 0 ? (
          <View style={styles.benchList}>
            {benchPlayers.map((p) => (
              <View key={p.id} style={styles.benchItem}>
                <TouchableOpacity style={styles.benchItemMain} onPress={() => swapBenchToPitch(p)} activeOpacity={0.7}>
                  <View style={styles.benchDot}>
                    <Text style={styles.benchDotText}>{p.number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.benchItemName}>{p.name}</Text>
                    <Text style={styles.benchItemPos}>{p.position}</Text>
                  </View>
                  <MaterialCommunityIcons name="arrow-up-bold" size={16} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deletePlayerBtn} onPress={() => setDeletePlayerId(p.id)}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={Colors.destructive} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.benchEmpty}>All players assigned to pitch</Text>
        )}

        {/* Actions */}
        <TouchableOpacity testID="tactic-guide-btn" style={styles.actionRow} onPress={() => router.push('/tactic-guide')}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={20} color={Colors.primary} />
          <Text style={styles.actionText}>Tactic Guide — Focus Areas</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity testID="set-piece-btn" style={styles.actionRow} onPress={() => setShowSetPiece(true)}>
          <MaterialCommunityIcons name="flag-triangle" size={20} color={Colors.primary} />
          <Text style={styles.actionText}>Set Piece Takers</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity testID="team-match-history-btn" style={styles.actionRow}
          onPress={() => router.push({ pathname: '/match-history', params: { teamId: currentTeam?.id } })}>
          <MaterialCommunityIcons name="history" size={20} color={Colors.primary} />
          <Text style={styles.actionText}>Match History</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity testID="save-match-btn"
          style={[styles.matchBtn, saving && styles.disabledBtn]}
          onPress={handleSaveAndMatch} disabled={saving}>
          <MaterialCommunityIcons name="whistle" size={20} color={Colors.white} />
          <Text style={styles.matchBtnText}>{saving ? 'SAVING...' : 'START MATCH'}</Text>
        </TouchableOpacity>
      </View>

      {/* Player Picker Modal */}
      <Modal visible={showPlayerPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Assign to {selectedPosIdx !== null ? activePositions[selectedPosIdx]?.role : 'Position'}
              </Text>
              <TouchableOpacity onPress={() => setShowPlayerPicker(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList data={unassignedPlayers} keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerRow} onPress={() => assignPlayer(item)}>
                  <View style={styles.pickerNum}><Text style={styles.pickerNumText}>{item.number}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerName}>{item.name}</Text>
                    <Text style={styles.pickerPos}>{item.position}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>All players assigned</Text>}
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
              <TouchableOpacity onPress={() => setShowSetPiece(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {SET_PIECE_ROLES.map((role) => (
                <View key={role} style={styles.setPieceSection}>
                  <Text style={styles.setPieceRole}>{role}</Text>
                  <View style={styles.setPieceChips}>
                    {startersList.map((p) => (
                      <TouchableOpacity key={p.id}
                        style={[styles.spChip, p.set_piece_roles.includes(role) && styles.spChipActive]}
                        onPress={() => toggleSetPieceRole(p.id, role)}>
                        <Text style={[styles.spChipText, p.set_piece_roles.includes(role) && styles.spChipTextActive]}>
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

      {/* Add Player Modal */}
      <Modal visible={showAddPlayer} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ justifyContent: 'flex-end' }}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Player</Text>
                <TouchableOpacity onPress={() => setShowAddPlayer(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput style={styles.inputField} value={newPlayerName} onChangeText={setNewPlayerName}
                placeholder="Player name" placeholderTextColor={Colors.textMuted} autoFocus />
              <Text style={styles.fieldLabel}>Number</Text>
              <TextInput style={styles.inputField} value={newPlayerNumber} onChangeText={setNewPlayerNumber}
                placeholder="Jersey number" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />
              <Text style={styles.fieldLabel}>Position</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {positionOptions.map(pos => (
                  <TouchableOpacity key={pos}
                    style={[styles.posChip, newPlayerPos === pos && styles.posChipActive]}
                    onPress={() => setNewPlayerPos(pos)}>
                    <Text style={[styles.posChipText, newPlayerPos === pos && { color: Colors.white }]}>{pos}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.savePlayerBtn} onPress={addNewPlayer}>
                <Text style={styles.savePlayerBtnText}>ADD PLAYER</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Delete Player Confirm */}
      {deletePlayerId && (
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteCard}>
            <MaterialCommunityIcons name="account-remove" size={32} color={Colors.destructive} />
            <Text style={styles.deleteTitle}>Remove Player?</Text>
            <Text style={styles.deleteDesc}>
              Remove {allPlayers.find(p => p.id === deletePlayerId)?.name} from the squad?
            </Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={() => confirmDeletePlayer(deletePlayerId)}>
                <Text style={styles.deleteConfirmText}>REMOVE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setDeletePlayerId(null)}>
                <Text style={styles.deleteCancelText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 120 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2.5, marginBottom: 8, marginTop: 8 },
  hint: { fontSize: 12, color: Colors.textMuted, marginBottom: 8 },
  pitchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8, marginBottom: 4 },
  customizeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.primary },
  customizeBtnActive: { backgroundColor: Colors.primary },
  customizeBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primary, letterSpacing: 1 },
  resetRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8, paddingVertical: 4 },
  resetText: { fontSize: 11, color: Colors.warning, fontWeight: '600' },
  formationScroll: { marginBottom: 12 },
  formationCard: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.backgroundSecondary, marginRight: 8, borderWidth: 1, borderColor: Colors.border, minWidth: 90, alignItems: 'center' },
  formationCardActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.1)' },
  formationName: { fontSize: 16, fontWeight: '800', color: Colors.textSecondary },
  formationNameActive: { color: Colors.primary },
  formationManager: { fontSize: 10, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  descCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  managerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  managerName: { fontSize: 13, fontWeight: '700', color: Colors.white },
  styleBadge: { backgroundColor: 'rgba(0,200,83,0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  styleText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  descText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  // Bench
  benchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addPlayerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addPlayerBtnText: { fontSize: 11, fontWeight: '700', color: Colors.white, letterSpacing: 0.5 },
  benchList: { gap: 4 },
  benchItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  benchItemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  benchDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  benchDotText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  benchItemName: { fontSize: 13, fontWeight: '600', color: Colors.white },
  benchItemPos: { fontSize: 11, color: Colors.textMuted },
  deletePlayerBtn: { padding: 10 },
  benchEmpty: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },

  // Selection bar
  selectionBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,215,0,0.12)', borderRadius: 10, padding: 10,
    marginTop: 8, borderWidth: 1.5, borderColor: '#FFD700',
  },
  selectionText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#FFD700' },
  benchMoveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.destructive, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  benchMoveText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  deselectBtn: { padding: 4 },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.backgroundSecondary, borderRadius: 10, padding: 14, marginTop: 16, borderWidth: 1, borderColor: Colors.border },
  actionText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.white },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  matchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, height: 52, borderRadius: 12, gap: 8 },
  disabledBtn: { opacity: 0.4 },
  matchBtnText: { fontSize: 15, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.backgroundSecondary, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.white },
  pickerRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerNum: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  pickerNumText: { fontSize: 14, fontWeight: '900', color: Colors.white },
  pickerName: { fontSize: 15, fontWeight: '600', color: Colors.white },
  pickerPos: { fontSize: 12, color: Colors.textMuted },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  setPieceSection: { marginBottom: 16 },
  setPieceRole: { fontSize: 13, fontWeight: '700', color: Colors.white, marginBottom: 8, letterSpacing: 0.5 },
  setPieceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  spChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  spChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  spChipText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  spChipTextActive: { color: Colors.white },

  // Add player modal
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 6, marginTop: 4 },
  inputField: { height: 48, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, color: Colors.white, fontSize: 15, marginBottom: 12 },
  posChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.card, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
  posChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  posChipText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  savePlayerBtn: { backgroundColor: Colors.primary, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  savePlayerBtnText: { fontSize: 14, fontWeight: '800', color: Colors.white, letterSpacing: 1 },

  // Delete overlay
  deleteOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 999 },
  deleteCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 16, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  deleteTitle: { fontSize: 18, fontWeight: '700', color: Colors.white, marginTop: 12, marginBottom: 8 },
  deleteDesc: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 20 },
  deleteActions: { width: '100%', gap: 10 },
  deleteConfirmBtn: { backgroundColor: Colors.destructive, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  deleteConfirmText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  deleteCancelBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  deleteCancelText: { color: Colors.textMuted, fontWeight: '600', fontSize: 15 },
});
