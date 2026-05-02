// src/owner/screens/DailySummary.js
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { useFocusEffect }  from '@react-navigation/native';
import { getDailyPayment, getBookingsByOwner } from '../../../firebase/firestore';
import { useUser }         from '../../../context/UserContext';
import { todayString }     from '../../../utils/dateFormatter';
import { CONFIG }          from '../../../constants/config';
import { COLORS }          from '../../../constants/colors';
import { rs, rf, H_PAD }   from '../../../utils/responsive';
import { FIcon }           from '../../../utils/icons';
import Button              from '../../common/components/Button';
import Loader              from '../../common/components/Loader';

const fmtCountdown = (secs) => {
  if (secs <= 0) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h,m,s].map(v => String(v).padStart(2,'0')).join(':');
};

export default function DailySummary({ navigation }) {
  const { userProfile }         = useUser();
  const uid                     = userProfile?.id || '';
  const [summary, setSummary]   = useState(null);
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [countdown, setCountdown] = useState(null);
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
        setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => b.date === today && b.status === 'completed'));
        if (payment?.status === 'unpaid' && payment?.paymentDeadline) {
          const secsLeft = Math.max(0, Math.floor((new Date(payment.paymentDeadline).getTime() - Date.now()) / 1000));
          setCountdown(secsLeft);
        } else { setCountdown(null); }
      } catch (e) { console.warn('DailySummary:', e.message); }
      finally { if (alive) setLoading(false); }
    };
    load();
    return () => { alive = false; };
  }, [uid, today]));

  useEffect(() => {
    if (countdown === null) return;
    timerRef.current = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(timerRef.current); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [countdown]);

  if (loading) return <Loader />;

  const totalComm = summary?.totalCommission || 0;
  const totalHa   = summary?.totalHectare    || 0;
  const isPaid    = summary?.status === 'paid';
  const isUrgent  = countdown !== null && countdown < 3600;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Page title bar */}
        <View style={s.titleBar}><Text style={s.titleBarTxt}>Today's Work</Text></View>

        {/* Stats row — screenshot reference */}
        <View style={s.statsRow}>
          {[
            { icon: '🌾', label: 'Hectares',   value: `${totalHa} ha`,     bg: COLORS.primaryLight, color: COLORS.primaryDark },
            { icon: '💰', label: 'Commission',  value: `Rs.${totalComm}`,   bg: '#FFF8E1', color: '#92400E' },
            { icon: '✅', label: 'Jobs Done',   value: `${jobs.length}`,    bg: '#ECFDF5', color: '#065F46' },
          ].map(st => (
            <View key={st.label} style={[s.statCard, { backgroundColor: st.bg }]}>
              <Text style={s.statIcon}>{st.icon}</Text>
              <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
              <Text style={[s.statLabel, { color: st.color }]}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Countdown timer */}
        {!isPaid && countdown !== null && (
          <View style={[s.timerBox, isUrgent && s.timerBoxUrgent]}>
            <Text style={[s.timerLabel, isUrgent && s.timerLabelUrgent]}>
              {countdown === 0 ? '⛔ Payment Deadline Passed!' : '⏱️ Time Remaining to Pay Commission'}
            </Text>
            <Text style={[s.timerCount, isUrgent && s.timerCountUrgent]}>{fmtCountdown(countdown)}</Text>
            {countdown > 0 && <Text style={s.timerSub}>Pay before deadline to keep your account active</Text>}
          </View>
        )}

        {/* Completed jobs */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Completed Jobs</Text>
            <View style={[s.countBadge, { backgroundColor: jobs.length > 0 ? COLORS.primaryLight : '#F3F4F6' }]}>
              <Text style={[s.countTxt, { color: jobs.length > 0 ? COLORS.primary : COLORS.textSecondary }]}>{jobs.length}</Text>
            </View>
          </View>

          {jobs.length > 0 ? jobs.map((j, i) => (
            <View key={j.id} style={s.jobCard}>
              <View style={s.jobHeader}>
                <View style={[s.jobBadge, { backgroundColor: COLORS.primaryLight }]}>
                  <Text style={[s.jobBadgeTxt, { color: COLORS.primary }]}>Job #{i + 1}</Text>
                </View>
                <Text style={s.jobComm}>₹{(j.hectareCompleted || 0) * CONFIG.COMMISSION_PER_HECTARE}</Text>
              </View>
              <Text style={s.jobMeta}>👨‍🌾 {j.farmerName || 'Farmer'}</Text>
              {j.farmerPhone && <Text style={s.jobMeta}>📞 {j.farmerPhone}</Text>}
              <Text style={s.jobMeta}>🌾 {j.hectareCompleted} ha completed</Text>
            </View>
          )) : (
            <View style={s.emptyBox}>
              <Text style={s.emptyTxt}>No completed jobs yet today</Text>
            </View>
          )}
        </View>

        {/* Pay CTA */}
        {totalComm > 0 && !isPaid && (
          <View style={s.section}>
            <View style={[s.warnBox, isUrgent && s.warnBoxUrgent]}>
              <FIcon name="alert-triangle" size={16} color={isUrgent ? '#B91C1C' : '#856404'} fallback="⚠️" style={{ marginRight: rs(8) }} />
              <Text style={[s.warnTxt, isUrgent && s.warnTxtUrgent]}>
                {isUrgent ? 'Less than 1 hour left! Pay commission immediately.' : 'Commission due — account locked until payment.'}
              </Text>
            </View>
            <Button title={`Pay Rs.${totalComm} Commission Now`} onPress={() => navigation.navigate('Payment', { summary })} style={{ marginTop: rs(12) }} />
          </View>
        )}

        {isPaid && (
          <View style={s.section}>
            <View style={s.paidBox}>
              <FIcon name="check-circle" size={20} color={COLORS.success} fallback="✅" style={{ marginRight: rs(8) }} />
              <Text style={s.paidTxt}>Commission paid — account is unlocked!</Text>
            </View>
          </View>
        )}

        <View style={{ height: rs(24) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#fff' },
  scroll:           { paddingBottom: rs(32) },
  titleBar:         { paddingHorizontal: H_PAD, paddingTop: rs(16), paddingBottom: rs(12), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  titleBarTxt:      { fontSize: rf(14), fontWeight: '600', color: '#111827' },
  statsRow:         { flexDirection: 'row', paddingHorizontal: H_PAD, paddingTop: rs(16), paddingBottom: rs(8) },
  statCard:         { flex: 1, borderRadius: rs(14), padding: rs(14), alignItems: 'center', marginHorizontal: rs(4) },
  statIcon:         { fontSize: rf(22), marginBottom: rs(6) },
  statValue:        { fontSize: rf(18), fontWeight: '900', marginBottom: rs(2) },
  statLabel:        { fontSize: rf(11), fontWeight: '600' },
  timerBox:         { marginHorizontal: H_PAD, marginTop: rs(16), backgroundColor: '#FFF3CD', borderRadius: rs(16), padding: rs(20), alignItems: 'center', borderWidth: rs(2), borderColor: '#F59E0B' },
  timerBoxUrgent:   { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  timerLabel:       { fontSize: rf(13), fontWeight: '700', color: '#92400E', marginBottom: rs(10), textAlign: 'center' },
  timerLabelUrgent: { color: '#B91C1C' },
  timerCount:       { fontSize: rf(44), fontWeight: '900', color: '#92400E', letterSpacing: rs(4) },
  timerCountUrgent: { color: '#B91C1C' },
  timerSub:         { fontSize: rf(12), color: '#92400E', marginTop: rs(8), textAlign: 'center' },
  section:          { paddingHorizontal: H_PAD, marginTop: rs(20) },
  sectionRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: rs(12) },
  sectionTitle:     { fontSize: rf(16), fontWeight: '800', color: COLORS.textPrimary, flex: 1 },
  countBadge:       { paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: rs(12) },
  countTxt:         { fontSize: rf(13), fontWeight: '800' },
  jobCard:          { backgroundColor: '#fff', borderRadius: rs(14), padding: rs(14), marginBottom: rs(10), elevation: 2, borderLeftWidth: rs(4), borderLeftColor: COLORS.primary },
  jobHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(8) },
  jobBadge:         { borderRadius: rs(8), paddingHorizontal: rs(10), paddingVertical: rs(4) },
  jobBadgeTxt:      { fontSize: rf(12), fontWeight: '800' },
  jobComm:          { fontSize: rf(18), fontWeight: '900', color: COLORS.success },
  jobMeta:          { fontSize: rf(13), color: COLORS.textPrimary, fontWeight: '500', marginBottom: rs(4) },
  emptyBox:         { backgroundColor: '#F9FAFB', borderRadius: rs(12), padding: rs(20), alignItems: 'center', elevation: 1 },
  emptyTxt:         { fontSize: rf(13), color: COLORS.textSecondary },
  warnBox:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3CD', borderRadius: rs(12), padding: rs(14), borderLeftWidth: rs(4), borderLeftColor: '#F59E0B' },
  warnBoxUrgent:    { backgroundColor: '#FEE2E2', borderLeftColor: COLORS.error },
  warnTxt:          { fontSize: rf(13), color: '#856404', lineHeight: rf(20), flex: 1 },
  warnTxtUrgent:    { color: '#B91C1C' },
  paidBox:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', borderRadius: rs(12), padding: rs(16) },
  paidTxt:          { fontSize: rf(14), fontWeight: '700', color: '#155724' },
});
