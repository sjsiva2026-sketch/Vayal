// src/owner/screens/KycScreen.js
// UPDATED: License Front+Back, Aadhar Front+Back, Vehicle Image — all MANDATORY
// UPI deep link fix with proper encoding

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Image, Alert,
  ActivityIndicator, StatusBar, KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker       from 'expo-image-picker';
import { CommonActions }      from '@react-navigation/native';
import { submitKyc, listenKycStatus } from '../../../firebase/kyc';
import { useUser }            from '../../../context/UserContext';
import { COLORS }             from '../../../constants/colors';
import { rs, rf, H_PAD }      from '../../../utils/responsive';
import { FIcon }              from '../../../utils/icons';

// ── Image picker helper ────────────────────────────────────────────────────
async function pickImage(useCamera = false) {
  if (useCamera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow camera access.'); return null; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    return res.canceled ? null : res.assets?.[0] ?? null;
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { Alert.alert('Permission needed', 'Allow gallery access.'); return null; }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8,
  });
  return res.canceled ? null : res.assets?.[0] ?? null;
}

function showPickerOptions(onCamera, onGallery) {
  Alert.alert('Select Photo', 'Choose source', [
    { text: '📷 Camera',  onPress: onCamera  },
    { text: '🖼️ Gallery', onPress: onGallery },
    { text: 'Cancel',     style: 'cancel'    },
  ]);
}

