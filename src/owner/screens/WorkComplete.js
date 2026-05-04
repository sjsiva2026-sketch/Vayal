// src/owner/screens/WorkComplete.js
// Commission timer starts HERE — completeJobWithOTP sets otpVerifiedAt = now
// 24h window begins from this moment

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Alert, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { LinearGradient }     from 'expo-linear-gradient';
import { completeJobWithOTP } from '../../../firebase/commission';
import { getCategoryLabel }   from '../../../constants/categories';
import { CONFIG }             from '../../../constants/config';
import PhoneConnect           from '../../common/components/PhoneConnect';
import Input                  from '../../common/components/Input';
import { useUser }            from '../../../context/UserContext';
import { COLORS }             from '../../../constants/colors';
import { rs, rf, H_PAD }      from '../../../utils/responsive';

export default function WorkComplete({ navigation, route }) {
  const { booking }             = route.params;
  const { userProfile, updateProfile } = useUser();
  const uid                     = userProfile?.id || '';
  const [hectareDone, setHectare] = useState(String(booking.hectareRequested || ''));
  const [loading,    setLoading]  = useState(false);
  const [completed,  setCompleted]= useState(false);
  const busy = useRef(false);

  const commission   = Math.round((parseFloat(hectareDone) || 0) * CONFIG.COMMISSION_PER_HECTARE);
  const machineLabel = booking.machineTypeLabel || getCategoryLabel(booking.machineType);

  const handleComplete = async () => {
    if (busy.current || completed) return;
    const hc = parseFloat(hectareDone);
    if (!hectareDone || isNaN(hc) || hc <= 0) {
      Alert.alert('Invalid', 'Enter actual hectares completed');
      return;
    }
    if (hc > booking.hectareRequested * 3) {
      Alert.alert('Seems High', `Requested was ${booking.hectareRequested} ha. Confirm?`,
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Yes', onPress: () => doComplete(hc) }]);
      return;
    }
    doComplete(hc);
  };

  const doComplete = async (hc) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      // completeJobWithOTP sets otpVerifiedAt = now (ISO string)
      // 24h commission timer starts from this exact moment
      const result = await completeJobWithOTP(booking.id, hc, uid);

      if (result.alreadyCompleted) {
        Alert.alert('Already Done', 'This job was already marked complete.');
        navigation.replace('DailySummary');
        return;
      }

      // Update local profile so timer starts immediately in AppNavigator
      updateProfile({
        otpVerifiedAt:   result.otpVerifiedAt,
        paymentDeadline: result.paymentDeadline,
        commissionAmount: result.commissionAmount,
        paymentStatus:   'pending',
        isLocked:        false,
      });

      setCompleted(true);
      Alert.alert(
        'Work Complete!',
        `Commission due: Rs.${result.commissionAmount}\n\n` +
        `You have 24 hours to pay.\n` +
        `Deadline: ${new Date(result.paymentDeadline).toLocaleString('en-IN')}`,
        [{ text: 'View Summary', onPress: () => navigation.replace('DailySummary') }],
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to complete. Try again.');
      busy.current = false;
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.header}>
            <Text style={s.headerIcon}>✅</Text>
            <Text style={s.headerTitle}>Complete Work</Text>
            <Text style={s.headerSub}>Enter actual hectares — 24h commission timer starts NOW</Text>
          </LinearGradient>

          <View style={s.timerWarn}>
            <Text style={s.timerWarnTxt}>
              The 24-hour commission window starts the moment you tap Submit.
              Pay commission before it expires to avoid account lock.
            </Text>
          </View>

          {/* Job summary */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Job summary</Text>
            <View style={s.summaryRow}>
              {[
                { l: 'Machine',   v: machineLabel },
                { l: 'Requested', v: `${booking.hectareRequested} ha` },
                { l: 'Farmer',    v: booking.farmerName || '—' },
              ].map((item, i, arr) => (
                <React.Fragment key={item.l}>
                  <View style={s.summaryItem}>
                    <Text style={s.summaryLabel}>{item.l}</Text>
                    <Text style={s.summaryVal} numberOfLines={1}>{item.v}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={s.summaryDiv} />}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Hectare input */}
          <View style={s.section}>
            <Input
              label="Actual hectares completed *"
              value={hectareDone}
              onChangeText={setHectare}
              placeholder="e.g. 2.0"
              keyboardType="decimal-pad"
              editable={!completed}
            />
          </View>

          {/* Commission preview */}
          {parseFloat(hectareDone) > 0 && (
            <View style={s.section}>
              <View style={s.commCard}>
                <Text style={s.commLabel}>Commission to pay</Text>
                <Text style={s.commValue}>Rs.{commission}</Text>
                <Text style={s.commRate}>Rs.{CONFIG.COMMISSION_PER_HECTARE}/ha × {hectareDone} ha</Text>
                <View style={s.commNote}>
                  <Text style={s.commNoteTxt}>Due within 24h from submit time</Text>
                </View>
              </View>
            </View>
          )}

          {/* Farmer contact */}
          {booking.farmerPhone && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Confirm with farmer</Text>
              <PhoneConnect phone={booking.farmerPhone} name={booking.farmerName || 'Farmer'} role="Farmer" />
            </View>
          )}

          {/* Submit button — disabled after first successful click */}
          <View style={s.section}>
            <TouchableOpacity
              style={[s.submitBtn, (loading || completed) && s.submitBtnOff]}
              onPress={handleComplete}
              disabled={loading || completed}
              activeOpacity={0.88}
            >
              <Text style={s.submitBtnTxt}>
                {loading ? 'Processing...' : completed ? 'Submitted' : 'Submit & Start 24h Timer'}
              </Text>
            </TouchableOpacity>

            {completed && (
              <TouchableOpacity
                style={s.summaryBtn}
                onPress={() => navigation.replace('DailySummary')}
                activeOpacity={0.88}
              >
                <Text style={s.summaryBtnTxt}>View Daily Summary</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: rs(32) }} />
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
  headerSub:    { fontSize: rf(13), color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: rf(20) },
  timerWarn:    { backgroundColor: '#FFF3CD', borderLeftWidth: rs(4), borderLeftColor: '#F59E0B', paddingHorizontal: H_PAD, paddingVertical: rs(12) },
  timerWarnTxt: { fontSize: rf(13), color: '#856404', fontWeight: '600', lineHeight: rf(20) },
  section:      { paddingHorizontal: H_PAD, marginTop: rs(20) },
  sectionTitle: { fontSize: rf(14), fontWeight: '700', color: COLORS.textSecondary, marginBottom: rs(10) },
  summaryRow:   { flexDirection: 'row', backgroundColor: '#fff', borderRadius: rs(14), padding: rs(16), elevation: 2, alignItems: 'center' },
  summaryItem:  { flex: 1, alignItems: 'center' },
  summaryDiv:   { width: 1, height: rs(36), backgroundColor: COLORS.border },
  summaryLabel: { fontSize: rf(11), color: COLORS.textSecondary, marginBottom: rs(5) },
  summaryVal:   { fontSize: rf(14), fontWeight: '800', color: COLORS.textPrimary },
  commCard:     { backgroundColor: COLORS.primary, borderRadius: rs(14), padding: rs(22), alignItems: 'center' },
  commLabel:    { fontSize: rf(13), color: 'rgba(255,255,255,0.7)', marginBottom: rs(8) },
  commValue:    { fontSize: rf(40), fontWeight: '900', color: '#fff', marginBottom: rs(4) },
  commRate:     { fontSize: rf(13), color: 'rgba(255,255,255,0.6)', marginBottom: rs(12) },
  commNote:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: rs(8), paddingHorizontal: rs(14), paddingVertical: rs(6) },
  commNoteTxt:  { fontSize: rf(12), color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  submitBtn:    { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(16), alignItems: 'center', marginBottom: rs(10) },
  submitBtnOff: { backgroundColor: '#D1D5DB' },
  submitBtnTxt: { color: '#fff', fontSize: rf(15), fontWeight: '800' },
  summaryBtn:   { backgroundColor: '#F0FDF4', borderRadius: rs(14), paddingVertical: rs(14), alignItems: 'center', borderWidth: rs(1.5), borderColor: '#22C55E' },
  summaryBtnTxt:{ color: '#065F46', fontSize: rf(15), fontWeight: '700' },
});
