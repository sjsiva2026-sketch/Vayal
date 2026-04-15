import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PhoneConnect from '../../common/components/PhoneConnect';
import { getCategoryLabel } from '../../../constants/categories';
import { COLORS }   from '../../../constants/colors';

export default function BookingConfirm({ navigation, route }) {
  const { otp, machine, date, slot, hectare } = route.params;
  const machineLabel = getCategoryLabel(machine?.type);

  const ROWS = [
    { label: 'Machine',   value: machineLabel,            icon: '🚜' },
    { label: 'Owner',     value: machine?.ownerName || '—', icon: '👤' },
    { label: 'Date',      value: date,                    icon: '📅' },
    { label: 'Time Slot', value: slot,                    icon: '⏰' },
    { label: 'Hectare',   value: `${hectare} ha`,         icon: '🌾' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Success Hero ── */}
        <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.hero}>
          <Text style={s.heroTick}>✅</Text>
          <Text style={s.heroTitle}>Booking Request Sent!</Text>
          <Text style={s.heroSub}>Waiting for owner to accept your request</Text>
        </LinearGradient>

        {/* ── Booking Details ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📋 Booking Details</Text>
          <View style={s.card}>
            {ROWS.map((r, i) => (
              <View key={r.label} style={[s.row, i === ROWS.length - 1 && s.rowLast]}>
                <View style={s.rowLeft}>
                  <Text style={s.rowIcon}>{r.icon}</Text>
                  <Text style={s.rowLabel}>{r.label}</Text>
                </View>
                <Text style={s.rowValue} numberOfLines={1}>{r.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── OTP Box ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🔐 Your Work OTP</Text>
          <View style={s.otpCard}>
            <Text style={s.otpSub}>Show this to the owner at the field to start work</Text>
            <Text style={s.otpCode}>{otp}</Text>
            <View style={s.otpWarn}>
              <Text style={s.otpWarnTxt}>⚠️ Keep it safe — don't share with others</Text>
            </View>
          </View>
        </View>

        {/* ── Contact Owner ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📞 Contact Owner</Text>
          {machine?.ownerPhone ? (
            <PhoneConnect phone={machine.ownerPhone} name={machine.ownerName || 'Owner'} role="Machine Owner 🚜" />
          ) : (
            <View style={s.waitBox}>
              <Text style={s.waitTxt}>📲 Owner contact available after acceptance</Text>
            </View>
          )}
        </View>

        {/* ── Navigation Buttons ── */}
        <View style={s.btnGroup}>
          <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('BookingHistory')} activeOpacity={0.85}>
            <Text style={s.btnPrimaryTxt}>📋 View My Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnOutline} onPress={() => navigation.navigate('FarmerHome')} activeOpacity={0.85}>
            <Text style={s.btnOutlineTxt}>🏠 Back to Home</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.background },
  scroll:       { paddingBottom: 40 },

  hero:         { paddingTop: 40, paddingBottom: 36, paddingHorizontal: 24, alignItems: 'center' },
  heroTick:     { fontSize: 56, marginBottom: 12 },
  heroTitle:    { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center' },
  heroSub:      { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 6, textAlign: 'center' },

  section:      { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },

  card:         { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 2 },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLast:      { borderBottomWidth: 0 },
  rowLeft:      { flexDirection: 'row', alignItems: 'center' },
  rowIcon:      { fontSize: 16, marginRight: 8 },
  rowLabel:     { fontSize: 13, color: COLORS.textSecondary },
  rowValue:     { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, maxWidth: '55%', textAlign: 'right' },

  otpCard:      { backgroundColor: COLORS.primaryDark, borderRadius: 16, padding: 24, alignItems: 'center' },
  otpSub:       { fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 16 },
  otpCode:      { fontSize: 48, fontWeight: '900', color: '#fff', letterSpacing: 14 },
  otpWarn:      { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  otpWarnTxt:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  waitBox:      { backgroundColor: '#FFF9E6', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: COLORS.secondary },
  waitTxt:      { fontSize: 13, color: '#92400E' },

  btnGroup:     { paddingHorizontal: 16, marginTop: 24 },
  btnPrimary:   { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10 },
  btnPrimaryTxt:{ color: '#fff', fontSize: 15, fontWeight: '800' },
  btnOutline:   { borderRadius: 14, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#fff' },
  btnOutlineTxt:{ color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
});