// ── Upload Slot component ──────────────────────────────────────────────────
function UploadSlot({ label, icon, asset, onPick, style }) {
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
          <View style={sl.iconBox}><Text style={sl.iconTxt}>{icon}</Text></View>
          <Text style={sl.label}>{label} *</Text>
          <Text style={sl.sub}>Tap to upload</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const sl = StyleSheet.create({
  wrap:      { borderRadius: rs(12), borderWidth: rs(2), borderColor: '#E5E7EB', borderStyle: 'dashed', backgroundColor: '#F9FAFB', alignItems: 'center', paddingVertical: rs(14), paddingHorizontal: rs(8), minHeight: rs(120) },
  wrapDone:  { borderColor: '#1C7C54', borderStyle: 'solid', backgroundColor: '#F0FDF4' },
  preview:   { width: rs(60), height: rs(60), borderRadius: rs(8), marginBottom: rs(6) },
  doneBadge: { position: 'absolute', top: rs(6), right: rs(6), width: rs(18), height: rs(18), borderRadius: rs(9), backgroundColor: '#1C7C54', alignItems: 'center', justifyContent: 'center' },
  doneTick:  { color: '#fff', fontSize: rf(10), fontWeight: '900' },
  iconBox:   { width: rs(44), height: rs(44), borderRadius: rs(22), backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: rs(6) },
  iconTxt:   { fontSize: rf(22) },
  label:     { fontSize: rf(10), fontWeight: '700', color: '#374151', textAlign: 'center', marginBottom: rs(2) },
  sub:       { fontSize: rf(9), color: '#9CA3AF' },
  change:    { fontSize: rf(9), color: '#1C7C54', fontWeight: '600' },
});

// ── Doc Section with Front + Back ─────────────────────────────────────────
function DocSection({ title, icon, frontAsset, backAsset, onFront, onBack }) {
  return (
    <View style={ds.wrap}>
      <Text style={ds.title}>{icon} {title} <Text style={{ color: '#EF4444' }}>*</Text></Text>
      <Text style={ds.sub}>Upload both front and back clearly</Text>
      <View style={ds.row}>
        <UploadSlot label="Front Side" icon="📄" asset={frontAsset} onPick={onFront} style={{ flex: 1, marginRight: rs(8) }} />
        <UploadSlot label="Back Side"  icon="📄" asset={backAsset}  onPick={onBack}  style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const ds = StyleSheet.create({
  wrap:  { marginBottom: rs(16) },
  title: { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(4) },
  sub:   { fontSize: rf(11), color: '#9CA3AF', marginBottom: rs(10) },
  row:   { flexDirection: 'row' },
});

// ── Main Screen ────────────────────────────────────────────────────────────
export default function KycScreen({ navigation }) {
  const { userProfile, updateProfile } = useUser();
  const uid = userProfile?.id || '';

  const [kycStatus,    setKycStatus]    = useState(userProfile?.kycStatus ?? 'not_submitted');
  const [rejectReason, setRejectReason] = useState(userProfile?.kycRejectReason ?? '');
  const [name,         setName]         = useState(userProfile?.name          ?? '');
  const [vehicleNum,   setVehicleNum]   = useState(userProfile?.vehicleNumber ?? '');

  // ── Document state ─────────────────────────────────────────────────────
  const [profileAsset,     setProfileAsset]     = useState(null);
  const [licenseFrontAsset, setLicenseFrontAsset] = useState(null);
  const [licenseBackAsset,  setLicenseBackAsset]  = useState(null);
  const [aadharFrontAsset,  setAadharFrontAsset]  = useState(null);
  const [aadharBackAsset,   setAadharBackAsset]   = useState(null);
  const [vehicleAsset,     setVehicleAsset]     = useState(null);
  const [uploading,        setUploading]        = useState(false);

  // Realtime listener
  useEffect(() => {
    if (!uid) return;
    const unsub = listenKycStatus(uid, ({ kycStatus: ks, accessGranted, isVerified, kycRejectReason }) => {
      setKycStatus(ks);
      updateProfile({ kycStatus: ks, accessGranted, isVerified });
      if (kycRejectReason) setRejectReason(kycRejectReason);
      if (isVerified === true && ks === 'verified' && accessGranted === true) {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'OwnerHome' }] }));
      }
    });
    return unsub;
  }, [uid]);

  const pick = (setter) => showPickerOptions(
    async () => { const a = await pickImage(true);  if (a) setter(a); },
    async () => { const a = await pickImage(false); if (a) setter(a); },
  );

  // ── Validation + Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!name.trim())        { Alert.alert('Required', 'Enter your full name');                   return; }
    if (!vehicleNum.trim())  { Alert.alert('Required', 'Enter vehicle number');                   return; }
    if (!profileAsset)       { Alert.alert('Required', 'Upload your profile photo');              return; }
    if (!licenseFrontAsset)  { Alert.alert('Required', 'License front image required');           return; }
    if (!licenseBackAsset)   { Alert.alert('Required', 'License back image required');            return; }
    if (!aadharFrontAsset)   { Alert.alert('Required', 'Aadhar front image required');            return; }
    if (!aadharBackAsset)    { Alert.alert('Required', 'Aadhar back image required');             return; }
    if (!vehicleAsset)       { Alert.alert('Required', 'Vehicle image is required');              return; }

    setUploading(true);
    try {
      await submitKyc({
        ownerId:              uid,
        name:                 name.trim(),
        vehicleNumber:        vehicleNum.trim().toUpperCase(),
        profileUri:           profileAsset.uri,
        licenseFrontUri:      licenseFrontAsset.uri,
        licenseBackUri:       licenseBackAsset.uri,
        aadharFrontUri:       aadharFrontAsset.uri,
        aadharBackUri:        aadharBackAsset.uri,
        vehicleImageUri:      vehicleAsset.uri,
      });
      updateProfile({
        kycStatus:     'pending',
        accessGranted: false,
        isVerified:    false,
        name:          name.trim(),
        vehicleNumber: vehicleNum.trim().toUpperCase(),
      });
      setKycStatus('pending');
    } catch (e) {
      Alert.alert('Upload Failed', e.message || 'Check your connection and try again.');
    } finally { setUploading(false); }
  };

  // ── PENDING ────────────────────────────────────────────────────────────
  if (kycStatus === 'pending') {
    return (
      <SafeAreaView style={s.safe}>
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
            <Text style={s.docsTitle}>Documents submitted:</Text>
            {[
              'Profile photo',
              'Driving license — Front',
              'Driving license — Back',
              'Aadhar card — Front',
              'Aadhar card — Back',
              'Vehicle number',
              'Vehicle image',
            ].map(d => (
              <View key={d} style={s.docRow}>
                <Text style={s.docCheck}>✓</Text>
                <Text style={s.docItem}>{d}</Text>
              </View>
            ))}
          </View>
          <Text style={s.waitNote}>Usually approved within a few hours.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── VERIFIED ───────────────────────────────────────────────────────────
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

  // ── FORM (not_submitted or rejected) ───────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerIcon}><Text style={{ fontSize: rf(30) }}>🪪</Text></View>
            <Text style={s.headerTitle}>Owner Verification</Text>
            <Text style={s.headerSub}>Submit documents to start accepting bookings</Text>
          </View>

          {/* Rejected banner */}
          {kycStatus === 'rejected' && (
            <View style={s.rejectedBanner}>
              <Text style={s.rejectedTitle}>❌ Documents Rejected</Text>
              <Text style={s.rejectedSub}>{rejectReason || 'Please resubmit with correct, clear photos.'}</Text>
            </View>
          )}

          <View style={s.form}>
            {/* Name */}
            <View style={s.fieldGroup}>
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

            {/* Vehicle Number */}
            <View style={s.fieldGroup}>
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

            {/* Profile Photo */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Profile Photo <Text style={s.req}>*</Text></Text>
              <UploadSlot label="Profile Photo" icon="📷" asset={profileAsset} onPick={() => pick(setProfileAsset)} />
            </View>

            {/* Driving License — Front + Back */}
            <DocSection
              title="Driving License"
              icon="📄"
              frontAsset={licenseFrontAsset}
              backAsset={licenseBackAsset}
              onFront={() => pick(setLicenseFrontAsset)}
              onBack={() => pick(setLicenseBackAsset)}
            />

            {/* Aadhar Card — Front + Back */}
            <DocSection
              title="Aadhar Card"
              icon="🪪"
              frontAsset={aadharFrontAsset}
              backAsset={aadharBackAsset}
              onFront={() => pick(setAadharFrontAsset)}
              onBack={() => pick(setAadharBackAsset)}
            />

            {/* Vehicle / Machine Photo */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Vehicle / Machine Photo <Text style={s.req}>*</Text></Text>
              <Text style={s.hint}>Upload a clear photo of your vehicle or machine</Text>
              <UploadSlot label="Vehicle Photo" icon="🚜" asset={vehicleAsset} onPick={() => pick(setVehicleAsset)} />
              {!vehicleAsset && (
                <Text style={s.vehicleWarn}>⚠ Vehicle image is required to submit</Text>
              )}
            </View>

            {/* Info */}
            <View style={s.infoBox}>
              <FIcon name="info" size={rs(14)} color="#1D4ED8" fallback="ℹ" style={{ marginRight: rs(8) }} />
              <Text style={s.infoTxt}>
                All documents stored securely. Admin will verify within a few hours.
                This page updates automatically when approved.
              </Text>
            </View>

            {/* Submit */}
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
  scroll:         { paddingBottom: rs(40) },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: H_PAD * 2 },
  stateCircle:    { width: rs(90), height: rs(90), borderRadius: rs(45), alignItems: 'center', justifyContent: 'center', marginBottom: rs(18) },
  stateEmoji:     { fontSize: rf(44) },
  stateTitle:     { fontSize: rf(22), fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: rs(12) },
  stateSub:       { fontSize: rf(14), color: '#6B7280', textAlign: 'center', lineHeight: rf(22), marginBottom: rs(24) },
  docsCard:       { backgroundColor: '#fff', borderRadius: rs(14), padding: rs(18), width: '100%', marginBottom: rs(16), elevation: 2 },
  docsTitle:      { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(10) },
  docRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: rs(8) },
  docCheck:       { color: '#1C7C54', fontWeight: '900', fontSize: rf(16), marginRight: rs(10) },
  docItem:        { fontSize: rf(13), color: '#374151' },
  waitNote:       { fontSize: rf(12), color: '#9CA3AF', textAlign: 'center', fontStyle: 'italic' },
  header:         { backgroundColor: '#fff', alignItems: 'center', paddingTop: rs(28), paddingBottom: rs(22), paddingHorizontal: H_PAD, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerIcon:     { width: rs(64), height: rs(64), borderRadius: rs(32), backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: rs(12) },
  headerTitle:    { fontSize: rf(20), fontWeight: '900', color: '#111827', marginBottom: rs(6) },
  headerSub:      { fontSize: rf(13), color: '#6B7280', textAlign: 'center' },
  rejectedBanner: { backgroundColor: '#FEF2F2', borderLeftWidth: rs(4), borderLeftColor: '#EF4444', margin: H_PAD, borderRadius: rs(12), padding: rs(16) },
  rejectedTitle:  { fontSize: rf(15), fontWeight: '800', color: '#B91C1C', marginBottom: rs(4) },
  rejectedSub:    { fontSize: rf(13), color: '#7F1D1D', lineHeight: rf(20) },
  form:           { padding: H_PAD, paddingTop: rs(20) },
  fieldGroup:     { marginBottom: rs(18) },
  label:          { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(8) },
  req:            { color: '#EF4444' },
  hint:           { fontSize: rf(11), color: '#9CA3AF', marginBottom: rs(8) },
  input:          { backgroundColor: '#fff', borderWidth: rs(1.5), borderColor: '#E5E7EB', borderRadius: rs(12), paddingVertical: rs(13), paddingHorizontal: rs(16), fontSize: rf(15), color: '#111827' },
  vehicleWarn:    { fontSize: rf(12), color: '#EF4444', fontWeight: '600', marginTop: rs(8) },
  infoBox:        { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EFF6FF', borderRadius: rs(12), padding: rs(14), marginBottom: rs(20) },
  infoTxt:        { fontSize: rf(12), color: '#1D4ED8', lineHeight: rf(19), flex: 1 },
  submitBtn:      { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(16), alignItems: 'center', justifyContent: 'center' },
  submitBtnOff:   { backgroundColor: '#D1D5DB' },
  submitBtnTxt:   { color: '#fff', fontSize: rf(15), fontWeight: '800' },
});
