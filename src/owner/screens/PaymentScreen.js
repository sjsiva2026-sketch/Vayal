import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Linking, Image, AppState,
  ActivityIndicator,
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

const VAYAL_UPI    = CONFIG.VAYAL_UPI_ID;
const VAYAL_NAME   = CONFIG.VAYAL_UPI_NAME;
const VAYAL_SCHEME = 'vayal'; // matches "scheme":"vayal" in app.json

const UPI_APPS = [
  {
    id: 'gpay', shortLabel: 'GPay', emoji: '🟢',
    bg: '#F0FDF4', border: '#86EFAC', color: '#166534',
    buildUrl: (id, name, amt, redirect) =>
      `tez://upi/pay?pa=${id}&pn=${encodeURIComponent(name)}&am=${amt}&cu=INR&tn=VayalCommission&url=${encodeURIComponent(redirect)}`,
  },
  {
    id: 'phonepe', shortLabel: 'PhonePe', emoji: '🟣',
    bg: '#F5F3FF', border: '#C4B5FD', color: '#4C1D95',
    buildUrl: (id, name, amt, redirect) =>
      `phonepe://pay?pa=${id}&pn=${encodeURIComponent(name)}&am=${amt}&cu=INR&tn=VayalCommission&url=${encodeURIComponent(redirect)}`,
  },
  {
    id: 'paytm', shortLabel: 'Paytm', emoji: '🔵',
    bg: '#EFF6FF', border: '#93C5FD', color: '#1D4ED8',
    buildUrl: (id, name, amt, redirect) =>
      `paytmmp://pay?pa=${id}&pn=${encodeURIComponent(name)}&am=${amt}&cu=INR&tn=VayalCommission&url=${encodeURIComponent(redirect)}`,
  },
];

