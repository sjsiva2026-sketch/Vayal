import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../../constants/colors';

const STATUS_COLOR = {
  pending:   COLORS.warning,
  accepted:  COLORS.primary,
  ongoing:   COLORS.secondary,
  completed: COLORS.success,
  rejected:  COLORS.error,
};

export default function BookingCard({ booking, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.top}>
        <Text style={styles.type}>🚜 {booking.machineType}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[booking.status] || COLORS.border }]}>
          <Text style={styles.badgeText}>{booking.status?.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.meta}>📅 {booking.date}  •  ⏰ {booking.timeSlot}</Text>
      <Text style={styles.meta}>🌾 {booking.hectareRequested} ha requested</Text>
      {booking.ownerPhone && <Text style={styles.phone}>Owner: 📞 +91 {booking.ownerPhone}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3,
  },
  top:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  type:      { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  badge:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, color: COLORS.white, fontWeight: '700' },
  meta:      { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  phone:     { fontSize: 12, color: COLORS.primary, marginTop: 4, fontWeight: '600' },
});
