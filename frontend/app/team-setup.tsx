import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp, PlayerData } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';
import { getPositionsForFormat, STARTERS_COUNT } from '../src/constants/formations';

const genId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

export default function TeamSetupScreen() {
  const router = useRouter();
  const { sport, format, currentTeam, saveTeam, setCurrentTeam } = useApp();
  const [teamName, setTeamName] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerData | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerPosition, setPlayerPosition] = useState('');
  const [saving, setSaving] = useState(false);

  const positions = getPositionsForFormat(sport, format);
  const startersCount = STARTERS_COUNT[format] || 5;

  useEffect(() => {
    if (currentTeam) {
      setTeamName(currentTeam.name);
      setAgeGroup(currentTeam.age_group || '');
      setPlayers(currentTeam.players || []);
    }
  }, [currentTeam]);

  const openAddPlayer = () => {
    setEditingPlayer(null);
    setPlayerName('');
    setPlayerNumber(String((players.length || 0) + 1));
    setPlayerPosition(positions[0] || '');
    setShowModal(true);
  };

  const openEditPlayer = (p: PlayerData) => {
    setEditingPlayer(p);
    setPlayerName(p.name);
    setPlayerNumber(String(p.number));
    setPlayerPosition(p.position);
    setShowModal(true);
  };

  const savePlayer = () => {
    if (!playerName.trim()) return Alert.alert('Error', 'Enter player name');
    const num = parseInt(playerNumber) || 0;

    if (editingPlayer) {
      setPlayers(prev =>
        prev.map(p => p.id === editingPlayer.id
          ? { ...p, name: playerName.trim(), number: num, position: playerPosition }
          : p
        )
      );
    } else {
      const newPlayer: PlayerData = {
        id: genId(),
        name: playerName.trim(),
        number: num,
        position: playerPosition,
        is_captain: false,
        is_starter: true,
        set_piece_roles: [],
      };
      setPlayers(prev => [...prev, newPlayer]);
    }
    setShowModal(false);
  };

  const removePlayer = (id: string) => {
    Alert.alert('Remove Player', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setPlayers(prev => prev.filter(p => p.id !== id)) },
    ]);
  };

  const isEditing = !!currentTeam?.id;

  const handleContinue = async () => {
    if (!teamName.trim()) return Alert.alert('Error', 'Enter a team name');
    if (players.length < startersCount) {
      return Alert.alert('Error', `Add at least ${startersCount} players for ${format}`);
    }
    setSaving(true);
    try {
      const saved = await saveTeam({
        name: teamName.trim(),
        sport,
        format,
        players,
      });
      setCurrentTeam(saved);
      if (isEditing) {
        router.back();
      } else {
        router.push('/tactics');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save team');
    }
    setSaving(false);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.sportBadge}>
              <Text style={styles.sportText}>{sport?.toUpperCase()} · {format}</Text>
            </View>
          </View>

          <Text style={styles.label}>TEAM NAME</Text>
          <TextInput
            testID="team-name-input"
            style={styles.input}
            value={teamName}
            onChangeText={setTeamName}
            placeholder="Enter team name"
            placeholderTextColor={Colors.textMuted}
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.label}>
              SQUAD ({players.length} / {startersCount}+ players)
            </Text>
            <TouchableOpacity
              testID="add-player-btn"
              style={styles.addBtn}
              onPress={openAddPlayer}
            >
              <MaterialCommunityIcons name="plus" size={18} color={Colors.white} />
              <Text style={styles.addBtnText}>ADD</Text>
            </TouchableOpacity>
          </View>

          {players.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-group-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No players added yet</Text>
              <Text style={styles.emptySubtext}>Tap ADD to start building your squad</Text>
            </View>
          )}

          {players.map((player, idx) => (
            <TouchableOpacity
              key={player.id}
              testID={`player-row-${idx}`}
              style={styles.playerRow}
              onPress={() => openEditPlayer(player)}
              activeOpacity={0.7}
            >
              <View style={styles.playerNumber}>
                <Text style={styles.playerNumberText}>{player.number}</Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={styles.playerNameText}>{player.name}</Text>
                <Text style={styles.playerPosText}>{player.position}</Text>
              </View>
              <TouchableOpacity
                testID={`remove-player-${idx}`}
                onPress={() => removePlayer(player.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close-circle" size={22} color={Colors.destructive} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          testID="continue-tactics-btn"
          style={[styles.continueBtn, (saving || players.length < startersCount) && styles.disabledBtn]}
          onPress={handleContinue}
          disabled={saving || players.length < startersCount}
        >
          <Text style={styles.continueBtnText}>
            {saving ? 'SAVING...' : isEditing ? 'SAVE CHANGES' : 'CONTINUE TO TACTICS'}
          </Text>
          {!isEditing && <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.white} />}
        </TouchableOpacity>
      </View>

      {/* Add/Edit Player Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingPlayer ? 'Edit Player' : 'Add Player'}
                </Text>
                <TouchableOpacity testID="close-modal-btn" onPress={() => setShowModal(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                testID="player-name-input"
                style={styles.input}
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Player name"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />

              <Text style={styles.fieldLabel}>Number</Text>
              <TextInput
                testID="player-number-input"
                style={styles.input}
                value={playerNumber}
                onChangeText={setPlayerNumber}
                placeholder="Jersey number"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>Position</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.posScroll}>
                {positions.map((pos) => (
                  <TouchableOpacity
                    key={pos}
                    testID={`pos-${pos}`}
                    style={[
                      styles.posChip,
                      playerPosition === pos && styles.posChipActive,
                    ]}
                    onPress={() => setPlayerPosition(pos)}
                  >
                    <Text style={[
                      styles.posChipText,
                      playerPosition === pos && styles.posChipTextActive,
                    ]}>{pos}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                testID="save-player-btn"
                style={styles.saveBtn}
                onPress={savePlayer}
              >
                <Text style={styles.saveBtnText}>
                  {editingPlayer ? 'UPDATE PLAYER' : 'ADD PLAYER'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 120 },
  header: { alignItems: 'center', marginBottom: 20 },
  sportBadge: {
    backgroundColor: 'rgba(0,200,83,0.1)', paddingHorizontal: 14,
    paddingVertical: 6, borderRadius: 20,
  },
  sportText: { fontSize: 12, fontWeight: '700', color: Colors.primary, letterSpacing: 1.5 },
  label: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 2, marginBottom: 8, marginTop: 4,
  },
  input: {
    height: 48, backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, color: Colors.white, fontSize: 15, marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12, marginTop: 8,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 8,
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: Colors.white, letterSpacing: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: Colors.textMuted, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary, borderRadius: 10,
    padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.border,
  },
  playerNumber: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary, justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  playerNumberText: { fontSize: 15, fontWeight: '900', color: Colors.white },
  playerInfo: { flex: 1 },
  playerNameText: { fontSize: 15, fontWeight: '600', color: Colors.white },
  playerPosText: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32,
    backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, height: 52, borderRadius: 12, gap: 8,
  },
  disabledBtn: { opacity: 0.4 },
  continueBtnText: { fontSize: 15, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  modalOverlay: {
    flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end',
  },
  modalKeyboard: { justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.backgroundSecondary, borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 1.5, marginBottom: 6, marginTop: 4,
  },
  posScroll: { marginBottom: 20 },
  posChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: Colors.card, marginRight: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  posChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  posChipText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  posChipTextActive: { color: Colors.white },
  saveBtn: {
    backgroundColor: Colors.primary, height: 48, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
});
