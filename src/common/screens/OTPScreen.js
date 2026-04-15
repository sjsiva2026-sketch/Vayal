import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Alert, TextInput, StatusBar, ActivityIndicator, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { verifyOTP } from '../../../firebase/auth';
import { getUser }   from '../../../firebase/firestore';
import { useAuth }   from '../../../context/AuthContext';
import { useUser }   from '../../../context/UserContext';
import { COLORS }    from '../../../constants/colors';

export default function OTPScreen({ navigation, route }) {
  const { phone, role, devOTP }                     = route.params || {};
  const { setUser, setUserProfile: setAuthProfile } = useAuth();
  const { setUserProfile }                          = useUser();

  const [otp,     setOtp]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [timer,   setTimer]   = useState(60);
  const inputRef              = useRef(null);
  const busyRef               = useRef(false);

  // countdown timer
  React.useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const doVerify = async (code) => {
    const clean = (code || otp).trim();
    if (clean.length !== 6) return;
    if (busyRef.current || loading) return;
    busyRef.current = true;
    Keyboard.dismiss();
    setLoading(true);
    setError('');
    try {
      const authUser = await verifyOTP(clean);
      const profile  = await getUser(authUser.uid);

      if (profile) {
        setUser(authUser);
        setAuthProfile(profile);
        setUserProfile(profile);
        const home =
          profile.role === 'owner' ? 'OwnerDashboard' :
          profile.role === 'admin' ? 'AdminDashboard' : 'FarmerHome';
        navigation.reset({ index: 0, routes: [{ name: home }] });
      } else {
        setUser(authUser);
        navigation.navigate('ProfileSetup', { uid: authUser.uid, phone, role });
      }
    } catch (e) {
      setError(e.message || 'Verification failed. Try again.');
      setOtp('');
      busyRef.current = false;
      setTimeout(() => inputRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (text) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(digits);
    setError('');
    if (digits.length === 6) {
      doVerify(digits);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#145A3E" />

      <LinearGradient colors={['#145A3E', '#1C7C54', '#2E9E6B']} style={s.header}>
        <View style={s.iconBox}><Text style={s.icon}>🔐</Text></View>
        <Text style={s.title}>Verify OTP</Text>
        <View style={s.phonePill}>
          <Text style={s.phoneTxt}>📱  +91 {phone}</Text>
        </View>
      </LinearGradient>

      <View style={s.card}>
        <View style={s.handle} />

        {/* DEV OTP display */}
        {devOTP ? (
          <View style={s.devBox}>
            <Text style={s.devTitle}>🔑 Your OTP Code</Text>
            <Text style={s.devCode}>{devOTP}</Text>
            <Text style={s.devHint}>Type this code in the box below ↓</Text>
          </View>
        ) : null}

        <Text style={s.label}>Enter 6-digit OTP</Text>

        {/* Visual digit boxes — tap to focus input */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
          style={s.boxRow}
        >
          {[0, 1, 2, 3, 4, 5].map(i => (
            <View
              key={i}
              style={[
                s.box,
                otp.length === i && !loading && s.boxActive,
                otp.length > i  && s.boxFilled,
                !!error         && s.boxError,
              ]}
            >
              <Text style={s.boxTxt}>{otp[i] ?? ''}</Text>
            </View>
          ))}
        </TouchableOpacity>

        {/* Real input — visible but positioned under the boxes */}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={handleChange}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          editable={!loading}
          style={s.realInput}
          caretHidden
          selectTextOnFocus
        />

        {error ? (
          <View style={s.errBox}>
            <Text style={s.errTxt}>⚠️  {error}</Text>
          </View>
        ) : (
          <Text style={s.hint}>Auto-verifies when all 6 digits are entered</Text>
        )}

        {/* Verify button */}
        <TouchableOpacity
          style={[s.btn, (otp.length < 6 || loading) && s.btnOff]}
          onPress={() => doVerify()}
          disabled={otp.length < 6 || loading}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={otp.length === 6 && !loading ? ['#1C7C54', '#2E9E6B'] : ['#9CA3AF', '#9CA3AF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.btnGrad}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.btnTxt}>✓  Verify & Continue</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        {/* Resend */}
        <View style={s.resendRow}>
          <Text style={s.resendTxt}>Didn't receive it?  </Text>
          {timer > 0
            ? <Text style={s.timerTxt}>Resend in {timer}s</Text>
            : <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={s.resendLink}>← Go Back & Resend</Text>
              </TouchableOpacity>
          }
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#145A3E' },
  header:     { paddingTop: 36, paddingBottom: 40, paddingHorizontal: 24, alignItems: 'center' },
  iconBox:    { width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  icon:       { fontSize: 36 },
  title:      { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 10 },
  phonePill:  { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  phoneTxt:   { fontSize: 15, fontWeight: '700', color: '#fff' },

  card:       { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 16 },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 24 },

  devBox:     { backgroundColor: '#ECFDF5', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#6EE7B7' },
  devTitle:   { fontSize: 14, fontWeight: '700', color: '#065F46', marginBottom: 8 },
  devCode:    { fontSize: 40, fontWeight: '900', color: '#059669', letterSpacing: 10, marginBottom: 4 },
  devHint:    { fontSize: 12, color: '#6B7280' },

  label:      { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 16 },

  boxRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  box:        { width: 46, height: 56, borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
  boxActive:  { borderColor: COLORS.primary, backgroundColor: '#F0FDF7' },
  boxFilled:  { borderColor: COLORS.primary, backgroundColor: '#ECFDF5' },
  boxError:   { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  boxTxt:     { fontSize: 24, fontWeight: '900', color: '#111827' },

  // Real input — transparent, sits below boxes but still receives keyboard input
  realInput:  {
    height: 48,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 12,
    backgroundColor: '#F0FDF7',
    marginBottom: 12,
    textAlign: 'center',
  },

  hint:       { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 16 },
  errBox:     { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 },
  errTxt:     { fontSize: 13, color: '#B91C1C', textAlign: 'center', fontWeight: '500' },

  btn:        { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  btnOff:     { opacity: 0.6 },
  btnGrad:    { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnTxt:     { color: '#fff', fontSize: 17, fontWeight: '800' },

  resendRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  resendTxt:  { fontSize: 13, color: '#6B7280' },
  timerTxt:   { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  resendLink: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
});
