// src/owner/screens/DailySummary.js
// Shows today's work + commission status + countdown timer

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, TouchableOpacity,
} from 'react-native';
import { useFocusEffect }          from '@react-navigation/native';
import {
  getDailyPayment, getBookingsByOwner,
} from '../../../firebase/firestore';
import {
  listenOwnerLockState, computeLockState, LOCK_WINDOW_MS,
} from '../../../firebase/commission';
import { useUser }        from '../../../context/UserContext';
import { todayString }    from '../../../utils/dateFormatter';
import { CONFIG }         from '../../../constants/config';
import { COLORS }         from '../../../constants/colors';
import { rs, rf, H_PAD }  from '../../../utils/responsive';
import { FIcon }          from '../../../utils/icons';
import Button             from '../../common/components/Button';
import Loader             from '../../common/components/Loader';

const fmt = (ms) => {
  if (!ms || ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
};

export default function DailySummary({ navigation }) {
  const { userProfile }     = useUser();
  const uid                 = userProfile?.id || '';
  const today               = todayString();

  const [jobs,       setJobs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [lockState,  setLockState]  = useState(null);
  const [countdown,  setCountdown]  = useState('--:--:--');
  const countdownRef = useRef(null);

  // Load jobs
  useFocusEffect(useCallback(() => {
    if (!uid) { setLoading(false); return; }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const snap = await getBookingsByOwner(uid);
        if (!alive) return;
        setJobs(
          snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(b => b.date === today && b.status === 'completed')
        );
      } catch { }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [uid, today]));

  // Real-time commission state
  useEffect(() => {
    if (!uid) return;
    const unsub = listenOwnerLockState(uid, (state) => {
      setLockState(state);
      // Start countdown from msRemaining
      clearInterval(countdownRef.current);
      if (!state.msRemaining || state.msRemaining <= 0 || state.paymentStatus === 'paid') {
        setCountdown(state.paymentStatus === 'paid' ? 'Paid' : '00:00:00');
        return;
      }
      let remaining = state.msRemaining;
      setCountdown(fmt(remaining));
      countdownRef.current = setInterval(() => {
        remaining -= 1000;
        if (remaining <= 0) {
          clearInterval(countdownRef.current);
          setCountdown('00:00:00');
        } else {
          setCountdown(fmt(remaining));
        }
      }, 1000);
    });
    return () => { unsub(); clearInterval(countdownRef.current); };
  }, [uid]);

  if (loading) return <Loader />;

  const ps        = lockState?.paymentStatus ?? userProfile?.paymentStatus ?? 'none';
  const amount    = lockState?.commissionAmount ?? userProfile?.commissionAmount ?? 0;
  const isLocked  = lockState?.isLocked ?? false;
  const hasJob    = !!lockState?.otpVerifiedAt;
  const isPaid    = ps === 'paid';
  const isPV      = ps === 'pending_verification';
  const isUrgent  = lockState?.msRemaining != null && lockState.msRemaining < 3600000 && !isPaid;

  // Timer bar fill: how much time has PASSED (red = time running out)
  const timePassedPct = hasJob && lockState?.msRemaining != null
    ? Math.min(100, Math.round((1 - lockState.msRemaining / LOCK_WINDOW_MS) * 100))
    : 0;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Commission status card */}
        {hasJob && (
          <View style={[s.commCard, isLocked && { borderColor: '#EF4444', borderWidth: rs(2) }]}>
            <View style={s.commCardTop}>
              <View>
                <Text style={s.commCardLabel}>Commission</Text>
                <Text style={s.commCardAmount}>Rs.{amount}</Text>
              </View>
              <View style={[
                s.statusPill,
                isPaid ? { backgroundColor: '#DCFCE7' }
                : isPV  ? { backgroundColor: '#EFF6FF' }
                : isLocked ? { backgroundColor: '#FEE2E2' }
                : { backgroundColor: '#FFF3CD' }
              ]}>
                <Text style={[
                  s.statusPillTxt,
                  isPaid ? { color: '#065F46' }
                  : isPV  ? { color: '#1D4ED8' }
                  : isLocked ? { color: '#B91C1C' }
                  : { color: '#92400E' }
                ]}>
                  {isPaid ? 'Paid' : isPV ? 'Under review' : isLocked ? 'Locked' : 'Pending'}
                </Text>
              </View>
            </View>

            {/* Timer */}
            {!isPaid && (
              <>
                <Text style={s.timerLabel}>
                  {isLocked ? 'Window closed — pay now' : 'Time remaining to pay'}
                </Text>
                <Text style={[s.timerValue, isUrgent && { color: '#EF4444' }]}>
                  {isLocked ? '00:00:00' : countdown}
                </Text>
                <View style={s.timerBar}>
                  <View style={[
                    s.timerBarFill,
                    { width: `${timePassedPct}%`, backgroundColor: isUrgent ? '#EF4444' : '#1C7C54' }
                  ]} />
                </View>
              </>
            )}

            {isPaid && (
              <View style={s.paidRow}>
                <FIcon name="check-circle" size={rs(16)} color="#22C55E" fallback="✓" style={{ marginRight: rs(6) }} />
                <Text style={s.paidTxt}>Commission verified. Account fully unlocked.</Text>
              </View>
            )}

            {isPV && (
              <View style={s.pvRow}>
                <Text style={s.pvTxt}>Payment proof submitted. Waiting for admin to verify.</Text>
              </View>
            )}
          </View>
        )}

        {/* Pay button — only show when locked */}
        {isLocked && !isPaid && !isPV && (
          <View style={{ paddingHorizontal: H_PAD, marginTop: rs(12) }}>
            <TouchableOpacity
              style={s.payNowBtn}
              onPress={() => navigation.navigate('PayCommission')}
              activeOpacity={0.88}
            >
              <FIcon name="credit-card" size={rs(18)} color="#fff" fallback="💳" style={{ marginRight: rs(8) }} />
              <Text style={s.payNowBtnTxt}>Pay Commission Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Jobs */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Completed jobs today</Text>
            <View style={[s.countBadge, { backgroundColor: jobs.length > 0 ? COLORS.primaryLight : '#F3F4F6' }]}>
              <Text style={[s.countTxt, { color: jobs.length > 0 ? COLORS.primary : COLORS.textSecondary }]}>
                {jobs.length}
              </Text>
            </View>
          </View>

          {jobs.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyTxt}>No completed jobs today</Text>
            </View>
          ) : (
            jobs.map((j, i) => (
              <View key={j.id} style={s.jobCard}>
                <View style={s.jobHeader}>
                  <View style={[s.jobBadge, { backgroundColor: COLORS.primaryLight }]}>
                    <Text style={[s.jobBadgeTxt, { color: COLORS.primary }]}>Job {i + 1}</Text>
                  </View>
                  <Text style={s.jobComm}>Rs.{Math.round((j.hectareCompleted || 0) * CONFIG.COMMISSION_PER_HECTARE)}</Text>
                </View>
                <Text style={s.jobMeta}>Farmer: {j.farmerName || '—'}</Text>
                <Text style={s.jobMeta}>Completed: {j.hectareCompleted} ha</Text>
              </View>
            ))
          )}
        </View>

        {/* Warning banner */}
        {hasJob && !isPaid && !isLocked && (
          <View style={[s.warnBox, isUrgent && { borderLeftColor: '#EF4444', backgroundColor: '#FEF2F2' }]}>
            <Text style={[s.warnTxt, isUrgent && { color: '#B91C1C' }]}>
              {isUrgent
                ? 'Less than 1 hour left! Pay commission immediately or account will lock.'
                : 'Pay Rs.' + amount + ' commission before the timer expires to keep your account active.'
              }
            </Text>
          </View>
        )}

        <View style={{ height: rs(32) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#fff' },
  scroll:       { paddingBottom: rs(20) },

  commCard:     { backgroundColor: '#fff', margin: rs(16), borderRadius: rs(18), padding: rs(18), elevation: 3, borderWidth: rs(1), borderColor: COLORS.border },
  commCardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: rs(16) },
  commCardLabel:{ fontSize: rf(12), color: COLORS.textSecondary, marginBottom: rs(4) },
  commCardAmount:{ fontSize: rf(32), fontWeight: '900', color: '#111827' },
  statusPill:   { borderRadius: rs(12), paddingHorizontal: rs(12), paddingVertical: rs(5) },
  statusPillTxt:{ fontSize: rf(12), fontWeight: '800' },
  timerLabel:   { fontSize: rf(12), color: COLORS.textSecondary, marginBottom: rs(6) },
  timerValue:   { fontSize: rf(40), fontWeight: '900', color: '#111827', letterSpacing: rs(2), marginBottom: rs(12) },
  timerBar:     { height: rs(6), backgroundColor: '#F0F0F0', borderRadius: rs(3), overflow: 'hidden' },
  timerBarFill: { height: '100%', borderRadius: rs(3) },
  paidRow:      { flexDirection: 'row', alignItems: 'center', marginTop: rs(8) },
  paidTxt:      { fontSize: rf(13), fontWeight: '600', color: '#065F46', flex: 1 },
  pvRow:        { backgroundColor: '#EFF6FF', borderRadius: rs(10), padding: rs(10), marginTop: rs(8) },
  pvTxt:        { fontSize: rf(13), color: '#1D4ED8', fontWeight: '600' },

  payNowBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#B91C1C', borderRadius: rs(14), paddingVertical: rs(16), elevation: 3 },
  payNowBtnTxt: { color: '#fff', fontSize: rf(15), fontWeight: '900' },

  section:      { paddingHorizontal: H_PAD, marginTop: rs(20) },
  sectionRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: rs(12) },
  sectionTitle: { fontSize: rf(16), fontWeight: '800', color: '#111827', flex: 1 },
  countBadge:   { paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: rs(12) },
  countTxt:     { fontSize: rf(13), fontWeight: '800' },

  jobCard:      { backgroundColor: '#fff', borderRadius: rs(14), padding: rs(14), marginBottom: rs(10), elevation: 2, borderLeftWidth: rs(4), borderLeftColor: COLORS.primary },
  jobHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(8) },
  jobBadge:     { borderRadius: rs(8), paddingHorizontal: rs(10), paddingVertical: rs(4) },
  jobBadgeTxt:  { fontSize: rf(12), fontWeight: '800' },
  jobComm:      { fontSize: rf(18), fontWeight: '900', color: '#22C55E' },
  jobMeta:      { fontSize: rf(13), color: COLORS.textPrimary, marginBottom: rs(3) },

  emptyBox:     { backgroundColor: '#F9FAFB', borderRadius: rs(12), padding: rs(20), alignItems: 'center' },
  emptyTxt:     { fontSize: rf(13), color: COLORS.textSecondary },

  warnBox:      { marginHorizontal: H_PAD, marginTop: rs(16), backgroundColor: '#FFF3CD', borderRadius: rs(12), padding: rs(14), borderLeftWidth: rs(4), borderLeftColor: '#F59E0B' },
  warnTxt:      { fontSize: rf(13), color: '#856404', lineHeight: rf(20), fontWeight: '600' },
});
