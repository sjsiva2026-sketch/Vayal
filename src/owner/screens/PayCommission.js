// src/owner/screens/PayCommission.js
// FIXED: checkCommissionLock on mount + useFocusEffect
// FIXED: UPI logos — space-evenly, fixed 90x90 cards, 55x55 images

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Image, ActivityIndicator,
  StatusBar, Platform, Dimensions, Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  listenOwnerLockState,
  checkCommissionLock,
  LOCK_WINDOW_MS,
  COMMISSION_RATE,
} from '../../../firebase/commission';
import { useUser }       from '../../../context/UserContext';
import { ICONS }         from '../../../assets/index';
import { CONFIG }        from '../../../constants/config';
import { COLORS }        from '../../../constants/colors';
import { rs, rf, H_PAD } from '../../../utils/responsive';

const { width: W } = Dimensions.get('window');

const UPI_APPS = [
  { id: 'gpay',    label: 'GPay',    image: ICONS.gpay,    scheme: 'tez://upi/pay',  color: '#4285F4', bg: '#EEF6FF', border: '#BFDBFE' },
  { id: 'phonepe', label: 'PhonePe', image: ICONS.phonepe, scheme: 'phonepe://pay', color: '#5F259F', bg: '#F5F0FF', border: '#DDD6FE' },
  { id: 'paytm',   label: 'Paytm',   image: ICONS.paytm,   scheme: 'paytmmp://pay', color: '#00BAF2', bg: '#E8F9FF', border: '#BAE6FD' },
];

