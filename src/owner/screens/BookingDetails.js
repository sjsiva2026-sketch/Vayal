import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import PhoneConnect from '../../common/components/PhoneConnect';
import Button       from '../../common/components/Button';
import { COLORS }   from '../../../constants/colors';

export default function BookingDetails({ navigation, route }) {
  const { booking } = route.params;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📋 Booking Details</Text>

        <View style={styles.card}>
          {[
            { label: 'Machine',         value: booking.machineType },
            { label: 'Date',            value: booking.date },
            { label: 'Time Slot',       value: booking.timeSlot },
            { label: 'Hectare Requested', value: `${booking.hectareRequested} ha` },
            { label: 'Hectare Completed', value: `${booking.hectareCompleted || 0} ha` },
            { label: 'Status',          value: booking.status?.toUpperCase() },
          ].map((r) => (
            <View key={r.label} style={styles.row}>
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Text style={styles.rowValue}>{r.value}</Text>
            </View>
          ))}
        </View>

        {/* Farmer contact */}
        {booking.farmerPhone && (
          <>
            <Text style={styles.sectionTitle}>📞 Farmer Contact</Text>
            <PhoneConnect phone={booking.farmerPhone} name={booking.farmerName || 'Farmer'} role="Farmer 👨‍🌾" />
          </>
        )}

        {booking.status === 'accepted' && (
          <Button title="🔐 Start Work (Enter OTP)" onPress={() => navigation.navigate('WorkStartOTP', { booking })} style={{ marginTop: 12 }} />
        )}
        {booking.status === 'ongoing' && (
          <Button title="✅ Complete Work" onPress={() => navigation.navigate('WorkComplete', { booking })} style={{ marginTop: 12 }} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.background },
  container:    { padding: 20 },
  title:        { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },
  card:         { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel:     { fontSize: 13, color: COLORS.textSecondary },
  rowValue:     { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
});
