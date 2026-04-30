import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { LinearGradient }  from 'expo-linear-gradient';
import { useFocusEffect }  from '@react-navigation/native';
import { getDailyPayment, getBookingsByOwner } from '../../../firebase/firestore';
import { useUser }         from '../../../context/UserContext';
import { todayString }     from '../../../utils/dateFormatter';
import { CONFIG }          from '../../../constants/config';
import Button              from '../../common/components/Button';
import Loader              from '../../common/components/Loader';
import EarningsCard        from '../components/EarningsCard';
import SummaryCard         from '../components/SummaryCard';
import { COLORS }          from '../../../constants/colors';

// Format seconds into HH:MM:SS countdown
const fmtCountdown = (secs) => {
  if (secs <= 0) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
};

export default function DailySummary({ navigation }) {
  const { userProfile }       = useUser();
  const uid                   = userProfile?.id || '';
  const [summary, setSummary] = useState(null);
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(null); // seconds remaining
  const timerRef = useRef(null);
  const today    = todayString();

  useFocusEffect(useCallback(() => {
    if (!uid) { setLoading(false); return; }
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const [payment, snap] = await Promise.all([
          getDailyPayment(uid, today),
          getBookingsByOwner(uid),
        ]);
        if (!alive) return;
        setSummary(payment);
        setJobs(
          snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(b => b.date === today && b.status === 'completed')
        );

        // Start countdown if unpaid and deadline exists
        if (payment?.status === 'unpaid' && payment?.paymentDeadline) {
          const deadlineMs = new Date(payment.paymentDeadline).getTime();
          const nowMs      = Date.now();
          const secsLeft   = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
          setCountdown(secsLeft);
        } else {
          setCountdown(null);
        }
      } catch (e) {
        console.warn('DailySummary:', e.message);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [uid, today]));

  // Live countdown ticker
  useEffect(() => {
    if (countdown === null) return;
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [countdown]);

  if (loading) return <Loader />;

  const totalComm = summary?.totalCommission || 0;
  const isPaid    = summary?.status === 'paid';
  const isUrgent  = countdown !== null && countdown < 3600; // < 1 hour

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.header}>
          <Text style={s.headerIcon}>📊</Text>
          <Text style={s.headerTitle}>24-Hour Summary</Text>
          <View style={s.datePill}>
            <Text style={s.dateTxt}>📅 {today}</Text>
          </View>
        </LinearGradient>

        {/* ── 24hr Countdown Timer (unpaid only) ── */}
        {!isPaid && countdown !== null && (
          <View style={[s.timerBox, isUrgent && s.timerBoxUrgent]}>
            <Text style={[s.timerLabel, isUrgent && s.timerLabelUrgent]}>
              {countdown === 0 ? '⛔ Payment Deadline Passed!' : '⏱️ Time Remaining to Pay Commission'}
            </Text>
            <Text style={[s.timerCount, isUrgent && s.timerCountUrgent]}>
              {fmtCountdown(countdown)}
            </Text>
            {countdown > 0 && (
              <Text style={s.timerSub}>Pay before deadline to keep your account active</Text>
            )}
          </View>
        )}

        {/* ── Earnings card ── */}
        <View style={s.section}>
          <EarningsCard
            totalHectare={summary?.totalHectare || 0}
            totalCommission={totalComm}
            status={summary?.status || 'unpaid'}
          />
        </View>

        {/* ── Completed jobs ── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Completed Jobs</Text>
            <View style={[s.countBadge, { backgroundColor: jobs.length > 0 ? COLORS.primaryXLight : '#F3F4F6' }]}>
              <Text style={[s.countTxt, { color: jobs.length > 0 ? COLORS.primary : COLORS.textSecondary }]}>
                {jobs.length}
              </Text>
            </View>
          </View>
          {jobs.length > 0
            ? jobs.map((j, i) => (
                <SummaryCard
                  key={j.id}
                  jobNumber={i + 1}
                  farmerName={j.farmerName || 'Farmer'}
                  farmerPhone={j.farmerPhone || ''}
                  hectareCompleted={j.hectareCompleted || 0}
                  commission={(j.hectareCompleted || 0) * CONFIG.COMMISSION_PER_HECTARE}
                />
              ))
            : (
              <View style={s.emptyBox}>
                <Text style={s.emptyTxt}>No completed jobs yet</Text>
              </View>
            )
          }
        </View>

        {/* ── Pay CTA ── */}
        {totalComm > 0 && !isPaid && (
          <View style={s.section}>
            <View style={[s.warnBox, isUrgent && s.warnBoxUrgent]}>
              <Text style={[s.warnTxt, isUrgent && s.warnTxtUrgent]}>
                {isUrgent
                  ? '🚨 Less than 1 hour left! Pay commission immediately to avoid account suspension.'
                  : '⚠️ Commission due — your account is locked until payment is complete.'}
              </Text>
            </View>
            <Button
              title={`Pay Rs.${totalComm} Commission Now`}
              onPress={() => navigation.navigate('Payment', { summary })}
              style={{ marginTop: 12 }}
            />
          </View>
        )}

        {isPaid && (
          <View style={s.section}>
            <View style={s.paidBox}>
              <Text style={s.paidTxt}>Commission paid — account is unlocked!</Text>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.background },
  scroll:         { paddingBottom: 32 },
  header:         { paddingTop: 36, paddingBottom: 28, paddingHorizontal: 24, alignItems: 'center' },
  headerIcon:     { fontSize: 44, marginBottom: 10 },
  headerTitle:    { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 10 },
  datePill:       { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  dateTxt:        { fontSize: 13, fontWeight: '600', color: '#fff' },

  timerBox:       { margin: 16, backgroundColor: '#FFF3CD', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: '#F59E0B' },
  timerBoxUrgent: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  timerLabel:     { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 10 },
  timerLabelUrgent:{ color: '#B91C1C' },
  timerCount:     { fontSize: 44, fontWeight: '900', color: '#92400E', letterSpacing: 4, fontVariant: ['tabular-nums'] },
  timerCountUrgent:{ color: '#B91C1C' },
  timerSub:       { fontSize: 12, color: '#92400E', marginTop: 8, textAlign: 'center' },

  section:        { paddingHorizontal: 16, marginTop: 20 },
  sectionRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle:   { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, flex: 1 },
  countBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countTxt:       { fontSize: 13, fontWeight: '800' },
  emptyBox:       { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center', elevation: 1 },
  emptyTxt:       { fontSize: 13, color: COLORS.textSecondary },

  warnBox:        { backgroundColor: '#FFF3CD', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  warnBoxUrgent:  { backgroundColor: '#FEE2E2', borderLeftColor: COLORS.error },
  warnTxt:        { fontSize: 13, color: '#856404', lineHeight: 20 },
  warnTxtUrgent:  { color: '#B91C1C' },

  paidBox:        { backgroundColor: '#D4EDDA', borderRadius: 12, padding: 16, alignItems: 'center' },
  paidTxt:        { fontSize: 14, fontWeight: '700', color: '#155724' },
});