const parseUPIResponse = (url) => {
  if (!url) return null;
  try {
    const paramStr = url.includes('?') ? url.split('?')[1] : '';
    const params   = {};
    paramStr.split('&').forEach(p => {
      const [k, v] = p.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return params;
  } catch { return null; }
};

export default function PaymentScreen({ navigation }) {
  const { userProfile, updateProfile } = useUser();
  const uid   = userProfile?.id || '';
  const today = todayString();
  const rate  = CONFIG.COMMISSION_PER_HECTARE;

  const [summary, setSummary]             = useState(null);
  const [loadingSummary, setLoading]      = useState(true);
  const [selectedApp, setSelectedApp]     = useState(null);
  const [upiOpened, setUpiOpened]         = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [confirming, setConfirming]       = useState(false);
  const [paid, setPaid]                   = useState(false);
  const [txnRef, setTxnRef]               = useState('');

  const appStateRef  = useRef(AppState.currentState);
  const upiOpenedRef = useRef(false);
  const checkingRef  = useRef(false);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    getDailyPayment(uid, today)
      .then(d => setSummary(d))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [uid]);

  // Deep link listener — UPI app redirects to vayal://upi?Status=SUCCESS&txnId=...
  useEffect(() => {
    const linkSub = Linking.addEventListener('url', ({ url }) => {
      if (url && url.startsWith(VAYAL_SCHEME)) handleUPIResponse(url);
    });
    Linking.getInitialURL().then(url => {
      if (url && url.startsWith(VAYAL_SCHEME)) handleUPIResponse(url);
    });
    return () => linkSub.remove();
  }, []);

  // AppState fallback — if no deep link fires, detect return from UPI app
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (
        upiOpenedRef.current && !checkingRef.current &&
        paymentStatus === null &&
        (prev === 'background' || prev === 'inactive') && next === 'active'
      ) {
        setPaymentStatus('pending');
      }
    });
    return () => sub.remove();
  }, [paymentStatus]);

  const handleUPIResponse = (url) => {
    checkingRef.current = true;
    setPaymentStatus('checking');
    const params = parseUPIResponse(url);
    if (!params) { setPaymentStatus('pending'); checkingRef.current = false; return; }
    const status = (params['Status'] || params['status'] || '').toUpperCase();
    const txn    = params['txnId'] || params['txnRef'] || params['upiTransactionId'] || '';
    setTxnRef(txn);
    if      (status === 'SUCCESS')              setPaymentStatus('success');
    else if (status === 'FAILURE' || status === 'FAILED') setPaymentStatus('failed');
    else                                        setPaymentStatus('pending');
    checkingRef.current = false;
  };

  if (loadingSummary) return <Loader />;

  const amount  = summary?.totalCommission || 0;
  const hectare = summary?.totalHectare    || 0;

  const handleOpenUPI = async (app) => {
    setSelectedApp(app.id);
    setPaymentStatus(null);
    setTxnRef('');
    const redirect  = `${VAYAL_SCHEME}://upi`;
    const deepLink  = app.buildUrl(VAYAL_UPI, VAYAL_NAME, amount, redirect);
    const generic   = `upi://pay?pa=${VAYAL_UPI}&pn=${encodeURIComponent(VAYAL_NAME)}&am=${amount}&cu=INR&tn=VayalCommission&url=${encodeURIComponent(redirect)}`;
    try {
      const canDeep = await Linking.canOpenURL(deepLink);
      if (canDeep) { await Linking.openURL(deepLink); }
      else {
        const canGeneric = await Linking.canOpenURL(generic);
        if (canGeneric) { await Linking.openURL(generic); }
        else { Alert.alert(`${app.shortLabel} Not Installed`, `Pay manually to:\n${VAYAL_UPI}`); return; }
      }
      upiOpenedRef.current = true;
      setUpiOpened(true);
    } catch {
      Alert.alert('Error', `Could not open ${app.shortLabel}. Pay to: ${VAYAL_UPI}`);
    }
  };

  const canConfirm = paymentStatus === 'success' || paymentStatus === 'pending';

  // After handleConfirm: updateProfile({isLocked:false}) → AppNavigator
  // re-renders → initialRoute becomes 'OwnerDashboard' → navigate works ✅
  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await upsertDailyPayment(uid, today, {
        status: 'paid', paidAt: new Date().toISOString(),
        paymentMethod: selectedApp || 'upi', txnRef: txnRef || '',
        txnVerified: paymentStatus === 'success',
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
          upiId: VAYAL_UPI, txnRef: txnRef || '',
          txnVerified: paymentStatus === 'success',
        });
      }
      setPaid(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Try again.');
    } finally {
      setConfirming(false);
    }
  };

  if (paid) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.successScroll}>
          <Text style={s.successEmoji}>🎉</Text>
          <Text style={s.successTitle}>Account Unlocked!</Text>
          <Text style={s.successSub}>Commission paid. All features are now available!</Text>
          <View style={s.receiptCard}>
            <View style={s.receiptHeader}>
              <Text style={s.receiptTitle}>Payment Receipt</Text>
              <View style={s.paidStamp}><Text style={s.paidStampTxt}>PAID ✓</Text></View>
            </View>
            {[
              { l: 'Date', v: today },
              { l: 'Amount', v: `Rs.${amount}`, hi: true },
              { l: 'Hectares', v: `${hectare} ha` },
              { l: 'UPI App', v: (selectedApp || 'UPI').toUpperCase() },
              { l: 'Paid to', v: VAYAL_UPI },
              { l: 'Status', v: paymentStatus === 'success' ? '✅ Verified' : '⏳ Admin Review' },
              txnRef ? { l: 'Txn Ref', v: txnRef } : null,
            ].filter(Boolean).map((r, i, arr) => (
              <View key={r.l} style={[s.receiptRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={s.receiptLabel}>{r.l}</Text>
                <Text style={[s.receiptVal, r.hi && { color: COLORS.primary, fontWeight: '900' }]}>{r.v}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={s.dashBtn} onPress={() => navigation.navigate('OwnerDashboard')} activeOpacity={0.88}>
            <Text style={s.dashBtnTxt}>Go to Dashboard →</Text>
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const statusColor = paymentStatus === 'success' ? '#166534' : paymentStatus === 'failed' ? '#B91C1C' : paymentStatus === 'pending' ? '#92400E' : '#374151';
  const statusBg    = paymentStatus === 'success' ? '#DCFCE7' : paymentStatus === 'failed' ? '#FEE2E2' : paymentStatus === 'pending' ? '#FEF9C3' : '#F3F4F6';
  const statusIcon  = paymentStatus === 'success' ? '✅' : paymentStatus === 'failed' ? '❌' : paymentStatus === 'pending' ? '⏳' : paymentStatus === 'checking' ? '🔄' : null;
  const statusMsg   = paymentStatus === 'success' ? 'Payment Successful! Tap below to unlock.' : paymentStatus === 'failed' ? 'Payment Failed. Try again.' : paymentStatus === 'pending' ? 'Could not detect automatically. If paid, tap Confirm.' : paymentStatus === 'checking' ? 'Checking...' : null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#B91C1C', '#EF4444']} style={s.hero}>
          <Text style={s.heroLock}>🔒</Text>
          <Text style={s.heroLabel}>Commission Due — Account Locked</Text>
          <Text style={s.heroAmount}>Rs.{amount}</Text>
          <Text style={s.heroSub}>{hectare} ha × Rs.{rate}/ha</Text>
          <View style={s.upiPill}><Text style={s.upiPillTxt}>{VAYAL_UPI}  ·  {VAYAL_NAME}</Text></View>
        </LinearGradient>

        {/* STEP 1 */}
        <View style={s.card}>
          <View style={s.stepRow}>
            <View style={[s.stepBadge, { backgroundColor: COLORS.primary }]}><Text style={s.stepBadgeTxt}>1</Text></View>
            <Text style={s.stepTitle}>Open UPI App & Pay</Text>
          </View>
          <Text style={s.stepDesc}>Tap below — UPI app opens with Rs.{amount} pre-filled to {VAYAL_UPI}</Text>
          <View style={s.upiRow}>
            {UPI_APPS.map(app => (
              <TouchableOpacity
                key={app.id}
                style={[s.upiCard, { backgroundColor: app.bg, borderColor: selectedApp === app.id ? app.border : '#E5E7EB' }, selectedApp === app.id && { borderWidth: 2.5 }]}
                onPress={() => handleOpenUPI(app)} activeOpacity={0.85}
              >
                {ICONS[app.id]
                  ? <Image source={ICONS[app.id]} style={s.upiLogo} resizeMode="contain" />
                  : <Text style={s.upiEmoji}>{app.emoji}</Text>}
                <Text style={[s.upiLabel, { color: app.color }]}>{app.shortLabel}</Text>
                {selectedApp === app.id && (
                  <View style={[s.tick, { backgroundColor: app.color }]}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          {upiOpened && <View style={s.openedNote}><Text style={s.openedNoteTxt}>Waiting to return from UPI app...</Text></View>}
        </View>

        {/* STEP 2 */}
        <View style={s.card}>
          <View style={s.stepRow}>
            <View style={[s.stepBadge, { backgroundColor: canConfirm ? '#22C55E' : paymentStatus === 'failed' ? '#EF4444' : '#9CA3AF' }]}>
              <Text style={s.stepBadgeTxt}>2</Text>
            </View>
            <Text style={s.stepTitle}>Payment Result</Text>
          </View>
          <Text style={s.stepDesc}>Detected automatically when you return from the UPI app.</Text>
          {paymentStatus === 'checking' && (
            <View style={[s.statusBox, { backgroundColor: '#F3F4F6' }]}>
              <ActivityIndicator color={COLORS.primary} size="small" style={{ marginRight: 10 }} />
              <Text style={[s.statusTxt, { color: '#374151' }]}>Checking...</Text>
            </View>
          )}
          {paymentStatus && paymentStatus !== 'checking' && (
            <View style={[s.statusBox, { backgroundColor: statusBg }]}>
              <Text style={s.statusIcon}>{statusIcon}</Text>
              <Text style={[s.statusTxt, { color: statusColor, flex: 1 }]}>{statusMsg}</Text>
            </View>
          )}
          {!paymentStatus && !upiOpened && (
            <View style={[s.statusBox, { backgroundColor: '#F3F4F6' }]}>
              <Text style={[s.statusTxt, { color: '#9CA3AF' }]}>Open a UPI app above first</Text>
            </View>
          )}
          {!paymentStatus && upiOpened && (
            <View style={[s.statusBox, { backgroundColor: '#FEF9C3' }]}>
              <ActivityIndicator color="#F59E0B" size="small" style={{ marginRight: 10 }} />
              <Text style={[s.statusTxt, { color: '#92400E', flex: 1 }]}>Waiting for result...</Text>
            </View>
          )}
          {txnRef ? (
            <View style={s.txnRefRow}>
              <Text style={s.txnRefLabel}>Txn Ref:</Text>
              <Text style={s.txnRefVal}>{txnRef}</Text>
            </View>
          ) : null}
          {paymentStatus === 'failed' && (
            <TouchableOpacity style={s.retryBtn}
              onPress={() => { setPaymentStatus(null); setUpiOpened(false); upiOpenedRef.current = false; setSelectedApp(null); }}
              activeOpacity={0.88}>
              <Text style={s.retryBtnTxt}>↩ Try Again</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* STEP 3 */}
        <View style={s.card}>
          <View style={s.stepRow}>
            <View style={[s.stepBadge, { backgroundColor: canConfirm ? COLORS.primary : '#9CA3AF' }]}>
              <Text style={s.stepBadgeTxt}>3</Text>
            </View>
            <Text style={s.stepTitle}>Confirm & Unlock Account</Text>
          </View>
          <Text style={s.stepDesc}>{canConfirm ? 'Payment detected. Tap below to unlock.' : 'Complete Steps 1 & 2 first.'}</Text>
          <TouchableOpacity
            style={[s.confirmBtn, (!canConfirm || confirming) && s.confirmBtnOff]}
            onPress={handleConfirm} disabled={!canConfirm || confirming} activeOpacity={0.88}
          >
            {confirming
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.confirmBtnTxt}>{canConfirm ? '✅ Confirm & Unlock My Account' : '⛔ Complete Steps 1 & 2 First'}</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={s.warnBox}>
          <Text style={s.warnTxt}>⚠️ Only confirm after actually paying. Admin verifies all transactions.</Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#F4F6F8' },
  container:      { paddingBottom: 32 },
  hero:           { paddingTop: 48, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  heroLock:       { fontSize: 40, marginBottom: 8 },
  heroLabel:      { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  heroAmount:     { fontSize: 56, fontWeight: '900', color: '#fff', marginBottom: 4 },
  heroSub:        { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
  upiPill:        { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  upiPillTxt:     { fontSize: 12, color: '#fff', fontWeight: '700', textAlign: 'center' },
  card:           { margin: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 18, padding: 20, elevation: 3 },
  stepRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepBadge:      { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepBadgeTxt:   { color: '#fff', fontSize: 13, fontWeight: '900' },
  stepTitle:      { fontSize: 15, fontWeight: '900', color: '#111827' },
  stepDesc:       { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 16 },
  upiRow:         { flexDirection: 'row', gap: 10, marginBottom: 8 },
  upiCard:        { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, elevation: 1, position: 'relative' },
  upiLogo:        { width: 40, height: 40, marginBottom: 6, borderRadius: 8 },
  upiEmoji:       { fontSize: 30, marginBottom: 6 },
  upiLabel:       { fontSize: 11, fontWeight: '800' },
  tick:           { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  openedNote:     { backgroundColor: '#FEF9C3', borderRadius: 10, padding: 10, marginTop: 4 },
  openedNoteTxt:  { fontSize: 12, color: '#92400E', textAlign: 'center', fontWeight: '600' },
  statusBox:      { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 10 },
  statusIcon:     { fontSize: 20, marginRight: 10 },
  statusTxt:      { fontSize: 13, fontWeight: '600', lineHeight: 20 },
  txnRefRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10, marginBottom: 8 },
  txnRefLabel:    { fontSize: 12, color: '#6B7280', marginRight: 8 },
  txnRefVal:      { fontSize: 12, fontWeight: '700', color: '#111827', flex: 1 },
  retryBtn:       { backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  retryBtnTxt:    { color: '#B91C1C', fontSize: 14, fontWeight: '800' },
  confirmBtn:     { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 18, alignItems: 'center', elevation: 2 },
  confirmBtnOff:  { backgroundColor: '#D1D5DB', elevation: 0 },
  confirmBtnTxt:  { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
  warnBox:        { marginHorizontal: 16, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: '#EF4444', marginTop: 8 },
  warnTxt:        { fontSize: 12, color: '#B91C1C', lineHeight: 18 },
  successScroll:  { padding: 28, paddingBottom: 48, alignItems: 'center' },
  successEmoji:   { fontSize: 72, marginBottom: 16 },
  successTitle:   { fontSize: 26, fontWeight: '900', color: COLORS.primary, marginBottom: 8, textAlign: 'center' },
  successSub:     { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  receiptCard:    { backgroundColor: '#fff', borderRadius: 18, padding: 18, elevation: 3, width: '100%', marginBottom: 20 },
  receiptHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  receiptTitle:   { fontSize: 15, fontWeight: '800', color: '#111827' },
  paidStamp:      { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  paidStampTxt:   { fontSize: 11, fontWeight: '900', color: '#166534' },
  receiptRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  receiptLabel:   { fontSize: 13, color: '#6B7280' },
  receiptVal:     { fontSize: 13, fontWeight: '700', color: '#111827' },
  dashBtn:        { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', elevation: 2 },
  dashBtnTxt:     { color: '#fff', fontSize: 15, fontWeight: '900' },
});
