import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Modal, ActivityIndicator, Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useApp } from '../src/context/AppContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface MatchEvent {
  type: string;
  minute: number;
  player_id?: string;
  player_in_id?: string;
  detail: string;
}

interface PlayerNote {
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
  events: MatchEvent[];
  player_notes: PlayerNote[];
  score_home?: number;
  score_away?: number;
  starting_lineup?: { id: string; name: string; number: number; position: string }[];
}

const EVENT_TYPES = [
  { key: 'goal', label: 'Goal', icon: 'soccer', color: Colors.primary },
  { key: 'assist', label: 'Assist', icon: 'shoe-cleat', color: '#8B5CF6' },
  { key: 'yellow', label: 'Yellow Card', icon: 'card', color: '#F59E0B' },
  { key: 'red', label: 'Red Card', icon: 'card', color: '#EF4444' },
  { key: 'sub', label: 'Substitution', icon: 'swap-horizontal-bold', color: '#3B82F6' },
];

export default function MatchDetailScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { token, currentTeam } = useApp();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editing state
  const [editScore, setEditScore] = useState(false);
  const [scoreH, setScoreH] = useState('0');
  const [scoreA, setScoreA] = useState('0');

  // Add event modal
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventType, setNewEventType] = useState('goal');
  const [newEventMinute, setNewEventMinute] = useState('');
  const [newEventPlayer, setNewEventPlayer] = useState('');
  const [newEventDetail, setNewEventDetail] = useState('');

  // Edit rating modal
  const [editRatingPlayer, setEditRatingPlayer] = useState<PlayerNote | null>(null);
  const [editRatingValue, setEditRatingValue] = useState(0);
  const [editRatingNote, setEditRatingNote] = useState('');

  // Match note
  const [matchNote, setMatchNote] = useState('');

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const players = currentTeam?.players || [];
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || id;

  useEffect(() => { loadMatch(); }, [matchId]);

  const loadMatch = async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/matches/${matchId}`, { headers: authHeaders() });
      const data = await res.json();
      setMatch(data);
      setScoreH(String(data.score_home ?? 0));
      setScoreA(String(data.score_away ?? 0));
    } catch {}
    setLoading(false);
  };

  const saveScore = async () => {
    if (!matchId) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/matches/${matchId}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ score_home: parseInt(scoreH) || 0, score_away: parseInt(scoreA) || 0 }),
      });
      await loadMatch();
    } catch {}
    setSaving(false);
    setEditScore(false);
  };

  const addEvent = async () => {
    if (!matchId) return;
    setSaving(true);
    const playerName = newEventPlayer ? getPlayerName(newEventPlayer) : newEventDetail;
    const typeLabel = EVENT_TYPES.find(t => t.key === newEventType)?.label || newEventType;
    const detail = newEventDetail || `${typeLabel}: ${playerName}`;
    try {
      await fetch(`${API_URL}/api/matches/${matchId}/events`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          type: newEventType,
          minute: parseInt(newEventMinute) || 0,
          player_id: newEventPlayer || null,
          detail,
        }),
      });
      await loadMatch();
    } catch {}
    setSaving(false);
    setShowAddEvent(false);
    setNewEventMinute('');
    setNewEventPlayer('');
    setNewEventDetail('');
  };

  const deleteEvent = async (idx: number) => {
    if (!match || !matchId) return;
    setSaving(true);
    const updated = [...(match.events || [])];
    updated.splice(idx, 1);
    try {
      await fetch(`${API_URL}/api/matches/${matchId}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ events: updated }),
      });
      await loadMatch();
    } catch {}
    setSaving(false);
  };

  const savePlayerRating = async () => {
    if (!editRatingPlayer || !matchId) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/matches/${matchId}/notes`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          player_id: editRatingPlayer.player_id,
          player_name: editRatingPlayer.player_name,
          note: editRatingNote,
          rating: editRatingValue,
        }),
      });
      await loadMatch();
    } catch {}
    setSaving(false);
    setEditRatingPlayer(null);
  };

  const updatePlayerNote = async (idx: number, newRating: number, newNote: string) => {
    if (!match || !matchId) return;
    const updated = [...(match.player_notes || [])];
    updated[idx] = { ...updated[idx], rating: newRating, note: newNote };
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/matches/${matchId}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ player_notes: updated }),
      });
      await loadMatch();
    } catch {}
    setSaving(false);
  };

  const deletePlayerNote = async (idx: number) => {
    if (!match || !matchId) return;
    const updated = [...(match.player_notes || [])];
    updated.splice(idx, 1);
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/matches/${matchId}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ player_notes: updated }),
      });
      await loadMatch();
    } catch {}
    setSaving(false);
  };

  const saveMatchNote = async () => {
    if (!matchNote.trim() || !matchId) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/matches/${matchId}/notes`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ player_id: 'match_general', player_name: 'Match Note', note: matchNote.trim(), rating: 0 }),
      });
      setMatchNote('');
      await loadMatch();
    } catch {}
    setSaving(false);
  };

  const evtIcon = (type: string) => EVENT_TYPES.find(t => t.key === type) || { icon: 'circle-small', color: Colors.textMuted };

  if (loading) return <View style={[st.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!match) return <View style={[st.container, { justifyContent: 'center', alignItems: 'center' }]}><Text style={st.empty}>Match not found</Text></View>;

  const matchEvents = (match.events || []).filter(e => e.type !== 'event' && e.type !== 'full_time');
  const generalNotes = (match.player_notes || []).filter(n => n.player_id === 'match_general');
  const playerNotes = (match.player_notes || []).filter(n => n.player_id !== 'match_general');

  return (
    <View style={st.container}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={st.headerCard}>
          <View style={st.headerTop}>
            <View style={[st.statusDot, { backgroundColor: match.status === 'completed' ? Colors.primary : Colors.warning }]} />
            <Text style={[st.statusLabel, { color: match.status === 'completed' ? Colors.primary : Colors.warning }]}>
              {(match.status || 'planned').toUpperCase()}
            </Text>
            <Text style={st.dateText}>{new Date(match.created_at).toLocaleDateString()}</Text>
          </View>
          <Text style={st.opponentName}>vs {match.opponent || 'Unknown'}</Text>
          <View style={st.metaRow}>
            {match.formation && <View style={st.tag}><Text style={st.tagText}>{match.formation}</Text></View>}
            <View style={st.tag}><Text style={st.tagText}>{match.duration_minutes} min</Text></View>
          </View>
        </View>

        {/* Score — editable */}
        <View style={st.scoreCard}>
          <Text style={st.sectionLabel}>SCORE</Text>
          {editScore ? (
            <View style={st.scoreEditRow}>
              <View style={st.scoreInputWrap}>
                <Text style={st.scoreTeamLabel}>HOME</Text>
                <TextInput testID="score-home-input" style={st.scoreInput} value={scoreH} onChangeText={setScoreH} keyboardType="number-pad" />
              </View>
              <Text style={st.scoreDash}>-</Text>
              <View style={st.scoreInputWrap}>
                <Text style={st.scoreTeamLabel}>AWAY</Text>
                <TextInput testID="score-away-input" style={st.scoreInput} value={scoreA} onChangeText={setScoreA} keyboardType="number-pad" />
              </View>
              <TouchableOpacity testID="save-score-btn" style={st.saveBtn} onPress={saveScore}>
                <MaterialCommunityIcons name="check" size={18} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={st.cancelSmBtn} onPress={() => setEditScore(false)}>
                <MaterialCommunityIcons name="close" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity testID="edit-score-btn" style={st.scoreDisplayRow} onPress={() => setEditScore(true)}>
              <Text style={st.scoreBig}>{match.score_home ?? 0} - {match.score_away ?? 0}</Text>
              <MaterialCommunityIcons name="pencil-outline" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Events */}
        <View style={st.eventsCard}>
          <View style={st.sectionHeader}>
            <Text style={st.sectionLabel}>MATCH EVENTS ({matchEvents.length})</Text>
            <TouchableOpacity testID="add-event-btn" style={st.addSmBtn} onPress={() => setShowAddEvent(true)}>
              <MaterialCommunityIcons name="plus" size={14} color={Colors.white} />
              <Text style={st.addSmBtnText}>ADD</Text>
            </TouchableOpacity>
          </View>
          {matchEvents.length === 0 && <Text style={st.emptyHint}>No events recorded</Text>}
          {matchEvents.map((ev, i) => {
            const ei = evtIcon(ev.type);
            return (
              <View key={i} style={st.eventRow}>
                <View style={[st.eventMinBadge, { backgroundColor: (ei.color || Colors.textMuted) + '18' }]}>
                  <Text style={[st.eventMinText, { color: ei.color }]}>{ev.minute}'</Text>
                </View>
                <MaterialCommunityIcons name={(ei.icon || 'circle-small') as any} size={16} color={ei.color} />
                <Text style={st.eventDetail} numberOfLines={2}>{ev.detail || ev.type}</Text>
                <TouchableOpacity testID={`delete-event-${i}`} style={st.delSmBtn} onPress={() => deleteEvent((match.events || []).indexOf(ev))}>
                  <MaterialCommunityIcons name="close" size={14} color={Colors.destructive} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Player Ratings */}
        <View style={st.ratingsCard}>
          <View style={st.sectionHeader}>
            <Text style={st.sectionLabel}>PLAYER RATINGS ({playerNotes.length})</Text>
            <TouchableOpacity testID="add-rating-btn" style={st.addSmBtn} onPress={() => {
              if (players.length > 0) {
                setEditRatingPlayer({ player_id: players[0].id, player_name: players[0].name, note: '', rating: 6, created_at: '' });
                setEditRatingValue(6);
                setEditRatingNote('');
              }
            }}>
              <MaterialCommunityIcons name="plus" size={14} color={Colors.white} />
              <Text style={st.addSmBtnText}>ADD</Text>
            </TouchableOpacity>
          </View>
          {playerNotes.length === 0 && <Text style={st.emptyHint}>No player ratings yet</Text>}
          {playerNotes.map((pn, i) => (
            <View key={i} style={st.ratingRow}>
              <View style={st.ratingLeft}>
                <View style={[st.ratingCircle, { backgroundColor: pn.rating >= 7 ? 'rgba(0,200,83,0.15)' : pn.rating >= 4 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                  <Text style={[st.ratingNum, { color: pn.rating >= 7 ? Colors.primary : pn.rating >= 4 ? '#F59E0B' : Colors.destructive }]}>{pn.rating}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.ratingName}>{pn.player_name}</Text>
                  {pn.note ? <Text style={st.ratingNote} numberOfLines={2}>{pn.note}</Text> : null}
                </View>
              </View>
              <TouchableOpacity testID={`edit-rating-${i}`} style={st.editSmBtn} onPress={() => {
                setEditRatingPlayer(pn);
                setEditRatingValue(pn.rating);
                setEditRatingNote(pn.note);
              }}>
                <MaterialCommunityIcons name="pencil-outline" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity testID={`delete-rating-${i}`} style={st.delSmBtn} onPress={() => deletePlayerNote((match.player_notes || []).indexOf(pn))}>
                <MaterialCommunityIcons name="close" size={14} color={Colors.destructive} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Match Notes */}
        <View style={st.notesCard}>
          <Text style={st.sectionLabel}>MATCH NOTES</Text>
          <View style={st.noteInputRow}>
            <TextInput testID="match-note-input" style={st.noteInput} value={matchNote} onChangeText={setMatchNote} placeholder="Add a note..." placeholderTextColor={Colors.textMuted} multiline />
            <TouchableOpacity testID="save-note-btn" style={[st.saveBtn, !matchNote.trim() && { opacity: 0.3 }]} onPress={saveMatchNote} disabled={!matchNote.trim()}>
              <MaterialCommunityIcons name="plus" size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
          {generalNotes.map((n, i) => (
            <View key={i} style={st.noteCard}>
              <Text style={st.noteText}>{n.note}</Text>
              <Text style={st.noteDate}>{new Date(n.created_at).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={showAddEvent} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHead}>
              <Text style={st.modalTitle}>Add Event</Text>
              <TouchableOpacity onPress={() => setShowAddEvent(false)}><MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} /></TouchableOpacity>
            </View>
            <Text style={st.fieldLabel}>TYPE</Text>
            <View style={st.typeRow}>
              {EVENT_TYPES.map(t => (
                <TouchableOpacity key={t.key} testID={`evt-type-${t.key}`} style={[st.typeBtn, newEventType === t.key && { borderColor: t.color, backgroundColor: t.color + '15' }]} onPress={() => setNewEventType(t.key)}>
                  <MaterialCommunityIcons name={t.icon as any} size={16} color={newEventType === t.key ? t.color : Colors.textMuted} />
                  <Text style={[st.typeBtnText, newEventType === t.key && { color: t.color }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={st.fieldLabel}>MINUTE</Text>
            <TextInput testID="event-minute-input" style={st.input} value={newEventMinute} onChangeText={setNewEventMinute} placeholder="e.g. 23" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />
            <Text style={st.fieldLabel}>PLAYER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {players.map(p => (
                <TouchableOpacity key={p.id} style={[st.playerChip, newEventPlayer === p.id && st.playerChipActive]} onPress={() => setNewEventPlayer(p.id)}>
                  <Text style={[st.playerChipText, newEventPlayer === p.id && { color: Colors.primary }]}>{p.number} {p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={st.fieldLabel}>DETAIL (optional)</Text>
            <TextInput testID="event-detail-input" style={st.input} value={newEventDetail} onChangeText={setNewEventDetail} placeholder="e.g. Header from corner" placeholderTextColor={Colors.textMuted} />
            <TouchableOpacity testID="confirm-add-event" style={st.confirmBtn} onPress={addEvent}>
              <Text style={st.confirmBtnText}>{saving ? 'SAVING...' : 'ADD EVENT'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Rating Modal */}
      <Modal visible={editRatingPlayer !== null} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHead}>
              <Text style={st.modalTitle}>Player Rating</Text>
              <TouchableOpacity onPress={() => setEditRatingPlayer(null)}><MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} /></TouchableOpacity>
            </View>
            <Text style={st.fieldLabel}>PLAYER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {players.map(p => (
                <TouchableOpacity key={p.id} style={[st.playerChip, editRatingPlayer?.player_id === p.id && st.playerChipActive]} onPress={() => setEditRatingPlayer(prev => prev ? { ...prev, player_id: p.id, player_name: p.name } : null)}>
                  <Text style={[st.playerChipText, editRatingPlayer?.player_id === p.id && { color: Colors.primary }]}>{p.number} {p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={st.fieldLabel}>RATING</Text>
            <View style={st.ratingSlider}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
                <TouchableOpacity key={r} testID={`rating-${r}`} style={[st.ratingDot, editRatingValue === r && { backgroundColor: r >= 7 ? Colors.primary : r >= 4 ? '#F59E0B' : Colors.destructive, borderColor: 'transparent' }]} onPress={() => setEditRatingValue(r)}>
                  <Text style={[st.ratingDotText, editRatingValue === r && { color: Colors.white }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={st.fieldLabel}>NOTE</Text>
            <TextInput style={[st.input, { height: 60 }]} value={editRatingNote} onChangeText={setEditRatingNote} placeholder="Performance notes..." placeholderTextColor={Colors.textMuted} multiline />
            <TouchableOpacity testID="save-rating-btn" style={st.confirmBtn} onPress={savePlayerRating}>
              <Text style={st.confirmBtnText}>{saving ? 'SAVING...' : 'SAVE RATING'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 14, paddingBottom: 40 },
  empty: { fontSize: 14, color: Colors.textMuted },

  // Header
  headerCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  dateText: { fontSize: 11, color: Colors.textMuted, marginLeft: 'auto' },
  opponentName: { fontSize: 20, fontWeight: '800', color: Colors.white, marginBottom: 6 },
  metaRow: { flexDirection: 'row', gap: 6 },
  tag: { backgroundColor: 'rgba(0,200,83,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 11, fontWeight: '600', color: Colors.primary },

  // Score
  scoreCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  scoreDisplayRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreBig: { fontSize: 28, fontWeight: '900', color: Colors.white, letterSpacing: 4 },
  scoreEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreInputWrap: { alignItems: 'center' },
  scoreTeamLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginBottom: 3 },
  scoreInput: { width: 54, height: 44, backgroundColor: Colors.card, borderRadius: 8, textAlign: 'center', color: Colors.white, fontSize: 22, fontWeight: '900', borderWidth: 1, borderColor: Colors.border },
  scoreDash: { fontSize: 22, fontWeight: '900', color: Colors.textMuted },

  // Section
  sectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  emptyHint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },

  // Events
  eventsCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border + '30' },
  eventMinBadge: { width: 36, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  eventMinText: { fontSize: 11, fontWeight: '800' },
  eventDetail: { flex: 1, fontSize: 12, color: Colors.textSecondary },

  // Ratings
  ratingsCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border + '30' },
  ratingLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  ratingNum: { fontSize: 14, fontWeight: '900' },
  ratingName: { fontSize: 13, fontWeight: '700', color: Colors.white },
  ratingNote: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  // Notes
  notesCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  noteInputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  noteInput: { flex: 1, height: 40, backgroundColor: Colors.card, borderRadius: 8, paddingHorizontal: 10, color: Colors.white, fontSize: 13, borderWidth: 1, borderColor: Colors.border },
  noteCard: { backgroundColor: Colors.card, borderRadius: 8, padding: 10, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  noteText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  noteDate: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },

  // Buttons
  addSmBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  addSmBtnText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  saveBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  cancelSmBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  editSmBtn: { padding: 6 },
  delSmBtn: { padding: 6 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.backgroundSecondary, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 36, maxHeight: '85%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.white },
  fieldLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 5, marginTop: 6 },
  input: { height: 42, backgroundColor: Colors.card, borderRadius: 8, paddingHorizontal: 12, color: Colors.white, fontSize: 13, borderWidth: 1, borderColor: Colors.border, marginBottom: 6 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  typeBtnText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  playerChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginRight: 5, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  playerChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.1)' },
  playerChipText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  ratingSlider: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  ratingDot: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  ratingDotText: { fontSize: 12, fontWeight: '800', color: Colors.textMuted },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, height: 42, borderRadius: 8, marginTop: 8 },
  confirmBtnText: { fontSize: 12, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
});
