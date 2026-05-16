// src/owner/screens/AddMachine.js
// UPDATED: Duplicate machine type check — one owner cannot add same type twice

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Alert, ScrollView, StatusBar, ActivityIndicator,
  Image, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { LinearGradient }   from 'expo-linear-gradient';
import { addMachine, getMachinesByOwner } from '../../../firebase/firestore';
import { useUser }          from '../../../context/UserContext';
import { CATEGORIES }       from '../../../constants/categories';
import { CATEGORY_IMAGES }  from '../../../assets/index';
import { COLORS }           from '../../../constants/colors';
import { rs, rf, H_PAD }    from '../../../utils/responsive';
import { IMG }              from '../../../utils/imageSize';
import Input                from '../../common/components/Input';
import DistrictTalukPicker  from '../../common/components/DistrictTalukPicker';

const W      = Dimensions.get('window').width;
const CARD_W = (W - rs(32) - rs(12)) / 2;

const ACCENT = {
  harvester:    { bg: '#FFF3E0', border: '#F59E0B', tint: '#F59E0B', iconBg: '#FEF3C7' },
  rotavator:    { bg: '#E8F5E9', border: '#22C55E', tint: '#22C55E', iconBg: '#D1FAE5' },
  cultivator:   { bg: '#E3F2FD', border: '#3B82F6', tint: '#3B82F6', iconBg: '#E0E7FF' },
  strawchopper: { bg: '#F3E5F5', border: '#A855F7', tint: '#A855F7', iconBg: '#EDE9FE' },
};
const DA = { bg: '#F4F6F8', border: '#E5E7EB', tint: '#6B7280', iconBg: '#F9FAFB' };

