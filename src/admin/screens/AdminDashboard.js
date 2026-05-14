// src/admin/screens/AdminDashboard.js
// PRODUCTION: Live stats, pending alerts, quick actions, revenue card

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, StatusBar, RefreshControl,
} from 'react-native';
import { LinearGradient }  from 'expo-linear-gradient';
import { useFocusEffect }  from '@react-navigation/native';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db }              from '../../../firebase/config';
import { getAppAccountSummary } from '../../../firebase/firestore';
import { logout }          from '../../../firebase/auth';
import { useAuth }         from '../../../context/AuthContext';
import { useUser }         from '../../../context/UserContext';
import { FIcon }           from '../../../utils/icons';
import { COLORS }          from '../../../constants/colors';
import { rs, rf, H_PAD }   from '../../../utils/responsive';

export default function AdminDashboard({ navigation }) {
  const { setUser }       = useAuth();
  const { clearProfile }  = useUser();

  const [stats,      setStats]      = useState({ farmers:0, owners:0, bookings:0, machines:0 });
  const [pending,    setPending]    = useState({ kyc:0, payments:0 });
  const [account,    setAccount]    = useState({ totalReceived:0, totalHectare:0, totalEntries:0 });
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [fa, ow, bk, mc, kp, pp, appAcc] = await Promise.all([
        getDocs(query(collection(db,'users'), where('role','==','farmer'))),
        getDocs(query(collection(db,'users'), where('role','==','owner'))),
        getDocs(collection(db,'bookings')),
        getDocs(collection(db,'machines')),
        getDocs(query(collection(db,'users'), where('role','==','owner'), where('kycStatus','==','pending'))),
        getDocs(query(collection(db,'commissionPayments'), where('paymentStatus','==','pending_verification'))),
        getAppAccountSummary(),
      ]);
      setStats({ farmers:fa.size, owners:ow.size, bookings:bk.size, machines:mc.size });
      setPending({ kyc:kp.size, payments:pp.size });
      setAccount(appAcc);
    } catch (e) { console.warn('Dashboard:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleLogout = () =>
    Alert.alert('Logout', 'Logout from admin panel?', [
      { text: 'Cancel', style:'cancel' },
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

  const ACTIONS = [
    { icon:'🪪', label:'KYC',         badge:pending.kyc,      color:'#F59E0B', bg:'#FFF3CD', screen:'KycVerificationList' },
    { icon:'💰', label:'Payments',    badge:pending.payments, color:'#22C55E', bg:'#DCFCE7', screen:'PaymentsList' },
    { icon:'👥', label:'Users',       badge:0,                color:'#3B82F6', bg:'#EFF6FF', screen:'UsersList' },
    { icon:'🚜', label:'Machines',    badge:0,                color:'#8B5CF6', bg:'#EDE9FE', screen:'MachinesList' },
    { icon:'📊', label:'Reports',     badge:0,                color:'#EF4444', bg:'#FEE2E2', screen:'Reports' },
    { icon:'🏦', label:'Account',     badge:0,                color:'#0F4C2A', bg:'#DCFCE7', screen:'AdminAppAccount' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F4C2A" />
      <ScrollView
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
          {/* Revenue card */}
          <TouchableOpacity style={s.revenueCard} onPress={() => navigation.navigate('AdminAppAccount')} activeOpacity={0.88}>
            <View style={{ flex:1 }}>
              <Text style={s.revenueLabel}>Total Revenue Collected</Text>
              <Text style={s.revenueValue}>₹{account.totalReceived || 0}</Text>
              <Text style={s.revenueSub}>{account.totalEntries || 0} transactions · {Number(account.totalHectare || 0).toFixed(1)} ha served</Text>
            </View>
            <View style={s.revenueViewBtn}><Text style={s.revenueViewTxt}>View →</Text></View>
          </TouchableOpacity>
        </LinearGradient>

        {/* PENDING ALERTS */}
        {(pending.kyc > 0 || pending.payments > 0) && (
          <View style={s.alertsSection}>
            {pending.kyc > 0 && (
              <TouchableOpacity style={s.alertCard} onPress={() => navigation.navigate('KycVerificationList')} activeOpacity={0.88}>
                <Text style={s.alertEmoji}>🪪</Text>
                <View style={{ flex:1 }}>
                  <Text style={s.alertTitle}>{pending.kyc} KYC Pending</Text>
                  <Text style={s.alertSub}>Owners waiting for document verification</Text>
                </View>
                <Text style={s.alertChev}>›</Text>
              </TouchableOpacity>
            )}
            {pending.payments > 0 && (
              <TouchableOpacity style={[s.alertCard,s.alertGreen]} onPress={() => navigation.navigate('PaymentsList')} activeOpacity={0.88}>
                <Text style={s.alertEmoji}>💰</Text>
                <View style={{ flex:1 }}>
                  <Text style={[s.alertTitle,{color:'#065F46'}]}>{pending.payments} Payment{pending.payments>1?'s':''} to Verify</Text>
                  <Text style={[s.alertSub,{color:'#059669'}]}>Commission screenshots awaiting review</Text>
                </View>
                <Text style={[s.alertChev,{color:'#22C55E'}]}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* STATS */}
        <View style={s.statsGrid}>
          {STATS.map(st => (
            <View key={st.label} style={[s.statCard,{borderTopColor:st.color}]}>
              <Text style={s.statIcon}>{st.icon}</Text>
              <Text style={[s.statVal,{color:st.color}]}>{loading ? '—' : st.value}</Text>
              <Text style={s.statLbl}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* QUICK ACTIONS */}
        <Text style={s.secTitle}>Quick Actions</Text>
        <View style={s.actionsGrid}>
          {ACTIONS.map(a => (
            <TouchableOpacity key={a.label}
              style={[s.actionCard,{backgroundColor:a.bg, borderColor:a.color+'33'}]}
              onPress={() => navigation.navigate(a.screen)}
              activeOpacity={0.85}
            >
              <View style={s.actionIconWrap}>
                <Text style={s.actionEmoji}>{a.icon}</Text>
                {a.badge > 0 && (
                  <View style={[s.actionBadge,{backgroundColor:a.color}]}>
                    <Text style={s.actionBadgeTxt}>{a.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[s.actionLbl,{color:a.color}]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <FIcon name="log-out" size={rs(16)} color="#EF4444" fallback="⏻" style={{marginRight:rs(8)}} />
          <Text style={s.logoutTxt}>Logout from Admin</Text>
        </TouchableOpacity>
        <Text style={s.footer}>நம்ம வயல் 🌾 · Admin Panel · Tamil Nadu</Text>
        <View style={{height:rs(32)}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex:1, backgroundColor:'#F4F5F7' },
  header:         { paddingTop:rs(44), paddingBottom:rs(24), paddingHorizontal:H_PAD },
  headerRow:      { flexDirection:'row', alignItems:'flex-start', marginBottom:rs(20) },
  appName:        { fontSize:rf(22), fontWeight:'900', color:'#fff', letterSpacing:1 },
  appTamil:       { fontSize:rf(12), color:'rgba(255,255,255,0.6)', letterSpacing:2, marginTop:rs(2) },
  adminTag:       { fontSize:rf(12), color:'rgba(255,255,255,0.75)', marginTop:rs(4) },
  logoutIcon:     { width:rs(40), height:rs(40), borderRadius:rs(20), backgroundColor:'rgba(255,255,255,0.15)', alignItems:'center', justifyContent:'center' },
  revenueCard:    { backgroundColor:'rgba(255,255,255,0.12)', borderRadius:rs(16), padding:rs(16), flexDirection:'row', alignItems:'center' },
  revenueLabel:   { fontSize:rf(12), color:'rgba(255,255,255,0.7)', marginBottom:rs(4) },
  revenueValue:   { fontSize:rf(28), fontWeight:'900', color:'#fff', marginBottom:rs(2) },
  revenueSub:     { fontSize:rf(11), color:'rgba(255,255,255,0.55)' },
  revenueViewBtn: { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:rs(10), paddingVertical:rs(8), paddingHorizontal:rs(14) },
  revenueViewTxt: { color:'#fff', fontWeight:'700', fontSize:rf(13) },
  alertsSection:  { paddingHorizontal:H_PAD, paddingTop:rs(16), gap:rs(8) },
  alertCard:      { flexDirection:'row', alignItems:'center', backgroundColor:'#FFF3CD', borderRadius:rs(14), padding:rs(14), borderWidth:rs(1.5), borderColor:'#F59E0B' },
  alertGreen:     { backgroundColor:'#F0FDF4', borderColor:'#22C55E' },
  alertEmoji:     { fontSize:rf(24), marginRight:rs(12) },
  alertTitle:     { fontSize:rf(14), fontWeight:'700', color:'#92400E', marginBottom:rs(2) },
  alertSub:       { fontSize:rf(12), color:'#B45309' },
  alertChev:      { fontSize:rf(24), color:'#F59E0B', fontWeight:'700' },
  statsGrid:      { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:rs(12), paddingTop:rs(16) },
  statCard:       { width:'46%', margin:'2%', backgroundColor:'#fff', borderRadius:rs(14), padding:rs(16), alignItems:'center', borderTopWidth:rs(3), elevation:3 },
  statIcon:       { fontSize:rf(26), marginBottom:rs(6) },
  statVal:        { fontSize:rf(24), fontWeight:'900' },
  statLbl:        { fontSize:rf(12), color:'#6B7280', marginTop:rs(4) },
  secTitle:       { fontSize:rf(15), fontWeight:'700', color:'#111827', marginHorizontal:H_PAD, marginTop:rs(20), marginBottom:rs(12) },
  actionsGrid:    { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:rs(12) },
  actionCard:     { width:'44%', margin:'3%', borderRadius:rs(16), padding:rs(18), alignItems:'center', elevation:2, borderWidth:rs(1) },
  actionIconWrap: { position:'relative', marginBottom:rs(8) },
  actionEmoji:    { fontSize:rf(34) },
  actionBadge:    { position:'absolute', top:-rs(5), right:-rs(10), minWidth:rs(20), height:rs(20), borderRadius:rs(10), alignItems:'center', justifyContent:'center', paddingHorizontal:rs(4) },
  actionBadgeTxt: { color:'#fff', fontSize:rf(10), fontWeight:'900' },
  actionLbl:      { fontSize:rf(13), fontWeight:'700' },
  logoutBtn:      { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#FEF2F2', borderRadius:rs(14), marginHorizontal:H_PAD, marginTop:rs(16), paddingVertical:rs(15) },
  logoutTxt:      { color:'#EF4444', fontSize:rf(15), fontWeight:'800' },
  footer:         { fontSize:rf(11), color:'#9CA3AF', textAlign:'center', marginTop:rs(12) },
});
