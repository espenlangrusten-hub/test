import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';
import BottomNav from '../src/components/BottomNav';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Drill {
  name: string;
  duration: string;
  description: string;
  setup: string;
  coaching_points: string[];
}

interface Session {
  title: string;
  duration: string;
  focus: string;
  description: string;
  drills: Drill[];
}

type Category = 'general' | 'defensive' | 'attacking';

export default function TrainingPage() {
  const router = useRouter();
  const { currentTeam, token } = useApp();
  const [category, setCategory] = useState<Category>('general');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const fetchSessions = async (cat: Category) => {
    if (!currentTeam?.id) return;
    setLoading(true);
    setError('');
    setSessions([]);
    setExpandedIdx(null);
    try {
      const res = await fetch(`${API_URL}/api/teams/${currentTeam.id}/training-suggestions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ category: cat }),
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (e: any) {
      setError(e.message || 'Failed to generate sessions');
    }
    setLoading(false);
  };

  useEffect(() => { fetchSessions(category); }, []);

  const switchCategory = (cat: Category) => {
    setCategory(cat);
    fetchSessions(cat);
  };

  const catColors: Record<Category, string> = {
    general: '#3B82F6',
    defensive: '#F59E0B',
    attacking: '#EF4444',
  };

  return (
    <View style={st.container}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={st.headerRow}>
          <View style={st.iconWrap}>
            <MaterialCommunityIcons name="whistle" size={28} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.title}>AI Training Sessions</Text>
            <Text style={st.subtitle}>{currentTeam?.name} · {currentTeam?.format} · {currentTeam?.age_group || 'Youth'}</Text>
          </View>
        </View>

        {/* Category selector */}
        <View style={st.catRow}>
          {(['general', 'defensive', 'attacking'] as Category[]).map(cat => (
            <TouchableOpacity
              key={cat}
              testID={`cat-${cat}`}
              style={[st.catBtn, category === cat && { borderColor: catColors[cat], backgroundColor: catColors[cat] + '15' }]}
              onPress={() => switchCategory(cat)}
            >
              <MaterialCommunityIcons
                name={cat === 'general' ? 'soccer' : cat === 'defensive' ? 'shield-outline' : 'soccer-field'}
                size={16}
                color={category === cat ? catColors[cat] : Colors.textMuted}
              />
              <Text style={[st.catText, category === cat && { color: catColors[cat] }]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && (
          <View style={st.loadingWrap}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={st.loadingText}>Generating sessions with AI...</Text>
            <Text style={st.loadingHint}>This may take a few seconds</Text>
          </View>
        )}

        {error ? (
          <View style={st.errorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Colors.destructive} />
            <Text style={st.errorText}>{error}</Text>
            <TouchableOpacity testID="retry-btn" style={st.retryBtn} onPress={() => fetchSessions(category)}>
              <Text style={st.retryText}>RETRY</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && sessions.map((session, idx) => (
          <View key={idx} style={st.sessionCard}>
            <TouchableOpacity
              testID={`session-${idx}`}
              style={st.sessionHeader}
              onPress={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              activeOpacity={0.7}
            >
              <View style={[st.sessionNum, { backgroundColor: catColors[category] + '20' }]}>
                <Text style={[st.sessionNumText, { color: catColors[category] }]}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.sessionTitle}>{session.title}</Text>
                <View style={st.sessionMeta}>
                  {session.duration && <View style={st.metaTag}><Text style={st.metaText}>{session.duration}</Text></View>}
                  {session.focus && <Text style={st.focusText} numberOfLines={1}>{session.focus}</Text>}
                </View>
              </View>
              <MaterialCommunityIcons
                name={expandedIdx === idx ? 'chevron-up' : 'chevron-down'}
                size={20} color={Colors.textMuted}
              />
            </TouchableOpacity>

            {expandedIdx === idx && (
              <View style={st.sessionBody}>
                {session.description ? <Text style={st.descText}>{session.description}</Text> : null}

                {(session.drills || []).map((drill, di) => (
                  <View key={di} style={st.drillCard}>
                    <View style={st.drillHead}>
                      <View style={st.drillBullet}><Text style={st.drillBulletText}>{di + 1}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.drillName}>{drill.name}</Text>
                        {drill.duration && <Text style={st.drillDur}>{drill.duration}</Text>}
                      </View>
                    </View>
                    {drill.description && <Text style={st.drillDesc}>{drill.description}</Text>}
                    {drill.setup && (
                      <View style={st.setupWrap}>
                        <Text style={st.setupLabel}>Setup:</Text>
                        <Text style={st.setupText}>{drill.setup}</Text>
                      </View>
                    )}
                    {(drill.coaching_points || []).length > 0 && (
                      <View style={st.pointsWrap}>
                        <Text style={st.pointsLabel}>Key Points:</Text>
                        {drill.coaching_points.map((pt, pi) => (
                          <View key={pi} style={st.pointRow}>
                            <View style={st.pointDot} />
                            <Text style={st.pointText}>{pt}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {!loading && sessions.length === 0 && !error && (
          <View style={st.emptyWrap}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={36} color={Colors.textMuted} />
            <Text style={st.emptyText}>No sessions generated yet.</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 14, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.12)', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  catRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  catBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border },
  catText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },

  loadingWrap: { alignItems: 'center', paddingVertical: 48 },
  loadingText: { fontSize: 14, color: Colors.textSecondary, marginTop: 12, fontWeight: '600' },
  loadingHint: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', marginBottom: 12, flexWrap: 'wrap' },
  errorText: { fontSize: 12, color: Colors.destructive, flex: 1 },
  retryBtn: { backgroundColor: Colors.destructive, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  retryText: { fontSize: 11, fontWeight: '700', color: Colors.white },

  sessionCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 8, overflow: 'hidden' },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  sessionNum: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sessionNumText: { fontSize: 14, fontWeight: '900' },
  sessionTitle: { fontSize: 14, fontWeight: '700', color: Colors.white },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaTag: { backgroundColor: Colors.card, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  metaText: { fontSize: 10, fontWeight: '600', color: Colors.textMuted },
  focusText: { fontSize: 10, color: Colors.textMuted, flex: 1 },

  sessionBody: { paddingHorizontal: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  descText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18, marginTop: 10, marginBottom: 8 },

  drillCard: { backgroundColor: Colors.card, borderRadius: 8, padding: 10, marginTop: 6, borderWidth: 1, borderColor: Colors.border },
  drillHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  drillBullet: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(139,92,246,0.15)', justifyContent: 'center', alignItems: 'center' },
  drillBulletText: { fontSize: 10, fontWeight: '800', color: '#8B5CF6' },
  drillName: { fontSize: 13, fontWeight: '700', color: Colors.white },
  drillDur: { fontSize: 10, color: Colors.textMuted },
  drillDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginTop: 6 },

  setupWrap: { marginTop: 6, backgroundColor: 'rgba(59,130,246,0.06)', borderRadius: 6, padding: 8 },
  setupLabel: { fontSize: 9, fontWeight: '700', color: '#3B82F6', letterSpacing: 1, marginBottom: 2 },
  setupText: { fontSize: 11, color: Colors.textSecondary, lineHeight: 16 },

  pointsWrap: { marginTop: 6 },
  pointsLabel: { fontSize: 9, fontWeight: '700', color: Colors.primary, letterSpacing: 1, marginBottom: 4 },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 2 },
  pointDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, marginTop: 5 },
  pointText: { fontSize: 11, color: Colors.textSecondary, flex: 1, lineHeight: 16 },

  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 13, color: Colors.textMuted },
});
