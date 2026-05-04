// src/owner/screens/KycScreen.js
// Owner KYC submission form
// States: not_submitted → form | pending → waiting | verified → success | rejected → re-submit

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Image, Alert,
  ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { submitKyc, listenKycStatus } from '../../../firebase/kyc';
import { useUser }       from '../../../context/UserContext';
import { COLORS }        from '../../../constants/colors';
import { rs, rf, H_PAD } from '../../../utils/responsive';
import { FIcon }         from '../../../utils/icons';

// ── Image picker helper ────────────────────────────────────────────────────
async function pickImage() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to upload documents.'); return null; }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  return res.canceled ? null : res.assets?.[0] ?? null;
}

// ── Upload slot component ──────────────────────────────────────────────────
function UploadSlot({ label, icon, asset, onPick, required }) {
  return (
    <TouchableOpacity style={[sl.wrap, asset && sl.wrapDone]} onPress={onPick} activeOpacity={0.85}>
      {asset ? (
        <>
          <Image source={{ uri: asset.uri }} style={sl.preview} resizeMode="cover" />
          <View style={sl.doneOverlay}>
            <Text style={sl.doneTick}>✓</Text>
          </View>
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
  wrap:        { flex: 1, borderRadius: rs(14), borderWidth: rs(2), borderColor: '#E5E7EB', borderStyle: 'dashed', backgroundColor: '#F9FAFB', alignItems: 'center', paddingVertical: rs(18), paddingHorizontal: rs(8), minHeight: rs(130) },
  wrapDone:    { borderColor: '#1C7C54', borderStyle: 'solid', backgroundColor: '#F0FDF4' },
  preview:     { width: rs(70), height: rs(70), borderRadius: rs(10), marginBottom: rs(6) },
  doneOverlay: { position: 'absolute', top: rs(8), right: rs(8), width: rs(22), height: rs(22), borderRadius: rs(11), backgroundColor: '#1C7C54', alignItems: 'center', justifyContent: 'center' },
  doneTick:    { color: '#fff', fontSize: rf(11), fontWeight: '900' },
  iconBox:     { width: rs(52), height: rs(52), borderRadius: rs(26), backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: rs(8) },
  iconTxt:     { fontSize: rf(24) },
  label:       { fontSize: rf(12), fontWeight: '700', color: '#374151', textAlign: 'center', marginBottom: rs(2) },
  sub:         { fontSize: rf(11), color: '#9CA3AF' },
  change:      { fontSize: rf(11), color: '#1C7C54', fontWeight: '600' },
});

// ── Main Screen ────────────────────────────────────────────────────────────
export default function KycScreen() {
  const { userProfile, updateProfile } = useUser();
  const uid = userProfile?.id || '';

  const [kycStatus,   setKycStatus]   = useState(userProfile?.kycStatus ?? 'not_submitted');
  const [name,        setName]        = useState(userProfile?.name ?? '');
  const [vehicleNum,  setVehicleNum]  = useState(userProfile?.vehicleNumber ?? '');
  const [profileAsset,setProfileAsset]= useState(null);
  const [licenseAsset,setLicenseAsset]= useState(null);
  const [aadharAsset, setAadharAsset] = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [rejectReason,setRejectReason]= useState(userProfile?.kycRejectReason ?? '');

  // Real-time: unlock as soon as admin approves
  useEffect(() => {
    const unsub = listenKycStatus(uid, ({ kycStatus: ks, accessGranted, isVerified }) => {
      setKycStatus(ks);
      updateProfile({ kycStatus: ks, accessGranted, isVerified });
    });
    return unsub;
  }, [uid]);

  const handleSubmit = async () => {
    if (!name.trim())         { Alert.alert('Required', 'Enter your full name');       return; }
    if (!vehicleNum.trim())   { Alert.alert('Required', 'Enter vehicle number');       return; }
    if (!profileAsset)        { Alert.alert('Required', 'Upload your profile photo');  return; }
    if (!licenseAsset)        { Alert.alert('Required', 'Upload driving license');     return; }
    if (!aadharAsset)         { Alert.alert('Required', 'Upload Aadhar card');         return; }

    setUploading(true);
    try {
      await submitKyc({
        ownerId:       uid,
        name:          name.trim(),
        vehicleNumber: vehicleNum,
        profileUri:    profileAsset.uri,
        licenseUri:    licenseAsset.uri,
        aadharUri:     aadharAsset.uri,
      });
      updateProfile({ kycStatus: 'pending', accessGranted: false, isVerified: false, name: name.trim(), vehicleNumber: vehicleNum.trim().toUpperCase() });
      setKycStatus('pending');
      Alert.alert('Submitted!', 'Admin will review your documents and approve shortly.');
    } catch (e) {
      Alert.alert('Upload Failed', e.message || 'Check connection and try again.');
    } finally { setUploading(false); }
  };

  // ── PENDING ────────────────────────────────────────────────────────────
  if (kycStatus === 'pending') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <View style={[s.iconCircle, { backgroundColor: '#FFF3CD' }]}>
            <Text style={s.iconTxt}>⏳</Text>
          </View>
          <Text style={s.bigTitle}>Waiting for Admin Approval</Text>
          <Text style={s.bigSub}>
            Your documents have been submitted.{'\n'}
            Admin will verify and unlock your account.{'\n\n'}
            This page updates automatically when approved.
          </Text>
          <View style={s.infoCard}>
            <Text style={s.infoTitle}>Documents submitted:</Text>
            {['Profile photo', 'Driving license', 'Aadhar card', 'Vehicle number'].map(d => (
              <View key={d} style={s.infoRow}>
                <Text style={s.infoCheck}>✓</Text>
                <Text style={s.infoItem}>{d}</Text>
              </View>
            ))}
          </View>
          <Text style={s.waitNote}>
            Usually takes a few hours. You'll be notified when verified.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── VERIFIED ───────────────────────────────────────────────────────────
  if (kycStatus === 'verified') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <View style={[s.iconCircle, { backgroundColor: '#DCFCE7' }]}>
            <Text style={s.iconTxt}>✅</Text>
          </View>
          <Text style={s.bigTitle}>Verification Successful!</Text>
          <Text style={s.bigSub}>
            Your account has been verified.{'\n'}
            You have full access to Namma Vayal.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── NOT SUBMITTED or REJECTED → Show form ─────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerIconBox}>
              <Text style={s.headerIconTxt}>🪪</Text>
            </View>
            <Text style={s.headerTitle}>Owner Verification</Text>
            <Text style={s.headerSub}>Submit your documents to get verified and start accepting bookings.</Text>
          </View>

          {/* Rejected banner */}
          {kycStatus === 'rejected' && (
            <View style={s.rejectedBanner}>
              <Text style={s.rejectedTitle}>Documents Rejected</Text>
              <Text style={s.rejectedSub}>
                {rejectReason || 'Admin rejected your documents. Please resubmit with correct photos.'}
              </Text>
            </View>
          )}

          {/* Name */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Full Name *</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Muthu Selvam"
              placeholderTextColor="#C9D1DA"
              autoCapitalize="words"
            />
          </View>

          {/* Vehicle number */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Vehicle Number *</Text>
            <TextInput
              style={[s.input, s.inputUpper]}
              value={vehicleNum}
              onChangeText={t => setVehicleNum(t.toUpperCase())}
              placeholder="e.g. TN59AB1234"
              placeholderTextColor="#C9D1DA"
              autoCapitalize="characters"
            />
          </View>

          {/* Document uploads */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Documents *</Text>
            <Text style={s.sectionHint}>Upload clear, readable photos of each document</Text>

            {/* Profile photo */}
            <UploadSlot
              label="Profile Photo"
              icon="📷"
              asset={profileAsset}
              onPick={async () => { const a = await pickImage(); if (a) setProfileAsset(a); }}
              required
            />
            <View style={{ height: rs(12) }} />

            {/* 2-column: license + aadhar */}
            <View style={s.docRow}>
              <View style={{ flex: 1, marginRight: rs(8) }}>
                <UploadSlot
                  label="Driving License"
                  icon="📄"
                  asset={licenseAsset}
                  onPick={async () => { const a = await pickImage(); if (a) setLicenseAsset(a); }}
                  required
                />
              </View>
              <View style={{ flex: 1 }}>
                <UploadSlot
                  label="Aadhar Card"
                  icon="🪪"
                  asset={aadharAsset}
                  onPick={async () => { const a = await pickImage(); if (a) setAadharAsset(a); }}
                  required
                />
              </View>
            </View>
          </View>

          {/* Note */}
          <View style={s.noteBox}>
            <FIcon name="info" size={rs(14)} color="#1D4ED8" fallback="ℹ" style={{ marginRight: rs(8) }} />
            <Text style={s.noteTxt}>
              Documents are securely stored. Admin will verify within a few hours.
            </Text>
          </View>

          {/* Submit */}
          <View style={{ paddingHorizontal: H_PAD, marginTop: rs(20) }}>
            <TouchableOpacity
              style={[s.submitBtn, uploading && s.submitBtnOff]}
              onPress={handleSubmit}
              disabled={uploading}
              activeOpacity={0.88}
            >
              {uploading
                ? <><ActivityIndicator color="#fff" size="small" style={{ marginRight: rs(10) }} /><Text style={s.submitBtnTxt}>Uploading documents...</Text></>
                : <Text style={s.submitBtnTxt}>{kycStatus === 'rejected' ? 'Resubmit Documents' : 'Submit for Verification'}</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={{ height: rs(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#F4F6F8' },
  scroll:         { paddingBottom: rs(20) },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: H_PAD * 2 },
  iconCircle:     { width: rs(80), height: rs(80), borderRadius: rs(40), alignItems: 'center', justifyContent: 'center', marginBottom: rs(18) },
  iconTxt:        { fontSize: rf(40) },
  bigTitle:       { fontSize: rf(22), fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: rs(12) },
  bigSub:         { fontSize: rf(14), color: '#6B7280', textAlign: 'center', lineHeight: rf(22), marginBottom: rs(24) },
  infoCard:       { backgroundColor: '#F9FAFB', borderRadius: rs(14), padding: rs(18), width: '100%', marginBottom: rs(16) },
  infoTitle:      { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(10) },
  infoRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: rs(8) },
  infoCheck:      { color: '#1C7C54', fontWeight: '900', fontSize: rf(14), marginRight: rs(10) },
  infoItem:       { fontSize: rf(13), color: '#374151' },
  waitNote:       { fontSize: rf(12), color: '#9CA3AF', textAlign: 'center', fontStyle: 'italic' },
  header:         { backgroundColor: '#fff', alignItems: 'center', paddingTop: rs(28), paddingBottom: rs(22), paddingHorizontal: H_PAD, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerIconBox:  { width: rs(64), height: rs(64), borderRadius: rs(32), backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: rs(12) },
  headerIconTxt:  { fontSize: rf(30) },
  headerTitle:    { fontSize: rf(20), fontWeight: '900', color: '#111827', marginBottom: rs(6) },
  headerSub:      { fontSize: rf(13), color: '#6B7280', textAlign: 'center', lineHeight: rf(20) },
  rejectedBanner: { backgroundColor: '#FEF2F2', borderLeftWidth: rs(4), borderLeftColor: '#EF4444', marginHorizontal: H_PAD, marginTop: rs(16), borderRadius: rs(12), padding: rs(16) },
  rejectedTitle:  { fontSize: rf(15), fontWeight: '800', color: '#B91C1C', marginBottom: rs(4) },
  rejectedSub:    { fontSize: rf(13), color: '#7F1D1D', lineHeight: rf(20) },
  section:        { paddingHorizontal: H_PAD, marginTop: rs(20) },
  sectionLabel:   { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(8) },
  sectionHint:    { fontSize: rf(12), color: '#9CA3AF', marginBottom: rs(12) },
  input:          { backgroundColor: '#fff', borderWidth: rs(1.5), borderColor: '#E5E7EB', borderRadius: rs(12), paddingVertical: rs(13), paddingHorizontal: rs(16), fontSize: rf(15), color: '#111827' },
  inputUpper:     { letterSpacing: 2, fontWeight: '700' },
  docRow:         { flexDirection: 'row' },
  noteBox:        { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EFF6FF', borderRadius: rs(12), marginHorizontal: H_PAD, marginTop: rs(16), padding: rs(14) },
  noteTxt:        { fontSize: rf(13), color: '#1D4ED8', lineHeight: rf(19), flex: 1 },
  submitBtn:      { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(16), alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  submitBtnOff:   { backgroundColor: '#D1D5DB' },
  submitBtnTxt:   { color: '#fff', fontSize: rf(15), fontWeight: '800' },
});
