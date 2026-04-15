import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function EarningsCard({ totalHectare, totalCommission, status }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={styles.value}>{totalHectare ?? 0} ha</Text>
          <Text style={styles.label}>Hectare Done</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Text style={[styles.value, { color: COLORS.secondary }]}>₹{totalCommission ?? 0}</Text>
          <Text style={styles.label}>Commission Due</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <View style={[styles.badge, { backgroundColor: status === 'paid' ? COLORS.success : COLORS.error }]}>
            <Text style={styles.badgeText}>{status === 'paid' ? '✅ PAID' : '❌ UNPAID'}</Text>
          </View>
          <Text style={styles.label}>Status</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.primaryDark, borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 4,
  },
  row:      { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  item:     { alignItems: 'center', flex: 1 },
  value:    { fontSize: 20, fontWeight: '800', color: COLORS.white },
  label:    { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  divider:  { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  badge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:{ fontSize: 11, color: COLORS.white, fontWeight: '700' },
});
