// src/owner/screens/KycScreen.js
// FIXED: auto-navigate to OwnerHome when admin approves
// NEW: vehicle image upload field added
//
// STATES:
//   not_submitted → form
//   pending       → waiting screen (realtime listener active)
//   verified      → auto-navigate to OwnerHome ← FIX
//   rejected      → re-upload form with reason

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Image, Alert,
  ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker       from 'expo-image-picker';
import { CommonActions }      from '@react-navigation/native';
import { submitKyc, listenKycStatus } from '../../../firebase/kyc';
import { useUser }            from '../../../context/UserContext';
import { COLORS }             from '../../../constants/colors';
import { rs, rf, H_PAD }      from '../../../utils/responsive';
import { FIcon }              from '../../../utils/icons';

// ── Image picker ───────────────────────────────────────────────────────────
async function pickImage(useCamera = false) {
  if (useCamera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow camera access.'); return null; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    return res.canceled ? null : res.assets?.[0] ?? null;
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo library access.'); return null; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    return res.canceled ? null : res.assets?.[0] ?? null;
  }
}

function showPickerOptions(onCamera, onGallery) {
  Alert.alert('Select Photo', 'Choose source', [
    { text: 'Camera',  onPress: onCamera  },
    { text: 'Gallery', onPress: onGallery },
    { text: 'Cancel',  style: 'cancel'    },
  ]);
}

