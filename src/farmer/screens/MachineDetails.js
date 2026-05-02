// src/farmer/screens/MachineDetails.js
import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, Image, StatusBar,
} from 'react-native';
import { LinearGradient }    from 'expo-linear-gradient';
import { FIcon }             from '../../../utils/icons';
import PhoneConnect          from '../../common/components/PhoneConnect';
import { getCategoryLabel }  from '../../../constants/categories';
import { CATEGORY_IMAGES }   from '../../../assets/index';
import { COLORS }            from '../../../constants/colors';
import { rs, rf, H_PAD }     from '../../../utils/responsive';
import { IMG }               from '../../../utils/imageSize';

const THEMES = {
  harvester:    { grad: ['#7C3A00','#B25A00'], accent: '#F59E0B', bg: '#FFF3E0', lc: '#92400E' },
  rotavator:    { grad: ['#0A4D22','#1C7C54'], accent: '#22C55E', bg: '#E8F5E9', lc: '#166534' },
  cultivator:   { grad: ['#1E3A8A','#2563EB'], accent: '#3B82F6', bg: '#E3F2FD', lc: '#1D4ED8' },
  strawchopper: { grad: ['#4A1272','#7C3AED'], accent: '#A855F7', bg: '#F3E5F5', lc: '#6B21A8' },
};
const DT = { grad: ['#145A3E','#1C7C54'], accent: COLORS.primary, bg: '#F4F6F8', lc: '#374151' };

export default function MachineDetails({ navigation, route }) {
  const { machine } = route.params;
  const label = getCategoryLabel(machine.type);
  const img   = CATEGORY_IMAGES[machine.type];
  const t     = THEMES[machine.type] || DT;

  const INFO = [
    { l: 'Machine Type', v: label,                          icon: '🚜' },
    { l: 'Price / Hour', v: `₹${machine.price_per_hour}`,  icon: '💰' },
    { l: 'Owner',        v: machine.ownerName || 'N/A',    icon: '👤' },
    { l: 'Taluk',        v: machine.taluk,                 icon: '📍' },
    { l: 'Availability', v: machine.isActive ? 'Available' : 'Unavailable', icon: machine.isActive ? '✅' : '❌' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <LinearGradient colors={t.grad} style={s.hero}>
          <View style={[s.heroImgCard, { backgroundColor: t.bg, borderColor: t.accent }]}>
            {img
              ? <Image source={img} style={{ width: IMG.CATEGORY_SHOWCASE * 0.55, height: IMG.CATEGORY_SHOWCASE * 0.55 }} resizeMode="contain" />
              : <Text style={{ fontSize: rf(52) }}>🚜</Text>
            }
          </View>
          <Text style={s.heroTitle}>{label}</Text>
          <View style={s.heroPill}><Text style={s.heroPillTxt}>📍 {machine.taluk}</Text></View>
        </LinearGradient>

        {/* Info card */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Machine Details</Text>
          <View style={s.card}>
            {INFO.map((r, i) => (
              <View key={r.l} style={[s.row, i === INFO.length - 1 && s.rowLast]}>
                <View style={s.rowLeft}><Text style={s.rowIcon}>{r.icon}</Text><Text style={s.rowLabel}>{r.l}</Text></View>
                <Text style={[s.rowValue, !machine.isActive && r.l === 'Availability' && { color: COLORS.error }, machine.isActive && r.l === 'Availability' && { color: COLORS.success }]}>{r.v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Owner contact */}
        {machine.ownerPhone && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📞 Contact Owner Before Booking</Text>
            <PhoneConnect phone={machine.ownerPhone} name={machine.ownerName || 'Owner'} role="Machine Owner 🚜" />
          </View>
        )}

        {/* Book button */}
        <View style={s.section}>
          <TouchableOpacity
            style={[s.bookBtn, { backgroundColor: machine.isActive ? t.accent : '#D1D5DB' }]}
            onPress={() => machine.isActive && navigation.navigate('Booking', { machine })}
            activeOpacity={0.88}
          >
            <Text style={s.bookBtnTxt}>
              {machine.isActive ? '📅 Book This Machine' : '❌ Machine Unavailable'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: rs(24) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.background },
  scroll:       { paddingBottom: rs(32) },
  hero:         { paddingTop: rs(32), paddingBottom: rs(28), paddingHorizontal: H_PAD, alignItems: 'center' },
  heroImgCard:  { width: rs(120), borderRadius: rs(20), borderWidth: rs(2), alignItems: 'center', paddingVertical: rs(16), paddingHorizontal: rs(12), marginBottom: rs(14), elevation: 4, overflow: 'hidden' },
  heroTitle:    { fontSize: rf(24), fontWeight: '900', color: '#fff', marginBottom: rs(10) },
  heroPill:     { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: rs(20), paddingHorizontal: rs(14), paddingVertical: rs(6) },
  heroPillTxt:  { fontSize: rf(13), color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  section:      { paddingHorizontal: H_PAD, marginTop: rs(20) },
  sectionTitle: { fontSize: rf(15), fontWeight: '800', color: COLORS.textPrimary, marginBottom: rs(10) },
  card:         { backgroundColor: '#fff', borderRadius: rs(16), overflow: 'hidden', elevation: 2 },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: rs(13), paddingHorizontal: rs(16), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLast:      { borderBottomWidth: 0 },
  rowLeft:      { flexDirection: 'row', alignItems: 'center' },
  rowIcon:      { fontSize: rf(16), marginRight: rs(8) },
  rowLabel:     { fontSize: rf(13), color: COLORS.textSecondary },
  rowValue:     { fontSize: rf(14), fontWeight: '700', color: COLORS.textPrimary },
  bookBtn:      { borderRadius: rs(14), paddingVertical: rs(16), alignItems: 'center', elevation: 3 },
  bookBtnTxt:   { color: '#fff', fontSize: rf(16), fontWeight: '800' },
});
