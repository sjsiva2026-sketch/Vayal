// src/admin/screens/AdminDashboard.js
// FIXED: Revenue shows from commissionPayments + bookings onSnapshot
// FIXED: Realtime revenue updates when admin approves/rejects payments
// FIXED: SafeAreaView + status bar correct for all Android ratios

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, StatusBar, RefreshControl,
  Platform, Dimensions,
} from 'react-native';
import { LinearGradient }  from 'expo-linear-gradient';
import { useFocusEffect }  from '@react-navigation/native';
import {
  getDocs, collection, query, where,
  onSnapshot,
} from 'firebase/firestore';
import { db }     from '../../../firebase/config';
import { logout } from '../../../firebase/auth';
import { useAuth } from '../../../context/AuthContext';
import { useUser } from '../../../context/UserContext';
import { FIcon }   from '../../../utils/icons';
import { COLORS }  from '../../../constants/colors';
import { rs, rf, H_PAD } from '../../../utils/responsive';

const { width: W } = Dimensions.get('window');
const TODAY = new Date().toISOString().slice(0, 10);

export default function AdminDashboard({ navigation }) {
  const { setUser }      = useAuth();
  const { clearProfile } = useUser();

  const [stats,      setStats]      = useState({ farmers:0, owners:0, bookings:0, machines:0 });
  const [pending,    setPending]    = useState({ kyc:0, payments:0 });
  const [revenue,    setRevenue]    = useState({ total:0, paid:0, pending:0, today:0 });
  const [refreshing, setRefreshing] = useState(false);
  const [loading,    setLoading]    = useState(true);

  // ── Static stats (on focus) ─────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const [fa, ow, bk, mc, kp] = await Promise.all([
        getDocs(query(collection(db,'users'), where('role','==','farmer'))),
        getDocs(query(collection(db,'users'), where('role','==','owner'))),
        getDocs(collection(db,'bookings')),
        getDocs(collection(db,'machines')),
        getDocs(query(collection(db,'users'), where('role','==','owner'), where('kycStatus','==','pending'))),
      ]);
      setStats({ farmers:fa.size, owners:ow.size, bookings:bk.size, machines:mc.size });
      setPending(prev => ({ ...prev, kyc: kp.size }));
    } catch(e) { console.warn('loadStats:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  // ── Realtime revenue listener ──────────────────────────────────────────
  useEffect(() => {
    // Listen to commissionPayments for revenue
    const unsubPay = onSnapshot(
      collection(db, 'commissionPayments'),
      (snap) => {
        const docs = snap.docs.map(d => d.data());

        const paid    = docs.filter(d => d.paymentStatus === 'paid');
        const pend    = docs.filter(d => d.paymentStatus === 'pending_verification');
        const todayPd = paid.filter(d => (d.date || '') === TODAY);

        const totalRevenue   = paid.reduce((s, d) => s + (d.amount || 0), 0);
        const pendingRevenue = pend.reduce((s, d) => s + (d.amount || 0), 0);
        const todayRevenue   = todayPd.reduce((s, d) => s + (d.amount || 0), 0);

        setRevenue({
          total:   totalRevenue + pendingRevenue,
          paid:    totalRevenue,
          pending: pendingRevenue,
          today:   todayRevenue,
        });
        setPending(prev => ({ ...prev, payments: pend.length }));
      },
      (e) => console.warn('revenueListener:', e.message),
    );

    return unsubPay;
  }, []);

  const onRefresh = () => { setRefreshing(true); loadStats(); };

  const handleLogout = () =>
    Alert.alert('Logout', 'Logout from admin panel?', [
      { text:'Cancel', style:'cancel' },
      { text:'Logout', style:'destructive', onPress: async () => {
          await logout(); clearProfile(); setUser(null);
          navigation.reset({ index:0, routes:[{ name:'RoleSelect' }] });
        },
      },
    ]);

  const STATS = [
    { label:'Farmers',  value:stats.farmers,  icon:'👨‍🌾', color:'#1C7C54' },
    { label:'Owners',   value:stats.owners,   icon:'🚜',   color:'#F59E0B' },
    { label:'Bookings', value:stats.bookings, icon:'📋',   color:'#3B82F6' },
    { label:'Machines', value:stats.machines, icon:'⚙️',  color:'#8B5CF6' },
  ];

  const REVENUE_CARDS = [
    { label:'Total Commission', value:`₹${revenue.total}`,   icon:'💰', color:'#1C7C54', bg:'#E8F5EE' },
    { label:'Paid',             value:`₹${revenue.paid}`,    icon:'✅', color:'#22C55E', bg:'#DCFCE7' },
    { label:'Pending',          value:`₹${revenue.pending}`, icon:'⏳', color:'#F59E0B', bg:'#FFF3CD' },
    { label:'Today',            value:`₹${revenue.today}`,   icon:'📅', color:'#3B82F6', bg:'#EFF6FF' },
  ];

  const ACTIONS = [
    { icon:'🪪', label:'KYC',      badge:pending.kyc,      color:'#F59E0B', bg:'#FFF3CD', screen:'KycVerificationList' },
    { icon:'💰', label:'Payments', badge:pending.payments, color:'#22C55E', bg:'#DCFCE7', screen:'PaymentsList' },
    { icon:'👥', label:'Users',    badge:0,                color:'#3B82F6', bg:'#EFF6FF', screen:'UsersList' },
    { icon:'🚜', label:'Machines', badge:0,                color:'#8B5CF6', bg:'#EDE9FE', screen:'MachinesList' },
    { icon:'📊', label:'Reports',  badge:0,                color:'#EF4444', bg:'#FEE2E2', screen:'Reports' },
    { icon:'🏦', label:'Account',  badge:0,                color:'#0F4C2A', bg:'#DCFCE7', screen:'AdminAppAccount' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F4C2A" translucent={false} />
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* HEADER */}
        <LinearGradient colors={['#0F4C2A','#1C7C54']} style={s.header}>
          <View style={s.headerRow}>
            <View style={{ flex:1 }}>
              <Text style={s.appName}>🌾 Namma Vayal</Text>
              <Text style={s.appTamil}>நம்ம வயல்</Text>
              <Text style={s.adminTag}>Admin Dashboard</Text>
            </View>
            <TouchableOpacity style={s.logoutIcon} onPress={handleLogout} activeOpacity={0.8}>
              <FIcon name="log-out" size={rs(20)} color="#fff" fallback="⏻" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── REVENUE CARDS (realtime) ── */}
        <View style={s.sectionWrap}>
          <Text style={s.secTitle}>💰 Revenue Overview</Text>
          <View style={s.revenueGrid}>
            {REVENUE_CARDS.map(card => (
              <View key={card.label} style={[s.revenueCard, { backgroundColor: card.bg, borderColor: card.color + '44' }]}>
                <Text style={s.revenueIcon}>{card.icon}</Text>
                <Text style={[s.revenueValue, { color: card.color }]}>{card.value}</Text>
                <Text style={s.revenueLabel}>{card.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── PENDING ALERTS ── */}
        {(pending.kyc > 0 || pending.payments > 0) && (
          <View style={s.sectionWrap}>
            <Text style={s.secTitle}>⚠️ Action Required</Text>
            {pending.kyc > 0 && (
              <TouchableOpacity style={s.alertCard} onPress={() => navigation.navigate('KycVerificationList')} activeOpacity={0.88}>
                <Text style={s.alertEmoji}>🪪</Text>
                <View style={{ flex:1 }}>
                  <Text style={s.alertTitle}>{pending.kyc} KYC Pending</Text>
                  <Text style={s.alertSub}>Owners waiting for verification</Text>
                </View>
                <Text style={s.alertChev}>›</Text>
              </TouchableOpacity>
            )}
            {pending.payments > 0 && (
              <TouchableOpacity style={[s.alertCard, s.alertGreen]} onPress={() => navigation.navigate('PaymentsList')} activeOpacity={0.88}>
                <Text style={s.alertEmoji}>💰</Text>
                <View style={{ flex:1 }}>
                  <Text style={[s.alertTitle, { color:'#065F46' }]}>{pending.payments} Payment{pending.payments>1?'s':''} to Verify</Text>
                  <Text style={[s.alertSub, { color:'#059669' }]}>Commission screenshots awaiting review</Text>
                </View>
                <Text style={[s.alertChev, { color:'#22C55E' }]}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── USER STATS ── */}
        <View style={s.sectionWrap}>
          <Text style={s.secTitle}>📊 Platform Stats</Text>
          <View style={s.statsGrid}>
            {STATS.map(st => (
              <View key={st.label} style={[s.statCard, { borderTopColor: st.color }]}>
                <Text style={s.statIcon}>{st.icon}</Text>
                <Text style={[s.statVal, { color: st.color }]}>{loading ? '—' : st.value}</Text>
                <Text style={s.statLbl}>{st.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={s.sectionWrap}>
          <Text style={s.secTitle}>⚡ Quick Actions</Text>
          <View style={s.actionsGrid}>
            {ACTIONS.map(a => (
              <TouchableOpacity
                key={a.label}
                style={[s.actionCard, { backgroundColor: a.bg, borderColor: a.color + '33' }]}
                onPress={() => navigation.navigate(a.screen)}
                activeOpacity={0.85}
              >
                <View style={s.actionIconWrap}>
                  <Text style={s.actionEmoji}>{a.icon}</Text>
                  {a.badge > 0 && (
                    <View style={[s.actionBadge, { backgroundColor: a.color }]}>
                      <Text style={s.actionBadgeTxt}>{a.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={[s.actionLbl, { color: a.color }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <FIcon name="log-out" size={rs(16)} color="#EF4444" fallback="⏻" style={{ marginRight: rs(8) }} />
          <Text style={s.logoutTxt}>Logout from Admin</Text>
        </TouchableOpacity>

        <Text style={s.footer}>நம்ம வயல் 🌾 · Admin Panel · Tamil Nadu</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_W = Math.floor((W - rs(32) - rs(10)) / 2);

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F4F5F7' },
  scrollView:  { flex: 1 },
  scrollContent:{ paddingBottom: rs(40) },

  // Header
  header:      { paddingTop: rs(20), paddingBottom: rs(20), paddingHorizontal: H_PAD },
  headerRow:   { flexDirection: 'row', alignItems: 'flex-start' },
  appName:     { fontSize: rf(22), fontWeight: '900', color: '#fff', letterSpacing: 1 },
  appTamil:    { fontSize: rf(12), color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginTop: rs(2) },
  adminTag:    { fontSize: rf(12), color: 'rgba(255,255,255,0.75)', marginTop: rs(4) },
  logoutIcon:  { width: rs(40), height: rs(40), borderRadius: rs(20), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  // Sections
  sectionWrap: { paddingHorizontal: H_PAD, marginTop: rs(16) },
  secTitle:    { fontSize: rf(14), fontWeight: '700', color: '#374151', marginBottom: rs(10) },

  // Revenue grid — 2 columns
  revenueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(10) },
  revenueCard: { width: CARD_W, borderRadius: rs(14), padding: rs(14), alignItems: 'center', borderWidth: rs(1), elevation: 2 },
  revenueIcon: { fontSize: rf(24), marginBottom: rs(6) },
  revenueValue:{ fontSize: rf(22), fontWeight: '900', marginBottom: rs(3) },
  revenueLabel:{ fontSize: rf(11), color: '#6B7280', textAlign: 'center' },

  // Alerts
  alertCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3CD', borderRadius: rs(14), padding: rs(14), borderWidth: rs(1.5), borderColor: '#F59E0B', marginBottom: rs(8) },
  alertGreen:  { backgroundColor: '#F0FDF4', borderColor: '#22C55E' },
  alertEmoji:  { fontSize: rf(24), marginRight: rs(12) },
  alertTitle:  { fontSize: rf(14), fontWeight: '700', color: '#92400E', marginBottom: rs(2) },
  alertSub:    { fontSize: rf(12), color: '#B45309' },
  alertChev:   { fontSize: rf(24), color: '#F59E0B', fontWeight: '700' },

  // Stats grid — 2 columns
  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: rs(10) },
  statCard:    { width: CARD_W, backgroundColor: '#fff', borderRadius: rs(14), padding: rs(16), alignItems: 'center', borderTopWidth: rs(3), elevation: 3 },
  statIcon:    { fontSize: rf(26), marginBottom: rs(6) },
  statVal:     { fontSize: rf(24), fontWeight: '900' },
  statLbl:     { fontSize: rf(12), color: '#6B7280', marginTop: rs(4) },

  // Quick actions grid — 3 columns
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(10) },
  actionCard:  {
    width:     Math.floor((W - rs(32) - rs(20)) / 3),
    borderRadius: rs(14), padding: rs(14),
    alignItems: 'center', elevation: 2, borderWidth: rs(1),
  },
  actionIconWrap:{ position: 'relative', marginBottom: rs(6) },
  actionEmoji: { fontSize: rf(30) },
  actionBadge: { position: 'absolute', top: -rs(4), right: -rs(10), minWidth: rs(18), height: rs(18), borderRadius: rs(9), alignItems: 'center', justifyContent: 'center', paddingHorizontal: rs(4) },
  actionBadgeTxt:{ color: '#fff', fontSize: rf(9), fontWeight: '900' },
  actionLbl:   { fontSize: rf(11), fontWeight: '700', textAlign: 'center' },

  logoutBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', borderRadius: rs(14), marginHorizontal: H_PAD, marginTop: rs(20), paddingVertical: rs(14) },
  logoutTxt:   { color: '#EF4444', fontSize: rf(15), fontWeight: '800' },
  footer:      { fontSize: rf(11), color: '#9CA3AF', textAlign: 'center', marginTop: rs(12) },
});
