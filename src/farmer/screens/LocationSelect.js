import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, TextInput,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { LinearGradient }    from 'expo-linear-gradient';
import { useUser }           from '../../../context/UserContext';
import { updateUser }        from '../../../firebase/firestore';
import { COLORS }            from '../../../constants/colors';
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#145A3E" />
      <LinearGradient colors={['#145A3E', '#1C7C54', '#2E9E6B']} style={s.header}>
        <View style={s.iconBox}><Text style={{ fontSize: 36 }}>📍</Text></View>
        <Text style={s.headerTitle}>Your Location</Text>
        <Text style={s.headerSub}>We Show Machines Available in Your Taluk</Text>
      </LinearGradient>

      <ScrollView style={s.form} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.handle} />

        {userProfile?.taluk ? (
          <View style={s.currentBox}>
            <Text style={s.currentLabel}>Current Location</Text>
            <View style={s.currentRow}>
              <Text style={{ fontSize: 16 }}>📍</Text>
              <Text style={s.currentTxt}> {userProfile.taluk}, {userProfile.district}</Text>
            </View>
          </View>
        ) : null}

        <View style={s.fieldGroup}>
          <View style={s.labelRow}>
            <Text style={s.labelIcon}>🏛️</Text>
            <Text style={s.labelTxt}> State</Text>
          </View>
          <View style={s.staticBox}>
            <Text style={s.staticTxt}>Tamil Nadu</Text>
            <Text style={s.staticCheck}>✓</Text>
          </View>
        </View>

        <DistrictTalukPicker district={district} taluk={taluk} onDistrictChange={setDistrict} onTalukChange={setTaluk} />

        <View style={s.fieldGroup}>
          <View style={s.labelRow}>
            <Text style={s.labelIcon}>🏘️</Text>
            <Text style={s.labelTxt}> Village <Text style={s.opt}>(optional)</Text></Text>
          </View>
          <View style={s.inputWrap}>
            <TextInput style={s.input} value={village} onChangeText={setVillage} placeholder="e.g. Kolathur" placeholderTextColor="#C9D1DA" />
          </View>
        </View>

        <TouchableOpacity style={[s.btn, loading && s.btnOff]} onPress={handleSave} disabled={loading} activeOpacity={0.88}>
          <LinearGradient colors={loading ? ['#D1D5DB','#D1D5DB'] : ['#1C7C54','#2E9E6B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGradient}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Find Machines in My Taluk  →</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#145A3E' },
  header:       { paddingTop: 32, paddingBottom: 28, paddingHorizontal: 24, alignItems: 'center' },
  iconBox:      { width: 66, height: 66, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  headerTitle:  { fontSize: 24, fontWeight: '900', color: '#fff' },
  headerSub:    { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  form:         { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12 },
  handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 24 },
  currentBox:   { backgroundColor: '#ECFDF5', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1.5, borderColor: '#6EE7B7' },
  currentLabel: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  currentRow:   { flexDirection: 'row', alignItems: 'center' },
  currentTxt:   { fontSize: 15, fontWeight: '700', color: '#065F46' },
  fieldGroup:   { marginBottom: 16 },
  labelRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  labelIcon:    { fontSize: 18 },
  labelTxt:     { fontSize: 14, fontWeight: '700', color: '#374151' },
  opt:          { fontSize: 12, color: '#9CA3AF', fontWeight: '400' },
  staticBox:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 2, borderColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 14 },
  staticTxt:    { fontSize: 15, fontWeight: '700', color: '#111827' },
  staticCheck:  { fontSize: 18, color: COLORS.primary },
  inputWrap:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 2, borderColor: '#E5E7EB', paddingHorizontal: 16 },
  input:        { flex: 1, paddingVertical: 14, fontSize: 15, color: '#111827' },
  btn:          { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  btnOff:       { opacity: 0.7 },
  btnGradient:  { alignItems: 'center', justifyContent: 'center', paddingVertical: 17 },
  btnTxt:       { color: '#fff', fontSize: 16, fontWeight: '800' },
});
