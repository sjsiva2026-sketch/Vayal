import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, Alert, Linking, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  upsertDailyPayment, updateUser, getDailyPayment, addAppAccountEntry,
} from '../../../firebase/firestore';
import { useUser }     from '../../../context/UserContext';
import { todayString } from '../../../utils/dateFormatter';
import { CONFIG }      from '../../../constants/config';
import Loader          from '../../common/components/Loader';
import { COLORS }      from '../../../constants/colors';
import { ICONS }       from '../../../assets/index';

const VAYAL_UPI  = CONFIG.VAYAL_UPI_ID;
const VAYAL_NAME = CONFIG.VAYAL_UPI_NAME;

const UPI_APPS = [
  {
    id: 'gpay', label: 'Google Pay', shortLabel: 'GPay',
    emoji: '🟢', bg: '#F0FDF4', border: '#86EFAC', color: '#166534',
    buildUrl: (id, name, amt) =>
      `tez://upi/pay?pa=${id}&pn=${encodeURIComponent(name)}&am=${amt}&cu=INR&tn=VayalCommission`,
  },
  {
    id: 'phonepe', label: 'PhonePe', shortLabel: 'PhonePe',
    emoji: '🟣', bg: '#F5F3FF', border: '#C4B5FD', color: '#4C1D95',
    buildUrl: (id, name, amt) =>
      `phonepe://pay?pa=${id}&pn=${encodeURIComponent(name)}&am=${amt}&cu=INR&tn=VayalCommission`,
  },
  {
    id: 'paytm', label: 'Paytm', shortLabel: 'Paytm',
    emoji: '🔵', bg: '#EFF6FF', border: '#93C5FD', color: '#1D4ED8',
    buildUrl: (id, name, amt) =>
      `paytmmp://pay?pa=${id}&pn=${encodeURIComponent(name)}&am=${amt}&cu=INR&tn=VayalCommission`,
  },
];

const fmtCountdown = (secs) => {
  if (secs <= 0) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
};

