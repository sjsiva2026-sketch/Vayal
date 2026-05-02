// App.js
import React, { Component, useState, useEffect } from 'react';
import {
  Text, StyleSheet, View, ActivityIndicator,
} from 'react-native';
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

// ── Icon fonts map ─────────────────────────────────────────────────────────────
const ICON_FONTS = {
  'Feather':                require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf'),
  'Ionicons':               require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  'MaterialIcons':          require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
  'MaterialCommunityIcons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
};

// ── Offline Banner ─────────────────────────────────────────────────────────────
// Shown at top of app when no internet connection
// Disappears automatically when connection restores
function OfflineBanner() {
  const isConnected = useNetworkStatus();
  if (isConnected) return null;
  return (
    <View style={ob.banner}>
      <Text style={ob.bannerTxt}>
        📶 No internet connection · App works offline · Data will sync when connected
      </Text>
    </View>
  );
}

const ob = StyleSheet.create({
  banner: {
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bannerTxt: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
});

// ── Error Boundary ─────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error, info) {
    console.error('[NammaVayal] CRASH:', error.message);
    console.error('[NammaVayal] STACK:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <MaintenanceScreen
          message={
            'Namma Vayal experienced an unexpected error.\n' +
            'Please restart the app.'
          }
        />
      );
    }
    return this.props.children;
  }
}

// ── Maintenance Gate ────────────────────────────────────────────────────────────
function MaintenanceGate({ children }) {
  const [checking,      setChecking]    = useState(true);
  const [isMaintenance, setMaintenance] = useState(false);
  const [message,       setMessage]     = useState(null);

  useEffect(() => {
    const unsub = listenMaintenanceStatus(({ isUnderMaintenance, message: msg }) => {
      setMaintenance(isUnderMaintenance);
      setMessage(msg);
      setChecking(false);
    });
    return unsub;
  }, []);

  if (checking) {
    return (
      <View style={ls.loadWrap}>
        <Text style={ls.loadIcon}>🌾</Text>
        <Text style={ls.loadAppName}>Namma Vayal</Text>
        <ActivityIndicator color="#1C7C54" size="large" style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (isMaintenance) return <MaintenanceScreen message={message} />;
  return children;
}

const ls = StyleSheet.create({
  loadWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loadIcon:    { fontSize: 52, marginBottom: 8 },
  loadAppName: { fontSize: 22, fontWeight: '900', color: '#1C7C54', letterSpacing: 1 },
});

// ── Root App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync(ICON_FONTS);
      } catch (e) {
        console.warn('[NammaVayal] Font load warning:', e.message);
      } finally {
        setFontsLoaded(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={ls.loadWrap}>
        <Text style={ls.loadIcon}>🌾</Text>
        <Text style={ls.loadAppName}>Namma Vayal</Text>
        <ActivityIndicator color="#1C7C54" size="large" style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Offline banner — shows automatically when no internet */}
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
