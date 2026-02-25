import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';
import { getFlagForCode } from '../src/constants/countries';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface CalendarEvent {
  id: string;
  type: 'friendly' | 'match';
  date: string;
  time: string;
  opponent: string;
  opponent_country: string;
  home_away: string;
  pitch_name: string;
  pitch_address: string;
  manager_name: string;
  manager_phone: string;
  status: string;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { currentTeam, token } = useApp();
  const activeTeamId = teamId || currentTeam?.id;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  useEffect(() => { if (activeTeamId) fetchCalendar(); }, [activeTeamId]);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/teams/${activeTeamId}/calendar`, { headers: authHeaders() });
      if (res.ok) setEvents(await res.json());
    } catch {}
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Date not set';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]}`;
    } catch { return dateStr; }
  };

  const getDaysUntil = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      const target = new Date(dateStr);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      target.setHours(0, 0, 0, 0);
      const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      if (diff < 0) return null;
      return `In ${diff} days`;
    } catch { return null; }
  };

  // Group events by month
  const grouped: Record<string, CalendarEvent[]> = {};
  events.forEach(e => {
    const key = e.date ? e.date.substring(0, 7) : 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  const monthLabel = (key: string) => {
    if (key === 'unknown') return 'No date';
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const [y, m] = key.split('-');
    return `${months[parseInt(m) - 1] || m} ${y}`;
  };

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>Match Calendar</Text>
          <Text style={st.headerSub}>{currentTeam?.name || 'Team'}</Text>
        </View>
        <TouchableOpacity testID="refresh-calendar" onPress={fetchCalendar} style={st.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />}

        {!loading && events.length === 0 && (
          <View style={st.emptyBox}>
            <MaterialCommunityIcons name="calendar-blank" size={48} color={Colors.textMuted} />
            <Text style={st.emptyTitle}>No upcoming matches</Text>
            <Text style={st.emptyHint}>Accepted friendly matches and scheduled games will appear here</Text>
          </View>
        )}

        {!loading && Object.keys(grouped).sort().map(monthKey => (
          <View key={monthKey}>
            <Text style={st.monthLabel}>{monthLabel(monthKey)}</Text>
            {grouped[monthKey].map(ev => {
              const daysUntil = getDaysUntil(ev.date);
              return (
                <View key={ev.id} testID={`cal-event-${ev.id}`} style={st.eventCard}>
                  {/* Date column */}
                  <View style={st.dateCol}>
                    <Text style={st.dateDay}>{ev.date ? new Date(ev.date).getDate() : '?'}</Text>
                    <Text style={st.dateDow}>{formatDate(ev.date).split(' ')[0]}</Text>
                  </View>

                  {/* Vertical line */}
                  <View style={st.vline}>
                    <View style={[st.dot, { backgroundColor: ev.type === 'friendly' ? '#10B981' : '#3B82F6' }]} />
                  </View>

                  {/* Content */}
                  <View style={[st.eventContent, ev.status === 'cancelled' && st.eventCancelled]}>
                    <View style={st.eventTop}>
                      <View style={[st.typeBadge, ev.status === 'cancelled'
                        ? { backgroundColor: 'rgba(239,68,68,0.12)' }
                        : { backgroundColor: ev.type === 'friendly' ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)' }
                      ]}>
                        <Text style={[st.typeText, ev.status === 'cancelled'
                          ? { color: '#EF4444' }
                          : { color: ev.type === 'friendly' ? '#10B981' : '#3B82F6' }
                        ]}>
                          {ev.status === 'cancelled' ? 'Cancelled' : ev.type === 'friendly' ? 'Friendly' : 'Match'}
                        </Text>
                      </View>
                      {ev.status !== 'cancelled' && daysUntil ? <Text style={st.countdown}>{daysUntil}</Text> : null}
                    </View>

                    <View style={st.opponentRow}>
                      {ev.opponent_country ? <Text style={{ fontSize: 16 }}>{getFlagForCode(ev.opponent_country)}</Text> : null}
                      <Text style={[st.opponentName, ev.status === 'cancelled' && st.cancelledText]}>{ev.opponent}</Text>
                    </View>

                    <View style={st.detailRow}>
                      {ev.time ? (
                        <View style={st.detailChip}>
                          <MaterialCommunityIcons name="clock-outline" size={11} color={Colors.textMuted} />
                          <Text style={st.detailText}>{ev.time}</Text>
                        </View>
                      ) : null}
                      {ev.home_away ? (
                        <View style={st.detailChip}>
                          <MaterialCommunityIcons name={ev.home_away === 'home' ? 'home' : 'bus'} size={11} color={Colors.textMuted} />
                          <Text style={st.detailText}>{ev.home_away === 'home' ? 'Home' : 'Away'}</Text>
                        </View>
                      ) : null}
                    </View>

                    {ev.pitch_name ? (
                      <View style={st.pitchRow}>
                        <MaterialCommunityIcons name="map-marker" size={11} color={Colors.textMuted} />
                        <Text style={st.pitchText}>{ev.pitch_name}{ev.pitch_address ? `, ${ev.pitch_address}` : ''}</Text>
                      </View>
                    ) : null}

                    {ev.manager_name ? (
                      <View style={st.managerRow}>
                        <MaterialCommunityIcons name="account" size={11} color={Colors.textMuted} />
                        <Text style={st.managerText}>{ev.manager_name}{ev.manager_phone ? ` · ${ev.manager_phone}` : ''}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  refreshBtn: { padding: 6, borderRadius: 6, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  scroll: { padding: 14, paddingBottom: 40 },
  // Empty state
  emptyBox: { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textMuted },
  emptyHint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', maxWidth: 260 },
  // Month header
  monthLabel: { fontSize: 13, fontWeight: '800', color: Colors.white, letterSpacing: 1, marginTop: 16, marginBottom: 10 },
  // Event card
  eventCard: { flexDirection: 'row', marginBottom: 4, minHeight: 80 },
  dateCol: { width: 42, alignItems: 'center', paddingTop: 4 },
  dateDay: { fontSize: 22, fontWeight: '900', color: Colors.white },
  dateDow: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  vline: { width: 20, alignItems: 'center', paddingTop: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
  // Content
  eventContent: { flex: 1, backgroundColor: Colors.backgroundSecondary, borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  eventCancelled: { opacity: 0.55, borderColor: 'rgba(239,68,68,0.2)' },
  eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeText: { fontSize: 9, fontWeight: '700' },
  countdown: { fontSize: 10, fontWeight: '600', color: Colors.primary },
  opponentRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  opponentName: { fontSize: 15, fontWeight: '700', color: Colors.white },
  cancelledText: { textDecorationLine: 'line-through', color: Colors.textMuted },
  detailRow: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  detailText: { fontSize: 10, color: Colors.textMuted },
  pitchRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  pitchText: { fontSize: 10, color: Colors.textMuted, flex: 1 },
  managerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  managerText: { fontSize: 10, color: Colors.textMuted },
});
