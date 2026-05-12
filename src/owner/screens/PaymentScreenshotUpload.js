// src/owner/screens/PaymentScreenshotUpload.js
// SEPARATE SCREEN — Upload payment screenshot
// Header: back button (top-left) + "Upload Payment Proof" title
// No transactionId — screenshot only

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Image, ActivityIndicator,
  StatusBar, Platform, KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { IIcon }        from '../../../utils/icons';
import {
  uploadPaymentScreenshot,
  submitPaymentProof,
} from '../../../firebase/commission';
import { useUser }       from '../../../context/UserContext';
import { COLORS }        from '../../../constants/colors';
import { rs, rf, H_PAD, STATUS_BAR_H } from '../../../utils/responsive';

export default function PaymentScreenshotUpload({ navigation, route }) {
  const { ownerId, commissionAmount } = route.params || {};
  const { updateProfile }             = useUser();
  const today                         = new Date().toISOString().slice(0, 10);

  const [screenshot, setScreenshot] = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  // Pick screenshot from gallery
  const pickScreenshot = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission Required', 'Allow photo access to upload screenshot.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality:    0.8,
    });
    if (!res.canceled && res.assets?.[0]) setScreenshot(res.assets[0]);
  };

  // Submit screenshot to Firebase
  const handleSubmit = async () => {
    if (!screenshot) { Alert.alert('Required', 'Please select your payment screenshot'); return; }
    if (submitted)   return;
    setUploading(true);
    try {
      const url = await uploadPaymentScreenshot(ownerId, screenshot.uri);
      await submitPaymentProof({
        ownerId, screenshotUrl: url,
        amount: commissionAmount, date: today,
      });
      updateProfile({ paymentStatus: 'pending_verification' });
      setSubmitted(true);
      Alert.alert(
        '📤 Submitted!',
        'Admin will verify your screenshot and unlock your account shortly.',
        [{ text: 'OK', onPress: () => navigation.navigate('PayCommission') }],
      );
    } catch (e) {
      Alert.alert('Upload Failed', e.message || 'Check your connection and try again.');
    } finally { setUploading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Android status bar padding */}
      <View style={{ height: Platform.OS === 'android' ? STATUS_BAR_H : 0 }} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── HEADER — back button top-left ── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <IIcon name="arrow-back" size={rs(22)} color="#111827" fallback="←" />
        </TouchableOpacity>

        <Text style={s.headerTitle}>Upload Payment Proof</Text>

        {/* Empty view for centering title */}
        <View style={{ width: rs(40) }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info banner */}
          <View style={s.infoBanner}>
            <Text style={s.infoBannerTitle}>₹{commissionAmount} Commission</Text>
            <Text style={s.infoBannerSub}>
              Upload screenshot of your payment.{'\n'}
              Account stays locked until admin verifies.
            </Text>
          </View>

          {/* Screenshot section */}
          <View style={s.card}>
            <Text style={s.cardTitle}>📸 Payment Screenshot <Text style={s.req}>*</Text></Text>
            <Text style={s.cardDesc}>
              Upload the payment confirmation screenshot from your UPI app
            </Text>

            {screenshot ? (
              /* Image preview — responsive */
              <View style={s.previewContainer}>
                <Image
                  source={{ uri: screenshot.uri }}
                  style={s.previewImage}
                  resizeMode="contain"
                />
                {!submitted && (
                  <TouchableOpacity
                    style={s.changePhotoBtn}
                    onPress={pickScreenshot}
                    activeOpacity={0.8}
                  >
                    <Text style={s.changePhotoBtnTxt}>🔄 Change Screenshot</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              /* Drop zone */
              <TouchableOpacity
                style={s.dropZone}
                onPress={pickScreenshot}
                activeOpacity={0.85}
              >
                <Text style={s.dropIcon}>📸</Text>
                <Text style={s.dropTitle}>Upload Payment Screenshot</Text>
                <Text style={s.dropDesc}>Tap to select from your gallery</Text>
                <View style={s.dropBtn}>
                  <Text style={s.dropBtnTxt}>Select Screenshot</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Submit button */}
          <View style={s.submitSection}>
            <TouchableOpacity
              style={[
                s.submitBtn,
                (!screenshot || uploading || submitted) && s.submitBtnOff,
              ]}
              onPress={handleSubmit}
              disabled={!screenshot || uploading || submitted}
              activeOpacity={0.88}
            >
              {uploading ? (
                <View style={s.submitBtnInner}>
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: rs(8) }} />
                  <Text style={s.submitBtnTxt}>Uploading...</Text>
                </View>
              ) : submitted ? (
                <Text style={s.submitBtnTxt}>✅ Submitted — Waiting for Admin</Text>
              ) : (
                <Text style={s.submitBtnTxt}>Submit for Verification</Text>
              )}
            </TouchableOpacity>

            {submitted && (
              <View style={s.submittedNote}>
                <Text style={s.submittedNoteTitle}>⏳ Waiting for Admin Verification</Text>
                <Text style={s.submittedNoteSub}>
                  Admin will review your screenshot.{'\n'}
                  Your account will unlock automatically when approved.
                </Text>
              </View>
            )}
          </View>

          {/* Security note */}
          <View style={s.securityNote}>
            <Text style={s.securityNoteTxt}>
              🔒 Only admin can unlock your account after verifying the screenshot.
              This is to prevent fraud and ensure secure payments.
            </Text>
          </View>

          <View style={{ height: rs(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: '#F4F6F8' },
  scroll:             { flexGrow: 1, paddingBottom: rs(24) },

  // Header
  header:             {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    backgroundColor:  '#fff',
    paddingHorizontal: H_PAD,
    paddingVertical:  rs(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation:        2,
  },
  backBtn:            {
    width:            rs(40),
    height:           rs(40),
    borderRadius:     rs(20),
    backgroundColor:  '#F4F5F7',
    alignItems:       'center',
    justifyContent:   'center',
  },
  headerTitle:        {
    fontSize:         rf(17),
    fontWeight:       '800',
    color:            '#111827',
    flex:             1,
    textAlign:        'center',
  },

  // Info banner
  infoBanner:         { backgroundColor: '#EFF6FF', marginHorizontal: rs(16), marginTop: rs(16), borderRadius: rs(14), padding: rs(16), borderLeftWidth: rs(4), borderLeftColor: '#3B82F6', alignItems: 'center' },
  infoBannerTitle:    { fontSize: rf(22), fontWeight: '900', color: '#1D4ED8', marginBottom: rs(4) },
  infoBannerSub:      { fontSize: rf(13), color: '#3B82F6', textAlign: 'center', lineHeight: rf(19) },

  // Card
  card:               { backgroundColor: '#fff', marginHorizontal: rs(16), marginTop: rs(12), borderRadius: rs(16), padding: rs(16), elevation: 1 },
  cardTitle:          { fontSize: rf(15), fontWeight: '800', color: '#111827', marginBottom: rs(4) },
  req:                { color: '#EF4444' },
  cardDesc:           { fontSize: rf(13), color: '#6B7280', marginBottom: rs(14), lineHeight: rf(18) },

  // Drop zone
  dropZone:           { borderWidth: rs(2), borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: rs(16), paddingVertical: rs(32), alignItems: 'center', backgroundColor: '#F9FAFB' },
  dropIcon:           { fontSize: rf(44), marginBottom: rs(12) },
  dropTitle:          { fontSize: rf(15), fontWeight: '700', color: COLORS.primary, marginBottom: rs(4) },
  dropDesc:           { fontSize: rf(13), color: '#9CA3AF', marginBottom: rs(16) },
  dropBtn:            { backgroundColor: COLORS.primary, borderRadius: rs(10), paddingVertical: rs(10), paddingHorizontal: rs(24) },
  dropBtnTxt:         { color: '#fff', fontWeight: '700', fontSize: rf(14) },

  // Preview — responsive image
  previewContainer:   { alignItems: 'center' },
  previewImage:       {
    width:            '100%',
    height:           undefined,
    aspectRatio:      1.5,
    resizeMode:       'contain',
    borderRadius:     rs(12),
    marginBottom:     rs(12),
    backgroundColor:  '#F9FAFB',
  },
  changePhotoBtn:     { backgroundColor: '#F3F4F6', borderRadius: rs(10), paddingVertical: rs(9), paddingHorizontal: rs(20) },
  changePhotoBtnTxt:  { fontSize: rf(13), color: '#374151', fontWeight: '600' },

  // Submit
  submitSection:      { paddingHorizontal: rs(16), marginTop: rs(16) },
  submitBtn:          { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(16), alignItems: 'center', marginBottom: rs(12) },
  submitBtnOff:       { backgroundColor: '#D1D5DB' },
  submitBtnInner:     { flexDirection: 'row', alignItems: 'center' },
  submitBtnTxt:       { color: '#fff', fontSize: rf(15), fontWeight: '800' },

  // Submitted note
  submittedNote:      { backgroundColor: '#FFF3CD', borderRadius: rs(12), padding: rs(14), borderLeftWidth: rs(4), borderLeftColor: '#F59E0B' },
  submittedNoteTitle: { fontSize: rf(14), fontWeight: '700', color: '#92400E', marginBottom: rs(6) },
  submittedNoteSub:   { fontSize: rf(12), color: '#92400E', lineHeight: rf(18) },

  // Security note
  securityNote:       { marginHorizontal: rs(16), marginTop: rs(12), backgroundColor: '#F4F5F7', borderRadius: rs(12), padding: rs(14) },
  securityNoteTxt:    { fontSize: rf(12), color: '#6B7280', lineHeight: rf(18), textAlign: 'center' },
});
