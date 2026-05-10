// src/farmer/screens/FarmerProfile.js
// Full profile — photo upload/delete, edit details, stats, account menu, logout

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Alert,
  TouchableOpacity, TextInput, StatusBar, ActivityIndicator,
  Image, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { LinearGradient }   from 'expo-linear-gradient';
import * as ImagePicker     from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { FIcon }            from '../../../utils/icons';
import { useAuth }          from '../../../context/AuthContext';
import { useUser }          from '../../../context/UserContext';
import { updateUser }       from '../../../firebase/firestore';
import { storage }          from '../../../firebase/config';
import { logout }           from '../../../firebase/auth';
import DistrictTalukPicker  from '../../common/components/DistrictTalukPicker';
import { COLORS }           from '../../../constants/colors';
import { rs, rf, H_PAD }    from '../../../utils/responsive';

const { width: W } = Dimensions.get('window');
const AVATAR_SIZE  = rs(100);
const PHOTO_PATH   = (uid) => `profiles/${uid}/profile.jpg`;

export default function FarmerProfile({ navigation }) {
  const { setUser }                                  = useAuth();
  const { userProfile, updateProfile, clearProfile } = useUser();
  const uid = userProfile?.id || '';

  const [name,         setName]         = useState(userProfile?.name     || '');
  const [district,     setDistrict]     = useState(userProfile?.district || '');
  const [taluk,        setTaluk]        = useState(userProfile?.taluk    || '');
  const [village,      setVillage]      = useState(userProfile?.village  || '');
  const [saving,       setSaving]       = useState(false);
  const [editMode,     setEditMode]     = useState(false);
  const [photoURL,     setPhotoURL]     = useState(
    userProfile?.profilePhotoUrl || userProfile?.photoURL || null
  );
  const [photoLoading, setPhotoLoading] = useState(false);

  // ── Photo: upload / delete ─────────────────────────────────────────────
  const handlePhotoPress = () => {
    const opts = [
      { text: '📷 Camera',         onPress: () => pickPhoto('camera')  },
      { text: '🖼️ Choose from Gallery', onPress: () => pickPhoto('gallery') },
    ];
    if (photoURL) opts.push({ text: '🗑️ Remove Photo', style: 'destructive', onPress: deletePhoto });
    opts.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Profile Photo', 'Choose an option', opts);
  };

  const pickPhoto = async (src) => {
    try {
      const pickerOpts = { mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.75 };
      let result;
      if (src === 'camera') {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) { Alert.alert('Permission needed', 'Allow camera access to take photo.'); return; }
        result = await ImagePicker.launchCameraAsync(pickerOpts);
      } else {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) { Alert.alert('Permission needed', 'Allow gallery access to choose photo.'); return; }
        result = await ImagePicker.launchImageLibraryAsync(pickerOpts);
      }
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setPhotoLoading(true);
      try {
        const uri  = result.assets[0].uri;
        const resp = await fetch(uri);
        const blob = await resp.blob();
        const sRef = ref(storage, PHOTO_PATH(uid));
        await uploadBytes(sRef, blob, { contentType: 'image/jpeg' });
        const url  = await getDownloadURL(sRef);
        await updateUser(uid, { profilePhotoUrl: url });
        updateProfile({ profilePhotoUrl: url });
        setPhotoURL(url);
        Alert.alert('✅ Photo Updated', 'Your profile photo has been updated.');
      } catch {
        Alert.alert('Upload Failed', 'Could not upload photo. Try again.');
      } finally { setPhotoLoading(false); }
    } catch (e) { setPhotoLoading(false); }
  };

  const deletePhoto = () =>
    Alert.alert('Remove Photo', 'Remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
          setPhotoLoading(true);
          try {
            await deleteObject(ref(storage, PHOTO_PATH(uid))).catch(() => {});
            await updateUser(uid, { profilePhotoUrl: null });
            updateProfile({ profilePhotoUrl: null });
            setPhotoURL(null);
          } catch { Alert.alert('Error', 'Could not remove photo.'); }
          finally { setPhotoLoading(false); }
        },
      },
    ]);

  // ── Save profile ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your name'); return; }
    if (!district)    { Alert.alert('Required', 'Please select your district'); return; }
    if (!taluk)       { Alert.alert('Required', 'Please select your taluk'); return; }
    setSaving(true);
    try {
      const updates = { name: name.trim(), district, taluk, village: village.trim() };
      await updateUser(uid, updates);
      updateProfile(updates);
      setEditMode(false);
      Alert.alert('✅ Saved', 'Your profile has been updated.');
    } catch { Alert.alert('Error', 'Could not save. Try again.'); }
    finally { setSaving(false); }
  };

  // ── Logout ─────────────────────────────────────────────────────────────
  const handleLogout = () =>
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
          await logout(); clearProfile(); setUser(null);
          navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
        },
      },
    ]);

  const initials = (userProfile?.name || 'F')[0].toUpperCase();

  const MENU = [
    { icon: '📍', label: 'Set Location',    sub: `${userProfile?.taluk || '—'}, ${userProfile?.district || '—'}`,  onPress: () => navigation.navigate('LocationSelect') },
    { icon: '📋', label: 'My Bookings',     sub: 'View all your bookings',          onPress: () => navigation.navigate('MyBookings') },
    { icon: '⭐', label: 'Rate a Machine',  sub: 'Share your experience',           onPress: () => {} },
    { icon: '🔔', label: 'Notifications',   sub: 'Booking alerts & updates',        onPress: () => {} },
    { icon: '❓', label: 'Help & Support',  sub: 'FAQs and contact us',             onPress: () => {} },
    { icon: '🛡️', label: 'Privacy Policy', sub: 'How we use your data',            onPress: () => {} },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── HEADER ── */}
          <LinearGradient colors={['#1C7C54', '#2E9E6B']} style={s.header}>
            {/* Avatar */}
            <TouchableOpacity style={s.avatarWrap} onPress={handlePhotoPress} activeOpacity={0.88}>
              {photoLoading ? (
                <View style={s.avatar}><ActivityIndicator color="#fff" size="large" /></View>
              ) : photoURL ? (
                <Image source={{ uri: photoURL }} style={s.avatarImg} />
              ) : (
                <View style={s.avatar}><Text style={s.avatarInitial}>{initials}</Text></View>
              )}
              <View style={s.editPhotoBadge}>
                <Text style={{ fontSize: rf(12) }}>✏️</Text>
              </View>
            </TouchableOpacity>
            <Text style={s.headerName}>{userProfile?.name || 'Farmer'}</Text>
            <Text style={s.headerPhone}>+91 {userProfile?.phone || '—'}</Text>
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeTxt}>👨‍🌾 Farmer</Text>
            </View>
          </LinearGradient>

          {/* ── STATS ── */}
          <View style={s.statsRow}>
            {[
              { label: 'Bookings', value: '—', icon: '📋', color: '#3B82F6' },
              { label: 'District', value: userProfile?.district || '—', icon: '🗺️', color: '#1C7C54' },
              { label: 'Taluk',    value: userProfile?.taluk    || '—', icon: '📍', color: '#F59E0B' },
            ].map((st, i) => (
              <View key={st.label} style={[s.statItem, i < 2 && s.statBorder]}>
                <Text style={[s.statValue, { color: st.color }]} numberOfLines={1}>{st.value}</Text>
                <Text style={s.statLabel}>{st.icon} {st.label}</Text>
              </View>
            ))}
          </View>

          {/* ── EDIT PROFILE BUTTON ── */}
          <TouchableOpacity
            style={[s.editProfileBtn, editMode && s.editProfileBtnActive]}
            onPress={() => setEditMode(e => !e)}
            activeOpacity={0.85}
          >
            <Text style={[s.editProfileBtnTxt, editMode && { color: '#EF4444' }]}>
              {editMode ? '✕  Cancel Editing' : '✏️  Edit Profile'}
            </Text>
          </TouchableOpacity>

          {/* ── EDIT FORM ── */}
          {editMode && (
            <View style={s.editSection}>
              <Text style={s.sectionTitle}>Personal Information</Text>
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Full Name</Text>
                <TextInput
                  style={s.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your full name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <DistrictTalukPicker
                district={district} taluk={taluk}
                onDistrictChange={setDistrict} onTalukChange={setTaluk}
              />
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Village <Text style={s.optional}>(optional)</Text></Text>
                <TextInput
                  style={s.input}
                  value={village}
                  onChangeText={setVillage}
                  placeholder="Your village name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.88}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.saveBtnTxt}>Save Changes</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* ── MENU ── */}
          <Text style={s.sectionTitle} style={{ paddingHorizontal: H_PAD, marginTop: rs(20), marginBottom: rs(8), fontSize: rf(13), fontWeight: '700', color: '#6B7280' }}>ACCOUNT</Text>
          <View style={s.menuCard}>
            {MENU.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[s.menuRow, i < MENU.length - 1 && s.menuRowBorder]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={s.menuIconWrap}>
                  <Text style={s.menuIcon}>{item.icon}</Text>
                </View>
                <View style={s.menuBody}>
                  <Text style={s.menuLabel}>{item.label}</Text>
                  <Text style={s.menuSub} numberOfLines={1}>{item.sub}</Text>
                </View>
                <FIcon name="chevron-right" size={rs(18)} color="#D1D5DB" fallback="›" />
              </TouchableOpacity>
            ))}
          </View>

          {/* ── LOGOUT ── */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Text style={s.logoutIcon}>⏻</Text>
            <Text style={s.logoutTxt}>Logout</Text>
          </TouchableOpacity>

          {/* App version */}
          <Text style={s.version}>நம்ம வயல் 🌾  v1.0.4</Text>

          <View style={{ height: rs(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#F4F5F7' },
  scroll:            { flexGrow: 1, paddingBottom: rs(20) },

  // Header
  header:            { paddingTop: rs(32), paddingBottom: rs(28), alignItems: 'center' },
  avatarWrap:        { position: 'relative', marginBottom: rs(14) },
  avatar:            { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: rs(3), borderColor: 'rgba(255,255,255,0.6)' },
  avatarImg:         { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderWidth: rs(3), borderColor: 'rgba(255,255,255,0.6)' },
  avatarInitial:     { fontSize: rf(42), fontWeight: '900', color: '#fff' },
  editPhotoBadge:    { position: 'absolute', bottom: rs(0), right: rs(0), width: rs(30), height: rs(30), borderRadius: rs(15), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4, borderWidth: rs(2), borderColor: '#E5E7EB' },
  headerName:        { fontSize: rf(22), fontWeight: '900', color: '#fff', marginBottom: rs(4) },
  headerPhone:       { fontSize: rf(14), color: 'rgba(255,255,255,0.8)', marginBottom: rs(10) },
  headerBadge:       { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: rs(20), paddingHorizontal: rs(14), paddingVertical: rs(5) },
  headerBadgeTxt:    { fontSize: rf(12), color: '#fff', fontWeight: '700' },

  // Stats
  statsRow:          { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: rs(16), marginTop: -rs(16), borderRadius: rs(16), elevation: 4, overflow: 'hidden', marginBottom: rs(12) },
  statItem:          { flex: 1, alignItems: 'center', paddingVertical: rs(14) },
  statBorder:        { borderRightWidth: 1, borderRightColor: '#F0F0F0' },
  statValue:         { fontSize: rf(14), fontWeight: '800', marginBottom: rs(4) },
  statLabel:         { fontSize: rf(10), color: '#9CA3AF' },

  // Edit profile button
  editProfileBtn:    { marginHorizontal: rs(16), marginBottom: rs(4), backgroundColor: '#fff', borderRadius: rs(12), paddingVertical: rs(13), alignItems: 'center', borderWidth: rs(1.5), borderColor: COLORS.primary, elevation: 1 },
  editProfileBtnActive: { borderColor: '#EF4444' },
  editProfileBtnTxt: { fontSize: rf(14), fontWeight: '700', color: COLORS.primary },

  // Edit form
  editSection:       { backgroundColor: '#fff', marginHorizontal: rs(16), borderRadius: rs(16), padding: rs(16), marginBottom: rs(12), elevation: 1 },
  sectionTitle:      { fontSize: rf(13), fontWeight: '700', color: '#6B7280', marginBottom: rs(12) },
  inputGroup:        { marginBottom: rs(14) },
  inputLabel:        { fontSize: rf(13), fontWeight: '600', color: '#374151', marginBottom: rs(6) },
  optional:          { fontWeight: '400', color: '#9CA3AF' },
  input:             { backgroundColor: '#F9FAFB', borderWidth: rs(1.5), borderColor: '#E5E7EB', borderRadius: rs(12), paddingVertical: rs(12), paddingHorizontal: rs(14), fontSize: rf(14), color: '#111827' },
  saveBtn:           { backgroundColor: COLORS.primary, borderRadius: rs(12), paddingVertical: rs(14), alignItems: 'center', marginTop: rs(4) },
  saveBtnTxt:        { color: '#fff', fontSize: rf(15), fontWeight: '800' },

  // Menu
  menuCard:          { backgroundColor: '#fff', marginHorizontal: rs(16), borderRadius: rs(16), overflow: 'hidden', elevation: 1, marginBottom: rs(12), marginTop: rs(6) },
  menuRow:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), paddingVertical: rs(14) },
  menuRowBorder:     { borderBottomWidth: 1, borderBottomColor: '#F4F5F7' },
  menuIconWrap:      { width: rs(38), height: rs(38), borderRadius: rs(10), backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center', marginRight: rs(12) },
  menuIcon:          { fontSize: rf(18) },
  menuBody:          { flex: 1 },
  menuLabel:         { fontSize: rf(14), fontWeight: '600', color: '#111827', marginBottom: rs(2) },
  menuSub:           { fontSize: rf(11), color: '#9CA3AF' },

  // Logout
  logoutBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8), marginHorizontal: rs(16), backgroundColor: '#FEF2F2', borderRadius: rs(14), paddingVertical: rs(15), marginBottom: rs(8) },
  logoutIcon:        { fontSize: rf(18), color: '#EF4444' },
  logoutTxt:         { fontSize: rf(15), fontWeight: '800', color: '#EF4444' },
  version:           { textAlign: 'center', fontSize: rf(11), color: '#9CA3AF' },
});
