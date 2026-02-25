import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface AdderTeam {
  id: string;
  name: string;
  team_code: string;
  format: string;
  gender: string;
  age_group: string;
}

interface Message {
  id: string;
  team_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  related_invite_id?: string;
  read: boolean;
  created_at: string;
  adder_teams?: AdderTeam[];
  adder_user_id?: string;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { currentTeam, token } = useApp();
  const activeTeamId = teamId || currentTeam?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingBack, setAddingBack] = useState<string | null>(null);

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  useFocusEffect(useCallback(() => { fetchMessages(); }, [activeTeamId]));

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const url = activeTeamId ? `${API_URL}/api/messages?team_id=${activeTeamId}` : `${API_URL}/api/messages`;
      const res = await fetch(url, { headers: authHeaders() });
      if (res.ok) setMessages(await res.json());
    } catch {}
    setLoading(false);
  };

  const markRead = async (msg: Message) => {
    if (msg.read) return;
    try {
      await fetch(`${API_URL}/api/messages/${msg.id}/read`, { method: 'PUT', headers: authHeaders() });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
    } catch {}
  };

  const addBack = async (teamCode: string, msgId: string) => {
    setAddingBack(msgId);
    try {
      const res = await fetch(`${API_URL}/api/network/add`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ team_code: teamCode }),
      });
      if (res.ok) {
        Alert.alert('Added!', 'Team added to your network');
        markRead(messages.find(m => m.id === msgId) as Message);
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Info', err.detail || 'Could not add team');
      }
    } catch { Alert.alert('Error', 'Network error'); }
    setAddingBack(null);
  };

  const deleteMessage = async (msgId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/messages/${msgId}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch {}
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'invite_received': return 'email-open';
      case 'invite_sent': return 'send';
      case 'invite_accepted': return 'check-circle';
      case 'invite_declined': return 'close-circle';
      case 'network_add': return 'account-plus';
      default: return 'message';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'invite_received': return '#3B82F6';
      case 'invite_sent': return Colors.textMuted;
      case 'invite_accepted': return '#10B981';
      case 'invite_declined': return Colors.destructive;
      case 'network_add': return '#8B5CF6';
      default: return Colors.textMuted;
    }
  };

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Messages</Text>
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {messages.length === 0 && !loading && (
          <View style={st.emptyBox}>
            <MaterialCommunityIcons name="email-outline" size={40} color={Colors.textMuted} />
            <Text style={st.emptyText}>No messages</Text>
          </View>
        )}
        {messages.map(msg => (
          <TouchableOpacity key={msg.id} testID={`msg-${msg.id}`}
            style={[st.msgCard, !msg.read && st.msgUnread]}
            onPress={() => {
              markRead(msg);
              if (msg.related_invite_id) {
                router.push(`/friendly-matches?teamId=${msg.team_id}`);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[st.iconWrap, { backgroundColor: getColor(msg.type) + '15' }]}>
              <MaterialCommunityIcons name={getIcon(msg.type) as any} size={18} color={getColor(msg.type)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.msgTitle}>{msg.title}</Text>
              <Text style={st.msgBody}>{msg.body}</Text>
              {/* Add Back buttons for network_add messages */}
              {msg.type === 'network_add' && msg.adder_teams && msg.adder_teams.length > 0 && (
                <View style={st.addBackRow}>
                  {msg.adder_teams.map(t => (
                    <TouchableOpacity key={t.id} testID={`add-back-${t.team_code}`}
                      style={[st.addBackBtn, addingBack === msg.id && { opacity: 0.5 }]}
                      onPress={() => addBack(t.team_code, msg.id)}
                      disabled={addingBack === msg.id}
                    >
                      <MaterialCommunityIcons name="account-plus" size={12} color={Colors.white} />
                      <Text style={st.addBackText}>ADD BACK {t.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={st.msgTime}>{new Date(msg.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            {!msg.read && <View style={st.dot} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.white, flex: 1 },
  scroll: { padding: 14, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  msgCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.backgroundSecondary, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  msgUnread: { borderColor: 'rgba(59,130,246,0.3)', backgroundColor: 'rgba(59,130,246,0.04)' },
  iconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  msgTitle: { fontSize: 13, fontWeight: '700', color: Colors.white },
  msgBody: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  msgTime: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6', marginTop: 4 },
  addBackRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  addBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8B5CF6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  addBackText: { fontSize: 10, fontWeight: '700', color: Colors.white, letterSpacing: 0.5 },
});
