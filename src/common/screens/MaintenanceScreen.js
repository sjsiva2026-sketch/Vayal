// src/common/screens/MaintenanceScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
  SafeAreaView, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { rs, rf }         from '../../../utils/responsive';

export default function MaintenanceScreen({ message }) {
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0,1], outputRange: ['0deg','360deg'] });
  const displayMessage = message || 'We are currently performing maintenance to improve your experience.\nWe will be back shortly!';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F4C2A" />
      <LinearGradient colors={['#0F4C2A','#145A3E','#1C7C54','#2E9E6B']} style={s.gradient}>
        <Animated.View style={[s.content, { opacity: fadeAnim }]}>

          <View style={s.appNameRow}>
            <Text style={s.appNameIcon}>🌾</Text>
            <Text style={s.appName}>Namma Vayal</Text>
          </View>
          <Text style={s.appNameTamil}>நம்ம வாயல்</Text>

          <Animated.View style={[s.gearWrap, { transform: [{ scale: pulseAnim }] }]}>
            <View style={s.gearOuter}>
              <Animated.Text style={[s.gearIcon, { transform: [{ rotate: spin }] }]}>⚙️</Animated.Text>
            </View>
          </Animated.View>

          <Text style={s.title}>Under Maintenance</Text>
          <Text style={s.titleTamil}>பராமரிப்பு பணிகள் நடைபெறுகின்றன</Text>

          <View style={s.divider} />

          <View style={s.messageCard}>
            <Text style={s.messageIcon}>🛠️</Text>
            <Text style={s.message}>{displayMessage}</Text>
          </View>

          <View style={s.tilesRow}>
            {[
              { icon: '⏱️', txt: 'Back Soon'    },
              { icon: '🔒', txt: 'Data Safe'    },
              { icon: '✅', txt: 'Auto Restore' },
            ].map(t => (
              <View key={t.txt} style={s.tile}>
                <Text style={s.tileIcon}>{t.icon}</Text>
                <Text style={s.tileTxt}>{t.txt}</Text>
              </View>
            ))}
          </View>

          <View style={s.autoNote}>
            <Text style={s.autoNoteTxt}>
              🔄 App will automatically restore once maintenance is complete.{'\n'}No need to reinstall or refresh.
            </Text>
          </View>

          <Text style={s.footer}>Namma Vayal — Connecting Farmers & Machine Owners</Text>
          <Text style={s.footerTamil}>நம்ம வாயல் — விவசாயிகள் மற்றும் இயந்திர உரிமையாளர்களை இணைக்கிறது</Text>

        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#0F4C2A' },
  gradient:     { flex: 1 },
  content:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: rs(28), paddingVertical: rs(20) },
  appNameRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: rs(4) },
  appNameIcon:  { fontSize: rf(28), marginRight: rs(8) },
  appName:      { fontSize: rf(26), fontWeight: '900', color: '#fff', letterSpacing: 1 },
  appNameTamil: { fontSize: rf(14), color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: rs(28) },
  gearWrap:     { marginBottom: rs(24) },
  gearOuter:    { width: rs(110), height: rs(110), borderRadius: rs(55), backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: rs(2), borderColor: 'rgba(255,255,255,0.2)' },
  gearIcon:     { fontSize: rf(60) },
  title:        { fontSize: rf(26), fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: rs(6) },
  titleTamil:   { fontSize: rf(13), color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: rs(20) },
  divider:      { width: rs(60), height: rs(3), backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: rs(2), marginBottom: rs(20) },
  messageCard:  { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: rs(16), padding: rs(18), alignItems: 'center', marginBottom: rs(20), width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  messageIcon:  { fontSize: rf(28), marginBottom: rs(10) },
  message:      { fontSize: rf(14), color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: rf(22) },
  tilesRow:     { flexDirection: 'row', gap: rs(10), marginBottom: rs(20), width: '100%' },
  tile:         { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: rs(12), paddingVertical: rs(14), alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tileIcon:     { fontSize: rf(20), marginBottom: rs(6) },
  tileTxt:      { fontSize: rf(11), color: 'rgba(255,255,255,0.8)', fontWeight: '700', textAlign: 'center' },
  autoNote:     { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: rs(12), padding: rs(14), marginBottom: rs(24), width: '100%', borderLeftWidth: rs(3), borderLeftColor: '#6EE7B7' },
  autoNoteTxt:  { fontSize: rf(12), color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: rf(20) },
  footer:       { fontSize: rf(12), color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: rs(4) },
  footerTamil:  { fontSize: rf(11), color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
});
