import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../src/context/AppContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SettingsScreen() {
  const router = useRouter();
  const { user, token, logout } = useApp();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const saveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) Alert.alert('Success', 'Name updated');
      else { const e = await res.json().catch(() => ({})); Alert.alert('Error', e.detail || 'Failed'); }
    } catch { Alert.alert('Error', 'Network error'); }
    setSaving(false);
  };

  const changePassword = async () => {
    if (!currentPw || !newPw) { Alert.alert('Error', 'Fill both password fields'); return; }
    if (newPw.length < 4) { Alert.alert('Error', 'New password must be at least 4 characters'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/password`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      if (res.ok) { Alert.alert('Success', 'Password changed'); setCurrentPw(''); setNewPw(''); }
      else { const e = await res.json().catch(() => ({})); Alert.alert('Error', e.detail || 'Failed'); }
    } catch { Alert.alert('Error', 'Network error'); }
    setSaving(false);
  };

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) logout();
    } else {
      Alert.alert('Log Out', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1C1E22', '#161819', '#111315']} style={s.bg}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.heading}>Profile</Text>

          <Text style={s.label}>NAME</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholderTextColor="#555" />
          <TouchableOpacity data-testid="save-name-btn" style={s.saveBtn} onPress={saveName} disabled={saving}>
            <Text style={s.saveBtnText}>{saving ? 'SAVING...' : 'SAVE NAME'}</Text>
          </TouchableOpacity>

          <Text style={s.label}>EMAIL</Text>
          <Text style={s.readOnly}>{email}</Text>

          <View style={s.divider} />
          <Text style={s.heading}>Change Password</Text>

          <Text style={s.label}>CURRENT PASSWORD</Text>
          <TextInput style={s.input} value={currentPw} onChangeText={setCurrentPw}
            secureTextEntry placeholderTextColor="#555" placeholder="Current password" />

          <Text style={s.label}>NEW PASSWORD</Text>
          <TextInput style={s.input} value={newPw} onChangeText={setNewPw}
            secureTextEntry placeholderTextColor="#555" placeholder="New password" />
          <TouchableOpacity data-testid="change-pw-btn" style={s.saveBtn} onPress={changePassword} disabled={saving}>
            <Text style={s.saveBtnText}>{saving ? 'SAVING...' : 'CHANGE PASSWORD'}</Text>
          </TouchableOpacity>

          <View style={s.divider} />

          <TouchableOpacity data-testid="logout-settings-btn" style={s.logoutBtn} onPress={confirmLogout}>
            <MaterialCommunityIcons name="logout" size={18} color="#EF4444" />
            <Text style={s.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  bg: { flex: 1 },
  scroll: { padding: 20 },
  heading: { fontSize: 22, fontWeight: '800', color: '#EAEAEA', marginBottom: 16, marginTop: 8 },
  label: { fontSize: 11, fontWeight: '600', color: '#666', letterSpacing: 2, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#EAEAEA', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  readOnly: { fontSize: 15, color: '#888', paddingVertical: 12 },
  saveBtn: { marginTop: 12, backgroundColor: '#10B981', borderRadius: 10, height: 44, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 24 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
});
