// src/owner/screens/WorkInProgress.js
import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PhoneConnect from '../../common/components/PhoneConnect';
import Button       from '../../common/components/Button';
import { COLORS }   from '../../../constants/colors';
import { rs, rf, H_PAD } from '../../../utils/responsive';

export default function WorkInProgress({ navigation, route }) {
  const { booking } = route.params;

  const rows = [
    { label: 'Machine',    value: booking.machineTypeLabel || booking.machineType || '—' },
    { label: 'Farmer',     value: booking.farmerName   || '—' },
    { label: 'Date',       value: booking.date          || '—' },
    { label: 'Time Slot',  value: booking.timeSlot      || '—' },
    { label: 'Hectare',    value: `${booking.hectareRequested || 0} ha requested` },
  ];

  const workStartStr = booking.workStartedAt
    ? new Date(booking.workStartedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : null;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Status Header */}
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

        {/* Job Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Job Details</Text>
          <View style={s.card}>
            {rows.map((r, i) => (
              <View key={r.label} style={[s.row, i === rows.length - 1 && s.rowLast]}>
                <Text style={s.rowLabel}>{r.label}</Text>
                <Text style={s.rowValue} numberOfLines={1}>{r.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact Farmer */}
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

        {/* Commission notice */}
        <View style={s.noticeBanner}>
          <Text style={s.noticeTxt}>
            💰 Commission will be calculated after you mark work complete.
            Pay within 24 hours of work start to keep your account active.
          </Text>
        </View>

        {/* Complete Button */}
        <View style={s.section}>
          <Button
            title="✅ Mark Work Complete"
            onPress={() => navigation.navigate('WorkComplete', { booking })}
          />
        </View>

        <View style={{ height: rs(32) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.background },
  scroll:        { paddingBottom: rs(32) },
  header:        { paddingTop: rs(36), paddingBottom: rs(32), paddingHorizontal: H_PAD, alignItems: 'center' },
  headerIcon:    { fontSize: rf(52), marginBottom: rs(12) },
  headerTitle:   { fontSize: rf(22), fontWeight: '900', color: '#fff', marginBottom: rs(6) },
  headerSub:     { fontSize: rf(13), color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: rs(14) },
  timerPill:     { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: rs(12), paddingHorizontal: rs(14), paddingVertical: rs(8) },
  timerPillTxt:  { fontSize: rf(12), color: '#fff', fontWeight: '700', textAlign: 'center' },
  section:       { paddingHorizontal: H_PAD, marginTop: rs(20) },
  sectionTitle:  { fontSize: rf(14), fontWeight: '700', color: COLORS.textSecondary, marginBottom: rs(10) },
  card:          { backgroundColor: '#fff', borderRadius: rs(14), overflow: 'hidden', elevation: 2 },
  row:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: rs(13), paddingHorizontal: rs(16), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLast:       { borderBottomWidth: 0 },
  rowLabel:      { fontSize: rf(13), color: COLORS.textSecondary, flex: 1 },
  rowValue:      { fontSize: rf(13), fontWeight: '700', color: COLORS.textPrimary, flex: 2, textAlign: 'right' },
  noticeBanner:  { marginHorizontal: H_PAD, marginTop: rs(20), backgroundColor: '#FFF3CD', borderRadius: rs(12), padding: rs(14), borderLeftWidth: rs(4), borderLeftColor: '#F59E0B' },
  noticeTxt:     { fontSize: rf(13), color: '#856404', lineHeight: rf(20), fontWeight: '600' },
});
