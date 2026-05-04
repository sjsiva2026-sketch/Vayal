// src/common/screens/ProfileSetup.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
  StatusBar, ActivityIndicator, TextInput,
} from 'react-native';
import { CommonActions }   from '@react-navigation/native';
import { createUser }      from '../../../firebase/firestore';
import { useAuth }         from '../../../context/AuthContext';
import { useUser }         from '../../../context/UserContext';
import DistrictTalukPicker from '../components/DistrictTalukPicker';
import { FIcon }           from '../../../utils/icons';
import { COLORS }          from '../../../constants/colors';
import { rs, rf, H_PAD }   from '../../../utils/responsive';

const ROLE_HOME = { farmer: 'FarmerHome', owner: 'OwnerHome', admin: 'AdminDashboard' };

export default function ProfileSetup({ navigation, route }) {
  const uid      = route?.params?.uid   || '';
  const phone    = route?.params?.phone || '';
  const role     = route?.params?.role  || 'farmer';
  const isFarmer = role === 'farmer';

  const { setUserProfile: setAuthProfile } = useAuth();
  const { setUserProfile }                 = useUser();

  const [name,     setName]     = useState('');
  const [district, setDistrict] = useState('');
  const [taluk,    setTaluk]    = useState('');
  const [village,  setVillage]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const goHome = () =>
    navigation.dispatch(CommonActions.reset({
      index: 0, routes: [{ name: ROLE_HOME[role] || 'RoleSelect' }],
    }));

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
    setLoading(true);
    try {
      const profile = {
        role,
        phone:        phone.replace(/^\+91/, ''),
        name:         name.trim(),
        state:        'Tamil Nadu',
        district,
        taluk,
        village:      village.trim(),
        verified:     false,
        isLocked:     false,
        accessGranted: role === 'farmer' ? true : false, // farmers auto-access, owners need KYC
        kycStatus:    role === 'farmer' ? 'verified' : 'not_submitted',
      };
      await createUser(uid, profile);
      const full = { ...profile, id: uid };
      setAuthProfile(full);
      setUserProfile(full);
      goHome();
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

      {/* KAV: shrinks content when keyboard opens */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Fixed header */}
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

          {/* Step dots */}
          <View style={s.stepsRow}>
            {steps.map((st, i) => (
              <View key={st.key} style={s.stepItem}>
                <View style={[s.stepDot, st.done && s.stepDotDone]}>
                  <Text style={[s.stepNum, st.done && { color: '#fff' }]}>{st.done ? '✓' : i + 1}</Text>
                </View>
                <Text style={[s.stepLabel, st.done && s.stepLabelDone]}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* Progress bar */}
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        {/* Scrollable form — flexGrow:1 ensures it fills available space */}
        <ScrollView
          style={s.formScroll}
          contentContainerStyle={s.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={s.handle} />

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

          {/* District + Taluk picker */}
          <DistrictTalukPicker
            district={district}
            taluk={taluk}
            onDistrictChange={setDistrict}
            onTalukChange={setTaluk}
          />

          {/* Village */}
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

          <TouchableOpacity
            style={[s.saveBtn, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnTxt}>Save & Continue →</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#fff' },

  header:        { backgroundColor: '#fff', paddingHorizontal: H_PAD, paddingTop: rs(12), paddingBottom: rs(12), borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backBtn:       { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center', marginBottom: rs(12) },
  titleRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: rs(14) },
  iconCircle:    { width: rs(52), height: rs(52), borderRadius: rs(14), alignItems: 'center', justifyContent: 'center' },
  title:         { fontSize: rf(19), fontWeight: '900', color: '#111827', marginBottom: rs(4) },
  phonePill:     { backgroundColor: '#F4F5F7', borderRadius: rs(10), paddingHorizontal: rs(8), paddingVertical: rs(3), alignSelf: 'flex-start' },
  phoneTxt:      { fontSize: rf(11), fontWeight: '700', color: '#374151' },
  stepsRow:      { flexDirection: 'row', marginBottom: rs(10) },
  stepItem:      { flexDirection: 'row', alignItems: 'center', marginRight: rs(14) },
  stepDot:       { width: rs(22), height: rs(22), borderRadius: rs(11), backgroundColor: '#F0F0F0', borderWidth: rs(2), borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginRight: rs(5) },
  stepDotDone:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepNum:       { fontSize: rf(10), fontWeight: '900', color: '#9CA3AF' },
  stepLabel:     { fontSize: rf(11), color: '#9CA3AF', fontWeight: '600' },
  stepLabelDone: { color: COLORS.primary, fontWeight: '700' },
  progressTrack: { height: rs(4), backgroundColor: '#F0F0F0', borderRadius: rs(2), overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: COLORS.primary, borderRadius: rs(2) },

  formScroll:    { flex: 1, backgroundColor: '#F9FAFB' },
  formContent:   { flexGrow: 1, paddingHorizontal: H_PAD, paddingTop: rs(12), paddingBottom: rs(80) },

  handle:        { width: rs(40), height: rs(4), borderRadius: rs(2), backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: rs(20) },
  fieldGroup:    { marginBottom: rs(14) },
  fieldLabel:    { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(7) },
  req:           { color: '#EF4444', fontWeight: '900' },
  opt:           { fontSize: rf(11), color: '#9CA3AF', fontWeight: '400' },
  inputWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: rs(12), borderWidth: rs(2), borderColor: '#E5E7EB' },
  inputWrapDone: { borderColor: COLORS.primary, backgroundColor: '#FAFFFE' },
  input:         { flex: 1, paddingVertical: rs(13), paddingHorizontal: rs(14), fontSize: rf(14), color: '#111827' },
  check:         { fontSize: rf(16), color: COLORS.primary, fontWeight: '900', paddingRight: rs(12) },
  infoBox:       { backgroundColor: '#E8F5EE', borderRadius: rs(12), padding: rs(11), marginBottom: rs(18) },
  infoTxt:       { fontSize: rf(12), color: '#065F46', fontWeight: '600' },
  saveBtn:       { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(15), alignItems: 'center' },
  saveBtnTxt:    { color: '#fff', fontSize: rf(15), fontWeight: '800' },
});
