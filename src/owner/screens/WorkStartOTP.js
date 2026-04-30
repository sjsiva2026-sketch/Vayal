import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  Alert, TextInput, ScrollView,
} from 'react-native';
import { LinearGradient }   from 'expo-linear-gradient';
import {
  updateBooking, updateUser,
  getDailyPayment, upsertDailyPayment,
} from '../../../firebase/firestore';
import { useUser }          from '../../../context/UserContext';
import PhoneConnect         from '../../common/components/PhoneConnect';
import Button               from '../../common/components/Button';
import { getCategoryLabel } from '../../../constants/categories';
import { todayString }      from '../../../utils/dateFormatter';
import { COLORS }           from '../../../constants/colors';

export default function WorkStartOTP({ navigation, route }) {
  const { booking }                    = route.params;
  const { userProfile, updateProfile } = useUser();
  const uid                            = userProfile?.id || '';

  const [enteredOTP, setEnteredOTP] = useState('');
  const [loading, setLoading]       = useState(false);
  const [otpError, setOtpError]     = useState('');
  const busy = useRef(false);

  useEffect(() => {
    if (enteredOTP.length === 6 && !busy.current) handleStart(enteredOTP);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enteredOTP]);

  const handleStart = async (otpOverride) => {
    const otp = (otpOverride ?? enteredOTP).trim();
    if (otp.length !== 6)            { setOtpError('Enter the complete 6-digit OTP'); return; }
    if (otp !== String(booking.otp)) {
      setOtpError('Wrong OTP — ask the farmer for the correct code');
      setEnteredOTP('');
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setOtpError('');
    setLoading(true);

    try {
      const now           = new Date();
      const workStartedAt = now.toISOString();
      // Deadline = work start time + 24 hours exactly
      const deadline      = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const today         = booking.date || todayString();

      // 1. Mark booking ongoing + record exact work start timestamp
      await updateBooking(booking.id, {
        status:       'ongoing',
        workStartedAt,
      });

      // 2. Create/update daily payment doc — set deadline from THIS work start
      //    Only set workStartedAt & paymentDeadline on the FIRST job of the day
      const existing = await getDailyPayment(uid, today);
      const isFirst  = !existing?.workStartedAt;

      await upsertDailyPayment(uid, today, {
        ownerName:       userProfile?.name  || '',
        ownerPhone:      userProfile?.phone || '',
        totalHectare:    existing?.totalHectare    || 0,
        totalCommission: existing?.totalCommission || 0,
        status:          existing?.status || 'unpaid',
        workStartedAt:   isFirst ? workStartedAt  : existing.workStartedAt,
        paymentDeadline: isFirst ? deadline        : existing.paymentDeadline,
      });

      // 3. Store deadline in userProfile for AppNavigator auto-lock check
      //    Do NOT set isLocked here — owner is free to use all screens during work
      const deadlineToSave = isFirst ? deadline : existing.paymentDeadline;
      await updateUser(uid, {
        workStartedAt:   isFirst ? workStartedAt : existing.workStartedAt,
        paymentDeadline: deadlineToSave,
        commissionDate:  today,
        isLocked:        false,   // explicitly ensure unlocked at work start
      });
      updateProfile({
        workStartedAt:   isFirst ? workStartedAt : existing.workStartedAt,
        paymentDeadline: deadlineToSave,
        commissionDate:  today,
        isLocked:        false,
      });

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
    { label: 'Farmer',  value: booking.farmerName           || '—' },
    { label: 'Machine', value: machineLabel                  || '—' },
    { label: 'Date',    value: booking.date                  || '—' },
    { label: 'Hectare', value: `${booking.hectareRequested} ha` },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.header}>
          <Text style={s.headerIcon}>🔐</Text>
          <Text style={s.headerTitle}>Enter Farmer's OTP</Text>
          <Text style={s.headerSub}>Ask the farmer to share their 6-digit OTP at the field</Text>
          <View style={s.timerNotice}>
            <Text style={s.timerNoticeTxt}>
              ⏱️ 24-hour commission timer starts from when you verify this OTP
            </Text>
          </View>
        </LinearGradient>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Booking Summary</Text>
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
            <Text style={s.sectionTitle}>Call Farmer to Get OTP</Text>
            <PhoneConnect
              phone={booking.farmerPhone}
              name={booking.farmerName || 'Farmer'}
              role="Farmer"
            />
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
            onChangeText={t => {
              setOtpError('');
              setEnteredOTP(t.replace(/[^0-9]/g, '').slice(0, 6));
            }}
            textAlign="center"
            autoFocus
            editable={!loading}
          />
          {otpError
            ? <Text style={s.errTxt}>{otpError}</Text>
            : <Text style={s.hintTxt}>Auto-verifies when all 6 digits are entered</Text>
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

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.background },
  scroll:         { paddingBottom: 32 },
  header:         { paddingTop: 36, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  headerIcon:     { fontSize: 48, marginBottom: 12 },
  headerTitle:    { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6 },
  headerSub:      { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 14 },
  timerNotice:    { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  timerNoticeTxt: { fontSize: 12, color: '#fff', fontWeight: '700', textAlign: 'center' },
  section:        { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10 },
  card:           { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 2 },
  row:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLast:        { borderBottomWidth: 0 },
  rowLabel:       { fontSize: 13, color: COLORS.textSecondary },
  rowValue:       { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  otpInput:       { backgroundColor: '#fff', borderWidth: 2.5, borderColor: COLORS.primary, borderRadius: 16, paddingVertical: 18, fontSize: 34, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 16, textAlign: 'center' },
  otpInputErr:    { borderColor: COLORS.error },
  errTxt:         { fontSize: 13, color: COLORS.error, textAlign: 'center', marginTop: 10, fontWeight: '600' },
  hintTxt:        { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 10 },
});
