import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import PhoneConnect from '../../common/components/PhoneConnect';
import { COLORS }   from '../../../constants/colors';

const STATUS_COLOR = {
  pending:   COLORS.warning,
  accepted:  COLORS.primary,
  ongoing:   COLORS.secondary,
  completed: COLORS.success,
  rejected:  COLORS.error,
};

export default function BookingCard({ booking, onPress, showFarmerContact = false }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.top}>
        <Text style={styles.farmerName}>👨‍🌾 {booking.farmerName || 'Farmer'}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[booking.status] || COLORS.border }]}>
          <Text style={styles.badgeText}>{booking.status?.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.meta}>🚜 {booking.machineType}  •  📅 {booking.date}</Text>
      <Text style={styles.meta}>🌾 {booking.hectareRequested} ha  •  ⏰ {booking.timeSlot}</Text>

      {/* Inline farmer phone contact */}
      {showFarmerContact && booking.farmerPhone && (
        <PhoneConnect
          phone={booking.farmerPhone}
          name={booking.farmerName || 'Farmer'}
          role="Farmer 👨‍🌾"
          showLabel={false}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
  },
  top:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  farmerName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  badge:      { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText:  { fontSize: 10, color: COLORS.white, fontWeight: '700' },
  meta:       { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
