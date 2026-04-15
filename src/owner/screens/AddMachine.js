import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Alert, ScrollView, StatusBar, ActivityIndicator, Image, Dimensions,
} from 'react-native';
import { LinearGradient }   from 'expo-linear-gradient';
import { addMachine }       from '../../../firebase/firestore';
import { useUser }          from '../../../context/UserContext';
import { CATEGORIES }       from '../../../constants/categories';
import { CATEGORY_IMAGES }  from '../../../assets/index';
import { COLORS }           from '../../../constants/colors';
import Input                from '../../common/components/Input';
import DistrictTalukPicker  from '../../common/components/DistrictTalukPicker';

const { width } = Dimensions.get('window');
const CARD_W    = (width - 48) / 2;   // 2-column grid with padding

// Accent colours matching CategoryScreen
const ACCENT = {
  harvester:    { bg: '#FFF3E0', border: '#F59E0B', tint: '#F59E0B' },
  rotavator:    { bg: '#E8F5E9', border: '#22C55E', tint: '#22C55E' },
  cultivator:   { bg: '#E3F2FD', border: '#3B82F6', tint: '#3B82F6' },
  strawchopper: { bg: '#F3E5F5', border: '#A855F7', tint: '#A855F7' },
};
const DEFAULT_ACCENT = { bg: '#F4F6F8', border: '#E5E7EB', tint: '#6B7280' };

export default function AddMachine({ navigation }) {
  const { userProfile }       = useUser();
  const uid                   = userProfile?.id || '';

  const [type,     setType]     = useState('');
  const [price,    setPrice]    = useState('');
  const [district, setDistrict] = useState(userProfile?.district || '');
  const [taluk,    setTaluk]    = useState(userProfile?.taluk    || '');
  const [loading,  setLoading]  = useState(false);

  const handleAdd = async () => {
    if (!type)         { Alert.alert('Required', 'Please select a machine type'); return; }
    if (!price.trim()) { Alert.alert('Required', 'Please enter price per hour');  return; }
    if (!district)     { Alert.alert('Required', 'Please select your district');  return; }
    if (!taluk)        { Alert.alert('Required', 'Please select your taluk');     return; }
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) { Alert.alert('Invalid', 'Enter a valid price'); return; }

    setLoading(true);
    try {
      await addMachine({
        ownerId:        uid,
        ownerName:      userProfile?.name  || '',
        ownerPhone:     userProfile?.phone || '',
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#145A3E" />
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Owner contact card */}
        <View style={s.ownerCard}>
          <Text style={s.ownerLabel}>Your Contact (Shown to Farmers)</Text>
          <View style={s.ownerRow}>
            <Text style={{ fontSize: 18 }}>📞</Text>
            <Text style={s.ownerPhone}>  +91 {userProfile?.phone || '—'}</Text>
          </View>
        </View>

        {/* ── Machine Type — image grid ───────────────── */}
        <View style={s.fieldGroup}>
          <View style={s.labelRow}>
            <Text style={s.labelIcon}>🚜</Text>
            <Text style={s.labelTxt}>  Machine Type <Text style={s.req}>*</Text></Text>
          </View>

          <View style={s.typeGrid}>
            {CATEGORIES.map((c, index) => {
              const accent   = ACCENT[c.id] || DEFAULT_ACCENT;
              const selected = type === c.id;
              const img      = CATEGORY_IMAGES[c.id];

              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    s.typeCard,
                    { marginLeft: index % 2 === 1 ? 12 : 0 },
                    { borderColor: selected ? accent.tint : '#E5E7EB' },
                    selected && { backgroundColor: accent.bg },
                  ]}
                  onPress={() => setType(c.id)}
                  activeOpacity={0.85}
                >
                  {/* Machine image or emoji fallback */}
                  <View style={[s.imgWrap, { backgroundColor: selected ? accent.bg : '#F9FAFB' }]}>
                    {img
                      ? <Image source={img} style={s.machineImg} resizeMode="contain" />
                      : <Text style={s.machineEmoji}>{c.icon}</Text>
                    }
                  </View>

                  {/* Label row */}
                  <View style={s.cardBottom}>
                    <Text style={[s.cardLabel, selected && { color: accent.tint }]}>
                      {c.label}
                    </Text>
                    {selected && (
                      <View style={[s.checkBadge, { backgroundColor: accent.tint }]}>
                        <Text style={s.checkTxt}>✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {type ? (
            <View style={s.selectedBanner}>
              <Text style={s.selectedBannerTxt}>
                ✅ Selected: {CATEGORIES.find(c => c.id === type)?.label}
              </Text>
            </View>
          ) : (
            <Text style={s.selectHint}>Tap a machine type above to select it</Text>
          )}
        </View>

        {/* ── Price ───────────────────────────────────── */}
        <View style={s.fieldGroup}>
          <View style={s.labelRow}>
            <Text style={s.labelIcon}>💰</Text>
            <Text style={s.labelTxt}>  Price per Hour (₹) <Text style={s.req}>*</Text></Text>
          </View>
          <Input
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="e.g. 1500"
          />
        </View>

        {/* ── District + Taluk ─────────────────────────── */}
        <DistrictTalukPicker
          district={district}
          taluk={taluk}
          onDistrictChange={setDistrict}
          onTalukChange={setTaluk}
        />

        {/* ── Submit ──────────────────────────────────── */}
        <TouchableOpacity
          style={[s.btn, loading && s.btnOff]}
          onPress={handleAdd}
          disabled={loading}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={loading ? ['#D1D5DB', '#D1D5DB'] : ['#1C7C54', '#2E9E6B']}
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F4F6F8' },
  container:       { padding: 16, paddingBottom: 50 },

  // Owner card
  ownerCard:       { backgroundColor: '#ECFDF5', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1.5, borderColor: '#6EE7B7' },
  ownerLabel:      { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  ownerRow:        { flexDirection: 'row', alignItems: 'center' },
  ownerPhone:      { fontSize: 16, fontWeight: '700', color: COLORS.primary },

  // Field group
  fieldGroup:      { marginBottom: 20 },
  labelRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  labelIcon:       { fontSize: 18 },
  labelTxt:        { fontSize: 14, fontWeight: '700', color: '#374151' },
  req:             { color: '#EF4444' },

  // Machine type 2-column grid
  typeGrid:        { flexDirection: 'row', flexWrap: 'wrap' },

  typeCard:        {
    width: CARD_W,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 2.5,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 3,
  },

  imgWrap:         {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  machineImg:      { width: '90%', height: '90%' },
  machineEmoji:    { fontSize: 52 },

  cardBottom:      {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  cardLabel:       { fontSize: 13, fontWeight: '800', color: '#111827', flex: 1 },

  checkBadge:      {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  checkTxt:        { color: '#fff', fontSize: 12, fontWeight: '900' },

  selectedBanner:  { backgroundColor: '#ECFDF5', borderRadius: 10, padding: 10, marginTop: 4, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  selectedBannerTxt: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  selectHint:      { fontSize: 12, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },

  // Submit button
  btn:             { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  btnOff:          { opacity: 0.7 },
  btnGradient:     { alignItems: 'center', justifyContent: 'center', paddingVertical: 17 },
  btnTxt:          { color: '#fff', fontSize: 17, fontWeight: '800' },
});
