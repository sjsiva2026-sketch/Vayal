// src/common/screens/ProfileSetup.js
// UPDATED: Terms & Privacy Policy agreement added
// FIXED: Owner → KycScreen after profile save

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
  StatusBar, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { CommonActions }   from '@react-navigation/native';
import { createUser }      from '../../../firebase/firestore';
import { useAuth }         from '../../../context/AuthContext';
import { useUser }         from '../../../context/UserContext';
import DistrictTalukPicker from '../components/DistrictTalukPicker';
import { FIcon }           from '../../../utils/icons';
import { COLORS }          from '../../../constants/colors';
import { rs, rf, H_PAD }   from '../../../utils/responsive';

const AFTER_SAVE = {
  farmer: 'FarmerHome',
  owner:  'KycScreen',
  admin:  'AdminDashboard',
};

// ── Privacy Policy content ─────────────────────────────────────────────────
const PRIVACY_POLICY = `PRIVACY POLICY
நம்ம வயல் 🌾
Last updated: May 2026

1. INFORMATION WE COLLECT
We collect:
• Name, phone number, location (district, taluk, village)
• Profile photos and KYC documents (for machine owners)
• Booking history and usage data
• Device information

2. HOW WE USE YOUR INFORMATION
• To match farmers with machine owners in their area
• To verify machine owner identity (KYC)
• To process commission payments
• To improve app performance
• To send booking notifications

3. DATA STORAGE
All data is securely stored on Google Firebase servers. We use Firebase Firestore (database) and Firebase Storage (images).

4. DATA SHARING
We do NOT sell your personal data. We only share:
• Farmer contact with machine owner (for bookings)
• Owner KYC documents with admin for verification

5. PROFILE PHOTOS & KYC DOCUMENTS
Photos uploaded are stored securely and only visible to:
• You (the user)
• Admin (for KYC verification)

6. COMMISSION PAYMENTS
Payment screenshots are collected only for verification. We do not store payment card details.

7. DATA DELETION
You can delete your account by contacting us. We will remove your data within 30 days.

8. CONTACT US
For privacy concerns:
📧 sjsiva2026@gmail.com
📱 WhatsApp: +91 9876543210

9. CHILDREN'S PRIVACY
This app is not intended for users under 18 years of age.

10. CHANGES
We may update this policy. Continued use means acceptance.`;

// ── Terms & Conditions content ─────────────────────────────────────────────
const TERMS = `TERMS & CONDITIONS
நம்ம வயல் 🌾
Last updated: May 2026

1. ACCEPTANCE
By using நம்ம வயல் app, you agree to these terms. If you disagree, do not use the app.

2. SERVICE DESCRIPTION
நம்ம வயல் connects farmers with agricultural machine owners in Tamil Nadu for booking services.

3. USER ACCOUNTS
• You must provide accurate information
• One account per phone number
• You are responsible for account security
• We reserve the right to suspend accounts for misuse

4. FARMER RESPONSIBILITIES
• Provide accurate booking details
• Be present at the booking time
• Pay the machine owner as agreed
• Rate and review honestly

5. MACHINE OWNER RESPONSIBILITIES
• Provide accurate machine information
• Complete KYC verification
• Honor accepted bookings
• Pay commission (₹20/hectare) within 24 hours of job completion

6. COMMISSION SYSTEM
• Commission: ₹20 per hectare
• Payment due within 24 hours after OTP job completion
• Non-payment will lock your account
• Only admin can verify and unlock accounts

7. KYC VERIFICATION
• Machine owners must complete KYC
• Documents must be genuine and valid
• False documents will result in permanent ban
• Admin decisions on KYC are final

8. PROHIBITED ACTIVITIES
• Fake bookings
• Fraudulent payments
• Harassment of other users
• Providing false information

9. LIABILITY
நம்ம வயல் is a platform connecting users. We are not responsible for:
• Quality of service provided
• Disputes between farmers and owners
• Payment issues between parties

10. TERMINATION
We may terminate accounts that violate these terms.

11. GOVERNING LAW
These terms are governed by Indian law. Disputes are subject to courts in Tamil Nadu.

12. CONTACT
📧 sjsiva2026@gmail.com
📱 +91 9876543210`;

