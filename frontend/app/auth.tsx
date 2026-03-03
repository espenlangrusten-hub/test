import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';

export default function AuthScreen() {
  const { login, register } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim());
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={styles.inner} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.logoSection}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="soccer-field" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>TACTICAL{'\n'}LINEUP</Text>
          <Text style={styles.subtitle}>Football & Futsal Coach Assistant</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.tabRow}>
            <TouchableOpacity
              testID="tab-login"
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => { setMode('login'); setError(''); }}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>LOG IN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="tab-register"
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => { setMode('register'); setError(''); }}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>SIGN UP</Text>
            </TouchableOpacity>
          </View>

          {mode === 'register' && (
            <>
              <Text style={styles.label}>NAME</Text>
              <TextInput
                testID="input-name"
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </>
          )}

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            testID="input-email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            testID="input-password"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
          />

          {error ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle" size={14} color={Colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            testID="submit-auth"
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name={mode === 'login' ? 'login' : 'account-plus'} size={18} color={Colors.white} />
                <Text style={styles.submitText}>{mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logoSection: { alignItems: 'center', marginBottom: 36 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.primaryGlow, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  title: {
    fontSize: 32, fontWeight: '900', color: Colors.white, textAlign: 'center',
    marginTop: 16, letterSpacing: 3, lineHeight: 38,
  },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 6, letterSpacing: 2, textTransform: 'uppercase' },
  card: {
    backgroundColor: Colors.glass, borderRadius: 18,
    padding: 24, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  tabRow: { flexDirection: 'row', marginBottom: 22, gap: 6 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabActive: { backgroundColor: Colors.primaryGlow, borderWidth: 1, borderColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  tabTextActive: { color: Colors.primary },
  label: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 6, marginTop: 6 },
  input: {
    height: 48, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 16,
    color: Colors.white, fontSize: 15, borderWidth: 1, borderColor: Colors.glassBorder, marginBottom: 8,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 10,
    padding: 10, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: { fontSize: 13, color: Colors.destructive, flex: 1 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, height: 50, borderRadius: 12, gap: 8, marginTop: 12,
  },
  submitText: { fontSize: 15, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
});
