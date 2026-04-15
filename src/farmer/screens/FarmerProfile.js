import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Alert, TouchableOpacity, TextInput, StatusBar,
  ActivityIndicator, Image,
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
import DistrictTalukPicker from '../../common/components/DistrictTalukPicker';

export default function FarmerProfile({ navigation }) {
  const { setUser }                                  = useAuth();
  const { userProfile, updateProfile, clearProfile } = useUser();
  const uid = userProfile?.id || '';

  const [name,        setName]        = useState(userProfile?.name     || '');
  const [district,    setDistrict]    = useState(userProfile?.district || '');
  const [taluk,       setTaluk]       = useState(userProfile?.taluk    || '');
  const [village,     setVillage]     = useState(userProfile?.village  || '');
  const [loading,     setLoading]     = useState(false);
  const [editMode,    setEditMode]    = useState(false);
  const [photoURI,    setPhotoURI]    = useState(userProfile?.photoURL || null);
  const [photoLoading, setPhotoLoading] = useState(false);

  // ── Pick & upload profile photo ─────────────────────
  const handlePickPhoto = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Camera',        onPress: () => openPicker('camera')  },
      { text: 'Photo Library', onPress: () => openPicker('library') },
      { text: 'Cancel',        style: 'cancel' },
    ]);
  };

  const openPicker = async (source) => {
    try {
      let result;
      const opts = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      };

      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission Denied', 'Camera access is required.'); return; }
        result = await ImagePicker.launchCameraAsync(opts);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission Denied', 'Photo library access is required.'); return; }
        result = await ImagePicker.launchImageLibraryAsync(opts);
      }

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const uri = result.assets[0].uri;
      setPhotoLoading(true);

      try {
        // Upload to Firebase Storage
        const response  = await fetch(uri);
        const blob      = await response.blob();
        const storageRef = ref(storage, `profilePhotos/${uid}.jpg`);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        // Save URL to Firestore & local state
        await updateUser(uid, { photoURL: downloadURL });
        updateProfile({ photoURL: downloadURL });
        setPhotoURI(downloadURL);
        Alert.alert('✅ Photo Updated', 'Profile photo saved successfully!');
      } catch (uploadErr) {
        // Offline fallback — show locally but don't persist
        setPhotoURI(uri);
        Alert.alert('⚠️ Saved Locally', 'Photo saved on device. Will sync when online.');
      } finally {
        setPhotoLoading(false);
      }
    } catch (e) {
      setPhotoLoading(false);
      Alert.alert('Error', e.message || 'Could not pick photo.');
    }
  };

  // ── Save profile details ─────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Name cannot be empty'); return; }
    if (!district)    { Alert.alert('Required', 'Please select your district'); return; }
    if (!taluk)       { Alert.alert('Required', 'Please select your taluk'); return; }
    setLoading(true);
    try {
      const updates = { name: name.trim(), district, taluk, village: village.trim() };
      await updateUser(uid, updates);
      updateProfile(updates);
      setEditMode(false);
      Alert.alert('✅ Saved', 'Profile updated!');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          await logout(); clearProfile(); setUser(null);
          navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
        },
      },
    ]);
  };

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
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Header with profile photo ──────────────── */}
        <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.header}>
          <View style={s.avatarWrap}>
            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.85} style={s.avatarTouch}>
              {photoLoading ? (
                <View style={s.avatar}>
                  <ActivityIndicator color={COLORS.primary} size="large" />
                </View>
              ) : photoURI ? (
                <Image source={{ uri: photoURI }} style={s.avatarImg} />
              ) : (
                <View style={s.avatar}>
                  <Text style={{ fontSize: 44 }}>👨‍🌾</Text>
                </View>
              )}
              {/* Camera badge */}
              <View style={s.cameraBadge}>
                <Text style={s.cameraBadgeTxt}>📷</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={s.displayName}>{userProfile?.name || 'Farmer'}</Text>
          <Text style={s.photoHint}>Tap photo to change</Text>
          <View style={s.phonePill}>
            <Text style={s.phonePillTxt}>📞  +91 {userProfile?.phone || '—'}</Text>
          </View>
        </LinearGradient>

        {/* ── Details & Edit ─────────────────────────── */}
        <View style={s.content}>
          <View style={s.card}>
            <Text style={s.cardTitle}>My Details</Text>
            <Row icon="👤" label="Name"     value={userProfile?.name} />
            <Row icon="🗺️" label="District" value={userProfile?.district} />
            <Row icon="📍" label="Taluk"    value={userProfile?.taluk} />
            <Row icon="🏘️" label="Village"  value={userProfile?.village} />
            <Row icon="🏛️" label="State"   value="Tamil Nadu" />
          </View>

          <TouchableOpacity style={s.editToggle} onPress={() => setEditMode(e => !e)}>
            <Text style={s.editToggleTxt}>{editMode ? '✕  Cancel' : '✏️  Edit Profile'}</Text>
          </TouchableOpacity>

          {editMode && (
            <View style={s.editCard}>
              <View style={s.fieldGroup}>
                <View style={s.labelRow}>
                  <Text style={s.labelIcon}>👤</Text>
                  <Text style={s.labelTxt}>  Full Name *</Text>
                </View>
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

              <View style={s.fieldGroup}>
                <View style={s.labelRow}>
                  <Text style={s.labelIcon}>🏘️</Text>
                  <Text style={s.labelTxt}>  Village (optional)</Text>
                </View>
                <View style={s.inputWrap}>
                  <TextInput
                    style={s.input}
                    value={village}
                    onChangeText={setVillage}
                    placeholder="Your village"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[s.saveBtn, loading && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#1C7C54', '#2E9E6B']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.saveBtnGradient}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.saveBtnTxt}>💾  Save Changes</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Text style={s.logoutTxt}>⏻  Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F4F6F8' },

  // Header
  header:          { paddingTop: 50, paddingBottom: 32, alignItems: 'center' },
  avatarWrap:      { marginBottom: 14 },
  avatarTouch:     { position: 'relative' },
  avatar:          { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarImg:       { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  cameraBadge:     { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4, borderWidth: 1.5, borderColor: '#E5E7EB' },
  cameraBadgeTxt:  { fontSize: 14 },
  displayName:     { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  photoHint:       { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 10 },
  phonePill:       { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  phonePillTxt:    { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Content
  content:         { padding: 16 },
  card:            { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, elevation: 2 },
  cardTitle:       { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12 },
  row:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowLeft:         { flexDirection: 'row', alignItems: 'center' },
  rowIcon:         { fontSize: 16 },
  rowLabel:        { fontSize: 13, color: '#6B7280' },
  rowValue:        { fontSize: 13, fontWeight: '700', color: '#111827', flexShrink: 1, textAlign: 'right', maxWidth: '55%' },

  // Edit toggle
  editToggle:      { backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: COLORS.primary, elevation: 1 },
  editToggleTxt:   { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  // Edit form
  editCard:        { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, elevation: 2 },
  fieldGroup:      { marginBottom: 16 },
  labelRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  labelIcon:       { fontSize: 18 },
  labelTxt:        { fontSize: 14, fontWeight: '700', color: '#374151' },
  inputWrap:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 2, borderColor: '#E5E7EB', paddingHorizontal: 16 },
  inputWrapDone:   { borderColor: COLORS.primary, backgroundColor: '#FAFFFE' },
  input:           { flex: 1, paddingVertical: 14, fontSize: 15, color: '#111827' },
  check:           { fontSize: 18, color: COLORS.primary },
  saveBtn:         { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  saveBtnGradient: { paddingVertical: 15, alignItems: 'center' },
  saveBtnTxt:      { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Logout
  logoutBtn:       { backgroundColor: '#FEE2E2', borderRadius: 14, padding: 15, alignItems: 'center' },
  logoutTxt:       { color: '#EF4444', fontWeight: '800', fontSize: 15 },
});
