// src/owner/screens/PayCommission.js
// QR CODE ONLY — no UPI links, no bank transfer, no app buttons
// Owner scans QR manually → I Paid → screenshot upload → admin verify

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Image, ActivityIndicator,
  StatusBar, Dimensions,
} from 'react-native';
import { useFocusEffect }    from '@react-navigation/native';
import * as MediaLibrary     from 'expo-media-library';
import * as FileSystem       from 'expo-file-system';
import {
  listenOwnerLockState,
  checkCommissionLock,
  LOCK_WINDOW_MS,
  COMMISSION_RATE,
} from '../../../firebase/commission';
import { useUser }       from '../../../context/UserContext';
import { ICONS }         from '../../../assets/index';
import { COLORS }        from '../../../constants/colors';
import { rs, rf, H_PAD } from '../../../utils/responsive';

const { width: W } = Dimensions.get('window');

const fmtMs = (ms) => {
  if (!ms || ms <= 0) return '00:00';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

export default function PayCommission({ navigation }) {
  const { userProfile, updateProfile } = useUser();
  const uid = userProfile?.id || '';

  const [lockState,   setLockState]   = useState(null);
  const [countdown,   setCountdown]   = useState('--:--');
  const [downloading, setDownloading] = useState(false);
  const cdRef = useRef(null);

  // ── Lock check on focus ──────────────────────────────────────────────────
  useFocusEffect(
    React.useCallback(() => {
      if (!uid) return;
      checkCommissionLock(uid)
        .then(r => { if (r.isLocked) updateProfile({ isLocked: true }); })
        .catch(() => {});
    }, [uid]),
  );

  // ── Realtime listener ────────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const handle = (state) => {
      setLockState(state);
      clearInterval(cdRef.current);
      if ((state.msRemaining || 0) > 0 && state.paymentStatus !== 'paid') {
        let ms = state.msRemaining;
        setCountdown(fmtMs(ms));
        cdRef.current = setInterval(() => {
          ms -= 1000;
          setCountdown(ms <= 0 ? '00:00' : fmtMs(ms));
          if (ms <= 0) {
            clearInterval(cdRef.current);
            checkCommissionLock(uid).then(r => {
              if (r.isLocked) {
                updateProfile({ isLocked: true });
                handle({ ...state, isLocked: true, isWithin24h: false, msRemaining: 0 });
              }
            }).catch(() => {});
          }
        }, 1000);
      }
      if (state.paymentStatus === 'paid' && !state.isLocked) {
        updateProfile({ isLocked: false, paymentStatus: 'paid', otpVerifiedAt: null });
        Alert.alert('🔓 Access Restored!', 'Payment verified. All features unlocked!', [{
          text: 'Go to Dashboard',
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'OwnerHome' }] }),
        }]);
      }
      if (state.paymentStatus === 'rejected') {
        Alert.alert('❌ Rejected', 'Admin rejected your proof. Please resubmit.');
      }
    };
    const unsub = listenOwnerLockState(uid, handle);
    return () => { unsub(); clearInterval(cdRef.current); };
  }, [uid]);

  // ── Download QR to gallery ───────────────────────────────────────────────
  const downloadQr = async () => {
    setDownloading(true);
    try {
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required',
          'Allow storage access:\nSettings → Apps → Namma Vayal → Permissions → Storage → Allow');
        setDownloading(false);
        return;
      }

      // Copy bundled asset to cache using expo-file-system
      const asset      = require('../../../assets/icons/upi_qr.png');
      const assetUri   = Image.resolveAssetSource(asset).uri;
      const destPath   = FileSystem.cacheDirectory + 'nammavayal_qr_' + Date.now() + '.png';

      // Download/copy to cache
      await FileSystem.downloadAsync(assetUri, destPath);

      // Save to gallery
      const saved = await MediaLibrary.createAssetAsync(destPath);

      // Optional: create album
      try {
        const album = await MediaLibrary.getAlbumAsync('Namma Vayal');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([saved], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('Namma Vayal', saved, false);
        }
      } catch { /* album optional */ }

      Alert.alert('✅ QR Saved!', 'QR Code saved to gallery → Namma Vayal album.');
    } catch (e) {
      Alert.alert(
        'Save Failed',
        'Could not save QR code.\n\nManual option:\n1. Long press the QR image\n2. Save to gallery',
      );
    } finally { setDownloading(false); }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
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

  // ── PAID ─────────────────────────────────────────────────────────────────
  if (ps === 'paid') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.bigEmoji}>🔓</Text>
          <Text style={s.stateTitle}>Access Restored!</Text>
          <Text style={s.stateSub}>Payment verified. All features unlocked.</Text>
          <TouchableOpacity style={s.greenBtn}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'OwnerHome' }] })}
            activeOpacity={0.88}>
            <Text style={s.greenBtnTxt}>Go to Dashboard →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── PENDING VERIFICATION ─────────────────────────────────────────────────
  if (ps === 'pending_verification') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.bigEmoji}>⏳</Text>
          <Text style={s.stateTitle}>Waiting for Admin</Text>
          <Text style={s.stateSub}>
            Payment proof submitted.{'\n'}
            Account unlocks automatically when admin verifies.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── BEFORE EXPIRY — countdown ────────────────────────────────────────────
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
            <Text style={s.timerLabel}>Locks in</Text>
            <Text style={s.timerValue}>{countdown}</Text>
            <View style={s.timerTrack}>
              <View style={[s.timerFill, {
                width: `${Math.min(100, Math.round((1-(lockState.msRemaining||0)/LOCK_WINDOW_MS)*100))}%`,
                backgroundColor: (lockState.msRemaining||0) < 60000 ? '#EF4444' : COLORS.primary,
              }]} />
            </View>
            <Text style={s.timerSub}>₹{COMMISSION_RATE}/hectare · Commission: ₹{amount}</Text>
          </View>
          <View style={{ height: rs(40) }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── LOCKED — QR Payment screen ───────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
        {/* Lock banner */}
        <View style={s.lockBanner}>
          <Text style={s.lockBannerTxt}>🔒 Pay commission to continue using the app</Text>
        </View>

        {/* Amount */}
        <View style={s.amountSection}>
          <Text style={s.amountLbl}>Commission Due</Text>
          <Text style={s.amountVal}>₹{amount}</Text>
          <Text style={s.amountSub}>₹{COMMISSION_RATE} per hectare · NammaVayal</Text>
        </View>

        {/* QR Card */}
        <View style={s.qrCard}>
          {/* Header */}
          <Text style={s.qrCardTitle}>📷 Scan QR Code to Pay</Text>
          <Text style={s.qrCardDesc}>
            Scan this QR code using any UPI app to pay commission
          </Text>

          {/* QR Image — long press to save */}
          <View style={s.qrWrap}>
            <TouchableOpacity
              onLongPress={downloadQr}
              activeOpacity={1}
              delayLongPress={600}
            >
              <Image
                source={ICONS.upiQr}
                style={s.qrImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={s.qrLongPressTip}>Long press QR to save</Text>
          </View>

          {/* Receiver info */}
          <View style={s.receiverBox}>
            <View style={s.receiverRow}>
              <Text style={s.receiverIcon}>👤</Text>
              <Text style={s.receiverLabel}>Pay to</Text>
              <Text style={s.receiverValue}>NammaVayal</Text>
            </View>
            <View style={s.receiverDivider} />
            <View style={s.receiverRow}>
              <Text style={s.receiverIcon}>💰</Text>
              <Text style={s.receiverLabel}>Amount</Text>
              <Text style={[s.receiverValue, { color: COLORS.primary, fontWeight: '900', fontSize: rf(18) }]}>
                ₹{amount}
              </Text>
            </View>
          </View>

          {/* Instruction steps */}
          <View style={s.instructBox}>
            {[
              '📱 Open GPay / PhonePe / Paytm',
              '📷 Tap Scan QR or Scan & Pay',
              `💸 Confirm ₹${amount} to NammaVayal`,
              '📸 Take screenshot of payment',
            ].map((step, i) => (
              <View key={i} style={s.instructRow}>
                <View style={s.instructDot}>
                  <Text style={s.instructDotTxt}>{i+1}</Text>
                </View>
                <Text style={s.instructTxt}>{step}</Text>
              </View>
            ))}
          </View>

          {/* Download QR button */}
          <TouchableOpacity
            style={[s.downloadBtn, downloading && { opacity: 0.7 }]}
            onPress={downloadQr}
            disabled={downloading}
            activeOpacity={0.85}
          >
            {downloading
              ? <ActivityIndicator color={COLORS.primary} size="small" style={{ marginRight: rs(8) }} />
              : <Text style={s.downloadIcon}>⬇️</Text>
            }
            <Text style={s.downloadTxt}>
              {downloading ? 'Saving...' : 'Download QR Code'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* I Paid button */}
        <View style={s.iPaidSection}>
          <TouchableOpacity
            style={s.iPaidBtn}
            onPress={() => navigation.navigate('PaymentScreenshotUpload', {
              ownerId: uid, commissionAmount: amount,
            })}
            activeOpacity={0.88}
          >
            <Text style={s.iPaidBtnTxt}>✅ I Paid — Upload Screenshot →</Text>
          </TouchableOpacity>
          <Text style={s.iPaidNote}>
            Account unlocks automatically when admin verifies your payment proof.
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
  timerValue:     { fontSize: rf(52), fontWeight: '900', color: '#111827', letterSpacing: rs(2), marginBottom: rs(14) },
  timerTrack:     { width: '100%', height: rs(6), backgroundColor: '#F0F0F0', borderRadius: rs(3), overflow: 'hidden', marginBottom: rs(10) },
  timerFill:      { height: '100%', borderRadius: rs(3) },
  timerSub:       { fontSize: rf(12), color: '#9CA3AF', textAlign: 'center' },

  lockBanner:     { backgroundColor: '#FEE2E2', paddingVertical: rs(12), paddingHorizontal: H_PAD, borderBottomWidth: 1, borderBottomColor: '#FECACA' },
  lockBannerTxt:  { fontSize: rf(13), color: '#B91C1C', fontWeight: '700', textAlign: 'center' },

  amountSection:  { backgroundColor: '#fff', paddingVertical: rs(20), alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  amountLbl:      { fontSize: rf(13), color: '#6B7280', marginBottom: rs(4) },
  amountVal:      { fontSize: rf(52), fontWeight: '900', color: '#111827', lineHeight: rf(58) },
  amountSub:      { fontSize: rf(12), color: '#9CA3AF', marginTop: rs(4) },

  // QR card
  qrCard:         { backgroundColor: '#fff', marginHorizontal: rs(16), marginTop: rs(12), borderRadius: rs(18), padding: rs(20), elevation: 3 },
  qrCardTitle:    { fontSize: rf(16), fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: rs(4) },
  qrCardDesc:     { fontSize: rf(13), color: '#6B7280', textAlign: 'center', marginBottom: rs(20), lineHeight: rf(20) },

  qrWrap:         { alignItems: 'center', marginBottom: rs(16) },
  qrLongPressTip: { fontSize: rf(11), color: '#9CA3AF', marginTop: rs(6), fontStyle: 'italic' },
  qrImage:        {
    width:       W * 0.70,
    height:      undefined,
    aspectRatio: 1,
    alignSelf:   'center',
    resizeMode:  'contain',
  },

  receiverBox:    { backgroundColor: '#F9FAFB', borderRadius: rs(12), padding: rs(14), marginBottom: rs(16), borderWidth: 1, borderColor: '#E5E7EB' },
  receiverRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: rs(8) },
  receiverIcon:   { fontSize: rf(16), width: rs(24), marginRight: rs(8) },
  receiverLabel:  { fontSize: rf(13), color: '#9CA3AF', fontWeight: '600', width: rs(60) },
  receiverValue:  { fontSize: rf(14), fontWeight: '700', color: '#111827', flex: 1, textAlign: 'right' },
  receiverDivider:{ height: 1, backgroundColor: '#F0F0F0' },

  instructBox:    { backgroundColor: '#E8F5EE', borderRadius: rs(12), padding: rs(14), marginBottom: rs(16) },
  instructRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: rs(10) },
  instructDot:    { width: rs(22), height: rs(22), borderRadius: rs(11), backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: rs(10), flexShrink: 0 },
  instructDotTxt: { color: '#fff', fontSize: rf(11), fontWeight: '900' },
  instructTxt:    { fontSize: rf(13), color: '#065F46', fontWeight: '600', flex: 1 },

  downloadBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F5F7', borderRadius: rs(12), paddingVertical: rs(12), borderWidth: 1, borderColor: '#E5E7EB' },
  downloadIcon:   { fontSize: rf(18), marginRight: rs(8) },
  downloadTxt:    { fontSize: rf(14), fontWeight: '700', color: '#374151' },

  // I Paid section
  iPaidSection:   { paddingHorizontal: rs(16), marginTop: rs(12) },
  iPaidBtn:       { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(16), alignItems: 'center', marginBottom: rs(10) },
  iPaidBtnTxt:    { color: '#fff', fontSize: rf(16), fontWeight: '900' },
  iPaidNote:      { fontSize: rf(12), color: '#6B7280', textAlign: 'center', lineHeight: rf(18) },
});
