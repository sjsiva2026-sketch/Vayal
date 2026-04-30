import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function SummaryCard({
  jobNumber, farmerName, farmerPhone, hectareCompleted, commission,
}) {
  return (
    <View style={s.card}>
      {/* Top row: job number + commission */}
      <View style={s.top}>
        <View style={s.jobBadge}>
          <Text style={s.jobBadgeTxt}>Job #{jobNumber}</Text>
        </View>
        <Text style={s.commission}>₹{commission}</Text>
      </View>

      {/* Details */}
      <View style={s.detailRow}>
        <Text style={s.detailIcon}>👨‍🌾</Text>
        <Text style={s.detailTxt} numberOfLines={1}>{farmerName}</Text>
      </View>
      {farmerPhone ? (
        <View style={s.detailRow}>
          <Text style={s.detailIcon}>📞</Text>
          <Text style={s.detailTxt}>+91 {farmerPhone}</Text>
        </View>
      ) : null}
      <View style={s.detailRow}>
        <Text style={s.detailIcon}>🌾</Text>
        <Text style={s.detailTxt}>{hectareCompleted} ha completed</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card:       {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 10, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  top:        {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  jobBadge:   {
    backgroundColor: COLORS.primaryXLight,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  jobBadgeTxt:{ fontSize: 12, fontWeight: '800', color: COLORS.primary },
  commission: { fontSize: 18, fontWeight: '900', color: COLORS.success },

  detailRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  detailIcon: { fontSize: 14, marginRight: 8, width: 20 },
  detailTxt:  { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500', flex: 1 },
});
