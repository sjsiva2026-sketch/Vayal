import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PhoneConnect from '../../common/components/PhoneConnect';
import { getCategoryLabel, getCategoryIcon } from '../../../constants/categories';
import { COLORS }   from '../../../constants/colors';

export default function MachineDetails({ navigation, route }) {
  const { machine }  = route.params;
  const label        = getCategoryLabel(machine.type);
  const icon         = getCategoryIcon(machine.type);

  const INFO_ROWS = [
    { label: 'Price / Hour', value: `₹${machine.price_per_hour}`, icon: '💰' },
    { label: 'Owner',        value: machine.ownerName || 'N/A',   icon: '👤' },
    { label: 'Taluk',        value: machine.taluk,                icon: '📍' },
    { label: 'Availability', value: machine.isActive ? 'Available' : 'Unavailable', icon: machine.isActive ? '✅' : '❌' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.hero}>
          <View style={s.heroIconBox}>
            <Text style={s.heroIcon}>{icon}</Text>
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
                <Text style={[s.rowValue, !machine.isActive && r.label === 'Availability' && { color: COLORS.error }]}>
                  {r.value}
                </Text>
              </View>
            ))}
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
            style={[s.bookBtn, !machine.isActive && s.bookBtnDisabled]}
            onPress={() => machine.isActive && navigation.navigate('Booking', { machine })}
            activeOpacity={0.88}
          >
            <Text style={s.bookBtnTxt}>
              {machine.isActive ? '📅 Book This Machine' : '❌ Machine Unavailable'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.background },
  scroll:      { paddingBottom: 32 },

  hero:        { paddingTop: 36, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  heroIconBox: { width: 80, height: 80, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroIcon:    { fontSize: 42 },
  heroTitle:   { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 10 },
  heroPill:    { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  heroPillTxt: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  section:     { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle:{ fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },

  card:        { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 2 },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLast:     { borderBottomWidth: 0 },
  rowLeft:     { flexDirection: 'row', alignItems: 'center' },
  rowIcon:     { fontSize: 16, marginRight: 8 },
  rowLabel:    { fontSize: 13, color: COLORS.textSecondary },
  rowValue:    { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },

  bookBtn:         { backgroundColor: COLORS.secondary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', elevation: 3 },
  bookBtnDisabled: { backgroundColor: '#D1D5DB' },
  bookBtnTxt:      { color: '#fff', fontSize: 16, fontWeight: '800' },
});
