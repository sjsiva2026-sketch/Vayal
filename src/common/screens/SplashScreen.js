import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const t = setTimeout(() => navigation.replace('RoleSelect'), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <LinearGradient colors={['#145A3E', '#1C7C54', '#2E9E6B']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#145A3E" />
      <View style={styles.logoWrap}>
        <Text style={styles.logoEmoji}>🌾</Text>
      </View>
      <Text style={styles.title}>VAYAL</Text>
      <Text style={styles.titleTamil}>வாயல்</Text>
      <Text style={styles.tagline}>Farmer–Machine Connect</Text>
      <View style={styles.dots}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoWrap:   { width: 140, height: 140, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 28, elevation: 10 },
  logoEmoji:  { fontSize: 70 },
  title:      { fontSize: 52, fontWeight: '900', color: '#fff', letterSpacing: 12, marginBottom: 4 },
  titleTamil: { fontSize: 22, color: 'rgba(255,255,255,0.75)', marginBottom: 8 },
  tagline:    { fontSize: 14, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 },
  dots:       { flexDirection: 'row', position: 'absolute', bottom: 60 },
  dot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  dotActive:  { backgroundColor: '#fff', width: 24 },
});