export default function CommissionLockScreen() {
  const { userProfile, updateProfile } = useUser();
  const uid   = userProfile?.id || '';
  const today = todayString();

  const [summary, setSummary]         = useState(null);
  const [loadingSummary, setLoading]  = useState(true);
  const [paid, setPaid]               = useState(false);
  const [confirming, setConfirming]   = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [upiOpened, setUpiOpened]     = useState(false);
  const [countdown, setCountdown]     = useState(null);
  const timerRef = useRef(null);

  // Load commission summary
  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    getDailyPayment(uid, today)
      .then(d => setSummary(d))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [uid]);

  // Live countdown from userProfile.paymentDeadline
  useEffect(() => {
    clearInterval(timerRef.current);
    const deadline = userProfile?.paymentDeadline;
    if (!deadline) { setCountdown(null); return; }
    const tick = () => {
      const secs = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
      setCountdown(secs);
      if (secs === 0) clearInterval(timerRef.current);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [userProfile?.paymentDeadline]);

  if (loadingSummary) return <Loader />;

  const amount  = summary?.totalCommission || 0;
  const hectare = summary?.totalHectare    || 0;
  const rate    = CONFIG.COMMISSION_PER_HECTARE;
  const isOverdue = countdown === 0;
  const isUrgent  = countdown !== null && countdown < 3600 && countdown > 0;

  // ── Open UPI App ──────────────────────────────────────────────────────────
  const handleOpenUPI = async (app) => {
    setSelectedApp(app.id);
    const deepLink = app.buildUrl(VAYAL_UPI, VAYAL_NAME, amount);
    const generic  = `upi://pay?pa=${VAYAL_UPI}&pn=${encodeURIComponent(VAYAL_NAME)}&am=${amount}&cu=INR&tn=VayalCommission`;
    try {
      const canDeep = await Linking.canOpenURL(deepLink);
      if (canDeep) { await Linking.openURL(deepLink); }
      else {
        const canGeneric = await Linking.canOpenURL(generic);
        if (canGeneric) { await Linking.openURL(generic); }
        else { Alert.alert(`${app.label} Not Found`, `Pay manually to:\n${VAYAL_UPI}`); return; }
      }
      setUpiOpened(true);
    } catch {
      Alert.alert('Error', `Could not open ${app.label}. Pay manually to: ${VAYAL_UPI}`);
    }
  };

  // ── Confirm Payment → Unlock ──────────────────────────────────────────────
  const handleMarkPaid = async () => {
    if (!upiOpened && !selectedApp) {
      Alert.alert('Pay First', `Open a UPI app above and complete the Rs.${amount} payment first.`);
      return;
    }
    Alert.alert(
      'Confirm Payment',
      `Have you completed the Rs.${amount} payment to ${VAYAL_NAME}?\n\nUPI: ${VAYAL_UPI}`,
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, I Paid',
          onPress: async () => {
            setConfirming(true);
            try {
              // 1. Mark daily payment paid
              await upsertDailyPayment(uid, today, {
                status:        'paid',
                paidAt:        new Date().toISOString(),
                paymentMethod: selectedApp || 'upi',
              });
              // 2. Unlock account — clear all lock fields
              await updateUser(uid, {
                isLocked:        false,
                lockReason:      null,
                commissionDate:  null,
                paymentDeadline: null,
              });
              updateProfile({
                isLocked:        false,
                lockReason:      null,
                commissionDate:  null,
                paymentDeadline: null,
              });
              // 3. App account ledger entry
              await addAppAccountEntry({
                ownerId:       uid,
                ownerName:     userProfile?.name  || '',
                ownerPhone:    userProfile?.phone || '',
                amount, hectare, date: today,
                paymentMethod: selectedApp || 'upi',
                upiId:         VAYAL_UPI,
              });
              setPaid(true);
            } catch (e) {
              Alert.alert('Error', e.message || 'Confirmation failed. Try again.');
            } finally {
              setConfirming(false);
            }
          },
        },
      ],
    );
  };

  // ── SUCCESS — account unlocked, AppNavigator will re-render owner screens
  if (paid) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.successBox}>
          <Text style={s.successEmoji}>🎉</Text>
          <Text style={s.successTitle}>Payment Confirmed!</Text>
          <Text style={s.successSub}>
            Rs.{amount} paid successfully.{'\n'}All screens are now unlocked!
          </Text>
          <View style={s.receipt}>
            <View style={s.receiptHeader}>
              <Text style={s.receiptTitle}>Payment Receipt</Text>
              <View style={s.paidStamp}><Text style={s.paidStampTxt}>PAID</Text></View>
            </View>
            {[
              { label: 'Date',      value: today },
              { label: 'Amount',    value: `Rs.${amount}`, hi: true },
              { label: 'Hectares',  value: `${hectare} ha` },
              { label: 'Paid via',  value: (selectedApp || 'UPI').toUpperCase() },
              { label: 'UPI ID',    value: VAYAL_UPI },
            ].map((r, i, arr) => (
              <View key={r.label} style={[s.receiptRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={s.receiptLabel}>{r.label}</Text>
                <Text style={[s.receiptVal, r.hi && { color: COLORS.primary, fontSize: 16 }]}>
                  {r.value}
                </Text>
              </View>
            ))}
          </View>
          <Text style={s.unlockNote}>
            Returning to dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── MAIN LOCK SCREEN ──────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {/* ── Locked Hero ── */}
        <LinearGradient
          colors={isOverdue ? ['#7F1D1D', '#B91C1C'] : ['#B91C1C', '#EF4444']}
          style={s.hero}
        >
          <Text style={s.heroIcon}>🔒</Text>
          <Text style={s.heroTitle}>Account Locked</Text>
          <Text style={s.heroSub}>Pay commission to unlock all features</Text>

          {/* Countdown Timer */}
          {countdown !== null && (
            <View style={s.timerBox}>
              <Text style={s.timerLabel}>
                {isOverdue ? 'OVERDUE — Pay immediately' : 'Time remaining to pay'}
              </Text>
              <Text style={s.timerCount}>{fmtCountdown(countdown)}</Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Commission Amount ── */}
        <View style={s.amountCard}>
          <View style={s.amountRow}>
            <View style={s.amountItem}>
              <Text style={s.amountLabel}>Commission Due</Text>
              <Text style={s.amountValue}>Rs.{amount}</Text>
            </View>
            <View style={s.amountDivider} />
            <View style={s.amountItem}>
              <Text style={s.amountLabel}>Hectares Done</Text>
              <Text style={s.amountValue}>{hectare} ha</Text>
            </View>
            <View style={s.amountDivider} />
            <View style={s.amountItem}>
              <Text style={s.amountLabel}>Rate</Text>
              <Text style={s.amountValue}>Rs.{rate}/ha</Text>
            </View>
          </View>
          <View style={s.upiIdRow}>
            <Text style={s.upiIdTxt}>Pay to: {VAYAL_UPI}  |  {VAYAL_NAME}</Text>
          </View>
        </View>

        {/* ── Steps ── */}
        <View style={s.stepsBox}>
          <Text style={s.stepsTitle}>How to Unlock</Text>
          {[
            { n: '1', txt: 'Tap a payment app below' },
            { n: '2', txt: `Pay Rs.${amount} to ${VAYAL_UPI}` },
            { n: '3', txt: "Return here — tap \"I've Paid\"" },
            { n: '4', txt: 'All screens unlock instantly' },
          ].map(st => (
            <View key={st.n} style={s.step}>
              <View style={s.stepNum}><Text style={s.stepNumTxt}>{st.n}</Text></View>
              <Text style={s.stepTxt}>{st.txt}</Text>
            </View>
          ))}
        </View>

        {/* ── UPI Apps ── */}
        <Text style={s.sectionLabel}>STEP 1 — Choose UPI App</Text>
        <View style={s.upiRow}>
          {UPI_APPS.map(app => (
            <TouchableOpacity
              key={app.id}
              style={[
                s.upiCard,
                { backgroundColor: app.bg, borderColor: selectedApp === app.id ? app.border : '#E5E7EB' },
                selectedApp === app.id && { borderWidth: 2.5 },
              ]}
              onPress={() => handleOpenUPI(app)}
              activeOpacity={0.85}
            >
              {ICONS[app.id]
                ? <Image source={ICONS[app.id]} style={s.upiLogo} resizeMode="contain" />
                : <Text style={s.upiEmoji}>{app.emoji}</Text>
              }
              <Text style={[s.upiLabel, { color: app.color }]}>{app.shortLabel}</Text>
              {selectedApp === app.id && (
                <View style={[s.tick, { backgroundColor: app.color }]}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {upiOpened && (
          <View style={s.openedBanner}>
            <Text style={s.openedTxt}>
              UPI app opened! Complete the Rs.{amount} payment, then return here.
            </Text>
          </View>
        )}

        {/* ── Confirm Button ── */}
        <Text style={[s.sectionLabel, { marginTop: 20 }]}>STEP 2 — Confirm Payment</Text>
        <TouchableOpacity
          style={[s.confirmBtn, confirming && { opacity: 0.6 }]}
          onPress={handleMarkPaid}
          disabled={confirming}
          activeOpacity={0.88}
        >
          <Text style={s.confirmBtnTxt}>
            {confirming ? 'Saving...' : "I've Paid — Unlock My Account"}
          </Text>
        </TouchableOpacity>

        <View style={s.warnBox}>
          <Text style={s.warnTxt}>
            Only confirm after completing the actual UPI payment. Admin verifies all transactions.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F4F6F8' },
  container:     { paddingBottom: 32 },

  hero:          { paddingTop: 54, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  heroIcon:      { fontSize: 52, marginBottom: 12 },
  heroTitle:     { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 6 },
  heroSub:       { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20, textAlign: 'center' },

  timerBox:      { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 28, alignItems: 'center' },
  timerLabel:    { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  timerCount:    { fontSize: 48, fontWeight: '900', color: '#fff', letterSpacing: 4, fontVariant: ['tabular-nums'] },

  amountCard:    { margin: 16, backgroundColor: '#fff', borderRadius: 18, elevation: 3, overflow: 'hidden' },
  amountRow:     { flexDirection: 'row', padding: 20, alignItems: 'center' },
  amountItem:    { flex: 1, alignItems: 'center' },
  amountDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },
  amountLabel:   { fontSize: 11, color: '#6B7280', marginBottom: 6 },
  amountValue:   { fontSize: 18, fontWeight: '900', color: '#111827' },
  upiIdRow:      { backgroundColor: '#F4F6F8', paddingVertical: 10, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  upiIdTxt:      { fontSize: 12, color: '#374151', fontWeight: '600', textAlign: 'center' },

  stepsBox:      { marginHorizontal: 16, marginBottom: 20, backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: '#22C55E' },
  stepsTitle:    { fontSize: 14, fontWeight: '800', color: '#166534', marginBottom: 12 },
  step:          { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stepNum:       { width: 24, height: 24, borderRadius: 12, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepNumTxt:    { color: '#fff', fontSize: 12, fontWeight: '900' },
  stepTxt:       { fontSize: 13, color: '#166534', flex: 1, lineHeight: 20 },

  sectionLabel:  { fontSize: 13, fontWeight: '800', color: '#6B7280', letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 16 },

  upiRow:        { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  upiCard:       { flex: 1, borderRadius: 16, paddingVertical: 18, alignItems: 'center', borderWidth: 1.5, elevation: 2, position: 'relative' },
  upiLogo:       { width: 48, height: 48, marginBottom: 8, borderRadius: 10 },
  upiEmoji:      { fontSize: 34, marginBottom: 8 },
  upiLabel:      { fontSize: 12, fontWeight: '800' },
  tick:          { position: 'absolute', top: 7, right: 7, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  openedBanner:  { marginHorizontal: 16, backgroundColor: '#ECFDF5', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#22C55E' },
  openedTxt:     { fontSize: 13, color: '#166534', fontWeight: '600', lineHeight: 20 },

  confirmBtn:    { marginHorizontal: 16, backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', elevation: 3, marginTop: 4 },
  confirmBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },

  warnBox:       { marginHorizontal: 16, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: '#EF4444', marginTop: 14 },
  warnTxt:       { fontSize: 12, color: '#B91C1C', lineHeight: 18 },

  successBox:    { flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
  successEmoji:  { fontSize: 72, marginBottom: 16 },
  successTitle:  { fontSize: 26, fontWeight: '900', color: COLORS.primary, marginBottom: 8, textAlign: 'center' },
  successSub:    { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  receipt:       { backgroundColor: '#fff', borderRadius: 18, padding: 18, width: '100%', elevation: 3 },
  receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  receiptTitle:  { fontSize: 15, fontWeight: '800', color: '#111827' },
  paidStamp:     { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  paidStampTxt:  { fontSize: 11, fontWeight: '900', color: '#166534' },
  receiptRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  receiptLabel:  { fontSize: 13, color: '#6B7280' },
  receiptVal:    { fontSize: 13, fontWeight: '700', color: '#111827' },
  unlockNote:    { fontSize: 14, color: COLORS.primary, fontWeight: '700', marginTop: 20 },
});
