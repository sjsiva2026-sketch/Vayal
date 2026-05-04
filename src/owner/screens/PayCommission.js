// src/owner/screens/PayCommission.js
// STRICT COMMISSION PAYMENT SCREEN
//
// UI STATES (mutually exclusive):
//  'within24h'          → "Payment not required yet" + countdown — PayCommission HIDDEN from nav
//  'locked'             → Full payment form (txn ID + screenshot)
//  'pending_verification' → "Waiting for admin" — app stays LOCKED
//  'paid'               → "Access restored"
//  'rejected'           → Re-submit form
//
// After clicking "Paid":
//  → Upload screen appears immediately
//  → App remains LOCKED until admin approves
//  → Only "Waiting for admin" message shown

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Alert,
  TextInput, Image, ActivityIndicator, StatusBar,
  KeyboardAvoidingView, Platform, TouchableOpacity, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  listenOwnerLockState, uploadPaymentScreenshot,
  submitPaymentProof, computeLockState, LOCK_WINDOW_MS, COMMISSION_RATE,
} from '../../../firebase/commission';
import { useUser }       from '../../../context/UserContext';
import { COLORS }        from '../../../constants/colors';
import { CONFIG }        from '../../../constants/config';
import { rs, rf, H_PAD } from '../../../utils/responsive';
import { FIcon }         from '../../../utils/icons';

const VAYAL_UPI  = CONFIG.VAYAL_UPI_ID;
const VAYAL_NAME = CONFIG.VAYAL_UPI_NAME;

const UPI_APPS = [
  { id: 'gpay',    label: 'GPay',    scheme: 'tez://upi/pay',  color: '#4285F4', bg: '#EEF6FF' },
  { id: 'phonepe', label: 'PhonePe', scheme: 'phonepe://pay',  color: '#5F259F', bg: '#F5F0FF' },
  { id: 'paytm',   label: 'Paytm',   scheme: 'paytmmp://pay',  color: '#00BAF2', bg: '#E8F9FF' },
];