// ── Upload slot ────────────────────────────────────────────────────────────
function UploadSlot({ label, icon, asset, onPick, required, style }) {
  return (
    <TouchableOpacity
      style={[sl.wrap, asset && sl.wrapDone, style]}
      onPress={onPick}
      activeOpacity={0.85}
    >
      {asset ? (
        <>
          <Image source={{ uri: asset.uri }} style={sl.preview} resizeMode="cover" />
          <View style={sl.doneBadge}><Text style={sl.doneTick}>✓</Text></View>
          <Text style={sl.label}>{label}</Text>
          <Text style={sl.change}>Tap to change</Text>
        </>
      ) : (
        <>
          <View style={sl.iconBox}>
            <Text style={sl.iconTxt}>{icon}</Text>
          </View>
          <Text style={sl.label}>{label}{required ? ' *' : ''}</Text>
          <Text style={sl.sub}>Tap to upload</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const sl = StyleSheet.create({
  wrap:      { borderRadius: rs(14), borderWidth: rs(2), borderColor: '#E5E7EB', borderStyle: 'dashed', backgroundColor: '#F9FAFB', alignItems: 'center', paddingVertical: rs(16), paddingHorizontal: rs(8), minHeight: rs(130) },
  wrapDone:  { borderColor: '#1C7C54', borderStyle: 'solid', backgroundColor: '#F0FDF4' },
  preview:   { width: rs(68), height: rs(68), borderRadius: rs(10), marginBottom: rs(6) },
  doneBadge: { position: 'absolute', top: rs(8), right: rs(8), width: rs(20), height: rs(20), borderRadius: rs(10), backgroundColor: '#1C7C54', alignItems: 'center', justifyContent: 'center' },
  doneTick:  { color: '#fff', fontSize: rf(10), fontWeight: '900' },
  iconBox:   { width: rs(50), height: rs(50), borderRadius: rs(25), backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: rs(8) },
  iconTxt:   { fontSize: rf(24) },
  label:     { fontSize: rf(11), fontWeight: '700', color: '#374151', textAlign: 'center', marginBottom: rs(2) },
  sub:       { fontSize: rf(10), color: '#9CA3AF' },
  change:    { fontSize: rf(10), color: '#1C7C54', fontWeight: '600' },
});

// ── Main screen ────────────────────────────────────────────────────────────
export default function KycScreen({ navigation }) {
  const { userProfile, updateProfile } = useUser();
  const uid = userProfile?.id || '';

  // Local KYC state — driven by onSnapshot
  const [kycStatus,    setKycStatus]    = useState(userProfile?.kycStatus ?? 'not_submitted');
  const [rejectReason, setRejectReason] = useState(userProfile?.kycRejectReason ?? '');

  // Form fields
  const [name,          setName]          = useState(userProfile?.name          ?? '');
  const [vehicleNum,    setVehicleNum]    = useState(userProfile?.vehicleNumber ?? '');
  const [profileAsset,  setProfileAsset]  = useState(null);
  const [licenseAsset,  setLicenseAsset]  = useState(null);
  const [aadharAsset,   setAadharAsset]   = useState(null);
  const [vehicleAsset,  setVehicleAsset]  = useState(null);  // NEW
  const [uploading,     setUploading]     = useState(false);

  const navigatedRef = useRef(false);

  // ── CRITICAL FIX: onSnapshot → auto-navigate when admin approves ─────────
  useEffect(() => {
    if (!uid) return;

    const unsub = listenKycStatus(uid, ({ kycStatus: ks, accessGranted, isVerified, kycRejectReason }) => {

      // Update local profile
      updateProfile({ kycStatus: ks, accessGranted, isVerified });
      setKycStatus(ks);
      if (kycRejectReason) setRejectReason(kycRejectReason);

      // ── KEY FIX: Navigate to OwnerHome when all 3 flags are true ────────
      // Use navigatedRef to prevent duplicate navigations
      if (
        isVerified     === true &&
        ks             === 'verified' &&
        accessGranted  === true &&
        !navigatedRef.current
      ) {
        navigatedRef.current = true;
        // Small delay so state settles before navigation
        setTimeout(() => {
          navigation.dispatch(CommonActions.reset({
            index: 0,
            routes: [{ name: 'OwnerHome' }],
          }));
        }, 300);
      }
    });

    return unsub;
  }, [uid]);

  // Pick helper with camera/gallery choice
  const pick = (setter) => {
    showPickerOptions(
      async () => { const a = await pickImage(true);  if (a) setter(a); },
      async () => { const a = await pickImage(false); if (a) setter(a); },
    );
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!name.trim())       { Alert.alert('Required', 'Enter your full name');      return; }
    if (!vehicleNum.trim()) { Alert.alert('Required', 'Enter vehicle number');      return; }
    if (!profileAsset)      { Alert.alert('Required', 'Upload your profile photo'); return; }
    if (!licenseAsset)      { Alert.alert('Required', 'Upload driving license');    return; }
    if (!aadharAsset)       { Alert.alert('Required', 'Upload Aadhar card');        return; }
    // vehicleAsset is optional but recommended

    setUploading(true);
    try {
      await submitKyc({
        ownerId:          uid,
        name:             name.trim(),
        vehicleNumber:    vehicleNum,
        profileUri:       profileAsset.uri,
        licenseUri:       licenseAsset.uri,
        aadharUri:        aadharAsset.uri,
        vehicleImageUri:  vehicleAsset?.uri ?? null,  // NEW
      });

      updateProfile({
        kycStatus:     'pending',
        accessGranted: false,
        isVerified:    false,
        name:          name.trim(),
        vehicleNumber: vehicleNum.trim().toUpperCase(),
      });

      setKycStatus('pending');
      navigatedRef.current = false; // reset for fresh listener
    } catch (e) {
      Alert.alert('Upload Failed', e.message || 'Check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── STATE: PENDING ────────────────────────────────────────────────────────
  if (kycStatus === 'pending') {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={s.center}>
          <View style={[s.stateCircle, { backgroundColor: '#FFF3CD' }]}>
            <Text style={s.stateEmoji}>⏳</Text>
          </View>
          <Text style={s.stateTitle}>Waiting for Admin Approval</Text>
          <Text style={s.stateSub}>
            Your documents have been submitted.{'\n'}
            Admin will verify and unlock your account.{'\n\n'}
            This page updates automatically.
          </Text>
          <View style={s.docsCard}>
            <Text style={s.docsCardTitle}>Documents submitted:</Text>
            {[
              'Profile photo',
              'Driving license',
              'Aadhar card',
              'Vehicle number',
              ...(vehicleAsset ? ['Vehicle image'] : []),
            ].map(d => (
              <View key={d} style={s.docRow}>
                <Text style={s.docCheck}>✓</Text>
                <Text style={s.docItem}>{d}</Text>
              </View>
            ))}
          </View>
          <Text style={s.waitNote}>
            Usually approved within a few hours.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── STATE: VERIFIED → navigate happens automatically via useEffect ─────────
  if (kycStatus === 'verified') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <View style={[s.stateCircle, { backgroundColor: '#DCFCE7' }]}>
            <Text style={s.stateEmoji}>✅</Text>
          </View>
          <Text style={s.stateTitle}>Verification Successful!</Text>
          <Text style={s.stateSub}>Opening your dashboard...</Text>
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: rs(16) }} />
        </View>
      </SafeAreaView>
    );
  }

  // ── STATE: FORM (not_submitted or rejected) ────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerIcon}>
              <Text style={{ fontSize: rf(30) }}>🪪</Text>
            </View>
            <Text style={s.headerTitle}>Owner Verification</Text>
            <Text style={s.headerSub}>
              Submit documents to start accepting bookings
            </Text>
          </View>

          {/* Rejected banner */}
          {kycStatus === 'rejected' && (
            <View style={s.rejectedBanner}>
              <Text style={s.rejectedTitle}>❌ Documents Rejected</Text>
              <Text style={s.rejectedSub}>
                {rejectReason || 'Please resubmit with correct, clear photos.'}
              </Text>
            </View>
          )}

          {/* ── Full Name ── */}
          <View style={s.section}>
            <Text style={s.label}>Full Name <Text style={s.req}>*</Text></Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Muthu Selvam"
              placeholderTextColor="#C9D1DA"
              autoCapitalize="words"
            />
          </View>

          {/* ── Vehicle Number ── */}
          <View style={s.section}>
            <Text style={s.label}>Vehicle Number <Text style={s.req}>*</Text></Text>
            <TextInput
              style={[s.input, { letterSpacing: 2, fontWeight: '700' }]}
              value={vehicleNum}
              onChangeText={t => setVehicleNum(t.toUpperCase())}
              placeholder="e.g. TN59AB1234"
              placeholderTextColor="#C9D1DA"
              autoCapitalize="characters"
            />
          </View>

          {/* ── Profile Photo ── */}
          <View style={s.section}>
            <Text style={s.label}>Profile Photo <Text style={s.req}>*</Text></Text>
            <UploadSlot
              label="Profile Photo"
              icon="📷"
              asset={profileAsset}
              onPick={() => pick(setProfileAsset)}
              required
            />
          </View>

          {/* ── License + Aadhar row ── */}
          <View style={s.section}>
            <Text style={s.label}>Documents <Text style={s.req}>*</Text></Text>
            <View style={s.twoCol}>
              <UploadSlot
                label="Driving License"
                icon="📄"
                asset={licenseAsset}
                onPick={() => pick(setLicenseAsset)}
                required
                style={{ flex: 1, marginRight: rs(8) }}
              />
              <UploadSlot
                label="Aadhar Card"
                icon="🪪"
                asset={aadharAsset}
                onPick={() => pick(setAadharAsset)}
                required
                style={{ flex: 1 }}
              />
            </View>
          </View>

          {/* ── Vehicle Image (NEW) ── */}
          <View style={s.section}>
            <Text style={s.label}>
              Vehicle Photo
              <Text style={s.opt}> (recommended)</Text>
            </Text>
            <Text style={s.hint}>
              Upload a photo of your machine/vehicle — helps admin verify faster
            </Text>
            <UploadSlot
              label="Vehicle / Machine Photo"
              icon="🚜"
              asset={vehicleAsset}
              onPick={() => pick(setVehicleAsset)}
            />
          </View>

          {/* Info */}
          <View style={s.infoBox}>
            <FIcon name="info" size={rs(14)} color="#1D4ED8" fallback="ℹ" style={{ marginRight: rs(8) }} />
            <Text style={s.infoTxt}>
              Documents stored securely. Admin will verify within a few hours.
              This page updates automatically when approved.
            </Text>
          </View>

          {/* Submit */}
          <View style={{ paddingHorizontal: H_PAD, marginTop: rs(20), marginBottom: rs(40) }}>
            <TouchableOpacity
              style={[s.submitBtn, uploading && s.submitBtnOff]}
              onPress={handleSubmit}
              disabled={uploading}
              activeOpacity={0.88}
            >
              {uploading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: rs(10) }} />
                  <Text style={s.submitBtnTxt}>Uploading documents...</Text>
                </View>
              ) : (
                <Text style={s.submitBtnTxt}>
                  {kycStatus === 'rejected' ? 'Resubmit Documents' : 'Submit for Verification'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#F4F6F8' },
  scroll:         { paddingBottom: rs(20) },

  // State screens
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: H_PAD * 2 },
  stateCircle:    { width: rs(80), height: rs(80), borderRadius: rs(40), alignItems: 'center', justifyContent: 'center', marginBottom: rs(18) },
  stateEmoji:     { fontSize: rf(38) },
  stateTitle:     { fontSize: rf(22), fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: rs(12) },
  stateSub:       { fontSize: rf(14), color: '#6B7280', textAlign: 'center', lineHeight: rf(22), marginBottom: rs(24) },
  docsCard:       { backgroundColor: '#F9FAFB', borderRadius: rs(14), padding: rs(18), width: '100%', marginBottom: rs(16) },
  docsCardTitle:  { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(10) },
  docRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: rs(8) },
  docCheck:       { color: '#1C7C54', fontWeight: '900', fontSize: rf(14), marginRight: rs(10) },
  docItem:        { fontSize: rf(13), color: '#374151' },
  waitNote:       { fontSize: rf(12), color: '#9CA3AF', textAlign: 'center', fontStyle: 'italic' },

  // Form
  header:         { backgroundColor: '#fff', alignItems: 'center', paddingTop: rs(28), paddingBottom: rs(22), paddingHorizontal: H_PAD, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerIcon:     { width: rs(64), height: rs(64), borderRadius: rs(32), backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: rs(12) },
  headerTitle:    { fontSize: rf(20), fontWeight: '900', color: '#111827', marginBottom: rs(6) },
  headerSub:      { fontSize: rf(13), color: '#6B7280', textAlign: 'center', lineHeight: rf(20) },
  rejectedBanner: { backgroundColor: '#FEF2F2', borderLeftWidth: rs(4), borderLeftColor: '#EF4444', marginHorizontal: H_PAD, marginTop: rs(16), borderRadius: rs(12), padding: rs(16) },
  rejectedTitle:  { fontSize: rf(15), fontWeight: '800', color: '#B91C1C', marginBottom: rs(4) },
  rejectedSub:    { fontSize: rf(13), color: '#7F1D1D', lineHeight: rf(20) },
  section:        { paddingHorizontal: H_PAD, marginTop: rs(20) },
  label:          { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(8) },
  req:            { color: '#EF4444' },
  opt:            { fontSize: rf(11), color: '#9CA3AF', fontWeight: '400' },
  hint:           { fontSize: rf(12), color: '#9CA3AF', marginBottom: rs(10), lineHeight: rf(17) },
  input:          { backgroundColor: '#fff', borderWidth: rs(1.5), borderColor: '#E5E7EB', borderRadius: rs(12), paddingVertical: rs(13), paddingHorizontal: rs(16), fontSize: rf(15), color: '#111827' },
  twoCol:         { flexDirection: 'row' },
  infoBox:        { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EFF6FF', borderRadius: rs(12), marginHorizontal: H_PAD, marginTop: rs(16), padding: rs(14) },
  infoTxt:        { fontSize: rf(12), color: '#1D4ED8', lineHeight: rf(19), flex: 1 },
  submitBtn:      { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(16), alignItems: 'center', justifyContent: 'center' },
  submitBtnOff:   { backgroundColor: '#D1D5DB' },
  submitBtnTxt:   { color: '#fff', fontSize: rf(15), fontWeight: '800' },
});
