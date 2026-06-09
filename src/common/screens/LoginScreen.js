// src/common/screens/LoginScreen.js
// Production: Real Firebase Phone Auth OTP via SMS
// reCAPTCHA handled by FirebaseRecaptchaVerifierModal (expo-firebase-recaptcha)

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, KeyboardAvoidingView, Platform,
  StatusBar, ActivityIndicator, ScrollView, Image, Dimensions,
} from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { sendOTP } from '../../../firebase/auth';
import app         from '../../../firebase/config';
import { FIcon }   from '../../../utils/icons';
import { ICONS }   from '../../../assets/index';
import { IMG }     from '../../../utils/imageSize';

const PRIMARY      = '#1C7C54';
const { width: W } = Dimensions.get('window');
const scale        = W / 375;
const rf           = (dp) => Math.round(dp * scale);

export default function LoginScreen({ navigation, route }) {
  const role     = route?.params?.role || 'farmer';
  const isFarmer = role === 'farmer';

  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // reCAPTCHA verifier ref — required for Firebase Phone Auth
  const recaptchaVerifier = useRef(null);

  const handleSendOTP = async () => {
    const cleaned = phone.trim();
    if (cleaned.length !== 10 || !/^\d{10}$/.test(cleaned)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendOTP(`+91${cleaned}`, recaptchaVerifier.current);
      // Navigate to OTP screen — no devOTP passed
      navigation.navigate('OTP', { phone: cleaned, role });
    } catch (e) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('network') || msg.includes('offline') || msg.includes('unavailable')) {
        setError('No internet connection. Check and try again.');
      } else if (msg.includes('too many') || msg.includes('too-many')) {
        setError('Too many attempts. Wait a few minutes and try again.');
      } else if (msg.includes('invalid phone') || msg.includes('invalid-phone')) {
        setError('Invalid phone number. Check and try again.');
      } else if (msg.includes('quota')) {
        setError('SMS quota exceeded. Please try again later.');
      } else if (msg.includes('recaptcha') || msg.includes('captcha')) {
        setError('Verification failed. Please try again.');
      } else {
        setError(e.message || 'Could not send OTP. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const ready = phone.length === 10;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Firebase reCAPTCHA — invisible, required for phone auth */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={app.options}
        attemptInvisibleVerification={true}
      />

      <KeyboardAvoidingView style={s.kav} behavior="height">
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <FIcon name="arrow-left" size={22} color="#111827" fallback="←" />
          </TouchableOpacity>

          <View style={s.topSection}>
            <View style={[
              s.roleCircle,
              {
                width:           IMG.ROLE_CONTAINER,
                height:          IMG.ROLE_CONTAINER,
                borderRadius:    IMG.ROLE_CONTAINER / 2,
                backgroundColor: isFarmer ? '#E8F5EE' : '#FFF8E1',
              },
            ]}>
              <Image
                source={isFarmer ? ICONS.farmer : ICONS.owner}
                style={{ width: IMG.ROLE_SIZE, height: IMG.ROLE_SIZE }}
                resizeMode="contain"
              />
            </View>
            <Text style={s.title}>{isFarmer ? 'Farmer Login' : 'Owner Login'}</Text>
            <Text style={s.subtitle}>Enter your mobile number to receive OTP</Text>
          </View>

          <View style={s.card}>
            <View style={s.handle} />
            <Text style={s.fieldLabel}>Mobile Number</Text>

            <View style={[s.inputRow, ready && s.inputRowActive]}>
              <View style={s.flagSection}>
                <Text style={s.flag}>🇮🇳</Text>
                <Text style={s.cc}> +91</Text>
              </View>
              <View style={s.divider} />
              <TextInput
                style={s.phoneInput}
                placeholder="9876543210"
                placeholderTextColor="#C9D1DA"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={v => { setPhone(v); setError(''); }}
                autoFocus
              />
              {ready && <Text style={s.checkMark}>✓</Text>}
            </View>

            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${phone.length * 10}%` }]} />
            </View>
            <Text style={s.progressTxt}>{phone.length}/10 digits entered</Text>

            {!!error && (
              <View style={s.errorBox}>
                <Text style={s.errorTxt}>⚠️  {error}</Text>
              </View>
            )}

            <View style={s.infoBox}>
              <Text style={s.infoTxt}>
                📱 A one-time password will be sent to your mobile number via SMS
              </Text>
            </View>

            <TouchableOpacity
              style={[s.btn, !ready && s.btnOff]}
              onPress={handleSendOTP}
              disabled={!ready || loading}
              activeOpacity={0.88}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnTxt}>Get OTP →</Text>
              }
            </TouchableOpacity>
            <Text style={s.footer}>🔒 Your number is safe · No spam ever</Text>
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#fff' },
  kav:            { flex: 1 },
  scroll:         { flexGrow: 1 },
  backBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 14, alignSelf: 'flex-start' },
  topSection:     { alignItems: 'center', paddingVertical: 22, paddingHorizontal: 20 },
  roleCircle:     { alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden' },
  title:          { fontSize: rf(22), fontWeight: '900', color: '#111827', marginBottom: 6 },
  subtitle:       { fontSize: rf(13), color: '#6B7280', textAlign: 'center' },
  card:           { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  handle:         { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 22 },
  fieldLabel:     { fontSize: rf(14), fontWeight: '700', color: '#374151', marginBottom: 10 },
  inputRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F5F7', borderRadius: 14, borderWidth: 2, borderColor: 'transparent', marginBottom: 10, overflow: 'hidden' },
  inputRowActive: { borderColor: PRIMARY, backgroundColor: '#FAFFFE' },
  flagSection:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14 },
  flag:           { fontSize: rf(20) },
  cc:             { fontSize: rf(14), fontWeight: '700', color: '#374151' },
  divider:        { width: 1, height: 26, backgroundColor: '#D1D5DB', marginRight: 4 },
  phoneInput:     { flex: 1, paddingHorizontal: 10, paddingVertical: 14, fontSize: rf(19), fontWeight: '700', color: '#111827', letterSpacing: 2 },
  checkMark:      { fontSize: rf(18), color: PRIMARY, fontWeight: '900', paddingRight: 12 },
  progressTrack:  { height: 3, backgroundColor: '#F0F0F0', borderRadius: 2, marginBottom: 6, overflow: 'hidden' },
  progressFill:   { height: '100%', backgroundColor: PRIMARY, borderRadius: 2 },
  progressTxt:    { fontSize: rf(11), color: '#9CA3AF', marginBottom: 14 },
  errorBox:       { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 },
  errorTxt:       { fontSize: rf(12), color: '#B91C1C', fontWeight: '600' },
  infoBox:        { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: PRIMARY, marginBottom: 18 },
  infoTxt:        { fontSize: rf(12), color: '#065F46', fontWeight: '500', lineHeight: rf(18) },
  btn:            { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 14 },
  btnOff:         { backgroundColor: '#D1D5DB' },
  btnTxt:         { color: '#fff', fontSize: rf(15), fontWeight: '800' },
  footer:         { fontSize: rf(12), color: '#9CA3AF', textAlign: 'center', paddingBottom: 16 },
});
