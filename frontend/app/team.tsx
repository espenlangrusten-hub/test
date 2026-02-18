import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Switch, Modal, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp, PlayerData } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'];

export default function TeamPage() {
  const router = useRouter();
  const { currentTeam, setCurrentTeam, saveTeam } = useApp();
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [playerStats, setPlayerStats] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  // Add player modal
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPosition, setNewPosition] = useState('CM');

  // Edit player modal
  const [editPlayer, setEditPlayer] = useState<PlayerData | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editPosition, setEditPosition] = useState('');

  useEffect(() => {
    if (currentTeam?.players) {
      setPlayers(currentTeam.players.map(p => ({
        ...p,
        available: p.available !== undefined ? p.available : true,
      })));
    }
    if (currentTeam?.id) fetchStats();
  }, [currentTeam?.id]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/teams/${currentTeam!.id}/player-stats`);
      const data = await res.json();
      setPlayerStats(data);
    } catch {}
  };

  const persist = async (updated: PlayerData[]) => {
    setPlayers(updated);
    setSaving(true);
    try {
      await saveTeam({ players: updated });
    } catch {}
    setSaving(false);
  };

  const toggleAvailable = (id: string) => {
    const updated = players.map(p => p.id === id ? { ...p, available: !p.available } : p);
    persist(updated);
  };

  const removePlayer = (id: string) => {
    persist(players.filter(p => p.id !== id));
  };

  const addPlayer = () => {
    if (!newName.trim()) return;
    const player: PlayerData = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newName.trim(),
      number: parseInt(newNumber) || (players.length + 1),
      position: newPosition,
      is_captain: false,
      is_starter: false,
      available: true,
      set_piece_roles: [],
    };
    persist([...players, player]);
    setNewName('');
    setNewNumber('');
    setNewPosition('CM');
    setShowAdd(false);
  };

  const openEdit = (p: PlayerData) => {
    setEditPlayer(p);
    setEditName(p.name);
    setEditNumber(String(p.number));
    setEditPosition(p.position);
  };

  const saveEdit = () => {
    if (!editPlayer || !editName.trim()) return;
    const updated = players.map(p =>
      p.id === editPlayer.id
        ? { ...p, name: editName.trim(), number: parseInt(editNumber) || p.number, position: editPosition }
        : p
    );
    persist(updated);
    setEditPlayer(null);
  };

  const goToTactics = () => {
    router.push('/tactics');
  };

  const availableCount = players.filter(p => p.available).length;
  const unavailableCount = players.filter(p => !p.available).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{currentTeam?.name || 'Team'}</Text>
          <Text style={styles.headerSub}>{currentTeam?.format} · {currentTeam?.sport}</Text>
        </View>
        {saving && <Text style={styles.savingText}>Saving...</Text>}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{players.length}</Text>
            <Text style={styles.statLabel}>TOTAL</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: Colors.primary }]}>{availableCount}</Text>
            <Text style={styles.statLabel}>AVAILABLE</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: Colors.destructive }]}>{unavailableCount}</Text>
            <Text style={styles.statLabel}>UNAVAILABLE</Text>
          </View>
        </View>

        {/* Player list */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>SQUAD</Text>
          <TouchableOpacity testID="add-player-btn" style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <MaterialCommunityIcons name="plus" size={16} color={Colors.white} />
            <Text style={styles.addBtnText}>ADD</Text>
          </TouchableOpacity>
        </View>

        {players.map(p => {
          const matches = playerStats[p.id] || 0;
          return (
            <View key={p.id} style={[styles.playerCard, !p.available && styles.playerCardUnavailable]}>
              <View style={styles.playerLeft}>
                <View style={[styles.numCircle, !p.available && styles.numCircleOff]}>
                  <Text style={styles.numText}>{p.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.playerName, !p.available && styles.textOff]}>{p.name}</Text>
                  <View style={styles.playerMeta}>
                    <View style={[styles.posBadge, !p.available && styles.posBadgeOff]}>
                      <Text style={[styles.posText, !p.available && styles.posTextOff]}>{p.position || '—'}</Text>
                    </View>
                    {matches > 0 && (
                      <View style={styles.matchBadge}>
                        <MaterialCommunityIcons name="soccer-field" size={10} color={Colors.textMuted} />
                        <Text style={styles.matchCount}>{matches} match{matches > 1 ? 'es' : ''}</Text>
                      </View>
                    )}
                    {p.is_captain && <Text style={styles.captainBadge}>C</Text>}
                  </View>
                </View>
              </View>

              <View style={styles.playerRight}>
                <TouchableOpacity
                  testID={`edit-player-${p.id}`}
                  style={styles.editBtn}
                  onPress={() => openEdit(p)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  testID={`remove-player-${p.id}`}
                  style={styles.editBtn}
                  onPress={() => removePlayer(p.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="close" size={16} color={Colors.destructive} />
                </TouchableOpacity>
                <Switch
                  testID={`toggle-${p.id}`}
                  value={p.available}
                  onValueChange={() => toggleAvailable(p.id)}
                  trackColor={{ false: Colors.border, true: 'rgba(0,200,83,0.3)' }}
                  thumbColor={p.available ? Colors.primary : Colors.textMuted}
                  style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } : undefined}
                />
              </View>
            </View>
          );
        })}

        {players.length === 0 && (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="account-group-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No players yet. Add players to your squad.</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity testID="go-tactics-btn" style={styles.tacticsBtn} onPress={goToTactics}>
          <MaterialCommunityIcons name="strategy" size={20} color={Colors.white} />
          <Text style={styles.tacticsBtnText}>TACTICS & FORMATION</Text>
          <Text style={styles.tacticsBtnSub}>{availableCount} available</Text>
        </TouchableOpacity>
      </View>

      {/* Add Player Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Add Player</Text>
              <TouchableOpacity testID="close-add-modal" onPress={() => setShowAdd(false)}>
                <MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>NAME</Text>
            <TextInput
              testID="new-player-name"
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Player name"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />

            <Text style={styles.fieldLabel}>NUMBER</Text>
            <TextInput
              testID="new-player-number"
              style={styles.input}
              value={newNumber}
              onChangeText={setNewNumber}
              placeholder={String(players.length + 1)}
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>POSITION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {POSITIONS.map(pos => (
                <TouchableOpacity
                  key={pos}
                  testID={`pos-${pos}`}
                  style={[styles.posChip, newPosition === pos && styles.posChipActive]}
                  onPress={() => setNewPosition(pos)}
                >
                  <Text style={[styles.posChipText, newPosition === pos && styles.posChipTextActive]}>{pos}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity testID="confirm-add-player" style={styles.confirmBtn} onPress={addPlayer}>
              <MaterialCommunityIcons name="plus" size={18} color={Colors.white} />
              <Text style={styles.confirmBtnText}>ADD PLAYER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Player Modal */}
      <Modal visible={editPlayer !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Edit Player</Text>
              <TouchableOpacity testID="close-edit-modal" onPress={() => setEditPlayer(null)}>
                <MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>NAME</Text>
            <TextInput
              testID="edit-player-name"
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Player name"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.fieldLabel}>NUMBER</Text>
            <TextInput
              testID="edit-player-number"
              style={styles.input}
              value={editNumber}
              onChangeText={setEditNumber}
              placeholder="Number"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>POSITION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {POSITIONS.map(pos => (
                <TouchableOpacity
                  key={pos}
                  testID={`edit-pos-${pos}`}
                  style={[styles.posChip, editPosition === pos && styles.posChipActive]}
                  onPress={() => setEditPosition(pos)}
                >
                  <Text style={[styles.posChipText, editPosition === pos && styles.posChipTextActive]}>{pos}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity testID="confirm-edit-player" style={styles.confirmBtn} onPress={saveEdit}>
              <MaterialCommunityIcons name="check" size={18} color={Colors.white} />
              <Text style={styles.confirmBtnText}>SAVE CHANGES</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  savingText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  scroll: { padding: 16, paddingBottom: 40 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: Colors.backgroundSecondary, borderRadius: 12,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  statNum: { fontSize: 24, fontWeight: '900', color: Colors.white },
  statLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginTop: 2 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  playerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary, borderRadius: 10,
    padding: 10, marginBottom: 6, borderWidth: 1, borderColor: Colors.border,
  },
  playerCardUnavailable: { opacity: 0.5 },
  playerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  numCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,200,83,0.12)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  numCircleOff: { borderColor: Colors.border, backgroundColor: 'rgba(255,255,255,0.03)' },
  numText: { fontSize: 14, fontWeight: '900', color: Colors.white },
  playerName: { fontSize: 14, fontWeight: '700', color: Colors.white },
  textOff: { color: Colors.textMuted },
  playerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  posBadge: { backgroundColor: 'rgba(0,200,83,0.1)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  posBadgeOff: { backgroundColor: 'rgba(255,255,255,0.05)' },
  posText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  posTextOff: { color: Colors.textMuted },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  matchCount: { fontSize: 10, color: Colors.textMuted },
  captainBadge: {
    fontSize: 10, fontWeight: '800', color: Colors.warning,
    backgroundColor: 'rgba(245,158,11,0.12)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3,
  },
  playerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editBtn: { padding: 6 },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: Colors.textMuted, marginTop: 8 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32, backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  tacticsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, height: 52, borderRadius: 14, gap: 8,
  },
  tacticsBtnText: { fontSize: 15, fontWeight: '900', color: Colors.white, letterSpacing: 1 },
  tacticsBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.backgroundSecondary, borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20, paddingBottom: 40,
  },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.white },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 6 },
  input: {
    height: 46, backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 14,
    color: Colors.white, fontSize: 15, borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  posChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginRight: 6,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  posChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.1)' },
  posChipText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  posChipTextActive: { color: Colors.primary },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, height: 48, borderRadius: 10, gap: 6,
  },
  confirmBtnText: { fontSize: 14, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
});
