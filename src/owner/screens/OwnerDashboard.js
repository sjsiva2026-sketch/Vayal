// src/owner/screens/OwnerDashboard.js
// Reference: screenshot "My Shop" — stats row + quick actions list + recent orders
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, StatusBar, Image,
} from 'react-native';
import { useFocusEffect }  from '@react-navigation/native';
import { FIcon, MCIcon }   from '../../../utils/icons';
import { getBookingsByOwner } from '../../../firebase/firestore';
import { useAuth }         from '../../../context/AuthContext';
import { useUser }         from '../../../context/UserContext';
import { logout }          from '../../../firebase/auth';
import { COLORS }          from '../../../constants/colors';
import { rs, rf, H_PAD }   from '../../../utils/responsive';
import Loader              from '../../common/components/Loader';

const PRIMARY = '#1C7C54';

export default function OwnerDashboard({ navigation }) {
  const { setUser }                   = useAuth();
  const { userProfile, clearProfile } = useUser();
  const uid                           = userProfile?.id || '';
  const isLocked = userProfile?.isLocked === true;

  const [stats,   setStats]   = useState({ machines: 0, requests: 0, earnings: 0 });
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!uid) { setLoading(false); return; }
    let alive = true;
    getBookingsByOwner(uid)
      .then(snap => {
        if (!alive) return;
        const all = snap.docs.map(d => d.data());
        setStats({
          machines: 0,
          requests: all.filter(b => b.status === 'pending').length,
          earnings: all.filter(b => b.status === 'completed').reduce((s, b) => s + (b.commission || 0), 0),
        });
        setRecent(all.filter(b => ['pending','accepted'].includes(b.status)).slice(0, 5));
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
        navigation.navigate('RoleSelect');
      }},
    ]);

  if (loading) return <Loader />;

  // Quick actions — like screenshot "Quick Actions" list
  const ACTIONS = [
    { icon: 'plus-circle',  color: PRIMARY,    bg: COLORS.primaryLight, label: 'Add New Machine', sub: 'List your machine',   screen: 'AddMachine',      badge: 0       },
    { icon: 'list',         color: '#1D4ED8',  bg: '#EEF3FF',           label: 'My Machines',      sub: 'Manage listings',    screen: 'MachineListOwner', badge: 0       },
    { icon: 'bell',         color: '#F59E0B',  bg: '#FFFBEB',           label: 'Order Requests',   sub: 'View bookings',      screen: 'BookingRequests',  badge: stats.requests },
    { icon: 'bar-chart-2',  color: '#8B5CF6',  bg: '#F5F0FF',           label: "Today's Work",     sub: 'Summary & earnings', screen: 'DailySummary',     badge: 0       },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Header: Hello + avatar (screenshot reference) ── */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greetTxt}>Hello! 👋</Text>
            <View style={s.locRow}>
              <Text style={s.locPin}>📍</Text>
              <Text style={s.locTxt} numberOfLines={1}>
                {userProfile?.taluk || '—'}{userProfile?.district ? `, ${userProfile.district}` : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={s.avatarBtn} onPress={() => navigation.navigate('OwnerProfile')} activeOpacity={0.85}>
            {userProfile?.photoURL
              ? <Image source={{ uri: userProfile.photoURL }} style={s.avatarImg} />
              : <View style={s.avatarFallback}><FIcon name="user" size={20} color={PRIMARY} fallback="👤" /></View>
            }
          </TouchableOpacity>
        </View>

        {/* Lock banner */}
        {isLocked && (
          <TouchableOpacity style={s.lockBanner} onPress={() => navigation.navigate('PayCommission')} activeOpacity={0.9}>
            <FIcon name="lock" size={16} color="#B91C1C" fallback="🔒" style={{ marginRight: rs(8) }} />
            <View style={{ flex: 1 }}>
              <Text style={s.lockTitle}>Account Locked</Text>
              <Text style={s.lockSub}>Commission unpaid · Tap to pay & unlock</Text>
            </View>
            <FIcon name="chevron-right" size={18} color="#EF4444" fallback="›" />
          </TouchableOpacity>
        )}

        {/* ── Stats row — screenshot "12 Products / 5 Orders / ₹15000 Earnings" ── */}
        <View style={s.statsRow}>
          {[
            { icon: 'box',       color: '#1D4ED8', bg: '#EEF3FF', value: stats.machines,          label: 'Machines' },
            { icon: 'clipboard', color: '#F59E0B', bg: '#FFFBEB', value: stats.requests,          label: 'Orders'   },
            { icon: 'trending-up', color: PRIMARY, bg: COLORS.primaryLight, value: `₹${stats.earnings}`, label: 'Earnings' },
          ].map(st => (
            <View key={st.label} style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: st.bg }]}>
                <FIcon name={st.icon} size={20} color={st.color} fallback="📊" />
              </View>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick Actions — screenshot card list ── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={s.actionCard}>
          {ACTIONS.map((a, i) => (
            <TouchableOpacity
              key={a.label}
              style={[s.actionRow, i < ACTIONS.length - 1 && s.actionRowBorder]}
              onPress={() => {
                if (isLocked && a.screen !== 'AddMachine') {
                  Alert.alert('🔒 Locked', 'Pay commission to unlock.', [
                    { text: 'Pay Now', onPress: () => navigation.navigate('PayCommission') },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                  return;
                }
                navigation.navigate(a.screen);
              }}
              activeOpacity={0.7}
            >
              <View style={[s.actionIconBg, { backgroundColor: a.bg }]}>
                <FIcon name={a.icon} size={20} color={a.color} fallback="📋" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionLabel}>{a.label}</Text>
                <Text style={s.actionSub}>{a.sub}</Text>
              </View>
              {a.badge > 0 && (
                <View style={s.actionBadge}><Text style={s.actionBadgeTxt}>{a.badge}</Text></View>
              )}
              <FIcon name="chevron-right" size={18} color={COLORS.textTertiary} fallback="›" />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent Orders — screenshot bottom list ── */}
        {recent.length > 0 && (
          <>
            <View style={[s.sectionRow, { marginTop: rs(20) }]}>
              <Text style={s.sectionTitle}>Recent Orders</Text>
              <TouchableOpacity onPress={() => navigation.navigate('BookingRequests')}>
                <Text style={s.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {recent.slice(0, 3).map(b => (
              <View key={b.id || Math.random()} style={s.recentCard}>
                <View style={[s.recentIcon, { backgroundColor: COLORS.primaryLight }]}>
                  <Text style={{ fontSize: rf(18) }}>🚜</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.recentTitle} numberOfLines={1}>{b.farmerName || 'Farmer'}</Text>
                  <Text style={s.recentMeta}>{b.date} · {b.timeSlot}</Text>
                </View>
                <View style={[s.recentBadge, { backgroundColor: b.status === 'pending' ? '#FFFBEB' : COLORS.primaryLight }]}>
                  <Text style={[s.recentBadgeTxt, { color: b.status === 'pending' ? '#92400E' : PRIMARY }]}>
                    {b.status === 'pending' ? 'Pending' : 'Accepted'}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <FIcon name="log-out" size={16} color={COLORS.error} fallback="⏻" style={{ marginRight: rs(8) }} />
          <Text style={s.logoutTxt}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: rs(24) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#fff' },
  scroll:            { paddingBottom: rs(20) },
  headerRow:         { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: H_PAD, paddingTop: rs(16), paddingBottom: rs(16) },
  greetTxt:          { fontSize: rf(22), fontWeight: '800', color: '#111827' },
  locRow:            { flexDirection: 'row', alignItems: 'center', marginTop: rs(4) },
  locPin:            { fontSize: rf(13) },
  locTxt:            { fontSize: rf(13), color: COLORS.textSecondary, marginLeft: rs(3), flex: 1 },
  avatarBtn:         { marginLeft: rs(12), marginTop: rs(2) },
  avatarImg:         { width: rs(42), height: rs(42), borderRadius: rs(21), borderWidth: rs(2), borderColor: PRIMARY },
  avatarFallback:    { width: rs(42), height: rs(42), borderRadius: rs(21), backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: rs(2), borderColor: PRIMARY },
  lockBanner:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', marginHorizontal: H_PAD, marginBottom: rs(14), borderRadius: rs(14), padding: rs(14), borderWidth: 1, borderColor: '#FECACA' },
  lockTitle:         { fontSize: rf(14), fontWeight: '800', color: '#B91C1C' },
  lockSub:           { fontSize: rf(12), color: '#EF4444', marginTop: rs(2) },
  statsRow:          { flexDirection: 'row', paddingHorizontal: H_PAD, marginBottom: rs(20) },
  statCard:          { flex: 1, backgroundColor: '#fff', borderRadius: rs(14), padding: rs(14), alignItems: 'center', marginHorizontal: rs(4), borderWidth: 1, borderColor: COLORS.border, elevation: 2 },
  statIcon:          { width: rs(40), height: rs(40), borderRadius: rs(20), alignItems: 'center', justifyContent: 'center', marginBottom: rs(8) },
  statValue:         { fontSize: rf(20), fontWeight: '900', color: '#111827', marginBottom: rs(2) },
  statLabel:         { fontSize: rf(11), color: COLORS.textSecondary },
  sectionRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: H_PAD, marginBottom: rs(12) },
  sectionTitle:      { fontSize: rf(17), fontWeight: '800', color: '#111827' },
  seeAll:            { fontSize: rf(14), color: PRIMARY, fontWeight: '700' },
  actionCard:        { marginHorizontal: H_PAD, backgroundColor: '#F9FAFB', borderRadius: rs(16), overflow: 'hidden', marginBottom: rs(8) },
  actionRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), paddingVertical: rs(14) },
  actionRowBorder:   { borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  actionIconBg:      { width: rs(42), height: rs(42), borderRadius: rs(12), alignItems: 'center', justifyContent: 'center', marginRight: rs(14) },
  actionLabel:       { fontSize: rf(14), fontWeight: '700', color: '#111827' },
  actionSub:         { fontSize: rf(12), color: COLORS.textSecondary, marginTop: rs(2) },
  actionBadge:       { backgroundColor: '#EF4444', minWidth: rs(22), height: rs(22), borderRadius: rs(11), alignItems: 'center', justifyContent: 'center', paddingHorizontal: rs(5), marginRight: rs(8) },
  actionBadgeTxt:    { color: '#fff', fontSize: rf(11), fontWeight: '900' },
  recentCard:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: rs(14), marginHorizontal: H_PAD, marginBottom: rs(10), padding: rs(12), elevation: 2, borderWidth: 1, borderColor: COLORS.border },
  recentIcon:        { width: rs(46), height: rs(46), borderRadius: rs(12), alignItems: 'center', justifyContent: 'center', marginRight: rs(12) },
  recentTitle:       { fontSize: rf(14), fontWeight: '700', color: '#111827' },
  recentMeta:        { fontSize: rf(12), color: COLORS.textSecondary, marginTop: rs(2) },
  recentBadge:       { borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(4) },
  recentBadgeTxt:    { fontSize: rf(11), fontWeight: '700' },
  logoutBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: H_PAD, marginTop: rs(16), backgroundColor: '#FEF2F2', borderRadius: rs(14), padding: rs(14) },
  logoutTxt:         { color: COLORS.error, fontWeight: '800', fontSize: rf(14) },
});
