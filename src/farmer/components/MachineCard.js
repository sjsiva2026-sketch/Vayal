import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function MachineCard({ machine, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.top}>
        <Text style={styles.type}>{machine.type}</Text>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Available</Text>
        </View>
      </View>
      <Text style={styles.owner}>🚜 {machine.ownerName || 'Owner'}</Text>
      <Text style={styles.price}>₹{machine.price_per_hour}/hr  •  📍 {machine.taluk}</Text>
      {/* Owner phone visible on card */}
      {machine.ownerPhone && (
        <Text style={styles.phone}>📞 +91 {machine.ownerPhone}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8,
  },
  top:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  type:            { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  activeBadge:     { backgroundColor: COLORS.success, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  activeBadgeText: { fontSize: 11, color: COLORS.white, fontWeight: '700' },
  owner:           { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 },
  price:           { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 2 },
  phone:           { fontSize: 12, color: COLORS.textSecondary },
});
