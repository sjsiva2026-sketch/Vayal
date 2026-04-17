import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { LinearGradient }    from 'expo-linear-gradient';
import PhoneConnect          from '../../common/components/PhoneConnect';
import { getCategoryLabel }  from '../../../constants/categories';
import { CATEGORY_IMAGES }   from '../../../assets/index';
import { COLORS }            from '../../../constants/colors';

// Per-type gradient + accent (matches CategoryScreen / MachineList palette)
const MACHINE_THEME = {
  harvester:    { grad: ['#7C3A00', '#B25A00'], accent: '#F59E0B', bg: '#FFF3E0', labelColor: '#92400E' },
  rotavator:    { grad: ['#0A4D22', '#1C7C54'], accent: '#22C55E', bg: '#E8F5E9', labelColor: '#166534' },
  cultivator:   { grad: ['#1E3A8A', '#2563EB'], accent: '#3B82F6', bg: '#E3F2FD', labelColor: '#1D4ED8' },
  strawchopper: { grad: ['#4A1272', '#7C3AED'], accent: '#A855F7', bg: '#F3E5F5', labelColor: '#6B21A8' },
};
const DEFAULT_THEME = { grad: ['#145A3E', '#1C7C54'], accent: COLORS.primary, bg: '#F4F6F8', labelColor: '#374151' };

export default function MachineDetails({ navigation, route }) {
  const { machine } = route.params;
  const label       = getCategoryLabel(machine.type);
  const img         = CATEGORY_IMAGES[machine.type];
  const theme       = MACHINE_THEME[machine.type] || DEFAULT_THEME;

  const INFO_ROWS = [
    { label: 'Machine Type',  value: label,                                          icon: '🚜' },
    { label: 'Price / Hour',  value: `₹${machine.price_per_hour}`,                   icon: '💰' },
    { label: 'Owner',         value: machine.ownerName || 'N/A',                     icon: '👤' },
    { label: 'Taluk',         value: machine.taluk,                                  icon: '📍' },
    { label: 'Availability',  value: machine.isActive ? 'Available' : 'Unavailable', icon: machine.isActive ? '✅' : '❌' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <LinearGradient colors={theme.grad} style={s.hero}>

          {/* Machine image + name card */}
          <View style={[s.heroImgCard, { backgroundColor: theme.bg, borderColor: theme.accent }]}>
            {img
              ? <Image source={img} style={s.heroImg} resizeMode="contain" />
              : <Text style={s.heroEmoji}>🚜</Text>
            }
            <Text style={[s.heroImgLabel, { color: theme.labelColor }]}>{label}</Text>
          </View>

          <Text style={s.heroTitle}>{label}</Text>
          <View style={s.heroPill}>
            <Text style={s.heroPillTxt}>📍 {machine.taluk}</Text>
          </View>
        </LinearGradient>

        {/* ── Machine Info ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Machine Details</Text>
          <View style={s.card}>
            {INFO_ROWS.map((r, i) => (
              <View key={r.label} style={[s.row, i === INFO_ROWS.length - 1 && s.rowLast]}>
                <View style={s.rowLeft}>
                  <Text style={s.rowIcon}>{r.icon}</Text>
                  <Text style={s.rowLabel}>{r.label}</Text>
                </View>
                <Text style={[
                  s.rowValue,
                  !machine.isActive && r.label === 'Availability' && { color: COLORS.error },
                  machine.isActive  && r.label === 'Availability' && { color: COLORS.success },
                ]}>
                  {r.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 4 Machine Type Visual Chips ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Machine Types We Offer</Text>
          <View style={s.chipsRow}>
            {[
              { id: 'harvester',    label: 'Harvester' },
              { id: 'rotavator',    label: 'Rotavator' },
              { id: 'cultivator',   label: 'Cultivator' },
              { id: 'strawchopper', label: 'Straw Chopper' },
            ].map(mt => {
              const chipImg   = CATEGORY_IMAGES[mt.id];
              const chipTheme = MACHINE_THEME[mt.id] || DEFAULT_THEME;
              const isActive  = mt.id === machine.type;
              return (
                <View
                  key={mt.id}
                  style={[
                    s.chip,
                    { backgroundColor: chipTheme.bg, borderColor: chipTheme.accent },
                    isActive && s.chipActive,
                    isActive && { borderColor: chipTheme.accent, borderWidth: 2.5 },
                  ]}
                >
                  {chipImg
                    ? <Image source={chipImg} style={s.chipImg} resizeMode="contain" />
                    : <Text style={{ fontSize: 22 }}>🚜</Text>
                  }
                  <Text style={[s.chipLabel, { color: chipTheme.labelColor }]} numberOfLines={1}>
                    {mt.label}
                  </Text>
                  {isActive && (
                    <View style={[s.chipBadge, { backgroundColor: chipTheme.accent }]}>
                      <Text style={s.chipBadgeTxt}>✓</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Owner Contact ── */}
        {machine.ownerPhone && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📞 Contact Owner Before Booking</Text>
            <PhoneConnect phone={machine.ownerPhone} name={machine.ownerName || 'Owner'} role="Machine Owner 🚜" />
          </View>
        )}

        {/* ── Book Button ── */}
        <View style={s.section}>
          <TouchableOpacity
            style={[
              s.bookBtn,
              { backgroundColor: machine.isActive ? theme.accent : '#D1D5DB' },
              !machine.isActive && s.bookBtnDisabled,
            ]}
            onPress={() => machine.isActive && navigation.navigate('Booking', { machine })}
            activeOpacity={0.88}
          >
            <Text style={s.bookBtnTxt}>
              {machine.isActive ? '📅 Book This Machine' : '❌ Machine Unavailable'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 32 },

  // ── Hero ──
  hero:         { paddingTop: 32, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  heroImgCard:  {
    width: 120, borderRadius: 20, borderWidth: 2,
    alignItems: 'center', paddingTop: 14,
    paddingBottom: 10, paddingHorizontal: 10,
    marginBottom: 14, elevation: 4,
  },
  heroImg:      { width: 88, height: 72 },
  heroEmoji:    { fontSize: 52 },
  heroImgLabel: { fontSize: 11, fontWeight: '900', textAlign: 'center', marginTop: 8, letterSpacing: 0.5 },
  heroTitle:    { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 10 },
  heroPill:     {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  heroPillTxt:  { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  // ── Section ──
  section:      { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },

  // ── Detail card ──
  card:    { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 2 },
  row:     {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { fontSize: 16, marginRight: 8 },
  rowLabel:{ fontSize: 13, color: COLORS.textSecondary },
  rowValue:{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },

  // ── 4 chips row ──
  chipsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  chip: {
    flex: 1, marginHorizontal: 4,
    borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', paddingVertical: 10,
    paddingHorizontal: 4, position: 'relative',
  },
  chipActive: { elevation: 3 },
  chipImg:    { width: 44, height: 36, marginBottom: 6 },
  chipLabel:  { fontSize: 8, fontWeight: '800', textAlign: 'center', letterSpacing: 0.2 },
  chipBadge:  {
    position: 'absolute', top: -6, right: -6,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  chipBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },

  // ── Book button ──
  bookBtn:         { borderRadius: 14, paddingVertical: 16, alignItems: 'center', elevation: 3 },
  bookBtnDisabled: { elevation: 0 },
  bookBtnTxt:      { color: '#fff', fontSize: 16, fontWeight: '800' },
});
