// App.js
//
// MAINTENANCE MODE LOGIC:
// ─────────────────────────────────────────────────────────────────────────
//  App starts → listens to Firestore: appConfig/maintenance in real-time
//  isUnderMaintenance = true  → MaintenanceScreen shown to ALL users
//  isUnderMaintenance = false → App works normally
//
//  Admin toggles from Firebase Console:
//    Collection: appConfig | Document: maintenance
//    Set field:  isUnderMaintenance = true   (LOCK all users)
//    Set field:  isUnderMaintenance = false  (RESTORE app)
//    Optional:   message = "We are upgrading the server. Back in 30 mins!"
//
//  Crash protection:
//    ErrorBoundary catches any JS crash → shows "Namma Vayal" maintenance screen
//    Users never see a blank white crash screen
// ─────────────────────────────────────────────────────────────────────────

import React, { Component, useState, useEffect } from 'react';
import {
  Text, TouchableOpacity, ScrollView,
  StyleSheet, View, ActivityIndicator,
} from 'react-native';
import { StatusBar }              from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider }       from 'react-native-safe-area-context';
import { AuthProvider }           from './context/AuthContext';
import { UserProvider }           from './context/UserContext';
import { BookingProvider }        from './context/BookingContext';
import AppNavigator               from './navigation/AppNavigator';
import MaintenanceScreen          from './src/common/screens/MaintenanceScreen';
import { listenMaintenanceStatus } from './firebase/firestore';

// ── Error Boundary ────────────────────────────────────────────────────────────
// Catches any JS crash in the component tree.
// Shows "Namma Vayal — Under Maintenance" instead of blank white screen.
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

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
            'Our team has been notified and is working on a fix.\n\n' +
            'Please wait — the app will restore automatically.'
          }
        />
      );
    }
    return this.props.children;
  }
}

// ── Maintenance Gate ──────────────────────────────────────────────────────────
// Listens to Firestore in real-time.
// If maintenance mode ON → wraps children with MaintenanceScreen.
function MaintenanceGate({ children }) {
  const [checking,     setChecking]     = useState(true);  // initial load
  const [isMaintenance, setMaintenance] = useState(false);
  const [message,       setMessage]     = useState(null);

  useEffect(() => {
    // Real-time listener — fires instantly when admin toggles maintenance
    const unsub = listenMaintenanceStatus(({ isUnderMaintenance, message: msg }) => {
      setMaintenance(isUnderMaintenance);
      setMessage(msg);
      setChecking(false);
    });
    return unsub; // cleanup on unmount
  }, []);

  // Show loading spinner only on very first check (< 1 second usually)
  if (checking) {
    return (
      <View style={ls.loadWrap}>
        <Text style={ls.loadIcon}>🌾</Text>
        <Text style={ls.loadAppName}>Namma Vayal</Text>
        <ActivityIndicator color="#1C7C54" size="large" style={{ marginTop: 16 }} />
      </View>
    );
  }

  // Maintenance ON → show maintenance screen to ALL users (farmer/owner/admin)
  if (isMaintenance) {
    return <MaintenanceScreen message={message} />;
  }

  // Normal → show the app
  return children;
}

const ls = StyleSheet.create({
  loadWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loadIcon:    { fontSize: 52, marginBottom: 8 },
  loadAppName: { fontSize: 22, fontWeight: '900', color: '#1C7C54', letterSpacing: 1 },
});

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* ErrorBoundary: catches crashes → shows maintenance UI */}
        <ErrorBoundary>
          {/* MaintenanceGate: listens Firestore → blocks all screens if needed */}
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
