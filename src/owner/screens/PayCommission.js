// src/owner/screens/PayCommission.js
// FINAL: QR scan only — no UPI deep links
// Owner manually pays → Share from UPI app → auto-load

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Image, ActivityIndicator,
  StatusBar, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as MediaLibrary  from 'expo-media-library';
import * as FileSystem    from 'expo-file-system';
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

function fmtMs(ms) {
  if (!ms || ms <= 0) return '00:00';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default function PayCommission({ navigation }) {
  const { userProfile, updateProfile } = useUser();
  const uid = userProfile?.id || '';

  const [lockState,   setLockState]   = useState(null);
  const [countdown,   setCountdown]   = useState('--:--');
  const [downloading, setDownloading] = useState(false);

  const mountedRef  = useRef(true);
  const alertedRef  = useRef(false);
  const cdRef       = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    alertedRef.current = false;
    return () => {
      mountedRef.current = false;
      clearInterval(cdRef.current);
    };
  }, []);

  // ── Focus: re-check lock ─────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    alertedRef.current = false;
    if (!uid) return;
    checkCommissionLock(uid).then(r => {
      if (!mountedRef.current) return;
      if (r.isLocked) updateProfile({ isLocked: true });
    }).catch(() => {});
  }, [uid]));

  // ── Realtime listener ────────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const handle = (state) => {
      if (!mountedRef.current) return;
      setLockState(state);
      clearInterval(cdRef.current);

      // Countdown
      const ms0 = state.msRemaining || 0;
      if (ms0 > 0 && state.paymentStatus !== 'paid') {
        let ms = ms0;
        setCountdown(fmtMs(ms));
        cdRef.current = setInterval(() => {
          if (!mountedRef.current) { clearInterval(cdRef.current); return; }
          ms -= 1000;
          setCountdown(ms <= 0 ? '00:00' : fmtMs(ms));
          if (ms <= 0) {
            clearInterval(cdRef.current);
            checkCommissionLock(uid).then(r => {
              if (r.isLocked && mountedRef.current) updateProfile({ isLocked: true });
            }).catch(() => {});
          }
        }, 1000);
      }

      // Paid
      if (state.paymentStatus === 'paid' && !state.isLocked && !alertedRef.current) {
        alertedRef.current = true;
        updateProfile({ isLocked: false, paymentStatus: 'paid', otpVerifiedAt: null });
        Alert.alert('🔓 Unlocked!', 'Payment verified. All features restored!', [{
          text: 'Dashboard',
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'OwnerHome' }] }),
        }]);
      }

      // Rejected
      if (state.paymentStatus === 'rejected' && !alertedRef.current) {
        alertedRef.current = true;
        Alert.alert('❌ Rejected', 'Admin rejected your payment. Please resubmit a clear screenshot.');
      }
    };
    const unsub = listenOwnerLockState(uid, handle);
    return () => { unsub(); clearInterval(cdRef.current); };
  }, [uid]);

  // ── Download QR ──────────────────────────────────────────────────────────
  const downloadQr = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Allow storage access to save QR code.');
        return;
      }
      const asset  = require('../../../assets/icons/upi_qr.png');
      const src    = Image.resolveAssetSource(asset).uri;
      const dest   = `${FileSystem.cacheDirectory}nammavayal_qr.png`;
      await FileSystem.downloadAsync(src, dest);
      const saved  = await MediaLibrary.createAssetAsync(dest);
      try {
        const album = await MediaLibrary.getAlbumAsync('Namma Vayal');
        if (album) await MediaLibrary.addAssetsToAlbumAsync([saved], album, false);
        else       await MediaLibrary.createAlbumAsync('Namma Vayal', saved, false);
      } catch {}
      Alert.alert('✅ Saved!', 'QR Code saved to gallery → Namma Vayal album.');
    } catch {
      Alert.alert('Save Failed', 'Long press the QR image to save.');
    } finally { if (mountedRef.current) setDownloading(false); }
  };

  // ── Navigate to upload ───────────────────────────────────────────────────
  const goUpload = () => {
    if (!uid) { Alert.alert('Error', 'Session expired. Please login again.'); return; }
    navigation.navigate('PaymentScreenshotUpload', {
      ownerId:          uid,
      commissionAmount: lockState?.commissionAmount || 0,
    });
  };

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (!lockState) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F6F8" />
        <View style={s.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loadTxt}>Loading payment status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ps     = lockState.paymentStatus || 'none';
  const amount = lockState.commissionAmount || 0;

  // ── PAID ─────────────────────────────────────────────────────────────────
  if (ps === 'paid') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.bigEmoji}>🔓</Text>
          <Text style={s.stateTitle}>Account Unlocked!</Text>
          <Text style={s.stateSub}>Commission verified. All features restored.</Text>
          <TouchableOpacity style={s.greenBtn}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'OwnerHome' }] })}
            activeOpacity={0.88}>
            <Text style={s.greenBtnTxt}>Go to Dashboard →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── PENDING ───────────────────────────────────────────────────────────────
  if (ps === 'pending_verification') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.bigEmoji}>⏳</Text>
          <Text style={s.stateTitle}>Under Review</Text>
          <Text style={s.stateSub}>
            Screenshot submitted.{'\n'}
            Account unlocks automatically when admin verifies.
          </Text>
          <View style={s.pendingCard}>
            <Text style={s.pendingTxt}>💡 Usually approved within a few hours</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── WITHIN TIMER ─────────────────────────────────────────────────────────
  if (lockState.isWithin24h && ps !== 'rejected') {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F6F8" />
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} overScrollMode="never">
          <View style={s.within24Card}>
            <Text style={s.bigEmoji}>✅</Text>
            <Text style={s.stateTitle}>No Payment Due Yet</Text>
            <Text style={s.stateSub}>All screens accessible. Pay after timer expires.</Text>
          </View>
          <View style={s.timerCard}>
            <Text style={s.timerLabel}>Time remaining</Text>
            <Text style={s.timerValue}>{countdown}</Text>
            <View style={s.timerTrack}>
              <View style={[s.timerFill, {
                width: `${Math.min(100,Math.round((1-(lockState.msRemaining||0)/LOCK_WINDOW_MS)*100))}%`,
                backgroundColor: (lockState.msRemaining||0) < 60000 ? '#EF4444' : COLORS.primary,
              }]} />
            </View>
            <Text style={s.timerSub}>₹{COMMISSION_RATE}/hectare · Due: ₹{amount}</Text>
          </View>
          <View style={{height:rs(40)}} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── LOCKED — QR PAYMENT ───────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6F8" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} overScrollMode="never">

        {/* Banner */}
        <View style={s.lockBanner}>
          <Text style={s.lockBannerTxt}>🔒 Pay commission to continue using the app</Text>
        </View>

        {/* Amount */}
        <View style={s.amountCard}>
          <Text style={s.amountLbl}>Commission Due</Text>
          <Text style={s.amountVal}>₹{amount}</Text>
          <Text style={s.amountSub}>₹{COMMISSION_RATE} per hectare · NammaVayal</Text>
        </View>

        {/* HOW TO PAY — 3 steps */}
        <View style={s.stepsCard}>
          <Text style={s.stepsTitle}>How to Pay</Text>
          {[
            { n:'1', icon:'📱', title:'Open any UPI app',     desc:'GPay, PhonePe or Paytm' },
            { n:'2', icon:'📷', title:'Scan this QR code',    desc:'Point camera at QR below' },
            { n:'3', icon:'💸', title:`Pay ₹${amount}`,       desc:'NammaVayal — confirm payment' },
            { n:'4', icon:'📤', title:'Share receipt to app', desc:'Success screen → Share → Namma Vayal' },
          ].map((step,i,arr) => (
            <View key={step.n} style={[s.stepRow, i<arr.length-1 && s.stepRowBorder]}>
              <View style={s.stepNumWrap}>
                <Text style={s.stepNum}>{step.n}</Text>
              </View>
              <Text style={s.stepIcon}>{step.icon}</Text>
              <View style={{flex:1}}>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* QR Code */}
        <View style={s.qrCard}>
          <Text style={s.qrCardTitle}>Scan to Pay ₹{amount}</Text>
          <TouchableOpacity onLongPress={downloadQr} activeOpacity={1} delayLongPress={600}>
            <Image source={ICONS.upiQr} style={s.qrImage} resizeMode="contain" />
          </TouchableOpacity>
          <View style={s.qrInfoRow}>
            <View style={s.qrInfoItem}>
              <Text style={s.qrInfoLabel}>Pay to</Text>
              <Text style={s.qrInfoVal}>NammaVayal</Text>
            </View>
            <View style={s.qrInfoDivider} />
            <View style={s.qrInfoItem}>
              <Text style={s.qrInfoLabel}>Amount</Text>
              <Text style={[s.qrInfoVal,{color:COLORS.primary,fontWeight:'900'}]}>₹{amount}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[s.downloadBtn, downloading && {opacity:0.6}]}
            onPress={downloadQr}
            disabled={downloading}
            activeOpacity={0.85}
          >
            {downloading
              ? <ActivityIndicator color={COLORS.primary} size="small" style={{marginRight:rs(6)}} />
              : <Text style={s.downloadIcon}>⬇️</Text>}
            <Text style={s.downloadTxt}>{downloading ? 'Saving...' : 'Download QR'}</Text>
          </TouchableOpacity>
          <Text style={s.longPressTip}>Long press QR to save</Text>
        </View>

        {/* Share tip */}
        <View style={s.shareTipCard}>
          <Text style={s.shareTipTitle}>💡 Fastest way — Share from UPI app</Text>
          {[
            { app:'GPay',    tip:'Pay → Success → Share icon (↗) → Namma Vayal' },
            { app:'PhonePe', tip:'Pay → Transaction → Share → Namma Vayal' },
            { app:'Paytm',   tip:'Pay → Receipt → Share → Namma Vayal' },
          ].map(row => (
            <View key={row.app} style={s.shareTipRow}>
              <Text style={s.shareTipApp}>{row.app}</Text>
              <Text style={s.shareTipDesc}>{row.tip}</Text>
            </View>
          ))}
          <View style={s.shareAutoBadge}>
            <Text style={s.shareAutoBadgeTxt}>✅ Screenshot auto-loads in app — just tap Submit!</Text>
          </View>
        </View>

        {/* I Paid button */}
        <View style={s.iPaidWrap}>
          <TouchableOpacity style={s.iPaidBtn} onPress={goUpload} activeOpacity={0.88}>
            <Text style={s.iPaidBtnTxt}>✅ I Paid — Upload Screenshot</Text>
          </TouchableOpacity>
          <Text style={s.iPaidNote}>
            Paid but didn't share? Tap above to upload manually from gallery.
          </Text>
        </View>

        <View style={{height:rs(40)}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex:1, backgroundColor:'#F4F6F8' },
  scroll:         { flexGrow:1 },
  center:         { flex:1, alignItems:'center', justifyContent:'center', padding:H_PAD*2 },
  loadTxt:        { fontSize:rf(14), color:'#6B7280', marginTop:rs(12) },
  bigEmoji:       { fontSize:rf(56), marginBottom:rs(14) },
  stateTitle:     { fontSize:rf(22), fontWeight:'900', color:'#111827', textAlign:'center', marginBottom:rs(10) },
  stateSub:       { fontSize:rf(14), color:'#6B7280', textAlign:'center', lineHeight:rf(22), marginBottom:rs(16) },
  greenBtn:       { backgroundColor:COLORS.primary, borderRadius:rs(14), paddingVertical:rs(14), paddingHorizontal:rs(32) },
  greenBtnTxt:    { color:'#fff', fontWeight:'800', fontSize:rf(15) },
  pendingCard:    { backgroundColor:'#FFF3CD', borderRadius:rs(12), paddingHorizontal:rs(20), paddingVertical:rs(12), borderWidth:1, borderColor:'#F59E0B' },
  pendingTxt:     { fontSize:rf(13), color:'#92400E', fontWeight:'600' },
  within24Card:   { backgroundColor:'#fff', margin:rs(16), borderRadius:rs(18), padding:rs(24), alignItems:'center', borderWidth:rs(2), borderColor:'#22C55E', elevation:2 },
  timerCard:      { backgroundColor:'#fff', marginHorizontal:rs(16), borderRadius:rs(18), padding:rs(20), alignItems:'center', elevation:2 },
  timerLabel:     { fontSize:rf(13), color:'#6B7280', marginBottom:rs(6) },
  timerValue:     { fontSize:rf(52), fontWeight:'900', color:'#111827', letterSpacing:rs(2), marginBottom:rs(14) },
  timerTrack:     { width:'100%', height:rs(6), backgroundColor:'#F0F0F0', borderRadius:rs(3), overflow:'hidden', marginBottom:rs(10) },
  timerFill:      { height:'100%', borderRadius:rs(3) },
  timerSub:       { fontSize:rf(12), color:'#9CA3AF', textAlign:'center' },

  lockBanner:     { backgroundColor:'#FEE2E2', paddingVertical:rs(12), paddingHorizontal:H_PAD, borderBottomWidth:1, borderBottomColor:'#FECACA' },
  lockBannerTxt:  { fontSize:rf(13), color:'#B91C1C', fontWeight:'700', textAlign:'center' },

  amountCard:     { backgroundColor:'#fff', paddingVertical:rs(18), alignItems:'center', borderBottomWidth:1, borderBottomColor:'#F0F0F0' },
  amountLbl:      { fontSize:rf(13), color:'#6B7280', marginBottom:rs(4) },
  amountVal:      { fontSize:rf(52), fontWeight:'900', color:'#111827', lineHeight:rf(58) },
  amountSub:      { fontSize:rf(12), color:'#9CA3AF', marginTop:rs(4) },

  // Steps card
  stepsCard:      { backgroundColor:'#fff', marginHorizontal:rs(16), marginTop:rs(12), borderRadius:rs(16), padding:rs(16), elevation:2 },
  stepsTitle:     { fontSize:rf(14), fontWeight:'800', color:'#111827', marginBottom:rs(12) },
  stepRow:        { flexDirection:'row', alignItems:'center', paddingVertical:rs(10) },
  stepRowBorder:  { borderBottomWidth:1, borderBottomColor:'#F4F5F7' },
  stepNumWrap:    { width:rs(24), height:rs(24), borderRadius:rs(12), backgroundColor:COLORS.primary, alignItems:'center', justifyContent:'center', marginRight:rs(10), flexShrink:0 },
  stepNum:        { color:'#fff', fontSize:rf(11), fontWeight:'900' },
  stepIcon:       { fontSize:rf(20), marginRight:rs(10), width:rs(26) },
  stepTitle:      { fontSize:rf(13), fontWeight:'700', color:'#111827', marginBottom:rs(2) },
  stepDesc:       { fontSize:rf(11), color:'#9CA3AF' },

  // QR card
  qrCard:         { backgroundColor:'#fff', marginHorizontal:rs(16), marginTop:rs(12), borderRadius:rs(16), padding:rs(16), elevation:2, alignItems:'center' },
  qrCardTitle:    { fontSize:rf(15), fontWeight:'800', color:'#111827', marginBottom:rs(12) },
  qrImage:        { width:W*0.68, height:undefined, aspectRatio:1, resizeMode:'contain', alignSelf:'center', marginBottom:rs(14) },
  qrInfoRow:      { flexDirection:'row', backgroundColor:'#F9FAFB', borderRadius:rs(12), overflow:'hidden', width:'100%', marginBottom:rs(12), borderWidth:1, borderColor:'#E5E7EB' },
  qrInfoItem:     { flex:1, alignItems:'center', paddingVertical:rs(10) },
  qrInfoDivider:  { width:1, backgroundColor:'#E5E7EB' },
  qrInfoLabel:    { fontSize:rf(11), color:'#9CA3AF', marginBottom:rs(2) },
  qrInfoVal:      { fontSize:rf(14), fontWeight:'700', color:'#111827' },
  downloadBtn:    { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#F4F5F7', borderRadius:rs(10), paddingVertical:rs(10), paddingHorizontal:rs(20), borderWidth:1, borderColor:'#E5E7EB', marginBottom:rs(6) },
  downloadIcon:   { fontSize:rf(16), marginRight:rs(6) },
  downloadTxt:    { fontSize:rf(13), fontWeight:'700', color:'#374151' },
  longPressTip:   { fontSize:rf(11), color:'#9CA3AF', fontStyle:'italic' },

  // Share tip
  shareTipCard:   { backgroundColor:'#E8F5EE', marginHorizontal:rs(16), marginTop:rs(12), borderRadius:rs(16), padding:rs(14), borderWidth:1, borderColor:'#6EE7B7' },
  shareTipTitle:  { fontSize:rf(13), fontWeight:'700', color:'#065F46', marginBottom:rs(10) },
  shareTipRow:    { flexDirection:'row', alignItems:'flex-start', marginBottom:rs(8) },
  shareTipApp:    { fontSize:rf(12), fontWeight:'800', color:COLORS.primary, width:rs(65) },
  shareTipDesc:   { fontSize:rf(12), color:'#374151', flex:1, lineHeight:rf(18) },
  shareAutoBadge: { backgroundColor:'#DCFCE7', borderRadius:rs(8), padding:rs(10), marginTop:rs(4) },
  shareAutoBadgeTxt:{ fontSize:rf(12), color:'#065F46', fontWeight:'700', textAlign:'center' },

  // I Paid
  iPaidWrap:      { paddingHorizontal:rs(16), marginTop:rs(12) },
  iPaidBtn:       { backgroundColor:COLORS.primary, borderRadius:rs(14), paddingVertical:rs(16), alignItems:'center', marginBottom:rs(8), elevation:2 },
  iPaidBtnTxt:    { color:'#fff', fontSize:rf(16), fontWeight:'900' },
  iPaidNote:      { fontSize:rf(12), color:'#6B7280', textAlign:'center', lineHeight:rf(18) },
});
