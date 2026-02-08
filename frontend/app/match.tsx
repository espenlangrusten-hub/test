import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, Modal, Vibration, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp, PlayerData } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';
import { getFormations, STARTERS_COUNT } from '../src/constants/formations';
import PitchView from '../src/components/PitchView';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface SubEntry {
  minute: number;
  playerOutId: string;
  playerOutName: string;
  playerInId: string;
  playerInName: string;
  done: boolean;
}

export default function MatchScreen() {
  const router = useRouter();
  const { sport, format, currentTeam } = useApp();
  const formations = getFormations(sport, format);
  const startersCount = STARTERS_COUNT[format] || 5;

  const [opponent, setOpponent] = useState('');
  const [durationMin, setDurationMin] = useState(format === '11v11' ? 90 : format === '7v7' ? 60 : 40);
  const [subMode, setSubMode] = useState<'manual' | 'auto'>('auto');
  const [matchStatus, setMatchStatus] = useState<'setup' | 'live' | 'paused' | 'ended'>('setup');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [subPlan, setSubPlan] = useState<SubEntry[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [matchId, setMatchId] = useState('');
  const [showSubAlert, setShowSubAlert] = useState<SubEntry | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertedMinsRef = useRef<Set<number>>(new Set());

  const allPlayers = currentTeam?.players || [];
  const starters = allPlayers.filter(p => p.is_starter);
  const subs = allPlayers.filter(p => !p.is_starter);

  const formation = formations.find(
    f => f.name === currentTeam?.formation || f.id === currentTeam?.formation
  ) || formations[0];

  // Build pitch assignments from starters
  const pitchAssignments: { [key: number]: PlayerData | null } = {};
  formation.positions.forEach((_, idx) => {
    if (idx < starters.length) pitchAssignments[idx] = starters[idx];
  });

  useEffect(() => {
    if (subMode === 'auto' && subs.length > 0) {
      calculateAutoSubs();
    } else {
      setSubPlan([]);
    }
  }, [subMode, durationMin]);

  const calculateAutoSubs = () => {
    const outfieldStarters = starters.filter(p => p.position !== 'GK');
    if (subs.length === 0 || outfieldStarters.length === 0) return;
    const interval = Math.floor(durationMin / (subs.length + 1));
    const plan: SubEntry[] = subs.map((sub, i) => ({
      minute: interval * (i + 1),
      playerOutId: outfieldStarters[i % outfieldStarters.length].id,
      playerOutName: outfieldStarters[i % outfieldStarters.length].name,
      playerInId: sub.id,
      playerInName: sub.name,
      done: false,
    }));
    setSubPlan(plan);
  };

  const startMatch = async () => {
    try {
      const res = await fetch(`${API_URL}/api/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: currentTeam?.id || '',
          opponent,
          formation: currentTeam?.formation || '',
          tactic_name: currentTeam?.tactic_name || '',
          duration_minutes: durationMin,
          starters: starters.map(p => p.id),
          subs: subs.map(p => p.id),
          sub_mode: subMode,
          sub_plan: subPlan.map(s => ({
            minute: s.minute,
            player_out_id: s.playerOutId,
            player_in_id: s.playerInId,
            player_out_name: s.playerOutName,
            player_in_name: s.playerInName,
          })),
        }),
      });
      const match = await res.json();
      setMatchId(match.id);
    } catch {}

    setMatchStatus('live');
    setElapsedSec(0);
    alertedMinsRef.current = new Set();
    setEvents([`${formatTime(0)} - Match started`]);
    startTimer();
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSec(prev => {
        const next = prev + 1;
        return next;
      });
    }, 1000);
  };

  // Check for sub alerts
  useEffect(() => {
    if (matchStatus !== 'live') return;
    const currentMin = Math.floor(elapsedSec / 60);

    // Check if match ended
    if (currentMin >= durationMin) {
      endMatch();
      return;
    }

    // Check sub alerts
    subPlan.forEach(sub => {
      if (!sub.done && currentMin >= sub.minute && !alertedMinsRef.current.has(sub.minute)) {
        alertedMinsRef.current.add(sub.minute);
        setShowSubAlert(sub);
        if (Platform.OS !== 'web') {
          Vibration.vibrate([0, 200, 100, 200]);
        }
      }
    });
  }, [elapsedSec, matchStatus]);

  const pauseMatch = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setMatchStatus('paused');
    setEvents(prev => [...prev, `${formatTime(elapsedSec)} - Match paused`]);
  };

  const resumeMatch = () => {
    setMatchStatus('live');
    startTimer();
    setEvents(prev => [...prev, `${formatTime(elapsedSec)} - Match resumed`]);
  };

  const endMatch = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setMatchStatus('ended');
    setEvents(prev => [...prev, `${formatTime(elapsedSec)} - Match ended`]);
    if (matchId) {
      fetch(`${API_URL}/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      }).catch(() => {});
    }
  };

  const confirmSub = (sub: SubEntry) => {
    setSubPlan(prev =>
      prev.map(s => s.minute === sub.minute && s.playerInId === sub.playerInId
        ? { ...s, done: true } : s
      )
    );
    setEvents(prev => [
      ...prev,
      `${formatTime(elapsedSec)} - SUB: ${sub.playerOutName} → ${sub.playerInName}`,
    ]);
    setShowSubAlert(null);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Setup view
  if (matchStatus === 'setup') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.setupHeader}>
            <MaterialCommunityIcons name="whistle" size={36} color={Colors.primary} />
            <Text style={styles.setupTitle}>MATCH DAY</Text>
            <Text style={styles.setupSub}>
              {currentTeam?.name} · {currentTeam?.formation || 'No formation'}
            </Text>
          </View>

          <Text style={styles.label}>OPPONENT</Text>
          <TextInput
            testID="opponent-input"
            style={styles.input}
            value={opponent}
            onChangeText={setOpponent}
            placeholder="Opponent team name"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>MATCH DURATION (minutes)</Text>
          <View style={styles.durationRow}>
            {[20, 30, 40, 50, 60, 70, 80, 90].map(d => (
              <TouchableOpacity
                key={d}
                testID={`duration-${d}`}
                style={[styles.durationChip, durationMin === d && styles.durationChipActive]}
                onPress={() => setDurationMin(d)}
              >
                <Text style={[styles.durationText, durationMin === d && styles.durationTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>SUBSTITUTION MODE</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              testID="sub-mode-auto"
              style={[styles.modeCard, subMode === 'auto' && styles.modeCardActive]}
              onPress={() => setSubMode('auto')}
            >
              <MaterialCommunityIcons
                name="robot"
                size={24}
                color={subMode === 'auto' ? Colors.primary : Colors.textMuted}
              />
              <Text style={[styles.modeTitle, subMode === 'auto' && styles.modeTitleActive]}>
                AUTO
              </Text>
              <Text style={styles.modeDesc}>Equal play time for all (exc. GK)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="sub-mode-manual"
              style={[styles.modeCard, subMode === 'manual' && styles.modeCardActive]}
              onPress={() => setSubMode('manual')}
            >
              <MaterialCommunityIcons
                name="account-edit"
                size={24}
                color={subMode === 'manual' ? Colors.primary : Colors.textMuted}
              />
              <Text style={[styles.modeTitle, subMode === 'manual' && styles.modeTitleActive]}>
                MANUAL
              </Text>
              <Text style={styles.modeDesc}>You decide when to sub</Text>
            </TouchableOpacity>
          </View>

          {/* Auto Sub Plan Preview */}
          {subMode === 'auto' && subPlan.length > 0 && (
            <>
              <Text style={styles.label}>SUBSTITUTION PLAN</Text>
              {subPlan.map((sub, i) => (
                <View key={i} style={styles.subPlanRow}>
                  <View style={styles.subMinBadge}>
                    <Text style={styles.subMinText}>{sub.minute}'</Text>
                  </View>
                  <Text style={styles.subPlanText}>
                    {sub.playerOutName}
                  </Text>
                  <MaterialCommunityIcons name="swap-horizontal" size={16} color={Colors.primary} />
                  <Text style={styles.subPlanText}>
                    {sub.playerInName}
                  </Text>
                </View>
              ))}
            </>
          )}

          {subs.length === 0 && (
            <View style={styles.noSubsBox}>
              <MaterialCommunityIcons name="information-outline" size={18} color={Colors.warning} />
              <Text style={styles.noSubsText}>No substitutes available. All players are starters.</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            testID="start-match-btn"
            style={styles.startBtn}
            onPress={startMatch}
          >
            <MaterialCommunityIcons name="play" size={24} color={Colors.white} />
            <Text style={styles.startBtnText}>START MATCH</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Live/Paused/Ended view
  const progress = Math.min(elapsedSec / (durationMin * 60), 1);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Timer */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>
            {matchStatus === 'ended' ? 'FULL TIME' : matchStatus === 'paused' ? 'PAUSED' : 'MATCH TIME'}
          </Text>
          <Text style={styles.timerDisplay}>{formatTime(elapsedSec)}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.timerMeta}>
            {opponent ? `vs ${opponent}` : ''} · {durationMin} min
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controlRow}>
          {matchStatus === 'live' && (
            <TouchableOpacity testID="pause-btn" style={styles.controlBtn} onPress={pauseMatch}>
              <MaterialCommunityIcons name="pause" size={28} color={Colors.warning} />
              <Text style={[styles.controlText, { color: Colors.warning }]}>PAUSE</Text>
            </TouchableOpacity>
          )}
          {matchStatus === 'paused' && (
            <TouchableOpacity testID="resume-btn" style={styles.controlBtn} onPress={resumeMatch}>
              <MaterialCommunityIcons name="play" size={28} color={Colors.primary} />
              <Text style={[styles.controlText, { color: Colors.primary }]}>RESUME</Text>
            </TouchableOpacity>
          )}
          {(matchStatus === 'live' || matchStatus === 'paused') && (
            <TouchableOpacity testID="end-btn" style={styles.controlBtn} onPress={() => {
              Alert.alert('End Match', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'End', style: 'destructive', onPress: endMatch },
              ]);
            }}>
              <MaterialCommunityIcons name="stop" size={28} color={Colors.destructive} />
              <Text style={[styles.controlText, { color: Colors.destructive }]}>END</Text>
            </TouchableOpacity>
          )}
          {matchStatus === 'ended' && (
            <>
              <TouchableOpacity
                testID="player-notes-btn"
                style={styles.controlBtn}
                onPress={() => router.push({ pathname: '/player-notes', params: { matchId } })}
              >
                <MaterialCommunityIcons name="note-edit" size={28} color={Colors.primary} />
                <Text style={[styles.controlText, { color: Colors.primary }]}>NOTES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="new-match-btn"
                style={styles.controlBtn}
                onPress={() => setMatchStatus('setup')}
              >
                <MaterialCommunityIcons name="refresh" size={28} color={Colors.accent} />
                <Text style={[styles.controlText, { color: Colors.accent }]}>NEW</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Pitch */}
        <PitchView
          positions={formation.positions}
          assignedPlayers={pitchAssignments}
          compact
          sport={sport}
        />

        {/* Sub Plan Status */}
        {subPlan.length > 0 && (
          <>
            <Text style={[styles.label, { marginTop: 16 }]}>SUBSTITUTIONS</Text>
            {subPlan.map((sub, i) => (
              <View key={i} style={[styles.subStatusRow, sub.done && styles.subDone]}>
                <View style={[styles.subMinBadge, sub.done && { backgroundColor: 'rgba(0,200,83,0.2)' }]}>
                  <Text style={[styles.subMinText, sub.done && { color: Colors.primary }]}>{sub.minute}'</Text>
                </View>
                <Text style={styles.subStatusText}>
                  {sub.playerOutName} → {sub.playerInName}
                </Text>
                {sub.done && (
                  <MaterialCommunityIcons name="check-circle" size={18} color={Colors.primary} />
                )}
              </View>
            ))}
          </>
        )}

        {/* Event Log */}
        <Text style={[styles.label, { marginTop: 16 }]}>MATCH LOG</Text>
        {events.map((event, i) => (
          <Text key={i} style={styles.eventText}>{event}</Text>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sub Alert Modal */}
      <Modal visible={showSubAlert !== null} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <MaterialCommunityIcons name="swap-horizontal-bold" size={40} color={Colors.primary} />
            <Text style={styles.alertTitle}>SUBSTITUTION</Text>
            <Text style={styles.alertTime}>{showSubAlert?.minute}' minute</Text>
            <View style={styles.alertSubRow}>
              <View style={styles.alertPlayer}>
                <MaterialCommunityIcons name="arrow-down" size={20} color={Colors.destructive} />
                <Text style={styles.alertPlayerName}>{showSubAlert?.playerOutName}</Text>
              </View>
              <View style={styles.alertPlayer}>
                <MaterialCommunityIcons name="arrow-up" size={20} color={Colors.primary} />
                <Text style={styles.alertPlayerName}>{showSubAlert?.playerInName}</Text>
              </View>
            </View>
            <View style={styles.alertActions}>
              <TouchableOpacity
                testID="confirm-sub-btn"
                style={styles.alertConfirm}
                onPress={() => showSubAlert && confirmSub(showSubAlert)}
              >
                <Text style={styles.alertConfirmText}>CONFIRM SUB</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="skip-sub-btn"
                style={styles.alertSkip}
                onPress={() => setShowSubAlert(null)}
              >
                <Text style={styles.alertSkipText}>SKIP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  setupHeader: { alignItems: 'center', paddingVertical: 24 },
  setupTitle: { fontSize: 28, fontWeight: '900', color: Colors.white, marginTop: 12, letterSpacing: 2 },
  setupSub: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  label: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 2, marginBottom: 8, marginTop: 12,
  },
  input: {
    height: 48, backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, color: Colors.white, fontSize: 15, marginBottom: 4,
  },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  durationChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border,
  },
  durationChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.1)' },
  durationText: { fontSize: 15, fontWeight: '700', color: Colors.textMuted },
  durationTextActive: { color: Colors.primary },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  modeCard: {
    flex: 1, backgroundColor: Colors.backgroundSecondary, borderRadius: 12,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  modeCardActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.06)' },
  modeTitle: { fontSize: 14, fontWeight: '800', color: Colors.textMuted, marginTop: 6, letterSpacing: 1 },
  modeTitleActive: { color: Colors.primary },
  modeDesc: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },
  subPlanRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.backgroundSecondary, borderRadius: 8,
    padding: 10, marginBottom: 6, borderWidth: 1, borderColor: Colors.border,
  },
  subMinBadge: {
    backgroundColor: 'rgba(0,200,83,0.15)', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 4,
  },
  subMinText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  subPlanText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  noSubsBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 8,
    padding: 12, marginTop: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
  },
  noSubsText: { fontSize: 13, color: Colors.warning, flex: 1 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32, backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, height: 56, borderRadius: 14, gap: 10,
  },
  startBtnText: { fontSize: 17, fontWeight: '900', color: Colors.white, letterSpacing: 2 },
  timerContainer: { alignItems: 'center', paddingVertical: 20 },
  timerLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 3 },
  timerDisplay: { fontSize: 64, fontWeight: '900', color: Colors.white, letterSpacing: -2 },
  progressBar: {
    width: '100%', height: 4, backgroundColor: Colors.border,
    borderRadius: 2, marginTop: 8, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  timerMeta: { fontSize: 13, color: Colors.textMuted, marginTop: 8 },
  controlRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 16 },
  controlBtn: { alignItems: 'center', padding: 12 },
  controlText: { fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
  subStatusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.backgroundSecondary, borderRadius: 8,
    padding: 10, marginBottom: 4, borderWidth: 1, borderColor: Colors.border,
  },
  subDone: { opacity: 0.5 },
  subStatusText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  eventText: { fontSize: 12, color: Colors.textMuted, paddingVertical: 3, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  alertOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  alertCard: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 20,
    padding: 28, alignItems: 'center', width: '100%',
    borderWidth: 2, borderColor: Colors.primary,
  },
  alertTitle: { fontSize: 22, fontWeight: '900', color: Colors.white, marginTop: 12, letterSpacing: 2 },
  alertTime: { fontSize: 14, color: Colors.primary, marginTop: 4, fontWeight: '700' },
  alertSubRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 20 },
  alertPlayer: { alignItems: 'center', gap: 4 },
  alertPlayerName: { fontSize: 15, fontWeight: '700', color: Colors.white },
  alertActions: { width: '100%', marginTop: 24, gap: 8 },
  alertConfirm: {
    backgroundColor: Colors.primary, height: 48, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  alertConfirmText: { fontSize: 14, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  alertSkip: {
    height: 44, justifyContent: 'center', alignItems: 'center',
  },
  alertSkipText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
});
