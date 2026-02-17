import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Modal, Vibration, Platform, FlatList, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp, PlayerData } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';
import { getFormations, STARTERS_COUNT } from '../src/constants/formations';
import { COACHING_CATEGORIES, CoachingCategory, CoachingSuggestion } from '../src/lib/coaching-data';
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

export default function MatchScreen() {
  const router = useRouter();
  const { sport, format, currentTeam } = useApp();
  const formations = getFormations(sport, format);
  const startersCount = STARTERS_COUNT[format] || 5;

  const [opponent, setOpponent] = useState('');
  const [durationMin, setDurationMin] = useState(format === '11v11' ? 90 : format === '7v7' ? 60 : 40);
  const [subMode, setSubMode] = useState<'manual' | 'auto'>('auto');
  const [matchStatus, setMatchStatus] = useState<'setup' | 'live' | 'paused' | 'ended' | 'review'>('setup');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [subPlan, setSubPlan] = useState<SubEntry[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [matchId, setMatchId] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertedMinsRef = useRef<Set<number>>(new Set());

  // Live tracking
  const [onPitch, setOnPitch] = useState<PlayerData[]>([]);
  const [onBench, setOnBench] = useState<PlayerData[]>([]);

  // Modals
  const [showSubAlert, setShowSubAlert] = useState<SubEntry | null>(null);
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

  // Edit sub plan
  const [editingSubIdx, setEditingSubIdx] = useState<number | null>(null);
  const [editSubOut, setEditSubOut] = useState<PlayerData | null>(null);
  const [editSubIn, setEditSubIn] = useState<PlayerData | null>(null);
  const [showEditSub, setShowEditSub] = useState(false);

  const allPlayers = currentTeam?.players || [];
  const starters = allPlayers.filter(p => p.is_starter);
  const subs = allPlayers.filter(p => !p.is_starter);

  const formation = formations.find(
    f => f.name === currentTeam?.formation || f.id === currentTeam?.formation
  ) || formations[0];

  useEffect(() => {
    if (subMode === 'auto' && subs.length > 0) {
      calculateAutoSubs(starters, subs, 0, durationMin);
    } else {
      setSubPlan([]);
    }
  }, [subMode, durationMin]);

  const calculateAutoSubs = (
    currentStarters: PlayerData[],
    currentSubs: PlayerData[],
    fromMinute: number,
    totalMinutes: number
  ) => {
    const outfield = currentStarters.filter(p => p.position !== 'GK');
    if (currentSubs.length === 0 || outfield.length === 0) {
      setSubPlan([]);
      return;
    }
    const remainingTime = totalMinutes - fromMinute;
    const interval = Math.floor(remainingTime / (currentSubs.length + 1));
    const plan: SubEntry[] = currentSubs.map((sub, i) => ({
      minute: fromMinute + interval * (i + 1),
      playerOutId: outfield[i % outfield.length].id,
      playerOutName: outfield[i % outfield.length].name,
      playerInId: sub.id,
      playerInName: sub.name,
      done: false,
    }));
    setSubPlan(prev => {
      const doneSubs = prev.filter(s => s.done);
      return [...doneSubs, ...plan];
    });
  };

  const startMatch = async () => {
    setOnPitch([...starters]);
    setOnBench([...subs]);

    const startingLineup = starters.map(p => ({ id: p.id, name: p.name, number: p.number, position: p.position }));

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
    setEvents([`00:00 — Match started`]);
    startTimer();
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSec(prev => prev + 1);
    }, 1000);
  };

  useEffect(() => {
    if (matchStatus !== 'live') return;
    const currentMin = Math.floor(elapsedSec / 60);
    if (currentMin >= durationMin) {
      doEndMatch();
      return;
    }
    subPlan.forEach(sub => {
      if (!sub.done && currentMin >= sub.minute && !alertedMinsRef.current.has(sub.minute)) {
        alertedMinsRef.current.add(sub.minute);
        setShowSubAlert(sub);
        if (Platform.OS !== 'web') Vibration.vibrate([0, 200, 100, 200]);
      }
    });
  }, [elapsedSec, matchStatus]);

  const pauseMatch = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setMatchStatus('paused');
    addEvent('Match paused');
  };

  const resumeMatch = () => {
    setMatchStatus('live');
    startTimer();
    addEvent('Match resumed');
  };

  const doEndMatch = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setMatchStatus('ended');
    addEvent(`FULL TIME — Score: ${scoreHome}-${scoreAway}`);
    if (matchId) {
      fetch(`${API_URL}/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          score_home: scoreHome,
          score_away: scoreAway,
          events: [...events, `${formatTime(elapsedSec)} — FULL TIME`].map((e, i) => ({ type: 'event', minute: i, detail: e })),
          coaching_notes: coachingNotes.map(n => ({ note: n })),
        }),
      }).catch(() => {});
    }
  };

  const addEvent = (text: string) => {
    setEvents(prev => [...prev, `${formatTime(elapsedSec)} — ${text}`]);
  };

  // Confirm planned sub
  const confirmSub = (sub: SubEntry) => {
    executeSub(sub.playerOutId, sub.playerOutName, sub.playerInId, sub.playerInName, true);
    setShowSubAlert(null);
  };

  // Execute any sub (planned or manual)
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
        s.playerOutId === outId && s.playerInId === inId ? { ...s, done: true } : s
      ));
    }

    addEvent(`SUB: ${outName} ↔ ${inName}${!isPlanned ? ' (manual)' : ''}`);

    // Recalculate remaining auto-subs if auto mode
    if (subMode === 'auto') {
      setTimeout(() => {
        setOnPitch(currentPitch => {
          setOnBench(currentBench => {
            const remaining = currentBench.filter(p =>
              !subPlan.some(s => s.done && s.playerInId === p.id)
            );
            const undoneSubs = remaining.filter(p => p.id !== inId);
            if (undoneSubs.length > 0) {
              const currentMin = Math.floor(elapsedSec / 60);
              const outfield = currentPitch.filter(p => p.position !== 'GK');
              const remainingTime = durationMin - currentMin;
              const interval = Math.max(1, Math.floor(remainingTime / (undoneSubs.length + 1)));

              const newPlan: SubEntry[] = undoneSubs.map((sub, i) => ({
                minute: currentMin + interval * (i + 1),
                playerOutId: outfield[i % outfield.length].id,
                playerOutName: outfield[i % outfield.length].name,
                playerInId: sub.id,
                playerInName: sub.name,
                done: false,
              }));

              setSubPlan(prev => [...prev.filter(s => s.done), ...newPlan]);
            }
            return currentBench;
          });
          return currentPitch;
        });
      }, 100);
    }
  };

  // Manual sub
  const executeManualSub = () => {
    if (!manualSubOut || !manualSubIn) return;
    executeSub(manualSubOut.id, manualSubOut.name, manualSubIn.id, manualSubIn.name, false);

    // Remove any planned sub involving the subbed-out player
    setSubPlan(prev => prev.filter(s => {
      if (s.done) return true;
      return s.playerOutId !== manualSubOut.id && s.playerInId !== manualSubIn.id;
    }));

    setShowManualSub(false);
    setManualSubOut(null);
    setManualSubIn(null);
  };

  // Post-match review
  const startReview = () => {
    const played = new Set<string>();
    starters.forEach(p => played.add(p.id));
    subPlan.filter(s => s.done).forEach(s => played.add(s.playerInId));
    events.forEach(e => {
      if (e.includes('SUB:')) {
        const match = e.match(/SUB: .+ ↔ (.+?)( \(|$)/);
        if (match) {
          const player = allPlayers.find(p => p.name === match[1].trim());
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
            headers: { 'Content-Type': 'application/json' },
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

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Build pitch assignments from current on-pitch players, mapping by position
  const pitchAssignments: { [key: number]: PlayerData | null } = {};
  const pitchPlayers = matchStatus === 'setup' ? starters : onPitch;

  // Smart assignment: try to match players to formation slots by position
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
  // Pass 1: exact position match
  formation.positions.forEach((slot, idx) => {
    const match = pitchPlayers.find(p => !usedIds.has(p.id) && p.position === slot.role);
    if (match) { pitchAssignments[idx] = match; usedIds.add(match.id); }
  });
  // Pass 2: group match
  formation.positions.forEach((slot, idx) => {
    if (pitchAssignments[idx]) return;
    const g = getGroup(slot.role);
    const match = pitchPlayers.find(p => !usedIds.has(p.id) && getGroup(p.position) === g);
    if (match) { pitchAssignments[idx] = match; usedIds.add(match.id); }
  });
  // Pass 3: any remaining
  formation.positions.forEach((_, idx) => {
    if (pitchAssignments[idx]) return;
    const match = pitchPlayers.find(p => !usedIds.has(p.id));
    if (match) { pitchAssignments[idx] = match; usedIds.add(match.id); }
  });

  // Track active coaching overlay for pitch
  const [activeCoachingOverlay, setActiveCoachingOverlay] = useState<{category: string, suggestion: string, color: string} | null>(null);

  const pendingSubs = subPlan.filter(s => !s.done);
  const doneSubs = subPlan.filter(s => s.done);

  // ===================== SETUP VIEW =====================
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
          <View style={styles.chipRow}>
            {[20, 30, 40, 50, 60, 70, 80, 90].map(d => (
              <TouchableOpacity
                key={d}
                testID={`duration-${d}`}
                style={[styles.chip, durationMin === d && styles.chipActive]}
                onPress={() => setDurationMin(d)}
              >
                <Text style={[styles.chipText, durationMin === d && styles.chipTextActive]}>{d}</Text>
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
              <MaterialCommunityIcons name="robot" size={24} color={subMode === 'auto' ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.modeTitle, subMode === 'auto' && styles.modeTitleActive]}>AUTO</Text>
              <Text style={styles.modeDesc}>Equal play time (exc. GK)</Text>
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

          {/* Sub Plan Preview */}
          {subPlan.length > 0 && (
            <>
              <Text style={styles.label}>SUBSTITUTION PLAN</Text>
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
            <TouchableOpacity
              testID="skip-review-btn"
              style={styles.skipBtn}
              onPress={() => router.replace('/')}
            >
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
          <Text style={styles.timerMeta}>{opponent ? `vs ${opponent}` : ''} · {durationMin} min</Text>
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
          <Text style={styles.scoreDivider}>—</Text>
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
                <Text style={[styles.controlLabel, { color: Colors.primary }]}>RESUME</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="manual-sub-btn-paused" style={styles.controlBtn} onPress={() => setShowManualSub(true)}>
                <MaterialCommunityIcons name="swap-horizontal-bold" size={28} color={Colors.accent} />
                <Text style={[styles.controlLabel, { color: Colors.accent }]}>SUB</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="coaching-btn-paused" style={styles.controlBtn} onPress={() => setShowCoaching(true)}>
                <MaterialCommunityIcons name="clipboard-text" size={28} color="#8B5CF6" />
                <Text style={[styles.controlLabel, { color: '#8B5CF6' }]}>COACH</Text>
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
            key={`live-${onPitch.map(p=>p.id).join('-')}`}
            positions={formation.positions}
            assignedPlayers={pitchAssignments}
            compact sport={sport}
          />
          {/* Coaching overlay on pitch */}
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

      {/* ===== Sub Alert Modal ===== */}
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
              <TouchableOpacity testID="confirm-sub-btn" style={styles.alertConfirm} onPress={() => showSubAlert && confirmSub(showSubAlert)}>
                <Text style={styles.alertConfirmText}>CONFIRM SUB</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="skip-sub-btn" style={styles.alertSkip} onPress={() => setShowSubAlert(null)}>
                <Text style={styles.alertSkipText}>SKIP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== End Match Confirm Modal ===== */}
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

      {/* ===== Manual Sub Modal ===== */}
      <Modal visible={showManualSub} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Substitution</Text>
              <TouchableOpacity testID="close-manual-sub" onPress={() => { setShowManualSub(false); setManualSubOut(null); setManualSubIn(null); }}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Select player OUT */}
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

            {/* Select player IN */}
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
                  {manualSubOut.name} → {manualSubIn.name}
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
                <Text style={styles.coachSubtitle}>What's not working? Select a category:</Text>
                {COACHING_CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat.id} style={styles.coachCatRow} onPress={() => setSelectedCoachCat(cat)}>
                    <View style={[styles.coachCatIcon, { backgroundColor: cat.color + '20' }]}>
                      <MaterialCommunityIcons name={cat.icon as any} size={22} color={cat.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.coachCatLabel}>{cat.label}</Text>
                      <Text style={styles.coachCatCount}>{cat.suggestions.length} suggestions</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <ScrollView>
                {selectedCoachCat.suggestions.map(sug => (
                  <View key={sug.id} style={styles.coachSugCard}>
                    <View style={styles.coachSugHeader}>
                      <Text style={styles.coachSugTitle}>{sug.title}</Text>
                      <View style={[styles.coachPhilBadge, { backgroundColor: selectedCoachCat.color + '20' }]}>
                        <Text style={[styles.coachPhilText, { color: selectedCoachCat.color }]}>{sug.philosopher}</Text>
                      </View>
                    </View>
                    <Text style={styles.coachSugDesc}>{sug.description}</Text>
                    <View style={styles.coachSugFooter}>
                      <Text style={styles.coachSugPhil}>{sug.philosophy}</Text>
                      <TouchableOpacity style={styles.coachApplyBtn} onPress={() => {
                        const note = `[${formatTime(elapsedSec)}] ${selectedCoachCat.label}: ${sug.title} (${sug.philosopher})`;
                        setCoachingNotes(prev => [...prev, note]);
                        addEvent(`Coach: ${sug.title}`);
                      }}>
                        <MaterialCommunityIcons name="check" size={14} color={Colors.white} />
                        <Text style={styles.coachApplyText}>APPLY</Text>
                      </TouchableOpacity>
                    </View>
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
  input: {
    height: 48, backgroundColor: Colors.backgroundSecondary, borderWidth: 1,
    borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14,
    color: Colors.white, fontSize: 15, marginBottom: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
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
  progressBar: { width: '100%', height: 4, backgroundColor: Colors.border, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
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
  // Modals
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  alertCard: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 20, padding: 28,
    alignItems: 'center', width: '100%', borderWidth: 2, borderColor: Colors.primary,
  },
  alertTitle: { fontSize: 22, fontWeight: '900', color: Colors.white, marginTop: 12, letterSpacing: 2 },
  alertTime: { fontSize: 14, color: Colors.primary, marginTop: 4, fontWeight: '700' },
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
  // Review
  matchSummary: { alignItems: 'center', marginBottom: 16 },
  summaryText: { fontSize: 14, color: Colors.textSecondary },
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

  // Scoreboard
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

  // Coaching
  coachSubtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 12, lineHeight: 18 },
  coachCatRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: Colors.card, borderRadius: 10, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  coachCatIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  coachCatLabel: { fontSize: 14, fontWeight: '700', color: Colors.white },
  coachCatCount: { fontSize: 11, color: Colors.textMuted },
  coachSugCard: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  coachSugHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  coachSugTitle: { fontSize: 15, fontWeight: '700', color: Colors.white, flex: 1 },
  coachPhilBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8 },
  coachPhilText: { fontSize: 10, fontWeight: '700' },
  coachSugDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 10 },
  coachSugFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coachSugPhil: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' },
  coachApplyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  coachApplyText: { fontSize: 11, fontWeight: '700', color: Colors.white },
});
