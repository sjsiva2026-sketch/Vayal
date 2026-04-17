// src/owner/screens/PaymentScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, Alert, Linking, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  upsertDailyPayment, updateUser, getDailyPayment,
  addAppAccountEntry,
} from '../../../firebase/firestore';
import { useUser }     from '../../../context/UserContext';
import { todayString } from '../../../utils/dateFormatter';
import { CONFIG }      from '../../../constants/config';
import Button          from '../../common/components/Button';
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

export default function PaymentScreen({ navigation, route }) {
  const { userProfile, updateProfile } = useUser();
  const uid = userProfile?.id || '';

  const routeSummary                        = route.params?.summary;
  const [summary, setSummary]               = useState(routeSummary || null);
  const [loadingSummary, setLoadingSummary] = useState(!routeSummary);
  const [paid, setPaid]                     = useState(false);
  const [confirming, setConfirming]         = useState(false);
  const [selectedApp, setSelectedApp]       = useState(null);
  const [upiOpened, setUpiOpened]           = useState(false);

  const rate  = CONFIG.COMMISSION_PER_HECTARE;
  const today = todayString();

  useEffect(() => {
    if (routeSummary || !uid) { setLoadingSummary(false); return; }
    getDailyPayment(uid, today)
      .then(data => setSummary(data))
      .catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false));
  }, [uid]);

  if (loadingSummary) return <Loader />;

  const amount  = summary?.totalCommission || 0;
  const hectare = summary?.totalHectare    || 0;

  const handleOpenUPI = async (app) => {
    setSelectedApp(app.id);
    const deepLink = app.buildUrl(VAYAL_UPI, VAYAL_NAME, amount);
    const generic  = `upi://pay?pa=${VAYAL_UPI}&pn=${encodeURIComponent(VAYAL_NAME)}&am=${amount}&cu=INR&tn=VayalCommission`;
    try {
      const canDeep = await Linking.canOpenURL(deepLink);
      if (canDeep) {
        await Linking.openURL(deepLink);
      } else {
        const canGeneric = await Linking.canOpenURL(generic);
        if (canGeneric) {
          await Linking.openURL(generic);
        } else {
          Alert.alert(`${app.label} Not Found`, `Install ${app.label} or pay manually to:\n\n${VAYAL_UPI}`);
          return;
        }
      }
      setUpiOpened(true);
    } catch {
      Alert.alert('Error', `Could not open ${app.label}. Pay manually to: ${VAYAL_UPI}`);
    }
  };

  const handleMarkPaid = async () => {
    if (!upiOpened && !selectedApp) {
      Alert.alert('⚠️ Pay First', `Tap a payment app above to open UPI and pay ₹${amount} first.`);
      return;
    }
    Alert.alert(
      '✅ Confirm Payment',
      `Have you completed the ₹${amount} UPI payment to ${VAYAL_NAME}?\n\nUPI ID: ${VAYAL_UPI}`,
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, I Paid',
          onPress: async () => {
            setConfirming(true);
            try {
              await upsertDailyPayment(uid, today, { status: 'paid' });
              await updateUser(uid, { isLocked: false });
              updateProfile({ isLocked: false });
              await addAppAccountEntry({
                ownerId:       uid,
                ownerName:     userProfile?.name  || '',
                ownerPhone:    userProfile?.phone || '',
                amount, hectare,
                date:          today,
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

  // ─── SUCCESS SCREEN ───────────────────────────────────────────────────────
  if (paid) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.successScroll}>
          <View style={s.successTop}>
            <Text style={s.successEmoji}>🎉</Text>
            <Text style={s.successTitle}>Payment Confirmed!</Text>
            <Text style={s.successSub}>
              ₹{amount} received by VAYAL{'\n'}Account unlocked — ready for new bookings!
            </Text>
          </View>
          <View style={s.receipt}>
            <View style={s.receiptHeader}>
              <Text style={s.receiptTitle}>🧾 Payment Receipt</Text>
              <View style={s.paidStamp}><Text style={s.paidStampTxt}>PAID ✓</Text></View>
            </View>
            {[
              { label: '📅 Date',      value: today },
              { label: '💰 Amount',    value: `₹${amount}`, highlight: true },
              { label: '🌾 Hectares',  value: `${hectare} ha` },
              { label: '💳 Paid via',  value: (selectedApp || 'UPI').toUpperCase() },
              { label: '🏦 UPI ID',    value: VAYAL_UPI },
              { label: '🏷️ Recipient', value: VAYAL_NAME },
            ].map((r, i, arr) => (
              <View key={r.label} style={[s.receiptRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={s.receiptLabel}>{r.label}</Text>
                <Text style={[s.receiptVal, r.highlight && { color: COLORS.primary, fontSize: 16 }]}>
                  {r.value}
                </Text>
              </View>
            ))}
          </View>
          <Button
            title="Go to Dashboard"
            onPress={() => navigation.navigate('OwnerDashboard')}
            style={{ marginTop: 20 }}
          />
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── NO COMMISSION DUE ────────────────────────────────────────────────────
  if (amount === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centerBox}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>✅</Text>
          <Text style={s.successTitle}>No Commission Due</Text>
          <Text style={s.successSub}>Nothing to pay today.{'\n'}Your account is active!</Text>
          <Button
            title="Back to Dashboard"
            onPress={() => navigation.navigate('OwnerDashboard')}
            style={{ marginTop: 20 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ─── MAIN PAYMENT SCREEN ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.amountCard}>
          <Text style={s.amountLabel}>Commission Due Today</Text>
          <Text style={s.amountValue}>₹{amount}</Text>
          <Text style={s.amountSub}>{hectare} ha × ₹{rate}/ha</Text>
          <View style={s.upiIdPill}>
            <Text style={s.upiIdPillTxt}>🏦 {VAYAL_UPI}  ·  {VAYAL_NAME}</Text>
          </View>
        </LinearGradient>

        <View style={s.howBox}>
          <Text style={s.howTitle}>💡 How Payment Works</Text>
          <View style={s.howSteps}>
            {[
              { n: '1', txt: 'Tap a UPI app below — it opens automatically' },
              { n: '2', txt: `Pay ₹${amount} to ${VAYAL_UPI}` },
              { n: '3', txt: 'Return here and tap "I\'ve Paid"' },
              { n: '4', txt: 'Your account unlocks instantly' },
            ].map(step => (
              <View key={step.n} style={s.howStep}>
                <View style={s.howNum}><Text style={s.howNumTxt}>{step.n}</Text></View>
                <Text style={s.howTxt}>{step.txt}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={s.stepLabel}>STEP 1 — Open Your UPI App</Text>
        <Text style={s.stepSub}>All apps send money to the same account: {VAYAL_UPI}</Text>

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
                <View style={[s.selectedTick, { backgroundColor: app.color }]}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {upiOpened && (
          <View style={s.openedBanner}>
            <Text style={s.openedTxt}>
              ✅ UPI app opened! Complete the ₹{amount} payment, then come back here.
            </Text>
          </View>
        )}

        <Text style={[s.stepLabel, { marginTop: 20 }]}>STEP 2 — Confirm After Paying</Text>
        <Text style={s.stepSub}>After completing UPI payment, tap below to unlock your account</Text>

        <TouchableOpacity
          style={[s.confirmBtn, confirming && { opacity: 0.6 }]}
          onPress={handleMarkPaid}
          disabled={confirming}
          activeOpacity={0.88}
        >
          <Text style={s.confirmBtnTxt}>
            {confirming ? '⏳ Saving…' : "✅ I've Paid — Confirm & Unlock"}
          </Text>
        </TouchableOpacity>

        <View style={s.warningBox}>
          <Text style={s.warningTxt}>
            ⚠️ Tapping "I've Paid" without actually paying will cause issues. Admin can see all transactions.
          </Text>
        </View>
        <View style={s.infoBox}>
          <Text style={s.infoTxt}>
            💡 UPI does not auto-confirm payments. Manual confirmation is required.
          </Text>
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.background },
  container:     { padding: 20 },
  amountCard:    { borderRadius: 22, padding: 28, alignItems: 'center', marginBottom: 20, elevation: 4 },
  amountLabel:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  amountValue:   { fontSize: 56, fontWeight: '900', color: '#fff', marginBottom: 4 },
  amountSub:     { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 14 },
  upiIdPill:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  upiIdPillTxt:  { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '700', textAlign: 'center' },
  howBox:        { backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, marginBottom: 22, borderLeftWidth: 4, borderLeftColor: '#22C55E' },
  howTitle:      { fontSize: 14, fontWeight: '800', color: '#166534', marginBottom: 12 },
  howSteps:      { gap: 10 },
  howStep:       { flexDirection: 'row', alignItems: 'flex-start' },
  howNum:        { width: 22, height: 22, borderRadius: 11, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 },
  howNumTxt:     { color: '#fff', fontSize: 11, fontWeight: '900' },
  howTxt:        { fontSize: 13, color: '#166534', flex: 1, lineHeight: 20 },
  stepLabel:     { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 0.5, marginBottom: 4 },
  stepSub:       { fontSize: 12, color: COLORS.textSecondary, marginBottom: 14 },
  upiRow:        { flexDirection: 'row', gap: 10, marginBottom: 12 },
  upiCard:       { flex: 1, borderRadius: 16, paddingVertical: 18, alignItems: 'center', borderWidth: 1.5, elevation: 2, position: 'relative' },
  upiLogo:       { width: 48, height: 48, marginBottom: 8, borderRadius: 10 },
  upiEmoji:      { fontSize: 34, marginBottom: 8 },
  upiLabel:      { fontSize: 12, fontWeight: '800' },
  selectedTick:  { position: 'absolute', top: 7, right: 7, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  openedBanner:  { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#22C55E' },
  openedTxt:     { fontSize: 13, color: '#166634', fontWeight: '600', lineHeight: 20 },
  confirmBtn:    { backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', elevation: 3, marginTop: 8 },
  confirmBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
  warningBox:    { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: '#EF4444', marginTop: 14 },
  warningTxt:    { fontSize: 12, color: '#B91C1C', lineHeight: 18 },
  infoBox:       { backgroundColor: '#FFF9E6', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: '#F59E0B', marginTop: 10 },
  infoTxt:       { fontSize: 12, color: '#92400E', lineHeight: 18 },
  successScroll: { padding: 24, paddingBottom: 40 },
  successTop:    { alignItems: 'center', marginBottom: 8 },
  centerBox:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successEmoji:  { fontSize: 72, marginBottom: 16 },
  successTitle:  { fontSize: 26, fontWeight: '900', color: COLORS.primary, marginBottom: 8, textAlign: 'center' },
  successSub:    { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  receipt:       { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginTop: 12, elevation: 3 },
  receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  receiptTitle:  { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  paidStamp:     { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  paidStampTxt:  { fontSize: 11, fontWeight: '900', color: '#166534' },
  receiptRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  receiptLabel:  { fontSize: 13, color: COLORS.textSecondary },
  receiptVal:    { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
});
