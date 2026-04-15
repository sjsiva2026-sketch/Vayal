import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, Alert, Dimensions,
} from 'react-native';
import { LinearGradient }     from 'expo-linear-gradient';
import { useFocusEffect }     from '@react-navigation/native';
import { getBookingsByOwner } from '../../../firebase/firestore';
import { useAuth }      from '../../../context/AuthContext';
import { useUser }      from '../../../context/UserContext';
import { logout }       from '../../../firebase/auth';
import { COLORS }       from '../../../constants/colors';
import Loader           from '../../common/components/Loader';

const { width } = Dimensions.get('window');
const CARD_W    = (width - 52) / 3;

const ACTIONS = [
  { icon: '➕', label: 'Add Machine',    sub: 'List New',      screen: 'AddMachine',       from: '#DCFCE7', to: '#BBF7D0' },
  { icon: '🚜', label: 'My Machines',    sub: 'Manage',        screen: 'MachineListOwner', from: '#DBEAFE', to: '#BFDBFE' },
  { icon: '📋', label: 'Requests',       sub: 'Accept/Reject', screen: 'BookingRequests',  from: '#FEF9C3', to: '#FEF08A' },
  { icon: '📊', label: "Today's Work",   sub: 'Summary',       screen: 'DailySummary',     from: '#F3E8FF', to: '#E9D5FF' },
  { icon: '💰', label: 'Pay Commission', sub: 'UPI Pay',       screen: 'Payment',          from: '#FFEDD5', to: '#FED7AA' },
  { icon: '👤', label: 'My Profile',     sub: 'Settings',      screen: 'OwnerProfile',     from: '#E0E7FF', to: '#C7D2FE' },
];

export default function OwnerDashboard({ navigation }) {
  const { setUser }                   = useAuth();
  const { userProfile, clearProfile } = useUser();
  const uid                           = userProfile?.id || '';
  const [stats, setStats]             = useState({ pending: 0, accepted: 0, completed: 0 });
  const [loading, setLoading]         = useState(true);
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  useFocusEffect(useCallback(() => {
    if (!uid) { setLoading(false); return; }
    let alive = true;
    getBookingsByOwner(uid)
      .then(snap => {
        if (!alive) return;
        const all = snap.docs.map(d => d.data());
        setStats({
          pending:   all.filter(b => b.status === 'pending').length,
          accepted:  all.filter(b => b.status === 'accepted').length,
          completed: all.filter(b => b.status === 'completed').length,
        });
        setLoading(false);
      })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [uid]));

  const handleLogout = () =>
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await logout(); clearProfile(); setUser(null);
        navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
      }},
    ]);

  if (loading) return <Loader />;

  const isLocked    = userProfile?.isLocked;
  const freeScreens = ['Payment', 'OwnerProfile'];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Header ── */}
        <LinearGradient colors={['#145A3E', '#1C7C54', '#2E9E6B']} style={s.header}>
          <View style={s.circle} />
          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <Text style={s.greeting}>{greeting} 👋</Text>
              <Text style={s.userName} numberOfLines={1}>{userProfile?.name || 'Owner'}</Text>
              <View style={s.locPill}>
                <Text style={s.locTxt}>📍 {userProfile?.taluk || '—'}  ·  +91 {userProfile?.phone || '—'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
              <Text style={s.logoutTxt}>⏻</Text>
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View style={s.statsRow}>
            {[
              { label: 'Pending',   value: stats.pending,   accent: '#FCD34D' },
              { label: 'Accepted',  value: stats.accepted,  accent: '#6EE7B7' },
              { label: 'Completed', value: stats.completed, accent: '#93C5FD' },
            ].map(st => (
              <View key={st.label} style={s.statItem}>
                <Text style={[s.statVal, { color: st.accent }]}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Lock Banner ── */}
        {isLocked && (
          <TouchableOpacity style={s.lockBanner} onPress={() => navigation.navigate('Payment')} activeOpacity={0.9}>
            <View style={s.lockIcon}><Text style={{ fontSize: 22 }}>🔒</Text></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.lockTitle}>Account Locked</Text>
              <Text style={s.lockSub}>Daily commission unpaid · Tap to pay & unlock</Text>
            </View>
            <Text style={s.lockArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── Quick Actions ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('BookingRequests')}>
            <Text style={s.seeAll}>View Requests →</Text>
          </TouchableOpacity>
        </View>

        <View style={s.grid}>
          {ACTIONS.map((a, i) => {
            const locked = isLocked && !freeScreens.includes(a.screen);
            const last3  = (i + 1) % 3 === 0;
            return (
              <TouchableOpacity
                key={a.screen}
                style={[s.actionCard, !last3 && { marginRight: 8 }, locked && s.actionLocked]}
                onPress={() => {
                  if (locked) {
                    Alert.alert('🔒 Locked', 'Pay commission to unlock.', [
                      { text: 'Pay Now', onPress: () => navigation.navigate('Payment') },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                    return;
                  }
                  navigation.navigate(a.screen);
                }}
                activeOpacity={0.88}
              >
                <LinearGradient colors={locked ? ['#F3F4F6', '#E5E7EB'] : [a.from, a.to]} style={s.actionGrad}>
                  <Text style={[s.actionIcon, locked && { opacity: 0.4 }]}>{a.icon}</Text>
                  <Text style={[s.actionLabel, locked && { color: '#9CA3AF' }]}>{a.label}</Text>
                  <Text style={[s.actionSub,   locked && { color: '#D1D5DB' }]}>{a.sub}</Text>
                  {locked && <Text style={s.lockOverlay}>🔒</Text>}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F4F6F8' },
  scroll:      { paddingBottom: 32 },
  header:      { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, overflow: 'hidden' },
  circle:      { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.05)', top: -70, right: -50 },
  headerRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  headerLeft:  { flex: 1 },
  greeting:    { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  userName:    { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 2, marginBottom: 8 },
  locPill:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  locTxt:      { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  logoutBtn:   { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  logoutTxt:   { fontSize: 18, color: '#fff' },
  statsRow:    { flexDirection: 'row' },
  statItem:    { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginHorizontal: 4 },
  statVal:     { fontSize: 28, fontWeight: '900' },
  statLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 3, fontWeight: '600' },

  lockBanner:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', marginHorizontal: 16, marginTop: 16, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#FECACA' },
  lockIcon:    { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  lockTitle:   { fontSize: 14, fontWeight: '800', color: '#B91C1C' },
  lockSub:     { fontSize: 12, color: '#EF4444', marginTop: 2 },
  lockArrow:   { fontSize: 22, color: '#EF4444', fontWeight: '700' },

  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  seeAll:       { fontSize: 13, color: COLORS.primary, fontWeight: '700' },

  grid:        { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  actionCard:  { width: CARD_W, borderRadius: 14, overflow: 'hidden', elevation: 2, marginBottom: 10 },
  actionLocked:{ opacity: 0.7 },
  actionGrad:  { padding: 14, minHeight: 108, position: 'relative' },
  actionIcon:  { fontSize: 26, marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: '800', color: '#111827', marginBottom: 2 },
  actionSub:   { fontSize: 10, color: '#6B7280' },
  lockOverlay: { position: 'absolute', top: 8, right: 8, fontSize: 12 },
});
