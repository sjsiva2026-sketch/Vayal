// src/owner/screens/WorkInProgress.js
// Responsive work in progress screen

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, StatusBar,
} from 'react-native';
import { LinearGradient }  from 'expo-linear-gradient';
import { updateBooking }   from '../../../firebase/firestore';
import { getCategoryLabel } from '../../../constants/categories';
import PhoneConnect        from '../../common/components/PhoneConnect';
import { COLORS }          from '../../../constants/colors';
import { rs, rf, H_PAD }   from '../../../utils/responsive';

export default function WorkInProgress({ navigation, route }) {
  const { booking }     = route.params;
  const machineLabel    = booking.machineTypeLabel || getCategoryLabel(booking.machineType);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);

  // Live elapsed timer
  useEffect(() => {
    const start = booking.workStartedAt
      ? new Date(booking.workStartedAt).getTime()
      : Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  };

  const handleFinish = () => {
    Alert.alert(
      'Finish Work?',
      'Mark work as complete and enter hectares done?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Finish',
          onPress: () => navigation.replace('WorkComplete', { booking }),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.header}>
          <Text style={s.headerIcon}>⚙️</Text>
          <Text style={s.headerTitle}>Work In Progress</Text>
          <Text style={s.headerSub}>{machineLabel} · {booking.farmerName || 'Farmer'}</Text>
          {/* Elapsed timer */}
          <View style={s.timerBox}>
            <Text style={s.timerLabel}>Elapsed Time</Text>
            <Text style={s.timerValue}>{fmt(elapsed)}</Text>
          </View>
        </LinearGradient>

        {/* Job details */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Job Details</Text>
          {[
            { icon: '📅', label: 'Date',              value: booking.date },
            { icon: '⏰', label: 'Time Slot',         value: booking.timeSlot },
            { icon: '🌾', label: 'Hectares Requested', value: `${booking.hectareRequested} ha` },
            { icon: '🚜', label: 'Machine',           value: machineLabel },
          ].map((r, i, arr) => (
            <View key={r.label} style={[s.row, i === arr.length - 1 && s.rowLast]}>
              <View style={s.rowLeft}>
                <Text style={s.rowIcon}>{r.icon}</Text>
                <Text style={s.rowLabel}>{r.label}</Text>
              </View>
              <Text style={s.rowValue}>{r.value}</Text>
            </View>
          ))}
        </View>

        {/* Farmer contact */}
        {booking.farmerPhone && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Farmer Contact</Text>
            <PhoneConnect
              phone={booking.farmerPhone}
              name={booking.farmerName || 'Farmer'}
              role="Farmer 👨‍🌾"
            />
          </View>
        )}

        {/* Finish button */}
        <View style={s.section}>
          <TouchableOpacity
            style={[s.finishBtn, loading && s.finishBtnOff]}
            onPress={handleFinish}
            disabled={loading}
            activeOpacity={0.88}
          >
            <Text style={s.finishBtnTxt}>
              {loading ? 'Processing...' : '✅  Mark Work Complete'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: rs(32) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: COLORS.background },
  scroll:     { paddingBottom: rs(32) },
  header:     { paddingTop: rs(40), paddingBottom: rs(30), paddingHorizontal: H_PAD, alignItems: 'center' },
  headerIcon: { fontSize: rf(44), marginBottom: rs(8) },
  headerTitle:{ fontSize: rf(22), fontWeight: '900', color: '#fff', marginBottom: rs(4) },
  headerSub:  { fontSize: rf(13), color: 'rgba(255,255,255,0.75)', marginBottom: rs(16) },
  timerBox:   { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: rs(14), paddingHorizontal: rs(32), paddingVertical: rs(14), alignItems: 'center' },
  timerLabel: { fontSize: rf(12), color: 'rgba(255,255,255,0.7)', marginBottom: rs(4) },
  timerValue: { fontSize: rf(36), fontWeight: '900', color: '#fff', letterSpacing: rs(4) },
  card:       { backgroundColor: '#fff', borderRadius: rs(16), marginHorizontal: H_PAD, marginTop: rs(20), elevation: 2, overflow: 'hidden', padding: rs(4) },
  cardTitle:  { fontSize: rf(14), fontWeight: '700', color: COLORS.textSecondary, paddingHorizontal: rs(12), paddingTop: rs(10), paddingBottom: rs(6) },
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: rs(12), paddingHorizontal: rs(12), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLast:    { borderBottomWidth: 0 },
  rowLeft:    { flexDirection: 'row', alignItems: 'center' },
  rowIcon:    { fontSize: rf(16), marginRight: rs(8) },
  rowLabel:   { fontSize: rf(13), color: COLORS.textSecondary },
  rowValue:   { fontSize: rf(13), fontWeight: '700', color: COLORS.textPrimary },
  section:    { paddingHorizontal: H_PAD, marginTop: rs(20) },
  sectionTitle:{ fontSize: rf(14), fontWeight: '700', color: COLORS.textSecondary, marginBottom: rs(10) },
  finishBtn:  { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(16), alignItems: 'center' },
  finishBtnOff:{ backgroundColor: '#D1D5DB' },
  finishBtnTxt:{ color: '#fff', fontSize: rf(16), fontWeight: '800' },
});
