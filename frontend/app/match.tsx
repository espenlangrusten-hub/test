import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Modal, Vibration, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp, PlayerData } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';
import { getFormations, STARTERS_COUNT } from '../src/constants/formations';
import { getCoachingCategories, CoachingCategory, CoachingSuggestion, TacticalArrow } from '../src/lib/coaching-data';
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

interface PlayerRating {
  playerId: string;
  playerName: string;
  rating: number;
  note: string;
}

interface PlayerPlaytime {
  id: string;
  name: string;
  number: number;
  expectedMinutes: number;
  isGK: boolean;
}

// ========== ROTATIONAL AUTO-SUB ALGORITHM ==========
function calculateRotationalSubs(
  starters: PlayerData[],
  bench: PlayerData[],
  totalMinutes: number,
): { plan: SubEntry[]; playtimes: PlayerPlaytime[] } {
  const gk = starters.find(p => p.position === 'GK');
  const outfieldStarters = starters.filter(p => p.position !== 'GK');
  const allOutfield = [...outfieldStarters, ...bench];
  const pitchSlots = outfieldStarters.length;
  const benchSize = bench.length;

  if (benchSize === 0 || pitchSlots === 0) {
    const playtimes: PlayerPlaytime[] = starters.map(p => ({
      id: p.id, name: p.name, number: p.number,
      expectedMinutes: totalMinutes, isGK: p.position === 'GK',
    }));
    return { plan: [], playtimes };
  }

  const totalOutfield = allOutfield.length;
  // Create enough rotation windows so each player gets rest time
  // numSegments = how many time blocks we divide the match into
  const numSegments = Math.max(2, Math.ceil(totalOutfield / benchSize));
  const windowSize = Math.floor(totalMinutes / numSegments);
  const numWindows = numSegments - 1;

  // Track who's on pitch and accumulated time
  const onPitchSet = new Set(outfieldStarters.map(p => p.id));
  const playedTime: Record<string, number> = {};
  allOutfield.forEach(p => { playedTime[p.id] = 0; });

  const plan: SubEntry[] = [];
  let lastWindowMin = 0;

  for (let w = 1; w <= numWindows; w++) {
    const subMinute = windowSize * w;
    const elapsed = subMinute - lastWindowMin;

    // Accumulate time for players on pitch
    onPitchSet.forEach(id => { playedTime[id] += elapsed; });

    // Sort on-pitch by most played (desc) - these come off
    const onPitchSorted = [...onPitchSet]
      .map(id => ({ id, time: playedTime[id] }))
      .sort((a, b) => b.time - a.time);

    // Sort off-pitch by least played (asc) - these come on
    const offPitch = allOutfield
      .filter(p => !onPitchSet.has(p.id))
      .map(p => ({ id: p.id, time: playedTime[p.id] }))
      .sort((a, b) => a.time - b.time);

    // Swap: bring in all bench players, take out the ones who played most
    const subsCount = Math.min(offPitch.length, onPitchSorted.length);

    for (let s = 0; s < subsCount; s++) {
      const outPlayer = allOutfield.find(p => p.id === onPitchSorted[s].id)!;
      const inPlayer = allOutfield.find(p => p.id === offPitch[s].id)!;

      plan.push({
        minute: subMinute,
        playerOutId: outPlayer.id,
        playerOutName: outPlayer.name,
        playerInId: inPlayer.id,
        playerInName: inPlayer.name,
        done: false,
      });

      onPitchSet.delete(outPlayer.id);
      onPitchSet.add(inPlayer.id);
    }

    lastWindowMin = subMinute;
  }

  // Final segment time
  const finalElapsed = totalMinutes - lastWindowMin;
  onPitchSet.forEach(id => { playedTime[id] += finalElapsed; });

  // Build playtimes
  const playtimes: PlayerPlaytime[] = [];
  if (gk) {
    playtimes.push({ id: gk.id, name: gk.name, number: gk.number, expectedMinutes: totalMinutes, isGK: true });
  }
  allOutfield.forEach(p => {
    playtimes.push({ id: p.id, name: p.name, number: p.number, expectedMinutes: playedTime[p.id], isGK: false });
  });

  return { plan, playtimes };
}

