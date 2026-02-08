import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';
import { getFormations, Formation } from '../src/constants/formations';
import { getTacticGuide, PositionGuide } from '../src/constants/tactics-guide';

type Tab = 'team' | 'individual';
type Phase = 'defensive' | 'attacking';

export default function TacticGuideScreen() {
  const { sport, format, currentTeam } = useApp();
  const formations = getFormations(sport, format);

  const initialFormation = formations.find(
    f => f.name === currentTeam?.formation || f.id === currentTeam?.formation
  ) || formations[0];

  const [selectedFormation, setSelectedFormation] = useState<Formation>(initialFormation);
  const [tab, setTab] = useState<Tab>('team');
  const [phase, setPhase] = useState<Phase>('attacking');
  const [expandedPos, setExpandedPos] = useState<number | null>(null);

  const guide = useMemo(() => getTacticGuide(selectedFormation.id), [selectedFormation.id]);

  const teamPlayers = currentTeam?.players || [];

  const getPlayerForRole = (role: string, posIdx: number): string | null => {
    const starters = teamPlayers.filter(p => p.is_starter);
    if (posIdx < starters.length) return starters[posIdx].name;
    return null;
  };

  const toggleExpand = (idx: number) => {
    setExpandedPos(expandedPos === idx ? null : idx);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Formation Picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formationScroll}>
          {formations.map((f) => (
            <TouchableOpacity
              key={f.id}
              testID={`tg-formation-${f.id}`}
              style={[styles.formationChip, selectedFormation.id === f.id && styles.formationChipActive]}
              onPress={() => { setSelectedFormation(f); setExpandedPos(null); }}
            >
              <Text style={[styles.formationChipText, selectedFormation.id === f.id && styles.formationChipTextActive]}>
                {f.name}
              </Text>
              {f.managerName && (
                <Text style={styles.formationChipSub}>{f.managerName.split(' ').pop()}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Formation Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerFormation}>{selectedFormation.displayName}</Text>
            {selectedFormation.managerName && (
              <View style={styles.managerRow}>
                <MaterialCommunityIcons name="account-tie" size={14} color={Colors.primary} />
                <Text style={styles.managerName}>{selectedFormation.managerName}</Text>
              </View>
            )}
            {selectedFormation.managerStyle && (
              <View style={styles.styleBadge}>
                <Text style={styles.styleText}>{selectedFormation.managerStyle}</Text>
              </View>
            )}
          </View>
          <View style={styles.formationVisual}>
            <Text style={styles.formationBig}>{selectedFormation.name}</Text>
          </View>
        </View>

        {!guide && (
          <View style={styles.noGuide}>
            <MaterialCommunityIcons name="information-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.noGuideText}>No tactical guide available for this formation</Text>
          </View>
        )}

        {guide && (
          <>
            {/* Tab Selector */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                testID="tab-team"
                style={[styles.tabBtn, tab === 'team' && styles.tabBtnActive]}
                onPress={() => setTab('team')}
              >
                <MaterialCommunityIcons
                  name="account-group"
                  size={18}
                  color={tab === 'team' ? Colors.white : Colors.textMuted}
                />
                <Text style={[styles.tabText, tab === 'team' && styles.tabTextActive]}>TEAM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="tab-individual"
                style={[styles.tabBtn, tab === 'individual' && styles.tabBtnActive]}
                onPress={() => setTab('individual')}
              >
                <MaterialCommunityIcons
                  name="account"
                  size={18}
                  color={tab === 'individual' ? Colors.white : Colors.textMuted}
                />
                <Text style={[styles.tabText, tab === 'individual' && styles.tabTextActive]}>INDIVIDUAL</Text>
              </TouchableOpacity>
            </View>

            {/* Phase Toggle */}
            <View style={styles.phaseRow}>
              <TouchableOpacity
                testID="phase-attacking"
                style={[styles.phaseBtn, phase === 'attacking' && styles.phaseBtnAttacking]}
                onPress={() => setPhase('attacking')}
              >
                <MaterialCommunityIcons
                  name="arrow-up-bold"
                  size={16}
                  color={phase === 'attacking' ? '#FFFFFF' : Colors.textMuted}
                />
                <Text style={[styles.phaseText, phase === 'attacking' && { color: '#FFFFFF' }]}>
                  ATTACKING
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="phase-defensive"
                style={[styles.phaseBtn, phase === 'defensive' && styles.phaseBtnDefensive]}
                onPress={() => setPhase('defensive')}
              >
                <MaterialCommunityIcons
                  name="shield"
                  size={16}
                  color={phase === 'defensive' ? '#FFFFFF' : Colors.textMuted}
                />
                <Text style={[styles.phaseText, phase === 'defensive' && { color: '#FFFFFF' }]}>
                  DEFENSIVE
                </Text>
              </TouchableOpacity>
            </View>

            {/* Team Focus Areas */}
            {tab === 'team' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons
                    name={phase === 'attacking' ? 'sword-cross' : 'shield-check'}
                    size={20}
                    color={phase === 'attacking' ? Colors.primary : Colors.info}
                  />
                  <Text style={styles.sectionTitle}>
                    {phase === 'attacking' ? 'ATTACKING PRINCIPLES' : 'DEFENSIVE PRINCIPLES'}
                  </Text>
                </View>
                {(phase === 'attacking' ? guide.teamAttacking : guide.teamDefensive).map((point, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <View style={[
                      styles.bulletDot,
                      { backgroundColor: phase === 'attacking' ? Colors.primary : Colors.info },
                    ]} />
                    <Text style={styles.bulletText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Individual Focus Areas */}
            {tab === 'individual' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons
                    name="clipboard-list"
                    size={20}
                    color={phase === 'attacking' ? Colors.primary : Colors.info}
                  />
                  <Text style={styles.sectionTitle}>
                    PLAYER INSTRUCTIONS — {phase === 'attacking' ? 'IN POSSESSION' : 'OUT OF POSSESSION'}
                  </Text>
                </View>

                {guide.positionGuides.map((pg: PositionGuide, idx: number) => {
                  const isExpanded = expandedPos === idx;
                  const playerName = getPlayerForRole(pg.role, idx);
                  const instructions = phase === 'attacking' ? pg.attacking : pg.defensive;

                  return (
                    <TouchableOpacity
                      key={idx}
                      testID={`pos-guide-${idx}`}
                      style={[styles.posCard, isExpanded && styles.posCardExpanded]}
                      onPress={() => toggleExpand(idx)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.posHeader}>
                        <View style={[
                          styles.roleBadge,
                          { backgroundColor: phase === 'attacking' ? 'rgba(0,200,83,0.15)' : 'rgba(59,130,246,0.15)' },
                        ]}>
                          <Text style={[
                            styles.roleText,
                            { color: phase === 'attacking' ? Colors.primary : Colors.info },
                          ]}>{pg.role}</Text>
                        </View>
                        <View style={styles.posInfo}>
                          {playerName && (
                            <Text style={styles.posPlayerName}>{playerName}</Text>
                          )}
                          <Text style={styles.posPreview} numberOfLines={isExpanded ? undefined : 1}>
                            {instructions[0]}
                          </Text>
                        </View>
                        <MaterialCommunityIcons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={Colors.textMuted}
                        />
                      </View>

                      {isExpanded && (
                        <View style={styles.posInstructions}>
                          {instructions.map((inst, j) => (
                            <View key={j} style={styles.instructionRow}>
                              <View style={[
                                styles.instructionNum,
                                { backgroundColor: phase === 'attacking' ? 'rgba(0,200,83,0.12)' : 'rgba(59,130,246,0.12)' },
                              ]}>
                                <Text style={[
                                  styles.instructionNumText,
                                  { color: phase === 'attacking' ? Colors.primary : Colors.info },
                                ]}>{j + 1}</Text>
                              </View>
                              <Text style={styles.instructionText}>{inst}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  formationScroll: { marginBottom: 14 },
  formationChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary, marginRight: 8,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', minWidth: 70,
  },
  formationChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,200,83,0.1)' },
  formationChipText: { fontSize: 14, fontWeight: '800', color: Colors.textMuted },
  formationChipTextActive: { color: Colors.primary },
  formationChipSub: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  headerCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary, borderRadius: 14,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border,
  },
  headerLeft: { flex: 1 },
  headerFormation: { fontSize: 18, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  managerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  managerName: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  styleBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(0,200,83,0.12)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  styleText: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 0.5 },
  formationVisual: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,200,83,0.08)', justifyContent: 'center', alignItems: 'center',
  },
  formationBig: { fontSize: 16, fontWeight: '900', color: Colors.primary },
  noGuide: { alignItems: 'center', paddingVertical: 40 },
  noGuideText: { fontSize: 14, color: Colors.textMuted, marginTop: 8 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border,
  },
  tabBtnActive: { backgroundColor: 'rgba(0,200,83,0.12)', borderColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5 },
  tabTextActive: { color: Colors.white },
  phaseRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  phaseBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border,
  },
  phaseBtnAttacking: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  phaseBtnDefensive: { backgroundColor: Colors.info, borderColor: Colors.info },
  phaseText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  section: { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  bulletDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  bulletText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  posCard: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 12,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  posCardExpanded: { borderColor: 'rgba(0,200,83,0.3)' },
  posHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10,
  },
  roleBadge: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
  },
  roleText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  posInfo: { flex: 1 },
  posPlayerName: { fontSize: 13, fontWeight: '700', color: Colors.white, marginBottom: 2 },
  posPreview: { fontSize: 12, color: Colors.textMuted, lineHeight: 16 },
  posInstructions: { paddingHorizontal: 12, paddingBottom: 14, gap: 8 },
  instructionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  instructionNum: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  instructionNumText: { fontSize: 11, fontWeight: '800' },
  instructionText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
});
