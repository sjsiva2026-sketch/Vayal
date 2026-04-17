import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  Alert, ScrollView,
} from 'react-native';
import { LinearGradient }      from 'expo-linear-gradient';
import {
  updateBooking, upsertDailyPayment, getDailyPayment,
  getMachineDailyHectares,
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

const MAX = CONFIG.MAX_HECTARES_PER_DAY; // 5

export default function WorkComplete({ navigation, route }) {
  const { booking }                   = route.params;
  const { userProfile }               = useUser();
  const uid                           = userProfile?.id || '';
  const [hectareDone, setHectareDone] = useState(String(booking.hectareRequested || ''));
  const [loading, setLoading]         = useState(false);

  const commission   = calculateCommission(parseFloat(hectareDone) || 0);
  const rate         = CONFIG.COMMISSION_PER_HECTARE;
  const machineLabel = booking.machineTypeLabel || getCategoryLabel(booking.machineType);

  const handleComplete = async () => {
    const v = validateHectare(hectareDone);
    if (!v.valid) { Alert.alert('Invalid Hectare', v.error); return; }

    const hc    = parseFloat(hectareDone);
    const today = booking.date || todayString();

    setLoading(true);
    try {
      // ── Check machine daily limit ──────────────────────────────────────────
      // Exclude the current booking's originally requested hectares from the
      // total so we only count OTHER bookings, then add what's being completed.
      const totalMachineUsed = await getMachineDailyHectares(booking.machineId, today);
      // totalMachineUsed already includes this booking's hectareRequested
      // (since status is 'ongoing'). Subtract it and re-add the actual hc.
      const alreadyUsed = totalMachineUsed - (booking.hectareRequested || 0);
      const newTotal    = alreadyUsed + hc;

      if (newTotal > MAX) {
        const allowedForThisJob = MAX - alreadyUsed;
        Alert.alert(
          '🚜 Machine Daily Limit',
          allowedForThisJob <= 0
            ? `This machine has already completed ${MAX} ha today. Cannot record more work.`
            : `This machine can only complete ${allowedForThisJob.toFixed(2)} more ha today (daily max: ${MAX} ha).\nPlease enter ≤ ${allowedForThisJob.toFixed(2)} ha.`,
        );
        setLoading(false);
        return;
      }

      // ── Save completion ────────────────────────────────────────────────────
      const comm = calculateCommission(hc);
      await updateBooking(booking.id, { status: 'completed', hectareCompleted: hc, commission: comm });

      const existing = await getDailyPayment(uid, today);
      await upsertDailyPayment(uid, today, {
        ownerName:       userProfile?.name  || '',
        ownerPhone:      userProfile?.phone || '',
        totalHectare:    (existing?.totalHectare    || 0) + hc,
        totalCommission: (existing?.totalCommission || 0) + comm,
        status: 'unpaid',
      });

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

        {/* ── Header ── */}
        <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.header}>
          <Text style={s.headerIcon}>✅</Text>
          <Text style={s.headerTitle}>Complete Work</Text>
          <Text style={s.headerSub}>Enter the actual hectares completed on the field</Text>
        </LinearGradient>

        {/* ── Daily limit info banner ── */}
        <View style={s.limitBanner}>
          <Text style={s.limitTxt}>🚜 Machine limit: {MAX} ha max per day</Text>
        </View>

        {/* ── Job summary ── */}
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

        {/* ── Hectare input ── */}
        <View style={s.section}>
          <Input
            label={`✏️ Actual Hectare Completed * (max ${MAX} ha/day per machine)`}
            value={hectareDone}
            onChangeText={setHectareDone}
            placeholder={`e.g. 2.0  (daily cap: ${MAX} ha)`}
            keyboardType="decimal-pad"
          />
        </View>

        {/* ── Commission preview ── */}
        {hectareDone ? (
          <View style={s.section}>
            <View style={s.commCard}>
              <Text style={s.commLabel}>Commission Due</Text>
              <Text style={s.commValue}>₹{commission}</Text>
              <Text style={s.commRate}>₹{rate} × {hectareDone} ha</Text>
            </View>
          </View>
        ) : null}

        {/* ── Contact farmer ── */}
        {booking.farmerPhone && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📞 Confirm with Farmer</Text>
            <PhoneConnect phone={booking.farmerPhone} name={booking.farmerName || 'Farmer'} role="Farmer 👨‍🌾" />
          </View>
        )}

        {/* ── Submit ── */}
        <View style={s.section}>
          <Button title="✅ Submit & Complete" onPress={handleComplete} loading={loading} />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.background },
  scroll:      { paddingBottom: 32 },

  header:      { paddingTop: 36, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  headerIcon:  { fontSize: 48, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20 },

  limitBanner: {
    backgroundColor: '#FFF9E6', borderLeftWidth: 4, borderLeftColor: '#F59E0B',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  limitTxt:    { fontSize: 13, color: '#92400E', fontWeight: '600' },

  section:     { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle:{ fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10 },

  summaryRow:  { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2, alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDiv:  { width: 1, height: 36, backgroundColor: COLORS.border },
  summaryLabel:{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 5 },
  summaryVal:  { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },

  commCard:    { backgroundColor: COLORS.primary, borderRadius: 14, padding: 24, alignItems: 'center' },
  commLabel:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  commValue:   { fontSize: 40, fontWeight: '900', color: '#fff', marginBottom: 4 },
  commRate:    { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
});