export default function MatchScreen() {
  const router = useRouter();
  const { sport, format, currentTeam, token } = useApp();
  const formations = getFormations(sport, format);
  const startersCount = STARTERS_COUNT[format] || 5;
  const coachingCategories = getCoachingCategories(format);
  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  // Halftime-based duration
  const defaultHalf = format === '11v11' ? 45 : format === '9v9' ? 35 : format === '7v7' ? 30 : 20;
  const [opponent, setOpponent] = useState('');
  const [halfDuration, setHalfDuration] = useState(defaultHalf);
  const totalMatchMinutes = halfDuration * 2;

  const [subMode, setSubMode] = useState<'manual' | 'auto'>('auto');
  const [matchStatus, setMatchStatus] = useState<'setup' | 'live' | 'paused' | 'ended' | 'review'>('setup');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [subPlan, setSubPlan] = useState<SubEntry[]>([]);
  const [playtimePreview, setPlaytimePreview] = useState<PlayerPlaytime[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [matchId, setMatchId] = useState('');
  const [currentHalf, setCurrentHalf] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertedMinsRef = useRef<Set<string>>(new Set());

  // Live tracking
  const [onPitch, setOnPitch] = useState<PlayerData[]>([]);
  const [onBench, setOnBench] = useState<PlayerData[]>([]);

  // Modals
  const [subAlertQueue, setSubAlertQueue] = useState<SubEntry[]>([]);
  const [showManualSub, setShowManualSub] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [manualSubOut, setManualSubOut] = useState<PlayerData | null>(null);
  const [manualSubIn, setManualSubIn] = useState<PlayerData | null>(null);

  // Post-match review
  const [playerRatings, setPlayerRatings] = useState<PlayerRating[]>([]);
  const [savingReview, setSavingReview] = useState(false);

  // Score tracking
  const [scoreHome, setScoreHome] = useState(0);
  const [scoreAway, setScoreAway] = useState(0);

  // Coaching panel
  const [showCoaching, setShowCoaching] = useState(false);
  const [selectedCoachCat, setSelectedCoachCat] = useState<CoachingCategory | null>(null);
  const [coachingNotes, setCoachingNotes] = useState<string[]>([]);
  const [activeCoachingOverlay, setActiveCoachingOverlay] = useState<{category: string, suggestion: string, color: string, arrows: TacticalArrow[]} | null>(null);

  // In-match event logging
  const [eventPlayer, setEventPlayer] = useState<PlayerData | null>(null);

  const allPlayers = currentTeam?.players || [];
  const starters = allPlayers.filter(p => p.is_starter);
  const subs = allPlayers.filter(p => !p.is_starter);

  const formation = formations.find(
    f => f.name === currentTeam?.formation || f.id === currentTeam?.formation
  ) || formations[0];

  // Live formation (can be changed during match)
  const [activeFormation, setActiveFormation] = useState(formation);
  const [showFormationPicker, setShowFormationPicker] = useState(false);

  // Track last position each player held on pitch (for smart auto-fill)
  const lastPositionRef = useRef<Record<string, string>>({});

  // Compute auto-subs synchronously using useMemo - avoids stale closure issues
  const { computedPlan, computedPlaytimes } = useMemo(() => {
    if (subMode === 'auto' && subs.length > 0 && starters.length > 0) {
      const result = calculateRotationalSubs(starters, subs, totalMatchMinutes);
      return { computedPlan: result.plan, computedPlaytimes: result.playtimes };
    }
    return { computedPlan: [] as SubEntry[], computedPlaytimes: [] as PlayerPlaytime[] };
  }, [subMode, halfDuration, JSON.stringify(starters.map(p => p.id)), JSON.stringify(subs.map(p => p.id))]);

  // Sync plan to state for live tracking (mark done etc)
  useEffect(() => {
    setSubPlan(computedPlan.map(s => ({ ...s })));
    setPlaytimePreview(computedPlaytimes);
  }, [computedPlan, computedPlaytimes]);

  const startMatch = async () => {
    setOnPitch([...starters]);
    setOnBench([...subs]);
    setCurrentHalf(1);

    const startingLineup = starters.map(p => ({ id: p.id, name: p.name, number: p.number, position: p.position }));

    try {
      const res = await fetch(`${API_URL}/api/matches`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          team_id: currentTeam?.id || '',
          opponent,
          formation: currentTeam?.formation || '',
          tactic_name: currentTeam?.tactic_name || '',
          duration_minutes: totalMatchMinutes,
          starters: starters.map(p => p.id),
          subs: subs.map(p => p.id),
          sub_mode: subMode,
          sub_plan: subPlan.map(s => ({
            minute: s.minute, player_out_id: s.playerOutId,
            player_in_id: s.playerInId, player_out_name: s.playerOutName,
            player_in_name: s.playerInName,
          })),
          starting_lineup: startingLineup,
          score_home: 0,
          score_away: 0,
        }),
      });
      const match = await res.json();
      setMatchId(match.id);
    } catch {}

    setMatchStatus('live');
    setElapsedSec(0);
    setScoreHome(0);
    setScoreAway(0);
    alertedMinsRef.current = new Set();
    setEvents([`00:00 -- Kick off (1st half)`]);
    startTimer();
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSec(prev => prev + 1);
    }, 1000);
  };

  // Track halftime and match end
  useEffect(() => {
    if (matchStatus !== 'live') return;
    const currentMin = Math.floor(elapsedSec / 60);
    const halfSec = halfDuration * 60;

    // Halftime
    if (currentHalf === 1 && elapsedSec >= halfSec) {
      if (timerRef.current) clearInterval(timerRef.current);
      setMatchStatus('paused');
      setCurrentHalf(2);
      addEvent('HALF TIME');
      return;
    }

    // Full time
    if (currentMin >= totalMatchMinutes) {
      doEndMatch();
      return;
    }

    // Sub alerts - queue all due subs at once
    const dueSubs = subPlan.filter(sub => {
      const alertKey = `${sub.minute}-${sub.playerOutId}-${sub.playerInId}`;
      return !sub.done && currentMin >= sub.minute && !alertedMinsRef.current.has(alertKey);
    });
    if (dueSubs.length > 0) {
      dueSubs.forEach(sub => {
        const alertKey = `${sub.minute}-${sub.playerOutId}-${sub.playerInId}`;
        alertedMinsRef.current.add(alertKey);
      });
      setSubAlertQueue(prev => [...prev, ...dueSubs]);
      if (Platform.OS !== 'web') Vibration.vibrate([0, 200, 100, 200]);
    }
  }, [elapsedSec, matchStatus]);

  const pauseMatch = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setMatchStatus('paused');
    addEvent('Match paused');
  };

  const resumeMatch = () => {
    setMatchStatus('live');
    startTimer();
    if (currentHalf === 2 && events[events.length - 1]?.includes('HALF TIME')) {
      addEvent('Kick off (2nd half)');
    } else {
      addEvent('Match resumed');
    }
  };

  const doEndMatch = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setMatchStatus('ended');
    addEvent(`FULL TIME -- ${scoreHome}-${scoreAway}`);
    if (matchId) {
      fetch(`${API_URL}/api/matches/${matchId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          status: 'completed',
          score_home: scoreHome,
          score_away: scoreAway,
          events: [...events, `${formatTime(elapsedSec)} -- FULL TIME`].map((e, i) => ({ type: 'event', minute: i, detail: e })),
          coaching_notes: coachingNotes.map(n => ({ note: n })),
        }),
      }).catch(() => {});
    }
  };

  const addEvent = (text: string) => {
    setEvents(prev => [...prev, `${formatTime(elapsedSec)} -- ${text}`]);
  };

  const confirmSub = (sub: SubEntry) => {
    executeSub(sub.playerOutId, sub.playerOutName, sub.playerInId, sub.playerInName, true);
    // Remove from queue, next item will auto-show
    setSubAlertQueue(prev => prev.slice(1));
  };

  const skipSub = () => {
    setSubAlertQueue(prev => prev.slice(1));
  };

  const currentSubAlert = subAlertQueue.length > 0 ? subAlertQueue[0] : null;

  const executeSub = (outId: string, outName: string, inId: string, inName: string, isPlanned: boolean) => {
    setOnPitch(prev => prev.map(p => p.id === outId ? allPlayers.find(x => x.id === inId)! : p).filter(Boolean));
    setOnBench(prev => {
      const updated = prev.filter(p => p.id !== inId);
      const outPlayer = allPlayers.find(p => p.id === outId);
      if (outPlayer) updated.push(outPlayer);
      return updated;
    });

    if (isPlanned) {
      setSubPlan(prev => prev.map(s =>
        s.playerOutId === outId && s.playerInId === inId && !s.done ? { ...s, done: true } : s
      ));
    }

    addEvent(`SUB: ${outName} <-> ${inName}${!isPlanned ? ' (manual)' : ''}`);

    // Recalculate remaining plan if auto mode and manual sub
    if (subMode === 'auto' && !isPlanned) {
      setTimeout(() => {
        setOnPitch(currentPitch => {
          setOnBench(currentBench => {
            const currentMin = Math.floor(elapsedSec / 60);
            const remainingBench = currentBench;
            if (remainingBench.length > 0) {
              const pitchStarters = currentPitch;
              const { plan: newPlan } = calculateRotationalSubs(pitchStarters, remainingBench, totalMatchMinutes - currentMin);
              // Adjust minutes to absolute time
              const adjustedPlan = newPlan.map(s => ({ ...s, minute: s.minute + currentMin }));
              setSubPlan(prev => [...prev.filter(s => s.done), ...adjustedPlan]);
            }
            return currentBench;
          });
          return currentPitch;
        });
      }, 100);
    }
  };

  const executeManualSub = () => {
    if (!manualSubOut || !manualSubIn) return;
    executeSub(manualSubOut.id, manualSubOut.name, manualSubIn.id, manualSubIn.name, false);
    setSubPlan(prev => prev.filter(s => {
      if (s.done) return true;
      return s.playerOutId !== manualSubOut.id && s.playerInId !== manualSubIn.id;
    }));
    setShowManualSub(false);
    setManualSubOut(null);
    setManualSubIn(null);
  };

  const startReview = () => {
    const played = new Set<string>();
    starters.forEach(p => played.add(p.id));
    subPlan.filter(s => s.done).forEach(s => played.add(s.playerInId));
    events.forEach(e => {
      if (e.includes('SUB:')) {
        const m = e.match(/SUB: .+ <-> (.+?)( \(|$)/);
        if (m) {
          const player = allPlayers.find(p => p.name === m[1].trim());
          if (player) played.add(player.id);
        }
      }
    });
    const ratings: PlayerRating[] = allPlayers
      .filter(p => played.has(p.id))
      .map(p => ({ playerId: p.id, playerName: p.name, rating: 5, note: '' }));
    setPlayerRatings(ratings);
    setMatchStatus('review');
  };

  const saveReview = async () => {
    setSavingReview(true);
    try {
      for (const pr of playerRatings) {
        if (pr.note.trim() || pr.rating !== 5) {
          await fetch(`${API_URL}/api/matches/${matchId}/notes`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              player_id: pr.playerId,
              player_name: pr.playerName,
              note: pr.note.trim() || `Match rating: ${pr.rating}/10`,
              rating: pr.rating,
            }),
          });
        }
      }
      router.replace('/');
    } catch {}
    setSavingReview(false);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Handle pitch player tap for event logging
  const handlePitchTap = (index: number) => {
    if (matchStatus !== 'live' && matchStatus !== 'paused') return;
    const player = pitchAssignments[index];
    if (player) setEventPlayer(player as PlayerData);
  };

  const logPlayerEvent = async (type: string) => {
    if (!eventPlayer) return;
    const minute = Math.floor(elapsedSec / 60);
    let detail = '';
    if (type === 'goal') {
      setScoreHome(scoreHome + 1);
      detail = `GOAL by ${eventPlayer.name}`;
      addEvent(`GOAL! ${eventPlayer.name} (${scoreHome + 1}-${scoreAway})`);
    } else if (type === 'yellow') {
      detail = `YELLOW CARD: ${eventPlayer.name}`;
      addEvent(`YELLOW CARD: ${eventPlayer.name}`);
    } else if (type === 'red') {
      detail = `RED CARD: ${eventPlayer.name}`;
      addEvent(`RED CARD: ${eventPlayer.name}`);
    } else if (type === 'assist') {
      detail = `ASSIST by ${eventPlayer.name}`;
      addEvent(`ASSIST: ${eventPlayer.name}`);
    } else if (type === 'sub') {
      setEventPlayer(null);
      setShowManualSub(true);
      setManualSubOut(eventPlayer);
      return;
    }
    // Save event to backend
    if (matchId) {
      fetch(`${API_URL}/api/matches/${matchId}/events`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ type, minute, player_id: eventPlayer.id, detail }),
      }).catch(() => {});
    }
    setEventPlayer(null);
  };

  // Formation change during match with smart auto-fill
  const changeFormationLive = (newFormation: typeof formation) => {
    // Save current positions for each player before changing
    Object.entries(pitchAssignments).forEach(([idx, player]) => {
      if (player) {
        const slot = activeFormation.positions[Number(idx)];
        if (slot) lastPositionRef.current[player.id] = slot.role;
      }
    });
    setActiveFormation(newFormation);
    addEvent(`FORMATION CHANGE: ${activeFormation.name} -> ${newFormation.name}`);
    if (matchId) {
      fetch(`${API_URL}/api/matches/${matchId}/events`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ type: 'formation_change', minute: Math.floor(elapsedSec / 60), detail: `${activeFormation.name} -> ${newFormation.name}` }),
      }).catch(() => {});
    }
    setShowFormationPicker(false);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Build pitch assignments using activeFormation with smart auto-fill
  const pitchAssignments: { [key: number]: PlayerData | null } = {};
  const pitchPlayers = matchStatus === 'setup' ? starters : onPitch;
  const POSITION_GROUPS: Record<string, string[]> = {
    GK: ['GK'],
    DEF: ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF', 'Fixo'],
    MID: ['CM', 'CDM', 'CAM', 'LM', 'RM', 'LAM', 'RAM', 'MID', 'Ala'],
    FWD: ['ST', 'CF', 'LW', 'RW', 'FWD', 'Pivot'],
  };
  const getGroup = (role: string): string => {
    for (const [group, roles] of Object.entries(POSITION_GROUPS)) {
      if (roles.includes(role)) return group;
    }
    return 'MID';
  };
  const usedIds = new Set<string>();
  // Pass 0: exact last-position match (for mid-match formation changes)
  activeFormation.positions.forEach((slot, idx) => {
    const m = pitchPlayers.find(p => !usedIds.has(p.id) && lastPositionRef.current[p.id] === slot.role);
    if (m) { pitchAssignments[idx] = m; usedIds.add(m.id); }
  });
  // Pass 1: exact preferred position match
  activeFormation.positions.forEach((slot, idx) => {
    if (pitchAssignments[idx]) return;
    const m = pitchPlayers.find(p => !usedIds.has(p.id) && p.position === slot.role);
    if (m) { pitchAssignments[idx] = m; usedIds.add(m.id); }
  });
  // Pass 2: group match
  activeFormation.positions.forEach((slot, idx) => {
    if (pitchAssignments[idx]) return;
    const g = getGroup(slot.role);
    const m = pitchPlayers.find(p => !usedIds.has(p.id) && getGroup(p.position) === g);
    if (m) { pitchAssignments[idx] = m; usedIds.add(m.id); }
  });
  // Pass 3: any remaining
  activeFormation.positions.forEach((_, idx) => {
    if (pitchAssignments[idx]) return;
    const m = pitchPlayers.find(p => !usedIds.has(p.id));
    if (m) { pitchAssignments[idx] = m; usedIds.add(m.id); }
  });

  const pendingSubs = subPlan.filter(s => !s.done);
  const doneSubs = subPlan.filter(s => s.done);

  // ===================== SETUP VIEW =====================
  if (matchStatus === 'setup') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.setupHeader}>
            <MaterialCommunityIcons name="whistle" size={36} color={Colors.primary} />
            <Text style={styles.setupTitle}>MATCH MODE</Text>
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

          <Text style={styles.label}>MINUTES PER HALF</Text>
          <View style={styles.chipRow}>
            {[10, 15, 20, 25, 30, 35, 40, 45].map(d => (
              <TouchableOpacity
                key={d}
                testID={`halftime-${d}`}
                style={[styles.chip, halfDuration === d && styles.chipActive]}
                onPress={() => setHalfDuration(d)}
              >
                <Text style={[styles.chipText, halfDuration === d && styles.chipTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.totalTimeHint}>
            Total match time: {totalMatchMinutes} min ({halfDuration} x 2 halves)
          </Text>

          <Text style={styles.label}>SUBSTITUTION MODE</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              testID="sub-mode-auto"
              style={[styles.modeCard, subMode === 'auto' && styles.modeCardActive]}
              onPress={() => setSubMode('auto')}
            >
              <MaterialCommunityIcons name="robot" size={24} color={subMode === 'auto' ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.modeTitle, subMode === 'auto' && styles.modeTitleActive]}>AUTO</Text>
              <Text style={styles.modeDesc}>Equal play time (exc. GK){'\n'}Players rotate in & out</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="sub-mode-manual"
              style={[styles.modeCard, subMode === 'manual' && styles.modeCardActive]}
              onPress={() => setSubMode('manual')}
            >
              <MaterialCommunityIcons name="account-edit" size={24} color={subMode === 'manual' ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.modeTitle, subMode === 'manual' && styles.modeTitleActive]}>MANUAL</Text>
              <Text style={styles.modeDesc}>You decide when to sub</Text>
            </TouchableOpacity>
          </View>

          {/* Expected Playing Time */}
          {playtimePreview.length > 0 && (
            <>
              <Text style={styles.label}>EXPECTED PLAYING TIME</Text>
              <View style={styles.playtimeList}>
                {playtimePreview.map(pt => (
                  <View key={pt.id} style={styles.playtimeRow}>
                    <View style={styles.playtimeLeft}>
                      <View style={[styles.playtimeDot, pt.isGK && styles.playtimeDotGK]}>
                        <Text style={styles.playtimeDotText}>{pt.number}</Text>
                      </View>
                      <Text style={styles.playtimeName} numberOfLines={1}>{pt.name}</Text>
                    </View>
                    <View style={styles.playtimeRight}>
                      <View style={styles.playtimeBarBg}>
                        <View style={[styles.playtimeBarFill, { width: `${Math.min(100, (pt.expectedMinutes / totalMatchMinutes) * 100)}%` }]} />
                      </View>
                      <Text style={styles.playtimeMinText}>{pt.expectedMinutes} min</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Sub Plan Preview */}
          {subPlan.length > 0 && (
            <>
              <Text style={styles.label}>SUBSTITUTION PLAN ({subPlan.length} subs)</Text>
              {subPlan.map((sub, i) => (
                <View key={i} style={styles.subRow}>
                  <View style={styles.subMinBadge}>
                    <Text style={styles.subMinText}>{sub.minute}'</Text>
                  </View>
                  <Text style={styles.subText} numberOfLines={1}>{sub.playerOutName}</Text>
                  <MaterialCommunityIcons name="swap-horizontal" size={14} color={Colors.primary} />
                  <Text style={styles.subText} numberOfLines={1}>{sub.playerInName}</Text>
                </View>
              ))}
            </>
          )}

          {subs.length === 0 && (
            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information-outline" size={16} color={Colors.warning} />
              <Text style={styles.infoText}>No substitutes. All players are starters.</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity testID="start-match-btn" style={styles.startBtn} onPress={startMatch}>
            <MaterialCommunityIcons name="play" size={24} color={Colors.white} />
            <Text style={styles.startBtnText}>START MATCH</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ===================== POST-MATCH REVIEW =====================
  if (matchStatus === 'review') {
    return (
      <View style={styles.container}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.setupHeader}>
              <MaterialCommunityIcons name="clipboard-check" size={36} color={Colors.primary} />
              <Text style={styles.setupTitle}>POST-MATCH</Text>
              <Text style={styles.setupSub}>Rate players & write notes</Text>
            </View>

            <View style={styles.matchSummary}>
              <Text style={styles.summaryScore}>{scoreHome} - {scoreAway}</Text>
              <Text style={styles.summaryText}>
                vs {opponent || 'Unknown'} · {formatTime(elapsedSec)} played
              </Text>
            </View>

            {playerRatings.map((pr, idx) => {
              const player = allPlayers.find(p => p.id === pr.playerId);
              return (
                <View key={pr.playerId} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>{player?.number || '?'}</Text>
                    </View>
                    <Text style={styles.reviewName}>{pr.playerName}</Text>
                    <View style={[
                      styles.ratingBadge,
                      { backgroundColor: pr.rating >= 7 ? 'rgba(0,200,83,0.15)' : pr.rating >= 4 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)' },
                    ]}>
                      <Text style={[
                        styles.ratingBadgeText,
                        { color: pr.rating >= 7 ? Colors.primary : pr.rating >= 4 ? Colors.warning : Colors.destructive },
                      ]}>{pr.rating}/10</Text>
                    </View>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ratingScroll}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
                      <TouchableOpacity
                        key={r}
                        testID={`review-rating-${pr.playerId}-${r}`}
                        style={[styles.ratingDot, pr.rating === r && styles.ratingDotActive]}
                        onPress={() => {
                          setPlayerRatings(prev => prev.map((p, i) => i === idx ? { ...p, rating: r } : p));
                        }}
                      >
                        <Text style={[styles.ratingDotText, pr.rating === r && { color: Colors.white }]}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TextInput
                    testID={`review-note-${pr.playerId}`}
                    style={styles.reviewNoteInput}
                    value={pr.note}
                    onChangeText={(text) => {
                      setPlayerRatings(prev => prev.map((p, i) => i === idx ? { ...p, note: text } : p));
                    }}
                    placeholder="Notes on performance..."
                    placeholderTextColor={Colors.textMuted}
                    multiline
                  />
                </View>
              );
            })}

            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.bottomBar}>
          <View style={styles.reviewActions}>
            <TouchableOpacity testID="skip-review-btn" style={styles.skipBtn} onPress={() => router.replace('/')}>
              <Text style={styles.skipBtnText}>SKIP</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="save-review-btn"
              style={[styles.saveReviewBtn, savingReview && { opacity: 0.5 }]}
              onPress={saveReview}
              disabled={savingReview}
            >
              <MaterialCommunityIcons name="check" size={18} color={Colors.white} />
              <Text style={styles.saveReviewText}>{savingReview ? 'SAVING...' : 'SAVE & FINISH'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ===================== LIVE / PAUSED / ENDED =====================
  const progress = Math.min(elapsedSec / (totalMatchMinutes * 60), 1);
  const halfLabel = currentHalf === 1 ? '1st Half' : '2nd Half';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Timer */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>
            {matchStatus === 'ended' ? 'FULL TIME' : matchStatus === 'paused' && events[events.length - 1]?.includes('HALF TIME') ? 'HALF TIME' : matchStatus === 'paused' ? 'PAUSED' : halfLabel.toUpperCase()}
          </Text>
          <Text style={styles.timerDisplay}>{formatTime(elapsedSec)}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            {/* Halftime marker */}
            <View style={styles.halfMarker} />
          </View>
          <Text style={styles.timerMeta}>{opponent ? `vs ${opponent}` : ''} · {halfDuration}m x 2</Text>
        </View>

        {/* Scoreboard */}
        <View style={styles.scoreboardContainer}>
          <View style={styles.scoreTeam}>
            <Text style={styles.scoreTeamName} numberOfLines={1}>{currentTeam?.name || 'HOME'}</Text>
            <View style={styles.scoreControls}>
              <TouchableOpacity style={styles.scoreBtn} onPress={() => setScoreHome(Math.max(0, scoreHome - 1))}>
                <MaterialCommunityIcons name="minus" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
              <Text style={styles.scoreValue}>{scoreHome}</Text>
              <TouchableOpacity style={styles.scoreBtnPlus} onPress={() => {
                setScoreHome(scoreHome + 1);
                addEvent(`GOAL! ${currentTeam?.name || 'Home'} (${scoreHome + 1}-${scoreAway})`);
              }}>
                <MaterialCommunityIcons name="plus" size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.scoreDivider}>-</Text>
          <View style={styles.scoreTeam}>
            <Text style={styles.scoreTeamName} numberOfLines={1}>{opponent || 'AWAY'}</Text>
            <View style={styles.scoreControls}>
              <TouchableOpacity style={styles.scoreBtn} onPress={() => setScoreAway(Math.max(0, scoreAway - 1))}>
                <MaterialCommunityIcons name="minus" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
              <Text style={styles.scoreValue}>{scoreAway}</Text>
              <TouchableOpacity style={styles.scoreBtnPlus} onPress={() => {
                setScoreAway(scoreAway + 1);
                addEvent(`GOAL! ${opponent || 'Away'} (${scoreHome}-${scoreAway + 1})`);
              }}>
                <MaterialCommunityIcons name="plus" size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlRow}>
          {matchStatus === 'live' && (
            <>
              <TouchableOpacity testID="pause-btn" style={styles.controlBtn} onPress={pauseMatch}>
                <MaterialCommunityIcons name="pause" size={28} color={Colors.warning} />
                <Text style={[styles.controlLabel, { color: Colors.warning }]}>PAUSE</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="manual-sub-btn" style={styles.controlBtn} onPress={() => setShowManualSub(true)}>
                <MaterialCommunityIcons name="swap-horizontal-bold" size={28} color={Colors.accent} />
                <Text style={[styles.controlLabel, { color: Colors.accent }]}>SUB</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="coaching-btn" style={styles.controlBtn} onPress={() => setShowCoaching(true)}>
                <MaterialCommunityIcons name="clipboard-text" size={28} color="#8B5CF6" />
                <Text style={[styles.controlLabel, { color: '#8B5CF6' }]}>COACH</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="formation-btn" style={styles.controlBtn} onPress={() => setShowFormationPicker(true)}>
                <MaterialCommunityIcons name="strategy" size={28} color="#F59E0B" />
                <Text style={[styles.controlLabel, { color: '#F59E0B' }]}>FORM</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="end-btn" style={styles.controlBtn} onPress={() => setShowEndConfirm(true)}>
                <MaterialCommunityIcons name="stop" size={28} color={Colors.destructive} />
                <Text style={[styles.controlLabel, { color: Colors.destructive }]}>END</Text>
              </TouchableOpacity>
            </>
          )}
          {matchStatus === 'paused' && (
            <>
              <TouchableOpacity testID="resume-btn" style={styles.controlBtn} onPress={resumeMatch}>
                <MaterialCommunityIcons name="play" size={28} color={Colors.primary} />
                <Text style={[styles.controlLabel, { color: Colors.primary }]}>
                  {events[events.length - 1]?.includes('HALF TIME') ? '2ND HALF' : 'RESUME'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity testID="manual-sub-btn-paused" style={styles.controlBtn} onPress={() => setShowManualSub(true)}>
                <MaterialCommunityIcons name="swap-horizontal-bold" size={28} color={Colors.accent} />
                <Text style={[styles.controlLabel, { color: Colors.accent }]}>SUB</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="coaching-btn-paused" style={styles.controlBtn} onPress={() => setShowCoaching(true)}>
                <MaterialCommunityIcons name="clipboard-text" size={28} color="#8B5CF6" />
                <Text style={[styles.controlLabel, { color: '#8B5CF6' }]}>COACH</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="formation-btn-paused" style={styles.controlBtn} onPress={() => setShowFormationPicker(true)}>
                <MaterialCommunityIcons name="strategy" size={28} color="#F59E0B" />
                <Text style={[styles.controlLabel, { color: '#F59E0B' }]}>FORM</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="end-btn-paused" style={styles.controlBtn} onPress={() => setShowEndConfirm(true)}>
                <MaterialCommunityIcons name="stop" size={28} color={Colors.destructive} />
                <Text style={[styles.controlLabel, { color: Colors.destructive }]}>END</Text>
              </TouchableOpacity>
            </>
          )}
          {matchStatus === 'ended' && (
            <>
              <TouchableOpacity testID="review-btn" style={styles.controlBtn} onPress={startReview}>
                <MaterialCommunityIcons name="star" size={28} color={Colors.primary} />
                <Text style={[styles.controlLabel, { color: Colors.primary }]}>RATE</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="new-match-btn" style={styles.controlBtn} onPress={() => router.replace('/')}>
                <MaterialCommunityIcons name="home" size={28} color={Colors.accent} />
                <Text style={[styles.controlLabel, { color: Colors.accent }]}>HOME</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Pitch with live updates */}
        <View>
          <PitchView
            key={`live-${activeFormation.id}-${onPitch.map(p=>p.id).join('-')}`}
            positions={activeFormation.positions}
            assignedPlayers={pitchAssignments}
            compact sport={sport}
            tacticalArrows={activeCoachingOverlay?.arrows || []}
            onPositionPress={handlePitchTap}
          />
          {activeCoachingOverlay && (
            <View style={styles.coachOverlayBanner}>
              <View style={[styles.coachOverlayDot, { backgroundColor: activeCoachingOverlay.color }]} />
              <Text style={styles.coachOverlayText} numberOfLines={1}>{activeCoachingOverlay.suggestion}</Text>
              <TouchableOpacity onPress={() => setActiveCoachingOverlay(null)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <MaterialCommunityIcons name="close" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent coaching actions */}
        {coachingNotes.length > 0 && (
          <View style={styles.coachNotesSection}>
            <Text style={[styles.label, { marginTop: 8 }]}>ACTIVE TACTICS</Text>
            {coachingNotes.slice(-3).reverse().map((note, i) => (
              <View key={i} style={styles.coachNoteRow}>
                <MaterialCommunityIcons name="clipboard-check" size={14} color="#8B5CF6" />
                <Text style={styles.coachNoteText} numberOfLines={1}>{note}</Text>
              </View>
            ))}
          </View>
        )}

        {/* On Bench */}
        {onBench.length > 0 && (
          <>
            <Text style={[styles.label, { marginTop: 14 }]}>BENCH ({onBench.length})</Text>
            <View style={styles.benchRow}>
              {onBench.map(p => (
                <View key={p.id} style={styles.benchChip}>
                  <Text style={styles.benchNum}>{p.number}</Text>
                  <Text style={styles.benchName}>{p.name.split(' ')[0]}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Upcoming Subs */}
        {pendingSubs.length > 0 && (
          <>
            <Text style={[styles.label, { marginTop: 14 }]}>UPCOMING SUBS ({pendingSubs.length})</Text>
            {pendingSubs.map((sub, i) => (
              <View key={`pending-${i}`} style={styles.subRow}>
                <View style={styles.subMinBadge}>
                  <Text style={styles.subMinText}>{sub.minute}'</Text>
                </View>
                <Text style={styles.subText} numberOfLines={1}>{sub.playerOutName}</Text>
                <MaterialCommunityIcons name="arrow-right" size={14} color={Colors.primary} />
                <Text style={styles.subText} numberOfLines={1}>{sub.playerInName}</Text>
              </View>
            ))}
          </>
        )}

        {/* Completed Subs */}
        {doneSubs.length > 0 && (
          <>
            <Text style={[styles.label, { marginTop: 14 }]}>COMPLETED SUBS ({doneSubs.length})</Text>
            {doneSubs.map((sub, i) => (
              <View key={`done-${i}`} style={[styles.subRow, { opacity: 0.5 }]}>
                <View style={[styles.subMinBadge, { backgroundColor: 'rgba(0,200,83,0.2)' }]}>
                  <Text style={[styles.subMinText, { color: Colors.primary }]}>{sub.minute}'</Text>
                </View>
                <Text style={styles.subText}>{sub.playerOutName}</Text>
                <MaterialCommunityIcons name="check" size={14} color={Colors.primary} />
                <Text style={styles.subText}>{sub.playerInName}</Text>
              </View>
            ))}
          </>
        )}

        {/* Match Log */}
        <Text style={[styles.label, { marginTop: 14 }]}>MATCH LOG</Text>
        {events.map((e, i) => (
          <Text key={i} style={styles.eventText}>{e}</Text>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sub Alert Modal */}
      <Modal visible={currentSubAlert !== null} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <MaterialCommunityIcons name="swap-horizontal-bold" size={40} color={Colors.primary} />
            <Text style={styles.alertTitle}>SUBSTITUTION</Text>
            <Text style={styles.alertTime}>{currentSubAlert?.minute}' minute</Text>
            {subAlertQueue.length > 1 && (
              <Text style={styles.queueHint}>{subAlertQueue.length} subs due — showing 1 of {subAlertQueue.length}</Text>
            )}
            <View style={styles.alertSubRow}>
              <View style={styles.alertPlayer}>
                <MaterialCommunityIcons name="arrow-down" size={20} color={Colors.destructive} />
                <Text style={styles.alertPlayerName}>{currentSubAlert?.playerOutName}</Text>
              </View>
              <View style={styles.alertPlayer}>
                <MaterialCommunityIcons name="arrow-up" size={20} color={Colors.primary} />
                <Text style={styles.alertPlayerName}>{currentSubAlert?.playerInName}</Text>
              </View>
            </View>
            <View style={styles.alertActions}>
              <TouchableOpacity testID="confirm-sub-btn" style={styles.alertConfirm} onPress={() => currentSubAlert && confirmSub(currentSubAlert)}>
                <Text style={styles.alertConfirmText}>CONFIRM SUB</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="skip-sub-btn" style={styles.alertSkip} onPress={skipSub}>
                <Text style={styles.alertSkipText}>SKIP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* End Match Confirm Modal */}
      <Modal visible={showEndConfirm} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <MaterialCommunityIcons name="whistle" size={40} color={Colors.destructive} />
            <Text style={styles.alertTitle}>END MATCH?</Text>
            <Text style={styles.alertTime}>Current time: {formatTime(elapsedSec)}</Text>
            <View style={styles.alertActions}>
              <TouchableOpacity testID="confirm-end-btn" style={[styles.alertConfirm, { backgroundColor: Colors.destructive }]} onPress={() => { setShowEndConfirm(false); doEndMatch(); }}>
                <Text style={styles.alertConfirmText}>END MATCH</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="cancel-end-btn" style={styles.alertSkip} onPress={() => setShowEndConfirm(false)}>
                <Text style={styles.alertSkipText}>CONTINUE PLAYING</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual Sub Modal */}
      <Modal visible={showManualSub} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Substitution</Text>
              <TouchableOpacity testID="close-manual-sub" onPress={() => { setShowManualSub(false); setManualSubOut(null); setManualSubIn(null); }}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>PLAYER OUT (on pitch)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {onPitch.filter(p => p.position !== 'GK').map(p => (
                <TouchableOpacity
                  key={p.id}
                  testID={`sub-out-${p.id}`}
                  style={[styles.subSelectChip, manualSubOut?.id === p.id && styles.subSelectChipActiveOut]}
                  onPress={() => setManualSubOut(p)}
                >
                  <Text style={styles.subSelectNum}>{p.number}</Text>
                  <Text style={[styles.subSelectName, manualSubOut?.id === p.id && { color: Colors.white }]}>{p.name.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>PLAYER IN (from bench)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {onBench.map(p => (
                <TouchableOpacity
                  key={p.id}
                  testID={`sub-in-${p.id}`}
                  style={[styles.subSelectChip, manualSubIn?.id === p.id && styles.subSelectChipActiveIn]}
                  onPress={() => setManualSubIn(p)}
                >
                  <Text style={styles.subSelectNum}>{p.number}</Text>
                  <Text style={[styles.subSelectName, manualSubIn?.id === p.id && { color: Colors.white }]}>{p.name.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
              {onBench.length === 0 && <Text style={styles.emptyText}>No players on bench</Text>}
            </ScrollView>

            {manualSubOut && manualSubIn && (
              <View style={styles.subPreview}>
                <Text style={styles.subPreviewText}>
                  {manualSubOut.name} -> {manualSubIn.name}
                </Text>
              </View>
            )}

            <TouchableOpacity
              testID="execute-manual-sub-btn"
              style={[styles.alertConfirm, (!manualSubOut || !manualSubIn) && { opacity: 0.4 }]}
              onPress={executeManualSub}
              disabled={!manualSubOut || !manualSubIn}
            >
              <Text style={styles.alertConfirmText}>MAKE SUBSTITUTION</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Player Event Popup */}
      <Modal visible={eventPlayer !== null} transparent animationType="fade">
        <TouchableOpacity style={styles.alertOverlay} activeOpacity={1} onPress={() => setEventPlayer(null)}>
          <View style={styles.eventPopup}>
            <View style={styles.eventPlayerInfo}>
              <View style={styles.eventAvatar}>
                <Text style={styles.eventAvatarText}>{eventPlayer?.number}</Text>
              </View>
              <Text style={styles.eventPlayerName}>{eventPlayer?.name}</Text>
            </View>
            <View style={styles.eventBtnRow}>
              <TouchableOpacity testID="event-goal-btn" style={[styles.eventBtn, { backgroundColor: 'rgba(0,200,83,0.15)' }]} onPress={() => logPlayerEvent('goal')}>
                <MaterialCommunityIcons name="soccer" size={20} color={Colors.primary} />
                <Text style={[styles.eventBtnText, { color: Colors.primary }]}>Goal</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="event-assist-btn" style={[styles.eventBtn, { backgroundColor: 'rgba(139,92,246,0.15)' }]} onPress={() => logPlayerEvent('assist')}>
                <MaterialCommunityIcons name="shoe-cleat" size={20} color="#8B5CF6" />
                <Text style={[styles.eventBtnText, { color: '#8B5CF6' }]}>Assist</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="event-yellow-btn" style={[styles.eventBtn, { backgroundColor: 'rgba(245,158,11,0.15)' }]} onPress={() => logPlayerEvent('yellow')}>
                <View style={{ width: 14, height: 18, backgroundColor: '#F59E0B', borderRadius: 2 }} />
                <Text style={[styles.eventBtnText, { color: '#F59E0B' }]}>Yellow</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.eventBtnRow, { marginTop: 6 }]}>
              <TouchableOpacity testID="event-red-btn" style={[styles.eventBtn, { backgroundColor: 'rgba(239,68,68,0.15)' }]} onPress={() => logPlayerEvent('red')}>
                <View style={{ width: 14, height: 18, backgroundColor: '#EF4444', borderRadius: 2 }} />
                <Text style={[styles.eventBtnText, { color: '#EF4444' }]}>Red</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="event-sub-btn" style={[styles.eventBtn, { backgroundColor: 'rgba(59,130,246,0.15)' }]} onPress={() => logPlayerEvent('sub')}>
                <MaterialCommunityIcons name="swap-horizontal-bold" size={20} color="#3B82F6" />
                <Text style={[styles.eventBtnText, { color: '#3B82F6' }]}>Sub</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Formation Picker Modal */}
      <Modal visible={showFormationPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Formation</Text>
              <TouchableOpacity onPress={() => setShowFormationPicker(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, color: Colors.textMuted, marginBottom: 10 }}>
              Current: {activeFormation.name} · Players will be auto-assigned by position
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {formations.map(f => (
                <TouchableOpacity
                  key={f.id}
                  testID={`match-formation-${f.id}`}
                  style={[styles.formPickerRow, activeFormation.id === f.id && styles.formPickerRowActive]}
                  onPress={() => changeFormationLive(f)}
                >
                  <View>
                    <Text style={[styles.formPickerName, activeFormation.id === f.id && { color: Colors.primary }]}>{f.name}</Text>
                    <Text style={styles.formPickerDesc}>{f.displayName}</Text>
                  </View>
                  {activeFormation.id === f.id && <MaterialCommunityIcons name="check-circle" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Coaching Panel Modal */}
      <Modal visible={showCoaching} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalHeadText}>
                {selectedCoachCat ? selectedCoachCat.label : 'In-Match Coaching'}
              </Text>
              <TouchableOpacity onPress={() => {
                if (selectedCoachCat) setSelectedCoachCat(null);
                else setShowCoaching(false);
              }}>
                <MaterialCommunityIcons name={selectedCoachCat ? "arrow-left" : "close"} size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {!selectedCoachCat ? (
              <ScrollView>
                {coachingCategories.map(cat => (
                  <TouchableOpacity key={cat.id} style={styles.coachCatRow} onPress={() => setSelectedCoachCat(cat)}>
                    <View style={[styles.coachCatIcon, { backgroundColor: cat.color + '20' }]}>
                      <MaterialCommunityIcons name={cat.icon as any} size={20} color={cat.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.coachCatLabel}>{cat.label}</Text>
                      <Text style={styles.coachCatCount}>{cat.suggestions.length} tactics</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <ScrollView>
                {selectedCoachCat.suggestions.map(sug => (
                  <View key={sug.id} style={styles.coachSugCard}>
                    <View style={styles.coachRow}>
                      <View style={[styles.coachDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={styles.coachProblem}>{sug.problem}</Text>
                    </View>
                    <View style={styles.coachRow}>
                      <View style={[styles.coachDot, { backgroundColor: '#00C853' }]} />
                      <Text style={styles.coachPrinciple}>{sug.principle}</Text>
                    </View>

                    <View style={styles.coachActions}>
                      {sug.actions.map((a, i) => (
                        <View key={i} style={styles.coachActionRow}>
                          <Text style={styles.coachBullet}>{'\u2022'}</Text>
                          <Text style={styles.coachActionText}>{a}</Text>
                        </View>
                      ))}
                    </View>

                    <TouchableOpacity style={[styles.coachApplyBtn, { backgroundColor: selectedCoachCat.color }]} onPress={() => {
                      const note = `[${formatTime(elapsedSec)}] ${selectedCoachCat.label}: ${sug.quotedBy} - ${sug.actions[0]}`;
                      setCoachingNotes(prev => [...prev, note]);
                      addEvent(`Coach: ${sug.quotedBy} tactic`);
                      setActiveCoachingOverlay({
                        category: selectedCoachCat.label,
                        suggestion: `${sug.quotedBy}: ${sug.actions[0]}`,
                        color: selectedCoachCat.color,
                        arrows: sug.arrows,
                      });
                      setShowCoaching(false);
                      setSelectedCoachCat(null);
                    }}>
                      <MaterialCommunityIcons name="check" size={14} color={Colors.white} />
                      <Text style={styles.coachApplyText}>APPLY ON PITCH</Text>
                    </TouchableOpacity>

                    <Text style={styles.coachQuote}>{sug.quote}</Text>
                    <Text style={styles.coachQuotedBy}>-- {sug.quotedBy}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  setupHeader: { alignItems: 'center', paddingVertical: 20 },
  setupTitle: { fontSize: 26, fontWeight: '900', color: Colors.white, marginTop: 10, letterSpacing: 2 },
  setupSub: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2, marginBottom: 8, marginTop: 10 },
  totalTimeHint: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2, marginBottom: 4 },
  input: {
    height: 48, backgroundColor: Colors.backgroundSecondary, borderWidth: 1,
    borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14,
    color: Colors.white, fontSize: 15, marginBottom: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.1)' },
  chipText: { fontSize: 15, fontWeight: '700', color: Colors.textMuted },
  chipTextActive: { color: Colors.primary },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  modeCard: {
    flex: 1, backgroundColor: Colors.backgroundSecondary, borderRadius: 12,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  modeCardActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.06)' },
  modeTitle: { fontSize: 14, fontWeight: '800', color: Colors.textMuted, marginTop: 6, letterSpacing: 1 },
  modeTitleActive: { color: Colors.primary },
  modeDesc: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },

  // Playtime preview
  playtimeList: { gap: 4 },
  playtimeRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary, borderRadius: 8,
    padding: 8, borderWidth: 1, borderColor: Colors.border,
  },
  playtimeLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 120 },
  playtimeDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.primary,
  },
  playtimeDotGK: { borderColor: Colors.warning },
  playtimeDotText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  playtimeName: { fontSize: 12, fontWeight: '600', color: Colors.white, flex: 1 },
  playtimeRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  playtimeBarBg: {
    flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden',
  },
  playtimeBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  playtimeMinText: { fontSize: 11, fontWeight: '700', color: Colors.primary, minWidth: 44, textAlign: 'right' },

  subRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.backgroundSecondary, borderRadius: 8,
    padding: 10, marginBottom: 4, borderWidth: 1, borderColor: Colors.border,
  },
  subMinBadge: { backgroundColor: 'rgba(0,200,83,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  subMinText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  subText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 8,
    padding: 12, marginTop: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
  },
  infoText: { fontSize: 13, color: Colors.warning, flex: 1 },
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
  timerContainer: { alignItems: 'center', paddingVertical: 16 },
  timerLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 3 },
  timerDisplay: { fontSize: 60, fontWeight: '900', color: Colors.white, letterSpacing: -2 },
  progressBar: { width: '100%', height: 4, backgroundColor: Colors.border, borderRadius: 2, marginTop: 6, overflow: 'hidden', position: 'relative' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  halfMarker: { position: 'absolute', left: '50%', top: -2, width: 2, height: 8, backgroundColor: Colors.textMuted, borderRadius: 1 },
  timerMeta: { fontSize: 13, color: Colors.textMuted, marginTop: 6 },
  controlRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 12 },
  controlBtn: { alignItems: 'center', padding: 10, minWidth: 60 },
  controlLabel: { fontSize: 10, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
  benchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  benchChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.backgroundSecondary, paddingHorizontal: 8,
    paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: Colors.border,
  },
  benchNum: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  benchName: { fontSize: 12, color: Colors.textSecondary },
  eventText: { fontSize: 11, color: Colors.textMuted, paddingVertical: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  alertCard: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 20, padding: 28,
    alignItems: 'center', width: '100%', borderWidth: 2, borderColor: Colors.primary,
  },
  alertTitle: { fontSize: 22, fontWeight: '900', color: Colors.white, marginTop: 12, letterSpacing: 2 },
  alertTime: { fontSize: 14, color: Colors.primary, marginTop: 4, fontWeight: '700' },
  queueHint: { fontSize: 11, color: Colors.accent, marginTop: 4, fontWeight: '600' },
  alertSubRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 20 },
  alertPlayer: { alignItems: 'center', gap: 4 },
  alertPlayerName: { fontSize: 15, fontWeight: '700', color: Colors.white },
  alertActions: { width: '100%', marginTop: 24, gap: 8 },
  alertConfirm: { backgroundColor: Colors.primary, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  alertConfirmText: { fontSize: 14, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  alertSkip: { height: 44, justifyContent: 'center', alignItems: 'center' },
  alertSkipText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.backgroundSecondary, borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20, paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.white },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalHeadText: { fontSize: 18, fontWeight: '800', color: Colors.white },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 8 },
  subSelectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.card, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, marginRight: 8, borderWidth: 1.5, borderColor: Colors.border,
  },
  subSelectChipActiveOut: { borderColor: Colors.destructive, backgroundColor: 'rgba(239,68,68,0.12)' },
  subSelectChipActiveIn: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.12)' },
  subSelectNum: { fontSize: 14, fontWeight: '800', color: Colors.white },
  subSelectName: { fontSize: 13, color: Colors.textSecondary },
  subPreview: {
    backgroundColor: 'rgba(0,200,83,0.08)', borderRadius: 8, padding: 12,
    marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,200,83,0.2)',
  },
  subPreviewText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  emptyText: { fontSize: 13, color: Colors.textMuted },
  matchSummary: { alignItems: 'center', marginBottom: 16 },
  summaryScore: { fontSize: 36, fontWeight: '900', color: Colors.white, letterSpacing: 2 },
  summaryText: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  reviewCard: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  reviewAvatarText: { fontSize: 14, fontWeight: '900', color: Colors.white },
  reviewName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.white },
  ratingBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  ratingBadgeText: { fontSize: 12, fontWeight: '800' },
  ratingScroll: { marginBottom: 10 },
  ratingDot: {
    width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.card, marginRight: 6, borderWidth: 1, borderColor: Colors.border,
  },
  ratingDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  ratingDotText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  reviewNoteInput: {
    height: 50, backgroundColor: Colors.card, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 8, color: Colors.white, fontSize: 13, borderWidth: 1, borderColor: Colors.border,
  },
  reviewActions: { flexDirection: 'row', gap: 10 },
  skipBtn: { flex: 1, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  skipBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  saveReviewBtn: {
    flex: 2, flexDirection: 'row', height: 48, borderRadius: 10, justifyContent: 'center',
    alignItems: 'center', backgroundColor: Colors.primary, gap: 6,
  },
  saveReviewText: { fontSize: 13, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  scoreboardContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12, gap: 12,
  },
  scoreTeam: { flex: 1, alignItems: 'center' },
  scoreTeamName: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  scoreControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  scoreBtnPlus: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  scoreValue: { fontSize: 28, fontWeight: '900', color: Colors.white, minWidth: 36, textAlign: 'center' },
  scoreDivider: { fontSize: 20, fontWeight: '700', color: Colors.textMuted },
  coachCatRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: Colors.card, borderRadius: 10, marginBottom: 6,
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  coachCatIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  coachCatLabel: { fontSize: 14, fontWeight: '700', color: Colors.white },
  coachCatCount: { fontSize: 11, color: Colors.textMuted },
  coachSugCard: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  coachQuote: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, fontStyle: 'italic', lineHeight: 17, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  coachQuotedBy: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, opacity: 0.7 },
  coachRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  coachDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  coachProblem: { fontSize: 12, color: '#F87171', flex: 1, lineHeight: 16 },
  coachPrinciple: { fontSize: 12, color: '#4ADE80', flex: 1, lineHeight: 16 },
  coachActions: { marginTop: 6, marginBottom: 8, paddingLeft: 4 },
  coachActionRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  coachBullet: { fontSize: 12, color: Colors.textMuted, lineHeight: 16 },
  coachActionText: { fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 16 },
  coachApplyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 8 },
  coachApplyText: { fontSize: 11, fontWeight: '700', color: Colors.white, letterSpacing: 1 },
  coachOverlayBanner: {
    position: 'absolute', bottom: 8, left: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
  },
  coachOverlayDot: { width: 8, height: 8, borderRadius: 4 },
  coachOverlayText: { flex: 1, fontSize: 12, fontWeight: '700', color: Colors.white },
  coachNotesSection: { marginBottom: 8 },
  coachNoteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 5, paddingHorizontal: 8,
    backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 6, marginTop: 4,
  },
  coachNoteText: { flex: 1, fontSize: 11, color: '#C4B5FD' },
  // Event popup
  eventPopup: { backgroundColor: Colors.backgroundSecondary, borderRadius: 16, padding: 16, width: '85%', maxWidth: 340, borderWidth: 1.5, borderColor: Colors.border },
  eventPlayerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  eventAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  eventAvatarText: { fontSize: 14, fontWeight: '900', color: Colors.white },
  eventPlayerName: { fontSize: 16, fontWeight: '800', color: Colors.white, flex: 1 },
  eventBtnRow: { flexDirection: 'row', gap: 8 },
  eventBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, gap: 4 },
  eventBtnText: { fontSize: 11, fontWeight: '700' },
  // Formation picker
  formPickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  formPickerRowActive: { backgroundColor: 'rgba(0,200,83,0.06)' },
  formPickerName: { fontSize: 16, fontWeight: '800', color: Colors.white },
  formPickerDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
});
