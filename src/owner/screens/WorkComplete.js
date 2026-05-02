import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Alert, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient }   from 'expo-linear-gradient';
import { updateBooking, upsertDailyPayment, getDailyPayment } from '../../../firebase/firestore';
import { useUser }             from '../../../context/UserContext';
import { calculateCommission } from '../../../utils/calculateCommission';
import { todayString }         from '../../../utils/dateFormatter';
import { validateHectare }     from '../../../utils/hectareValidator';
import { getCategoryLabel }    from '../../../constants/categories';
import { CONFIG }              from '../../../constants/config';
import PhoneConnect            from '../../common/components/PhoneConnect';
import Input                   from '../../common/components/Input';
import Button                  from '../../common/components/Button';
import { COLORS }              from '../../../constants/colors';
import { rs, rf, SPACING, RADIUS, H_PAD } from '../../../utils/responsive';

export default function WorkComplete({ navigation, route }) {
  const { booking }                   = route.params;
  const { userProfile }               = useUser();
  const uid                           = userProfile?.id || '';
  const [hectareDone, setHectareDone] = useState(String(booking.hectareRequested || ''));
  const [loading, setLoading]         = useState(false);

  const commission   = calculateCommission(parseFloat(hectareDone) || 0);
  const rate         = CONFIG.COMMISSION_PER_HECTARE;
  const machineLabel = booking.machineTypeLabel || getCategoryLabel(booking.machineType);
  const today        = booking.date || todayString();
  const workStartStr = booking.workStartedAt
    ? new Date(booking.workStartedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : null;

  const handleComplete = async () => {
    const v = validateHectare(hectareDone);
    if (!v.valid) { Alert.alert('Invalid Hectare', v.error); return; }
    const hc = parseFloat(hectareDone);
    const comm = calculateCommission(hc);
    const now  = new Date().toISOString();
    setLoading(true);
    try {
      await updateBooking(booking.id, { status: 'completed', hectareCompleted: hc, commission: comm, completedAt: now });
      const existing           = await getDailyPayment(uid, today);
      const newTotalHectare    = (existing?.totalHectare    || 0) + hc;
      const newTotalCommission = (existing?.totalCommission || 0) + comm;
      await upsertDailyPayment(uid, today, {
        ownerName: userProfile?.name || '', ownerPhone: userProfile?.phone || '',
        totalHectare: newTotalHectare, totalCommission: newTotalCommission, status: 'unpaid',
        workStartedAt: existing?.workStartedAt || now, paymentDeadline: existing?.paymentDeadline || now,
      });
      navigation.replace('DailySummary');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.header}>
            <Text style={s.headerIcon}>✅</Text>
            <Text style={s.headerTitle}>Complete Work</Text>
            <Text style={s.headerSub}>Enter actual hectares — commission calculated automatically</Text>
            {workStartStr && (
              <View style={s.startPill}>
                <Text style={s.startPillTxt}>⏱️ Work started at {workStartStr} · Pay commission within 24 hrs</Text>
              </View>
            )}
          </LinearGradient>

          <View style={s.noticeBanner}>
            <Text style={s.noticeTxt}>⚠️ Pay commission within 24 hours of work start to keep your account active.</Text>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Job Summary</Text>
            <View style={s.summaryRow}>
              {[
                { l: 'Machine',   v: machineLabel,                n: 1 },
                { l: 'Requested', v: `${booking.hectareRequested} ha`, n: 2 },
                { l: 'Farmer',    v: booking.farmerName || '—',  n: 3 },
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

          <View style={s.section}>
            <Input label="Actual Hectare Completed *" value={hectareDone} onChangeText={setHectareDone} placeholder="e.g. 2.0" keyboardType="decimal-pad" />
          </View>

          {hectareDone ? (
            <View style={s.section}>
              <View style={s.commCard}>
                <Text style={s.commLabel}>Commission to Pay</Text>
                <Text style={s.commValue}>Rs.{commission}</Text>
                <Text style={s.commRate}>Rs.{rate} × {hectareDone} ha</Text>
                <View style={s.commNote}>
                  <Text style={s.commNoteTxt}>Due within 24 hrs from work start time</Text>
                </View>
              </View>
            </View>
          ) : null}

          {booking.farmerPhone && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Confirm with Farmer</Text>
              <PhoneConnect phone={booking.farmerPhone} name={booking.farmerName || 'Farmer'} role="Farmer" />
            </View>
          )}

          <View style={s.section}>
            <Button title="Submit & Complete Work" onPress={handleComplete} loading={loading} />
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
  headerIcon:   { fontSize: rf(48), marginBottom: rs(12) },
  headerTitle:  { fontSize: rf(22), fontWeight: '900', color: '#fff', marginBottom: rs(6) },
  headerSub:    { fontSize: rf(13), color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: rf(20), marginBottom: rs(12) },
  startPill:    { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.md, paddingHorizontal: rs(14), paddingVertical: rs(8) },
  startPillTxt: { fontSize: rf(12), color: '#fff', fontWeight: '700', textAlign: 'center' },
  noticeBanner: { backgroundColor: '#FFF3CD', borderLeftWidth: rs(4), borderLeftColor: '#F59E0B', paddingHorizontal: H_PAD, paddingVertical: rs(12) },
  noticeTxt:    { fontSize: rf(13), color: '#856404', fontWeight: '600', lineHeight: rf(20) },
  section:      { paddingHorizontal: H_PAD, marginTop: rs(20) },
  sectionTitle: { fontSize: rf(14), fontWeight: '700', color: COLORS.textSecondary, marginBottom: rs(10) },
  summaryRow:   { flexDirection: 'row', backgroundColor: '#fff', borderRadius: RADIUS.md, padding: rs(16), elevation: 2, alignItems: 'center' },
  summaryItem:  { flex: 1, alignItems: 'center' },
  summaryDiv:   { width: 1, height: rs(36), backgroundColor: COLORS.border },
  summaryLabel: { fontSize: rf(11), color: COLORS.textSecondary, marginBottom: rs(5) },
  summaryVal:   { fontSize: rf(14), fontWeight: '800', color: COLORS.textPrimary },
  commCard:     { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: rs(24), alignItems: 'center' },
  commLabel:    { fontSize: rf(13), color: 'rgba(255,255,255,0.7)', marginBottom: rs(8) },
  commValue:    { fontSize: rf(40), fontWeight: '900', color: '#fff', marginBottom: rs(4) },
  commRate:     { fontSize: rf(13), color: 'rgba(255,255,255,0.6)', marginBottom: rs(14) },
  commNote:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.sm, paddingHorizontal: rs(14), paddingVertical: rs(6) },
  commNoteTxt:  { fontSize: rf(12), color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
});
