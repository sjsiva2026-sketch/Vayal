// src/farmer/screens/FarmerProfile.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Alert, TouchableOpacity, TextInput, StatusBar,
  ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker    from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FIcon }           from '../../../utils/icons';
import { useAuth }         from '../../../context/AuthContext';
import { useUser }         from '../../../context/UserContext';
import { updateUser }      from '../../../firebase/firestore';
import { storage }         from '../../../firebase/config';
import { logout }          from '../../../firebase/auth';
import DistrictTalukPicker from '../../common/components/DistrictTalukPicker';
import { COLORS }          from '../../../constants/colors';
import { rs, rf, H_PAD }   from '../../../utils/responsive';

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
  const [photoURI,     setPhotoURI]     = useState(userProfile?.photoURL || null);
  const [photoLoading, setPhotoLoading] = useState(false);

  const handlePickPhoto = () =>
    Alert.alert('Profile Photo', 'Choose option', [
      { text: 'Camera',        onPress: () => openPicker('camera')  },
      { text: 'Photo Library', onPress: () => openPicker('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const openPicker = async (source) => {
    try {
      const opts = { mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.7 };
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
        const sRef = ref(storage, `profilePhotos/${uid}.jpg`);
        await uploadBytes(sRef, blob);
        const url = await getDownloadURL(sRef);
        await updateUser(uid, { photoURL: url });
        updateProfile({ photoURL: url });
        setPhotoURI(url);
      } catch { setPhotoURI(uri); }
      finally { setPhotoLoading(false); }
    } catch (e) { setPhotoLoading(false); Alert.alert('Error', e.message || 'Could not pick photo.'); }
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
    { emoji: '⭐', label: 'Rate a Machine', onPress: () => {} },
    { emoji: '❓', label: 'Help & Support', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header row */}
          <View style={s.headerRow}>
            <Text style={s.headerTitle}>Profile</Text>
            <TouchableOpacity style={s.settingsBtn} onPress={() => setEditMode(e => !e)} activeOpacity={0.7}>
              <FIcon name="settings" size={rs(22)} color="#374151" fallback="⚙️" />
            </TouchableOpacity>
          </View>
          <View style={s.divider} />

          {/* Avatar */}
          <View style={s.profileSection}>
            <TouchableOpacity style={s.avatarWrap} onPress={handlePickPhoto} activeOpacity={0.85}>
              {photoLoading ? (
                <View style={s.avatar}><ActivityIndicator color={COLORS.primary} size="large" /></View>
              ) : photoURI ? (
                <Image source={{ uri: photoURI }} style={s.avatarImg} />
              ) : (
                <View style={s.avatar}><Text style={s.avatarEmoji}>👤</Text></View>
              )}
              <View style={s.cameraBadge}><Text style={{ fontSize: rf(13) }}>📷</Text></View>
            </TouchableOpacity>

            <Text style={s.profileName}>{userProfile?.name || 'Farmer'}</Text>
            <Text style={s.profilePhone}>+91 {userProfile?.phone || '—'}</Text>

            <TouchableOpacity style={s.locationRow} onPress={() => navigation.navigate('LocationSelect')} activeOpacity={0.8}>
              <Text style={{ fontSize: rf(14), marginRight: rs(4) }}>📍</Text>
              <Text style={s.locationTxt}>{userProfile?.taluk || '—'}, {userProfile?.district || 'Tamil Nadu'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.editBtn} onPress={() => setEditMode(e => !e)} activeOpacity={0.8}>
              <Text style={s.editBtnEmoji}>✏️</Text>
              <Text style={s.editBtnTxt}>{editMode ? 'Cancel Editing' : 'Edit Profile'}</Text>
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View style={s.statsRow}>
            {[
              { emoji: '🛒', bg: '#E8F5EE', value: '—', label: 'Orders'  },
              { emoji: '💰', bg: '#E8F5EE', value: '—', label: 'Spent'   },
              { emoji: '❤️', bg: '#FEE2E2', value: '—', label: 'Saved'   },
              { emoji: '⭐', bg: '#FEF9C3', value: '—', label: 'Reviews' },
            ].map(st => (
              <View key={st.label} style={s.statItem}>
                <View style={[s.statIconBubble, { backgroundColor: st.bg }]}>
                  <Text style={{ fontSize: rf(22) }}>{st.emoji}</Text>
                </View>
                <Text style={s.statValue}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
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
                <TouchableOpacity
                  key={item.label}
                  style={[s.accountRow, i < arr.length - 1 && s.accountRowBorder]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <Text style={s.accountEmoji}>{item.emoji}</Text>
                  <Text style={s.accountLabel}>{item.label}</Text>
                  <FIcon name="chevron-right" size={rs(18)} color="#9CA3AF" fallback="›" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Logout */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Text style={{ fontSize: rf(16), marginRight: rs(8) }}>⏻</Text>
            <Text style={s.logoutTxt}>Logout</Text>
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
  avatarWrap:      { position: 'relative', marginBottom: rs(14) },
  avatar:          { width: rs(96), height: rs(96), borderRadius: rs(48), backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarImg:       { width: rs(96), height: rs(96), borderRadius: rs(48) },
  avatarEmoji:     { fontSize: rf(44), color: '#fff' },
  cameraBadge:     { position: 'absolute', bottom: rs(2), right: rs(2), width: rs(30), height: rs(30), borderRadius: rs(15), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: rs(2), borderColor: '#E5E7EB', elevation: 3 },
  profileName:     { fontSize: rf(24), fontWeight: '900', color: '#111827', marginBottom: rs(4) },
  profilePhone:    { fontSize: rf(14), color: '#6B7280', marginBottom: rs(4) },
  locationRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: rs(16) },
  locationTxt:     { fontSize: rf(13), color: COLORS.primary, fontWeight: '700' },
  editBtn:         { flexDirection: 'row', alignItems: 'center', borderWidth: rs(1.5), borderColor: COLORS.primary, borderRadius: rs(10), paddingHorizontal: rs(18), paddingVertical: rs(9), marginTop: rs(4) },
  editBtnEmoji:    { fontSize: rf(16), marginRight: rs(6) },
  editBtnTxt:      { fontSize: rf(14), color: COLORS.primary, fontWeight: '700' },

  statsRow:        { flexDirection: 'row', paddingHorizontal: rs(10), paddingVertical: rs(16), borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0F0F0', marginBottom: rs(20) },
  statItem:        { flex: 1, alignItems: 'center' },
  statIconBubble:  { width: rs(48), height: rs(48), borderRadius: rs(24), alignItems: 'center', justifyContent: 'center', marginBottom: rs(8) },
  statValue:       { fontSize: rf(18), fontWeight: '900', color: '#111827', marginBottom: rs(2) },
  statLabel:       { fontSize: rf(11), color: '#9CA3AF' },

  editCard:        { marginHorizontal: H_PAD, backgroundColor: '#F9FAFB', borderRadius: rs(16), padding: rs(16), marginBottom: rs(20) },
  editCardTitle:   { fontSize: rf(15), fontWeight: '800', color: '#111827', marginBottom: rs(14) },
  fieldWrap:       { marginBottom: rs(14) },
  fieldLabel:      { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(8) },
  fieldInput:      { backgroundColor: '#fff', borderRadius: rs(12), borderWidth: rs(1.5), borderColor: '#E5E7EB', paddingVertical: rs(12), paddingHorizontal: rs(14), fontSize: rf(15), color: '#111827' },
  saveBtn:         { backgroundColor: COLORS.primary, borderRadius: rs(12), paddingVertical: rs(14), alignItems: 'center', marginTop: rs(4) },
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
