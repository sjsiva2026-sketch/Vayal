import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, Alert, Linking, Image,
} from 'react-native';
import { upsertDailyPayment, updateUser, getDailyPayment } from '../../../firebase/firestore';
import { useUser }     from '../../../context/UserContext';
import { todayString } from '../../../utils/dateFormatter';
import { CONFIG }      from '../../../constants/config';
import Button          from '../../common/components/Button';
import Loader          from '../../common/components/Loader';
import { COLORS }      from '../../../constants/colors';
import { ICONS }       from '../../../assets/index';

const UPI_OPTIONS = [
  { id: 'gpay',    label: 'GPay',    upi: 'vayal@oksbi', emoji: '🟢', bg: '#F0FDF4' },
  { id: 'phonepe', label: 'PhonePe', upi: 'vayal@ybl',   emoji: '🟣', bg: '#F5F0FF' },
  { id: 'paytm',   label: 'Paytm',   upi: 'vayal@paytm', emoji: '🔵', bg: '#EFF6FF' },
];

export default function PaymentScreen({ navigation, route }) {
  const { userProfile, updateProfile } = useUser();
  const uid                            = userProfile?.id || '';

  // BUG FIX: summary might be undefined when navigating from OwnerDashboard
  // lock banner. Load it from Firestore if not passed via route params.
  const routeSummary                   = route.params?.summary;
  const [summary, setSummary]          = useState(routeSummary || null);
  const [loadingSummary, setLoadingSummary] = useState(!routeSummary);

  const [paid, setPaid]                = useState(false);
  const [loading, setLoading]          = useState(false);
  const [selectedUPI, setSelectedUPI]  = useState(null);
  const rate = CONFIG.COMMISSION_PER_HECTARE;

  useEffect(() => {
    if (routeSummary || !uid) { setLoadingSummary(false); return; }
    // Fetch today's summary from Firestore when not passed via params
    getDailyPayment(uid, todayString())
      .then(data => setSummary(data))
      .catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false));
  }, [uid]);

  if (loadingSummary) return <Loader />;

  const amount = summary?.totalCommission || 0;

  const handleUPIPay = (opt) => {
    setSelectedUPI(opt.id);
    const url = `upi://pay?pa=${opt.upi}&pn=VayalApp&am=${amount}&cu=INR&tn=VayalCommission`;
    Linking.canOpenURL(url)
      .then(ok => {
        if (ok) Linking.openURL(url);
        else Alert.alert(`${opt.label} Not Found`, `Please install ${opt.label}.`);
      })
      .catch(() => Alert.alert('Error', 'Cannot open payment app'));
  };

  const handleMarkPaid = async () => {
    setLoading(true);
    try {
      await upsertDailyPayment(uid, todayString(), { status: 'paid' });
      await updateUser(uid, { isLocked: false });
      updateProfile({ isLocked: false });
      setPaid(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Payment confirmation failed.');
    } finally {
      setLoading(false);
    }
  };

  if (paid) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.successBox}>
          <Text style={{ fontSize: 70, marginBottom: 16 }}>🎉</Text>
          <Text style={s.successTitle}>Payment Confirmed!</Text>
          <Text style={s.successSub}>Account unlocked.{'\n'}Ready to accept new bookings!</Text>
          <View style={s.receipt}>
            <Text style={s.receiptLine}>📅 Date:    {todayString()}</Text>
            <Text style={s.receiptLine}>💰 Amount:  ₹{amount}</Text>
            <Text style={s.receiptLine}>🌾 Hectare: {summary?.totalHectare || 0} ha</Text>
            <Text style={s.receiptLine}>✅ Status:  PAID</Text>
          </View>
          <Button title="Go to Dashboard →" onPress={() => navigation.navigate('OwnerDashboard')} style={{ marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  // No commission due today
  if (amount === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.successBox}>
          <Text style={{ fontSize: 70, marginBottom: 16 }}>✅</Text>
          <Text style={s.successTitle}>No Commission Due</Text>
          <Text style={s.successSub}>You have no pending commission for today.{'\n'}Your account is unlocked!</Text>
          <Button title="Back to Dashboard" onPress={() => navigation.navigate('OwnerDashboard')} style={{ marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.title}>💳 Pay Commission</Text>
        <Text style={s.subtitle}>Pay via UPI to unlock your account</Text>

        <View style={s.amountCard}>
          <Text style={s.amountLabel}>Commission Due Today</Text>
          <Text style={s.amountValue}>₹{amount}</Text>
          <Text style={s.amountSub}>{summary?.totalHectare || 0} ha × ₹{rate}/ha</Text>
        </View>

        <Text style={s.sectionTitle}>Step 1 — Choose Payment App</Text>
        <View style={s.upiGrid}>
          {UPI_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.id}
              style={[s.upiCard, { backgroundColor: opt.bg, marginLeft: i > 0 ? 8 : 0 }, selectedUPI === opt.id && s.upiCardOn]}
              onPress={() => handleUPIPay(opt)}
              activeOpacity={0.85}
            >
              {ICONS[opt.id]
                ? <Image source={ICONS[opt.id]} style={s.upiLogo} resizeMode="contain" />
                : <Text style={s.upiEmoji}>{opt.emoji}</Text>
              }
              <Text style={s.upiLabel}>{opt.label}</Text>
              {selectedUPI === opt.id && (
                <View style={s.selectedDot}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.infoBox}>
          <Text style={s.infoTitle}>Step 2 — Confirm After Payment</Text>
          <Text style={s.infoTxt}>After completing payment in the app, tap the button below to confirm and unlock your account.</Text>
        </View>

        <Button title="✅ I've Paid — Confirm & Unlock" onPress={handleMarkPaid} loading={loading} style={{ marginTop: 4 }} />

        <View style={s.warningBox}>
          <Text style={s.warningTxt}>⚠️ Account locks at midnight if commission is unpaid.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.background },
  container:    { padding: 20, paddingBottom: 40 },
  title:        { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  subtitle:     { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, marginTop: 4 },
  amountCard:   { backgroundColor: COLORS.primary, borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 24, elevation: 4 },
  amountLabel:  { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  amountValue:  { fontSize: 52, fontWeight: '900', color: '#fff', marginVertical: 4 },
  amountSub:    { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },
  upiGrid:      { flexDirection: 'row', marginBottom: 20 },
  upiCard:      { flex: 1, borderRadius: 16, paddingVertical: 18, alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB', elevation: 2, position: 'relative' },
  upiCardOn:    { borderColor: COLORS.primary },
  upiLogo:     { width: 48, height: 48, marginBottom: 8, borderRadius: 8 },
  upiEmoji:     { fontSize: 36, marginBottom: 8 },
  upiLabel:     { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  selectedDot:  { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  infoBox:      { backgroundColor: '#FFF9E6', borderRadius: 14, padding: 16, borderLeftWidth: 4, borderLeftColor: '#F59E0B', marginBottom: 14 },
  infoTitle:    { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  infoTxt:      { fontSize: 13, color: COLORS.textPrimary, lineHeight: 20 },
  warningBox:   { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: COLORS.error, marginTop: 14 },
  warningTxt:   { fontSize: 13, color: '#B91C1C' },
  successBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  successTitle: { fontSize: 26, fontWeight: '900', color: COLORS.primary },
  successSub:   { fontSize: 15, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  receipt:      { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 20, width: '100%', elevation: 2 },
  receiptLine:  { fontSize: 14, color: COLORS.textPrimary, marginBottom: 8, fontWeight: '500' },
});
