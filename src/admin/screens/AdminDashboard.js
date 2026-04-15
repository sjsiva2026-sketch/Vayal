import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db }      from '../../../firebase/config';
import Loader      from '../../common/components/Loader';
import { COLORS }  from '../../../constants/colors';

export default function AdminDashboard({ navigation }) {
  const [stats, setStats]     = useState({ farmers: 0, owners: 0, bookings: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [farmersSnap, ownersSnap, bookingsSnap, paymentsSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'),         where('role', '==', 'farmer'))),
        getDocs(query(collection(db, 'users'),         where('role', '==', 'owner'))),
        getDocs(collection(db, 'bookings')),
        getDocs(query(collection(db, 'dailyPayments'), where('status', '==', 'paid'))),
      ]);
      const revenue = paymentsSnap.docs.reduce((sum, d) => sum + (d.data().totalCommission || 0), 0);
      setStats({
        farmers:  farmersSnap.size,
        owners:   ownersSnap.size,
        bookings: bookingsSnap.size,
        revenue,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <Loader />;

  const menuItems = [
    { icon: '👨‍🌾', label: 'Users',    screen: 'UsersList' },
    { icon: '🚜', label: 'Machines',  screen: 'MachinesList' },
    { icon: '💰', label: 'Payments',  screen: 'PaymentsList' },
    { icon: '📊', label: 'Reports',   screen: 'Reports' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>🌾 Vayal Admin</Text>
          <Text style={styles.subtitle}>Platform Overview</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Farmers',  value: stats.farmers,  color: COLORS.primary },
            { label: 'Owners',   value: stats.owners,   color: COLORS.secondary },
            { label: 'Bookings', value: stats.bookings, color: COLORS.warning },
            { label: 'Revenue',  value: `₹${stats.revenue}`, color: COLORS.success },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <Text style={styles.sectionTitle}>Manage</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((m) => (
            <TouchableOpacity key={m.screen} style={styles.menuCard} onPress={() => navigation.navigate(m.screen)}>
              <Text style={styles.menuIcon}>{m.icon}</Text>
              <Text style={styles.menuLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.background },
  header:      { backgroundColor: COLORS.primary, padding: 24, paddingTop: 40 },
  title:       { fontSize: 24, fontWeight: '800', color: COLORS.white },
  subtitle:    { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', padding: 12 },
  statCard: {
    width: '46%', margin: '2%', backgroundColor: COLORS.white,
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderTopWidth: 3, elevation: 3,
  },
  statValue:   { fontSize: 22, fontWeight: '800' },
  statLabel:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  sectionTitle:{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginHorizontal: 16, marginBottom: 8 },
  menuGrid:    { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 24 },
  menuCard: {
    width: '44%', margin: '3%', backgroundColor: COLORS.white, borderRadius: 16,
    padding: 20, alignItems: 'center', elevation: 3,
  },
  menuIcon:    { fontSize: 36, marginBottom: 8 },
  menuLabel:   { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
});
