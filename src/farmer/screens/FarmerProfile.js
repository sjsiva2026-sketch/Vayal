// src/farmer/screens/FarmerProfile.js
// UPDATED: Profile photo upload + DELETE feature

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Alert, TouchableOpacity, TextInput, StatusBar,
  ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker  from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { FIcon }           from '../../../utils/icons';
import { useAuth }         from '../../../context/AuthContext';
import { useUser }         from '../../../context/UserContext';
import { updateUser }      from '../../../firebase/firestore';
import { storage }         from '../../../firebase/config';
import { logout }          from '../../../firebase/auth';
import DistrictTalukPicker from '../../common/components/DistrictTalukPicker';
import { COLORS }          from '../../../constants/colors';
import { rs, rf, H_PAD }   from '../../../utils/responsive';

const PHOTO_PATH = (uid) => `profiles/${uid}/profile.jpg`;

export default function FarmerProfile({ navigation }) {
  const { setUser }                                  = useAuth();
  const { userProfile, updateProfile, clearProfile } = useUser();
  const uid = userProfile?.id || '';

  const [name,         setName]         = useState(userProfile?.name     || '');
  const [district,     setDistrict]     = useState(userProfile?.district || '');
  const [taluk,        setTaluk]        = useState(userProfile?.taluk    || '');
  const [village,      setVillage]      = useState(userProfile?.village  || '');
  const [loading,      setLoading]      = useState(false);
  const [editMode,     setEditMode]     = useState(false);
  const [photoURL,     setPhotoURL]     = useState(userProfile?.profilePhotoUrl || userProfile?.photoURL || null);
  const [photoLoading, setPhotoLoading] = useState(false);

  // ── Photo options: Upload / Delete ─────────────────────────────────────
  const handlePhotoPress = () => {
    const options = [
      { text: '📷 Camera',        onPress: () => openPicker('camera')  },
      { text: '🖼️ Photo Library', onPress: () => openPicker('library') },
    ];
    if (photoURL) {
      options.push({ text: '🗑️ Delete Photo', style: 'destructive', onPress: handleDeletePhoto });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Profile Photo', 'Choose an option', options);
  };

  // Upload new photo
  const openPicker = async (source) => {
    try {
      const opts = { mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.75 };
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission required'); return; }
        result = await ImagePicker.launchCameraAsync(opts);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission required'); return; }
        result = await ImagePicker.launchImageLibraryAsync(opts);
      }
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      setPhotoLoading(true);
      try {
        const resp = await fetch(uri);
        const blob = await resp.blob();
        const sRef = ref(storage, PHOTO_PATH(uid));
        await uploadBytes(sRef, blob, { contentType: 'image/jpeg' });
        const url = await getDownloadURL(sRef);
        await updateUser(uid, { profilePhotoUrl: url });
        updateProfile({ profilePhotoUrl: url });
        setPhotoURL(url);
        Alert.alert('✅ Photo updated!');
      } catch (e) {
        console.warn('Upload error:', e.message);
        Alert.alert('Upload Failed', 'Could not upload photo. Try again.');
      } finally { setPhotoLoading(false); }
    } catch (e) {
      setPhotoLoading(false);
      Alert.alert('Error', e.message || 'Could not pick photo.');
    }
  };

  // Delete photo
  const handleDeletePhoto = () => {
    Alert.alert('Delete Photo', 'Remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setPhotoLoading(true);
        try {
          const sRef = ref(storage, PHOTO_PATH(uid));
          await deleteObject(sRef).catch(() => {}); // ignore if not exists
          await updateUser(uid, { profilePhotoUrl: null });
          updateProfile({ profilePhotoUrl: null });
          setPhotoURL(null);
        } catch (e) {
          Alert.alert('Error', 'Could not delete photo.');
        } finally { setPhotoLoading(false); }
      }},
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Name cannot be empty'); return; }
    if (!district)    { Alert.alert('Required', 'Select your district'); return; }
    if (!taluk)       { Alert.alert('Required', 'Select your taluk'); return; }
    setLoading(true);
    try {
      const updates = { name: name.trim(), district, taluk, village: village.trim() };
      await updateUser(uid, updates);
      updateProfile(updates);
      setEditMode(false);
      Alert.alert('Saved', 'Profile updated!');
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const handleLogout = () =>
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
          await logout(); clearProfile(); setUser(null);
          navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
        },
      },
    ]);

  const ACCOUNT_ITEMS = [
    { emoji: '📍', label: 'Set Location',   onPress: () => navigation.navigate('LocationSelect') },
    { emoji: '📋', label: 'My Bookings',    onPress: () => navigation.navigate('MyBookings') },
    { emoji: '❓', label: 'Help & Support', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={s.headerRow}>
            <Text style={s.headerTitle}>Profile</Text>
            <TouchableOpacity style={s.settingsBtn} onPress={() => setEditMode(e => !e)} activeOpacity={0.7}>
              <FIcon name="settings" size={rs(22)} color="#374151" fallback="⚙️" />
            </TouchableOpacity>
          </View>
          <View style={s.divider} />

          {/* Avatar with upload + delete */}
          <View style={s.profileSection}>
            <TouchableOpacity style={s.avatarWrap} onPress={handlePhotoPress} activeOpacity={0.85}>
              {photoLoading ? (
                <View style={s.avatar}><ActivityIndicator color={COLORS.primary} size="large" /></View>
              ) : photoURL ? (
                <Image source={{ uri: photoURL }} style={s.avatarImg} />
              ) : (
                <View style={s.avatar}><Text style={s.avatarEmoji}>👤</Text></View>
              )}
              <View style={s.cameraBadge}>
                <Text style={{ fontSize: rf(13) }}>📷</Text>
              </View>
            </TouchableOpacity>
            <Text style={s.photoHint}>Tap to {photoURL ? 'change or delete' : 'upload'} photo</Text>

            <Text style={s.profileName}>{userProfile?.name || 'Farmer'}</Text>
            <Text style={s.profilePhone}>+91 {userProfile?.phone || '—'}</Text>

            <TouchableOpacity style={s.locationRow} onPress={() => navigation.navigate('LocationSelect')} activeOpacity={0.8}>
              <Text style={{ fontSize: rf(14), marginRight: rs(4) }}>📍</Text>
              <Text style={s.locationTxt}>{userProfile?.taluk || '—'}, {userProfile?.district || 'Tamil Nadu'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.editBtn} onPress={() => setEditMode(e => !e)} activeOpacity={0.8}>
              <Text style={s.editBtnTxt}>{editMode ? '✕  Cancel' : '✏️  Edit Profile'}</Text>
            </TouchableOpacity>
          </View>

          {/* Edit form */}
          {editMode && (
            <View style={s.editCard}>
              <Text style={s.editCardTitle}>Edit Details</Text>
              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>Full Name *</Text>
                <TextInput style={s.fieldInput} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor="#9CA3AF" />
              </View>
              <DistrictTalukPicker district={district} taluk={taluk} onDistrictChange={setDistrict} onTalukChange={setTaluk} />
              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>Village (optional)</Text>
                <TextInput style={s.fieldInput} value={village} onChangeText={setVillage} placeholder="Your village" placeholderTextColor="#9CA3AF" />
              </View>
              <TouchableOpacity style={[s.saveBtn, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading} activeOpacity={0.88}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* Account section */}
          <View style={s.accountSection}>
            <Text style={s.accountTitle}>Account</Text>
            <View style={s.accountCard}>
              {ACCOUNT_ITEMS.map((item, i, arr) => (
                <TouchableOpacity key={item.label} style={[s.accountRow, i < arr.length - 1 && s.accountRowBorder]} onPress={item.onPress} activeOpacity={0.7}>
                  <Text style={s.accountEmoji}>{item.emoji}</Text>
                  <Text style={s.accountLabel}>{item.label}</Text>
                  <FIcon name="chevron-right" size={rs(18)} color="#9CA3AF" fallback="›" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Text style={s.logoutTxt}>⏻  Logout</Text>
          </TouchableOpacity>

          <View style={{ height: rs(32) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#fff' },
  scroll:          { flexGrow: 1, paddingBottom: rs(20) },
  headerRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: H_PAD, paddingVertical: rs(14) },
  headerTitle:     { fontSize: rf(22), fontWeight: '900', color: '#111827' },
  settingsBtn:     { width: rs(40), height: rs(40), alignItems: 'center', justifyContent: 'center' },
  divider:         { height: 1, backgroundColor: '#F0F0F0' },
  profileSection:  { alignItems: 'center', paddingVertical: rs(24), paddingHorizontal: H_PAD },
  avatarWrap:      { position: 'relative', marginBottom: rs(8) },
  avatar:          { width: rs(96), height: rs(96), borderRadius: rs(48), backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarImg:       { width: rs(96), height: rs(96), borderRadius: rs(48) },
  avatarEmoji:     { fontSize: rf(44), color: '#fff' },
  cameraBadge:     { position: 'absolute', bottom: rs(2), right: rs(2), width: rs(30), height: rs(30), borderRadius: rs(15), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: rs(2), borderColor: '#E5E7EB', elevation: 3 },
  photoHint:       { fontSize: rf(11), color: '#9CA3AF', marginBottom: rs(10) },
  profileName:     { fontSize: rf(22), fontWeight: '900', color: '#111827', marginBottom: rs(4) },
  profilePhone:    { fontSize: rf(14), color: '#6B7280', marginBottom: rs(6) },
  locationRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: rs(14) },
  locationTxt:     { fontSize: rf(13), color: COLORS.primary, fontWeight: '700' },
  editBtn:         { borderWidth: rs(1.5), borderColor: COLORS.primary, borderRadius: rs(10), paddingHorizontal: rs(20), paddingVertical: rs(9) },
  editBtnTxt:      { fontSize: rf(14), color: COLORS.primary, fontWeight: '700' },
  editCard:        { marginHorizontal: H_PAD, backgroundColor: '#F9FAFB', borderRadius: rs(16), padding: rs(16), marginBottom: rs(20) },
  editCardTitle:   { fontSize: rf(15), fontWeight: '800', color: '#111827', marginBottom: rs(14) },
  fieldWrap:       { marginBottom: rs(14) },
  fieldLabel:      { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(8) },
  fieldInput:      { backgroundColor: '#fff', borderRadius: rs(12), borderWidth: rs(1.5), borderColor: '#E5E7EB', paddingVertical: rs(12), paddingHorizontal: rs(14), fontSize: rf(15), color: '#111827' },
  saveBtn:         { backgroundColor: COLORS.primary, borderRadius: rs(12), paddingVertical: rs(14), alignItems: 'center' },
  saveBtnTxt:      { color: '#fff', fontSize: rf(15), fontWeight: '800' },
  accountSection:  { paddingHorizontal: H_PAD, marginBottom: rs(20) },
  accountTitle:    { fontSize: rf(16), fontWeight: '700', color: '#374151', marginBottom: rs(12) },
  accountCard:     { backgroundColor: '#F9FAFB', borderRadius: rs(16), overflow: 'hidden' },
  accountRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), paddingVertical: rs(15) },
  accountRowBorder:{ borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  accountEmoji:    { fontSize: rf(18), marginRight: rs(12), width: rs(32) },
  accountLabel:    { flex: 1, fontSize: rf(14), fontWeight: '600', color: '#111827' },
  logoutBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: H_PAD, backgroundColor: '#FEF2F2', borderRadius: rs(14), padding: rs(15) },
  logoutTxt:       { color: '#EF4444', fontWeight: '800', fontSize: rf(15) },
});
