import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db }                    from '../../../firebase/config';
import { getAppAccountSummary }  from '../../../firebase/firestore';
import { logout }                from '../../../firebase/auth';
import { useAuth }               from '../../../context/AuthContext';
import { useUser }               from '../../../context/UserContext';
import Loader                    from '../../common/components/Loader';
import { COLORS }                from '../../../constants/colors';
import { rs, rf }                from '../../../utils/responsive';
import { FIcon }                 from '../../../utils/icons';

export default function AdminDashboard({ navigation }) {
  const { setUser }               = useAuth();
  const { clearProfile }          = useUser();
  const [stats, setStats]         = useState({ farmers: 0, owners: 0, bookings: 0, revenue: 0 });
  const [account, setAccount]     = useState({ totalReceived: 0, totalHectare: 0, totalEntries: 0 });
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [farmersSnap, ownersSnap, bookingsSnap, paymentsSnap, appAcc] = await Promise.all([
          getDocs(query(collection(db, 'users'),         where('role', '==', 'farmer'))),
          getDocs(query(collection(db, 'users'),         where('role', '==', 'owner'))),
          getDocs(collection(db, 'bookings')),
          getDocs(query(collection(db, 'dailyPayments'), where('status', '==', 'paid'))),
          getAppAccountSummary(),
        ]);
        const revenue = paymentsSnap.docs.reduce((sum, d) => sum + (d.data().totalCommission || 0), 0);
        setStats({ farmers: farmersSnap.size, owners: ownersSnap.size, bookings: bookingsSnap.size, revenue });
        setAccount(appAcc);
      } catch (e) {
        console.warn('AdminDashboard load:', e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout from admin?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            clearProfile();
            setUser(null);
            navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
          },
        },
      ]
    );
  };

  if (loading) return <Loader />;

  const menuItems = [
    { icon: '👨‍🌾', label: 'Users',       screen: 'UsersList'       },
    { icon: '🚜',  label: 'Machines',    screen: 'MachinesList'    },
    { icon: '💰',  label: 'Payments',    screen: 'PaymentsList'    },
    { icon: '📊',  label: 'Reports',     screen: 'Reports'         },
    { icon: '🏦',  label: 'App Account', screen: 'AdminAppAccount' },
  ];

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={st.header}>
          <View style={st.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.appName}>🌾 Namma Vayal</Text>
              <Text style={st.appNameTamil}>நம்ம வாயல்</Text>
              <Text style={st.subtitle}>Admin Dashboard · Platform Overview</Text>
            </View>
            {/* Logout button in header */}
            <TouchableOpacity
              style={st.logoutHeaderBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <FIcon name="log-out" size={rs(18)} color="#fff" fallback="⏻" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Bank Account Card */}
        <TouchableOpacity
          style={st.bankCard}
          onPress={() => navigation.navigate('AdminAppAccount')}
          activeOpacity={0.88}
        >
          <View style={st.bankHeader}>
            <View>
              <Text style={st.bankTitle}>🏦 Namma Vayal Bank Account</Text>
              <Text style={st.bankSub}>Total commission collected from owners</Text>
            </View>
            <View style={st.bankArrow}>
              <Text style={st.bankArrowTxt}>›</Text>
            </View>
          </View>
          <View style={st.bankStats}>
            <View style={st.bankStat}>
              <Text style={st.bankStatVal}>Rs.{account.totalReceived || 0}</Text>
              <Text style={st.bankStatLabel}>Total Balance</Text>
            </View>
            <View style={st.bankDiv} />
            <View style={st.bankStat}>
              <Text style={st.bankStatVal}>{(account.totalHectare || 0).toFixed(1)} ha</Text>
              <Text style={st.bankStatLabel}>Hectares Served</Text>
            </View>
            <View style={st.bankDiv} />
            <View style={st.bankStat}>
              <Text style={st.bankStatVal}>{account.totalEntries || 0}</Text>
              <Text style={st.bankStatLabel}>Transactions</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Stats */}
        <View style={st.statsGrid}>
          {[
            { label: 'Farmers',  value: stats.farmers,       color: COLORS.primary   },
            { label: 'Owners',   value: stats.owners,        color: '#F59E0B'        },
            { label: 'Bookings', value: stats.bookings,      color: '#3B82F6'        },
            { label: 'Revenue',  value: `Rs.${stats.revenue}`, color: '#22C55E'      },
          ].map((s) => (
            <View key={s.label} style={[st.statCard, { borderTopColor: s.color }]}>
              <Text style={[st.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={st.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <Text style={st.sectionTitle}>Manage</Text>
        <View style={st.menuGrid}>
          {menuItems.map((m) => (
            <TouchableOpacity
              key={m.screen}
              style={st.menuCard}
              onPress={() => navigation.navigate(m.screen)}
              activeOpacity={0.85}
            >
              <Text style={st.menuIcon}>{m.icon}</Text>
              <Text style={st.menuLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout button at bottom */}
        <TouchableOpacity
          style={st.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <FIcon name="log-out" size={rs(18)} color="#EF4444" fallback="⏻" style={{ marginRight: rs(10) }} />
          <Text style={st.logoutBtnTxt}>Logout from Admin</Text>
        </TouchableOpacity>

        <Text style={st.footer}>Namma Vayal · நம்ம வாயல் · Tamil Nadu</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.background },
  header:         { backgroundColor: COLORS.primary, padding: rs(20), paddingTop: rs(40) },
  headerRow:      { flexDirection: 'row', alignItems: 'flex-start' },
  appName:        { fontSize: rf(24), fontWeight: '900', color: '#fff', letterSpacing: 1 },
  appNameTamil:   { fontSize: rf(13), color: 'rgba(255,255,255,0.65)', letterSpacing: 3, marginTop: rs(2), marginBottom: rs(4) },
  subtitle:       { fontSize: rf(12), color: 'rgba(255,255,255,0.75)' },
  logoutHeaderBtn:{ width: rs(40), height: rs(40), borderRadius: rs(20), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: rs(12), marginTop: rs(4) },
  bankCard:       { margin: rs(16), borderRadius: rs(18), backgroundColor: '#0F4C2A', padding: rs(20), elevation: 4 },
  bankHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: rs(16) },
  bankTitle:      { fontSize: rf(15), fontWeight: '900', color: '#fff' },
  bankSub:        { fontSize: rf(11), color: 'rgba(255,255,255,0.6)', marginTop: rs(3) },
  bankArrow:      { width: rs(32), height: rs(32), borderRadius: rs(16), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  bankArrowTxt:   { fontSize: rf(22), color: '#fff', fontWeight: '700', lineHeight: rs(28) },
  bankStats:      { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: rs(12), padding: rs(14) },
  bankStat:       { flex: 1, alignItems: 'center' },
  bankStatVal:    { fontSize: rf(18), fontWeight: '900', color: '#fff' },
  bankStatLabel:  { fontSize: rf(10), color: 'rgba(255,255,255,0.55)', marginTop: rs(3) },
  bankDiv:        { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', padding: rs(12) },
  statCard:       { width: '46%', margin: '2%', backgroundColor: '#fff', borderRadius: rs(14), padding: rs(16), alignItems: 'center', borderTopWidth: rs(3), elevation: 3 },
  statValue:      { fontSize: rf(22), fontWeight: '800' },
  statLabel:      { fontSize: rf(12), color: COLORS.textSecondary, marginTop: rs(4) },
  sectionTitle:   { fontSize: rf(16), fontWeight: '700', color: COLORS.textPrimary, marginHorizontal: rs(16), marginBottom: rs(8) },
  menuGrid:       { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: rs(12), paddingBottom: rs(8) },
  menuCard:       { width: '44%', margin: '3%', backgroundColor: '#fff', borderRadius: rs(16), padding: rs(20), alignItems: 'center', elevation: 3 },
  menuIcon:       { fontSize: rf(34), marginBottom: rs(8) },
  menuLabel:      { fontSize: rf(14), fontWeight: '700', color: COLORS.textPrimary },
  logoutBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', borderRadius: rs(14), marginHorizontal: rs(16), marginTop: rs(8), marginBottom: rs(16), paddingVertical: rs(15), borderWidth: 1, borderColor: '#FECACA' },
  logoutBtnTxt:   { color: '#EF4444', fontSize: rf(15), fontWeight: '800' },
  footer:         { fontSize: rf(11), color: COLORS.textSecondary, textAlign: 'center', paddingBottom: rs(24) },
});
