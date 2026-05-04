// App.js — Fast loading + Admin login support
// FIXES:
// 1. Fonts load in background (don't block render)
// 2. MaintenanceGate has 3s timeout — never blocks app
// 3. Parallel font + auth loading
// 4. Admin can log in via phone (role=admin) — no separate screen needed

import React, { Component, useState, useEffect, useRef } from 'react';
import { Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { StatusBar }              from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider }       from 'react-native-safe-area-context';
import * as Font                  from 'expo-font';
import * as SplashScreen          from 'expo-splash-screen';

import { AuthProvider }            from './context/AuthContext';
import { UserProvider }            from './context/UserContext';
import { BookingProvider }         from './context/BookingContext';
import AppNavigator                from './navigation/AppNavigator';
import MaintenanceScreen           from './src/common/screens/MaintenanceScreen';
import { listenMaintenanceStatus } from './firebase/firestore';
import { useNetworkStatus }        from './utils/network';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Load only 2 essential fonts first (Feather + Ionicons) — rest load later
const ESSENTIAL_FONTS = {
  'Feather':   require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf'),
  'Ionicons':  require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
};
const EXTRA_FONTS = {
  'MaterialIcons':          require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
  'MaterialCommunityIcons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
};

// ── Offline Banner ─────────────────────────────────────────────────────────
function OfflineBanner() {
  const isConnected = useNetworkStatus();
  if (isConnected) return null;
  return (
    <View style={ob.banner}>
      <Text style={ob.txt}>📶 No internet · App works offline · Syncs when connected</Text>
    </View>
  );
}
const ob = StyleSheet.create({
  banner: { backgroundColor: '#F59E0B', paddingVertical: 7, paddingHorizontal: 16, alignItems: 'center' },
  txt:    { fontSize: 11, color: '#fff', fontWeight: '700', textAlign: 'center' },
});

// ── Error Boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e, info) { console.error('[NammaVayal]', e.message, info.componentStack); }
  render() {
    if (this.state.hasError) return <MaintenanceScreen message="Unexpected error. Please restart the app." />;
    return this.props.children;
  }
}

// ── Maintenance Gate — max 3s wait ─────────────────────────────────────────
// If Firestore doesn't respond in 3s → show app normally (not maintenance)
function MaintenanceGate({ children }) {
  const [done,    setDone]    = useState(false);
  const [isMaint, setIsMaint] = useState(false);
  const [msg,     setMsg]     = useState(null);

  useEffect(() => {
    // Timeout: if Firestore takes > 3s, skip maintenance check → show app
    const timeout = setTimeout(() => setDone(true), 3000);

    const unsub = listenMaintenanceStatus(({ isUnderMaintenance, message }) => {
      clearTimeout(timeout);
      setIsMaint(isUnderMaintenance);
      setMsg(message);
      setDone(true);
    });

    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  if (!done) return (
    <View style={ls.wrap}>
      <Text style={ls.emoji}>🌾</Text>
      <Text style={ls.name}>Namma Vayal</Text>
      <ActivityIndicator color="#1C7C54" size="large" style={{ marginTop: 14 }} />
    </View>
  );

  if (isMaint) return <MaintenanceScreen message={msg} />;
  return children;
}

const ls = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  emoji: { fontSize: 52, marginBottom: 8 },
  name:  { fontSize: 22, fontWeight: '900', color: '#1C7C54', letterSpacing: 1 },
});

// ── Root App ───────────────────────────────────────────────────────────────
export default function App() {
  const [essentialReady, setEssentialReady] = useState(false);

  useEffect(() => {
    let done = false;

    async function bootstrap() {
      try {
        // Load only essential fonts — blocks render (fast, 2 fonts)
        await Promise.race([
          Font.loadAsync(ESSENTIAL_FONTS),
          new Promise(r => setTimeout(r, 2000)), // max 2s wait
        ]);
      } catch (e) {
        console.warn('[Fonts] essential load warning:', e.message);
      } finally {
        if (!done) {
          done = true;
          setEssentialReady(true);
          SplashScreen.hideAsync().catch(() => {});
        }
      }

      // Load extra fonts in background (don't block render)
      Font.loadAsync(EXTRA_FONTS).catch(() => {});
    }

    bootstrap();
    return () => { done = true; };
  }, []);

  if (!essentialReady) {
    return (
      <View style={ls.wrap}>
        <Text style={ls.emoji}>🌾</Text>
        <Text style={ls.name}>Namma Vayal</Text>
        <ActivityIndicator color="#1C7C54" size="large" style={{ marginTop: 14 }} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <OfflineBanner />
        <ErrorBoundary>
          <MaintenanceGate>
            <AuthProvider>
              <UserProvider>
                <BookingProvider>
                  <StatusBar style="light" backgroundColor="#1C7C54" />
                  <AppNavigator />
                </BookingProvider>
              </UserProvider>
            </AuthProvider>
          </MaintenanceGate>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
