// src/common/screens/MaintenanceScreen.js
//
// Shown to ALL users (farmer/owner/admin) when:
//   Firestore: appConfig/maintenance → { isUnderMaintenance: true }
//
// Admin sets this via Firebase Console or Admin dashboard.
// Disappears automatically when isUnderMaintenance → false (real-time).

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
  SafeAreaView, StatusBar, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function MaintenanceScreen({ message }) {
  // Pulsing animation for the gear icon
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gear spin
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue:         1,
        duration:        4000,
        easing:          Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12, duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1, duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade-in screen
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const displayMessage = message ||
    'We are currently performing maintenance to improve your experience.\nWe will be back shortly!';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F4C2A" />
      <LinearGradient
        colors={['#0F4C2A', '#145A3E', '#1C7C54', '#2E9E6B']}
        style={s.gradient}
      >
        <Animated.View style={[s.content, { opacity: fadeAnim }]}>

          {/* App Name */}
          <View style={s.appNameRow}>
            <Text style={s.appNameIcon}>🌾</Text>
            <Text style={s.appName}>Namma Vayal</Text>
          </View>
          <Text style={s.appNameTamil}>நம்ம வாயல்</Text>

          {/* Animated Gear */}
          <Animated.View style={[s.gearWrap, { transform: [{ scale: pulseAnim }] }]}>
            <View style={s.gearOuter}>
              <Animated.Text style={[s.gearIcon, { transform: [{ rotate: spin }] }]}>
                ⚙️
              </Animated.Text>
            </View>
          </Animated.View>

          {/* Maintenance Title */}
          <Text style={s.title}>Under Maintenance</Text>
          <Text style={s.titleTamil}>பராமரிப்பு பணிகள் நடைபெறுகின்றன</Text>

          {/* Divider */}
          <View style={s.divider} />

          {/* Message */}
          <View style={s.messageCard}>
            <Text style={s.messageIcon}>🛠️</Text>
            <Text style={s.message}>{displayMessage}</Text>
          </View>

          {/* Info tiles */}
          <View style={s.tilesRow}>
            <View style={s.tile}>
              <Text style={s.tileIcon}>⏱️</Text>
              <Text style={s.tileTxt}>Back Soon</Text>
            </View>
            <View style={s.tile}>
              <Text style={s.tileIcon}>🔒</Text>
              <Text style={s.tileTxt}>Data Safe</Text>
            </View>
            <View style={s.tile}>
              <Text style={s.tileIcon}>✅</Text>
              <Text style={s.tileTxt}>Auto Restore</Text>
            </View>
          </View>

          {/* Auto-restore note */}
          <View style={s.autoNote}>
            <Text style={s.autoNoteTxt}>
              🔄 App will automatically restore once maintenance is complete.{'\n'}
              No need to reinstall or refresh.
            </Text>
          </View>

          {/* Footer */}
          <Text style={s.footer}>
            Namma Vayal — Connecting Farmers & Machine Owners
          </Text>
          <Text style={s.footerTamil}>
            நம்ம வாயல் — விவசாயிகள் மற்றும் இயந்திர உரிமையாளர்களை இணைக்கிறது
          </Text>

        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#0F4C2A' },
  gradient:     { flex: 1 },
  content:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 20 },

  // App name
  appNameRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  appNameIcon:  { fontSize: 28, marginRight: 8 },
  appName:      { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  appNameTamil: { fontSize: 14, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: 28 },

  // Gear
  gearWrap:     { marginBottom: 24 },
  gearOuter:    {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  gearIcon:     { fontSize: 60 },

  // Title
  title:        { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 6 },
  titleTamil:   { fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 20 },

  // Divider
  divider:      { width: 60, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, marginBottom: 20 },

  // Message card
  messageCard:  {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16, padding: 18,
    alignItems: 'center', marginBottom: 20,
    width: '100%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  messageIcon:  { fontSize: 28, marginBottom: 10 },
  message:      { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 22 },

  // Info tiles
  tilesRow:     { flexDirection: 'row', gap: 10, marginBottom: 20, width: '100%' },
  tile:         {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  tileIcon:     { fontSize: 20, marginBottom: 6 },
  tileTxt:      { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '700', textAlign: 'center' },

  // Auto restore note
  autoNote:     {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 14,
    marginBottom: 24, width: '100%',
    borderLeftWidth: 3, borderLeftColor: '#6EE7B7',
  },
  autoNoteTxt:  { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20 },

  // Footer
  footer:       { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 4 },
  footerTamil:  { fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
});
