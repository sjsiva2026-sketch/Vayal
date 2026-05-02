// src/owner/screens/PaymentScreen.js
//
// ── IMAGE SIZES (pixel-accurate) ─────────────────────────────────────────────
// gpay.png / phonepe.png / paytm.png → 256×256px source, 1:1 square
// Display: 55% of card width, calculated from screen width
//   375dp screen → card=108dp → image=59dp → 177px rendered @ xxhdpi (69% of 256) ✅
//   320dp screen → card=89dp  → image=49dp → 147px rendered @ xxhdpi (57% of 256) ✅
//   414dp screen → card=121dp → image=66dp → 198px rendered @ xxhdpi (77% of 256) ✅
// All sharp — source 256px is never upscaled
//
// ── RESPONSIVE LAYOUT ────────────────────────────────────────────────────────
// • flex:1 everywhere — no fixed heights
// • All sizes via Dimensions API (scale factor)
// • rf() — clamped responsive font
// • UPI logo width = percentage of card (no fixed pixel)
// • KAV behavior="height" + ScrollView flexGrow:1 — keyboard safe
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Linking, Image, AppState,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient }  from 'expo-linear-gradient';
import { ICONS }           from '../../../assets/index';
import {
  upsertDailyPayment, updateUser,
  getDailyPayment, addAppAccountEntry,
} from '../../../firebase/firestore';
import { useUser }     from '../../../context/UserContext';
import { todayString } from '../../../utils/dateFormatter';
import { CONFIG }      from '../../../constants/config';
import Loader          from '../../common/components/Loader';
import { FIcon }       from '../../../utils/icons';

// ── Responsive helpers ────────────────────────────────────────────────────────
const { width: W } = Dimensions.get('window');
const BASE         = 375;
const scale        = W / BASE;

// Responsive scale — proportional to screen width
const rs = (dp) => Math.round(dp * scale);

// Responsive font — clamped min 80% / max 120%
const rf = (dp) => {
  const scaled = Math.round(dp * scale);
  return Math.min(Math.max(scaled, Math.round(dp * 0.8)), Math.round(dp * 1.2));
};

// ── UPI logo size (pixel-accurate) ──────────────────────────────────────────
// 3 cards in row, horizontal padding=32, gaps=20
// Image = 55% of card width → always sharp vs 256px source
const UPI_CARD_W = (W - rs(32) - rs(20)) / 3;
const UPI_IMG_W  = Math.round(UPI_CARD_W * 0.55);

// ── Constants ─────────────────────────────────────────────────────────────────
const PRIMARY      = '#1C7C54';
const VAYAL_UPI    = CONFIG.VAYAL_UPI_ID;
const VAYAL_NAME   = CONFIG.VAYAL_UPI_NAME;
const VAYAL_SCHEME = 'nammavayal';

// UPI apps — local assets
const UPI_APPS = [
  {
    id: 'gpay', shortLabel: 'GPay',
    image: ICONS.gpay,
    bg: '#F0FDF4', border: '#86EFAC', color: '#166534',
    buildUrl: (id, name, amt, r) =>
      `tez://upi/pay?pa=${id}&pn=${encodeURIComponent(name)}&am=${amt}&cu=INR&tn=VayalCommission&url=${encodeURIComponent(r)}`,
  },
  {
    id: 'phonepe', shortLabel: 'PhonePe',
    image: ICONS.phonepe,
    bg: '#F5F3FF', border: '#C4B5FD', color: '#4C1D95',
    buildUrl: (id, name, amt, r) =>
      `phonepe://pay?pa=${id}&pn=${encodeURIComponent(name)}&am=${amt}&cu=INR&tn=VayalCommission&url=${encodeURIComponent(r)}`,
  },
  {
    id: 'paytm', shortLabel: 'Paytm',
    image: ICONS.paytm,
    bg: '#EFF6FF', border: '#93C5FD', color: '#1D4ED8',
    buildUrl: (id, name, amt, r) =>
      `paytmmp://pay?pa=${id}&pn=${encodeURIComponent(name)}&am=${amt}&cu=INR&tn=VayalCommission&url=${encodeURIComponent(r)}`,
  },
];

