import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
  StatusBar, ActivityIndicator, TextInput,
} from 'react-native';
import { LinearGradient }    from 'expo-linear-gradient';
import { createUser }        from '../../../firebase/firestore';
import { useAuth }           from '../../../context/AuthContext';
import { useUser }           from '../../../context/UserContext';
import { COLORS }            from '../../../constants/colors';
import DistrictTalukPicker   from '../components/DistrictTalukPicker';

export default function ProfileSetup({ navigation, route }) {
  const uid   = route?.params?.uid   || '';
  const phone = route?.params?.phone || '';
  const role  = route?.params?.role  || 'farmer';

  const { setUserProfile: setAuthProfile } = useAuth();
  const { setUserProfile }                 = useUser();
  const isFarmer = role === 'farmer';

  const [name,     setName]     = useState('');
  const [district, setDistrict] = useState('');
  const [taluk,    setTaluk]    = useState('');
  const [village,  setVillage]  = useState('');
  const [loading,  setLoading]  = useState(false);

  if (!uid) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 52, marginBottom: 16 }}>⚠️</Text>
        <Text style={{ fontSize: 16, color: '#374151', textAlign: 'center', paddingHorizontal: 32 }}>
          Session expired. Please start over.
        </Text>
        <TouchableOpacity
          style={[s.btn, { marginTop: 24 }]}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] })}
        >
          <Text style={s.btnTxt}>Start Over</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your full name'); return; }
    if (!district)    { Alert.alert('Required', 'Please select your district'); return; }
    if (!taluk)       { Alert.alert('Required', 'Please select your taluk');    return; }
    setLoading(true);
    try {
      const profile = {
        role,
        phone:    phone.replace(/^\+91/, ''),
        name:     name.trim(),
        state:    'Tamil Nadu',
        district,
        taluk,
        village:  village.trim(),
        verified: false,
        isLocked: false,
      };
      await createUser(uid, profile);
      const fullProfile = { ...profile, id: uid };
      // Set in BOTH contexts so the app instantly knows the role
      setAuthProfile(fullProfile);
      setUserProfile(fullProfile);
      const home =
        role === 'owner' ? 'OwnerDashboard' :
        role === 'admin' ? 'AdminDashboard' :
        'FarmerHome';
      navigation.reset({ index: 0, routes: [{ name: home }] });
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save profile. Try again.');
      setLoading(false);
    }
  };

  const filled   = [name, district, taluk].filter(Boolean).length;
  const progress = filled / 3;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#145A3E" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

        <LinearGradient colors={['#145A3E', '#1C7C54', '#2E9E6B']} style={s.header}>
          <View style={s.iconBox}>
            <Text style={s.iconEmoji}>{isFarmer ? '👨‍🌾' : '🚜'}</Text>
          </View>
          <Text style={s.headerTitle}>Complete Profile</Text>
          <Text style={s.headerSub}>Helps us show machines near you</Text>
          <View style={s.phonePill}>
            <Text style={s.phonePillTxt}>📱  +91 {phone.replace(/^\+91/, '')}</Text>
          </View>
          <View style={s.progressWrap}>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={s.progressTxt}>{filled}/3 required fields</Text>
          </View>
        </LinearGradient>

        <ScrollView
          style={s.form}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.handle} />

          {/* Full Name */}
          <View style={s.fieldGroup}>
            <View style={s.labelRow}>
              <Text style={s.labelIcon}>👤</Text>
              <Text style={s.labelTxt}>Full Name <Text style={s.req}>*</Text></Text>
            </View>
            <View style={[s.inputWrap, name.length > 0 && s.inputWrapDone]}>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Selvam Kumar"
                placeholderTextColor="#C9D1DA"
              />
              {name.length > 0 && <Text style={s.check}>✓</Text>}
            </View>
          </View>

          <DistrictTalukPicker
            district={district}
            taluk={taluk}
            onDistrictChange={setDistrict}
            onTalukChange={setTaluk}
          />

          {/* Village */}
          <View style={s.fieldGroup}>
            <View style={s.labelRow}>
              <Text style={s.labelIcon}>🏘️</Text>
              <Text style={s.labelTxt}>Village <Text style={s.opt}>(optional)</Text></Text>
            </View>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                value={village}
                onChangeText={setVillage}
                placeholder="e.g. Kolathur"
                placeholderTextColor="#C9D1DA"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnOff]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={loading ? ['#D1D5DB', '#D1D5DB'] : ['#1C7C54', '#2E9E6B']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.btnGradient}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnTxt}>Save & Continue  →</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#145A3E' },
  header:        { paddingTop: 32, paddingBottom: 28, paddingHorizontal: 24, alignItems: 'center' },
  iconBox:       { width: 66, height: 66, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  iconEmoji:     { fontSize: 34 },
  headerTitle:   { fontSize: 24, fontWeight: '900', color: '#fff' },
  headerSub:     { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, marginBottom: 12 },
  phonePill:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16 },
  phonePillTxt:  { fontSize: 14, fontWeight: '700', color: '#fff' },
  progressWrap:  { width: '100%' },
  progressBg:    { height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill:  { height: '100%', backgroundColor: '#6EE7B7', borderRadius: 3 },
  progressTxt:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  form:          { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12 },
  handle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 24 },
  fieldGroup:    { marginBottom: 16 },
  labelRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  labelIcon:     { fontSize: 18, marginRight: 8 },
  labelTxt:      { fontSize: 14, fontWeight: '700', color: '#374151' },
  req:           { color: '#EF4444', fontWeight: '900' },
  opt:           { fontSize: 12, color: '#9CA3AF', fontWeight: '400' },
  inputWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 2, borderColor: '#E5E7EB', paddingHorizontal: 16 },
  inputWrapDone: { borderColor: COLORS.primary, backgroundColor: '#FAFFFE' },
  input:         { flex: 1, paddingVertical: 14, fontSize: 15, color: '#111827' },
  check:         { fontSize: 18, color: COLORS.primary, fontWeight: '900' },
  btn:           { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  btnOff:        { opacity: 0.7 },
  btnGradient:   { alignItems: 'center', justifyContent: 'center', paddingVertical: 17 },
  btnTxt:        { color: '#fff', fontSize: 17, fontWeight: '800' },
});
