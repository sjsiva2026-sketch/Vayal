import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PhoneConnect from '../../common/components/PhoneConnect';
import Button       from '../../common/components/Button';
import { COLORS }   from '../../../constants/colors';

export default function WorkInProgress({ navigation, route }) {
  const { booking } = route.params;

  const rows = [
    { label: 'Machine',    value: booking.machineTypeLabel || booking.machineType || '—' },
    { label: 'Farmer',     value: booking.farmerName || '—' },
    { label: 'Date',       value: booking.date || '—' },
    { label: 'Time Slot',  value: booking.timeSlot || '—' },
    { label: 'Hectare',    value: `${booking.hectareRequested || 0} ha requested` },
  ];

  const workStartStr = booking.workStartedAt
    ? new Date(booking.workStartedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status Header ── */}
        <LinearGradient colors={['#1D4ED8', '#3B82F6']} style={s.header}>
          <Text style={s.headerIcon}>⚙️</Text>
          <Text style={s.headerTitle}>Work In Progress</Text>
          <Text style={s.headerSub}>Machine is operating on the field</Text>
          {workStartStr && (
            <View style={s.timerPill}>
              <Text style={s.timerPillTxt}>⏱️ Started at {workStartStr} · 24hr timer running</Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Job Details ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Job Details</Text>
          <View style={s.card}>
            {rows.map((r, i) => (
              <View
                key={r.label}
                style={[s.row, i === rows.length - 1 && s.rowLast]}
              >
                <Text style={s.rowLabel}>{r.label}</Text>
                <Text style={s.rowValue} numberOfLines={1}>{r.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Contact Farmer ── */}
        {booking.farmerPhone && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📞 Contact Farmer</Text>
            <PhoneConnect
              phone={booking.farmerPhone}
              name={booking.farmerName || 'Farmer'}
              role="Farmer 👨‍🌾"
            />
          </View>
        )}

        {/* ── Commission notice ── */}
        <View style={s.noticeBanner}>
          <Text style={s.noticeTxt}>
            💰 Commission will be calculated after you mark work complete.
            Pay within 24 hours of work start to keep your account active.
          </Text>
        </View>

        {/* ── Complete Button ── */}
        <View style={s.section}>
          <Button
            title="✅ Mark Work Complete"
            onPress={() => navigation.navigate('WorkComplete', { booking })}
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.background },
  scroll:      { paddingBottom: 32 },

  header:      {
    paddingTop: 36, paddingBottom: 32, paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerIcon:  { fontSize: 52, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 14 },
  timerPill:   {
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  timerPillTxt:{ fontSize: 12, color: '#fff', fontWeight: '700', textAlign: 'center' },

  section:     { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle:{ fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10 },

  card:        {
    backgroundColor: '#fff', borderRadius: 14,
    overflow: 'hidden', elevation: 2,
  },
  row:         {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowLast:     { borderBottomWidth: 0 },
  rowLabel:    { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  rowValue:    {
    fontSize: 13, fontWeight: '700', color: COLORS.textPrimary,
    flex: 2, textAlign: 'right',
  },

  noticeBanner:{
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: '#FFF3CD', borderRadius: 12,
    padding: 14, borderLeftWidth: 4, borderLeftColor: '#F59E0B',
  },
  noticeTxt:   { fontSize: 13, color: '#856404', lineHeight: 20, fontWeight: '600' },
});
