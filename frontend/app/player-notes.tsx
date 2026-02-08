import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp, PlayerData } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Note {
  player_id: string;
  player_name: string;
  note: string;
  rating: number;
  created_at: string;
}

export default function PlayerNotesScreen() {
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  const { currentTeam } = useApp();
  const allPlayers = currentTeam?.players || [];

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);

  const loadPlayerNotes = async (player: PlayerData) => {
    setSelectedPlayer(player);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/players/${player.id}/notes`);
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      setNotes([]);
    }
    setLoading(false);
  };

  const addNote = async () => {
    if (!noteText.trim() || !selectedPlayer) return;
    if (!matchId) {
      Alert.alert('Info', 'Notes can be added after a match is started');
      return;
    }
    try {
      await fetch(`${API_URL}/api/matches/${matchId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: selectedPlayer.id,
          player_name: selectedPlayer.name,
          note: noteText.trim(),
          rating,
        }),
      });
      setNotes(prev => [
        {
          player_id: selectedPlayer.id,
          player_name: selectedPlayer.name,
          note: noteText.trim(),
          rating,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setNoteText('');
      setRating(5);
    } catch {
      Alert.alert('Error', 'Failed to save note');
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Player Selector */}
          <Text style={styles.sectionTitle}>SELECT PLAYER</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerScroll}>
            {allPlayers.map((p) => (
              <TouchableOpacity
                key={p.id}
                testID={`select-player-${p.id}`}
                style={[
                  styles.playerChip,
                  selectedPlayer?.id === p.id && styles.playerChipActive,
                ]}
                onPress={() => loadPlayerNotes(p)}
              >
                <View style={[
                  styles.chipNum,
                  selectedPlayer?.id === p.id && styles.chipNumActive,
                ]}>
                  <Text style={styles.chipNumText}>{p.number}</Text>
                </View>
                <Text style={[
                  styles.chipName,
                  selectedPlayer?.id === p.id && styles.chipNameActive,
                ]} numberOfLines={1}>
                  {p.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedPlayer && (
            <>
              {/* Player Info */}
              <View style={styles.playerHeader}>
                <View style={styles.playerAvatar}>
                  <Text style={styles.avatarNum}>{selectedPlayer.number}</Text>
                </View>
                <View>
                  <Text style={styles.playerName}>{selectedPlayer.name}</Text>
                  <View style={styles.playerMeta}>
                    <Text style={styles.playerPos}>{selectedPlayer.position}</Text>
                    {selectedPlayer.is_captain && (
                      <View style={styles.captainBadge}>
                        <Text style={styles.captainText}>CAPTAIN</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Add Note */}
              <Text style={styles.sectionTitle}>ADD NOTE</Text>
              <TextInput
                testID="note-input"
                style={styles.noteInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Performance notes, observations..."
                placeholderTextColor={Colors.textMuted}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.ratingLabel}>RATING</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                  <TouchableOpacity
                    key={r}
                    testID={`rating-${r}`}
                    style={[styles.ratingBtn, rating === r && styles.ratingBtnActive]}
                    onPress={() => setRating(r)}
                  >
                    <Text style={[styles.ratingNum, rating === r && styles.ratingNumActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                testID="save-note-btn"
                style={[styles.saveBtn, !noteText.trim() && styles.disabledBtn]}
                onPress={addNote}
                disabled={!noteText.trim()}
              >
                <Text style={styles.saveBtnText}>SAVE NOTE</Text>
              </TouchableOpacity>

              {/* Notes List */}
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                HISTORY ({notes.length})
              </Text>
              {loading && <Text style={styles.loadingText}>Loading...</Text>}
              {!loading && notes.length === 0 && (
                <Text style={styles.emptyText}>No notes yet for this player</Text>
              )}
              {notes.map((n, i) => (
                <View key={i} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <View style={[
                      styles.noteRating,
                      { backgroundColor: n.rating >= 7 ? 'rgba(0,200,83,0.15)' : n.rating >= 4 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)' },
                    ]}>
                      <Text style={[
                        styles.noteRatingText,
                        { color: n.rating >= 7 ? Colors.primary : n.rating >= 4 ? Colors.warning : Colors.destructive },
                      ]}>{n.rating}/10</Text>
                    </View>
                    <Text style={styles.noteDate}>
                      {new Date(n.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.noteText}>{n.note}</Text>
                </View>
              ))}
            </>
          )}

          {!selectedPlayer && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="note-edit-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyStateText}>Select a player to view or add notes</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 2.5, marginBottom: 10, marginTop: 8,
  },
  playerScroll: { marginBottom: 16 },
  playerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.backgroundSecondary, paddingHorizontal: 10,
    paddingVertical: 8, borderRadius: 10, marginRight: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  playerChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.08)' },
  chipNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center',
  },
  chipNumActive: { backgroundColor: Colors.primary },
  chipNumText: { fontSize: 12, fontWeight: '800', color: Colors.white },
  chipName: { fontSize: 13, color: Colors.textSecondary, maxWidth: 70 },
  chipNameActive: { color: Colors.white },
  playerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.backgroundSecondary, borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  playerAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarNum: { fontSize: 20, fontWeight: '900', color: Colors.white },
  playerName: { fontSize: 18, fontWeight: '700', color: Colors.white },
  playerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  playerPos: { fontSize: 13, color: Colors.textMuted },
  captainBadge: {
    backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 4,
  },
  captainText: { fontSize: 10, fontWeight: '700', color: Colors.warning },
  noteInput: {
    height: 100, backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, color: Colors.white,
    fontSize: 14, marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 1.5, marginBottom: 8,
  },
  ratingRow: { flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  ratingBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.card, justifyContent: 'center',
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  ratingBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  ratingNum: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  ratingNumActive: { color: Colors.white },
  saveBtn: {
    backgroundColor: Colors.primary, height: 44, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  disabledBtn: { opacity: 0.4 },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  loadingText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  noteCard: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 10,
    padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  noteHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  noteRating: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  noteRatingText: { fontSize: 12, fontWeight: '800' },
  noteDate: { fontSize: 11, color: Colors.textMuted },
  noteText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyStateText: { fontSize: 14, color: Colors.textMuted, marginTop: 12 },
});
