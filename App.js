// App.js — Production ready, all Android ratios supported
import React, { Component, useState, useEffect } from 'react';
import {
  Text, StyleSheet, View, ActivityIndicator, StatusBar,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { GestureHandlerRootView }     from 'react-native-gesture-handler';
import { SafeAreaProvider }           from 'react-native-safe-area-context';
import * as Font                      from 'expo-font';
import * as SplashScreen              from 'expo-splash-screen';

import { AuthProvider }            from './context/AuthContext';
import { UserProvider }            from './context/UserContext';
import { BookingProvider }         from './context/BookingContext';
import AppNavigator                from './navigation/AppNavigator';
import MaintenanceScreen           from './src/common/screens/MaintenanceScreen';
import { listenMaintenanceStatus } from './firebase/firestore';
import { rs, rf }                  from './utils/responsive';

SplashScreen.preventAutoHideAsync().catch(() => {});

const ESSENTIAL_FONTS = {
  'Feather':  require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf'),
  'Ionicons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
};
const EXTRA_FONTS = {
  'MaterialIcons':          require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
  'MaterialCommunityIcons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
};

// ── Error Boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e) { console.error('[App]', e.message); }
  render() {
    if (this.state.hasError)
      return <MaintenanceScreen message="Unexpected error. Please restart the app." />;
    return this.props.children;
  }
}

// ── Maintenance gate — max 3s ──────────────────────────────────────────────
function MaintenanceGate({ children }) {
  const [done,    setDone]    = useState(false);
  const [isMaint, setIsMaint] = useState(false);
  const [msg,     setMsg]     = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDone(true), 3000);
    const unsub   = listenMaintenanceStatus(({ isUnderMaintenance, message }) => {
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
      <ActivityIndicator color="#1C7C54" size="large" style={{ marginTop: rs(16) }} />
    </View>
  );

  if (isMaint) return <MaintenanceScreen message={msg} />;
  return children;
}

const ls = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  emoji: { fontSize: rf(52), marginBottom: rs(8) },
  name:  { fontSize: rf(22), fontWeight: '900', color: '#1C7C54', letterSpacing: 1 },
});

// ── Root ───────────────────────────────────────────────────────────────────
export default function App() {
  const [essentialReady, setEssentialReady] = useState(false);

  useEffect(() => {
    let done = false;
    (async () => {
      try {
        await Promise.race([
          Font.loadAsync(ESSENTIAL_FONTS),
          new Promise(r => setTimeout(r, 2000)),
        ]);
      } catch {}
      finally {
        if (!done) {
          done = true;
          setEssentialReady(true);
          SplashScreen.hideAsync().catch(() => {});
          Font.loadAsync(EXTRA_FONTS).catch(() => {});
        }
      }
    })();
    return () => { done = true; };
  }, []);

  if (!essentialReady) {
    return (
      <View style={ls.wrap}>
        <Text style={ls.emoji}>🌾</Text>
        <Text style={ls.name}>Namma Vayal</Text>
        <ActivityIndicator color="#1C7C54" size="large" style={{ marginTop: rs(16) }} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <ExpoStatusBar style="dark" />
        <ErrorBoundary>
          <MaintenanceGate>
            <AuthProvider>
              <UserProvider>
                <BookingProvider>
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
