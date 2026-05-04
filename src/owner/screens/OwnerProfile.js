// src/owner/screens/OwnerProfile.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Alert, TouchableOpacity, TextInput, StatusBar,
  ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient }  from 'expo-linear-gradient';
import * as ImagePicker    from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth }         from '../../../context/AuthContext';
import { useUser }         from '../../../context/UserContext';
import { updateUser }      from '../../../firebase/firestore';
import { storage }         from '../../../firebase/config';
import { logout }          from '../../../firebase/auth';
import { COLORS }          from '../../../constants/colors';
import { rs, rf, H_PAD }   from '../../../utils/responsive';
import DistrictTalukPicker from '../../common/components/DistrictTalukPicker';

export default function OwnerProfile({ navigation }) {
  const { setUser }                                  = useAuth();
  const { userProfile, updateProfile, clearProfile } = useUser();
  const uid = userProfile?.id || '';

  const [name,         setName]         = useState(userProfile?.name     || '');
  const [district,     setDistrict]     = useState(userProfile?.district || '');
  const [taluk,        setTaluk]        = useState(userProfile?.taluk    || '');
  const [loading,      setLoading]      = useState(false);
  const [editMode,     setEditMode]     = useState(false);
  const [photoURI,     setPhotoURI]     = useState(userProfile?.photoURL || null);
  const [photoLoading, setPhotoLoading] = useState(false);

  const handlePickPhoto = () =>
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Camera',        onPress: () => openPicker('camera')  },
      { text: 'Photo Library', onPress: () => openPicker('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const openPicker = async (source) => {
    try {
      let result;
      const opts = { mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.7 };
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission Denied'); return; }
        result = await ImagePicker.launchCameraAsync(opts);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission Denied'); return; }
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
      const updates = { name: name.trim(), district, taluk };
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

  const Row = ({ icon, label, value }) => (
    <View style={s.row}>
      <View style={s.rowLeft}>
        <Text style={s.rowIcon}>{icon}</Text>
        <Text style={s.rowLabel}>  {label}</Text>
      </View>
      <Text style={s.rowValue}>{value || '—'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#145A3E" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.header}>
            <View style={s.avatarWrap}>
              <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.85} style={s.avatarTouch}>
                {photoLoading ? (
                  <View style={s.avatar}><ActivityIndicator color="#fff" size="large" /></View>
                ) : photoURI ? (
                  <Image source={{ uri: photoURI }} style={s.avatarImg} />
                ) : (
                  <View style={s.avatar}><Text style={{ fontSize: rf(44) }}>🚜</Text></View>
                )}
                <View style={s.cameraBadge}>
                  <Text style={{ fontSize: rf(14) }}>📷</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={s.displayName}>{userProfile?.name || 'Owner'}</Text>
            <Text style={s.photoHint}>Tap photo to change</Text>
            <View style={s.phonePill}>
              <Text style={s.phonePillTxt}>📞  +91 {userProfile?.phone || '—'}</Text>
            </View>

            {userProfile?.isLocked && (
              <TouchableOpacity style={s.lockPill} onPress={() => navigation.navigate('PayCommission')}>
                <Text style={s.lockPillTxt}>🔒 Account Locked — Tap to Pay</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>

          {/* Details */}
          <View style={s.content}>
            <View style={s.card}>
              <Text style={s.cardTitle}>My Details</Text>
              <Row icon="👤" label="Name"     value={userProfile?.name} />
              <Row icon="🗺️" label="District" value={userProfile?.district} />
              <Row icon="📍" label="Taluk"    value={userProfile?.taluk} />
              <Row icon="🏛️" label="State"   value="Tamil Nadu" />
              <Row icon="🔐" label="Status"   value={userProfile?.isLocked ? '🔒 Locked' : '🔓 Active'} />
            </View>

            <TouchableOpacity style={s.editToggle} onPress={() => setEditMode(e => !e)}>
              <Text style={s.editToggleTxt}>{editMode ? '✕  Cancel' : '✏️  Edit Profile'}</Text>
            </TouchableOpacity>

            {editMode && (
              <View style={s.editCard}>
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>👤 Full Name *</Text>
                  <View style={[s.inputWrap, name && s.inputWrapDone]}>
                    <TextInput
                      style={s.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Your full name"
                      placeholderTextColor="#9CA3AF"
                    />
                    {name.length > 0 && <Text style={s.check}>✓</Text>}
                  </View>
                </View>

                <DistrictTalukPicker
                  district={district} taluk={taluk}
                  onDistrictChange={setDistrict} onTalukChange={setTaluk}
                />

                <TouchableOpacity
                  style={[s.saveBtn, loading && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#1C7C54', '#2E9E6B']}
                    start={{ x:0, y:0 }} end={{ x:1, y:0 }}
                    style={s.saveBtnGrad}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={s.saveBtnTxt}>Save Changes</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
              <Text style={s.logoutTxt}>⏻  Logout</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: rs(24) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#F4F6F8' },
  scroll:         { flexGrow: 1 },

  header:         { paddingTop: rs(50), paddingBottom: rs(32), alignItems: 'center' },
  avatarWrap:     { marginBottom: rs(14) },
  avatarTouch:    { position: 'relative' },
  avatar:         { width: rs(100), height: rs(100), borderRadius: rs(50), backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: rs(3), borderColor: 'rgba(255,255,255,0.5)' },
  avatarImg:      { width: rs(100), height: rs(100), borderRadius: rs(50), borderWidth: rs(3), borderColor: 'rgba(255,255,255,0.5)' },
  cameraBadge:    { position: 'absolute', bottom: rs(2), right: rs(2), width: rs(28), height: rs(28), borderRadius: rs(14), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4, borderWidth: rs(1.5), borderColor: '#E5E7EB' },
  displayName:    { fontSize: rf(22), fontWeight: '900', color: '#fff', marginBottom: rs(4) },
  photoHint:      { fontSize: rf(11), color: 'rgba(255,255,255,0.6)', marginBottom: rs(10) },
  phonePill:      { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: rs(20), paddingHorizontal: rs(14), paddingVertical: rs(6), marginBottom: rs(8) },
  phonePillTxt:   { fontSize: rf(14), fontWeight: '700', color: '#fff' },
  lockPill:       { backgroundColor: '#EF4444', borderRadius: rs(20), paddingHorizontal: rs(14), paddingVertical: rs(6), marginTop: rs(6) },
  lockPillTxt:    { fontSize: rf(13), fontWeight: '700', color: '#fff' },

  content:        { padding: rs(16) },
  card:           { backgroundColor: '#fff', borderRadius: rs(18), padding: rs(16), marginBottom: rs(12), elevation: 2 },
  cardTitle:      { fontSize: rf(15), fontWeight: '800', color: '#111827', marginBottom: rs(12) },
  row:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: rs(10), borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowLeft:        { flexDirection: 'row', alignItems: 'center' },
  rowIcon:        { fontSize: rf(16) },
  rowLabel:       { fontSize: rf(13), color: '#6B7280' },
  rowValue:       { fontSize: rf(13), fontWeight: '700', color: '#111827', flexShrink: 1, textAlign: 'right', maxWidth: '55%' },

  editToggle:     { backgroundColor: '#fff', borderRadius: rs(14), padding: rs(14), alignItems: 'center', marginBottom: rs(12), borderWidth: rs(1.5), borderColor: COLORS.primary, elevation: 1 },
  editToggleTxt:  { fontSize: rf(14), fontWeight: '700', color: COLORS.primary },

  editCard:       { backgroundColor: '#fff', borderRadius: rs(18), padding: rs(16), marginBottom: rs(12), elevation: 2 },
  fieldGroup:     { marginBottom: rs(16) },
  fieldLabel:     { fontSize: rf(14), fontWeight: '700', color: '#374151', marginBottom: rs(8) },
  inputWrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: rs(14), borderWidth: rs(2), borderColor: '#E5E7EB', paddingHorizontal: rs(16) },
  inputWrapDone:  { borderColor: COLORS.primary, backgroundColor: '#FAFFFE' },
  input:          { flex: 1, paddingVertical: rs(14), fontSize: rf(15), color: '#111827' },
  check:          { fontSize: rf(18), color: COLORS.primary },
  saveBtn:        { borderRadius: rs(14), overflow: 'hidden', marginTop: rs(4) },
  saveBtnGrad:    { paddingVertical: rs(15), alignItems: 'center' },
  saveBtnTxt:     { color: '#fff', fontSize: rf(16), fontWeight: '800' },

  logoutBtn:      { backgroundColor: '#FEE2E2', borderRadius: rs(14), padding: rs(15), alignItems: 'center' },
  logoutTxt:      { color: '#EF4444', fontWeight: '800', fontSize: rf(15) },
});
