import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, ScrollView } from 'react-native';
import { LinearGradient }   from 'expo-linear-gradient';
import {
  updateBooking,
  upsertDailyPayment, getDailyPayment,
} from '../../../firebase/firestore';
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

export default function WorkComplete({ navigation, route }) {
  const { booking }                    = route.params;
  const { userProfile }                = useUser();
  const uid                            = userProfile?.id || '';
  const [hectareDone, setHectareDone]  = useState(String(booking.hectareRequested || ''));
  const [loading, setLoading]          = useState(false);

  const commission   = calculateCommission(parseFloat(hectareDone) || 0);
  const rate         = CONFIG.COMMISSION_PER_HECTARE;
  const machineLabel = booking.machineTypeLabel || getCategoryLabel(booking.machineType);
  const today        = booking.date || todayString();

  const workStartStr = booking.workStartedAt
    ? new Date(booking.workStartedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : null;

  const handleComplete = async () => {
    const v = validateHectare(hectareDone);
    if (!v.valid) { Alert.alert('Invalid Hectare', v.error); return; }

    const hc   = parseFloat(hectareDone);
    const comm = calculateCommission(hc);
    const now  = new Date().toISOString();

    setLoading(true);
    try {
      // 1. Mark booking completed
      await updateBooking(booking.id, {
        status:           'completed',
        hectareCompleted: hc,
        commission:       comm,
        completedAt:      now,
      });

      // 2. Accumulate commission totals in daily payment doc
      //    paymentDeadline already set by WorkStartOTP — keep it as-is
      const existing           = await getDailyPayment(uid, today);
      const newTotalHectare    = (existing?.totalHectare    || 0) + hc;
      const newTotalCommission = (existing?.totalCommission || 0) + comm;

      await upsertDailyPayment(uid, today, {
        ownerName:       userProfile?.name  || '',
        ownerPhone:      userProfile?.phone || '',
        totalHectare:    newTotalHectare,
        totalCommission: newTotalCommission,
        status:          'unpaid',
        workStartedAt:   existing?.workStartedAt   || now,
        paymentDeadline: existing?.paymentDeadline || now,
      });

      // NOTE: Do NOT set isLocked here.
      // Lock happens automatically in AppNavigator when
      // paymentDeadline (set at WorkStartOTP) passes 24 hours.

      navigation.replace('DailySummary');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.header}>
          <Text style={s.headerIcon}>✅</Text>
          <Text style={s.headerTitle}>Complete Work</Text>
          <Text style={s.headerSub}>Enter actual hectares — commission calculated automatically</Text>
          {workStartStr && (
            <View style={s.startPill}>
              <Text style={s.startPillTxt}>
                ⏱️ Work started at {workStartStr} · Pay commission within 24 hrs
              </Text>
            </View>
          )}
        </LinearGradient>

        <View style={s.noticeBanner}>
          <Text style={s.noticeTxt}>
            ⚠️ Pay commission within 24 hours of work start to keep your account active.
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Job Summary</Text>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Machine</Text>
              <Text style={s.summaryVal} numberOfLines={1}>{machineLabel}</Text>
            </View>
            <View style={s.summaryDiv} />
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Requested</Text>
              <Text style={s.summaryVal}>{booking.hectareRequested} ha</Text>
            </View>
            <View style={s.summaryDiv} />
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Farmer</Text>
              <Text style={s.summaryVal} numberOfLines={1}>{booking.farmerName || '—'}</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Input
            label="Actual Hectare Completed *"
            value={hectareDone}
            onChangeText={setHectareDone}
            placeholder="e.g. 2.0"
            keyboardType="decimal-pad"
          />
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

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.background },
  scroll:       { paddingBottom: 32 },
  header:       { paddingTop: 36, paddingBottom: 28, paddingHorizontal: 24, alignItems: 'center' },
  headerIcon:   { fontSize: 48, marginBottom: 12 },
  headerTitle:  { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6 },
  headerSub:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  startPill:    { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  startPillTxt: { fontSize: 12, color: '#fff', fontWeight: '700', textAlign: 'center' },
  noticeBanner: { backgroundColor: '#FFF3CD', borderLeftWidth: 4, borderLeftColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 12 },
  noticeTxt:    { fontSize: 13, color: '#856404', fontWeight: '600', lineHeight: 20 },
  section:      { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10 },
  summaryRow:   { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2, alignItems: 'center' },
  summaryItem:  { flex: 1, alignItems: 'center' },
  summaryDiv:   { width: 1, height: 36, backgroundColor: COLORS.border },
  summaryLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 5 },
  summaryVal:   { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  commCard:     { backgroundColor: COLORS.primary, borderRadius: 14, padding: 24, alignItems: 'center' },
  commLabel:    { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  commValue:    { fontSize: 40, fontWeight: '900', color: '#fff', marginBottom: 4 },
  commRate:     { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 14 },
  commNote:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  commNoteTxt:  { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
});
