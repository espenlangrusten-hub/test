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

interface NetworkFriend {
  id: string;
  friend_team_id: string;
  friend_team_name: string;
  friend_team_code: string;
  friend_team_format: string;
  friend_team_gender: string;
  friend_team_age_group: string;
}

export default function FriendlyMatchesScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { currentTeam, token } = useApp();
  const activeTeamId = teamId || currentTeam?.id;
  const myTeamName = currentTeam?.name || '';

  const [invites, setInvites] = useState<InviteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [opponentCode, setOpponentCode] = useState('');
  const [homeAway, setHomeAway] = useState('home');
  const [pitchName, setPitchName] = useState('');
  const [pitchAddress, setPitchAddress] = useState('');
  const [dates, setDates] = useState<{ date: string; time_slots: string[] }[]>([]);
  const [newTime, setNewTime] = useState('');
  const [sending, setSending] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const [network, setNetwork] = useState<NetworkFriend[]>([]);
  const [showNetworkPicker, setShowNetworkPicker] = useState(false);

  // Opponent detail expansion
  const [expandedOpponent, setExpandedOpponent] = useState<string | null>(null);
  const [addingToNetwork, setAddingToNetwork] = useState(false);

  // Amend modal
  const [amendInvite, setAmendInvite] = useState<InviteData | null>(null);
  const [amendDates, setAmendDates] = useState<{ date: string; time_slots: string[] }[]>([]);
  const [amendTime, setAmendTime] = useState('');
  const [showAmendCalendar, setShowAmendCalendar] = useState(false);
  const [amendCalMonth, setAmendCalMonth] = useState(new Date());

  // Calendar helpers
  const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfWeek = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const formatDateStr = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const today = new Date();
  const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  // Response modal
  const [respondInvite, setRespondInvite] = useState<InviteData | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  useEffect(() => { if (activeTeamId) { fetchInvites(); fetchNetwork(); } }, [activeTeamId]);

  const fetchInvites = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/friendly-invites?team_id=${activeTeamId}`, { headers: authHeaders() });
      if (res.ok) setInvites(await res.json());
    } catch {}
    setLoading(false);
  };

  const fetchNetwork = async () => {
    try {
      const res = await fetch(`${API_URL}/api/network`, { headers: authHeaders() });
      if (res.ok) setNetwork(await res.json());
    } catch {}
  };

  const removeDateSlot = (dateList: any[], setDateList: any, date: string, timeIdx?: number) => {
    if (timeIdx !== undefined) {
      setDateList((prev: any[]) => prev.map((d: any) => d.date === date
        ? { ...d, time_slots: d.time_slots.filter((_: any, i: number) => i !== timeIdx) }
        : d
      ));
    } else {
      setDateList((prev: any[]) => prev.filter((d: any) => d.date !== date));
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
    setDates([]); setNewTime(''); setShowCalendar(false); setShowNetworkPicker(false);
  };

  const respondToInvite = async (status: 'accepted' | 'declined') => {
    if (!respondInvite) return;
    if (status === 'accepted' && !selectedDate) return Alert.alert('Error', 'Select a date');
    try {
      const res = await fetch(`${API_URL}/api/friendly-invites/${respondInvite.id}/respond`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ status, accepted_date: selectedDate, accepted_time: selectedTime }),
      });
      if (res.ok) { setRespondInvite(null); fetchInvites(); }
    } catch { Alert.alert('Error', 'Network error'); }
  };

  const cancelInvite = async (inv: InviteData) => {
    Alert.alert('Cancel Match', `Cancel ${inv.from_team_name} vs ${inv.to_team_name}?`, [
      { text: 'No' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        try {
          const res = await fetch(`${API_URL}/api/friendly-invites/${inv.id}/cancel`, {
            method: 'PUT', headers: authHeaders(),
          });
          if (res.ok) fetchInvites();
          else Alert.alert('Error', 'Could not cancel');
        } catch { Alert.alert('Error', 'Network error'); }
      }},
    ]);
  };

  const amendDate = async () => {
    if (!amendInvite || amendDates.length === 0) return Alert.alert('Error', 'Select at least one new date');
    try {
      const res = await fetch(`${API_URL}/api/friendly-invites/${amendInvite.id}/amend`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ proposed_dates: amendDates }),
      });
      if (res.ok) { setAmendInvite(null); setAmendDates([]); setShowAmendCalendar(false); fetchInvites(); }
      else Alert.alert('Error', 'Could not amend');
    } catch { Alert.alert('Error', 'Network error'); }
  };

  const deleteInvite = async (inv: InviteData) => {
    try {
      const res = await fetch(`${API_URL}/api/friendly-invites/${inv.id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      if (res.ok) fetchInvites();
    } catch {}
  };

  const isSent = (inv: InviteData) => inv.from_team_id === activeTeamId;
  const getOpponent = (inv: InviteData) => isSent(inv)
    ? { name: inv.to_team_name, code: inv.to_team_code, manager: inv.to_manager_name, phone: inv.to_manager_phone, teamId: inv.to_team_id }
    : { name: inv.from_team_name, code: inv.from_team_code, manager: inv.from_manager_name, phone: inv.from_manager_phone, teamId: inv.from_team_id };
  const isInNetwork = (teamCode: string) => network.some(n => n.friend_team_code === teamCode);

  const addOpponentToNetwork = async (teamCode: string) => {
    setAddingToNetwork(true);
    try {
      const res = await fetch(`${API_URL}/api/network/add`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ team_code: teamCode }),
      });
      if (res.ok) {
        Alert.alert('Added!', 'Team added to your network');
        fetchNetwork();
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Info', err.detail || 'Could not add team');
      }
    } catch { Alert.alert('Error', 'Network error'); }
    setAddingToNetwork(false);
  };
  const accepted = invites.filter(i => i.status === 'accepted');
  const pending = invites.filter(i => i.status === 'pending');
  const cancelled = invites.filter(i => i.status === 'cancelled' || i.status === 'declined');
  const isExpired = (inv: InviteData) => inv.accepted_date && inv.accepted_date < todayStr;

  const renderCalendar = (calM: Date, setCalM: (d: Date) => void, selectedDts: string[], onDayPress: (ds: string) => void) => (
    <View style={st.calendarBox}>
      <View style={st.calNavRow}>
        <TouchableOpacity onPress={() => setCalM(new Date(calM.getFullYear(), calM.getMonth() - 1, 1))}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={st.calMonthText}>{calM.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
        <TouchableOpacity onPress={() => setCalM(new Date(calM.getFullYear(), calM.getMonth() + 1, 1))}>
          <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>
      <View style={st.calWeekRow}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(day => <Text key={day} style={st.calWeekDay}>{day}</Text>)}
      </View>
      <View style={st.calGrid}>
        {Array.from({ length: getFirstDayOfWeek(calM) }, (_, i) => <View key={`e${i}`} style={st.calDayEmpty} />)}
        {Array.from({ length: getDaysInMonth(calM) }, (_, i) => {
          const day = i + 1;
          const ds = formatDateStr(calM.getFullYear(), calM.getMonth(), day);
          const isSel = selectedDts.includes(ds);
          const isPast = ds < todayStr;
          return (
            <TouchableOpacity key={day} testID={`cal-day-${ds}`}
              style={[st.calDay, isSel && st.calDaySelected, isPast && st.calDayPast]}
              disabled={isPast}
              onPress={() => onDayPress(ds)}
            >
              <Text style={[st.calDayText, isSel && st.calDayTextSelected, isPast && st.calDayTextPast]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Friendly Matches</Text>
        <TouchableOpacity testID="new-invite-btn" style={st.newBtn} onPress={() => setShowInvite(true)}>
          <MaterialCommunityIcons name="plus" size={14} color={Colors.white} />
          <Text style={st.newBtnText}>INVITE</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Accepted / Upcoming */}
        {accepted.length > 0 && (
          <>
            <Text style={st.section}>UPCOMING MATCHES</Text>
            {accepted.map(inv => {
              const opp = getOpponent(inv);
              return (
              <View key={inv.id} testID={`accepted-${inv.id}`} style={[st.matchCard, isExpired(inv) && st.matchExpired]}>
                <Text style={st.matchHeadline}>{inv.from_team_name} vs {inv.to_team_name}</Text>
                <TouchableOpacity testID={`opp-detail-${inv.id}`} style={st.oppToggle}
                  onPress={() => setExpandedOpponent(expandedOpponent === inv.id ? null : inv.id)}
                >
                  <MaterialCommunityIcons name="account" size={14} color={Colors.primary} />
                  <Text style={st.oppToggleText}>{opp.name}</Text>
                  <MaterialCommunityIcons name={expandedOpponent === inv.id ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} />
                </TouchableOpacity>
                {expandedOpponent === inv.id && (
                  <View style={st.oppDetailBox}>
                    <View style={st.oppRow}><Text style={st.oppLabel}>Manager:</Text><Text style={st.oppValue}>{opp.manager || 'N/A'}</Text></View>
                    <View style={st.oppRow}><Text style={st.oppLabel}>Phone:</Text><Text style={st.oppValue}>{opp.phone || 'N/A'}</Text></View>
                    <View style={st.oppRow}><Text style={st.oppLabel}>Code:</Text><Text style={st.oppValue}>#{opp.code}</Text></View>
                    {!isInNetwork(opp.code) && (
                      <TouchableOpacity testID={`add-opp-network-${inv.id}`} style={[st.addNetBtn, addingToNetwork && { opacity: 0.5 }]}
                        onPress={() => addOpponentToNetwork(opp.code)} disabled={addingToNetwork}
                      >
                        <MaterialCommunityIcons name="account-plus" size={14} color={Colors.white} />
                        <Text style={st.addNetText}>ADD TO NETWORK</Text>
                      </TouchableOpacity>
                    )}
                    {isInNetwork(opp.code) && (
                      <View style={st.inNetworkBadge}><MaterialCommunityIcons name="check" size={12} color={Colors.primary} /><Text style={st.inNetworkText}>In your network</Text></View>
                    )}
                  </View>
                )}
                <Text style={st.matchInfo}>{inv.accepted_date} {inv.accepted_time || ''}</Text>
                <Text style={st.matchInfo}>{inv.home_away === 'home' ? 'Home' : 'Away'}{inv.pitch_name ? ` · ${inv.pitch_name}` : ''}</Text>
                {inv.pitch_address ? <Text style={st.matchAddr}>{inv.pitch_address}</Text> : null}
                <View style={st.actionRow}>
                  <TouchableOpacity testID={`goto-match-${inv.id}`} style={st.goMatchBtn} onPress={() => router.push(`/match?teamId=${activeTeamId}`)}>
                    <MaterialCommunityIcons name="whistle" size={14} color={Colors.white} />
                    <Text style={st.goMatchText}>GO TO MATCH</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID={`amend-${inv.id}`} style={st.amendBtn} onPress={() => { setAmendInvite(inv); setAmendDates([]); setShowAmendCalendar(true); }}>
                    <MaterialCommunityIcons name="calendar-edit" size={14} color={Colors.primary} />
                    <Text style={st.amendText}>AMEND</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID={`cancel-${inv.id}`} style={st.cancelMatchBtn} onPress={() => cancelInvite(inv)}>
                    <MaterialCommunityIcons name="close-circle-outline" size={14} color={Colors.destructive} />
                    <Text style={st.cancelMatchText}>CANCEL</Text>
                  </TouchableOpacity>
                </View>
              </View>
              );
            })}
          </>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <>
            <Text style={st.section}>PENDING INVITATIONS</Text>
            {pending.map(inv => {
              const opp = getOpponent(inv);
              return (
              <TouchableOpacity key={inv.id} testID={`pending-${inv.id}`} style={st.inviteCard}
                onPress={() => { setRespondInvite(inv); setSelectedDate(''); setSelectedTime(''); }}
                activeOpacity={0.7}
              >
                <Text style={st.matchHeadline}>{inv.from_team_name} vs {inv.to_team_name}</Text>
                <TouchableOpacity testID={`opp-detail-pending-${inv.id}`} style={st.oppToggle}
                  onPress={(e) => { e.stopPropagation && e.stopPropagation(); setExpandedOpponent(expandedOpponent === `p-${inv.id}` ? null : `p-${inv.id}`); }}
                >
                  <MaterialCommunityIcons name="account" size={14} color={Colors.primary} />
                  <Text style={st.oppToggleText}>{opp.name}</Text>
                  <MaterialCommunityIcons name={expandedOpponent === `p-${inv.id}` ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} />
                </TouchableOpacity>
                {expandedOpponent === `p-${inv.id}` && (
                  <View style={st.oppDetailBox}>
                    <View style={st.oppRow}><Text style={st.oppLabel}>Manager:</Text><Text style={st.oppValue}>{opp.manager || 'N/A'}</Text></View>
                    <View style={st.oppRow}><Text style={st.oppLabel}>Phone:</Text><Text style={st.oppValue}>{opp.phone || 'N/A'}</Text></View>
                    <View style={st.oppRow}><Text style={st.oppLabel}>Code:</Text><Text style={st.oppValue}>#{opp.code}</Text></View>
                    {!isInNetwork(opp.code) && (
                      <TouchableOpacity testID={`add-opp-network-p-${inv.id}`} style={[st.addNetBtn, addingToNetwork && { opacity: 0.5 }]}
                        onPress={() => addOpponentToNetwork(opp.code)} disabled={addingToNetwork}
                      >
                        <MaterialCommunityIcons name="account-plus" size={14} color={Colors.white} />
                        <Text style={st.addNetText}>ADD TO NETWORK</Text>
                      </TouchableOpacity>
                    )}
                    {isInNetwork(opp.code) && (
                      <View style={st.inNetworkBadge}><MaterialCommunityIcons name="check" size={12} color={Colors.primary} /><Text style={st.inNetworkText}>In your network</Text></View>
                    )}
                  </View>
                )}
                <View style={st.matchTop}>
                  <View style={[st.statusTag, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                    <Text style={[st.statusText, { color: '#F59E0B' }]}>{isSent(inv) ? 'Awaiting response' : 'Action needed'}</Text>
                  </View>
                </View>
                <Text style={st.matchInfo}>{inv.proposed_dates.length} date proposals · {inv.home_away === 'home' ? 'Home' : 'Away'}</Text>
                {inv.pitch_name ? <Text style={st.matchAddr}>{inv.pitch_name}</Text> : null}
                <Text style={st.tapHint}>Tap to respond</Text>
              </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Cancelled / Declined */}
        {cancelled.length > 0 && (
          <>
            <Text style={st.section}>CANCELLED / DECLINED</Text>
            {cancelled.map(inv => (
              <View key={inv.id} testID={`cancelled-${inv.id}`} style={st.cancelledCard}>
                <View style={{ flex: 1 }}>
                  <Text style={st.cancelledTitle}>{inv.from_team_name} vs {inv.to_team_name}</Text>
                  <Text style={st.cancelledStatus}>{inv.status === 'cancelled' ? 'Cancelled' : 'Declined'}</Text>
                </View>
                <TouchableOpacity testID={`delete-${inv.id}`} onPress={() => deleteInvite(inv)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.destructive} />
                </TouchableOpacity>
              </View>
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

              <Text style={st.fieldLabel}>OPPONENT</Text>
              <TextInput testID="opponent-code-input" style={st.codeInput} value={opponentCode} onChangeText={setOpponentCode} placeholder="Team code (e.g. ABC123)" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" />

              {network.length > 0 && (
                <>
                  <TouchableOpacity testID="show-network-picker" style={st.networkPickerToggle} onPress={() => setShowNetworkPicker(!showNetworkPicker)}>
                    <MaterialCommunityIcons name="account-group" size={16} color={Colors.primary} />
                    <Text style={st.networkPickerText}>Or pick from My Network</Text>
                    <MaterialCommunityIcons name={showNetworkPicker ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                  {showNetworkPicker && network.map(n => (
                    <TouchableOpacity key={n.id} testID={`pick-network-${n.friend_team_code}`}
                      style={[st.networkOption, opponentCode === n.friend_team_code && st.networkOptionActive]}
                      onPress={() => { setOpponentCode(n.friend_team_code); setShowNetworkPicker(false); }}
                    >
                      <Text style={st.networkOptName}>{n.friend_team_name}</Text>
                      <Text style={st.networkOptCode}>#{n.friend_team_code}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

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
              <TouchableOpacity testID="open-calendar-btn" style={st.calendarToggle} onPress={() => setShowCalendar(!showCalendar)}>
                <MaterialCommunityIcons name="calendar" size={18} color={Colors.primary} />
                <Text style={st.calendarToggleText}>{dates.length > 0 ? `${dates.length} date(s) selected` : 'Tap to select dates'}</Text>
                <MaterialCommunityIcons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              {showCalendar && renderCalendar(calMonth, setCalMonth, dates.map(d => d.date), (ds) => {
                if (dates.find(d => d.date === ds)) setDates(prev => prev.filter(d => d.date !== ds));
                else setDates(prev => [...prev, { date: ds, time_slots: [] }]);
              })}

              {dates.length > 0 ? (
                <View style={st.timeInputRow}>
                  <TextInput testID="time-input" style={[st.input, { flex: 1 }]} value={newTime} onChangeText={setNewTime} placeholder="HH:MM (optional)" placeholderTextColor={Colors.textMuted} />
                  <TouchableOpacity testID="add-time-btn" style={st.addDateBtn}
                    onPress={() => {
                      if (newTime && dates.length > 0) {
                        const lastDate = dates[dates.length - 1].date;
                        setDates(prev => prev.map(dd => dd.date === lastDate ? { ...dd, time_slots: [...dd.time_slots, newTime] } : dd));
                        setNewTime('');
                      }
                    }}>
                    <MaterialCommunityIcons name="clock-plus-outline" size={16} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ) : null}

              {dates.map((dateItem, idx) => (
                <View key={idx} style={st.dateChip}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.dateText}>{dateItem.date}</Text>
                    {dateItem.time_slots.length > 0 ? (
                      <View style={st.timeRow}>
                        {dateItem.time_slots.map((t, ti) => (
                          <TouchableOpacity key={ti} style={st.timeChip} onPress={() => removeDateSlot(dates, setDates, dateItem.date, ti)}>
                            <Text style={st.timeText}>{t}</Text>
                            <MaterialCommunityIcons name="close" size={10} color={Colors.textMuted} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => removeDateSlot(dates, setDates, dateItem.date)}>
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
                <Text style={st.matchHeadline}>{respondInvite.from_team_name} vs {respondInvite.to_team_name}</Text>
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

      {/* Amend Date Modal */}
      <Modal visible={amendInvite !== null} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <ScrollView contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }}>
            <View style={st.modalContent}>
              <View style={st.modalHead}>
                <Text style={st.modalTitle}>Propose New Dates</Text>
                <TouchableOpacity onPress={() => { setAmendInvite(null); setAmendDates([]); }}>
                  <MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              {amendInvite && (
                <>
                  <Text style={st.matchHeadline}>{amendInvite.from_team_name} vs {amendInvite.to_team_name}</Text>
                  <Text style={st.respInfo}>Current: {amendInvite.accepted_date} {amendInvite.accepted_time || ''}</Text>

                  <Text style={st.fieldLabel}>SELECT NEW DATES</Text>
                  {renderCalendar(amendCalMonth, setAmendCalMonth, amendDates.map(d => d.date), (ds) => {
                    if (amendDates.find(d => d.date === ds)) setAmendDates(prev => prev.filter(d => d.date !== ds));
                    else setAmendDates(prev => [...prev, { date: ds, time_slots: [] }]);
                  })}

                  {amendDates.length > 0 ? (
                    <View style={st.timeInputRow}>
                      <TextInput style={[st.input, { flex: 1 }]} value={amendTime} onChangeText={setAmendTime} placeholder="HH:MM (optional)" placeholderTextColor={Colors.textMuted} />
                      <TouchableOpacity style={st.addDateBtn}
                        onPress={() => {
                          if (amendTime && amendDates.length > 0) {
                            const lastDate = amendDates[amendDates.length - 1].date;
                            setAmendDates(prev => prev.map(dd => dd.date === lastDate ? { ...dd, time_slots: [...dd.time_slots, amendTime] } : dd));
                            setAmendTime('');
                          }
                        }}>
                        <MaterialCommunityIcons name="clock-plus-outline" size={16} color={Colors.white} />
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {amendDates.map((dateItem, idx) => (
                    <View key={idx} style={st.dateChip}>
                      <View style={{ flex: 1 }}>
                        <Text style={st.dateText}>{dateItem.date}</Text>
                        {dateItem.time_slots.length > 0 ? (
                          <View style={st.timeRow}>
                            {dateItem.time_slots.map((t, ti) => (
                              <TouchableOpacity key={ti} style={st.timeChip} onPress={() => removeDateSlot(amendDates, setAmendDates, dateItem.date, ti)}>
                                <Text style={st.timeText}>{t}</Text>
                                <MaterialCommunityIcons name="close" size={10} color={Colors.textMuted} />
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : null}
                      </View>
                      <TouchableOpacity onPress={() => removeDateSlot(amendDates, setAmendDates, dateItem.date)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={14} color={Colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity testID="amend-submit-btn" style={[st.sendBtn, amendDates.length === 0 && { opacity: 0.5 }]} onPress={amendDate} disabled={amendDates.length === 0}>
                    <MaterialCommunityIcons name="send" size={16} color={Colors.white} />
                    <Text style={st.sendBtnText}>PROPOSE NEW DATES</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
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
  matchExpired: { opacity: 0.6 },
  matchHeadline: { fontSize: 15, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  matchTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  matchTeam: { fontSize: 14, fontWeight: '700', color: Colors.white, flex: 1 },
  statusTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 9, fontWeight: '700' },
  matchInfo: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  matchAddr: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  managerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  managerText: { fontSize: 11, color: Colors.textMuted },
  // Action row
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  goMatchBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  goMatchText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  amendBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,200,83,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: Colors.primary },
  amendText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  cancelMatchBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.08)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: Colors.destructive },
  cancelMatchText: { fontSize: 10, fontWeight: '700', color: Colors.destructive },
  // Cancelled
  cancelledCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundSecondary, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)', opacity: 0.7 },
  cancelledTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  cancelledStatus: { fontSize: 10, color: Colors.destructive, fontWeight: '600', marginTop: 2 },
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
  codeInput: { height: 52, backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 16, color: Colors.white, fontSize: 20, fontWeight: '800', textAlign: 'center', letterSpacing: 4, borderWidth: 1, borderColor: Colors.border, marginBottom: 4 },
  // Network picker
  networkPickerToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginBottom: 4 },
  networkPickerText: { flex: 1, fontSize: 12, fontWeight: '600', color: Colors.primary },
  networkOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.card, borderRadius: 8, padding: 10, marginBottom: 4, borderWidth: 1, borderColor: Colors.border },
  networkOptionActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.08)' },
  networkOptName: { fontSize: 13, fontWeight: '700', color: Colors.white },
  networkOptCode: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  toggleActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.1)' },
  toggleText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  toggleTextActive: { color: Colors.primary },
  // Date management
  addDateBtn: { width: 42, height: 42, borderRadius: 8, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  dateChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 8, padding: 8, marginBottom: 4, borderWidth: 1, borderColor: Colors.border },
  dateText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  timeRow: { flexDirection: 'row', gap: 4, marginTop: 3, flexWrap: 'wrap' },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(0,200,83,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  timeText: { fontSize: 10, fontWeight: '600', color: Colors.primary },
  // Calendar picker
  calendarToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 6 },
  calendarToggleText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  calendarBox: { backgroundColor: Colors.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  calNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  calMonthText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  calWeekRow: { flexDirection: 'row', marginBottom: 4 },
  calWeekDay: { width: '14.28%' as any, textAlign: 'center', fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDayEmpty: { width: '14.28%' as any, height: 36 },
  calDay: { width: '14.28%' as any, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  calDaySelected: { backgroundColor: Colors.primary },
  calDayPast: { opacity: 0.3 },
  calDayText: { fontSize: 13, fontWeight: '600', color: Colors.white },
  calDayTextSelected: { color: Colors.white, fontWeight: '800' },
  calDayTextPast: { color: Colors.textMuted },
  timeInputRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 8 },
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
  // Opponent details
  oppToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingVertical: 4 },
  oppToggleText: { fontSize: 12, fontWeight: '600', color: Colors.primary, flex: 1 },
  oppDetailBox: { backgroundColor: 'rgba(0,200,83,0.05)', borderRadius: 8, padding: 10, marginTop: 4, gap: 4 },
  oppRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  oppLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, width: 60 },
  oppValue: { fontSize: 12, fontWeight: '600', color: Colors.white, flex: 1 },
  addNetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8B5CF6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginTop: 4, alignSelf: 'flex-start' },
  addNetText: { fontSize: 10, fontWeight: '700', color: Colors.white, letterSpacing: 0.5 },
  inNetworkBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  inNetworkText: { fontSize: 10, fontWeight: '600', color: Colors.primary },
});
