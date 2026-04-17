import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db }                    from '../../../firebase/config';
import { getAppAccountSummary }  from '../../../firebase/firestore';
import Loader                    from '../../common/components/Loader';
import { COLORS }                from '../../../constants/colors';

export default function AdminDashboard({ navigation }) {
  const [stats, setStats]     = useState({ farmers: 0, owners: 0, bookings: 0, revenue: 0 });
  const [account, setAccount] = useState({ totalReceived: 0, totalHectare: 0, totalEntries: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [farmersSnap, ownersSnap, bookingsSnap, paymentsSnap, appAcc] = await Promise.all([
        getDocs(query(collection(db, 'users'),         where('role', '==', 'farmer'))),
        getDocs(query(collection(db, 'users'),         where('role', '==', 'owner'))),
        getDocs(collection(db, 'bookings')),
        getDocs(query(collection(db, 'dailyPayments'), where('status', '==', 'paid'))),
        getAppAccountSummary(),
      ]);
      const revenue = paymentsSnap.docs.reduce((sum, d) => sum + (d.data().totalCommission || 0), 0);
      setStats({
        farmers:  farmersSnap.size,
        owners:   ownersSnap.size,
        bookings: bookingsSnap.size,
        revenue,
      });
      setAccount(appAcc);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <Loader />;

  const menuItems = [
    { icon: '👨‍🌾', label: 'Users',      screen: 'UsersList'      },
    { icon: '🚜',  label: 'Machines',   screen: 'MachinesList'   },
    { icon: '💰',  label: 'Payments',   screen: 'PaymentsList'   },
    { icon: '📊',  label: 'Reports',    screen: 'Reports'        },
    { icon: '🏦',  label: 'App Account',screen: 'AdminAppAccount'},
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>🌾 Vayal Admin</Text>
          <Text style={styles.subtitle}>Platform Overview</Text>
        </View>

        {/* ── App Bank Account Card ── */}
        <TouchableOpacity
          style={styles.bankCard}
          onPress={() => navigation.navigate('AdminAppAccount')}
          activeOpacity={0.88}
        >
          <View style={styles.bankHeader}>
            <View>
              <Text style={styles.bankTitle}>🏦 App Bank Account</Text>
              <Text style={styles.bankSub}>Total commission collected from owners</Text>
            </View>
            <View style={styles.bankArrow}>
              <Text style={styles.bankArrowTxt}>›</Text>
            </View>
          </View>
          <View style={styles.bankStats}>
            <View style={styles.bankStat}>
              <Text style={styles.bankStatVal}>₹{account.totalReceived || 0}</Text>
              <Text style={styles.bankStatLabel}>Total Balance</Text>
            </View>
            <View style={styles.bankDiv} />
            <View style={styles.bankStat}>
              <Text style={styles.bankStatVal}>{(account.totalHectare || 0).toFixed(1)} ha</Text>
              <Text style={styles.bankStatLabel}>Hectares Served</Text>
            </View>
            <View style={styles.bankDiv} />
            <View style={styles.bankStat}>
              <Text style={styles.bankStatVal}>{account.totalEntries || 0}</Text>
              <Text style={styles.bankStatLabel}>Transactions</Text>
            </View>
          </View>
        </TouchableOpacity>

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

  // App bank account card
  bankCard:    {
    margin: 16, borderRadius: 18,
    backgroundColor: '#0F4C2A',
    padding: 20, elevation: 4,
  },
  bankHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  bankTitle:   { fontSize: 17, fontWeight: '900', color: '#fff' },
  bankSub:     { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  bankArrow:   { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  bankArrowTxt:{ fontSize: 22, color: '#fff', fontWeight: '700', lineHeight: 28 },
  bankStats:   { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14 },
  bankStat:    { flex: 1, alignItems: 'center' },
  bankStatVal: { fontSize: 18, fontWeight: '900', color: '#fff' },
  bankStatLabel:{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  bankDiv:     { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

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
