import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import PhoneConnect from '../../common/components/PhoneConnect';
import Button       from '../../common/components/Button';
import { COLORS }   from '../../../constants/colors';

export default function WorkInProgress({ navigation, route }) {
  const { booking } = route.params;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.statusCard}>
          <Text style={styles.statusIcon}>⚙️</Text>
          <Text style={styles.statusTitle}>Work In Progress</Text>
          <Text style={styles.statusSub}>Machine is currently operating on the field</Text>
        </View>

        <View style={styles.detailCard}>
          {[
            { label: 'Machine',  value: booking.machineType },
            { label: 'Farmer',   value: booking.farmerName },
            { label: 'Date',     value: booking.date },
            { label: 'Hectare',  value: `${booking.hectareRequested} hectare requested` },
          ].map((r) => (
            <View key={r.label} style={styles.row}>
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Text style={styles.rowValue}>{r.value}</Text>
            </View>
          ))}
        </View>

        {/* Call Farmer anytime during work */}
        {booking.farmerPhone && (
          <>
            <Text style={styles.sectionLabel}>📞 Contact Farmer</Text>
            <PhoneConnect
              phone={booking.farmerPhone}
              name={booking.farmerName || 'Farmer'}
              role="Farmer 👨‍🌾"
            />
          </>
        )}

        <Button
          title="✅ Mark Work Complete"
          onPress={() => navigation.navigate('WorkComplete', { booking })}
          style={{ marginTop: 20 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.background },
  container:    { flex: 1, padding: 20 },
  statusCard: {
    backgroundColor: COLORS.secondary, borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 20,
  },
  statusIcon:   { fontSize: 44, marginBottom: 8 },
  statusTitle:  { fontSize: 20, fontWeight: '800', color: COLORS.white },
  statusSub:    { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  detailCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 16,
    elevation: 2,
  },
  row:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel:     { fontSize: 13, color: COLORS.textSecondary },
  rowValue:     { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
});