const fmtTime = (ms) => {
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

  const [lockState,   setLockState]   = useState(null);
  const [countdown,   setCountdown]   = useState('--:--:--');
  const [showUpload,  setShowUpload]  = useState(false);  // "I Paid" clicked
  const [txnId,       setTxnId]       = useState('');
  const [screenshot,  setScreenshot]  = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [selectedUpi, setSelectedUpi] = useState(null);

  const cdRef  = useRef(null);
  const busyRef = useRef(false);

  // Real-time listener
  useEffect(() => {
    if (!uid) return;
    const unsub = listenOwnerLockState(uid, (state) => {
      setLockState(state);

      // Countdown tick
      clearInterval(cdRef.current);
      if (state.msRemaining && state.msRemaining > 0 && state.paymentStatus !== 'paid') {
        let ms = state.msRemaining;
        setCountdown(fmtTime(ms));
        cdRef.current = setInterval(() => {
          ms -= 1000;
          setCountdown(ms <= 0 ? '00:00:00' : fmtTime(ms));
          if (ms <= 0) clearInterval(cdRef.current);
        }, 1000);
      }

      // Admin paid → unlock + navigate
      if (state.paymentStatus === 'paid' && !state.isLocked) {
        updateProfile({ isLocked: false, paymentStatus: 'paid', otpVerifiedAt: null });
        Alert.alert(
          'Access Restored!',
          'Admin verified your payment. All features are now unlocked.',
          [{ text: 'Go to Dashboard', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'OwnerHome' }] }) }]
        );
      }
      if (state.paymentStatus === 'rejected') {
        setShowUpload(false);
        setTxnId('');
        setScreenshot(null);
        busyRef.current = false;
        Alert.alert('Payment Rejected', 'Admin rejected your payment proof. Please submit again with correct screenshot.');
      }
    });
    return () => { unsub(); clearInterval(cdRef.current); };
  }, [uid]);

  const pickScreenshot = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to attach screenshot.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
    if (!res.canceled && res.assets?.[0]) setScreenshot(res.assets[0]);
  };

  const openUpi = async (app) => {
    setSelectedUpi(app.id);
    const amt  = lockState?.commissionAmount || 0;
    const deep = `${app.scheme}?pa=${VAYAL_UPI}&pn=${encodeURIComponent(VAYAL_NAME)}&am=${amt}&cu=INR&tn=VayalCommission`;
    const gen  = `upi://pay?pa=${VAYAL_UPI}&pn=${encodeURIComponent(VAYAL_NAME)}&am=${amt}&cu=INR&tn=VayalCommission`;
    try {
      if (await Linking.canOpenURL(deep)) await Linking.openURL(deep);
      else if (await Linking.canOpenURL(gen)) await Linking.openURL(gen);
      else Alert.alert(`${app.label} not installed`, `Pay manually to:\n${VAYAL_UPI}\nAmount: Rs.${amt}`);
    } catch { Alert.alert('Error', `Pay manually to ${VAYAL_UPI}`); }
  };

  const handleIPaid = () => {
    // "Paid" clicked → show upload form immediately, app stays locked
    setShowUpload(true);
  };

  const handleSubmit = async () => {
    if (!txnId.trim())           { Alert.alert('Required', 'Enter Transaction ID'); return; }
    if (txnId.trim().length < 6) { Alert.alert('Invalid', 'Transaction ID too short'); return; }
    if (!screenshot)             { Alert.alert('Required', 'Attach payment screenshot'); return; }
    if (busyRef.current)         return;
    busyRef.current = true;
    setUploading(true);
    try {
      const url = await uploadPaymentScreenshot(uid, screenshot.uri);
      await submitPaymentProof({
        ownerId:       uid,
        transactionId: txnId,
        screenshotUrl: url,
        amount:        lockState?.commissionAmount || 0,
        date:          today,
      });
      updateProfile({ paymentStatus: 'pending_verification' });
      // App stays LOCKED — user sees "Waiting for admin" automatically
      Alert.alert('Submitted!', 'Admin will verify and unlock your account. This may take a few hours.');
    } catch (e) {
      Alert.alert('Upload Failed', e.message || 'Check connection and try again.');
      busyRef.current = false;
    } finally { setUploading(false); }
  };

  // Loading
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

  // ── STATE: PAID ─────────────────────────────────────────────────────────
  if (ps === 'paid') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <View style={[s.iconCircle, { backgroundColor: '#DCFCE7' }]}>
            <Text style={s.iconTxt}>✓</Text>
          </View>
          <Text style={s.bigTitle}>Access Restored</Text>
          <Text style={s.bigSub}>Commission verified. All features unlocked.</Text>
          <TouchableOpacity style={s.greenBtn} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'OwnerHome' }] })} activeOpacity={0.88}>
            <Text style={s.greenBtnTxt}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── STATE: BEFORE 24H — completely hidden from tab nav, shown only if navigated directly ──
  if (lockState.isWithin24h && ps !== 'rejected') {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={[s.stateCard, { borderColor: '#22C55E', borderWidth: rs(2) }]}>
            <View style={[s.iconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Text style={s.iconTxt}>✓</Text>
            </View>
            <Text style={s.bigTitle}>Payment not required yet</Text>
            <Text style={s.bigSub}>
              You have {countdown} to pay Rs.{amount} commission.
            </Text>
          </View>
          <View style={s.timerCard}>
            <Text style={s.timerLabel}>Time remaining in payment window</Text>
            <Text style={s.timerVal}>{countdown}</Text>
            <View style={s.timerTrack}>
              <View style={[s.timerFill, {
                width: `${Math.min(100, Math.round((1 - (lockState.msRemaining || 0) / LOCK_WINDOW_MS) * 100))}%`,
                backgroundColor: (lockState.msRemaining || 0) < 3_600_000 ? '#EF4444' : '#1C7C54',
              }]} />
            </View>
            <Text style={s.timerSub}>
              Rs.{COMMISSION_RATE}/hectare · Total: Rs.{amount}{'\n'}
              Pay commission only after this timer reaches 00:00:00
            </Text>
          </View>
          <View style={{ height: rs(40) }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── STATE: PENDING VERIFICATION or upload submitted — LOCKED ────────────
  if (ps === 'pending_verification' || (showUpload && !txnId && !screenshot)) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <View style={[s.iconCircle, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[s.iconTxt, { color: '#1D4ED8', fontSize: rf(28) }]}>?</Text>
          </View>
          <Text style={s.bigTitle}>Waiting for admin</Text>
          <Text style={s.bigSub}>
            Your payment proof was submitted.{'\n'}
            Account stays locked until admin verifies.
          </Text>
          {userProfile?.transactionId && (
            <View style={s.infoBox}>
              <Text style={s.infoLabel}>Transaction ID</Text>
              <Text style={s.infoVal} selectable>{userProfile.transactionId}</Text>
            </View>
          )}
          <Text style={s.waitNote}>This page updates automatically when approved.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── STATE: LOCKED — payment form (or after "I Paid" → upload form) ──────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Amount + lock banner */}
          <View style={s.banner}>
            <View style={[s.iconCircle, { backgroundColor: '#FEE2E2', width: rs(56), height: rs(56), borderRadius: rs(28) }]}>
              <Text style={[s.iconTxt, { fontSize: rf(24) }]}>🔒</Text>
            </View>
            <Text style={s.bannerAmount}>Rs.{amount}</Text>
            <Text style={s.bannerLabel}>Commission due</Text>
            <View style={s.bannerUpi}>
              <Text style={s.bannerUpiTxt}>{VAYAL_UPI} · {VAYAL_NAME}</Text>
            </View>
            {ps === 'rejected' && (
              <View style={s.rejectedNote}>
                <Text style={s.rejectedNoteTxt}>Payment rejected. Resubmit with correct proof.</Text>
              </View>
            )}
          </View>

          {!showUpload ? (
            // ── PHASE 1: Pay via UPI + "I Paid" button ──────────────────
            <>
              <View style={s.stepCard}>
                <View style={s.stepRow}>
                  <View style={[s.stepBadge, { backgroundColor: COLORS.primary }]}><Text style={s.stepBadgeTxt}>1</Text></View>
                  <Text style={s.stepTitle}>Pay via UPI app</Text>
                </View>
                <Text style={s.stepDesc}>Rs.{amount} will be pre-filled to {VAYAL_UPI}</Text>
                <View style={s.upiRow}>
                  {UPI_APPS.map(app => (
                    <TouchableOpacity
                      key={app.id}
                      style={[s.upiBtn, { backgroundColor: app.bg, borderColor: selectedUpi === app.id ? app.color : '#E5E7EB', borderWidth: selectedUpi === app.id ? rs(2.5) : rs(1.5) }]}
                      onPress={() => openUpi(app)}
                      activeOpacity={0.85}
                    >
                      <Text style={[s.upiLabel, { color: app.color }]}>{app.label}</Text>
                      {selectedUpi === app.id && <Text style={{ color: app.color, fontSize: rf(10), fontWeight: '800' }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[s.stepCard, { marginTop: rs(12) }]}>
                <View style={s.stepRow}>
                  <View style={[s.stepBadge, { backgroundColor: '#22C55E' }]}><Text style={s.stepBadgeTxt}>2</Text></View>
                  <Text style={s.stepTitle}>After paying, tap below</Text>
                </View>
                <TouchableOpacity style={s.iPaidBtn} onPress={handleIPaid} activeOpacity={0.88}>
                  <Text style={s.iPaidBtnTxt}>I Paid — Upload Proof</Text>
                </TouchableOpacity>
                <Text style={s.iPaidNote}>
                  You will be asked to upload a screenshot and enter Transaction ID.
                  Account stays locked until admin verifies.
                </Text>
              </View>
            </>
          ) : (
            // ── PHASE 2: Upload proof (immediately after "I Paid" click) ─
            <>
              <View style={s.uploadHeader}>
                <Text style={s.uploadHeaderTitle}>Upload Payment Proof</Text>
                <Text style={s.uploadHeaderSub}>
                  Account stays locked until admin verifies your proof.
                </Text>
              </View>

              <View style={s.stepCard}>
                <View style={s.stepRow}>
                  <View style={[s.stepBadge, { backgroundColor: '#F59E0B' }]}><Text style={s.stepBadgeTxt}>1</Text></View>
                  <Text style={s.stepTitle}>Enter Transaction ID *</Text>
                </View>
                <Text style={s.stepDesc}>12-digit ID from your UPI app payment history</Text>
                <TextInput
                  style={[s.txnInput, txnId.length > 0 && s.txnInputActive]}
                  placeholder="e.g. 426781234567"
                  placeholderTextColor="#C9D1DA"
                  value={txnId}
                  onChangeText={t => setTxnId(t.toUpperCase().replace(/\s/g, ''))}
                  autoCapitalize="characters"
                  maxLength={30}
                  editable={!uploading}
                />
              </View>

              <View style={s.stepCard}>
                <View style={s.stepRow}>
                  <View style={[s.stepBadge, { backgroundColor: '#8B5CF6' }]}><Text style={s.stepBadgeTxt}>2</Text></View>
                  <Text style={s.stepTitle}>Attach screenshot *</Text>
                </View>
                <Text style={s.stepDesc}>Screenshot of successful payment from your UPI app</Text>
                {screenshot ? (
                  <View style={s.previewBox}>
                    <Image source={{ uri: screenshot.uri }} style={s.previewImg} resizeMode="cover" />
                    <TouchableOpacity style={s.changeBtn} onPress={pickScreenshot} activeOpacity={0.8}>
                      <Text style={s.changeBtnTxt}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={s.pickBtn} onPress={pickScreenshot} activeOpacity={0.85}>
                    <FIcon name="camera" size={rs(22)} color={COLORS.primary} fallback="📷" style={{ marginBottom: rs(6) }} />
                    <Text style={s.pickBtnTxt}>Tap to select screenshot</Text>
                    <Text style={s.pickBtnSub}>JPEG or PNG from gallery</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={s.stepCard}>
                <View style={s.stepRow}>
                  <View style={[s.stepBadge, { backgroundColor: '#22C55E' }]}><Text style={s.stepBadgeTxt}>3</Text></View>
                  <Text style={s.stepTitle}>Submit for admin verification</Text>
                </View>
                <TouchableOpacity
                  style={[s.submitBtn, (!txnId.trim() || !screenshot || uploading) && s.submitBtnOff]}
                  onPress={handleSubmit}
                  disabled={!txnId.trim() || !screenshot || uploading}
                  activeOpacity={0.88}
                >
                  {uploading
                    ? <><ActivityIndicator color="#fff" size="small" style={{ marginRight: rs(8) }} /><Text style={s.submitBtnTxt}>Uploading...</Text></>
                    : <Text style={s.submitBtnTxt}>Submit Payment Proof</Text>
                  }
                </TouchableOpacity>
              </View>

              <View style={s.lockNote}>
                <FIcon name="alert-triangle" size={rs(14)} color="#92400E" fallback="!" style={{ marginRight: rs(8) }} />
                <Text style={s.lockNoteTxt}>
                  Your account stays locked until admin verifies. This page updates automatically when approved.
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
  safe:           { flex: 1, backgroundColor: '#F4F6F8' },
  scroll:         { paddingBottom: rs(24) },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: H_PAD * 2 },
  loadTxt:        { fontSize: rf(14), color: COLORS.textSecondary, marginTop: rs(12) },
  iconCircle:     { width: rs(72), height: rs(72), borderRadius: rs(36), alignItems: 'center', justifyContent: 'center', marginBottom: rs(14) },
  iconTxt:        { fontSize: rf(32), fontWeight: '900', color: '#065F46' },
  bigTitle:       { fontSize: rf(22), fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: rs(8) },
  bigSub:         { fontSize: rf(14), color: COLORS.textSecondary, textAlign: 'center', lineHeight: rf(22), marginBottom: rs(16) },
  greenBtn:       { backgroundColor: '#1C7C54', borderRadius: rs(14), paddingVertical: rs(14), paddingHorizontal: rs(32) },
  greenBtnTxt:    { color: '#fff', fontWeight: '800', fontSize: rf(15) },
  stateCard:      { backgroundColor: '#fff', margin: rs(16), borderRadius: rs(18), padding: rs(20), alignItems: 'center' },
  timerCard:      { backgroundColor: '#fff', marginHorizontal: rs(16), borderRadius: rs(18), padding: rs(20), alignItems: 'center' },
  timerLabel:     { fontSize: rf(12), color: COLORS.textSecondary, marginBottom: rs(8) },
  timerVal:       { fontSize: rf(42), fontWeight: '900', color: '#111827', letterSpacing: rs(2), marginBottom: rs(12) },
  timerTrack:     { width: '100%', height: rs(6), backgroundColor: '#F0F0F0', borderRadius: rs(3), overflow: 'hidden', marginBottom: rs(10) },
  timerFill:      { height: '100%', borderRadius: rs(3) },
  timerSub:       { fontSize: rf(12), color: COLORS.textSecondary, textAlign: 'center', lineHeight: rf(18) },
  banner:         { backgroundColor: '#fff', paddingVertical: rs(22), paddingHorizontal: H_PAD, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  bannerAmount:   { fontSize: rf(48), fontWeight: '900', color: '#111827', marginBottom: rs(2), marginTop: rs(8) },
  bannerLabel:    { fontSize: rf(13), color: COLORS.textSecondary, marginBottom: rs(6) },
  bannerUpi:      { backgroundColor: COLORS.primaryLight, borderRadius: rs(10), paddingHorizontal: rs(14), paddingVertical: rs(6) },
  bannerUpiTxt:   { fontSize: rf(12), color: COLORS.primary, fontWeight: '700' },
  rejectedNote:   { backgroundColor: '#FEE2E2', borderRadius: rs(10), paddingHorizontal: rs(14), paddingVertical: rs(8), marginTop: rs(10) },
  rejectedNoteTxt:{ fontSize: rf(12), color: '#B91C1C', fontWeight: '600', textAlign: 'center' },
  stepCard:       { backgroundColor: '#fff', marginHorizontal: rs(16), marginTop: rs(12), borderRadius: rs(16), padding: rs(18), elevation: 1 },
  stepRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: rs(6) },
  stepBadge:      { width: rs(26), height: rs(26), borderRadius: rs(13), alignItems: 'center', justifyContent: 'center', marginRight: rs(10) },
  stepBadgeTxt:   { color: '#fff', fontSize: rf(13), fontWeight: '900' },
  stepTitle:      { fontSize: rf(15), fontWeight: '800', color: '#111827' },
  stepDesc:       { fontSize: rf(13), color: COLORS.textSecondary, marginBottom: rs(12), lineHeight: rf(19) },
  upiRow:         { flexDirection: 'row', gap: rs(10) },
  upiBtn:         { flex: 1, borderRadius: rs(12), paddingVertical: rs(14), alignItems: 'center' },
  upiLabel:       { fontSize: rf(13), fontWeight: '800' },
  iPaidBtn:       { backgroundColor: '#1C7C54', borderRadius: rs(14), paddingVertical: rs(16), alignItems: 'center', marginBottom: rs(10) },
  iPaidBtnTxt:    { color: '#fff', fontSize: rf(16), fontWeight: '900' },
  iPaidNote:      { fontSize: rf(12), color: COLORS.textSecondary, lineHeight: rf(18), textAlign: 'center' },
  uploadHeader:   { backgroundColor: '#EFF6FF', marginHorizontal: rs(16), marginTop: rs(12), borderRadius: rs(14), padding: rs(16), borderLeftWidth: rs(4), borderLeftColor: '#3B82F6' },
  uploadHeaderTitle:{ fontSize: rf(15), fontWeight: '800', color: '#1D4ED8', marginBottom: rs(4) },
  uploadHeaderSub:{ fontSize: rf(13), color: '#3B82F6', lineHeight: rf(19) },
  txnInput:       { borderWidth: rs(2), borderColor: '#E5E7EB', borderRadius: rs(12), paddingVertical: rs(13), paddingHorizontal: rs(16), fontSize: rf(18), fontWeight: '700', color: '#111827', letterSpacing: 2, backgroundColor: '#F9FAFB' },
  txnInputActive: { borderColor: COLORS.primary, backgroundColor: '#FAFFFE' },
  pickBtn:        { borderWidth: rs(2), borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: rs(12), paddingVertical: rs(22), alignItems: 'center', backgroundColor: '#F9FAFB' },
  pickBtnTxt:     { fontSize: rf(14), fontWeight: '700', color: COLORS.primary, marginBottom: rs(2) },
  pickBtnSub:     { fontSize: rf(12), color: COLORS.textSecondary },
  previewBox:     { alignItems: 'center' },
  previewImg:     { width: '100%', height: rs(180), borderRadius: rs(10), marginBottom: rs(8) },
  changeBtn:      { backgroundColor: '#F3F4F6', borderRadius: rs(8), paddingHorizontal: rs(18), paddingVertical: rs(7) },
  changeBtnTxt:   { fontSize: rf(13), color: '#374151', fontWeight: '600' },
  submitBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(16), elevation: 2 },
  submitBtnOff:   { backgroundColor: '#D1D5DB', elevation: 0 },
  submitBtnTxt:   { color: '#fff', fontSize: rf(15), fontWeight: '800' },
  lockNote:       { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF3CD', borderRadius: rs(12), marginHorizontal: rs(16), marginTop: rs(14), padding: rs(14), borderLeftWidth: rs(4), borderLeftColor: '#F59E0B' },
  lockNoteTxt:    { fontSize: rf(12), color: '#92400E', lineHeight: rf(18), flex: 1 },
  infoBox:        { backgroundColor: '#EFF6FF', borderRadius: rs(12), padding: rs(14), marginBottom: rs(10), width: '100%', alignItems: 'center' },
  infoLabel:      { fontSize: rf(12), color: '#6B7280', marginBottom: rs(4) },
  infoVal:        { fontSize: rf(15), fontWeight: '700', color: '#1D4ED8' },
  waitNote:       { fontSize: rf(12), color: COLORS.textSecondary, textAlign: 'center', marginTop: rs(10), fontStyle: 'italic' },
});