export default function AddMachine({ navigation }) {
  const { userProfile }       = useUser();
  const uid                   = userProfile?.id || '';
  const [type,     setType]   = useState('');
  const [price,    setPrice]  = useState('');
  const [district, setDist]   = useState(userProfile?.district || '');
  const [taluk,    setTaluk]  = useState(userProfile?.taluk    || '');
  const [loading,  setLoad]   = useState(false);

  const handleAdd = async () => {
    if (!type)     { Alert.alert('Required', 'Please select a machine type'); return; }
    if (!price)    { Alert.alert('Required', 'Please enter price per hour');  return; }
    if (!district) { Alert.alert('Required', 'Please select your district');  return; }
    if (!taluk)    { Alert.alert('Required', 'Please select your taluk');     return; }
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) { Alert.alert('Invalid', 'Enter a valid price'); return; }

    setLoad(true);
    try {
      // ── Duplicate check — same type cannot be added twice ──────────────
      const existing = await getMachinesByOwner(uid);
      const alreadyExists = existing.docs.some(d => d.data().type === type);
      if (alreadyExists) {
        const label = CATEGORIES.find(c => c.id === type)?.label || type;
        Alert.alert(
          'Machine already added',
          `You already have a ${label}. Each machine type can only be added once.\n\nYou can edit or delete the existing one.`,
        );
        setLoad(false);
        return;
      }

      await addMachine({
        ownerId:    uid,
        ownerName:  userProfile?.name  || '',
        ownerPhone: userProfile?.phone || '',
        type,
        price_per_hour: p,
        district,
        taluk,
        isActive: true,
      });
      Alert.alert('✅ Machine Added!', 'Your machine is now live for farmers to book.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to add machine. Try again.');
    } finally { setLoad(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={s.ownerCard}>
            <Text style={s.ownerLabel}>Your Contact (Shown to Farmers)</Text>
            <Text style={s.ownerPhone}>📞 +91 {userProfile?.phone || '—'}</Text>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>🚜 Machine Type <Text style={s.req}>*</Text></Text>
            <Text style={s.fieldHint}>Each type can only be added once per owner</Text>
            <View style={s.typeGrid}>
              {CATEGORIES.map((c, i) => {
                const ac  = ACCENT[c.id] || DA;
                const sel = type === c.id;
                const img = CATEGORY_IMAGES[c.id];
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      s.typeCard,
                      { width: CARD_W, borderColor: sel ? ac.tint : '#E5E7EB' },
                      sel && { backgroundColor: ac.bg },
                      i % 2 === 1 && { marginLeft: rs(12) },
                    ]}
                    onPress={() => setType(c.id)}
                    activeOpacity={0.85}
                  >
                    <View style={[s.imgWrap, { backgroundColor: sel ? ac.iconBg : '#F9FAFB' }]}>
                      {img
                        ? <Image source={img} style={{ width: IMG.CATEGORY_IMG_IN_BOX, height: IMG.CATEGORY_IMG_IN_BOX }} resizeMode="contain" />
                        : <Text style={{ fontSize: rf(40) }}>{c.icon}</Text>
                      }
                    </View>
                    <View style={s.cardBottom}>
                      <Text style={[s.cardLabel, sel && { color: ac.tint }]}>{c.label}</Text>
                      {sel && (
                        <View style={[s.checkBadge, { backgroundColor: ac.tint }]}>
                          <Text style={s.checkTxt}>✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {type
              ? <View style={s.selectedBanner}><Text style={s.selectedBannerTxt}>✅ Selected: {CATEGORIES.find(c => c.id === type)?.label}</Text></View>
              : <Text style={s.selectHint}>Tap a machine type above to select</Text>
            }
          </View>

          <View style={s.fieldGroup}>
            <Input label="💰 Price per Hour (₹) *" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="e.g. 1500" />
          </View>

          <DistrictTalukPicker district={district} taluk={taluk} onDistrictChange={setDist} onTalukChange={setTaluk} />

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleAdd} disabled={loading} activeOpacity={0.88}>
            <LinearGradient
              colors={loading ? ['#D1D5DB','#D1D5DB'] : ['#1C7C54','#2E9E6B']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.btnGradient}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnTxt}>✅  Add Machine</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#F4F6F8' },
  scroll:           { padding: H_PAD, paddingBottom: rs(50) },
  ownerCard:        { backgroundColor: COLORS.primaryLight, borderRadius: rs(14), padding: rs(14), marginBottom: rs(20), borderWidth: rs(1.5), borderColor: '#6EE7B7' },
  ownerLabel:       { fontSize: rf(12), color: COLORS.textSecondary, marginBottom: rs(6) },
  ownerPhone:       { fontSize: rf(16), fontWeight: '700', color: COLORS.primary },
  fieldGroup:       { marginBottom: rs(20) },
  fieldLabel:       { fontSize: rf(14), fontWeight: '700', color: '#374151', marginBottom: rs(4) },
  fieldHint:        { fontSize: rf(12), color: '#9CA3AF', marginBottom: rs(12) },
  req:              { color: '#EF4444' },
  typeGrid:         { flexDirection: 'row', flexWrap: 'wrap' },
  typeCard:         { borderRadius: rs(18), backgroundColor: '#fff', borderWidth: rs(2.5), marginBottom: rs(12), overflow: 'hidden', elevation: 3 },
  imgWrap:          { width: '100%', height: rs(110), alignItems: 'center', justifyContent: 'center' },
  cardBottom:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: rs(12), paddingVertical: rs(10), backgroundColor: '#fff' },
  cardLabel:        { fontSize: rf(13), fontWeight: '800', color: '#111827', flex: 1 },
  checkBadge:       { width: rs(22), height: rs(22), borderRadius: rs(11), alignItems: 'center', justifyContent: 'center' },
  checkTxt:         { color: '#fff', fontSize: rf(12), fontWeight: '900' },
  selectedBanner:   { backgroundColor: COLORS.primaryLight, borderRadius: rs(10), padding: rs(10), marginTop: rs(4), borderLeftWidth: rs(4), borderLeftColor: COLORS.primary },
  selectedBannerTxt:{ fontSize: rf(13), fontWeight: '700', color: COLORS.primary },
  selectHint:       { fontSize: rf(12), color: COLORS.textSecondary, marginTop: rs(4), textAlign: 'center' },
  btn:              { borderRadius: rs(16), overflow: 'hidden', marginTop: rs(8) },
  btnGradient:      { alignItems: 'center', justifyContent: 'center', paddingVertical: rs(17) },
  btnTxt:           { color: '#fff', fontSize: rf(17), fontWeight: '800' },
});
