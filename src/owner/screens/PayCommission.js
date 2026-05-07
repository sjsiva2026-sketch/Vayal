// src/owner/screens/PayCommission.js
// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION-READY PAY COMMISSION SCREEN
// UPI logos: local assets (gpay.png / phonepe.png / paytm.png)
// Screenshot upload: Firebase Storage /payments/{ownerId}/screenshot.jpg
// Lock/unlock: ONLY admin can change — owner cannot bypass
//
// STATES:
//  'within24h'            → Full access, Pay tab hidden
//  'locked'               → Phase 1: UPI apps + "I Paid" button
//  'upload'               → Phase 2: Drag screenshot + txn ID
//  'pending_verification' → "Waiting for admin..." (app still locked)
//  'rejected'             → Re-submit form
//  'paid'                 → "Access Restored" → navigate to OwnerHome
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, TextInput, Image, ActivityIndicator,
  StatusBar, KeyboardAvoidingView, Platform, Dimensions, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  listenOwnerLockState,
  uploadPaymentScreenshot,
  submitPaymentProof,
  COMMISSION_RATE,
  LOCK_WINDOW_MS,
} from '../../../firebase/commission';
import { useUser }   from '../../../context/UserContext';
import { ICONS }     from '../../../assets/index';
import { CONFIG }    from '../../../constants/config';

// ── Responsive helpers ────────────────────────────────────────────────────
const { width: W } = Dimensions.get('window');
const rs = (n) => Math.round((W / 375) * n);
const rf = (n) => {
  const s = (W / 375) * n;
  return Math.round(Math.min(Math.max(s, n * 0.80), n * 1.20));
};

const PRIMARY = '#1C7C54';
const H_PAD   = rs(16);

// UPI apps with local assets
const UPI_APPS = [
  {
    id:     'gpay',
    label:  'GPay',
    image:  ICONS.gpay,
    scheme: 'tez://upi/pay',
    color:  '#4285F4',
    bg:     '#EEF6FF',
    border: '#BFDBFE',
  },
  {
    id:     'phonepe',
    label:  'PhonePe',
    image:  ICONS.phonepe,
    scheme: 'phonepe://pay',
    color:  '#5F259F',
    bg:     '#F5F0FF',
    border: '#DDD6FE',
  },
  {
    id:     'paytm',
    label:  'Paytm',
    image:  ICONS.paytm,
    scheme: 'paytmmp://pay',
    color:  '#00BAF2',
    bg:     '#E8F9FF',
    border: '#BAE6FD',
  },
];

// Countdown formatter
const fmtMs = (ms) => {
  if (!ms || ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000)  / 1000);
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
};