// ── Legal Document Modal ───────────────────────────────────────────────────
function LegalModal({ visible, title, content, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={m.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={m.header}>
          <Text style={m.title}>{title}</Text>
          <TouchableOpacity style={m.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={m.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={m.content} showsVerticalScrollIndicator={false}>
          <Text style={m.body}>{content}</Text>
          <TouchableOpacity style={m.agreeBtn} onPress={onClose} activeOpacity={0.88}>
            <Text style={m.agreeBtnTxt}>I Understand</Text>
          </TouchableOpacity>
          <View style={{ height: rs(20) }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const m = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#fff' },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: H_PAD, paddingVertical: rs(14), borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  title:     { fontSize: rf(17), fontWeight: '800', color: '#111827' },
  closeBtn:  { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center' },
  closeTxt:  { fontSize: rf(16), color: '#374151', fontWeight: '700' },
  content:   { padding: H_PAD, paddingBottom: rs(40) },
  body:      { fontSize: rf(13), color: '#374151', lineHeight: rf(22) },
  agreeBtn:  { backgroundColor: COLORS.primary, borderRadius: rs(12), paddingVertical: rs(14), alignItems: 'center', marginTop: rs(24) },
  agreeBtnTxt: { color: '#fff', fontSize: rf(15), fontWeight: '800' },
});

// ── Main Screen ────────────────────────────────────────────────────────────
export default function ProfileSetup({ navigation, route }) {
  const uid      = route?.params?.uid   || '';
  const phone    = route?.params?.phone || '';
  const role     = route?.params?.role  || 'farmer';
  const isFarmer = role === 'farmer';
  const isOwner  = role === 'owner';

  const { setUserProfile: setAuthProfile } = useAuth();
  const { setUserProfile }                 = useUser();

  const [name,     setName]     = useState('');
  const [district, setDistrict] = useState('');
  const [taluk,    setTaluk]    = useState('');
  const [village,  setVillage]  = useState('');
  const [loading,  setLoading]  = useState(false);

  // Terms & Privacy
  const [agreed,       setAgreed]       = useState(false);
  const [showPrivacy,  setShowPrivacy]  = useState(false);
  const [showTerms,    setShowTerms]    = useState(false);

  if (!uid) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: rf(52), marginBottom: rs(16) }}>⚠️</Text>
        <Text style={{ fontSize: rf(16), color: '#374151', textAlign: 'center', paddingHorizontal: rs(32) }}>
          Session expired. Please start over.
        </Text>
        <TouchableOpacity
          style={[s.saveBtn, { marginTop: rs(24), marginHorizontal: rs(40) }]}
          onPress={() => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'RoleSelect' }] }))}
        >
          <Text style={s.saveBtnTxt}>Start Over</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Enter your full name'); return; }
    if (!district)    { Alert.alert('Required', 'Select your district'); return; }
    if (!taluk)       { Alert.alert('Required', 'Select your taluk');    return; }
    if (!agreed) {
      Alert.alert(
        'Agreement Required',
        'Please read and agree to our Terms & Conditions and Privacy Policy to continue.',
        [{ text: 'Read Now', onPress: () => setShowTerms(true) }, { text: 'Cancel', style: 'cancel' }]
      );
      return;
    }

    setLoading(true);
    try {
      const profile = {
        role,
        phone:         phone.replace(/^\+91/, ''),
        name:          name.trim(),
        state:         'Tamil Nadu',
        district,
        taluk,
        village:       village.trim(),
        isLocked:      false,
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        kycStatus:     isFarmer ? 'verified'  : 'not_submitted',
        isVerified:    isFarmer ? true         : false,
        accessGranted: isFarmer ? true         : false,
      };

      await createUser(uid, profile);

      const full = { ...profile, id: uid };
      setAuthProfile(full);
      setUserProfile(full);

      const dest = AFTER_SAVE[role] || 'RoleSelect';
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: dest }] }));
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save. Try again.');
      setLoading(false);
    }
  };

  const filled   = [name, district, taluk].filter(Boolean).length;
  const progress = filled / 3;
  const steps    = [
    { key: 'name',     label: 'Name',     done: !!name.trim() },
    { key: 'district', label: 'District', done: !!district    },
    { key: 'taluk',    label: 'Taluk',    done: !!taluk       },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <FIcon name="arrow-left" size={rs(20)} color="#111827" fallback="←" />
          </TouchableOpacity>
          <View style={s.titleRow}>
            <View style={[s.iconCircle, { backgroundColor: isFarmer ? '#E8F5EE' : '#FFF8E1' }]}>
              <Text style={{ fontSize: rf(28) }}>{isFarmer ? '👨‍🌾' : '🚜'}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: rs(12) }}>
              <Text style={s.title}>Complete Profile</Text>
              <View style={s.phonePill}>
                <Text style={s.phoneTxt}>📱 +91 {phone.replace(/^\+91/, '')}</Text>
              </View>
            </View>
          </View>
          <View style={s.stepsRow}>
            {steps.map((st, i) => (
              <View key={st.key} style={s.stepItem}>
                <View style={[s.stepDot, st.done && s.stepDotDone]}>
                  <Text style={[s.stepNum, st.done && { color: '#fff' }]}>{st.done ? '✓' : i+1}</Text>
                </View>
                <Text style={[s.stepLabel, st.done && s.stepLabelDone]}>{st.label}</Text>
              </View>
            ))}
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        <ScrollView
          style={s.formScroll}
          contentContainerStyle={s.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.handle} />

          {/* KYC notice for owners */}
          {isOwner && (
            <View style={s.kycBanner}>
              <Text style={s.kycBannerTitle}>🪪 KYC Required Next</Text>
              <Text style={s.kycBannerSub}>
                After saving, you'll upload documents for admin verification.
                You can't access the owner dashboard until verified.
              </Text>
            </View>
          )}

          {/* Name */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>👤 Full Name <Text style={s.req}>*</Text></Text>
            <View style={[s.inputWrap, name.length > 0 && s.inputWrapDone]}>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Selvam Kumar"
                placeholderTextColor="#C9D1DA"
                returnKeyType="next"
              />
              {name.length > 0 && <Text style={s.check}>✓</Text>}
            </View>
          </View>

          <DistrictTalukPicker district={district} taluk={taluk} onDistrictChange={setDistrict} onTalukChange={setTaluk} />

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>📍 Village <Text style={s.opt}>(optional)</Text></Text>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                value={village}
                onChangeText={setVillage}
                placeholder="e.g. Kolathur"
                placeholderTextColor="#C9D1DA"
                returnKeyType="done"
              />
            </View>
          </View>

          <View style={s.infoBox}>
            <Text style={s.infoTxt}>📍 We show machines available in your taluk</Text>
          </View>

          {/* ── TERMS & PRIVACY AGREEMENT ── */}
          <View style={s.agreementBox}>
            <TouchableOpacity
              style={s.checkRow}
              onPress={() => setAgreed(a => !a)}
              activeOpacity={0.8}
            >
              <View style={[s.checkbox, agreed && s.checkboxChecked]}>
                {agreed && <Text style={s.checkboxTick}>✓</Text>}
              </View>
              <View style={s.checkTextWrap}>
                <Text style={s.checkText}>
                  I have read and agree to the{' '}
                  <Text style={s.linkText} onPress={() => setShowTerms(true)}>
                    Terms & Conditions
                  </Text>
                  {' '}and{' '}
                  <Text style={s.linkText} onPress={() => setShowPrivacy(true)}>
                    Privacy Policy
                  </Text>
                  {' '}of நம்ம வயல்
                </Text>
              </View>
            </TouchableOpacity>

            {/* Read links */}
            <View style={s.legalLinks}>
              <TouchableOpacity style={s.legalLinkBtn} onPress={() => setShowTerms(true)} activeOpacity={0.8}>
                <Text style={s.legalLinkTxt}>📄 Read Terms</Text>
              </TouchableOpacity>
              <View style={s.legalDivider} />
              <TouchableOpacity style={s.legalLinkBtn} onPress={() => setShowPrivacy(true)} activeOpacity={0.8}>
                <Text style={s.legalLinkTxt}>🛡️ Privacy Policy</Text>
              </TouchableOpacity>
            </View>

            {!agreed && (
              <Text style={s.agreementWarn}>
                ⚠️ You must agree to continue using the app
              </Text>
            )}
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[s.saveBtn, (loading || !agreed) && s.saveBtnOff]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnTxt}>
                  {isOwner ? 'Save & Start KYC →' : 'Save & Continue →'}
                </Text>
            }
          </TouchableOpacity>

          <Text style={s.footerNote}>
            By continuing, you confirm all details are accurate and genuine.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Legal Modals */}
      <LegalModal
        visible={showTerms}
        title="Terms & Conditions"
        content={TERMS}
        onClose={() => setShowTerms(false)}
      />
      <LegalModal
        visible={showPrivacy}
        title="Privacy Policy"
        content={PRIVACY_POLICY}
        onClose={() => setShowPrivacy(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#fff' },
  header:         { backgroundColor: '#fff', paddingHorizontal: H_PAD, paddingTop: rs(12), paddingBottom: rs(12), borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backBtn:        { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center', marginBottom: rs(12) },
  titleRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: rs(14) },
  iconCircle:     { width: rs(52), height: rs(52), borderRadius: rs(14), alignItems: 'center', justifyContent: 'center' },
  title:          { fontSize: rf(19), fontWeight: '900', color: '#111827', marginBottom: rs(4) },
  phonePill:      { backgroundColor: '#F4F5F7', borderRadius: rs(10), paddingHorizontal: rs(8), paddingVertical: rs(3), alignSelf: 'flex-start' },
  phoneTxt:       { fontSize: rf(11), fontWeight: '700', color: '#374151' },
  stepsRow:       { flexDirection: 'row', marginBottom: rs(10) },
  stepItem:       { flexDirection: 'row', alignItems: 'center', marginRight: rs(14) },
  stepDot:        { width: rs(22), height: rs(22), borderRadius: rs(11), backgroundColor: '#F0F0F0', borderWidth: rs(2), borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginRight: rs(5) },
  stepDotDone:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepNum:        { fontSize: rf(10), fontWeight: '900', color: '#9CA3AF' },
  stepLabel:      { fontSize: rf(11), color: '#9CA3AF', fontWeight: '600' },
  stepLabelDone:  { color: COLORS.primary, fontWeight: '700' },
  progressTrack:  { height: rs(4), backgroundColor: '#F0F0F0', borderRadius: rs(2), overflow: 'hidden' },
  progressFill:   { height: '100%', backgroundColor: COLORS.primary, borderRadius: rs(2) },
  formScroll:     { flex: 1, backgroundColor: '#F9FAFB' },
  formContent:    { flexGrow: 1, paddingHorizontal: H_PAD, paddingTop: rs(12), paddingBottom: rs(80) },
  handle:         { width: rs(40), height: rs(4), borderRadius: rs(2), backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: rs(20) },
  kycBanner:      { backgroundColor: '#FFF8E1', borderRadius: rs(12), padding: rs(14), marginBottom: rs(16), borderLeftWidth: rs(4), borderLeftColor: '#F59E0B' },
  kycBannerTitle: { fontSize: rf(13), fontWeight: '800', color: '#92400E', marginBottom: rs(4) },
  kycBannerSub:   { fontSize: rf(12), color: '#92400E', lineHeight: rf(18) },
  fieldGroup:     { marginBottom: rs(14) },
  fieldLabel:     { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(7) },
  req:            { color: '#EF4444', fontWeight: '900' },
  opt:            { fontSize: rf(11), color: '#9CA3AF', fontWeight: '400' },
  inputWrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: rs(12), borderWidth: rs(2), borderColor: '#E5E7EB' },
  inputWrapDone:  { borderColor: COLORS.primary, backgroundColor: '#FAFFFE' },
  input:          { flex: 1, paddingVertical: rs(13), paddingHorizontal: rs(14), fontSize: rf(14), color: '#111827' },
  check:          { fontSize: rf(16), color: COLORS.primary, fontWeight: '900', paddingRight: rs(12) },
  infoBox:        { backgroundColor: '#E8F5EE', borderRadius: rs(12), padding: rs(11), marginBottom: rs(16) },
  infoTxt:        { fontSize: rf(12), color: '#065F46', fontWeight: '600' },

  // Agreement box
  agreementBox:   { backgroundColor: '#fff', borderRadius: rs(14), padding: rs(14), marginBottom: rs(18), borderWidth: rs(1.5), borderColor: '#E5E7EB', elevation: 1 },
  checkRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: rs(12) },
  checkbox:       { width: rs(22), height: rs(22), borderRadius: rs(6), borderWidth: rs(2), borderColor: '#D1D5DB', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: rs(10), marginTop: rs(1), flexShrink: 0 },
  checkboxChecked:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkboxTick:   { color: '#fff', fontSize: rf(12), fontWeight: '900' },
  checkTextWrap:  { flex: 1 },
  checkText:      { fontSize: rf(13), color: '#374151', lineHeight: rf(20) },
  linkText:       { color: COLORS.primary, fontWeight: '700', textDecorationLine: 'underline' },
  legalLinks:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: rs(10), overflow: 'hidden' },
  legalLinkBtn:   { flex: 1, paddingVertical: rs(10), alignItems: 'center' },
  legalLinkTxt:   { fontSize: rf(12), color: COLORS.primary, fontWeight: '700' },
  legalDivider:   { width: 1, height: rs(28), backgroundColor: '#E5E7EB' },
  agreementWarn:  { fontSize: rf(11), color: '#EF4444', marginTop: rs(8), fontWeight: '600' },

  // Save button
  saveBtn:        { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(15), alignItems: 'center' },
  saveBtnOff:     { backgroundColor: '#D1D5DB' },
  saveBtnTxt:     { color: '#fff', fontSize: rf(15), fontWeight: '800' },
  footerNote:     { fontSize: rf(11), color: '#9CA3AF', textAlign: 'center', marginTop: rs(12), lineHeight: rf(17) },
});