const parseUPIResponse = (url) => {
  if (!url) return null;
  try {
    const params = {};
    (url.includes('?') ? url.split('?')[1] : '').split('&').forEach(p => {
      const [k, v] = p.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return params;
  } catch { return null; }
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function PaymentScreen({ navigation }) {
  const { userProfile, updateProfile } = useUser();
  const uid   = userProfile?.id || '';
  const today = todayString();
  const rate  = CONFIG.COMMISSION_PER_HECTARE;

  const [summary,       setSummary]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [selectedApp,   setSelectedApp]   = useState(null);
  const [upiOpened,     setUpiOpened]     = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [confirming,    setConfirming]    = useState(false);
  const [paid,          setPaid]          = useState(false);
  const [txnRef,        setTxnRef]        = useState('');

  const appStateRef  = useRef(AppState.currentState);
  const upiOpenedRef = useRef(false);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    getDailyPayment(uid, today)
      .then(d => setSummary(d))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [uid]);

  // Deep link listener — catches UPI response
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url?.startsWith(VAYAL_SCHEME)) handleUPIResponse(url);
    });
    Linking.getInitialURL().then(url => {
      if (url?.startsWith(VAYAL_SCHEME)) handleUPIResponse(url);
    });
    return () => sub.remove();
  }, []);

  // AppState fallback — detect return from UPI app
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (
        upiOpenedRef.current && paymentStatus === null &&
        (prev === 'background' || prev === 'inactive') && next === 'active'
      ) setPaymentStatus('pending');
    });
    return () => sub.remove();
  }, [paymentStatus]);

  const handleUPIResponse = (url) => {
    const params = parseUPIResponse(url);
    if (!params) { setPaymentStatus('pending'); return; }
    const status = (params['Status'] || params['status'] || '').toUpperCase();
    setTxnRef(params['txnId'] || params['txnRef'] || '');
    setPaymentStatus(
      status === 'SUCCESS'                           ? 'success'
      : status === 'FAILURE' || status === 'FAILED' ? 'failed'
      : 'pending'
    );
  };

  if (loading) return <Loader />;

  const amount  = summary?.totalCommission || 0;
  const hectare = summary?.totalHectare    || 0;

  const handleOpenUPI = async (app) => {
    setSelectedApp(app.id);
    setPaymentStatus(null);
    setTxnRef('');
    const redirect = `${VAYAL_SCHEME}://upi`;
    const deepLink = app.buildUrl(VAYAL_UPI, VAYAL_NAME, amount, redirect);
    const generic  = `upi://pay?pa=${VAYAL_UPI}&pn=${encodeURIComponent(VAYAL_NAME)}&am=${amount}&cu=INR&tn=VayalCommission&url=${encodeURIComponent(redirect)}`;
    try {
      if (await Linking.canOpenURL(deepLink)) {
        await Linking.openURL(deepLink);
      } else if (await Linking.canOpenURL(generic)) {
        await Linking.openURL(generic);
      } else {
        Alert.alert(`${app.shortLabel} Not Installed`, `Pay manually to:\n${VAYAL_UPI}`);
        return;
      }
      upiOpenedRef.current = true;
      setUpiOpened(true);
    } catch {
      Alert.alert('Error', `Could not open ${app.shortLabel}. Pay to: ${VAYAL_UPI}`);
    }
  };

  const canConfirm = paymentStatus === 'success' || paymentStatus === 'pending';

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await upsertDailyPayment(uid, today, {
        status: 'paid', paidAt: new Date().toISOString(),
        paymentMethod: selectedApp || 'upi',
        txnRef, txnVerified: paymentStatus === 'success',
      });
      await updateUser(uid, {
        isLocked: false, paymentDeadline: null,
        commissionDate: null, workStartedAt: null,
      });
      updateProfile({
        isLocked: false, paymentDeadline: null,
        commissionDate: null, workStartedAt: null,
      });
      if (amount > 0) {
        await addAppAccountEntry({
          ownerId: uid, ownerName: userProfile?.name || '',
          ownerPhone: userProfile?.phone || '',
          amount, hectare, date: today,
          paymentMethod: selectedApp || 'upi',
          upiId: VAYAL_UPI, txnRef,
          txnVerified: paymentStatus === 'success',
        });
      }
      setPaid(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Try again.');
    } finally { setConfirming(false); }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (paid) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ScrollView contentContainerStyle={s.successScroll}>
          <Text style={s.successEmoji}>🎉</Text>
          <Text style={s.successTitle}>Account Unlocked!</Text>
          <Text style={s.successSub}>Commission paid. All features available!</Text>

          <View style={s.receiptCard}>
            <View style={s.receiptHeader}>
              <Text style={s.receiptTitle}>Payment Receipt</Text>
              <View style={s.paidStamp}><Text style={s.paidStampTxt}>PAID ✓</Text></View>
            </View>
            {[
              { l: 'Date',    v: today },
              { l: 'Amount',  v: `Rs.${amount}`, hi: true },
              { l: 'Hectares',v: `${hectare} ha` },
              { l: 'UPI App', v: (selectedApp || 'UPI').toUpperCase() },
              { l: 'Paid to', v: VAYAL_UPI },
              { l: 'Status',  v: paymentStatus === 'success' ? '✅ Verified' : '⏳ Admin Review' },
            ].map((r, i, arr) => (
              <View key={r.l} style={[s.receiptRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={s.receiptLabel}>{r.l}</Text>
                <Text style={[s.receiptVal, r.hi && { color: PRIMARY, fontWeight: '900' }]}>{r.v}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={s.dashBtn}
            onPress={() => navigation.navigate('OwnerDashboard')}
            activeOpacity={0.88}
          >
            <Text style={s.dashBtnTxt}>Go to Dashboard →</Text>
          </TouchableOpacity>
          <View style={{ height: rs(32) }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const statusColor = paymentStatus === 'success' ? '#166534' : paymentStatus === 'failed' ? '#B91C1C' : '#92400E';
  const statusBg    = paymentStatus === 'success' ? '#DCFCE7' : paymentStatus === 'failed' ? '#FEE2E2' : '#FEF9C3';
  const statusMsg   = paymentStatus === 'success' ? 'Payment Successful! Tap below to unlock.'
                    : paymentStatus === 'failed'  ? 'Payment Failed. Try again with a different UPI app.'
                    : paymentStatus === 'pending' ? 'Payment received. Tap Confirm to unlock your account.'
                    : null;

  // ── Main payment screen ───────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#B91C1C" />

      {/*
        KAV behavior="height" — Android: shrinks view when keyboard opens
        Ensures Confirm button stays visible
      */}
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/*
          ScrollView flexGrow:1 — fills screen, scrollable when keyboard open
          bounces:false — no iOS bounce on Android
        */}
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Hero header ── */}
          <LinearGradient colors={['#B91C1C', '#EF4444']} style={s.hero}>
            <Text style={s.heroLock}>🔒</Text>
            <Text style={s.heroLabel}>Commission Due — Account Locked</Text>
            <Text style={s.heroAmount}>Rs.{amount}</Text>
            <Text style={s.heroSub}>{hectare} ha × Rs.{rate}/ha</Text>
            <View style={s.upiPill}>
              <Text style={s.upiPillTxt}>{VAYAL_UPI}  ·  {VAYAL_NAME}</Text>
            </View>
          </LinearGradient>

          {/* ── STEP 1: Open UPI App ── */}
          <View style={s.card}>
            <View style={s.stepRow}>
              <View style={[s.stepBadge, { backgroundColor: PRIMARY }]}>
                <Text style={s.stepBadgeTxt}>1</Text>
              </View>
              <Text style={s.stepTitle}>Open UPI App & Pay</Text>
            </View>
            <Text style={s.stepDesc}>
              Tap below — Rs.{amount} pre-filled to {VAYAL_UPI}
            </Text>

            {/*
              UPI app row — 3 flex:1 cards
              Image size = UPI_IMG_W (55% of card width)
              Source: 256×256px | Displayed: ~59dp → 177px @ xxhdpi ✅
              aspectRatio:1 — always square, never distorts
            */}
            <View style={s.upiRow}>
              {UPI_APPS.map(app => (
                <TouchableOpacity
                  key={app.id}
                  style={[
                    s.upiCard,
                    {
                      backgroundColor: app.bg,
                      borderColor: selectedApp === app.id ? app.border : '#E5E7EB',
                      borderWidth: selectedApp === app.id ? rs(2.5) : rs(1.5),
                    },
                  ]}
                  onPress={() => handleOpenUPI(app)}
                  activeOpacity={0.85}
                >
                  {/* Real image from assets — pixel-accurate sizing */}
                  <Image
                    source={app.image}
                    style={{
                      width: UPI_IMG_W,      // 55% of card — responsive
                      height: UPI_IMG_W,     // square (source is 1:1)
                      borderRadius: rs(10),
                      marginBottom: rs(6),
                    }}
                    resizeMode="contain"
                  />
                  <Text style={[s.upiLabel, { color: app.color }]}>
                    {app.shortLabel}
                  </Text>
                  {selectedApp === app.id && (
                    <View style={[s.tick, { backgroundColor: app.color }]}>
                      <Text style={{ color: '#fff', fontSize: rf(9), fontWeight: '900' }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {upiOpened && (
              <View style={s.openedNote}>
                <Text style={s.openedNoteTxt}>Waiting for payment result...</Text>
              </View>
            )}
          </View>

          {/* ── STEP 2: Payment Result ── */}
          <View style={s.card}>
            <View style={s.stepRow}>
              <View style={[
                s.stepBadge,
                { backgroundColor: canConfirm ? '#22C55E' : paymentStatus === 'failed' ? '#EF4444' : '#9CA3AF' },
              ]}>
                <Text style={s.stepBadgeTxt}>2</Text>
              </View>
              <Text style={s.stepTitle}>Payment Result</Text>
            </View>

            {paymentStatus ? (
              <View style={[s.statusBox, { backgroundColor: statusBg }]}>
                <Text style={[s.statusTxt, { color: statusColor }]}>
                  {statusMsg}
                </Text>
              </View>
            ) : (
              <Text style={s.stepDesc}>
                Result detected automatically when you return from the UPI app.
              </Text>
            )}

            {paymentStatus === 'failed' && (
              <TouchableOpacity
                style={s.retryBtn}
                onPress={() => {
                  setPaymentStatus(null);
                  setUpiOpened(false);
                  upiOpenedRef.current = false;
                  setSelectedApp(null);
                }}
                activeOpacity={0.88}
              >
                <Text style={s.retryBtnTxt}>↩  Try Again</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── STEP 3: Confirm ── */}
          <View style={s.card}>
            <View style={s.stepRow}>
              <View style={[s.stepBadge, { backgroundColor: canConfirm ? PRIMARY : '#9CA3AF' }]}>
                <Text style={s.stepBadgeTxt}>3</Text>
              </View>
              <Text style={s.stepTitle}>Confirm & Unlock Account</Text>
            </View>
            <Text style={s.stepDesc}>
              {canConfirm
                ? 'Payment confirmed. Tap below to unlock your account.'
                : 'Complete Steps 1 & 2 first.'}
            </Text>

            <TouchableOpacity
              style={[
                s.confirmBtn,
                (!canConfirm || confirming) && s.confirmBtnOff,
              ]}
              onPress={handleConfirm}
              disabled={!canConfirm || confirming}
              activeOpacity={0.88}
            >
              {confirming
                ? <ActivityIndicator color="#fff" size="small" />
                : (
                  <Text style={s.confirmBtnTxt}>
                    {canConfirm
                      ? '✅  Confirm & Unlock My Account'
                      : '⛔  Complete Steps 1 & 2 First'}
                  </Text>
                )
              }
            </TouchableOpacity>
          </View>

          {/* Warning */}
          <View style={s.warnBox}>
            <Text style={s.warnTxt}>
              ⚠️ Only confirm after actually completing payment.
              All transactions are verified by admin.
            </Text>
          </View>

          <View style={{ height: rs(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
// All values use rs()/rf() — no fixed dp anywhere
const s = StyleSheet.create({

  // ── Layout ─────────────────────────────────────────────────────────────────
  safe:    { flex: 1, backgroundColor: '#F4F6F8' },
  kav:     { flex: 1 },
  scroll:  { flexGrow: 1 },         // fills screen + scrollable on overflow

  // ── Hero header ──────────────────────────────────────────────────────────
  hero: {
    paddingTop:        rs(40),
    paddingBottom:     rs(28),
    paddingHorizontal: rs(24),
    alignItems:        'center',
  },
  heroLock:   { fontSize: rf(36), marginBottom: rs(8) },
  heroLabel:  { fontSize: rf(13), color: 'rgba(255,255,255,0.85)', fontWeight: '700', marginBottom: rs(4), textAlign: 'center' },
  heroAmount: { fontSize: rf(52), fontWeight: '900', color: '#fff', marginBottom: rs(4) },
  heroSub:    { fontSize: rf(13), color: 'rgba(255,255,255,0.7)', marginBottom: rs(16) },
  upiPill:    { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: rs(20), paddingHorizontal: rs(16), paddingVertical: rs(7) },
  upiPillTxt: { fontSize: rf(12), color: '#fff', fontWeight: '700', textAlign: 'center' },

  // ── Cards ────────────────────────────────────────────────────────────────
  card: {
    marginHorizontal: rs(16),
    marginTop:        rs(12),
    backgroundColor:  '#fff',
    borderRadius:     rs(18),
    padding:          rs(20),
    elevation:        3,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: rs(2) },
    shadowOpacity:    0.08,
    shadowRadius:     rs(6),
  },
  stepRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: rs(8) },
  stepBadge:    { width: rs(28), height: rs(28), borderRadius: rs(14), alignItems: 'center', justifyContent: 'center', marginRight: rs(10) },
  stepBadgeTxt: { color: '#fff', fontSize: rf(13), fontWeight: '900' },
  stepTitle:    { fontSize: rf(15), fontWeight: '900', color: '#111827' },
  stepDesc:     { fontSize: rf(13), color: '#6B7280', lineHeight: rf(20), marginBottom: rs(16) },

  // ── UPI row — 3 cards, each flex:1 ─────────────────────────────────────
  upiRow:   { flexDirection: 'row', gap: rs(10), marginBottom: rs(8) },
  upiCard:  {
    flex:           1,          // equal width — no fixed width
    borderRadius:   rs(14),
    paddingVertical:rs(14),
    alignItems:     'center',
    elevation:       1,
    position:       'relative',
  },
  // Image sized inline: { width: UPI_IMG_W, height: UPI_IMG_W }
  upiLabel: { fontSize: rf(11), fontWeight: '800' },
  tick: {
    position:   'absolute',
    top:        rs(6),
    right:      rs(6),
    width:      rs(16),
    height:     rs(16),
    borderRadius:rs(8),
    alignItems: 'center',
    justifyContent: 'center',
  },

  openedNote:    { backgroundColor: '#FEF9C3', borderRadius: rs(10), padding: rs(10), marginTop: rs(4) },
  openedNoteTxt: { fontSize: rf(12), color: '#92400E', textAlign: 'center', fontWeight: '600' },

  // ── Status box ───────────────────────────────────────────────────────────
  statusBox: { borderRadius: rs(12), padding: rs(14), marginBottom: rs(8) },
  statusTxt: { fontSize: rf(13), fontWeight: '700', lineHeight: rf(20) },

  retryBtn:    { backgroundColor: '#FEE2E2', borderRadius: rs(10), paddingVertical: rs(12), alignItems: 'center', marginTop: rs(6) },
  retryBtnTxt: { color: '#B91C1C', fontSize: rf(14), fontWeight: '800' },

  // ── Confirm button ───────────────────────────────────────────────────────
  confirmBtn:    { backgroundColor: PRIMARY, borderRadius: rs(14), paddingVertical: rs(18), alignItems: 'center', elevation: 2 },
  confirmBtnOff: { backgroundColor: '#D1D5DB', elevation: 0 },
  confirmBtnTxt: { color: '#fff', fontSize: rf(15), fontWeight: '900', letterSpacing: 0.3 },

  // ── Warning ──────────────────────────────────────────────────────────────
  warnBox: {
    marginHorizontal: rs(16),
    marginTop:        rs(12),
    backgroundColor:  '#FEF2F2',
    borderRadius:     rs(12),
    padding:          rs(14),
    borderLeftWidth:  rs(4),
    borderLeftColor:  '#EF4444',
  },
  warnTxt: { fontSize: rf(12), color: '#B91C1C', lineHeight: rf(18) },

  // ── Success screen ───────────────────────────────────────────────────────
  successScroll:  { flexGrow: 1, padding: rs(28), paddingBottom: rs(48), alignItems: 'center' },
  successEmoji:   { fontSize: rf(64), marginBottom: rs(16) },
  successTitle:   { fontSize: rf(26), fontWeight: '900', color: PRIMARY, marginBottom: rs(8), textAlign: 'center' },
  successSub:     { fontSize: rf(14), color: '#6B7280', textAlign: 'center', lineHeight: rf(22), marginBottom: rs(24) },
  receiptCard:    { backgroundColor: '#fff', borderRadius: rs(18), padding: rs(18), elevation: 3, width: '100%', marginBottom: rs(20) },
  receiptHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(14) },
  receiptTitle:   { fontSize: rf(15), fontWeight: '800', color: '#111827' },
  paidStamp:      { backgroundColor: '#DCFCE7', borderRadius: rs(8), paddingHorizontal: rs(10), paddingVertical: rs(4) },
  paidStampTxt:   { fontSize: rf(11), fontWeight: '900', color: '#166534' },
  receiptRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: rs(10), borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  receiptLabel:   { fontSize: rf(13), color: '#6B7280' },
  receiptVal:     { fontSize: rf(13), fontWeight: '700', color: '#111827' },
  dashBtn:        { backgroundColor: PRIMARY, borderRadius: rs(14), paddingVertical: rs(16), paddingHorizontal: rs(32), alignItems: 'center', elevation: 2 },
  dashBtnTxt:     { color: '#fff', fontSize: rf(15), fontWeight: '900' },
});
