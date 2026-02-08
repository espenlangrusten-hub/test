import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';

const FORMATS = [
  { id: '5v5', label: '5 v 5', players: 5, icon: 'account-group' as const, desc: 'Small-sided game' },
  { id: '7v7', label: '7 v 7', players: 7, icon: 'account-multiple' as const, desc: 'Youth format' },
  { id: '11v11', label: '11 v 11', players: 11, icon: 'soccer-field' as const, desc: 'Full match' },
];

export default function FormatScreen() {
  const router = useRouter();
  const { sport, setFormat, setCurrentTeam } = useApp();

  const selectFormat = (format: string) => {
    setFormat(format);
    setCurrentTeam(null);
    router.push('/team-setup');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.sportBadge}>
            <MaterialCommunityIcons
              name={sport === 'futsal' ? 'shoe-cleat' : 'soccer'}
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.sportLabel}>{(sport || 'football').toUpperCase()}</Text>
          </View>
          <Text style={styles.title}>Choose Format</Text>
          <Text style={styles.subtitle}>Select match size for your team</Text>
        </View>

        <View style={styles.formatList}>
          {FORMATS.map((fmt) => (
            <TouchableOpacity
              key={fmt.id}
              testID={`format-${fmt.id}-btn`}
              style={styles.formatCard}
              onPress={() => selectFormat(fmt.id)}
              activeOpacity={0.8}
            >
              <View style={styles.formatLeft}>
                <View style={styles.formatIconWrap}>
                  <MaterialCommunityIcons name={fmt.icon} size={28} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.formatLabel}>{fmt.label}</Text>
                  <Text style={styles.formatDesc}>{fmt.desc}</Text>
                </View>
              </View>
              <View style={styles.formatRight}>
                <Text style={styles.formatPlayers}>{fmt.players}</Text>
                <Text style={styles.formatPlayersLabel}>players</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: 16 },
  header: { alignItems: 'center', paddingVertical: 24 },
  sportBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,200,83,0.1)', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20, marginBottom: 16,
  },
  sportLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary, letterSpacing: 1.5 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.white, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textMuted },
  formatList: { gap: 12, marginTop: 8 },
  formatCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.backgroundSecondary, borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: Colors.border,
  },
  formatLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  formatIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(0,200,83,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  formatLabel: { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  formatDesc: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  formatRight: { alignItems: 'center' },
  formatPlayers: { fontSize: 28, fontWeight: '900', color: Colors.primary },
  formatPlayersLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
});
