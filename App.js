// App.js — Expo SDK 52 Production
// Splash: AppNavigator Splash() component மட்டும் தெரியும்
// Native expo splash DISABLED (resizeMode: "native" trick not needed — just don't preventAutoHideAsync)
// App.js-ல எந்த loading screen-உம் இல்லை — நேரடியா AppNavigator render ஆகும்
// AppNavigator-ல authLoading true-ஆ இருக்கும்போது Splash() component தெரியும்

import React, { Component, useEffect, useRef } from 'react';
import { StatusBar, Linking } from 'react-native';
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
import { setupAndroidChannel }     from './firebase/notifications';

// Native splash — உடனே hide பண்ணிடுவோம் (App.js-ல JS splash இல்லை)
// AppNavigator Splash() component தெரியும் authLoading-ஓட போது
SplashScreen.preventAutoHideAsync().catch(() => {});

const ESSENTIAL_FONTS = {
  'Feather':  require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf'),
  'Ionicons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
};
const EXTRA_FONTS = {
  'MaterialIcons':          require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
  'MaterialCommunityIcons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
};

// ── Foreground notification handler ──────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ── Error Boundary ────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e) { console.error('[App ErrorBoundary]', e.message); }
  render() {
    if (this.state.hasError)
      return <MaintenanceScreen message="Unexpected error. Please restart the app." />;
    return this.props.children;
  }
}

// ── Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const notifSubRef = useRef(null);

  useEffect(() => {
    // Native splash உடனே hide — AppNavigator Splash() component தெரியும்
    SplashScreen.hideAsync().catch(() => {});

    // Fonts background-ல load (blocking இல்லை)
    Font.loadAsync(ESSENTIAL_FONTS).catch(() => {});
    Font.loadAsync(EXTRA_FONTS).catch(() => {});

    // FCM channel setup
    setupAndroidChannel().catch(() => {});
  }, []);

  // Notification tap listener
  useEffect(() => {
    notifSubRef.current = Notifications.addNotificationResponseReceivedListener(() => {});
    return () => notifSubRef.current?.remove();
  }, []);

  // Share intent listener
  useEffect(() => {
    const handleUrl = ({ url }) => {
      if (!url) return;
      try { decodeURIComponent(url); } catch {}
    };
    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub?.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ExpoStatusBar style="light" />
        <ErrorBoundary>
          <AuthProvider>
            <UserProvider>
              <BookingProvider>
                <AppNavigator />
              </BookingProvider>
            </UserProvider>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
