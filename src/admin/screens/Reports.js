import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { getDocs, collection } from 'firebase/firestore';
import { db }     from '../../../firebase/config';
import Loader     from '../../common/components/Loader';
import { COLORS } from '../../../constants/colors';

export default function Reports() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [usersSnap, machinesSnap, bookingsSnap, paymentsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'machines')),
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'dailyPayments')),
      ]);
      const users    = usersSnap.docs.map(d => d.data());
      const bookings = bookingsSnap.docs.map(d => d.data());
      const payments = paymentsSnap.docs.map(d => d.data());
      const totalHectare   = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.hectareCompleted || 0), 0);
      const totalRevenue   = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.totalCommission || 0), 0);
      const pendingRevenue = payments.filter(p => p.status === 'unpaid').reduce((s, p) => s + (p.totalCommission || 0), 0);
      const districtMap = {};
      users.forEach(u => { const d = u.district || 'Unknown'; districtMap[d] = (districtMap[d] || 0) + 1; });
      const topDistricts = Object.entries(districtMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
      setData({
        totalFarmers:     users.filter(u => u.role === 'farmer').length,
        totalOwners:      users.filter(u => u.role === 'owner').length,
        verifiedOwners:   users.filter(u => u.role === 'owner' && u.verified).length,
        lockedOwners:     users.filter(u => u.isLocked).length,
        totalMachines:    machinesSnap.size,
        activeMachines:   machinesSnap.docs.filter(d => d.data().isActive).length,
        totalBookings:    bookings.length,
        completedBookings:bookings.filter(b => b.status === 'completed').length,
        pendingBookings:  bookings.filter(b => b.status === 'pending').length,
        totalHectare:     totalHectare.toFixed(1),
        totalRevenue, pendingRevenue, topDistricts,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <Loader />;

  const Section = ({ title, rows }) => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {rows.map(r => (
        <View key={r.label} style={s.row}>
          <Text style={s.rowLabel}>{r.label}</Text>
          <Text style={[s.rowValue, r.color ? { color: r.color } : {}]}>{r.value}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.pageTitle}>📊 Platform Reports</Text>
        <Section title="👥 Users" rows={[
          { label: 'Total Farmers',   value: data.totalFarmers },
          { label: 'Total Owners',    value: data.totalOwners },
          { label: 'Verified Owners', value: data.verifiedOwners, color: COLORS.success },
          { label: 'Locked Owners',   value: data.lockedOwners,   color: COLORS.error },
        ]} />
        <Section title="🚜 Machines" rows={[
          { label: 'Total Machines',  value: data.totalMachines },
          { label: 'Active Machines', value: data.activeMachines, color: COLORS.success },
        ]} />
        <Section title="📋 Bookings" rows={[
          { label: 'Total Bookings',     value: data.totalBookings },
          { label: 'Completed',          value: data.completedBookings, color: COLORS.success },
          { label: 'Pending',            value: data.pendingBookings,   color: COLORS.warning },
          { label: 'Total Hectare Done', value: `${data.totalHectare} ha` },
        ]} />
        <Section title="💰 Revenue" rows={[
          { label: 'Total Collected', value: `₹${data.totalRevenue}`,  color: COLORS.success },
          { label: 'Pending Revenue', value: `₹${data.pendingRevenue}`, color: COLORS.error },
          { label: 'Rate',            value: '₹30 / hectare' },
        ]} />
        <View style={s.section}>
          <Text style={s.sectionTitle}>📍 Top Districts</Text>
          {data.topDistricts.map(([dist, count], i) => (
            <View key={dist} style={s.distRow}>
              <Text style={s.distRank}>#{i + 1}</Text>
              <Text style={s.distName}>{dist}</Text>
              <View style={[s.distBar, { width: `${Math.min(count * 20, 80)}%` }]} />
              <Text style={s.distCount}>{count}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.background },
  container:   { padding: 20, paddingBottom: 40 },
  pageTitle:   { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 20 },
  section:     { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  sectionTitle:{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel:    { fontSize: 13, color: COLORS.textSecondary },
  rowValue:    { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  distRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  distRank:    { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, width: 24 },
  distName:    { fontSize: 13, color: COLORS.textPrimary, width: 100, marginRight: 8 },
  distBar:     { height: 8, backgroundColor: COLORS.primaryLight, borderRadius: 4, flex: 1, marginRight: 8 },
  distCount:   { fontSize: 12, color: COLORS.textSecondary, width: 30 },
});
