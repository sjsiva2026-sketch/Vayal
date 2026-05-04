// src/admin/screens/AdminLoginScreen.js
// Clean admin email + password login screen
// Completely separate from farmer/owner phone OTP

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, StatusBar,
  KeyboardAvoidingView, ScrollView, Platform, Image,
} from 'react-native';
import { CommonActions }   from '@react-navigation/native';
import { adminLogin }      from '../../../firebase/adminAuth';
import { useAuth }         from '../../../context/AuthContext';
import { useUser }         from '../../../context/UserContext';
import { ICONS }           from '../../../assets/index';
import { IMG }             from '../../../utils/imageSize';
import { rs, rf, H_PAD }   from '../../../utils/responsive';
import { FIcon }           from '../../../utils/icons';

const PRIMARY = '#1C7C54';

export default function AdminLoginScreen({ navigation }) {
  const { setUser, setUserProfile: setAuthProfile } = useAuth();
  const { setUserProfile }                          = useUser();

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [emailErr,    setEmailErr]    = useState('');
  const [passErr,     setPassErr]     = useState('');

  const passRef = useRef(null);

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleLogin = async () => {
    // Clear errors
    setEmailErr(''); setPassErr('');

    // Validate
    let hasErr = false;
    if (!email.trim()) { setEmailErr('Email is required'); hasErr = true; }
    else if (!validateEmail(email)) { setEmailErr('Enter a valid email address'); hasErr = true; }
    if (!password) { setPassErr('Password is required'); hasErr = true; }
    else if (password.length < 6) { setPassErr('Password must be at least 6 characters'); hasErr = true; }
    if (hasErr) return;

    setLoading(true);
    try {
      const { uid, email: adminEmail, profile } = await adminLogin(email, password);

      const fullProfile = { ...profile, id: uid, role: 'admin' };

      // Set auth state
      setUser({ uid, email: adminEmail });
      setAuthProfile(fullProfile);
      setUserProfile(fullProfile);

      // Navigate to Admin Dashboard
      navigation.dispatch(CommonActions.reset({
        index: 0,
        routes: [{ name: 'AdminDashboard' }],
      }));
    } catch (e) {
      // Map Firebase error codes to user-friendly messages
      const msg = e.code === 'auth/user-not-found'    ? 'No admin account found with this email.'
                : e.code === 'auth/wrong-password'     ? 'Wrong password. Try again.'
                : e.code === 'auth/invalid-email'      ? 'Invalid email address format.'
                : e.code === 'auth/too-many-requests'  ? 'Too many attempts. Try again later.'
                : e.code === 'auth/network-request-failed' ? 'No internet. Check your connection.'
                : e.message || 'Login failed. Try again.';
      Alert.alert('Login Failed', msg);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Back button */}
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <FIcon name="arrow-left" size={rs(20)} color="#111827" fallback="←" />
          </TouchableOpacity>

          {/* Header */}
          <View style={s.header}>
            {/* App logo */}
            <View style={[s.logoBg, { width: IMG.LOGO_CONTAINER, height: IMG.LOGO_CONTAINER, borderRadius: IMG.LOGO_CONTAINER / 2 }]}>
              <Image
                source={ICONS.logo}
                style={{ width: IMG.LOGO_SIZE, height: IMG.LOGO_SIZE }}
                resizeMode="contain"
              />
            </View>
            <Text style={s.appName}>Namma Vayal</Text>

            {/* Admin badge */}
            <View style={s.adminBadge}>
              <Text style={s.adminBadgeTxt}>🔐 Admin Portal</Text>
            </View>

            <Text style={s.subtitle}>Sign in with your admin credentials</Text>
          </View>

          {/* Form card */}
          <View style={s.card}>
            <View style={s.handle} />

            {/* Email field */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Email Address</Text>
              <View style={[s.inputRow, emailErr ? s.inputRowErr : email ? s.inputRowDone : null]}>
                <FIcon name="mail" size={rs(18)} color={emailErr ? '#EF4444' : email ? PRIMARY : '#9CA3AF'} fallback="@" style={{ marginRight: rs(10) }} />
                <TextInput
                  style={s.textInput}
                  value={email}
                  onChangeText={t => { setEmail(t); setEmailErr(''); }}
                  placeholder="admin@nammaVayal.com"
                  placeholderTextColor="#C9D1DA"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passRef.current?.focus()}
                />
                {email && !emailErr && (
                  <Text style={{ color: PRIMARY, fontWeight: '800', fontSize: rf(14) }}>✓</Text>
                )}
              </View>
              {emailErr ? <Text style={s.errTxt}>{emailErr}</Text> : null}
            </View>

            {/* Password field */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Password</Text>
              <View style={[s.inputRow, passErr ? s.inputRowErr : password ? s.inputRowDone : null]}>
                <FIcon name="lock" size={rs(18)} color={passErr ? '#EF4444' : password ? PRIMARY : '#9CA3AF'} fallback="🔒" style={{ marginRight: rs(10) }} />
                <TextInput
                  ref={passRef}
                  style={s.textInput}
                  value={password}
                  onChangeText={t => { setPassword(t); setPassErr(''); }}
                  placeholder="Enter your password"
                  placeholderTextColor="#C9D1DA"
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} activeOpacity={0.7} style={{ padding: rs(4) }}>
                  <FIcon name={showPass ? 'eye-off' : 'eye'} size={rs(18)} color="#9CA3AF" fallback={showPass ? '🙈' : '👁'} />
                </TouchableOpacity>
              </View>
              {passErr ? <Text style={s.errTxt}>{passErr}</Text> : null}
            </View>

            {/* Security note */}
            <View style={s.secNote}>
              <FIcon name="shield" size={rs(14)} color="#065F46" fallback="🛡" style={{ marginRight: rs(6) }} />
              <Text style={s.secNoteTxt}>Admin access only. All actions are logged.</Text>
            </View>

            {/* Login button */}
            <TouchableOpacity
              style={[s.loginBtn, loading && s.loginBtnOff]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.loginBtnTxt}>Sign In as Admin →</Text>
              }
            </TouchableOpacity>

            {/* Helper text */}
            <Text style={s.helperTxt}>
              Not an admin? Go back and use{'\n'}Farmer or Owner login instead.
            </Text>
          </View>

          <View style={{ height: rs(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#fff' },
  scroll:       { flexGrow: 1, paddingBottom: rs(24) },
  backBtn:      { margin: H_PAD, marginTop: rs(14), width: rs(40), height: rs(40), borderRadius: rs(20), backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center' },
  header:       { alignItems: 'center', paddingHorizontal: H_PAD, paddingBottom: rs(24) },
  logoBg:       { backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: rs(12), overflow: 'hidden' },
  appName:      { fontSize: rf(24), fontWeight: '900', color: '#111827', letterSpacing: 1, marginBottom: rs(10) },
  adminBadge:   { backgroundColor: '#EDE9FE', borderRadius: rs(20), paddingHorizontal: rs(16), paddingVertical: rs(7), marginBottom: rs(10), borderWidth: rs(1.5), borderColor: '#C4B5FD' },
  adminBadgeTxt:{ fontSize: rf(13), fontWeight: '800', color: '#5B21B6' },
  subtitle:     { fontSize: rf(13), color: '#6B7280', textAlign: 'center' },
  card:         { backgroundColor: '#F9FAFB', borderTopLeftRadius: rs(24), borderTopRightRadius: rs(24), paddingHorizontal: H_PAD, paddingTop: rs(12), flex: 1, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  handle:       { width: rs(40), height: rs(4), borderRadius: rs(2), backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: rs(24) },
  fieldGroup:   { marginBottom: rs(16) },
  fieldLabel:   { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(8) },
  inputRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: rs(2), borderColor: '#E5E7EB', borderRadius: rs(14), paddingHorizontal: rs(14), paddingVertical: rs(4) },
  inputRowErr:  { borderColor: '#EF4444', backgroundColor: '#FFF8F8' },
  inputRowDone: { borderColor: PRIMARY, backgroundColor: '#FAFFFE' },
  textInput:    { flex: 1, paddingVertical: rs(13), fontSize: rf(15), color: '#111827' },
  errTxt:       { fontSize: rf(12), color: '#EF4444', marginTop: rs(5), fontWeight: '600' },
  secNote:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: rs(10), padding: rs(12), marginBottom: rs(20) },
  secNoteTxt:   { fontSize: rf(12), color: '#065F46', fontWeight: '600', flex: 1 },
  loginBtn:     { backgroundColor: '#5B21B6', borderRadius: rs(14), paddingVertical: rs(16), alignItems: 'center', marginBottom: rs(16), elevation: 3 },
  loginBtnOff:  { backgroundColor: '#D1D5DB', elevation: 0 },
  loginBtnTxt:  { color: '#fff', fontSize: rf(16), fontWeight: '900' },
  helperTxt:    { fontSize: rf(12), color: '#9CA3AF', textAlign: 'center', lineHeight: rf(18) },
});
