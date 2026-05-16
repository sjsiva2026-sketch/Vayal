// src/common/screens/OTPScreen.js
// FIXED: KYC check after OTP verify
//
// FLOW:
//   Farmer → FarmerHome (direct)
//   Admin  → AdminDashboard (direct)
//   Owner  (new user)     → ProfileSetup
//   Owner  (not verified) → KycScreen  ← FIX
//   Owner  (verified)     → OwnerHome

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  TextInput, StatusBar, ActivityIndicator, Keyboard,
  KeyboardAvoidingView, ScrollView, Platform, Dimensions, Image,
} from 'react-native';
import { CommonActions }  from '@react-navigation/native';
import { verifyOTP }      from '../../../firebase/auth';
import { getUser }        from '../../../firebase/firestore';
import { useAuth }        from '../../../context/AuthContext';
import { useUser }        from '../../../context/UserContext';
import { FIcon }          from '../../../utils/icons';
import { ICONS }          from '../../../assets/index';
import { IMG }            from '../../../utils/imageSize';

const PRIMARY = '#1C7C54';
const { width: W } = Dimensions.get('window');
const rf = (dp) => Math.round((W / 375) * dp);
const BOX_W = Math.floor((W - 48 - 40) / 6);
const BOX_H = BOX_W + 10;

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION DECISION — called after Firestore profile loaded
// This is the ONLY place that decides where owner goes
// ─────────────────────────────────────────────────────────────────────────────
function getDestination(profile) {
  const role = profile?.role;

  if (role === 'farmer') return 'FarmerHome';
  if (role === 'admin')  return 'AdminDashboard';

  if (role === 'owner') {
    // Owner MUST be verified by admin before accessing OwnerHome
    const verified = profile.isVerified === true
                  && profile.kycStatus   === 'verified';
    return verified ? 'OwnerHome' : 'KycScreen';
  }

  return 'RoleSelect';
}

