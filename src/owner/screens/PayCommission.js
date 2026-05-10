// src/owner/screens/PayCommission.js
// PRODUCTION READY:
//   • Before 24h: countdown only (Pay tab hidden in navigator)
//   • After 24h:  UPI logos + I Paid → screenshot upload
//   • No transactionId field
//   • UPI deep linking with Linking API
//   • Screenshot upload to Firebase Storage
//   • onSnapshot → auto-unlock when admin approves

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Image, ActivityIndicator,
  StatusBar, KeyboardAvoidingView, Platform, Dimensions, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  listenOwnerLockState, uploadPaymentScreenshot,
  submitPaymentProof, LOCK_WINDOW_MS, COMMISSION_RATE,
} from '../../../firebase/commission';
import { useUser }   from '../../../context/UserContext';
import { ICONS }     from '../../../assets/index';
import { CONFIG }    from '../../../constants/config';
import { COLORS }    from '../../../constants/colors';
import { rs, rf, H_PAD } from '../../../utils/responsive';

const { width: W } = Dimensions.get('window');

// UPI box sizing — 3 equal columns, no overflow
const UPI_BOX_W  = Math.floor((W - H_PAD * 2 - rs(20)) / 3);
const UPI_LOGO_W = Math.floor(UPI_BOX_W * 0.55);

