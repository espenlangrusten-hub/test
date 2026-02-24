import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Message {
  id: string;
  team_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  related_invite_id: string;
  read: boolean;
  created_at: string;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { currentTeam, token } = useApp();
  const activeTeamId = teamId || currentTeam?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getIcon = (type: string) => {
    switch (type) {
      case 'invite_received': return 'email-open';
      case 'invite_sent': return 'send';
      case 'invite_accepted': return 'check-circle';
      case 'invite_declined': return 'close-circle';
      default: return 'message';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'invite_received': return '#3B82F6';
      case 'invite_sent': return Colors.textMuted;
      case 'invite_accepted': return '#10B981';
      case 'invite_declined': return Colors.destructive;
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
  msgCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundSecondary, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  msgUnread: { borderColor: 'rgba(59,130,246,0.3)', backgroundColor: 'rgba(59,130,246,0.04)' },
  iconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  msgTitle: { fontSize: 13, fontWeight: '700', color: Colors.white },
  msgBody: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  msgTime: { fontSize: 9, color: Colors.textMuted, marginTop: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
});
