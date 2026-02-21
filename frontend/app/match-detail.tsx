import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useApp } from '../src/context/AppContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface NoteItem {
  player_id: string;
  player_name: string;
  note: string;
  rating: number;
  created_at: string;
}

interface MatchData {
  id: string;
  team_id: string;
  opponent: string;
  formation: string;
  tactic_name: string;
  duration_minutes: number;
  status: string;
  created_at: string;
  starters: string[];
  subs: string[];
  sub_mode: string;
  player_notes: NoteItem[];
}

export default function MatchDetailScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchNote, setMatchNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMatch();
  }, [matchId]);

  const loadMatch = async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/matches/${matchId}`);
      const data = await res.json();
      setMatch(data);
    } catch {}
    setLoading(false);
  };

  const saveMatchNote = async () => {
    if (!matchNote.trim() || !matchId) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/matches/${matchId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: 'match_general',
          player_name: 'Match Note',
          note: matchNote.trim(),
          rating: 0,
        }),
      });
      setMatchNote('');
      await loadMatch();
    } catch {}
    setSaving(false);
  };

  const generalNotes = (match?.player_notes || []).filter(n => n.player_id === 'match_general');
  const playerNotes = (match?.player_notes || []).filter(n => n.player_id !== 'match_general');

  const statusColor = (s: string) => {
    if (s === 'completed') return Colors.primary;
    if (s === 'live') return Colors.warning;
    return Colors.textMuted;
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyText}>Match not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Match Header */}
          <View style={styles.headerCard}>
            <View style={styles.headerTop}>
              <View style={[styles.statusDot, { backgroundColor: statusColor(match.status) }]} />
              <Text style={[styles.statusLabel, { color: statusColor(match.status) }]}>
                {(match.status || 'planned').toUpperCase()}
              </Text>
              <Text style={styles.dateText}>
                {new Date(match.created_at).toLocaleDateString(undefined, {
                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
            <Text style={styles.opponentName}>{match.opponent || 'Unknown Opponent'}</Text>
            <View style={styles.metaRow}>
              {match.formation && (
                <View style={styles.metaBadge}>
                  <Text style={styles.metaText}>{match.formation}</Text>
                </View>
              )}
              {match.tactic_name && (
                <View style={styles.metaBadge}>
                  <Text style={styles.metaText}>{match.tactic_name}</Text>
                </View>
              )}
              <View style={styles.metaBadge}>
                <Text style={styles.metaText}>{match.duration_minutes} min</Text>
              </View>
              <View style={styles.metaBadge}>
                <Text style={styles.metaText}>{match.sub_mode || 'auto'}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="account" size={14} color={Colors.textMuted} />
                <Text style={styles.statText}>{match.starters?.length || 0} starters</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="swap-horizontal" size={14} color={Colors.textMuted} />
                <Text style={styles.statText}>{match.subs?.length || 0} subs</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="note-text" size={14} color={Colors.textMuted} />
                <Text style={styles.statText}>{(match.player_notes || []).length} notes</Text>
              </View>
            </View>
          </View>

          {/* Add Match Note */}
          <Text style={styles.sectionTitle}>MATCH NOTES</Text>
          <View style={styles.addNoteCard}>
            <TextInput
              testID="match-note-input"
              style={styles.noteInput}
              value={matchNote}
              onChangeText={setMatchNote}
              placeholder="Add a general match observation, tactical note..."
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              testID="save-match-note-btn"
              style={[styles.addNoteBtn, (!matchNote.trim() || saving) && { opacity: 0.4 }]}
              onPress={saveMatchNote}
              disabled={!matchNote.trim() || saving}
            >
              <MaterialCommunityIcons name="plus" size={16} color={Colors.white} />
              <Text style={styles.addNoteBtnText}>{saving ? 'SAVING...' : 'ADD NOTE'}</Text>
            </TouchableOpacity>
          </View>

          {/* General Match Notes */}
          {generalNotes.length > 0 && (
            <View style={styles.notesList}>
              {generalNotes.map((n, i) => (
                <View key={`gn-${i}`} style={styles.generalNoteCard}>
                  <View style={styles.noteHeader}>
                    <MaterialCommunityIcons name="clipboard-text" size={16} color={Colors.primary} />
                    <Text style={styles.noteLabel}>Match Note</Text>
                    <Text style={styles.noteDate}>
                      {new Date(n.created_at).toLocaleString(undefined, {
                        hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.noteText}>{n.note}</Text>
                </View>
              ))}
            </View>
          )}
          {generalNotes.length === 0 && (
            <Text style={styles.emptyHint}>No match notes yet — add observations above</Text>
          )}

          {/* Player Notes */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
            PLAYER NOTES ({playerNotes.length})
          </Text>
          {playerNotes.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="note-edit-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No player notes for this match</Text>
              <Text style={styles.emptyHint}>Player notes are added from the post-match review</Text>
            </View>
          )}
          {playerNotes.map((n, i) => (
            <View key={`pn-${i}`} style={styles.playerNoteCard}>
              <View style={styles.playerNoteHeader}>
                <View style={styles.playerAvatar}>
                  <Text style={styles.playerAvatarText}>
                    {n.player_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{n.player_name}</Text>
                  <Text style={styles.noteDate}>
                    {new Date(n.created_at).toLocaleString(undefined, {
                      hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
                    })}
                  </Text>
                </View>
                <View style={[
                  styles.ratingBadge,
                  {
                    backgroundColor: n.rating >= 7 ? 'rgba(0,200,83,0.15)'
                      : n.rating >= 4 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                  },
                ]}>
                  <Text style={[
                    styles.ratingText,
                    {
                      color: n.rating >= 7 ? Colors.primary
                        : n.rating >= 4 ? Colors.warning : Colors.destructive,
                    },
                  ]}>{n.rating}/10</Text>
                </View>
              </View>
              <Text style={styles.noteText}>{n.note}</Text>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  headerCard: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 14,
    padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  dateText: { fontSize: 11, color: Colors.textMuted, marginLeft: 'auto' },
  opponentName: { fontSize: 22, fontWeight: '800', color: Colors.white, marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  metaBadge: {
    backgroundColor: 'rgba(0,200,83,0.1)', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 4,
  },
  metaText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  statsRow: { flexDirection: 'row', gap: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: Colors.textMuted },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 2.5, marginBottom: 10,
  },
  addNoteCard: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 12,
    padding: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  noteInput: {
    height: 72, backgroundColor: Colors.card, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, color: Colors.white,
    fontSize: 13, borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
  },
  addNoteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, height: 40, borderRadius: 8, gap: 6,
  },
  addNoteBtnText: { fontSize: 12, fontWeight: '700', color: Colors.white, letterSpacing: 1 },
  notesList: { gap: 8, marginBottom: 8 },
  generalNoteCard: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  noteLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary, flex: 1 },
  noteDate: { fontSize: 10, color: Colors.textMuted },
  noteText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 14, color: Colors.textMuted, marginTop: 8 },
  emptyHint: { fontSize: 12, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  playerNoteCard: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 10,
    padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  playerNoteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  playerAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  playerAvatarText: { fontSize: 14, fontWeight: '900', color: Colors.white },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 14, fontWeight: '700', color: Colors.white },
  ratingBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  ratingText: { fontSize: 12, fontWeight: '800' },
});
