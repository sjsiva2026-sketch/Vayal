// src/farmer/screens/FarmerProfile.js
// Full profile — photo upload/delete, stats, booking history, menu, logout

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Alert,
  TouchableOpacity, TextInput, StatusBar, ActivityIndicator,
  Image, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { LinearGradient }   from 'expo-linear-gradient';
import * as ImagePicker     from 'expo-image-picker';
import { onSnapshot, doc, collection, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { IIcon, FIcon }          from '../../../utils/icons';
import { useAuth }          from '../../../context/AuthContext';
import { useUser }          from '../../../context/UserContext';
import { updateUser }       from '../../../firebase/firestore';
import { storage, db }      from '../../../firebase/config';
import { logout }           from '../../../firebase/auth';
import DistrictTalukPicker  from '../../common/components/DistrictTalukPicker';
import { COLORS }           from '../../../constants/colors';
import { rs, rf, H_PAD }    from '../../../utils/responsive';

const AVATAR_SIZE = rs(100);
const PHOTO_PATH  = (uid) => `profiles/${uid}/profile.jpg`;
const SUPPORT_PHONE = '8189880949'; // ← Change this to your real support number

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
  const [photoURL,     setPhotoURL]     = useState(userProfile?.profilePhotoUrl || null);
  const [photoLoading, setPhotoLoading] = useState(false);

  // Booking stats
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, cancelled: 0 });
  const [recentBookings, setRecentBookings] = useState([]);

  // Realtime profile + booking listener
  useEffect(() => {
    if (!uid) return;

    // Profile listener
    const unsubProfile = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setPhotoURL(d.profilePhotoUrl || null);
        updateProfile({ ...d, id: uid });
      }
    });

    // Booking stats listener
    const q = query(collection(db, 'bookings'), where('farmerId', '==', uid));
    const unsubBookings = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const active    = all.filter(b => ['pending','accepted','ongoing'].includes(b.status)).length;
      const completed = all.filter(b => b.status === 'completed').length;
      const cancelled = all.filter(b => b.status === 'cancelled').length;
      setStats({ total: all.length, active, completed, cancelled });
      setRecentBookings(all.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)).slice(0,3));
    });

    return () => { unsubProfile(); unsubBookings(); };
  }, [uid]);

  // Photo pick
  const handlePhotoPress = () => {
    const opts = [
      { text: '📷 Camera',              onPress: () => pickPhoto('camera')  },
      { text: '🖼️ Choose from Gallery', onPress: () => pickPhoto('gallery') },
    ];
    if (photoURL) opts.push({ text: '🗑️ Remove Photo', style: 'destructive', onPress: deletePhoto });
    opts.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Profile Photo', 'Choose an option', opts);
  };

  const pickPhoto = async (src) => {
    try {
      const opts = { mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.75 };
      let result;
      if (src === 'camera') {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) { Alert.alert('Permission needed'); return; }
        result = await ImagePicker.launchCameraAsync(opts);
      } else {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) { Alert.alert('Permission needed'); return; }
        result = await ImagePicker.launchImageLibraryAsync(opts);
      }
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setPhotoLoading(true);
      try {
        const blob = await (await fetch(result.assets[0].uri)).blob();
        const sRef = ref(storage, PHOTO_PATH(uid));
        await uploadBytes(sRef, blob, { contentType: 'image/jpeg' });
        const url = await getDownloadURL(sRef);
        await updateUser(uid, { profilePhotoUrl: url });
        updateProfile({ profilePhotoUrl: url });
        setPhotoURL(url);
      } catch { Alert.alert('Upload Failed', 'Try again.'); }
      finally { setPhotoLoading(false); }
    } catch { setPhotoLoading(false); }
  };

  const deletePhoto = () =>
    Alert.alert('Remove Photo?', 'This will remove your profile photo.', [
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

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Enter your name'); return; }
    if (!district)    { Alert.alert('Required', 'Select district'); return; }
    if (!taluk)       { Alert.alert('Required', 'Select taluk'); return; }
    setSaving(true);
    try {
      const u = { name: name.trim(), district, taluk, village: village.trim() };
      await updateUser(uid, u);
      updateProfile(u);
      setEditMode(false);
      Alert.alert('✅ Saved', 'Profile updated!');
    } catch { Alert.alert('Error', 'Could not save.'); }
    finally { setSaving(false); }
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

  const initials = (userProfile?.name || 'F')[0].toUpperCase();

  const MENU = [
    { icon: '📋', label: 'My Bookings',    sub: `${stats.total} total bookings`,         onPress: () => navigation.navigate('MyBookings') },
    { icon: '📍', label: 'Set Location',   sub: `${userProfile?.taluk || '—'}, ${userProfile?.district || '—'}`, onPress: () => navigation.navigate('LocationSelect') },
    { icon: '🔔', label: 'Notifications',  sub: 'Booking alerts & updates',              onPress: () => {} },
    { icon: '🛡️', label: 'Privacy Policy', sub: 'How we use your data',                  onPress: () => {} },
    { icon: '📖', label: 'About App',      sub: 'நம்ம வயல் v1.0.4',                      onPress: () => {} },
  ];

  const STATUS_COLOR = { pending:'#F59E0B', accepted:'#22C55E', ongoing:'#3B82F6', completed:'#1C7C54', cancelled:'#9CA3AF', rejected:'#EF4444' };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#145A3E" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* HEADER */}
          <LinearGradient colors={['#145A3E', '#1C7C54', '#2E9E6B']} style={s.header}>
            <TouchableOpacity style={s.avatarWrap} onPress={handlePhotoPress} activeOpacity={0.88}>
              {photoLoading ? (
                <View style={s.avatar}><ActivityIndicator color="#fff" size="large" /></View>
              ) : photoURL ? (
                <Image source={{ uri: photoURL }} style={s.avatarImg} />
              ) : (
                <View style={s.avatar}><Text style={s.avatarInitial}>{initials}</Text></View>
              )}
              <View style={s.editBadge}><Text style={{ fontSize: rf(13) }}>📷</Text></View>
            </TouchableOpacity>
            <Text style={s.headerName}>{userProfile?.name || 'Farmer'}</Text>
            <Text style={s.headerPhone}>+91 {userProfile?.phone || '—'}</Text>
            <View style={s.headerBadge}><Text style={s.headerBadgeTxt}>👨‍🌾 Farmer</Text></View>
            <Text style={s.headerLocation}>📍 {userProfile?.taluk || '—'}, {userProfile?.district || 'Tamil Nadu'}</Text>
          </LinearGradient>

          {/* STATS ROW */}
          <View style={s.statsRow}>
            {[
              { label: 'Total',     value: stats.total,     color: '#3B82F6' },
              { label: 'Active',    value: stats.active,    color: '#22C55E' },
              { label: 'Done',      value: stats.completed, color: '#1C7C54' },
              { label: 'Cancelled', value: stats.cancelled, color: '#EF4444' },
            ].map((st, i, arr) => (
              <View key={st.label} style={[s.statItem, i < arr.length-1 && s.statBorder]}>
                <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* EDIT BUTTON */}
          <TouchableOpacity style={[s.editBtn, editMode && s.editBtnActive]} onPress={() => setEditMode(e=>!e)} activeOpacity={0.85}>
            <Text style={[s.editBtnTxt, editMode && { color: '#EF4444' }]}>{editMode ? '✕  Cancel' : '✏️  Edit Profile'}</Text>
          </TouchableOpacity>

          {/* EDIT FORM */}
          {editMode && (
            <View style={s.editCard}>
              <Text style={s.cardTitle}>Edit Profile</Text>
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Full Name</Text>
                <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#9CA3AF" />
              </View>
              <DistrictTalukPicker district={district} taluk={taluk} onDistrictChange={setDistrict} onTalukChange={setTaluk} />
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Village (optional)</Text>
                <TextInput style={s.input} value={village} onChangeText={setVillage} placeholder="Your village" placeholderTextColor="#9CA3AF" />
              </View>
              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.88}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* RECENT BOOKINGS */}
          {recentBookings.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionTitle}>Recent Bookings</Text>
                <TouchableOpacity onPress={() => navigation.navigate('MyBookings')} activeOpacity={0.7}>
                  <Text style={s.seeAll}>See all →</Text>
                </TouchableOpacity>
              </View>
              {recentBookings.map(b => (
                <View key={b.id} style={s.bookingCard}>
                  <View style={s.bookingLeft}>
                    <Text style={s.bookingMachine}>🚜 {b.machineTypeLabel || b.machineType || '—'}</Text>
                    <Text style={s.bookingDate}>📅 {b.date} · {b.timeSlot}</Text>
                  </View>
                  <View style={[s.bookingStatus, { backgroundColor: STATUS_COLOR[b.status]+'22' }]}>
                    <Text style={[s.bookingStatusTxt, { color: STATUS_COLOR[b.status] }]}>
                      {b.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* SUPPORT */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Support</Text>
            <View style={s.supportRow}>
              <TouchableOpacity
                style={s.supportBtn}
                onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {})}
                activeOpacity={0.85}
              >
                <Text style={s.supportIcon}>📞</Text>
                <Text style={s.supportTxt}>Call Support</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.supportBtn, s.supportBtnWA]}
                onPress={() =>
                  Linking.openURL(`https://wa.me/91${SUPPORT_PHONE}`).catch(() =>
                    Linking.openURL(`whatsapp://send?phone=91${SUPPORT_PHONE}`).catch(() => {})
                  )
                }
                activeOpacity={0.85}
              >
                <Text style={s.supportIcon}>💬</Text>
                <Text style={[s.supportTxt, s.supportTxtWA]}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* MENU */}
          <Text style={s.menuSectionTxt}>ACCOUNT</Text>
          <View style={s.menuCard}>
            {MENU.map((item, i) => (
              <TouchableOpacity key={item.label} style={[s.menuRow, i < MENU.length-1 && s.menuRowBorder]} onPress={item.onPress} activeOpacity={0.7}>
                <View style={s.menuIconWrap}><Text style={s.menuIcon}>{item.icon}</Text></View>
                <View style={s.menuBody}>
                  <Text style={s.menuLabel}>{item.label}</Text>
                  <Text style={s.menuSub} numberOfLines={1}>{item.sub}</Text>
                </View>
                <FIcon name="chevron-right" size={rs(18)} color="#D1D5DB" fallback="›" />
              </TouchableOpacity>
            ))}
          </View>

          {/* LOGOUT */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Text style={s.logoutTxt}>⏻  Logout</Text>
          </TouchableOpacity>

          <Text style={s.version}>நம்ம வயல் 🌾  v1.0.4</Text>
          <View style={{ height: rs(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F4F5F7' },
  scroll:          { flexGrow: 1, paddingBottom: rs(20) },
  header:          { paddingTop: rs(36), paddingBottom: rs(28), alignItems: 'center', paddingHorizontal: H_PAD },
  avatarWrap:      { position: 'relative', marginBottom: rs(12) },
  avatar:          { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE/2, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: rs(3), borderColor: 'rgba(255,255,255,0.6)' },
  avatarImg:       { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE/2, borderWidth: rs(3), borderColor: 'rgba(255,255,255,0.6)' },
  avatarInitial:   { fontSize: rf(42), fontWeight: '900', color: '#fff' },
  editBadge:       { position: 'absolute', bottom: 0, right: 0, width: rs(28), height: rs(28), borderRadius: rs(14), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  headerName:      { fontSize: rf(22), fontWeight: '900', color: '#fff', marginBottom: rs(3) },
  headerPhone:     { fontSize: rf(13), color: 'rgba(255,255,255,0.8)', marginBottom: rs(8) },
  headerBadge:     { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: rs(20), paddingHorizontal: rs(14), paddingVertical: rs(5), marginBottom: rs(6) },
  headerBadgeTxt:  { fontSize: rf(12), color: '#fff', fontWeight: '700' },
  headerLocation:  { fontSize: rf(12), color: 'rgba(255,255,255,0.7)' },
  statsRow:        { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: rs(16), marginTop: -rs(14), borderRadius: rs(16), elevation: 4, overflow: 'hidden', marginBottom: rs(12) },
  statItem:        { flex: 1, alignItems: 'center', paddingVertical: rs(14) },
  statBorder:      { borderRightWidth: 1, borderRightColor: '#F0F0F0' },
  statValue:       { fontSize: rf(18), fontWeight: '900', marginBottom: rs(3) },
  statLabel:       { fontSize: rf(10), color: '#9CA3AF' },
  editBtn:         { marginHorizontal: rs(16), marginBottom: rs(8), backgroundColor: '#fff', borderRadius: rs(12), paddingVertical: rs(13), alignItems: 'center', borderWidth: rs(1.5), borderColor: COLORS.primary },
  editBtnActive:   { borderColor: '#EF4444' },
  editBtnTxt:      { fontSize: rf(14), fontWeight: '700', color: COLORS.primary },
  editCard:        { backgroundColor: '#fff', marginHorizontal: rs(16), borderRadius: rs(16), padding: rs(16), marginBottom: rs(12) },
  cardTitle:       { fontSize: rf(14), fontWeight: '700', color: '#374151', marginBottom: rs(14) },
  inputGroup:      { marginBottom: rs(12) },
  inputLabel:      { fontSize: rf(13), fontWeight: '600', color: '#374151', marginBottom: rs(6) },
  input:           { backgroundColor: '#F9FAFB', borderWidth: rs(1.5), borderColor: '#E5E7EB', borderRadius: rs(12), paddingVertical: rs(12), paddingHorizontal: rs(14), fontSize: rf(14), color: '#111827' },
  saveBtn:         { backgroundColor: COLORS.primary, borderRadius: rs(12), paddingVertical: rs(14), alignItems: 'center' },
  saveBtnTxt:      { color: '#fff', fontSize: rf(15), fontWeight: '800' },
  section:         { paddingHorizontal: rs(16), marginBottom: rs(16) },
  sectionHeaderRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(10) },
  sectionTitle:    { fontSize: rf(14), fontWeight: '700', color: '#374151' },
  seeAll:          { fontSize: rf(13), color: COLORS.primary, fontWeight: '600' },
  bookingCard:     { backgroundColor: '#fff', borderRadius: rs(12), padding: rs(14), marginBottom: rs(8), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  bookingLeft:     { flex: 1 },
  bookingMachine:  { fontSize: rf(13), fontWeight: '700', color: '#111827', marginBottom: rs(3) },
  bookingDate:     { fontSize: rf(12), color: '#9CA3AF' },
  bookingStatus:   { borderRadius: rs(8), paddingHorizontal: rs(10), paddingVertical: rs(5) },
  bookingStatusTxt:{ fontSize: rf(11), fontWeight: '800' },
  supportRow:      { flexDirection: 'row', gap: rs(10) },
  supportBtn:      { flex: 1, backgroundColor: '#fff', borderRadius: rs(12), paddingVertical: rs(14), alignItems: 'center', borderWidth: rs(1.5), borderColor: COLORS.primary, elevation: 1 },
  supportBtnWA:    { borderColor: '#25D366' },
  supportIcon:     { fontSize: rf(22), marginBottom: rs(4) },
  supportTxt:      { fontSize: rf(13), fontWeight: '700', color: COLORS.primary },
  supportTxtWA:    { color: '#25D366' },
  menuSectionTxt:  { paddingHorizontal: H_PAD, marginBottom: rs(8), fontSize: rf(12), fontWeight: '700', color: '#9CA3AF' },
  menuCard:        { backgroundColor: '#fff', marginHorizontal: rs(16), borderRadius: rs(16), overflow: 'hidden', elevation: 1, marginBottom: rs(12) },
  menuRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), paddingVertical: rs(14) },
  menuRowBorder:   { borderBottomWidth: 1, borderBottomColor: '#F4F5F7' },
  menuIconWrap:    { width: rs(38), height: rs(38), borderRadius: rs(10), backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center', marginRight: rs(12) },
  menuIcon:        { fontSize: rf(18) },
  menuBody:        { flex: 1 },
  menuLabel:       { fontSize: rf(14), fontWeight: '600', color: '#111827', marginBottom: rs(2) },
  menuSub:         { fontSize: rf(11), color: '#9CA3AF' },
  logoutBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: rs(16), backgroundColor: '#FEF2F2', borderRadius: rs(14), paddingVertical: rs(15), marginBottom: rs(8) },
  logoutTxt:       { fontSize: rf(15), fontWeight: '800', color: '#EF4444' },
  version:         { textAlign: 'center', fontSize: rf(11), color: '#9CA3AF' },
});
