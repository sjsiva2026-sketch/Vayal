import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser }   from '../../../context/UserContext';
import { useAuth }   from '../../../context/AuthContext';
import { COLORS }    from '../../../constants/colors';
import { logout }    from '../../../firebase/auth';
import { listenBookingsByFarmer } from '../../../firebase/firestore';
import { getCategoryLabel } from '../../../constants/categories';

const { width } = Dimensions.get('window');
const CARD_W    = (width - 52) / 2;

const STATUS_META = {
  pending:   { color: '#F59E0B', bg: '#FFFBEB', dot: '#F59E0B', label: 'PENDING'  },
  accepted:  { color: '#1C7C54', bg: '#ECFDF5', dot: '#22C55E', label: 'ACCEPTED' },
  ongoing:   { color: '#3B82F6', bg: '#EFF6FF', dot: '#3B82F6', label: 'ONGOING'  },
  completed: { color: '#22C55E', bg: '#F0FDF4', dot: '#22C55E', label: 'DONE'     },
  rejected:  { color: '#EF4444', bg: '#FEF2F2', dot: '#EF4444', label: 'REJECTED' },
};

const ACTIONS = [
  { icon: '📍', label: 'Set Location', sub: 'Update Taluk', screen: 'LocationSelect', from: '#E0F2FE', to: '#BAE6FD' },
  { icon: '🚜', label: 'Find Machine', sub: 'Browse All',   screen: 'Category',       from: '#DCFCE7', to: '#BBF7D0' },
  { icon: '📋', label: 'My Bookings',  sub: 'View History', screen: 'BookingHistory', from: '#FEF9C3', to: '#FEF08A' },
  { icon: '👤', label: 'My Profile',   sub: 'Edit Details', screen: 'FarmerProfile',  from: '#F3E8FF', to: '#E9D5FF' },
];

export default function FarmerHome({ navigation }) {
  const { setUser }                   = useAuth();
  const { userProfile, clearProfile } = useUser();
  const uid                           = userProfile?.id || '';
  const [recent, setRecent]           = useState([]);
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  useEffect(() => {
    if (!uid) return;
    const unsub = listenBookingsByFarmer(uid, (data) => {
      setRecent([...data]
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 3));
    });
    return unsub;
  }, [uid]);

  const handleLogout = () =>
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await logout(); clearProfile(); setUser(null);
        navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
      }},
    ]);

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ── */}
      <LinearGradient colors={['#145A3E', '#1C7C54', '#2E9E6B']} style={s.header}>
        <View style={s.circle} />
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.greeting}>{greeting} 👋</Text>
            <Text style={s.userName} numberOfLines={1}>{userProfile?.name || 'Farmer'}</Text>
            <View style={s.locPill}>
              <Text style={s.locTxt}>📍 {userProfile?.taluk || 'Set location'}{userProfile?.district ? ` · ${userProfile.district}` : ''}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
            <Text style={s.logoutTxt}>⏻</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Book CTA banner ── */}
        <TouchableOpacity onPress={() => navigation.navigate('Category')} activeOpacity={0.9} style={s.ctaWrap}>
          <LinearGradient colors={['#F59E0B', '#F4B400']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
            <View style={s.ctaLeft}>
              <Text style={s.ctaTitle}>Book a Machine</Text>
              <Text style={s.ctaSub}>Find & book in your taluk instantly</Text>
              <View style={s.ctaChip}><Text style={s.ctaChipTxt}>Browse Now →</Text></View>
            </View>
            <Text style={s.ctaEmoji}>🌾</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Quick Actions ── */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.grid}>
          {ACTIONS.map((a, i) => (
            <TouchableOpacity
              key={a.screen}
              style={[s.actionCard, { marginRight: i % 2 === 0 ? 12 : 0 }]}
              onPress={() => navigation.navigate(a.screen)}
              activeOpacity={0.88}
            >
              <LinearGradient colors={[a.from, a.to]} style={s.actionGrad}>
                <Text style={s.actionIcon}>{a.icon}</Text>
                <Text style={s.actionLabel}>{a.label}</Text>
                <Text style={s.actionSub}>{a.sub}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent Bookings ── */}
        {recent.length > 0 && (
          <>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Recent Bookings</Text>
              <TouchableOpacity onPress={() => navigation.navigate('BookingHistory')}>
                <Text style={s.seeAll}>View All →</Text>
              </TouchableOpacity>
            </View>
            {recent.map((b) => {
              const meta  = STATUS_META[b.status] || STATUS_META.pending;
              const label = b.machineTypeLabel || getCategoryLabel(b.machineType);
              return (
                <View key={b.id} style={s.recentCard}>
                  <View style={[s.recentLeft, { backgroundColor: meta.bg }]}>
                    <Text style={{ fontSize: 24 }}>🚜</Text>
                  </View>
                  <View style={s.recentMid}>
                    <Text style={s.recentType} numberOfLines={1}>{label}</Text>
                    <Text style={s.recentMeta}>{b.date}  ·  {b.timeSlot}</Text>
                    <Text style={s.recentHa}>🌾 {b.hectareRequested} ha</Text>
                  </View>
                  <View style={[s.statusPill, { backgroundColor: meta.bg }]}>
                    <View style={[s.statusDot, { backgroundColor: meta.dot }]} />
                    <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F4F6F8' },
  header:      { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 24, overflow: 'hidden' },
  circle:      { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.05)', top: -70, right: -50 },
  headerRow:   { flexDirection: 'row', alignItems: 'flex-start' },
  headerLeft:  { flex: 1 },
  greeting:    { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  userName:    { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 2, marginBottom: 8 },
  locPill:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  locTxt:      { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  logoutBtn:   { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  logoutTxt:   { fontSize: 18, color: '#fff' },
  scroll:      { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32 },

  ctaWrap:     { borderRadius: 18, overflow: 'hidden', marginBottom: 24, elevation: 4 },
  ctaGrad:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20 },
  ctaLeft:     { flex: 1 },
  ctaTitle:    { fontSize: 20, fontWeight: '900', color: '#fff' },
  ctaSub:      { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4, marginBottom: 14 },
  ctaChip:     { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start' },
  ctaChipTxt:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  ctaEmoji:    { fontSize: 52, marginLeft: 12 },

  sectionTitle:{ fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 },
  sectionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll:      { fontSize: 13, color: COLORS.primary, fontWeight: '700' },

  grid:        { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
  actionCard:  { width: CARD_W, borderRadius: 16, overflow: 'hidden', elevation: 2, marginBottom: 12 },
  actionGrad:  { padding: 18 },
  actionIcon:  { fontSize: 30, marginBottom: 10 },
  actionLabel: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 2 },
  actionSub:   { fontSize: 11, color: '#6B7280' },

  recentCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', elevation: 2 },
  recentLeft:  { width: 60, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  recentMid:   { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  recentType:  { fontSize: 14, fontWeight: '700', color: '#111827' },
  recentMeta:  { fontSize: 12, color: '#6B7280', marginTop: 2 },
  recentHa:    { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 3 },
  statusPill:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, marginRight: 12, borderRadius: 10 },
  statusDot:   { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusTxt:   { fontSize: 10, fontWeight: '800' },
});
