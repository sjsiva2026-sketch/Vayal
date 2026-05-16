// src/common/screens/LoginScreen.js
// farmer_role.png (256×256) + owner_role.png (256×256)
// Sizes: ROLE_CONTAINER=80dp circle, ROLE_SIZE=64dp image

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, KeyboardAvoidingView, Platform,
  StatusBar, ActivityIndicator, ScrollView, Image, Dimensions,
} from 'react-native';
import { sendOTP } from '../../../firebase/auth';
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
  const [devOTP,  setDevOTP]  = useState('');
  const [error,   setError]   = useState('');

  const handleSendOTP = async () => {
    const cleaned = phone.trim();
    if (cleaned.length !== 10 || !/^\d{10}$/.test(cleaned)) {
      setError('Enter a valid 10-digit mobile number'); return;
    }
    setLoading(true); setDevOTP(''); setError('');
    try {
      const result = await sendOTP(`+91${cleaned}`);
      if (result?.otp) setDevOTP(result.otp);
      navigation.navigate('OTP', { phone: cleaned, role, devOTP: result?.otp });
    } catch (e) {
      setError(e.message || 'Could not send OTP. Check connection.');
    } finally { setLoading(false); }
  };

  const ready = phone.length === 10;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView style={s.kav} behavior="height">
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>

          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <FIcon name="arrow-left" size={22} color="#111827" fallback="←" />
          </TouchableOpacity>

          <View style={s.topSection}>
            {/*
              farmer_role.png / owner_role.png: 256×256px source
              Container: ROLE_CONTAINER (80dp) circle
              Image: ROLE_SIZE (64dp) — 192px rendered at xxhdpi
              Source 256px → 75% scale → sharp, no pixelation ✅
            */}
            <View style={[
              s.roleCircle,
              {
                width: IMG.ROLE_CONTAINER,
                height: IMG.ROLE_CONTAINER,
                borderRadius: IMG.ROLE_CONTAINER / 2,
                backgroundColor: isFarmer ? '#E8F5EE' : '#FFF8E1',
              }
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

            {!!error && <View style={s.errorBox}><Text style={s.errorTxt}>⚠️  {error}</Text></View>}

            {devOTP ? (
              <View style={s.devBox}>
                <Text style={s.devTitle}>🔑 Your OTP Code</Text>
                <Text style={s.devCode}>{devOTP}</Text>
              </View>
            ) : (
              <View style={s.infoBox}>
                <Text style={s.infoTxt}>💡 OTP will appear here (dev mode)</Text>
              </View>
            )}

            <TouchableOpacity style={[s.btn, !ready && s.btnOff]} onPress={handleSendOTP} disabled={!ready || loading} activeOpacity={0.88}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Get OTP →</Text>}
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
  safe:          { flex: 1, backgroundColor: '#fff' },
  kav:           { flex: 1 },
  scroll:        { flexGrow: 1 },
  backBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 14, alignSelf: 'flex-start' },
  topSection:    { alignItems: 'center', paddingVertical: 22, paddingHorizontal: 20 },
  roleCircle:    { alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden' },
  title:         { fontSize: rf(22), fontWeight: '900', color: '#111827', marginBottom: 6 },
  subtitle:      { fontSize: rf(13), color: '#6B7280', textAlign: 'center' },
  card:          { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  handle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 22 },
  fieldLabel:    { fontSize: rf(14), fontWeight: '700', color: '#374151', marginBottom: 10 },
  inputRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F5F7', borderRadius: 14, borderWidth: 2, borderColor: 'transparent', marginBottom: 10, overflow: 'hidden' },
  inputRowActive:{ borderColor: PRIMARY, backgroundColor: '#FAFFFE' },
  flagSection:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14 },
  flag:          { fontSize: rf(20) },
  cc:            { fontSize: rf(14), fontWeight: '700', color: '#374151' },
  divider:       { width: 1, height: 26, backgroundColor: '#D1D5DB', marginRight: 4 },
  phoneInput:    { flex: 1, paddingHorizontal: 10, paddingVertical: 14, fontSize: rf(19), fontWeight: '700', color: '#111827', letterSpacing: 2 },
  checkMark:     { fontSize: rf(18), color: PRIMARY, fontWeight: '900', paddingRight: 12 },
  progressTrack: { height: 3, backgroundColor: '#F0F0F0', borderRadius: 2, marginBottom: 6, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: PRIMARY, borderRadius: 2 },
  progressTxt:   { fontSize: rf(11), color: '#9CA3AF', marginBottom: 14 },
  errorBox:      { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 },
  errorTxt:      { fontSize: rf(12), color: '#B91C1C', fontWeight: '600' },
  devBox:        { backgroundColor: '#E8F5EE', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#6EE7B7', marginBottom: 14, alignItems: 'center' },
  devTitle:      { fontSize: rf(12), color: '#065F46', fontWeight: '600', marginBottom: 4 },
  devCode:       { fontSize: rf(28), fontWeight: '900', color: PRIMARY, letterSpacing: 8 },
  infoBox:       { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 11, borderLeftWidth: 3, borderLeftColor: '#F59E0B', marginBottom: 18 },
  infoTxt:       { fontSize: rf(12), color: '#92400E', fontWeight: '600' },
  btn:           { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 14 },
  btnOff:        { backgroundColor: '#D1D5DB' },
  btnTxt:        { color: '#fff', fontSize: rf(15), fontWeight: '800' },
  footer:        { fontSize: rf(12), color: '#9CA3AF', textAlign: 'center', paddingBottom: 16 },
});
