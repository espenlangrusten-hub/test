import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';

export default function RootLayout() {
  return (
    <AppProvider>
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
        <Stack.Screen name="format" options={{ title: 'Select Format' }} />
        <Stack.Screen name="team-setup" options={{ title: 'Squad Setup' }} />
        <Stack.Screen name="tactics" options={{ title: 'Tactics Board' }} />
        <Stack.Screen name="match" options={{ title: 'Match Day' }} />
        <Stack.Screen name="tactic-guide" options={{ title: 'Tactic Guide' }} />
        <Stack.Screen name="player-notes" options={{ title: 'Player Notes' }} />
        <Stack.Screen name="match-history" options={{ title: 'Match History' }} />
      </Stack>
    </AppProvider>
  );
}
