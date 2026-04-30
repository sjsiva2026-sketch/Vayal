import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function EarningsCard({ totalHectare, totalCommission, status }) {
  const isPaid = status === 'paid';
  return (
    <View style={s.card}>
      <View style={s.row}>
        <View style={s.item}>
          <Text style={s.value}>{totalHectare ?? 0} ha</Text>
          <Text style={s.label}>Hectare Done</Text>
        </View>
        <View style={s.divider} />
        <View style={s.item}>
          <Text style={[s.value, { color: '#FCD34D' }]}>₹{totalCommission ?? 0}</Text>
          <Text style={s.label}>Commission</Text>
        </View>
        <View style={s.divider} />
        <View style={s.item}>
          <View style={[s.badge, { backgroundColor: isPaid ? '#22C55E' : '#EF4444' }]}>
            <Text style={s.badgeText}>{isPaid ? '✅ PAID' : '❌ UNPAID'}</Text>
          </View>
          <Text style={s.label}>Status</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card:      {
    backgroundColor: COLORS.primaryDark, borderRadius: 16,
    padding: 20, marginBottom: 4, elevation: 4,
  },
  row:       {
    flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'center',
  },
  item:      { flex: 1, alignItems: 'center' },
  value:     { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 6 },
  label:     { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  divider:   { width: 1, height: 44, backgroundColor: 'rgba(255,255,255,0.15)' },
  badge:     {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, marginBottom: 6,
  },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '800' },
});
