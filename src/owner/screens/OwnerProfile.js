// src/owner/screens/OwnerProfile.js
// Full profile — photo, KYC status, commission section, machine summary, menu, logout

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Alert,
  TouchableOpacity, TextInput, StatusBar, ActivityIndicator,
  Image, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { LinearGradient }   from 'expo-linear-gradient';
import * as ImagePicker     from 'expo-image-picker';
import { onSnapshot, doc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { FIcon }            from '../../../utils/icons';
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
const SUPPORT_PHONE = '9876543210';

const KYC_CFG = {
  not_submitted: { bg: '#F3F4F6', color: '#374151', label: 'KYC Not Submitted', icon: '📋' },
  pending:       { bg: '#FFF3CD', color: '#92400E', label: 'KYC Under Review',  icon: '⏳' },
  verified:      { bg: '#DCFCE7', color: '#065F46', label: 'KYC Verified ✅',   icon: '✅' },
  rejected:      { bg: '#FEE2E2', color: '#B91C1C', label: 'KYC Rejected ❌',   icon: '❌' },
};

export default function OwnerProfile({ navigation }) {
  const { setUser }                                  = useAuth();
  const { userProfile, updateProfile, clearProfile } = useUser();
  const uid = userProfile?.id || '';

  const [name,         setName]         = useState(userProfile?.name     || '');
  const [district,     setDistrict]     = useState(userProfile?.district || '');
  const [taluk,        setTaluk]        = useState(userProfile?.taluk    || '');
  const [saving,       setSaving]       = useState(false);
  const [editMode,     setEditMode]     = useState(false);
  const [photoURL,     setPhotoURL]     = useState(userProfile?.profilePhotoUrl || null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [machineCount, setMachineCount] = useState(0);
  const [activeBookings, setActiveBookings] = useState(0);

  // Realtime profile listener
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setPhotoURL(d.profilePhotoUrl || null);
        updateProfile({ ...d, id: uid });
      }
    });
    return unsub;
  }, [uid]);

  // Machine + booking counts
  useEffect(() => {
    if (!uid) return;
    getDocs(query(collection(db, 'machines'), where('ownerId', '==', uid))).then(s => setMachineCount(s.size)).catch(() => {});
    const q = query(collection(db, 'bookings'), where('ownerId', '==', uid));
    const unsub = onSnapshot(q, (snap) => {
      setActiveBookings(snap.docs.filter(d => ['pending','accepted','ongoing'].includes(d.data().status)).length);
    });
    return unsub;
  }, [uid]);

  // Photo
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
    Alert.alert('Remove Photo?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
          setPhotoLoading(true);
          try {
            await deleteObject(ref(storage, PHOTO_PATH(uid))).catch(() => {});
            await updateUser(uid, { profilePhotoUrl: null });
            updateProfile({ profilePhotoUrl: null });
            setPhotoURL(null);
          } catch { Alert.alert('Error'); }
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
      const u = { name: name.trim(), district, taluk };
      await updateUser(uid, u);
      updateProfile(u);
      setEditMode(false);
      Alert.alert('✅ Saved');
    } catch { Alert.alert('Error'); }
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

  const initials  = (userProfile?.name || 'O')[0].toUpperCase();
  const kycStatus = userProfile?.kycStatus || 'not_submitted';
  const kycCfg    = KYC_CFG[kycStatus] || KYC_CFG.not_submitted;
  const isLocked  = userProfile?.isLocked === true;
  const commission = userProfile?.commissionAmount || 0;

  const MENU = [
    { icon: '🚜', label: 'My Machines',      sub: `${machineCount} machines listed`,         onPress: () => navigation.navigate('MyMachines') },
    { icon: '📋', label: 'Booking Requests', sub: `${activeBookings} active requests`,        onPress: () => navigation.navigate('Requests') },
    { icon: '📊', label: "Today's Summary",  sub: 'Commission & work summary',               onPress: () => navigation.navigate('TodaysWork') },
    { icon: '🔔', label: 'Notifications',    sub: 'Booking alerts & updates',               onPress: () => {} },
    { icon: '🛡️', label: 'Privacy Policy',  sub: 'How we use your data',                   onPress: () => {} },
    { icon: '📖', label: 'About App',        sub: 'நம்ம வயல் v1.0.4',                       onPress: () => {} },
  ];

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
            <Text style={s.headerName}>{userProfile?.name || 'Owner'}</Text>
            <Text style={s.headerPhone}>+91 {userProfile?.phone || '—'}</Text>
            <View style={s.badgesRow}>
              <View style={s.roleBadge}><Text style={s.roleBadgeTxt}>🚜 Machine Owner</Text></View>
              <View style={[s.kycBadge, { backgroundColor: kycCfg.bg }]}>
                <Text style={[s.kycBadgeTxt, { color: kycCfg.color }]}>{kycCfg.icon} {kycCfg.label}</Text>
              </View>
            </View>
            <Text style={s.headerLocation}>📍 {userProfile?.taluk || '—'}, {userProfile?.district || 'Tamil Nadu'}</Text>
          </LinearGradient>

          {/* STATS */}
          <View style={s.statsRow}>
            {[
              { label: 'Machines',   value: machineCount,  color: '#1C7C54' },
              { label: 'Active',     value: activeBookings, color: '#3B82F6' },
              { label: 'Commission', value: `₹${commission}`, color: '#F59E0B' },
              { label: 'Status',     value: userProfile?.isVerified ? '✅' : '⏳', color: '#22C55E' },
            ].map((st, i, arr) => (
              <View key={st.label} style={[s.statItem, i < arr.length-1 && s.statBorder]}>
                <Text style={[s.statValue, { color: st.color }]} numberOfLines={1}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* LOCK WARNING */}
          {isLocked && (
            <TouchableOpacity style={s.lockCard} onPress={() => navigation.navigate('PayCommission')} activeOpacity={0.88}>
              <Text style={s.lockCardTitle}>🔒 Account Locked</Text>
              <Text style={s.lockCardSub}>Please pay pending commission to continue using the app</Text>
              <Text style={s.lockCardBtn}>Pay Commission →</Text>
            </TouchableOpacity>
          )}

          {/* COMMISSION CARD */}
          {commission > 0 && !isLocked && (
            <View style={s.commCard}>
              <View style={s.commLeft}>
                <Text style={s.commTitle}>💰 Pending Commission</Text>
                <Text style={s.commAmount}>₹{commission}</Text>
                <Text style={s.commSub}>Pay within 24h to avoid lock</Text>
              </View>
              <TouchableOpacity style={s.commBtn} onPress={() => navigation.navigate('PayCommission')} activeOpacity={0.88}>
                <Text style={s.commBtnTxt}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* KYC SECTION */}
          <View style={s.kycCard}>
            <View style={s.kycHeader}>
              <Text style={s.cardTitle}>KYC Documents</Text>
              <View style={[s.kycStatusBadge, { backgroundColor: kycCfg.bg }]}>
                <Text style={[s.kycStatusTxt, { color: kycCfg.color }]}>{kycCfg.icon} {kycStatus.toUpperCase()}</Text>
              </View>
            </View>
            {[
              { icon: '📄', label: 'Profile Photo',   url: userProfile?.profilePhotoUrl },
              { icon: '🪪', label: 'Driving License', url: userProfile?.licenseUrl },
              { icon: '📋', label: 'Aadhar Card',     url: userProfile?.aadharUrl },
              { icon: '🚜', label: 'Vehicle Photo',   url: userProfile?.vehicleImageUrl },
            ].map((doc, i, arr) => (
              <View key={doc.label} style={[s.kycRow, i < arr.length-1 && s.kycRowBorder]}>
                <Text style={s.kycIcon}>{doc.icon}</Text>
                <Text style={s.kycLabel}>{doc.label}</Text>
                {doc.url ? (
                  <TouchableOpacity onPress={() => Linking.openURL(doc.url).catch(() => {})} activeOpacity={0.8}>
                    <Text style={s.kycViewBtn}>View</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={s.kycMissing}>Not uploaded</Text>
                )}
              </View>
            ))}
            {(kycStatus === 'not_submitted' || kycStatus === 'rejected') && (
              <TouchableOpacity style={s.kycUpdateBtn} onPress={() => navigation.navigate('KycScreen')} activeOpacity={0.88}>
                <Text style={s.kycUpdateBtnTxt}>{kycStatus === 'rejected' ? '🔄 Resubmit Documents' : '📤 Submit KYC'}</Text>
              </TouchableOpacity>
            )}
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
              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.88}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* SUPPORT */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Support</Text>
            <View style={s.supportRow}>
              <TouchableOpacity style={s.supportBtn} onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)} activeOpacity={0.85}>
                <Text style={s.supportIcon}>📞</Text>
                <Text style={s.supportTxt}>Call Support</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.supportBtn, { borderColor: '#25D366' }]} onPress={() => Linking.openURL(`whatsapp://send?phone=91${SUPPORT_PHONE}`)} activeOpacity={0.85}>
                <Text style={s.supportIcon}>💬</Text>
                <Text style={[s.supportTxt, { color: '#25D366' }]}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* MENU */}
          <Text style={s.menuSectionTxt}>MENU</Text>
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
  badgesRow:       { flexDirection: 'row', gap: rs(8), marginBottom: rs(6), flexWrap: 'wrap', justifyContent: 'center' },
  roleBadge:       { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: rs(20), paddingHorizontal: rs(12), paddingVertical: rs(5) },
  roleBadgeTxt:    { fontSize: rf(12), color: '#fff', fontWeight: '700' },
  kycBadge:        { borderRadius: rs(20), paddingHorizontal: rs(12), paddingVertical: rs(5) },
  kycBadgeTxt:     { fontSize: rf(12), fontWeight: '700' },
  headerLocation:  { fontSize: rf(12), color: 'rgba(255,255,255,0.7)' },
  statsRow:        { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: rs(16), marginTop: -rs(14), borderRadius: rs(16), elevation: 4, overflow: 'hidden', marginBottom: rs(12) },
  statItem:        { flex: 1, alignItems: 'center', paddingVertical: rs(14) },
  statBorder:      { borderRightWidth: 1, borderRightColor: '#F0F0F0' },
  statValue:       { fontSize: rf(14), fontWeight: '900', marginBottom: rs(3) },
  statLabel:       { fontSize: rf(10), color: '#9CA3AF' },
  lockCard:        { backgroundColor: '#FEE2E2', marginHorizontal: rs(16), borderRadius: rs(14), padding: rs(16), marginBottom: rs(12), borderLeftWidth: rs(4), borderLeftColor: '#EF4444' },
  lockCardTitle:   { fontSize: rf(15), fontWeight: '800', color: '#B91C1C', marginBottom: rs(4) },
  lockCardSub:     { fontSize: rf(13), color: '#EF4444', marginBottom: rs(8) },
  lockCardBtn:     { fontSize: rf(13), fontWeight: '800', color: '#B91C1C' },
  commCard:        { backgroundColor: '#E8F5EE', marginHorizontal: rs(16), borderRadius: rs(14), padding: rs(16), marginBottom: rs(12), flexDirection: 'row', alignItems: 'center', borderLeftWidth: rs(4), borderLeftColor: COLORS.primary },
  commLeft:        { flex: 1 },
  commTitle:       { fontSize: rf(13), fontWeight: '700', color: '#065F46', marginBottom: rs(4) },
  commAmount:      { fontSize: rf(22), fontWeight: '900', color: COLORS.primary, marginBottom: rs(2) },
  commSub:         { fontSize: rf(11), color: '#6B7280' },
  commBtn:         { backgroundColor: COLORS.primary, borderRadius: rs(10), paddingVertical: rs(10), paddingHorizontal: rs(16) },
  commBtnTxt:      { color: '#fff', fontWeight: '800', fontSize: rf(13) },
  kycCard:         { backgroundColor: '#fff', marginHorizontal: rs(16), borderRadius: rs(16), padding: rs(16), marginBottom: rs(12), elevation: 1 },
  kycHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: rs(12) },
  kycStatusBadge:  { borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(5) },
  kycStatusTxt:    { fontSize: rf(11), fontWeight: '700' },
  kycRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: rs(12) },
  kycRowBorder:    { borderBottomWidth: 1, borderBottomColor: '#F4F5F7' },
  kycIcon:         { fontSize: rf(18), marginRight: rs(10), width: rs(24) },
  kycLabel:        { flex: 1, fontSize: rf(13), color: '#374151' },
  kycViewBtn:      { fontSize: rf(13), color: COLORS.primary, fontWeight: '700' },
  kycMissing:      { fontSize: rf(12), color: '#9CA3AF' },
  kycUpdateBtn:    { backgroundColor: COLORS.primary, borderRadius: rs(10), paddingVertical: rs(12), alignItems: 'center', marginTop: rs(10) },
  kycUpdateBtnTxt: { color: '#fff', fontWeight: '800', fontSize: rf(14) },
  editBtn:         { marginHorizontal: rs(16), marginBottom: rs(8), backgroundColor: '#fff', borderRadius: rs(12), paddingVertical: rs(13), alignItems: 'center', borderWidth: rs(1.5), borderColor: COLORS.primary },
  editBtnActive:   { borderColor: '#EF4444' },
  editBtnTxt:      { fontSize: rf(14), fontWeight: '700', color: COLORS.primary },
  editCard:        { backgroundColor: '#fff', marginHorizontal: rs(16), borderRadius: rs(16), padding: rs(16), marginBottom: rs(12) },
  cardTitle:       { fontSize: rf(14), fontWeight: '700', color: '#374151', marginBottom: rs(12) },
  inputGroup:      { marginBottom: rs(12) },
  inputLabel:      { fontSize: rf(13), fontWeight: '600', color: '#374151', marginBottom: rs(6) },
  input:           { backgroundColor: '#F9FAFB', borderWidth: rs(1.5), borderColor: '#E5E7EB', borderRadius: rs(12), paddingVertical: rs(12), paddingHorizontal: rs(14), fontSize: rf(14), color: '#111827' },
  saveBtn:         { backgroundColor: COLORS.primary, borderRadius: rs(12), paddingVertical: rs(14), alignItems: 'center' },
  saveBtnTxt:      { color: '#fff', fontSize: rf(15), fontWeight: '800' },
  section:         { paddingHorizontal: rs(16), marginBottom: rs(16) },
  sectionTitle:    { fontSize: rf(14), fontWeight: '700', color: '#374151', marginBottom: rs(10) },
  supportRow:      { flexDirection: 'row', gap: rs(10) },
  supportBtn:      { flex: 1, backgroundColor: '#fff', borderRadius: rs(12), paddingVertical: rs(14), alignItems: 'center', borderWidth: rs(1.5), borderColor: COLORS.primary, elevation: 1 },
  supportIcon:     { fontSize: rf(22), marginBottom: rs(4) },
  supportTxt:      { fontSize: rf(13), fontWeight: '700', color: COLORS.primary },
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
