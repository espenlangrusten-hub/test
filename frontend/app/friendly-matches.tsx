import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Modal, Alert, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';
import { getFlagForCode } from '../src/constants/countries';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface InviteData {
  id: string;
  from_team_id: string; from_team_name: string; from_team_code: string;
  from_manager_name: string; from_manager_phone: string;
  from_gender: string; from_age_group: string; from_country: string;
  to_team_id: string; to_team_name: string; to_team_code: string;
  to_manager_name: string; to_manager_phone: string;
  proposed_dates: { date: string; time_slots: string[] }[];
  home_away: string; pitch_name: string; pitch_address: string;
  status: string; accepted_date: string; accepted_time: string;
  from_user_id: string; to_user_id: string;
  created_at: string;
}

export default function FriendlyMatchesScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { currentTeam, token } = useApp();
  const activeTeamId = teamId || currentTeam?.id;

  const [invites, setInvites] = useState<InviteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [opponentCode, setOpponentCode] = useState('');
  const [homeAway, setHomeAway] = useState('home');
  const [pitchName, setPitchName] = useState('');
  const [pitchAddress, setPitchAddress] = useState('');
  const [dates, setDates] = useState<{ date: string; time_slots: string[] }[]>([]);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [sending, setSending] = useState(false);

  // Response modal
  const [respondInvite, setRespondInvite] = useState<InviteData | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  useEffect(() => { if (activeTeamId) fetchInvites(); }, [activeTeamId]);

  const fetchInvites = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/friendly-invites?team_id=${activeTeamId}`, { headers: authHeaders() });
      if (res.ok) setInvites(await res.json());
    } catch {}
    setLoading(false);
  };

  const addDateSlot = () => {
    if (!newDate) return;
    const existing = dates.find(d => d.date === newDate);
    if (existing && newTime) {
      setDates(prev => prev.map(d => d.date === newDate
        ? { ...d, time_slots: [...d.time_slots, newTime] }
        : d
      ));
    } else if (!existing) {
      setDates(prev => [...prev, { date: newDate, time_slots: newTime ? [newTime] : [] }]);
    }
    setNewTime('');
  };

  const removeDateSlot = (date: string, timeIdx?: number) => {
    if (timeIdx !== undefined) {
      setDates(prev => prev.map(d => d.date === date
        ? { ...d, time_slots: d.time_slots.filter((_, i) => i !== timeIdx) }
        : d
      ));
    } else {
      setDates(prev => prev.filter(d => d.date !== date));
    }
  };

  const sendInvite = async () => {
    if (!opponentCode.trim()) return Alert.alert('Error', 'Enter opponent team code');
    if (dates.length === 0) return Alert.alert('Error', 'Add at least one date');
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/friendly-invites`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          from_team_id: activeTeamId,
          to_team_code: opponentCode.trim().toUpperCase(),
          proposed_dates: dates,
          home_away: homeAway,
          pitch_name: pitchName,
          pitch_address: pitchAddress,
        }),
      });
      if (res.ok) {
        setShowInvite(false);
        resetForm();
        fetchInvites();
      } else {
        const err = await res.json().catch(() => ({ detail: 'Error' }));
        Alert.alert('Error', err.detail || 'Could not send invite');
      }
    } catch { Alert.alert('Error', 'Network error'); }
    setSending(false);
  };

  const resetForm = () => {
    setOpponentCode(''); setHomeAway('home'); setPitchName(''); setPitchAddress('');
    setDates([]); setNewDate(''); setNewTime('');
  };

  const respondToInvite = async (status: 'accepted' | 'declined') => {
    if (!respondInvite) return;
    if (status === 'accepted' && !selectedDate) return Alert.alert('Error', 'Select a date');
    try {
      const res = await fetch(`${API_URL}/api/friendly-invites/${respondInvite.id}/respond`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({
          status,
          accepted_date: selectedDate,
          accepted_time: selectedTime,
        }),
      });
      if (res.ok) {
        setRespondInvite(null);
        fetchInvites();
      }
    } catch { Alert.alert('Error', 'Network error'); }
  };

  const isSent = (inv: InviteData) => inv.from_team_id === activeTeamId;
  const accepted = invites.filter(i => i.status === 'accepted');
  const pending = invites.filter(i => i.status === 'pending');

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Friendly Matches</Text>
        <TouchableOpacity testID="new-invite-btn" style={st.newBtn} onPress={() => setShowInvite(true)}>
          <MaterialCommunityIcons name="plus" size={14} color={Colors.white} />
          <Text style={st.newBtnText}>INVITER</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Accepted / Upcoming */}
        {accepted.length > 0 && (
          <>
            <Text style={st.section}>UPCOMING MATCHES</Text>
            {accepted.map(inv => (
              <View key={inv.id} testID={`accepted-${inv.id}`} style={st.matchCard}>
                <View style={st.matchTop}>
                  {inv.from_country ? <Text style={{ fontSize: 14 }}>{getFlagForCode(isSent(inv) ? '' : inv.from_country)}</Text> : null}
                  <Text style={st.matchTeam}>{isSent(inv) ? inv.to_team_name : inv.from_team_name}</Text>
                  <View style={[st.statusTag, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                    <Text style={[st.statusText, { color: '#10B981' }]}>Accepted</Text>
                  </View>
                </View>
                <Text style={st.matchInfo}>{inv.accepted_date} {inv.accepted_time ? `kl. ${inv.accepted_time}` : ''}</Text>
                <Text style={st.matchInfo}>{inv.home_away === 'home' ? 'Home' : 'Away'}{inv.pitch_name ? ` · ${inv.pitch_name}` : ''}</Text>
                {inv.pitch_address ? <Text style={st.matchAddr}>{inv.pitch_address}</Text> : null}
                <View style={st.managerRow}>
                  <MaterialCommunityIcons name="account" size={12} color={Colors.textMuted} />
                  <Text style={st.managerText}>{isSent(inv) ? inv.to_manager_name : inv.from_manager_name} {isSent(inv) ? inv.to_manager_phone : inv.from_manager_phone}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <>
            <Text style={st.section}>PENDING INVITATIONS</Text>
            {pending.map(inv => (
              <TouchableOpacity key={inv.id} testID={`pending-${inv.id}`} style={st.inviteCard}
                onPress={() => !isSent(inv) ? setRespondInvite(inv) : null}
                activeOpacity={isSent(inv) ? 1 : 0.7}
              >
                <View style={st.matchTop}>
                  <Text style={st.matchTeam}>{isSent(inv) ? `Til: ${inv.to_team_name}` : `Fra: ${inv.from_team_name}`}</Text>
                  <View style={[st.statusTag, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                    <Text style={[st.statusText, { color: '#F59E0B' }]}>{isSent(inv) ? 'Sent' : 'Received'}</Text>
                  </View>
                </View>
                <Text style={st.matchInfo}>{inv.proposed_dates.length} date proposals · {inv.home_away === 'home' ? 'Home' : 'Away'}</Text>
                {inv.pitch_name ? <Text style={st.matchAddr}>{inv.pitch_name}</Text> : null}
                {!isSent(inv) && (
                  <View style={st.managerRow}>
                    <MaterialCommunityIcons name="account" size={12} color={Colors.textMuted} />
                    <Text style={st.managerText}>{inv.from_manager_name} {inv.from_manager_phone}</Text>
                  </View>
                )}
                {!isSent(inv) && <Text style={st.tapHint}>Tap to respond</Text>}
              </TouchableOpacity>
            ))}
          </>
        )}

        {invites.length === 0 && !loading && (
          <View style={st.emptyBox}>
            <MaterialCommunityIcons name="handshake" size={40} color={Colors.textMuted} />
            <Text style={st.emptyText}>No friendly matches yet</Text>
            <Text style={st.emptyHint}>Tap INVITE to send a match challenge</Text>
          </View>
        )}
      </ScrollView>

      {/* New Invite Modal */}
      <Modal visible={showInvite} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <ScrollView contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }}>
            <View style={st.modalContent}>
              <View style={st.modalHead}>
                <Text style={st.modalTitle}>Send Invitation</Text>
                <TouchableOpacity onPress={() => { setShowInvite(false); resetForm(); }}>
                  <MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={st.fieldLabel}>OPPONENT TEAM CODE</Text>
              <TextInput testID="opponent-code-input" style={st.codeInput} value={opponentCode} onChangeText={setOpponentCode} placeholder="E.g. ABC123" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" />

              <Text style={st.fieldLabel}>HOME / AWAY</Text>
              <View style={st.toggleRow}>
                <TouchableOpacity testID="home-toggle" style={[st.toggleBtn, homeAway === 'home' && st.toggleActive]} onPress={() => setHomeAway('home')}>
                  <Text style={[st.toggleText, homeAway === 'home' && st.toggleTextActive]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="away-toggle" style={[st.toggleBtn, homeAway === 'away' && st.toggleActive]} onPress={() => setHomeAway('away')}>
                  <Text style={[st.toggleText, homeAway === 'away' && st.toggleTextActive]}>Away</Text>
                </TouchableOpacity>
              </View>

              <Text style={st.fieldLabel}>PITCH / VENUE</Text>
              <TextInput testID="pitch-name-input" style={st.input} value={pitchName} onChangeText={setPitchName} placeholder="Pitch name" placeholderTextColor={Colors.textMuted} />
              <TextInput testID="pitch-address-input" style={st.input} value={pitchAddress} onChangeText={setPitchAddress} placeholder="Address" placeholderTextColor={Colors.textMuted} />

              <Text style={st.fieldLabel}>PROPOSED DATES</Text>
              <View style={st.dateRow}>
                <TextInput testID="date-input" style={[st.input, { flex: 1 }]} value={newDate} onChangeText={setNewDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />
                <TextInput testID="time-input" style={[st.input, { width: 80 }]} value={newTime} onChangeText={setNewTime} placeholder="HH:MM" placeholderTextColor={Colors.textMuted} />
                <TouchableOpacity testID="add-date-btn" style={st.addDateBtn} onPress={addDateSlot}>
                  <MaterialCommunityIcons name="plus" size={16} color={Colors.white} />
                </TouchableOpacity>
              </View>

              {dates.map((d, idx) => (
                <View key={idx} style={st.dateChip}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.dateText}>{d.date}</Text>
                    {d.time_slots.length > 0 && (
                      <View style={st.timeRow}>
                        {d.time_slots.map((t, ti) => (
                          <TouchableOpacity key={ti} style={st.timeChip} onPress={() => removeDateSlot(d.date, ti)}>
                            <Text style={st.timeText}>{t}</Text>
                            <MaterialCommunityIcons name="close" size={10} color={Colors.textMuted} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => removeDateSlot(d.date)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={14} color={Colors.destructive} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity testID="send-invite-btn" style={[st.sendBtn, sending && { opacity: 0.5 }]} onPress={sendInvite} disabled={sending}>
                <MaterialCommunityIcons name="send" size={16} color={Colors.white} />
                <Text style={st.sendBtnText}>{sending ? 'SENDING...' : 'SEND INVITATION'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Respond Modal */}
      <Modal visible={respondInvite !== null} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHead}>
              <Text style={st.modalTitle}>Respond to Invitation</Text>
              <TouchableOpacity onPress={() => setRespondInvite(null)}><MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} /></TouchableOpacity>
            </View>
            {respondInvite && (
              <>
                <Text style={st.respTeam}>Fra: {respondInvite.from_team_name}</Text>
                <View style={st.managerRow}>
                  <MaterialCommunityIcons name="account" size={12} color={Colors.textMuted} />
                  <Text style={st.managerText}>{respondInvite.from_manager_name} {respondInvite.from_manager_phone}</Text>
                </View>
                <Text style={st.respInfo}>{respondInvite.home_away === 'home' ? 'Home' : 'Away'}{respondInvite.pitch_name ? ` · ${respondInvite.pitch_name}` : ''}</Text>
                {respondInvite.pitch_address ? <Text style={st.respAddr}>{respondInvite.pitch_address}</Text> : null}

                <Text style={st.fieldLabel}>SELECT DATE</Text>
                {respondInvite.proposed_dates.map((d, idx) => (
                  <TouchableOpacity key={idx} testID={`select-date-${idx}`}
                    style={[st.dateOption, selectedDate === d.date && st.dateOptionActive]}
                    onPress={() => { setSelectedDate(d.date); setSelectedTime(d.time_slots[0] || ''); }}
                  >
                    <Text style={[st.dateOptText, selectedDate === d.date && { color: Colors.primary }]}>{d.date}</Text>
                    {d.time_slots.length > 0 && (
                      <View style={st.timeRow}>
                        {d.time_slots.map((t, ti) => (
                          <TouchableOpacity key={ti}
                            style={[st.timeOptChip, selectedDate === d.date && selectedTime === t && st.timeOptActive]}
                            onPress={() => { setSelectedDate(d.date); setSelectedTime(t); }}
                          >
                            <Text style={st.timeOptText}>{t}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

                <View style={st.respActions}>
                  <TouchableOpacity testID="accept-invite-btn" style={st.acceptBtn} onPress={() => respondToInvite('accepted')}>
                    <Text style={st.acceptBtnText}>ACCEPT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID="decline-invite-btn" style={st.declineBtn} onPress={() => respondToInvite('declined')}>
                    <Text style={st.declineBtnText}>DECLINE</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.white, flex: 1 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  newBtnText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  scroll: { padding: 14, paddingBottom: 40 },
  section: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2, marginBottom: 8, marginTop: 12 },
  // Match cards
  matchCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  matchTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  matchTeam: { fontSize: 14, fontWeight: '700', color: Colors.white, flex: 1 },
  statusTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 9, fontWeight: '700' },
  matchInfo: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  matchAddr: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  managerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  managerText: { fontSize: 11, color: Colors.textMuted },
  // Invite cards
  inviteCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  tapHint: { fontSize: 10, color: Colors.primary, marginTop: 4, fontWeight: '600' },
  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textMuted },
  emptyHint: { fontSize: 12, color: Colors.textMuted },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.backgroundSecondary, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 36 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.white },
  fieldLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 5, marginTop: 10 },
  input: { height: 42, backgroundColor: Colors.card, borderRadius: 8, paddingHorizontal: 12, color: Colors.white, fontSize: 13, borderWidth: 1, borderColor: Colors.border, marginBottom: 6 },
  codeInput: { height: 52, backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 16, color: Colors.white, fontSize: 20, fontWeight: '800', textAlign: 'center', letterSpacing: 4, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  toggleActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.1)' },
  toggleText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  toggleTextActive: { color: Colors.primary },
  // Date management
  dateRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 8 },
  addDateBtn: { width: 42, height: 42, borderRadius: 8, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  dateChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 8, padding: 8, marginBottom: 4, borderWidth: 1, borderColor: Colors.border },
  dateText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  timeRow: { flexDirection: 'row', gap: 4, marginTop: 3, flexWrap: 'wrap' },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(0,200,83,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  timeText: { fontSize: 10, fontWeight: '600', color: Colors.primary },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, height: 46, borderRadius: 10, gap: 8, marginTop: 12 },
  sendBtnText: { fontSize: 13, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  // Respond modal
  respTeam: { fontSize: 15, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  respInfo: { fontSize: 12, color: Colors.textSecondary, marginTop: 6 },
  respAddr: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  dateOption: { padding: 10, backgroundColor: Colors.card, borderRadius: 8, marginBottom: 4, borderWidth: 1, borderColor: Colors.border },
  dateOptionActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.08)' },
  dateOptText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  timeOptChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: Colors.border },
  timeOptActive: { backgroundColor: 'rgba(0,200,83,0.15)', borderColor: Colors.primary },
  timeOptText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  respActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  acceptBtn: { flex: 1, height: 44, borderRadius: 8, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  acceptBtnText: { fontSize: 13, fontWeight: '800', color: Colors.white },
  declineBtn: { flex: 1, height: 44, borderRadius: 8, backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.destructive },
  declineBtnText: { fontSize: 13, fontWeight: '800', color: Colors.destructive },
});
