import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const NAV_HEIGHT = 56;

export { NAV_HEIGHT };

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useApp();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/api/notifications/unread`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) { const d = await res.json(); setUnreadCount(d.total || 0); }
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const isActive = (route: string) => {
    if (route === '/') return pathname === '/' || pathname === '/index';
    return pathname.startsWith(route);
  };

  const tabs = [
    { route: '/', icon: 'home', label: 'Dashboard' },
    { route: '/messenger', icon: 'message-text-outline', label: 'Messages', badge: true },
    { route: '/calendar', icon: 'calendar-outline', label: 'Calendar' },
    { route: '/my-network', icon: 'account-group-outline', label: 'Network' },
  ] as const;

  return (
    <View style={s.wrapper}>
      {tabs.map(t => {
        const active = isActive(t.route);
        return (
          <TouchableOpacity
            key={t.route}
            style={s.tab}
            onPress={() => router.push(t.route as any)}
          >
            <View>
              <MaterialCommunityIcons
                name={t.icon as any}
                size={22}
                color={active ? '#4ADE80' : '#555'}
              />
              {t.badge && unreadCount > 0 && <View style={s.dot} />}
            </View>
            <Text style={[s.label, active && { color: '#4ADE80' }]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    height: NAV_HEIGHT,
    minHeight: NAV_HEIGHT,
    borderTopWidth: 2,
    borderTopColor: '#FF0000',
    backgroundColor: '#FF0000',
  },
  tab: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 2 },
  label: { fontSize: 10, fontWeight: '500', color: '#555' },
  dot: { position: 'absolute' as const, top: -2, right: -6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
});
