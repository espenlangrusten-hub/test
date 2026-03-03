import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';
import { View, ActivityIndicator } from 'react-native';
import AuthScreen from './auth';

function AppContent() {
  const { user, authLoading } = useApp();

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.primary,
          headerTitleStyle: { color: Colors.white, fontWeight: '700', fontSize: 17 },
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="format" options={{ title: 'Select Format' }} />
        <Stack.Screen name="team-setup" options={{ title: 'Squad Setup' }} />
        <Stack.Screen name="team" options={{ title: 'team' }} />
        <Stack.Screen name="tactics" options={{ title: 'Tactics Board' }} />
        <Stack.Screen name="match" options={{ title: 'Match Day' }} />
        <Stack.Screen name="tactic-guide" options={{ title: 'Tactic Guide' }} />
        <Stack.Screen name="player-notes" options={{ title: 'Player Notes' }} />
        <Stack.Screen name="match-history" options={{ title: 'Match History' }} />
        <Stack.Screen name="match-detail" options={{ title: 'Match Review' }} />
        <Stack.Screen name="training" options={{ title: 'Training Sessions' }} />
        <Stack.Screen name="calendar" options={{ title: 'Match Calendar' }} />
        <Stack.Screen name="friendly-matches" options={{ title: 'Friendly Matches' }} />
        <Stack.Screen name="messages" options={{ title: 'Messages' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="messenger" options={{ title: 'Messages' }} />
        <Stack.Screen name="my-network" options={{ title: 'My Network' }} />
        <Stack.Screen name="tournament" options={{ title: 'Tournaments' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
