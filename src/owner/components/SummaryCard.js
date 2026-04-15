import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function SummaryCard({ jobNumber, farmerName, farmerPhone, hectareCompleted, commission }) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.jobLabel}>Job #{jobNumber}</Text>
        <Text style={styles.commission}>₹{commission}</Text>
      </View>
      <Text style={styles.farmer}>👨‍🌾 {farmerName}</Text>
      {farmerPhone && <Text style={styles.phone}>📞 +91 {farmerPhone}</Text>}
      <Text style={styles.hectare}>🌾 {hectareCompleted} hectare completed</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    marginBottom: 10, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  top:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  jobLabel:   { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  commission: { fontSize: 15, fontWeight: '800', color: COLORS.success },
  farmer:     { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  phone:      { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  hectare:    { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
