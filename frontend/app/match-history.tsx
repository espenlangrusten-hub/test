import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface MatchItem {
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
  player_notes: any[];
}

export default function MatchHistoryScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId?: string }>();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [])
  );

  const loadMatches = async () => {
    setLoading(true);
    try {
      const query = teamId ? `?team_id=${teamId}` : '';
      const res = await fetch(`${API_URL}/api/matches${query}`);
      const data = await res.json();
      setMatches(Array.isArray(data) ? data : []);
    } catch {
      setMatches([]);
    }
    setLoading(false);
  };

  const deleteMatch = (id: string) => {
    Alert.alert('Delete Match', 'Remove this match from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/api/matches/${id}`, { method: 'DELETE' });
            setMatches(prev => prev.filter(m => m.id !== id));
          } catch {}
        },
      },
    ]);
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return Colors.primary;
    if (status === 'live') return Colors.warning;
    return Colors.textMuted;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="history" size={32} color={Colors.primary} />
          <Text style={styles.title}>Match History</Text>
        </View>

        {loading && (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        )}

        {!loading && matches.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No matches played yet</Text>
            <Text style={styles.emptySubtext}>Start a match to see it here</Text>
          </View>
        )}

        {matches.map((match) => (
          <TouchableOpacity
            key={match.id}
            testID={`match-${match.id}`}
            style={styles.matchCard}
            onLongPress={() => deleteMatch(match.id)}
            activeOpacity={0.8}
          >
            <View style={styles.matchTop}>
              <View style={[styles.statusDot, { backgroundColor: statusColor(match.status) }]} />
              <Text style={[styles.statusText, { color: statusColor(match.status) }]}>
                {(match.status || 'planned').toUpperCase()}
              </Text>
              <Text style={styles.matchDate}>
                {new Date(match.created_at).toLocaleDateString()}
              </Text>
            </View>

            <Text style={styles.opponentName}>
              {match.opponent || 'Unknown Opponent'}
            </Text>

            <View style={styles.matchMeta}>
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
            </View>

            <View style={styles.matchStats}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="account" size={14} color={Colors.textMuted} />
                <Text style={styles.statText}>
                  {match.starters?.length || 0} starters
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="swap-horizontal" size={14} color={Colors.textMuted} />
                <Text style={styles.statText}>
                  {match.subs?.length || 0} subs
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="note-text" size={14} color={Colors.textMuted} />
                <Text style={styles.statText}>
                  {match.player_notes?.length || 0} notes
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, marginTop: 8 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.white },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: Colors.textMuted, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  matchCard: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 12,
    padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  matchTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  matchDate: { fontSize: 11, color: Colors.textMuted, marginLeft: 'auto' },
  opponentName: { fontSize: 18, fontWeight: '700', color: Colors.white, marginBottom: 8 },
  matchMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  metaBadge: {
    backgroundColor: 'rgba(0,200,83,0.1)', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 4,
  },
  metaText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  matchStats: { flexDirection: 'row', gap: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: Colors.textMuted },
});
