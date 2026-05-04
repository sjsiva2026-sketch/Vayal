// src/owner/screens/WorkStartOTP.js
// OTP verified → booking status = 'ongoing'
// Commission timer does NOT start here — it starts at WorkComplete (job done)

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Alert,
  TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient }  from 'expo-linear-gradient';
import { updateBooking }   from '../../../firebase/firestore';
import { useUser }         from '../../../context/UserContext';
import PhoneConnect        from '../../common/components/PhoneConnect';
import Button              from '../../common/components/Button';
import { getCategoryLabel }from '../../../constants/categories';
import { COLORS }          from '../../../constants/colors';
import { rs, rf, H_PAD }   from '../../../utils/responsive';

export default function WorkStartOTP({ navigation, route }) {
  const { booking }      = route.params;
  const { userProfile }  = useUser();
  const [enteredOTP, setEnteredOTP] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [otpError,   setOtpError]   = useState('');
  const busy = useRef(false);

  useEffect(() => {
    if (enteredOTP.length === 6 && !busy.current) handleStart(enteredOTP);
  }, [enteredOTP]);

  const handleStart = async (otpOverride) => {
    const otp = (otpOverride ?? enteredOTP).trim();
    if (otp.length !== 6)            { setOtpError('Enter the complete 6-digit OTP'); return; }
    if (otp !== String(booking.otp)) { setOtpError('Wrong OTP — ask the farmer for the correct code'); setEnteredOTP(''); return; }
    if (busy.current) return;
    busy.current = true;
    setOtpError('');
    setLoading(true);
    try {
      const workStartedAt = new Date().toISOString();
      // Mark booking as ongoing only — commission timer starts at WorkComplete
      await updateBooking(booking.id, { status: 'ongoing', workStartedAt });
      navigation.replace('WorkInProgress', {
        booking: { ...booking, status: 'ongoing', workStartedAt },
      });
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to start work. Try again.');
      busy.current = false;
      setLoading(false);
    }
  };

  const machineLabel = booking.machineTypeLabel || getCategoryLabel(booking.machineType);

  const ROWS = [
    { label: 'Farmer',  value: booking.farmerName || '—' },
    { label: 'Machine', value: machineLabel || '—' },
    { label: 'Date',    value: booking.date || '—' },
    { label: 'Hectare', value: `${booking.hectareRequested} ha` },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.header}>
            <Text style={s.headerIcon}>🔐</Text>
            <Text style={s.headerTitle}>Enter Farmer's OTP</Text>
            <Text style={s.headerSub}>Ask the farmer to share their 6-digit OTP at the field</Text>
            <View style={s.notice}>
              <Text style={s.noticeTxt}>24-hour commission timer starts only after you mark work complete</Text>
            </View>
          </LinearGradient>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Booking summary</Text>
            <View style={s.card}>
              {ROWS.map((r, i) => (
                <View key={r.label} style={[s.row, i === ROWS.length - 1 && s.rowLast]}>
                  <Text style={s.rowLabel}>{r.label}</Text>
                  <Text style={s.rowValue}>{r.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {booking.farmerPhone && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Call farmer for OTP</Text>
              <PhoneConnect phone={booking.farmerPhone} name={booking.farmerName || 'Farmer'} role="Farmer" />
            </View>
          )}

          <View style={s.section}>
            <Text style={s.sectionTitle}>Enter OTP *</Text>
            <TextInput
              style={[s.otpInput, otpError ? s.otpInputErr : null]}
              placeholder="_ _ _ _ _ _"
              placeholderTextColor="#C9D1DA"
              keyboardType="number-pad"
              maxLength={6}
              value={enteredOTP}
              onChangeText={t => { setOtpError(''); setEnteredOTP(t.replace(/\D/g, '').slice(0, 6)); }}
              textAlign="center"
              autoFocus
              editable={!loading}
            />
            {otpError
              ? <Text style={s.errTxt}>{otpError}</Text>
              : <Text style={s.hintTxt}>Auto-verifies when all 6 digits entered</Text>
            }
          </View>

          <View style={s.section}>
            <Button
              title={loading ? 'Starting Work...' : 'Verify OTP & Start Work'}
              onPress={() => handleStart()}
              loading={loading}
              disabled={enteredOTP.length !== 6 || loading}
            />
          </View>
          <View style={{ height: rs(24) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.background },
  scroll:       { paddingBottom: rs(32) },
  header:       { paddingTop: rs(36), paddingBottom: rs(28), paddingHorizontal: H_PAD, alignItems: 'center' },
  headerIcon:   { fontSize: rf(44), marginBottom: rs(10) },
  headerTitle:  { fontSize: rf(22), fontWeight: '900', color: '#fff', marginBottom: rs(6) },
  headerSub:    { fontSize: rf(13), color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: rf(20), marginBottom: rs(14) },
  notice:       { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: rs(10), paddingHorizontal: rs(16), paddingVertical: rs(10) },
  noticeTxt:    { fontSize: rf(12), color: '#fff', fontWeight: '600', textAlign: 'center' },
  section:      { paddingHorizontal: H_PAD, marginTop: rs(20) },
  sectionTitle: { fontSize: rf(14), fontWeight: '700', color: COLORS.textSecondary, marginBottom: rs(10) },
  card:         { backgroundColor: '#fff', borderRadius: rs(14), overflow: 'hidden', elevation: 2 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: rs(12), paddingHorizontal: rs(16), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLast:      { borderBottomWidth: 0 },
  rowLabel:     { fontSize: rf(13), color: COLORS.textSecondary },
  rowValue:     { fontSize: rf(13), fontWeight: '700', color: COLORS.textPrimary },
  otpInput:     { backgroundColor: '#fff', borderWidth: rs(2.5), borderColor: COLORS.primary, borderRadius: rs(16), paddingVertical: rs(18), fontSize: rf(34), fontWeight: '900', color: COLORS.textPrimary, letterSpacing: rs(16), textAlign: 'center' },
  otpInputErr:  { borderColor: COLORS.error },
  errTxt:       { fontSize: rf(13), color: COLORS.error, textAlign: 'center', marginTop: rs(10), fontWeight: '600' },
  hintTxt:      { fontSize: rf(12), color: COLORS.textSecondary, textAlign: 'center', marginTop: rs(10) },
});
