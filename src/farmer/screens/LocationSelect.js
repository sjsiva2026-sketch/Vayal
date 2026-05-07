// src/farmer/screens/LocationSelect.js
// Farmer selects district + taluk — responsive on all Android sizes

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { CommonActions }   from '@react-navigation/native';
import DistrictTalukPicker from '../../common/components/DistrictTalukPicker';
import { updateUser }      from '../../../firebase/firestore';
import { useUser }         from '../../../context/UserContext';
import { COLORS }          from '../../../constants/colors';
import { rs, rf, H_PAD }   from '../../../utils/responsive';
import { FIcon }           from '../../../utils/icons';

export default function LocationSelect({ navigation }) {
  const { userProfile, updateProfile } = useUser();
  const [district, setDistrict] = useState(userProfile?.district || '');
  const [taluk,    setTaluk]    = useState(userProfile?.taluk    || '');
  const [loading,  setLoading]  = useState(false);

  const handleSave = async () => {
    if (!district) { Alert.alert('Required', 'Select your district'); return; }
    if (!taluk)    { Alert.alert('Required', 'Select your taluk');    return; }
    setLoading(true);
    try {
      await updateUser(userProfile?.id, { district, taluk });
      updateProfile({ district, taluk });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <FIcon name="arrow-left" size={rs(20)} color="#111827" fallback="←" />
            </TouchableOpacity>
            <View style={s.iconCircle}>
              <Text style={s.iconEmoji}>📍</Text>
            </View>
            <Text style={s.title}>Set Your Location</Text>
            <Text style={s.subtitle}>
              We'll show machines available in your taluk
            </Text>
          </View>

          {/* Current location badge */}
          {(userProfile?.district || userProfile?.taluk) && (
            <View style={s.currentBox}>
              <Text style={s.currentLabel}>Current Location</Text>
              <Text style={s.currentValue}>
                {userProfile?.taluk || '—'}, {userProfile?.district || '—'}
              </Text>
            </View>
          )}

          {/* Picker */}
          <View style={s.pickerWrap}>
            <DistrictTalukPicker
              district={district}
              taluk={taluk}
              onDistrictChange={setDistrict}
              onTalukChange={setTaluk}
            />
          </View>

          {/* Save button */}
          <View style={s.btnWrap}>
            <TouchableOpacity
              style={[s.saveBtn, loading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.saveBtnTxt}>Save Location →</Text>
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
  safe:         { flex: 1, backgroundColor: '#F4F6F8' },
  scroll:       { flexGrow: 1, paddingBottom: rs(24) },
  header:       { backgroundColor: '#fff', paddingHorizontal: H_PAD, paddingTop: rs(12), paddingBottom: rs(20), borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  backBtn:      { alignSelf: 'flex-start', width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center', marginBottom: rs(16) },
  iconCircle:   { width: rs(64), height: rs(64), borderRadius: rs(32), backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: rs(12) },
  iconEmoji:    { fontSize: rf(30) },
  title:        { fontSize: rf(20), fontWeight: '900', color: '#111827', marginBottom: rs(6) },
  subtitle:     { fontSize: rf(13), color: '#6B7280', textAlign: 'center' },
  currentBox:   { backgroundColor: '#E8F5EE', marginHorizontal: H_PAD, marginTop: rs(16), borderRadius: rs(12), padding: rs(14), borderLeftWidth: rs(4), borderLeftColor: COLORS.primary },
  currentLabel: { fontSize: rf(12), color: '#065F46', marginBottom: rs(4) },
  currentValue: { fontSize: rf(15), fontWeight: '700', color: COLORS.primary },
  pickerWrap:   { paddingHorizontal: H_PAD, marginTop: rs(16) },
  btnWrap:      { paddingHorizontal: H_PAD, marginTop: rs(20) },
  saveBtn:      { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(15), alignItems: 'center' },
  saveBtnTxt:   { color: '#fff', fontSize: rf(15), fontWeight: '800' },
});
