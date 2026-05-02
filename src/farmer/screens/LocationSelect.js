// src/farmer/screens/LocationSelect.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, TextInput, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useUser }           from '../../../context/UserContext';
import { updateUser }        from '../../../firebase/firestore';
import { COLORS }            from '../../../constants/colors';
import { rs, rf, H_PAD }     from '../../../utils/responsive';
import { FIcon, IIcon }      from '../../../utils/icons';
import DistrictTalukPicker   from '../../common/components/DistrictTalukPicker';

export default function LocationSelect({ navigation }) {
  const { userProfile, updateProfile } = useUser();
  const uid = userProfile?.id || '';

  const [district, setDistrict] = useState(userProfile?.district || '');
  const [taluk,    setTaluk]    = useState(userProfile?.taluk    || '');
  const [village,  setVillage]  = useState(userProfile?.village  || '');
  const [loading,  setLoading]  = useState(false);

  const handleSave = async () => {
    if (!district) { Alert.alert('Required', 'Please select your district'); return; }
    if (!taluk)    { Alert.alert('Required', 'Please select your taluk');    return; }
    setLoading(true);
    try {
      const updates = { district, taluk, village: village.trim() };
      await updateUser(uid, updates);
      updateProfile(updates);
      navigation.navigate('Category');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.iconCircle}>
          <IIcon name="location" size={28} color={COLORS.primary} fallback="📍" />
        </View>
        <Text style={s.title}>Your Location</Text>
        <Text style={s.subtitle}>We show machines available in your taluk</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={s.form} contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.handle} />

          {userProfile?.taluk && (
            <View style={s.currentBox}>
              <Text style={s.currentLabel}>Current Location</Text>
              <Text style={s.currentTxt}>📍 {userProfile.taluk}, {userProfile.district}</Text>
            </View>
          )}

          {/* State — static */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>🏛️ State</Text>
            <View style={s.staticBox}>
              <Text style={s.staticTxt}>Tamil Nadu</Text>
              <Text style={{ color: COLORS.primary, fontSize: rf(18) }}>✓</Text>
            </View>
          </View>

          <DistrictTalukPicker district={district} taluk={taluk} onDistrictChange={setDistrict} onTalukChange={setTaluk} />

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>🏘️ Village <Text style={s.opt}>(optional)</Text></Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} value={village} onChangeText={setVillage} placeholder="e.g. Kolathur" placeholderTextColor="#C9D1DA" />
            </View>
          </View>

          <View style={s.infoBox}>
            <FIcon name="info" size={15} color={COLORS.primary} fallback="ℹ️" style={{ marginRight: rs(8) }} />
            <Text style={s.infoTxt}>Machines near your taluk will appear in results</Text>
          </View>

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading} activeOpacity={0.88}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnTxt}>Find Machines in My Taluk →</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#fff' },
  header:       { alignItems: 'center', paddingTop: rs(24), paddingBottom: rs(20), paddingHorizontal: H_PAD, backgroundColor: '#fff' },
  iconCircle:   { width: rs(64), height: rs(64), borderRadius: rs(32), backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: rs(12) },
  title:        { fontSize: rf(22), fontWeight: '900', color: '#111827', marginBottom: rs(6) },
  subtitle:     { fontSize: rf(13), color: COLORS.textSecondary, textAlign: 'center' },
  form:         { flex: 1, backgroundColor: '#F9FAFB', borderTopLeftRadius: rs(24), borderTopRightRadius: rs(24), paddingHorizontal: H_PAD, paddingTop: rs(12) },
  formContent:  { paddingBottom: rs(60), flexGrow: 1 },
  handle:       { width: rs(40), height: rs(4), borderRadius: rs(2), backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: rs(24) },
  currentBox:   { backgroundColor: COLORS.primaryLight, borderRadius: rs(14), padding: rs(14), marginBottom: rs(20), borderWidth: rs(1.5), borderColor: '#6EE7B7' },
  currentLabel: { fontSize: rf(12), color: COLORS.textSecondary, marginBottom: rs(4) },
  currentTxt:   { fontSize: rf(15), fontWeight: '700', color: COLORS.primaryDark },
  fieldGroup:   { marginBottom: rs(16) },
  fieldLabel:   { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(8) },
  opt:          { fontSize: rf(12), color: COLORS.textSecondary, fontWeight: '400' },
  staticBox:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: rs(12), borderWidth: rs(2), borderColor: COLORS.border, paddingHorizontal: rs(16), paddingVertical: rs(14) },
  staticTxt:    { fontSize: rf(15), fontWeight: '700', color: '#111827' },
  inputWrap:    { backgroundColor: '#fff', borderRadius: rs(12), borderWidth: rs(2), borderColor: COLORS.border },
  input:        { paddingVertical: rs(13), paddingHorizontal: rs(16), fontSize: rf(15), color: '#111827' },
  infoBox:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, borderRadius: rs(12), padding: rs(12), marginBottom: rs(20) },
  infoTxt:      { fontSize: rf(13), color: COLORS.primaryDark, fontWeight: '600' },
  btn:          { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(15), alignItems: 'center' },
  btnTxt:       { color: '#fff', fontSize: rf(15), fontWeight: '800' },
});
