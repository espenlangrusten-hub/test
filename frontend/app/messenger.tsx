import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../src/context/AppContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Conversation { other_user_id: string; other_user_name: string; other_team_name: string; other_team_id: string; last_message: string; last_message_at: string; unread_count: number; }
interface DM { id: string; from_user_id: string; from_user_name: string; from_team_name: string; from_team_id: string; to_user_id: string; to_user_name: string; to_team_name: string; content: string; read: boolean; created_at: string; }
interface NetworkItem { id: string; friend_user_id: string; friend_team_id: string; friend_team_name: string; friend_team_format: string; friend_team_age_group: string; friend_team_code: string; }
interface SystemMsg { id: string; team_id: string; type: string; title: string; body: string; read: boolean; created_at: string; related_invite_id?: string; }

export default function MessengerScreen() {
  const { user, token } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [network, setNetwork] = useState<NetworkItem[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [systemMsgs, setSystemMsgs] = useState<SystemMsg[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState('');
  const [messages, setMessages] = useState<DM[]>([]);
  const [text, setText] = useState('');
  const [myTeamId, setMyTeamId] = useState('');
  const [toTeamId, setToTeamId] = useState('');
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<'direct' | 'system'>('direct');
  const scrollRef = useRef<ScrollView>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const auth = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  useFocusEffect(useCallback(() => {
    fetchConvos(); fetchNetwork(); fetchTeams(); fetchSystemMsgs();
    pollRef.current = setInterval(() => {
      fetchConvos();
      if (selectedConvo) fetchChat(selectedConvo);
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedConvo]));

  const fetchConvos = async () => {
    try { const r = await fetch(`${API_URL}/api/direct-messages/conversations`, { headers: auth() }); if (r.ok) setConversations(await r.json()); } catch {}
  };
  const fetchNetwork = async () => {
    try { const r = await fetch(`${API_URL}/api/network`, { headers: auth() }); if (r.ok) setNetwork(await r.json()); } catch {}
  };
  const fetchTeams = async () => {
    try { const r = await fetch(`${API_URL}/api/teams`, { headers: auth() }); if (r.ok) { const t = await r.json(); setTeams(t); if (t.length > 0 && !myTeamId) setMyTeamId(t[0].id); } } catch {}
  };
  const fetchSystemMsgs = async () => {
    try { const r = await fetch(`${API_URL}/api/messages`, { headers: auth() }); if (r.ok) setSystemMsgs(await r.json()); } catch {}
  };
  const fetchChat = async (otherUserId: string) => {
    try { const r = await fetch(`${API_URL}/api/direct-messages/conversation/${otherUserId}`, { headers: auth() }); if (r.ok) setMessages(await r.json()); } catch {}
  };

  const openConvo = (otherUserId: string, name: string, teamId: string) => {
    setSelectedConvo(otherUserId); setSelectedName(name); setToTeamId(teamId);
    fetchChat(otherUserId);
  };

  const sendMessage = async () => {
    if (!text.trim() || !selectedConvo) return;
    setSending(true);
    try {
      const r = await fetch(`${API_URL}/api/direct-messages`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ to_user_id: selectedConvo, from_team_id: myTeamId, to_team_id: toTeamId, content: text.trim() }),
      });
      if (r.ok) { const msg = await r.json(); setMessages(prev => [...prev, msg]); setText(''); fetchConvos(); setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 100); }
    } catch {}
    setSending(false);
  };

  const deleteMsg = async (id: string) => {
    await fetch(`${API_URL}/api/direct-messages/${id}`, { method: 'DELETE', headers: auth() });
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const deleteSysMsg = async (id: string) => {
    await fetch(`${API_URL}/api/messages/${id}`, { method: 'DELETE', headers: auth() });
    setSystemMsgs(prev => prev.filter(m => m.id !== id));
  };

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Build contact list: merge conversations + network contacts
  const contactList = () => {
    const seen = new Set<string>();
    const list: { userId: string; name: string; teamName: string; teamId: string; lastMsg: string; lastAt: string; unread: number; }[] = [];
    for (const c of conversations) {
      seen.add(c.other_user_id);
      list.push({ userId: c.other_user_id, name: c.other_user_name, teamName: c.other_team_name, teamId: c.other_team_id, lastMsg: c.last_message, lastAt: c.last_message_at, unread: c.unread_count });
    }
    for (const n of network) {
      if (!seen.has(n.friend_user_id) && n.friend_user_id) {
        list.push({ userId: n.friend_user_id, name: n.friend_team_name, teamName: n.friend_team_name, teamId: n.friend_team_id, lastMsg: '', lastAt: '', unread: 0 });
      }
    }
    return list;
  };

  const contacts = contactList();

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1C1E22', '#161819', '#111315']} style={s.bg}>
        {/* Tab bar: Direct | System */}
        <View style={s.tabRow}>
          <TouchableOpacity style={[s.tabBtn, tab === 'direct' && s.tabActive]} onPress={() => setTab('direct')}>
            <Text style={[s.tabText, tab === 'direct' && s.tabTextActive]}>Direct Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tabBtn, tab === 'system' && s.tabActive]} onPress={() => setTab('system')}>
            <Text style={[s.tabText, tab === 'system' && s.tabTextActive]}>Notifications</Text>
            {systemMsgs.filter(m => !m.read).length > 0 && <View style={s.dot} />}
          </TouchableOpacity>
        </View>

        {tab === 'system' ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.sysList}>
            {systemMsgs.length === 0 && <Text style={s.emptyText}>No notifications yet.</Text>}
            {systemMsgs.map(m => (
              <View key={m.id} style={[s.sysCard, !m.read && s.sysUnread]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sysTitle}>{m.title}</Text>
                  <Text style={s.sysBody}>{m.body}</Text>
                  <Text style={s.sysTime}>{formatTime(m.created_at)}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteSysMsg(m.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color="#555" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : selectedConvo ? (
          /* Chat view */
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={s.chatHeader} onPress={() => setSelectedConvo(null)}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="#EAEAEA" />
              <Text style={s.chatName}>{selectedName}</Text>
            </TouchableOpacity>

            {/* Team selector */}
            {teams.length > 1 && (
              <ScrollView horizontal style={s.teamPicker} showsHorizontalScrollIndicator={false}>
                {teams.map(t => (
                  <TouchableOpacity key={t.id} style={[s.teamChip, myTeamId === t.id && s.teamChipActive]}
                    onPress={() => setMyTeamId(t.id)}>
                    <Text style={[s.teamChipText, myTeamId === t.id && s.teamChipTextActive]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={s.chatScroll}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd?.({ animated: false })}>
              {messages.map(m => {
                const mine = m.from_user_id === user?.user_id;
                return (
                  <View key={m.id} style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
                    {!mine && m.from_team_name ? <Text style={s.bubbleTeam}>{m.from_team_name}</Text> : null}
                    <Text style={s.bubbleText}>{m.content}</Text>
                    <View style={s.bubbleMeta}>
                      <Text style={s.bubbleTime}>{formatTime(m.created_at)}</Text>
                      {mine && <TouchableOpacity onPress={() => deleteMsg(m.id)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={12} color="#666" />
                      </TouchableOpacity>}
                    </View>
                  </View>
                );
              })}
              {messages.length === 0 && <Text style={s.emptyText}>No messages yet. Say hello!</Text>}
            </ScrollView>

            <View style={s.inputRow}>
              <TextInput style={s.msgInput} value={text} onChangeText={setText}
                placeholder="Type a message..." placeholderTextColor="#555"
                onSubmitEditing={sendMessage} returnKeyType="send" />
              <TouchableOpacity style={[s.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
                onPress={sendMessage} disabled={!text.trim() || sending}>
                <MaterialCommunityIcons name="send" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Contact list */
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.contactList}>
            {contacts.length === 0 && <Text style={s.emptyText}>Add teams to your network to start messaging.</Text>}
            {contacts.map(c => (
              <TouchableOpacity key={c.userId} style={s.contactRow}
                onPress={() => openConvo(c.userId, c.name || c.teamName, c.teamId)}>
                <View style={s.contactAvatar}>
                  <MaterialCommunityIcons name="account" size={22} color="#888" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.contactName}>{c.name || c.teamName}</Text>
                  {c.teamName && c.name !== c.teamName ? <Text style={s.contactTeam}>{c.teamName}</Text> : null}
                  {c.lastMsg ? <Text style={s.contactLastMsg} numberOfLines={1}>{c.lastMsg}</Text> : <Text style={s.contactLastMsg}>Tap to start conversation</Text>}
                </View>
                <View style={s.contactRight}>
                  {c.lastAt ? <Text style={s.contactTime}>{formatTime(c.lastAt)}</Text> : null}
                  {c.unread > 0 && <View style={s.unreadBadge}><Text style={s.unreadText}>{c.unread}</Text></View>}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  bg: { flex: 1 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', position: 'relative' as const },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#4ADE80' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#4ADE80' },
  dot: { position: 'absolute' as const, top: 10, right: '30%' as any, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },

  // Contact list
  contactList: { padding: 0 },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', gap: 12 },
  contactAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2A2C30', justifyContent: 'center', alignItems: 'center' },
  contactName: { fontSize: 15, fontWeight: '700', color: '#EAEAEA' },
  contactTeam: { fontSize: 11, color: '#666', marginTop: 1 },
  contactLastMsg: { fontSize: 12, color: '#888', marginTop: 2 },
  contactRight: { alignItems: 'flex-end', gap: 4 },
  contactTime: { fontSize: 10, color: '#666' },
  unreadBadge: { backgroundColor: '#4ADE80', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#000' },

  // Chat
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  chatName: { fontSize: 17, fontWeight: '700', color: '#EAEAEA' },
  teamPicker: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12, paddingVertical: 6 },
  teamChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', marginRight: 8 },
  teamChipActive: { backgroundColor: 'rgba(74,222,128,0.15)', borderWidth: 1, borderColor: '#4ADE80' },
  teamChipText: { fontSize: 12, color: '#888', fontWeight: '500' },
  teamChipTextActive: { color: '#4ADE80' },
  chatScroll: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: '78%' as any, borderRadius: 16, padding: 10, paddingHorizontal: 14, marginBottom: 8 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: 'rgba(74,222,128,0.15)', borderBottomRightRadius: 4 },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.06)', borderBottomLeftRadius: 4 },
  bubbleTeam: { fontSize: 10, color: '#4ADE80', fontWeight: '600', marginBottom: 2 },
  bubbleText: { fontSize: 14, color: '#EAEAEA', lineHeight: 20 },
  bubbleMeta: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 4 },
  bubbleTime: { fontSize: 10, color: '#666' },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  msgInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#EAEAEA', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },

  // System messages
  sysList: { padding: 16, gap: 8 },
  sysCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 10 },
  sysUnread: { borderLeftWidth: 3, borderLeftColor: '#4ADE80' },
  sysTitle: { fontSize: 13, fontWeight: '700', color: '#EAEAEA' },
  sysBody: { fontSize: 12, color: '#888', marginTop: 2 },
  sysTime: { fontSize: 10, color: '#555', marginTop: 4 },
  emptyText: { fontSize: 14, color: '#555', textAlign: 'center', paddingVertical: 40 },
});