const UPI_APPS = [
  {
    id:     'gpay',
    label:  'GPay',
    image:  ICONS.gpay,
    // GPay deep link
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

const fmtMs = (ms) => {
  if (!ms || ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
};

export default function PayCommission({ navigation }) {
  const { userProfile, updateProfile } = useUser();
  const uid   = userProfile?.id || '';
  const today = new Date().toISOString().slice(0, 10);

  const [lockState,    setLockState]   = useState(null);
  const [countdown,    setCountdown]   = useState('--:--:--');
  const [showUpload,   setShowUpload]  = useState(false);   // Phase 2
  const [screenshot,   setScreenshot]  = useState(null);
  const [uploading,    setUploading]   = useState(false);
  const [submitted,    setSubmitted]   = useState(false);
  const [selectedUpi,  setSelectedUpi] = useState(null);

  const cdRef   = useRef(null);
  const busyRef = useRef(false);

  // ── Realtime listener ──────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const unsub = listenOwnerLockState(uid, (state) => {
      setLockState(state);

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

      // Admin approved → unlock + navigate home
      if (state.paymentStatus === 'paid' && !state.isLocked) {
        updateProfile({ isLocked: false, paymentStatus: 'paid', otpVerifiedAt: null });
        Alert.alert(
          '🔓 Payment Verified!',
          'Access restored. All features unlocked!',
          [{ text: 'Go to Dashboard', onPress: () =>
            navigation.reset({ index: 0, routes: [{ name: 'OwnerHome' }] })
          }],
        );
      }

      // Admin rejected → reset form
      if (state.paymentStatus === 'rejected') {
        setSubmitted(false); setShowUpload(false);
        setScreenshot(null); busyRef.current = false;
        Alert.alert('❌ Payment Rejected', 'Admin rejected your screenshot. Please resubmit.');
      }
    });
    return () => { unsub(); clearInterval(cdRef.current); };
  }, [uid]);

  // ── Pick screenshot ────────────────────────────────────────────────────
  const pickScreenshot = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission Required', 'Allow photo access to upload screenshot.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8,
    });
    if (!res.canceled && res.assets?.[0]) setScreenshot(res.assets[0]);
  };

  // ── Open UPI app via deep link ─────────────────────────────────────────
  const openUpi = async (app) => {
    setSelectedUpi(app.id);
    const amount = lockState?.commissionAmount || 0;

    // UPI deep link with amount pre-filled
    const upiUrl = `upi://pay?pa=${CONFIG.VAYAL_UPI_ID}&pn=${encodeURIComponent(CONFIG.VAYAL_UPI_NAME)}&am=${amount}&cu=INR&tn=VayalCommission`;

    // App-specific deep link (opens directly in that app)
    const appDeepLink = `${app.scheme}?pa=${CONFIG.VAYAL_UPI_ID}&pn=${encodeURIComponent(CONFIG.VAYAL_UPI_NAME)}&am=${amount}&cu=INR&tn=VayalCommission`;

    try {
      // Try app-specific link first
      const canOpenApp = await Linking.canOpenURL(appDeepLink);
      if (canOpenApp) {
        await Linking.openURL(appDeepLink);
        return;
      }

      // Fallback to generic UPI URL
      const canOpenUpi = await Linking.canOpenURL(upiUrl);
      if (canOpenUpi) {
        await Linking.openURL(upiUrl);
        return;
      }

      // App not installed
      Alert.alert(
        `${app.label} not installed`,
        `Please install ${app.label} or pay manually:\n\nUPI ID: ${CONFIG.VAYAL_UPI_ID}\nAmount: Rs.${amount}`,
        [{ text: 'OK' }],
      );
    } catch (e) {
      Alert.alert(
        'Cannot Open App',
        `Pay manually to:\n\nUPI ID: ${CONFIG.VAYAL_UPI_ID}\nAmount: Rs.${amount}`,
      );
    }
  };

  // ── Submit screenshot ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!screenshot)     { Alert.alert('Required', 'Please upload your payment screenshot'); return; }
    if (busyRef.current) return;
    busyRef.current = true;
    setUploading(true);
    try {
      const url = await uploadPaymentScreenshot(uid, screenshot.uri);
      await submitPaymentProof({
        ownerId: uid, screenshotUrl: url,
        amount: lockState?.commissionAmount || 0, date: today,
      });
      updateProfile({ paymentStatus: 'pending_verification' });
      setSubmitted(true);
      Alert.alert('📤 Submitted!', 'Admin will verify and unlock your account shortly.');
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
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loadTxt}>Checking commission status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ps     = lockState.paymentStatus;
  const amount = lockState.commissionAmount || 0;

  // ── PAID ───────────────────────────────────────────────────────────────
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

  // ── BEFORE 24H — countdown, this screen is accessible but Pay tab hidden ─
  if (lockState.isWithin24h && ps !== 'rejected') {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.within24Card}>
            <Text style={s.bigEmoji}>✅</Text>
            <Text style={s.stateTitle}>Payment Not Required Yet</Text>
            <Text style={s.stateSub}>You can use all app features for now.{'\n'}Pay commission after the timer expires.</Text>
          </View>
          <View style={s.timerCard}>
            <Text style={s.timerLabel}>Time Remaining Before Lock</Text>
            <Text style={s.timerValue}>{countdown}</Text>
            <View style={s.timerTrack}>
              <View style={[s.timerFill, {
                width: `${Math.min(100, Math.round((1 - (lockState.msRemaining || 0) / LOCK_WINDOW_MS) * 100))}%`,
                backgroundColor: (lockState.msRemaining || 0) < 3_600_000 ? '#EF4444' : COLORS.primary,
              }]} />
            </View>
            <Text style={s.timerSub}>
              Rs.{COMMISSION_RATE}/hectare · Commission due: Rs.{amount}
            </Text>
          </View>
          <View style={s.infoBox}>
            <Text style={s.infoTxt}>
              ℹ️ After 24 hours, you'll need to pay Rs.{amount} to continue using the app.
            </Text>
          </View>
          <View style={{ height: rs(40) }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── PENDING VERIFICATION ───────────────────────────────────────────────
  if (ps === 'pending_verification' || submitted) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.bigEmoji}>⏳</Text>
          <Text style={s.stateTitle}>Waiting for Admin</Text>
          <Text style={s.stateSub}>
            Your screenshot is submitted.{'\n'}
            Account stays locked until admin verifies.{'\n\n'}
            This page updates automatically.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── LOCKED — Phase 1: Select UPI + Pay ────────────────────────────────
  // ── LOCKED — Phase 2: Upload screenshot ───────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Lock banner */}
          <View style={s.lockBanner}>
            <Text style={s.lockBannerTxt}>
              🔒 Please pay pending commission to continue using the app
            </Text>
          </View>

          {/* Amount */}
          <View style={s.amountCard}>
            <Text style={s.amountValue}>Rs.{amount}</Text>
            <Text style={s.amountLabel}>Commission Due</Text>
            <View style={s.upiIdPill}>
              <Text style={s.upiIdTxt}>{CONFIG.VAYAL_UPI_ID}</Text>
            </View>
          </View>

          {!showUpload ? (
            <>
              {/* Step 1: Select UPI app */}
              <View style={s.card}>
                <View style={s.stepRow}>
                  <View style={[s.stepDot, { backgroundColor: COLORS.primary }]}>
                    <Text style={s.stepNum}>1</Text>
                  </View>
                  <Text style={s.stepTitle}>Select UPI App & Pay</Text>
                </View>
                <Text style={s.stepDesc}>
                  Tap app to open with Rs.{amount} pre-filled to {CONFIG.VAYAL_UPI_ID}
                </Text>

                {/* UPI logos — responsive, no overflow */}
                <View style={s.upiRow}>
                  {UPI_APPS.map(app => (
                    <TouchableOpacity
                      key={app.id}
                      style={[
                        s.upiBox,
                        {
                          width:           UPI_BOX_W,
                          backgroundColor: app.bg,
                          borderColor:     selectedUpi === app.id ? app.color : app.border,
                          borderWidth:     selectedUpi === app.id ? rs(2.5) : rs(1.5),
                        },
                      ]}
                      onPress={() => openUpi(app)}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={app.image}
                        style={{
                          width:      UPI_LOGO_W,
                          height:     UPI_LOGO_W,
                          resizeMode: 'contain',
                        }}
                      />
                      <Text style={[s.upiLabel, { color: app.color }]}>{app.label}</Text>
                      {selectedUpi === app.id && (
                        <View style={[s.upiTick, { backgroundColor: app.color }]}>
                          <Text style={{ color: '#fff', fontSize: rf(9), fontWeight: '900' }}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedUpi && (
                  <View style={s.selectedNote}>
                    <Text style={s.selectedNoteTxt}>
                      Tap {UPI_APPS.find(a => a.id === selectedUpi)?.label} again to open the app
                    </Text>
                  </View>
                )}
              </View>

              {/* Step 2: I Paid button */}
              <View style={s.card}>
                <View style={s.stepRow}>
                  <View style={[s.stepDot, { backgroundColor: '#22C55E' }]}>
                    <Text style={s.stepNum}>2</Text>
                  </View>
                  <Text style={s.stepTitle}>After Paying, Tap Below</Text>
                </View>
                <TouchableOpacity
                  style={s.iPaidBtn}
                  onPress={() => setShowUpload(true)}
                  activeOpacity={0.88}
                >
                  <Text style={s.iPaidBtnTxt}>✅ I Paid — Upload Screenshot →</Text>
                </TouchableOpacity>
                <Text style={s.iPaidNote}>
                  Account stays locked until admin verifies your screenshot.
                </Text>
              </View>
            </>
          ) : (
            <>
              {/* Back button */}
              <TouchableOpacity
                style={s.backBtn}
                onPress={() => { setShowUpload(false); setScreenshot(null); }}
                activeOpacity={0.8}
              >
                <Text style={s.backBtnTxt}>← Back to Payment</Text>
              </TouchableOpacity>

              {/* Upload header */}
              <View style={s.uploadHeader}>
                <Text style={s.uploadHeaderTitle}>📤 Upload Payment Screenshot</Text>
                <Text style={s.uploadHeaderSub}>
                  Account stays locked until admin verifies.
                </Text>
              </View>

              {/* Screenshot picker */}
              <View style={s.card}>
                <View style={s.stepRow}>
                  <View style={[s.stepDot, { backgroundColor: '#8B5CF6' }]}>
                    <Text style={s.stepNum}>1</Text>
                  </View>
                  <Text style={s.stepTitle}>Upload Payment Screenshot <Text style={{ color: '#EF4444' }}>*</Text></Text>
                </View>
                <Text style={s.stepDesc}>Screenshot showing successful payment from your UPI app</Text>

                {screenshot ? (
                  // Preview
                  <View style={s.previewBox}>
                    <Image
                      source={{ uri: screenshot.uri }}
                      style={{
                        width:       '100%',
                        aspectRatio: 1.5,
                        resizeMode:  'contain',
                        borderRadius: rs(12),
                        marginBottom: rs(10),
                      }}
                    />
                    <TouchableOpacity style={s.changeBtn} onPress={pickScreenshot} activeOpacity={0.8}>
                      <Text style={s.changeBtnTxt}>Change Screenshot</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Drop zone
                  <TouchableOpacity style={s.dropZone} onPress={pickScreenshot} activeOpacity={0.85}>
                    <Text style={s.dropIcon}>📸</Text>
                    <Text style={s.dropTitle}>Tap to select screenshot</Text>
                    <Text style={s.dropSub}>From your gallery</Text>
                    <View style={s.dropBtn}>
                      <Text style={s.dropBtnTxt}>Select Screenshot</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              {/* Submit */}
              <View style={s.card}>
                <View style={s.stepRow}>
                  <View style={[s.stepDot, { backgroundColor: '#22C55E' }]}>
                    <Text style={s.stepNum}>2</Text>
                  </View>
                  <Text style={s.stepTitle}>Submit for Admin Verification</Text>
                </View>
                <TouchableOpacity
                  style={[
                    s.submitBtn,
                    (!screenshot || uploading || submitted) && s.submitBtnOff,
                  ]}
                  onPress={handleSubmit}
                  disabled={!screenshot || uploading || submitted}
                  activeOpacity={0.88}
                >
                  {uploading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.submitBtnTxt}>
                        {submitted ? '✅ Submitted — Waiting for Admin' : 'Submit Screenshot'}
                      </Text>
                  }
                </TouchableOpacity>
              </View>

              <View style={s.warnBox}>
                <Text style={s.warnTxt}>
                  🔒 Only admin can unlock your account after verifying the screenshot.
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

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F4F6F8' },
  scroll:        { flexGrow: 1, paddingBottom: rs(24) },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: H_PAD * 2 },
  loadTxt:       { fontSize: rf(14), color: '#6B7280', marginTop: rs(12) },
  bigEmoji:      { fontSize: rf(56), marginBottom: rs(14) },
  stateTitle:    { fontSize: rf(22), fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: rs(10) },
  stateSub:      { fontSize: rf(14), color: '#6B7280', textAlign: 'center', lineHeight: rf(22), marginBottom: rs(20) },
  greenBtn:      { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(14), paddingHorizontal: rs(32) },
  greenBtnTxt:   { color: '#fff', fontWeight: '800', fontSize: rf(15) },

  lockBanner:    { backgroundColor: '#FEE2E2', paddingVertical: rs(12), paddingHorizontal: H_PAD, borderBottomWidth: 1, borderBottomColor: '#FECACA' },
  lockBannerTxt: { fontSize: rf(13), color: '#B91C1C', fontWeight: '700', textAlign: 'center' },

  amountCard:    { backgroundColor: '#fff', paddingVertical: rs(20), paddingHorizontal: H_PAD, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  amountValue:   { fontSize: rf(52), fontWeight: '900', color: '#111827', marginBottom: rs(2) },
  amountLabel:   { fontSize: rf(13), color: '#6B7280', marginBottom: rs(10) },
  upiIdPill:     { backgroundColor: '#E8F5EE', borderRadius: rs(20), paddingHorizontal: rs(16), paddingVertical: rs(7), borderWidth: rs(1.5), borderColor: '#6EE7B7' },
  upiIdTxt:      { fontSize: rf(12), color: COLORS.primary, fontWeight: '700' },

  within24Card:  { backgroundColor: '#fff', margin: rs(16), borderRadius: rs(18), padding: rs(24), alignItems: 'center', borderWidth: rs(2), borderColor: '#22C55E' },
  timerCard:     { backgroundColor: '#fff', marginHorizontal: rs(16), borderRadius: rs(18), padding: rs(20), alignItems: 'center', elevation: 2, marginBottom: rs(12) },
  timerLabel:    { fontSize: rf(13), color: '#6B7280', marginBottom: rs(8) },
  timerValue:    { fontSize: rf(40), fontWeight: '900', color: '#111827', letterSpacing: rs(3), marginBottom: rs(14) },
  timerTrack:    { width: '100%', height: rs(6), backgroundColor: '#F0F0F0', borderRadius: rs(3), overflow: 'hidden', marginBottom: rs(10) },
  timerFill:     { height: '100%', borderRadius: rs(3) },
  timerSub:      { fontSize: rf(12), color: '#9CA3AF', textAlign: 'center' },
  infoBox:       { backgroundColor: '#E8F5EE', borderRadius: rs(12), marginHorizontal: rs(16), padding: rs(14) },
  infoTxt:       { fontSize: rf(13), color: '#065F46', lineHeight: rf(20), fontWeight: '500' },

  card:          { backgroundColor: '#fff', marginHorizontal: rs(16), marginTop: rs(12), borderRadius: rs(16), padding: rs(16), elevation: 1 },
  stepRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: rs(6) },
  stepDot:       { width: rs(26), height: rs(26), borderRadius: rs(13), alignItems: 'center', justifyContent: 'center', marginRight: rs(10) },
  stepNum:       { color: '#fff', fontSize: rf(13), fontWeight: '900' },
  stepTitle:     { fontSize: rf(15), fontWeight: '800', color: '#111827' },
  stepDesc:      { fontSize: rf(13), color: '#6B7280', marginBottom: rs(14), lineHeight: rf(18) },

  // UPI row — space-between, fixed sizes
  upiRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  upiBox:        { borderRadius: rs(12), paddingVertical: rs(12), alignItems: 'center', justifyContent: 'center', position: 'relative' },
  upiLabel:      { fontSize: rf(11), fontWeight: '800', marginTop: rs(6) },
  upiTick:       { position: 'absolute', top: rs(5), right: rs(5), width: rs(15), height: rs(15), borderRadius: rs(8), alignItems: 'center', justifyContent: 'center' },
  selectedNote:  { backgroundColor: '#F0FDF4', borderRadius: rs(8), padding: rs(10), marginTop: rs(10) },
  selectedNoteTxt: { fontSize: rf(12), color: '#065F46', textAlign: 'center', fontWeight: '600' },

  iPaidBtn:      { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(16), alignItems: 'center', marginBottom: rs(8) },
  iPaidBtnTxt:   { color: '#fff', fontSize: rf(16), fontWeight: '900' },
  iPaidNote:     { fontSize: rf(12), color: '#6B7280', textAlign: 'center', lineHeight: rf(18) },

  backBtn:       { marginHorizontal: rs(16), marginTop: rs(12), paddingVertical: rs(10), paddingHorizontal: rs(4) },
  backBtnTxt:    { fontSize: rf(14), color: COLORS.primary, fontWeight: '700' },

  uploadHeader:  { backgroundColor: '#EFF6FF', marginHorizontal: rs(16), marginTop: rs(8), borderRadius: rs(14), padding: rs(14), borderLeftWidth: rs(4), borderLeftColor: '#3B82F6' },
  uploadHeaderTitle: { fontSize: rf(14), fontWeight: '800', color: '#1D4ED8', marginBottom: rs(4) },
  uploadHeaderSub: { fontSize: rf(12), color: '#3B82F6' },

  dropZone:      { borderWidth: rs(2), borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: rs(14), paddingVertical: rs(28), alignItems: 'center', backgroundColor: '#F9FAFB' },
  dropIcon:      { fontSize: rf(40), marginBottom: rs(8) },
  dropTitle:     { fontSize: rf(14), fontWeight: '700', color: COLORS.primary, marginBottom: rs(4) },
  dropSub:       { fontSize: rf(12), color: '#9CA3AF', marginBottom: rs(16) },
  dropBtn:       { backgroundColor: COLORS.primary, borderRadius: rs(10), paddingVertical: rs(10), paddingHorizontal: rs(24) },
  dropBtnTxt:    { color: '#fff', fontWeight: '700', fontSize: rf(14) },

  previewBox:    { alignItems: 'center' },
  changeBtn:     { backgroundColor: '#F3F4F6', borderRadius: rs(8), paddingHorizontal: rs(16), paddingVertical: rs(7) },
  changeBtnTxt:  { fontSize: rf(13), color: '#374151', fontWeight: '600' },

  submitBtn:     { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(16), alignItems: 'center' },
  submitBtnOff:  { backgroundColor: '#D1D5DB' },
  submitBtnTxt:  { color: '#fff', fontSize: rf(15), fontWeight: '800' },

  warnBox:       { marginHorizontal: rs(16), marginTop: rs(14), backgroundColor: '#FFF3CD', borderRadius: rs(12), padding: rs(14), borderLeftWidth: rs(4), borderLeftColor: '#F59E0B' },
  warnTxt:       { fontSize: rf(12), color: '#92400E', lineHeight: rf(18) },
});
