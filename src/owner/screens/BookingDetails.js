// src/owner/screens/BookingDetails.js
import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, StatusBar,
} from 'react-native';
import PhoneConnect from '../../common/components/PhoneConnect';
import Button       from '../../common/components/Button';
import { COLORS }   from '../../../constants/colors';
import { rs, rf, H_PAD } from '../../../utils/responsive';

export default function BookingDetails({ navigation, route }) {
  const { booking } = route.params;

  const ROWS = [
    { label: 'Machine',           value: booking.machineTypeLabel || booking.machineType },
    { label: 'Date',              value: booking.date },
    { label: 'Time Slot',         value: booking.timeSlot },
    { label: 'Hectare Requested', value: `${booking.hectareRequested} ha` },
    { label: 'Hectare Completed', value: `${booking.hectareCompleted || 0} ha` },
    { label: 'Status',            value: booking.status?.toUpperCase() },
  ];

  const STATUS_COLOR = {
    PENDING:   { bg: '#FFFBEB', color: '#92400E' },
    ACCEPTED:  { bg: '#ECFDF5', color: '#065F46' },
    ONGOING:   { bg: '#EFF6FF', color: '#1D4ED8' },
    COMPLETED: { bg: '#F0FDF4', color: '#166534' },
    REJECTED:  { bg: '#FEF2F2', color: '#991B1B' },
  };
  const statusStyle = STATUS_COLOR[booking.status?.toUpperCase()] || { bg: '#F4F6F8', color: '#374151' };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Booking Details</Text>
          <View style={[s.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[s.statusTxt, { color: statusStyle.color }]}>
              {booking.status?.toUpperCase() || '—'}
            </Text>
          </View>
        </View>

        {/* Farmer info */}
        <View style={s.farmerCard}>
          <View style={s.farmerAvatar}>
            <Text style={{ fontSize: rf(24) }}>👨‍🌾</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.farmerName}>{booking.farmerName || 'Farmer'}</Text>
            {booking.farmerPhone && (
              <Text style={s.farmerPhone}>📞 +91 {booking.farmerPhone}</Text>
            )}
          </View>
        </View>

        {/* Details card */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Booking Info</Text>
          <View style={s.card}>
            {ROWS.map((r, i) => (
              <View key={r.label} style={[s.row, i === ROWS.length - 1 && s.rowLast]}>
                <Text style={s.rowLabel}>{r.label}</Text>
                <Text style={s.rowValue}>{r.value || '—'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Farmer contact */}
        {booking.farmerPhone && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📞 Farmer Contact</Text>
            <PhoneConnect
              phone={booking.farmerPhone}
              name={booking.farmerName || 'Farmer'}
              role="Farmer 👨‍🌾"
            />
          </View>
        )}

        {/* Action buttons */}
        <View style={s.section}>
          {booking.status === 'accepted' && (
            <Button
              title="🔐 Start Work (Enter OTP)"
              onPress={() => navigation.navigate('WorkStartOTP', { booking })}
            />
          )}
          {booking.status === 'ongoing' && (
            <Button
              title="✅ Complete Work"
              onPress={() => navigation.navigate('WorkComplete', { booking })}
            />
          )}
        </View>

        <View style={{ height: rs(32) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#fff' },
  scroll:       { paddingBottom: rs(32) },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: H_PAD, paddingTop: rs(16), paddingBottom: rs(12), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:        { fontSize: rf(20), fontWeight: '800', color: '#111827' },
  statusBadge:  { borderRadius: rs(10), paddingHorizontal: rs(12), paddingVertical: rs(5) },
  statusTxt:    { fontSize: rf(12), fontWeight: '800' },
  farmerCard:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: H_PAD, marginTop: rs(16), backgroundColor: COLORS.primaryLight, borderRadius: rs(14), padding: rs(14) },
  farmerAvatar: { width: rs(48), height: rs(48), borderRadius: rs(24), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: rs(12) },
  farmerName:   { fontSize: rf(15), fontWeight: '800', color: '#111827' },
  farmerPhone:  { fontSize: rf(13), color: COLORS.textSecondary, marginTop: rs(2) },
  section:      { paddingHorizontal: H_PAD, marginTop: rs(20) },
  sectionTitle: { fontSize: rf(14), fontWeight: '700', color: COLORS.textSecondary, marginBottom: rs(10) },
  card:         { backgroundColor: '#fff', borderRadius: rs(14), overflow: 'hidden', elevation: 2, borderWidth: 1, borderColor: COLORS.border },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: rs(13), paddingHorizontal: rs(16), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLast:      { borderBottomWidth: 0 },
  rowLabel:     { fontSize: rf(13), color: COLORS.textSecondary },
  rowValue:     { fontSize: rf(13), fontWeight: '600', color: '#111827' },
});