export default function PayCommission({ navigation }) {
  const { userProfile, updateProfile } = useUser();
  const uid   = userProfile?.id || '';
  const today = new Date().toISOString().slice(0, 10);

  // ── State ──────────────────────────────────────────────────────────────
  const [lockState,   setLockState]   = useState(null);
  const [countdown,   setCountdown]   = useState('--:--:--');
  const [showUpload,  setShowUpload]  = useState(false); // Phase 2 after "I Paid"
  const [txnId,       setTxnId]       = useState('');
  const [screenshot,  setScreenshot]  = useState(null); // { uri }
  const [uploading,   setUploading]   = useState(false);
  const [selectedUpi, setSelectedUpi] = useState(null);
  const [submitted,   setSubmitted]   = useState(false);

  const cdRef   = useRef(null);
  const busyRef = useRef(false);

  // ── Realtime Firestore listener ────────────────────────────────────────
  // When admin sets paymentStatus='paid' → auto unlock
  useEffect(() => {
    if (!uid) return;
    const unsub = listenOwnerLockState(uid, (state) => {
      setLockState(state);

      // Tick countdown
      clearInterval(cdRef.current);
      if (state.msRemaining && state.msRemaining > 0 && state.paymentStatus !== 'paid') {
        let ms = state.msRemaining;
        setCountdown(fmtMs(ms));
        cdRef.current = setInterval(() => {
          ms -= 1000;
          setCountdown(ms <= 0 ? '00:00:00' : fmtMs(ms));
          if (ms <= 0) clearInterval(cdRef.current);
        }, 1000);
      }

      // Admin approved → unlock + navigate
      if (state.paymentStatus === 'paid' && !state.isLocked) {
        updateProfile({ isLocked: false, paymentStatus: 'paid', otpVerifiedAt: null });
        Alert.alert(
          '🔓 Access Restored!',
          'Admin verified your payment. All features unlocked!',
          [{
            text: 'Go to Dashboard',
            onPress: () => navigation.reset({
              index: 0, routes: [{ name: 'OwnerHome' }],
            }),
          }],
        );
      }

      // Admin rejected → reset form
      if (state.paymentStatus === 'rejected') {
        setSubmitted(false);
        setShowUpload(false);
        setTxnId('');
        setScreenshot(null);
        busyRef.current = false;
        Alert.alert(
          '❌ Payment Rejected',
          'Admin rejected your payment proof. Please resubmit with correct screenshot.',
        );
      }
    });
    return () => { unsub(); clearInterval(cdRef.current); };
  }, [uid]);

  // ── Pick screenshot from gallery ───────────────────────────────────────
  const pickScreenshot = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Allow photo access to upload screenshot.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality:    0.8,
    });
    if (!res.canceled && res.assets?.[0]) setScreenshot(res.assets[0]);
  };

  // ── Open UPI app ───────────────────────────────────────────────────────
  const openUpi = async (app) => {
    setSelectedUpi(app.id);
    const amount   = lockState?.commissionAmount || 0;
    const deepLink = `${app.scheme}?pa=${CONFIG.VAYAL_UPI_ID}&pn=${encodeURIComponent(CONFIG.VAYAL_UPI_NAME)}&am=${amount}&cu=INR&tn=VayalCommission`;
    const generic  = `upi://pay?pa=${CONFIG.VAYAL_UPI_ID}&pn=${encodeURIComponent(CONFIG.VAYAL_UPI_NAME)}&am=${amount}&cu=INR&tn=VayalCommission`;
    try {
      if (await Linking.canOpenURL(deepLink)) await Linking.openURL(deepLink);
      else if (await Linking.canOpenURL(generic)) await Linking.openURL(generic);
      else Alert.alert(`${app.label} not installed`, `Pay manually to:\n${CONFIG.VAYAL_UPI_ID}\nAmount: Rs.${amount}`);
    } catch {
      Alert.alert('Error', `Pay manually to: ${CONFIG.VAYAL_UPI_ID}`);
    }
  };

  // ── Submit payment proof ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!txnId.trim())           { Alert.alert('Required', 'Enter your Transaction ID'); return; }
    if (txnId.trim().length < 6) { Alert.alert('Invalid',  'Transaction ID is too short'); return; }
    if (!screenshot)             { Alert.alert('Required', 'Upload your payment screenshot'); return; }
    if (busyRef.current)         return;
    busyRef.current = true;
    setUploading(true);
    try {
      // Upload to Firebase Storage: /payments/{ownerId}/screenshot.jpg
      const url = await uploadPaymentScreenshot(uid, screenshot.uri);

      // Save to Firestore — paymentStatus = pending_verification
      // isLocked stays TRUE — only admin can unlock
      await submitPaymentProof({
        ownerId:       uid,
        transactionId: txnId,
        screenshotUrl: url,
        amount:        lockState?.commissionAmount || 0,
        date:          today,
      });

      updateProfile({ paymentStatus: 'pending_verification' });
      setSubmitted(true);
      Alert.alert(
        '📤 Submitted!',
        'Admin will verify your payment and unlock your account.',
      );
    } catch (e) {
      Alert.alert('Upload Failed', e.message || 'Check your connection and try again.');
      busyRef.current = false;
    } finally { setUploading(false); }
  };

  // ── Loading ────────────────────────────────────────────────────────────
  if (!lockState) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator color={PRIMARY} size="large" />
          <Text style={s.loadTxt}>Checking commission status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ps     = lockState.paymentStatus;
  const amount = lockState.commissionAmount || 0;

  // ── STATE: PAID ────────────────────────────────────────────────────────
  if (ps === 'paid') {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={s.center}>
          <View style={[s.stateIcon, { backgroundColor: '#DCFCE7' }]}>
            <Text style={s.stateEmoji}>🔓</Text>
          </View>
          <Text style={s.stateTitle}>Access Restored!</Text>
          <Text style={s.stateSub}>Commission verified by admin.{'\n'}All features are unlocked.</Text>
          <TouchableOpacity
            style={s.greenBtn}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'OwnerHome' }] })}
            activeOpacity={0.88}
          >
            <Text style={s.greenBtnTxt}>Go to Dashboard →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── STATE: PENDING VERIFICATION ────────────────────────────────────────
  // App stays LOCKED — only "waiting" message shown
  if (ps === 'pending_verification' || (submitted && !showUpload)) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={s.center}>
          <View style={[s.stateIcon, { backgroundColor: '#EFF6FF' }]}>
            <Text style={s.stateEmoji}>⏳</Text>
          </View>
          <Text style={s.stateTitle}>Waiting for Admin</Text>
          <Text style={s.stateSub}>
            Your payment proof is submitted.{'\n'}
            Account stays locked until admin verifies.{'\n\n'}
            This page updates automatically.
          </Text>
          {userProfile?.transactionId && (
            <View style={s.txnInfoBox}>
              <Text style={s.txnInfoLabel}>Transaction ID</Text>
              <Text style={s.txnInfoVal} selectable>{userProfile.transactionId}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── STATE: WITHIN 24H ─────────────────────────────────────────────────
  // Full access — Pay tab is hidden from navigation
  if (lockState.isWithin24h && ps !== 'rejected') {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={[s.stateCard, { borderColor: '#22C55E' }]}>
            <View style={[s.stateIcon, { backgroundColor: '#DCFCE7', marginBottom: rs(12) }]}>
              <Text style={s.stateEmoji}>✅</Text>
            </View>
            <Text style={s.stateTitle}>Payment Not Required Yet</Text>
            <Text style={s.stateSub}>
              You have {countdown} to pay{'\n'}
              Rs.{amount} commission.
            </Text>
          </View>

          {/* Countdown card */}
          <View style={s.timerCard}>
            <Text style={s.timerLabel}>Time Remaining</Text>
            <Text style={s.timerValue}>{countdown}</Text>
            <View style={s.timerTrack}>
              <View style={[s.timerFill, {
                width: `${Math.min(100, Math.round((1 - (lockState.msRemaining || 0) / LOCK_WINDOW_MS) * 100))}%`,
                backgroundColor: (lockState.msRemaining || 0) < 3_600_000 ? '#EF4444' : PRIMARY,
              }]} />
            </View>
            <Text style={s.timerSub}>Rs.{COMMISSION_RATE}/hectare × completed work</Text>
          </View>
          <View style={{ height: rs(40) }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── STATE: LOCKED — Phase 1 or Phase 2 ────────────────────────────────
  const isRejected = ps === 'rejected';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Amount hero */}
          <View style={s.hero}>
            <View style={[s.heroIcon, { backgroundColor: '#FEE2E2' }]}>
              <Text style={{ fontSize: rf(30) }}>🔒</Text>
            </View>
            <Text style={s.heroAmount}>Rs.{amount}</Text>
            <Text style={s.heroLabel}>Commission Due</Text>

            {/* UPI target */}
            <View style={s.upiTargetPill}>
              <Text style={s.upiTargetTxt}>
                {CONFIG.VAYAL_UPI_ID}
              </Text>
            </View>

            {isRejected && (
              <View style={s.rejectedNote}>
                <Text style={s.rejectedNoteTxt}>
                  ❌ Payment rejected. Resubmit with correct proof.
                </Text>
              </View>
            )}
          </View>

          {/* ── PHASE 1: Pay via UPI ─────────────────────────────────── */}
          {!showUpload && (
            <>
              <View style={s.card}>
                <View style={s.stepRow}>
                  <View style={[s.stepBadge, { backgroundColor: PRIMARY }]}>
                    <Text style={s.stepBadgeTxt}>1</Text>
                  </View>
                  <Text style={s.stepTitle}>Pay via UPI App</Text>
                </View>
                <Text style={s.stepDesc}>
                  Rs.{amount} pre-filled to {CONFIG.VAYAL_UPI_ID}
                </Text>

                {/* UPI logos — local assets, responsive sizing */}
                <View style={s.upiRow}>
                  {UPI_APPS.map(app => (
                    <TouchableOpacity
                      key={app.id}
                      style={[
                        s.upiCard,
                        {
                          backgroundColor: app.bg,
                          borderColor: selectedUpi === app.id ? app.color : app.border,
                          borderWidth:  selectedUpi === app.id ? rs(2.5) : rs(1.5),
                        },
                      ]}
                      onPress={() => openUpi(app)}
                      activeOpacity={0.85}
                    >
                      {/* Responsive image: 25% width + aspectRatio */}
                      <Image
                        source={app.image}
                        style={s.upiLogo}
                        resizeMode="contain"
                      />
                      <Text style={[s.upiLabel, { color: app.color }]}>
                        {app.label}
                      </Text>
                      {selectedUpi === app.id && (
                        <View style={[s.upiTick, { backgroundColor: app.color }]}>
                          <Text style={{ color: '#fff', fontSize: rf(9), fontWeight: '900' }}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* I Paid button */}
              <View style={s.card}>
                <View style={s.stepRow}>
                  <View style={[s.stepBadge, { backgroundColor: '#22C55E' }]}>
                    <Text style={s.stepBadgeTxt}>2</Text>
                  </View>
                  <Text style={s.stepTitle}>After Paying, Tap Below</Text>
                </View>
                <TouchableOpacity
                  style={s.iPaidBtn}
                  onPress={() => setShowUpload(true)}
                  activeOpacity={0.88}
                >
                  <Text style={s.iPaidBtnTxt}>I Paid — Upload Proof →</Text>
                </TouchableOpacity>
                <Text style={s.iPaidNote}>
                  You'll upload screenshot + Transaction ID.{'\n'}
                  Account stays locked until admin verifies.
                </Text>
              </View>
            </>
          )}

          {/* ── PHASE 2: Upload Screenshot ───────────────────────────── */}
          {showUpload && (
            <>
              <View style={s.uploadHeader}>
                <Text style={s.uploadHeaderTitle}>📤 Upload Payment Proof</Text>
                <Text style={s.uploadHeaderSub}>
                  Account stays locked until admin verifies.
                </Text>
              </View>

              {/* Transaction ID */}
              <View style={s.card}>
                <View style={s.stepRow}>
                  <View style={[s.stepBadge, { backgroundColor: '#F59E0B' }]}>
                    <Text style={s.stepBadgeTxt}>1</Text>
                  </View>
                  <Text style={s.stepTitle}>Enter Transaction ID *</Text>
                </View>
                <Text style={s.stepDesc}>
                  Find 12-digit ID in your UPI app → Payment History
                </Text>
                <TextInput
                  style={[s.txnInput, txnId.length > 0 && s.txnInputActive]}
                  placeholder="e.g. 426781234567"
                  placeholderTextColor="#C9D1DA"
                  value={txnId}
                  onChangeText={t => setTxnId(t.toUpperCase().replace(/\s/g, ''))}
                  autoCapitalize="characters"
                  maxLength={30}
                  editable={!uploading && !submitted}
                />
              </View>

              {/* Screenshot upload — drag/tap area */}
              <View style={s.card}>
                <View style={s.stepRow}>
                  <View style={[s.stepBadge, { backgroundColor: '#8B5CF6' }]}>
                    <Text style={s.stepBadgeTxt}>2</Text>
                  </View>
                  <Text style={s.stepTitle}>Upload Payment Screenshot *</Text>
                </View>
                <Text style={s.stepDesc}>
                  Screenshot of successful payment from UPI app
                </Text>

                {screenshot ? (
                  // Preview
                  <View style={s.previewBox}>
                    <Image
                      source={{ uri: screenshot.uri }}
                      style={s.previewImg}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={s.changeBtn}
                      onPress={pickScreenshot}
                      activeOpacity={0.8}
                    >
                      <Text style={s.changeBtnTxt}>Change Screenshot</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Drag / tap area
                  <TouchableOpacity
                    style={s.dropZone}
                    onPress={pickScreenshot}
                    activeOpacity={0.85}
                  >
                    <Text style={s.dropIcon}>📸</Text>
                    <Text style={s.dropTitle}>Drag your payment screenshot</Text>
                    <Text style={s.dropSub}>or tap to select from gallery</Text>
                    <View style={s.dropBtn}>
                      <Text style={s.dropBtnTxt}>Select Screenshot</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              {/* Submit */}
              <View style={s.card}>
                <View style={s.stepRow}>
                  <View style={[s.stepBadge, { backgroundColor: '#22C55E' }]}>
                    <Text style={s.stepBadgeTxt}>3</Text>
                  </View>
                  <Text style={s.stepTitle}>Submit for Admin Verification</Text>
                </View>
                <TouchableOpacity
                  style={[
                    s.submitBtn,
                    (!txnId.trim() || !screenshot || uploading || submitted) && s.submitBtnOff,
                  ]}
                  onPress={handleSubmit}
                  disabled={!txnId.trim() || !screenshot || uploading || submitted}
                  activeOpacity={0.88}
                >
                  {uploading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator color="#fff" size="small" style={{ marginRight: rs(8) }} />
                      <Text style={s.submitBtnTxt}>Uploading...</Text>
                    </View>
                  ) : submitted ? (
                    <Text style={s.submitBtnTxt}>✅ Submitted — Waiting for Admin</Text>
                  ) : (
                    <Text style={s.submitBtnTxt}>Submit Payment Proof</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Warning */}
              <View style={s.warnBox}>
                <Text style={s.warnTxt}>
                  🔒 Only admin can unlock your account after verifying your payment.
                  This page updates automatically when approved.
                </Text>
              </View>
            </>
          )}

          <View style={{ height: rs(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F4F6F8' },
  scroll:          { flexGrow: 1, paddingBottom: rs(24) },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: H_PAD * 2 },
  loadTxt:         { fontSize: rf(14), color: '#6B7280', marginTop: rs(12) },

  // State screens
  stateIcon:       { width: rs(80), height: rs(80), borderRadius: rs(40), alignItems: 'center', justifyContent: 'center' },
  stateEmoji:      { fontSize: rf(36) },
  stateCard:       { backgroundColor: '#fff', margin: rs(16), borderRadius: rs(18), padding: rs(20), alignItems: 'center', borderWidth: rs(2) },
  stateTitle:      { fontSize: rf(22), fontWeight: '900', color: '#111827', textAlign: 'center', marginTop: rs(8), marginBottom: rs(10) },
  stateSub:        { fontSize: rf(14), color: '#6B7280', textAlign: 'center', lineHeight: rf(22), marginBottom: rs(16) },
  greenBtn:        { backgroundColor: PRIMARY, borderRadius: rs(14), paddingVertical: rs(14), paddingHorizontal: rs(32) },
  greenBtnTxt:     { color: '#fff', fontWeight: '800', fontSize: rf(15) },
  txnInfoBox:      { backgroundColor: '#EFF6FF', borderRadius: rs(12), padding: rs(14), width: '100%', alignItems: 'center', marginBottom: rs(10) },
  txnInfoLabel:    { fontSize: rf(12), color: '#6B7280', marginBottom: rs(4) },
  txnInfoVal:      { fontSize: rf(15), fontWeight: '700', color: '#1D4ED8' },

  // Timer
  timerCard:       { backgroundColor: '#fff', marginHorizontal: rs(16), marginTop: rs(4), borderRadius: rs(18), padding: rs(20), alignItems: 'center', elevation: 2 },
  timerLabel:      { fontSize: rf(12), color: '#6B7280', marginBottom: rs(8) },
  timerValue:      { fontSize: rf(42), fontWeight: '900', color: '#111827', letterSpacing: rs(2), marginBottom: rs(12) },
  timerTrack:      { width: '100%', height: rs(6), backgroundColor: '#F0F0F0', borderRadius: rs(3), overflow: 'hidden', marginBottom: rs(8) },
  timerFill:       { height: '100%', borderRadius: rs(3) },
  timerSub:        { fontSize: rf(12), color: '#9CA3AF', textAlign: 'center' },

  // Hero
  hero:            { backgroundColor: '#fff', paddingTop: rs(28), paddingBottom: rs(22), paddingHorizontal: H_PAD, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  heroIcon:        { width: rs(64), height: rs(64), borderRadius: rs(32), alignItems: 'center', justifyContent: 'center', marginBottom: rs(10) },
  heroAmount:      { fontSize: rf(48), fontWeight: '900', color: '#111827', marginBottom: rs(2) },
  heroLabel:       { fontSize: rf(13), color: '#6B7280', marginBottom: rs(10) },
  upiTargetPill:   { backgroundColor: '#E8F5EE', borderRadius: rs(20), paddingHorizontal: rs(16), paddingVertical: rs(7), borderWidth: rs(1.5), borderColor: '#6EE7B7' },
  upiTargetTxt:    { fontSize: rf(13), color: PRIMARY, fontWeight: '800' },
  rejectedNote:    { backgroundColor: '#FEE2E2', borderRadius: rs(10), paddingHorizontal: rs(14), paddingVertical: rs(8), marginTop: rs(10) },
  rejectedNoteTxt: { fontSize: rf(12), color: '#B91C1C', fontWeight: '600', textAlign: 'center' },

  // Cards
  card:            { backgroundColor: '#fff', marginHorizontal: rs(16), marginTop: rs(12), borderRadius: rs(16), padding: rs(18), elevation: 1 },
  stepRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: rs(6) },
  stepBadge:       { width: rs(26), height: rs(26), borderRadius: rs(13), alignItems: 'center', justifyContent: 'center', marginRight: rs(10) },
  stepBadgeTxt:    { color: '#fff', fontSize: rf(13), fontWeight: '900' },
  stepTitle:       { fontSize: rf(15), fontWeight: '800', color: '#111827' },
  stepDesc:        { fontSize: rf(13), color: '#6B7280', marginBottom: rs(12), lineHeight: rf(19) },

  // UPI row — flex row, justify space-around, align center
  upiRow:          {
    flexDirection:  'row',
    justifyContent: 'space-around',
    alignItems:     'center',
  },
  upiCard:         {
    width:          '30%',    // responsive — 3 equal cards
    borderRadius:   rs(14),
    paddingVertical: rs(14),
    alignItems:     'center',
    position:       'relative',
  },
  // UPI logo — 25% of screen width + aspectRatio 1
  upiLogo:         {
    width:       W * 0.25,
    aspectRatio: 1,
    resizeMode:  'contain',
    marginBottom: rs(6),
  },
  upiLabel:        { fontSize: rf(12), fontWeight: '800' },
  upiTick:         {
    position:       'absolute',
    top:            rs(6),
    right:          rs(6),
    width:          rs(16),
    height:         rs(16),
    borderRadius:   rs(8),
    alignItems:     'center',
    justifyContent: 'center',
  },

  // I Paid button
  iPaidBtn:        { backgroundColor: PRIMARY, borderRadius: rs(14), paddingVertical: rs(16), alignItems: 'center', marginBottom: rs(10) },
  iPaidBtnTxt:     { color: '#fff', fontSize: rf(16), fontWeight: '900' },
  iPaidNote:       { fontSize: rf(12), color: '#6B7280', lineHeight: rf(18), textAlign: 'center' },

  // Upload section
  uploadHeader:    { backgroundColor: '#EFF6FF', marginHorizontal: rs(16), marginTop: rs(12), borderRadius: rs(14), padding: rs(16), borderLeftWidth: rs(4), borderLeftColor: '#3B82F6' },
  uploadHeaderTitle: { fontSize: rf(15), fontWeight: '800', color: '#1D4ED8', marginBottom: rs(4) },
  uploadHeaderSub: { fontSize: rf(13), color: '#3B82F6', lineHeight: rf(19) },

  // TxnId input
  txnInput:        { borderWidth: rs(2), borderColor: '#E5E7EB', borderRadius: rs(12), paddingVertical: rs(13), paddingHorizontal: rs(16), fontSize: rf(18), fontWeight: '700', color: '#111827', letterSpacing: 2, backgroundColor: '#F9FAFB' },
  txnInputActive:  { borderColor: PRIMARY, backgroundColor: '#FAFFFE' },

  // Drop zone
  dropZone:        { borderWidth: rs(2), borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: rs(16), paddingVertical: rs(32), alignItems: 'center', backgroundColor: '#F9FAFB' },
  dropIcon:        { fontSize: rf(44), marginBottom: rs(10) },
  dropTitle:       { fontSize: rf(15), fontWeight: '700', color: '#374151', marginBottom: rs(4) },
  dropSub:         { fontSize: rf(13), color: '#9CA3AF', marginBottom: rs(16) },
  dropBtn:         { backgroundColor: PRIMARY, borderRadius: rs(10), paddingVertical: rs(10), paddingHorizontal: rs(24) },
  dropBtnTxt:      { color: '#fff', fontWeight: '700', fontSize: rf(14) },

  // Screenshot preview
  previewBox:      { alignItems: 'center' },
  previewImg:      { width: '100%', aspectRatio: 16 / 9, borderRadius: rs(12), marginBottom: rs(10) },
  changeBtn:       { backgroundColor: '#F3F4F6', borderRadius: rs(8), paddingHorizontal: rs(18), paddingVertical: rs(7) },
  changeBtnTxt:    { fontSize: rf(13), color: '#374151', fontWeight: '600' },

  // Submit
  submitBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY, borderRadius: rs(14), paddingVertical: rs(16), elevation: 2 },
  submitBtnOff:    { backgroundColor: '#D1D5DB', elevation: 0 },
  submitBtnTxt:    { color: '#fff', fontSize: rf(15), fontWeight: '800' },

  // Warning
  warnBox:         { marginHorizontal: rs(16), marginTop: rs(14), backgroundColor: '#FFF3CD', borderRadius: rs(12), padding: rs(14), borderLeftWidth: rs(4), borderLeftColor: '#F59E0B' },
  warnTxt:         { fontSize: rf(12), color: '#92400E', lineHeight: rf(18) },
});
