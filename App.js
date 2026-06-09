// App.js — Production ready, all Android ratios supported
import React, { Component, useState, useEffect, useRef } from 'react';
import {
  Text, StyleSheet, View, ActivityIndicator, StatusBar, Linking,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { GestureHandlerRootView }     from 'react-native-gesture-handler';
import { SafeAreaProvider }           from 'react-native-safe-area-context';
import * as Font                      from 'expo-font';
import * as SplashScreen              from 'expo-splash-screen';
import * as Notifications             from 'expo-notifications';

import { AuthProvider }            from './context/AuthContext';
import { UserProvider }            from './context/UserContext';
import { BookingProvider }         from './context/BookingContext';
import AppNavigator                from './navigation/AppNavigator';
import MaintenanceScreen           from './src/common/screens/MaintenanceScreen';
import { listenMaintenanceStatus } from './firebase/firestore';
import { setupAndroidChannel }     from './firebase/notifications';
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

// ── Global foreground notification handler ───────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

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
  const notifResponseSub = useRef(null);

  // ── Setup Android notification channel on launch ──────────────────────
  useEffect(() => {
    setupAndroidChannel().catch(() => {});
  }, []);

  // ── Notification tap listener (background → foreground) ───────────────
  // Navigation is handled inside AppNavigator via its own navRef
  useEffect(() => {
    notifResponseSub.current = Notifications.addNotificationResponseReceivedListener(response => {
      // AppNavigator handles deep-navigation via its own navRef
      // This listener ensures the app wakes up from terminated state
    });
    return () => notifResponseSub.current?.remove();
  }, []);

  // ── Handle share intent (GPay/PhonePe/Paytm share) ────────────────────
  useEffect(() => {
    const handleUrl = ({ url }) => {
      if (!url) return;
      try {
        const uri = decodeURIComponent(url);
        if (uri.startsWith('content://') || uri.startsWith('file://') ||
            uri.includes('image') || uri.includes('screenshot')) {
          // AppNavigator handles navigation via its own ref
        }
      } catch {}
    };
    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub?.remove();
  }, []);

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
