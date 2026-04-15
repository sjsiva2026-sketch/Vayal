import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, SafeAreaView, Alert,
  KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { sendOTP }  from '../../../firebase/auth';
import { COLORS }   from '../../../constants/colors';

export default function LoginScreen({ navigation, route }) {
  const role      = route?.params?.role || 'farmer';
  const isFarmer  = role === 'farmer';
  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [devOTP,  setDevOTP]  = useState('');

  const handleSendOTP = async () => {
    const cleaned = phone.trim();
    if (cleaned.length !== 10 || !/^\d{10}$/.test(cleaned)) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    setDevOTP('');
    try {
      const result = await sendOTP(`+91${cleaned}`);
      if (result?.otp) setDevOTP(result.otp);
      navigation.navigate('OTP', { phone: cleaned, role, devOTP: result?.otp });
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const ready = phone.length === 10;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#145A3E" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

        <LinearGradient colors={['#145A3E', '#1C7C54', '#2E9E6B']} style={s.header}>
          <View style={s.iconBox}>
            <Text style={s.icon}>{isFarmer ? '👨‍🌾' : '🚜'}</Text>
          </View>
          <Text style={s.headerTitle}>{isFarmer ? 'Farmer Login' : 'Owner Login'}</Text>
          <Text style={s.headerSub}>Enter your mobile number to receive OTP</Text>
        </LinearGradient>

        <View style={s.card}>
          <View style={s.sheetHandle} />
          <Text style={s.label}>Mobile Number</Text>

          <View style={[s.inputWrap, phone.length > 0 && s.inputWrapActive]}>
            <View style={s.flagBox}>
              <Text style={s.flagEmoji}>🇮🇳</Text>
              <Text style={s.flagCode}> +91</Text>
            </View>
            <View style={s.divider} />
            <TextInput
              style={s.input}
              placeholder="9876543210"
              placeholderTextColor="#C9D1DA"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />
            {ready && <Text style={s.checkMark}>✓</Text>}
          </View>

          {/* Progress bar */}
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${phone.length * 10}%` }]} />
          </View>
          <Text style={s.progressTxt}>{phone.length}/10 digits</Text>

          <TouchableOpacity
            style={[s.btn, !ready && s.btnOff]}
            onPress={handleSendOTP}
            disabled={!ready || loading}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={ready ? ['#1C7C54', '#2E9E6B'] : ['#D1D5DB', '#D1D5DB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.btnGradient}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnTxt}>Get OTP  →</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          {devOTP ? (
            <View style={s.otpReveal}>
              <Text style={s.otpRevealTitle}>🔑  Your OTP Code</Text>
              <Text style={s.otpRevealCode}>{devOTP}</Text>
              <Text style={s.otpRevealNote}>Dev mode — will be SMS in production</Text>
            </View>
          ) : (
            <View style={s.infoBox}>
              <Text style={s.infoTxt}>💡  OTP appears on screen (dev mode)</Text>
              <Text style={s.infoSub}>No SMS cost · Free development</Text>
            </View>
          )}

          <Text style={s.footer}>🔒 Your number is safe · No spam ever</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#145A3E' },
  header:        { paddingTop: 36, paddingBottom: 44, paddingHorizontal: 24, alignItems: 'center' },
  iconBox:       { width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  icon:          { fontSize: 38 },
  headerTitle:   { fontSize: 26, fontWeight: '900', color: '#fff' },
  headerSub:     { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6, textAlign: 'center' },
  card:          { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 16 },
  sheetHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 24 },
  label:         { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  inputWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, borderWidth: 2, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 10 },
  inputWrapActive:{ borderColor: COLORS.primary, backgroundColor: '#FAFFFE' },
  flagBox:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 16 },
  flagEmoji:     { fontSize: 20 },
  flagCode:      { fontSize: 15, fontWeight: '700', color: '#374151' },
  divider:       { width: 1, height: 28, backgroundColor: '#E5E7EB' },
  input:         { flex: 1, paddingHorizontal: 16, paddingVertical: 16, fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: 4 },
  checkMark:     { paddingRight: 16, fontSize: 20, color: COLORS.primary, fontWeight: '900' },
  progressBar:   { height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, marginBottom: 6, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  progressTxt:   { fontSize: 12, color: '#9CA3AF', marginBottom: 20 },
  btn:           { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  btnOff:        { opacity: 0.7 },
  btnGradient:   { alignItems: 'center', justifyContent: 'center', paddingVertical: 17 },
  btnTxt:        { color: '#fff', fontSize: 17, fontWeight: '800' },
  otpReveal:     { backgroundColor: '#ECFDF5', borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: '#6EE7B7', marginBottom: 16 },
  otpRevealTitle:{ fontSize: 14, fontWeight: '700', color: '#065F46', marginBottom: 10 },
  otpRevealCode: { fontSize: 44, fontWeight: '900', color: '#059669', letterSpacing: 12, marginBottom: 6 },
  otpRevealNote: { fontSize: 11, color: '#6B7280' },
  infoBox:       { backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: '#F59E0B', marginBottom: 16 },
  infoTxt:       { fontSize: 13, color: '#92400E', fontWeight: '600' },
  infoSub:       { fontSize: 12, color: '#B45309', marginTop: 4 },
  footer:        { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
});