export default function OTPScreen({ navigation, route }) {
  const { phone, role, devOTP }                     = route.params || {};
  const { setUser, setUserProfile: setAuthProfile } = useAuth();
  const { setUserProfile }                          = useUser();

  const [otp,     setOtp]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [timer,   setTimer]   = useState(60);
  const inputRef  = useRef(null);
  const busyRef   = useRef(false);

  React.useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const goTo = (routeName) =>
    navigation.dispatch(CommonActions.reset({
      index: 0,
      routes: [{ name: routeName }],
    }));

  const doVerify = async (code) => {
    const clean = (code ?? otp).trim();
    if (clean.length !== 6 || busyRef.current || loading) return;
    busyRef.current = true;
    Keyboard.dismiss();
    setLoading(true);
    setError('');

    try {
      const authUser = await verifyOTP(clean);

      // Always fetch fresh profile from Firestore
      const profile = await getUser(authUser.uid);

      if (profile) {
        // Existing user → set context → route by role + KYC status
        setUser(authUser);
        setAuthProfile(profile);
        setUserProfile(profile);
        goTo(getDestination(profile));
      } else {
        // Brand new user → ProfileSetup
        setUser(authUser);
        navigation.navigate('ProfileSetup', {
          uid:   authUser.uid,
          phone: phone,
          role:  role,
        });
      }
    } catch (e) {
      setError(e.message || 'Verification failed. Try again.');
      setOtp('');
      setTimeout(() => inputRef.current?.focus(), 150);
    } finally {
      setLoading(false);
      busyRef.current = false;
    }
  };

  const handleChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    setError('');
    if (digits.length === 6) doVerify(digits);
  };

  const focusInput = useCallback(() => inputRef.current?.focus(), []);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        style={s.kav}
        behavior="height"
      >
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

          {/* Logo + title */}
          <View style={s.topSection}>
            <View style={[s.logoBg, {
              width:        IMG.LOGO_CONTAINER,
              height:       IMG.LOGO_CONTAINER,
              borderRadius: IMG.LOGO_CONTAINER / 2,
            }]}>
              <Image
                source={ICONS.logo}
                style={{ width: IMG.LOGO_SIZE, height: IMG.LOGO_SIZE }}
                resizeMode="contain"
              />
            </View>
            <Text style={s.title}>Verify OTP</Text>
            <View style={s.phonePill}>
              <Text style={s.phoneTxt}>📱 +91 {phone}</Text>
            </View>
            <Text style={s.subtitle}>
              Enter the 6-digit code sent to your number
            </Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <View style={s.handle} />

            {/* Dev OTP display */}
            {devOTP ? (
              <View style={s.devBox}>
                <Text style={s.devTitle}>🔑 Your OTP Code</Text>
                <Text style={s.devCode}>{devOTP}</Text>
                <Text style={s.devHint}>Enter the digits in the boxes below</Text>
              </View>
            ) : null}

            <Text style={s.fieldLabel}>Enter 6-digit OTP</Text>

            {/* Visual OTP boxes + hidden real input */}
            <View style={[s.otpContainer, { height: BOX_H }]}>
              <View style={s.boxRow} pointerEvents="none">
                {[0,1,2,3,4,5].map(i => (
                  <View key={i} style={[
                    s.box, { width: BOX_W, height: BOX_H },
                    otp.length === i && !loading && s.boxActive,
                    otp.length >  i && s.boxFilled,
                    !!error          && s.boxError,
                  ]}>
                    <Text style={s.boxTxt}>{otp[i] ?? ''}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                onPress={focusInput}
                activeOpacity={1}
              >
                <TextInput
                  ref={inputRef}
                  value={otp}
                  onChangeText={handleChange}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  editable={!loading}
                  caretHidden
                  style={s.realInput}
                  underlineColorAndroid="transparent"
                />
              </TouchableOpacity>
            </View>

            {error
              ? <View style={s.errorBox}><Text style={s.errorTxt}>⚠️  {error}</Text></View>
              : <Text style={s.hint}>Auto-verifies when all 6 digits entered</Text>
            }

            <TouchableOpacity
              style={[s.btn, (otp.length < 6 || loading) && s.btnOff]}
              onPress={() => doVerify()}
              disabled={otp.length < 6 || loading}
              activeOpacity={0.88}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnTxt}>✓  Verify & Continue</Text>
              }
            </TouchableOpacity>

            <View style={s.resendRow}>
              <Text style={s.resendTxt}>Didn't receive it?  </Text>
              {timer > 0
                ? <Text style={s.timerTxt}>⏱ Resend in {timer}s</Text>
                : (
                  <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={s.resendLink}>← Resend OTP</Text>
                  </TouchableOpacity>
                )
              }
            </View>
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#fff' },
  kav:          { flex: 1 },
  scroll:       { flexGrow: 1 },
  backBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 14, alignSelf: 'flex-start' },
  topSection:   { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  logoBg:       { backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: 14, overflow: 'hidden' },
  title:        { fontSize: rf(22), fontWeight: '900', color: '#111827', marginBottom: 8 },
  phonePill:    { backgroundColor: '#F4F5F7', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 6 },
  phoneTxt:     { fontSize: rf(13), fontWeight: '700', color: '#374151' },
  subtitle:     { fontSize: rf(12), color: '#9CA3AF', textAlign: 'center' },
  card:         { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 18 },
  devBox:       { backgroundColor: '#E8F5EE', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#6EE7B7', marginBottom: 18, alignItems: 'center' },
  devTitle:     { fontSize: rf(12), fontWeight: '700', color: '#065F46', marginBottom: 4 },
  devCode:      { fontSize: rf(28), fontWeight: '900', color: PRIMARY, letterSpacing: 8 },
  devHint:      { fontSize: rf(11), color: '#6B7280', marginTop: 2 },
  fieldLabel:   { fontSize: rf(14), fontWeight: '700', color: '#374151', marginBottom: 16 },
  otpContainer: { width: '100%', marginBottom: 12, position: 'relative' },
  boxRow:       { flexDirection: 'row', justifyContent: 'space-between', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  box:          { borderRadius: 14, borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center' },
  boxActive:    { borderColor: PRIMARY, backgroundColor: '#F0FDF7' },
  boxFilled:    { borderColor: PRIMARY, backgroundColor: '#E8F5EE' },
  boxError:     { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  boxTxt:       { fontSize: rf(22), fontWeight: '900', color: '#111827' },
  realInput:    { flex: 1, opacity: 0, color: 'transparent' },
  errorBox:     { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 },
  errorTxt:     { fontSize: rf(12), color: '#B91C1C', fontWeight: '500', textAlign: 'center' },
  hint:         { fontSize: rf(12), color: '#9CA3AF', textAlign: 'center', marginBottom: 18 },
  btn:          { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 16 },
  btnOff:       { backgroundColor: '#D1D5DB' },
  btnTxt:       { color: '#fff', fontSize: rf(15), fontWeight: '800' },
  resendRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 10 },
  resendTxt:    { fontSize: rf(13), color: '#6B7280' },
  timerTxt:     { fontSize: rf(13), color: PRIMARY, fontWeight: '700' },
  resendLink:   { fontSize: rf(13), color: PRIMARY, fontWeight: '700' },
});