const fmtMs = (ms) => {
  if (!ms || ms <= 0) return '00:00';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function PayCommission({ navigation }) {
  const { userProfile, updateProfile } = useUser();
  const uid = userProfile?.id || '';

  const [lockState,   setLockState]   = useState(null);
  const [countdown,   setCountdown]   = useState('--:--');
  const [selectedUpi, setSelectedUpi] = useState(null);

  const cdRef   = useRef(null);
  const unsubRef = useRef(null);

  // ── Run check on every screen focus ──────────────────────────────────────
  useFocusEffect(
    React.useCallback(() => {
      if (!uid) return;
      console.log('[PayCommission] Screen focused — running lock check');
      checkCommissionLock(uid).then(result => {
        if (result.isLocked) {
          updateProfile({ isLocked: true });
        }
      }).catch(() => {});
    }, [uid]),
  );

  // ── Realtime listener + 30s poll ─────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;

    const handleState = (state) => {
      setLockState(state);

      // Countdown timer
      clearInterval(cdRef.current);
      if (state.msRemaining && state.msRemaining > 0 && state.paymentStatus !== 'paid') {
        let ms = state.msRemaining;
        setCountdown(fmtMs(ms));
        cdRef.current = setInterval(() => {
          ms -= 1000;
          setCountdown(ms <= 0 ? '00:00' : fmtMs(ms));
          if (ms <= 0) {
            clearInterval(cdRef.current);
            // Time expired — run lock check immediately
            checkCommissionLock(uid).then(r => {
              if (r.isLocked) {
                updateProfile({ isLocked: true });
                handleState({ ...state, isLocked: true, isWithin24h: false, msRemaining: 0 });
              }
            }).catch(() => {});
          }
        }, 1000);
      }

      // Admin paid → unlock
      if (state.paymentStatus === 'paid' && !state.isLocked) {
        updateProfile({ isLocked: false, paymentStatus: 'paid', otpVerifiedAt: null });
        Alert.alert('🔓 Access Restored!', 'Payment verified. All features unlocked!', [{
          text: 'Go to Dashboard',
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'OwnerHome' }] }),
        }]);
      }

      // Admin rejected
      if (state.paymentStatus === 'rejected') {
        Alert.alert('❌ Payment Rejected', 'Admin rejected your screenshot. Please resubmit.');
      }
    };

    const unsub = listenOwnerLockState(uid, handleState);
    unsubRef.current = unsub;

    return () => {
      unsub();
      clearInterval(cdRef.current);
    };
  }, [uid]);

  // ── UPI deep link ─────────────────────────────────────────────────────────
  const openUpi = async (app) => {
    setSelectedUpi(app.id);
    const amount = lockState?.commissionAmount || 0;
    const receiverName = encodeURIComponent(CONFIG.VAYAL_UPI_NAME || 'NAMMA VAYAL AGRI SERVICES');
    const upiUrl = `upi://pay?pa=${CONFIG.VAYAL_UPI_ID}&pn=${receiverName}&am=${amount}&cu=INR&tn=NammaVayal+Commission`;
    const appUrl = `${app.scheme}?pa=${CONFIG.VAYAL_UPI_ID}&pn=${receiverName}&am=${amount}&cu=INR&tn=NammaVayal+Commission`;
    try {
      if (await Linking.canOpenURL(appUrl)) { await Linking.openURL(appUrl); return; }
      if (await Linking.canOpenURL(upiUrl)) { await Linking.openURL(upiUrl); return; }
      Alert.alert(`${app.label} not installed`, `Pay manually:\nUPI: ${CONFIG.VAYAL_UPI_ID}\nAmount: ₹${amount}`);
    } catch {
      Alert.alert('Error', `Pay manually:\nUPI: ${CONFIG.VAYAL_UPI_ID}\nAmount: ₹${amount}`);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!lockState) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loadTxt}>Checking commission status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ps     = lockState.paymentStatus;
  const amount = lockState.commissionAmount || 0;

  // ── PAID ───────────────────────────────────────────────────────────────────
  if (ps === 'paid') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.bigEmoji}>🔓</Text>
          <Text style={s.stateTitle}>Access Restored!</Text>
          <Text style={s.stateSub}>Commission verified. All features unlocked.</Text>
          <TouchableOpacity style={s.greenBtn}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'OwnerHome' }] })}
            activeOpacity={0.88}>
            <Text style={s.greenBtnTxt}>Go to Dashboard →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── PENDING VERIFICATION ───────────────────────────────────────────────────
  if (ps === 'pending_verification') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.bigEmoji}>⏳</Text>
          <Text style={s.stateTitle}>Waiting for Admin</Text>
          <Text style={s.stateSub}>
            Screenshot submitted.{'\n'}
            Account stays locked until admin verifies.{'\n\n'}
            This page updates automatically.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── BEFORE 5 MIN — countdown ───────────────────────────────────────────────
  if (lockState.isWithin24h && ps !== 'rejected') {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.within24Card}>
            <Text style={s.bigEmoji}>✅</Text>
            <Text style={s.stateTitle}>Payment Not Required Yet</Text>
            <Text style={s.stateSub}>All screens accessible. Pay after timer expires.</Text>
          </View>
          <View style={s.timerCard}>
            <Text style={s.timerLabel}>Lock in</Text>
            <Text style={s.timerValue}>{countdown}</Text>
            <View style={s.timerTrack}>
              <View style={[s.timerFill, {
                width: `${Math.min(100, Math.round((1 - (lockState.msRemaining || 0) / LOCK_WINDOW_MS) * 100))}%`,
                backgroundColor: (lockState.msRemaining || 0) < 60000 ? '#EF4444' : COLORS.primary,
              }]} />
            </View>
            <Text style={s.timerSub}>₹{COMMISSION_RATE}/hectare · Commission: ₹{amount}</Text>
          </View>
          <View style={{ height: rs(40) }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── LOCKED — UPI Payment ───────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Lock banner */}
        <View style={s.lockBanner}>
          <Text style={s.lockBannerTxt}>
            🔒 Please pay pending commission to continue using the app
          </Text>
        </View>

        {/* Amount */}
        <View style={s.amountCard}>
          <Text style={s.amountValue}>₹{amount}</Text>
          <Text style={s.amountLabel}>Commission Due</Text>
          <View style={s.upiIdPill}>
            <Text style={s.upiIdTxt}>{CONFIG.VAYAL_UPI_ID}</Text>
          </View>
        </View>

        {/* Step 1: UPI apps — FIXED alignment */}
        <View style={s.card}>
          <View style={s.stepRow}>
            <View style={[s.stepDot, { backgroundColor: COLORS.primary }]}>
              <Text style={s.stepNum}>1</Text>
            </View>
            <Text style={s.stepTitle}>Select UPI App & Pay</Text>
          </View>
          <Text style={s.stepDesc}>Tap app → opens with ₹{amount} pre-filled</Text>

          {/* ── UPI ROW — space-evenly, fixed card size ── */}
          <View style={s.upiRow}>
            {UPI_APPS.map(app => (
              <TouchableOpacity
                key={app.id}
                style={[
                  s.upiCard,
                  {
                    backgroundColor: selectedUpi === app.id ? app.bg : '#fff',
                    borderColor:     selectedUpi === app.id ? app.color : '#E5E7EB',
                    borderWidth:     selectedUpi === app.id ? 2 : 1,
                  },
                ]}
                onPress={() => openUpi(app)}
                activeOpacity={0.85}
              >
                <Image
                  source={app.image}
                  style={s.upiImg}
                />
                <Text style={[s.upiLabel, { color: selectedUpi === app.id ? app.color : '#374151' }]}>
                  {app.label}
                </Text>
                {selectedUpi === app.id && (
                  <View style={[s.upiTick, { backgroundColor: app.color }]}>
                    <Text style={s.upiTickTxt}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {selectedUpi && (
            <View style={s.selectedHint}>
              <Text style={s.selectedHintTxt}>
                Tap {UPI_APPS.find(a => a.id === selectedUpi)?.label} again to open
              </Text>
            </View>
          )}
        </View>

        {/* Step 2: I Paid */}
        <View style={s.card}>
          <View style={s.stepRow}>
            <View style={[s.stepDot, { backgroundColor: '#22C55E' }]}>
              <Text style={s.stepNum}>2</Text>
            </View>
            <Text style={s.stepTitle}>After Paying, Tap Below</Text>
          </View>
          <TouchableOpacity
            style={s.iPaidBtn}
            onPress={() => navigation.navigate('PaymentScreenshotUpload', {
              ownerId: uid,
              commissionAmount: amount,
            })}
            activeOpacity={0.88}
          >
            <Text style={s.iPaidBtnTxt}>✅ I Paid — Upload Screenshot →</Text>
          </TouchableOpacity>
          <Text style={s.iPaidNote}>
            Account stays locked until admin verifies your screenshot.
          </Text>
        </View>

        <View style={{ height: rs(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#F4F6F8' },
  scroll:         { flexGrow: 1, paddingBottom: rs(24) },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: H_PAD * 2 },
  loadTxt:        { fontSize: rf(14), color: '#6B7280', marginTop: rs(12) },
  bigEmoji:       { fontSize: rf(56), marginBottom: rs(14) },
  stateTitle:     { fontSize: rf(22), fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: rs(10) },
  stateSub:       { fontSize: rf(14), color: '#6B7280', textAlign: 'center', lineHeight: rf(22), marginBottom: rs(20) },
  greenBtn:       { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(14), paddingHorizontal: rs(32) },
  greenBtnTxt:    { color: '#fff', fontWeight: '800', fontSize: rf(15) },

  within24Card:   { backgroundColor: '#fff', margin: rs(16), borderRadius: rs(18), padding: rs(24), alignItems: 'center', borderWidth: rs(2), borderColor: '#22C55E' },
  timerCard:      { backgroundColor: '#fff', marginHorizontal: rs(16), borderRadius: rs(18), padding: rs(20), alignItems: 'center', elevation: 2 },
  timerLabel:     { fontSize: rf(13), color: '#6B7280', marginBottom: rs(6) },
  timerValue:     { fontSize: rf(52), fontWeight: '900', color: '#111827', letterSpacing: rs(2), marginBottom: rs(14), fontVariant: ['tabular-nums'] },
  timerTrack:     { width: '100%', height: rs(6), backgroundColor: '#F0F0F0', borderRadius: rs(3), overflow: 'hidden', marginBottom: rs(10) },
  timerFill:      { height: '100%', borderRadius: rs(3) },
  timerSub:       { fontSize: rf(12), color: '#9CA3AF', textAlign: 'center' },

  lockBanner:     { backgroundColor: '#FEE2E2', paddingVertical: rs(12), paddingHorizontal: H_PAD, borderBottomWidth: 1, borderBottomColor: '#FECACA' },
  lockBannerTxt:  { fontSize: rf(13), color: '#B91C1C', fontWeight: '700', textAlign: 'center' },

  amountCard:     { backgroundColor: '#fff', paddingVertical: rs(20), paddingHorizontal: H_PAD, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  amountValue:    { fontSize: rf(52), fontWeight: '900', color: '#111827', marginBottom: rs(2) },
  amountLabel:    { fontSize: rf(13), color: '#6B7280', marginBottom: rs(10) },
  upiIdPill:      { backgroundColor: '#E8F5EE', borderRadius: rs(20), paddingHorizontal: rs(16), paddingVertical: rs(7), borderWidth: rs(1.5), borderColor: '#6EE7B7' },
  upiIdTxt:       { fontSize: rf(12), color: COLORS.primary, fontWeight: '700' },

  card:           { backgroundColor: '#fff', marginHorizontal: rs(16), marginTop: rs(12), borderRadius: rs(16), padding: rs(16), elevation: 1 },
  stepRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: rs(6) },
  stepDot:        { width: rs(26), height: rs(26), borderRadius: rs(13), alignItems: 'center', justifyContent: 'center', marginRight: rs(10) },
  stepNum:        { color: '#fff', fontSize: rf(13), fontWeight: '900' },
  stepTitle:      { fontSize: rf(15), fontWeight: '800', color: '#111827' },
  stepDesc:       { fontSize: rf(13), color: '#6B7280', marginBottom: rs(14), lineHeight: rf(18) },

  // ── UPI logos — FIXED: space-evenly, equal card size ──────────────────
  upiRow:         {
    flexDirection:  'row',
    justifyContent: 'space-evenly',
    alignItems:     'center',
    marginTop:      rs(4),
  },
  upiCard:        {
    width:          rs(90),
    height:         rs(90),
    borderRadius:   rs(16),
    justifyContent: 'center',
    alignItems:     'center',
    elevation:      3,
    position:       'relative',
  },
  upiImg:         {
    width:      rs(55),
    height:     rs(55),
    resizeMode: 'contain',
  },
  upiLabel:       { fontSize: rf(11), fontWeight: '700', marginTop: rs(4) },
  upiTick:        { position: 'absolute', top: rs(5), right: rs(5), width: rs(16), height: rs(16), borderRadius: rs(8), alignItems: 'center', justifyContent: 'center' },
  upiTickTxt:     { color: '#fff', fontSize: rf(9), fontWeight: '900' },
  selectedHint:   { backgroundColor: '#F0FDF4', borderRadius: rs(8), padding: rs(10), marginTop: rs(10) },
  selectedHintTxt:{ fontSize: rf(12), color: '#065F46', textAlign: 'center', fontWeight: '600' },

  iPaidBtn:       { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(16), alignItems: 'center', marginBottom: rs(8) },
  iPaidBtnTxt:    { color: '#fff', fontSize: rf(16), fontWeight: '900' },
  iPaidNote:      { fontSize: rf(12), color: '#6B7280', textAlign: 'center', lineHeight: rf(18) },
});
