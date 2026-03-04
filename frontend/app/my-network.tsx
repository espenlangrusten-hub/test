import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../src/context/AppContext';
import BottomNav from '../src/components/BottomNav';
import { getFlagForCode } from '../src/constants/countries';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function MyNetworkScreen() {
  const { token } = useApp();
  const [network, setNetwork] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  useFocusEffect(useCallback(() => { fetchNetwork(); }, []));

  const fetchNetwork = async () => {
    try {
      const res = await fetch(`${API_URL}/api/network`, { headers: authHeaders() });
      if (res.ok) setNetwork(await res.json());
    } catch {}
  };

  const addToNetwork = async () => {
    if (!code.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`${API_URL}/api/network/add`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ team_code: code.trim().toUpperCase() }),
      });
      if (res.ok) { setCode(''); setShowAdd(false); fetchNetwork(); }
      else { const e = await res.json().catch(() => ({})); Alert.alert('Error', e.detail || 'Not found'); }
    } catch { Alert.alert('Error', 'Network error'); }
    setAdding(false);
  };

  const remove = async (id: string) => {
    await fetch(`${API_URL}/api/network/${id}`, { method: 'DELETE', headers: authHeaders() });
    setNetwork(prev => prev.filter(n => n.id !== id));
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1C1E22', '#161819', '#111315']} style={s.bg}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.headerRow}>
            <Text style={s.heading}>My Network</Text>
            <TouchableOpacity data-testid="add-network-page-btn" style={s.addBtn} onPress={() => setShowAdd(true)}>
              <MaterialCommunityIcons name="plus" size={20} color="#4ADE80" />
              <Text style={s.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {network.length === 0 && <Text style={s.empty}>No teams in your network yet.</Text>}

          {network.map(n => (
            <TouchableOpacity key={n.id} data-testid={`net-item-${n.id}`} style={s.card}
              onPress={() => setExpanded(expanded === n.id ? null : n.id)} activeOpacity={0.7}>
              <View style={s.cardTop}>
                <View style={s.flagWrap}>
                  {n.friend_team_country ? <Text style={{ fontSize: 20 }}>{getFlagForCode(n.friend_team_country)}</Text>
                    : <MaterialCommunityIcons name="shield-outline" size={24} color="#555" />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.nameRow}>
                    <Text style={s.name}>{n.friend_team_name}</Text>
                    <MaterialCommunityIcons name={expanded === n.id ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
                  </View>
                  <View style={s.badgeRow}>
                    {n.friend_team_age_group ? <View style={s.badge}><Text style={s.badgeText}>{n.friend_team_age_group}</Text></View> : null}
                    {n.friend_team_format ? <View style={s.badge}><Text style={s.badgeText}>{n.friend_team_format}</Text></View> : null}
                    {n.friend_team_code ? <Text style={s.codeText}>#{n.friend_team_code}</Text> : null}
                  </View>
                </View>
              </View>
              {expanded === n.id && (
                <View style={s.details}>
                  <View style={s.detRow}><Text style={s.detLabel}>Manager</Text><Text style={s.detVal}>{n.friend_manager_name || '-'}</Text></View>
                  <View style={s.detRow}><Text style={s.detLabel}>Phone</Text><Text style={s.detVal}>{n.friend_manager_phone || '-'}</Text></View>
                  <View style={s.detRow}><Text style={s.detLabel}>Sport</Text><Text style={s.detVal}>{n.friend_team_sport || '-'}</Text></View>
                  <TouchableOpacity style={s.removeBtn} onPress={() => remove(n.id)}>
                    <Text style={s.removeBtnText}>Remove from Network</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}

          <View style={{ height: 30 }} />
        </ScrollView>

        <Modal visible={showAdd} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <MaterialCommunityIcons name="account-plus-outline" size={32} color="#4ADE80" />
              <Text style={s.modalTitle}>Add Team</Text>
              <Text style={s.modalDesc}>Enter the team's unique code</Text>
              <TextInput style={s.codeInput} value={code} onChangeText={setCode}
                placeholder="ABC123" placeholderTextColor="#555" autoCapitalize="characters" autoFocus />
              <TouchableOpacity style={[s.greenBtn, adding && { opacity: 0.5 }]} onPress={addToNetwork} disabled={adding}>
                <Text style={s.greenBtnText}>{adding ? 'ADDING...' : 'ADD TO NETWORK'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ghostBtn} onPress={() => { setShowAdd(false); setCode(''); }}>
                <Text style={s.ghostBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <BottomNav />
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  bg: { flex: 1 },
  scroll: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: '800', color: '#EAEAEA' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)', backgroundColor: 'rgba(74,222,128,0.06)' },
  addBtnText: { fontSize: 13, fontWeight: '600', color: '#4ADE80' },
  empty: { fontSize: 14, color: '#555', paddingVertical: 20 },
  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flagWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#2A2C30', justifyContent: 'center', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontWeight: '700', color: '#EAEAEA' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  badge: { borderWidth: 1, borderColor: '#4ADE80', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#4ADE80' },
  codeText: { fontSize: 10, color: '#666', fontWeight: '500' },
  details: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', gap: 6 },
  detRow: { flexDirection: 'row' },
  detLabel: { fontSize: 12, color: '#666', width: 70, fontWeight: '500' },
  detVal: { fontSize: 12, color: '#AAA', fontWeight: '600' },
  removeBtn: { marginTop: 8 },
  removeBtnText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalCard: { backgroundColor: '#1E2025', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', maxWidth: 360, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#EAEAEA', marginTop: 14, marginBottom: 6 },
  modalDesc: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20 },
  codeInput: { width: '100%', height: 56, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 16, color: '#EAEAEA', fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
  greenBtn: { width: '100%', backgroundColor: '#10B981', height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  greenBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  ghostBtn: { height: 40, justifyContent: 'center', alignItems: 'center' },
  ghostBtnText: { fontSize: 12, fontWeight: '700', color: '#666' },
});
