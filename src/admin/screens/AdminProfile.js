// src/admin/screens/AdminProfile.js
// Admin profile with live stats, quick actions, logout

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, StatusBar, RefreshControl, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db }       from '../../../firebase/config';
import { logout }   from '../../../firebase/auth';
import { useAuth }  from '../../../context/AuthContext';
import { useUser }  from '../../../context/UserContext';
import { FIcon }    from '../../../utils/icons';
import { COLORS }   from '../../../constants/colors';
import { rs, rf, H_PAD } from '../../../utils/responsive';

const SUPPORT_PHONE = '9876543210';

export default function AdminProfile({ navigation }) {
  const { setUser }        = useAuth();
  const { userProfile, clearProfile } = useUser();

  const [stats,      setStats]      = useState({ farmers:0, owners:0, bookings:0, machines:0 });
  const [pending,    setPending]    = useState({ kyc:0, payments:0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [fa, ow, bk, mc, kp, pp] = await Promise.all([
        getDocs(query(collection(db,'users'), where('role','==','farmer'))),
        getDocs(query(collection(db,'users'), where('role','==','owner'))),
        getDocs(collection(db,'bookings')),
        getDocs(collection(db,'machines')),
        getDocs(query(collection(db,'users'), where('role','==','owner'), where('kycStatus','==','pending'))),
        getDocs(query(collection(db,'commissionPayments'), where('paymentStatus','==','pending_verification'))),
      ]);
      setStats({ farmers:fa.size, owners:ow.size, bookings:bk.size, machines:mc.size });
      setPending({ kyc:kp.size, payments:pp.size });
    } catch(e) { console.warn('AdminProfile:', e.message); }
    finally { setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  const handleLogout = () =>
    Alert.alert('Logout', 'Logout from admin panel?', [
      { text:'Cancel', style:'cancel' },
      { text:'Logout', style:'destructive', onPress: async () => {
          await logout(); clearProfile(); setUser(null);
          navigation.reset({ index:0, routes:[{ name:'RoleSelect' }] });
        },
      },
    ]);

  const QUICK_ACTIONS = [
    { icon:'🪪', label:'Verify KYC',    badge:pending.kyc,      color:'#F59E0B', bg:'#FFF3CD', screen:'KycVerificationList' },
    { icon:'💰', label:'Payments',      badge:pending.payments, color:'#22C55E', bg:'#DCFCE7', screen:'PaymentsList' },
    { icon:'👥', label:'Users',         badge:0,                color:'#3B82F6', bg:'#EFF6FF', screen:'UsersList' },
    { icon:'🚜', label:'Machines',      badge:0,                color:'#8B5CF6', bg:'#EDE9FE', screen:'MachinesList' },
    { icon:'📊', label:'Reports',       badge:0,                color:'#EF4444', bg:'#FEE2E2', screen:'Reports' },
    { icon:'🏦', label:'App Account',   badge:0,                color:'#0F4C2A', bg:'#DCFCE7', screen:'AdminAppAccount' },
  ];

  const MENU = [
    { icon:'🔔', label:'Notifications',  sub:'App-wide alerts',               onPress:() => {} },
    { icon:'🛡️', label:'Privacy Policy', sub:'Data usage policy',             onPress:() => {} },
    { icon:'📖', label:'About App',      sub:'நம்ம வயல் Admin v1.0.4',         onPress:() => {} },
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
          <View style={s.avatarWrap}>
            <Text style={s.avatarEmoji}>👨‍💼</Text>
          </View>
          <Text style={s.adminName}>{userProfile?.name || 'Admin'}</Text>
          <Text style={s.adminEmail}>{userProfile?.email || 'admin@nammaVayal.com'}</Text>
          <View style={s.adminBadge}><Text style={s.adminBadgeTxt}>🔐 Super Admin</Text></View>
        </LinearGradient>

        {/* STATS */}
        <View style={s.statsRow}>
          {[
            { label:'Farmers',  value:stats.farmers,  color:'#1C7C54' },
            { label:'Owners',   value:stats.owners,   color:'#F59E0B' },
            { label:'Bookings', value:stats.bookings, color:'#3B82F6' },
            { label:'Machines', value:stats.machines, color:'#8B5CF6' },
          ].map((st,i,arr) => (
            <View key={st.label} style={[s.statItem, i<arr.length-1 && s.statBorder]}>
              <Text style={[s.statVal,{color:st.color}]}>{st.value}</Text>
              <Text style={s.statLbl}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* PENDING ALERTS */}
        {(pending.kyc > 0 || pending.payments > 0) && (
          <View style={s.alertsBox}>
            {pending.kyc > 0 && (
              <TouchableOpacity style={s.alertCard} onPress={() => navigation.navigate('KycVerificationList')} activeOpacity={0.88}>
                <Text style={s.alertEmoji}>🪪</Text>
                <Text style={s.alertTxt}>{pending.kyc} KYC request{pending.kyc>1?'s':''} pending review</Text>
                <Text style={s.alertChev}>›</Text>
              </TouchableOpacity>
            )}
            {pending.payments > 0 && (
              <TouchableOpacity style={[s.alertCard,{borderColor:'#22C55E',backgroundColor:'#F0FDF4'}]} onPress={() => navigation.navigate('PaymentsList')} activeOpacity={0.88}>
                <Text style={s.alertEmoji}>💰</Text>
                <Text style={[s.alertTxt,{color:'#065F46'}]}>{pending.payments} payment{pending.payments>1?'s':''} to verify</Text>
                <Text style={[s.alertChev,{color:'#22C55E'}]}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* QUICK ACTIONS */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionsGrid}>
          {QUICK_ACTIONS.map(a => (
            <TouchableOpacity
              key={a.label}
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

        {/* SUPPORT */}
        <Text style={s.sectionTitle}>Support</Text>
        <View style={s.supportRow}>
          <TouchableOpacity style={s.supportBtn} onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)} activeOpacity={0.85}>
            <Text style={s.supportIcon}>📞</Text>
            <Text style={s.supportTxt}>Call Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.supportBtn,{borderColor:'#25D366'}]} onPress={() => Linking.openURL(`whatsapp://send?phone=91${SUPPORT_PHONE}`)} activeOpacity={0.85}>
            <Text style={s.supportIcon}>💬</Text>
            <Text style={[s.supportTxt,{color:'#25D366'}]}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {/* MENU */}
        <Text style={s.sectionTitle}>Settings</Text>
        <View style={s.menuCard}>
          {MENU.map((item,i) => (
            <TouchableOpacity key={item.label} style={[s.menuRow, i<MENU.length-1 && s.menuBorder]} onPress={item.onPress} activeOpacity={0.7}>
              <View style={s.menuIconWrap}><Text style={s.menuIcon}>{item.icon}</Text></View>
              <View style={{flex:1}}>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuSub}>{item.sub}</Text>
              </View>
              <FIcon name="chevron-right" size={rs(18)} color="#D1D5DB" fallback="›" />
            </TouchableOpacity>
          ))}
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={s.logoutTxt}>⏻  Logout from Admin</Text>
        </TouchableOpacity>

        <Text style={s.version}>நம்ம வயல் 🌾 · Admin Panel · v1.0.4</Text>
        <View style={{height:rs(40)}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex:1, backgroundColor:'#F4F5F7' },
  header:        { paddingTop:rs(44), paddingBottom:rs(28), alignItems:'center', paddingHorizontal:H_PAD },
  avatarWrap:    { width:rs(90), height:rs(90), borderRadius:rs(45), backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center', marginBottom:rs(12), borderWidth:rs(3), borderColor:'rgba(255,255,255,0.5)' },
  avatarEmoji:   { fontSize:rf(44) },
  adminName:     { fontSize:rf(22), fontWeight:'900', color:'#fff', marginBottom:rs(3) },
  adminEmail:    { fontSize:rf(12), color:'rgba(255,255,255,0.75)', marginBottom:rs(10) },
  adminBadge:    { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:rs(20), paddingHorizontal:rs(16), paddingVertical:rs(6) },
  adminBadgeTxt: { fontSize:rf(12), color:'#fff', fontWeight:'700' },
  statsRow:      { flexDirection:'row', backgroundColor:'#fff', marginHorizontal:rs(16), marginTop:-rs(14), borderRadius:rs(16), elevation:4, overflow:'hidden', marginBottom:rs(16) },
  statItem:      { flex:1, alignItems:'center', paddingVertical:rs(14) },
  statBorder:    { borderRightWidth:1, borderRightColor:'#F0F0F0' },
  statVal:       { fontSize:rf(18), fontWeight:'900', marginBottom:rs(3) },
  statLbl:       { fontSize:rf(10), color:'#9CA3AF' },
  alertsBox:     { paddingHorizontal:H_PAD, marginBottom:rs(8) },
  alertCard:     { flexDirection:'row', alignItems:'center', backgroundColor:'#FFF3CD', borderRadius:rs(12), padding:rs(12), borderWidth:rs(1.5), borderColor:'#F59E0B', marginBottom:rs(8) },
  alertEmoji:    { fontSize:rf(20), marginRight:rs(10) },
  alertTxt:      { flex:1, fontSize:rf(13), fontWeight:'600', color:'#92400E' },
  alertChev:     { fontSize:rf(20), color:'#F59E0B', fontWeight:'700' },
  sectionTitle:  { fontSize:rf(13), fontWeight:'700', color:'#6B7280', paddingHorizontal:H_PAD, marginBottom:rs(10), marginTop:rs(4) },
  actionsGrid:   { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:rs(12), marginBottom:rs(8) },
  actionCard:    { width:'44%', margin:'3%', borderRadius:rs(16), padding:rs(16), alignItems:'center', elevation:2, borderWidth:rs(1) },
  actionIconWrap:{ position:'relative', marginBottom:rs(8) },
  actionEmoji:   { fontSize:rf(30) },
  actionBadge:   { position:'absolute', top:-rs(4), right:-rs(10), minWidth:rs(18), height:rs(18), borderRadius:rs(9), alignItems:'center', justifyContent:'center', paddingHorizontal:rs(4) },
  actionBadgeTxt:{ color:'#fff', fontSize:rf(9), fontWeight:'900' },
  actionLbl:     { fontSize:rf(12), fontWeight:'700' },
  supportRow:    { flexDirection:'row', paddingHorizontal:H_PAD, gap:rs(10), marginBottom:rs(16) },
  supportBtn:    { flex:1, backgroundColor:'#fff', borderRadius:rs(12), paddingVertical:rs(14), alignItems:'center', borderWidth:rs(1.5), borderColor:COLORS.primary, elevation:1 },
  supportIcon:   { fontSize:rf(22), marginBottom:rs(4) },
  supportTxt:    { fontSize:rf(13), fontWeight:'700', color:COLORS.primary },
  menuCard:      { backgroundColor:'#fff', marginHorizontal:H_PAD, borderRadius:rs(16), overflow:'hidden', elevation:1, marginBottom:rs(12) },
  menuRow:       { flexDirection:'row', alignItems:'center', paddingHorizontal:rs(16), paddingVertical:rs(14) },
  menuBorder:    { borderBottomWidth:1, borderBottomColor:'#F4F5F7' },
  menuIconWrap:  { width:rs(38), height:rs(38), borderRadius:rs(10), backgroundColor:'#F4F5F7', alignItems:'center', justifyContent:'center', marginRight:rs(12) },
  menuIcon:      { fontSize:rf(18) },
  menuLabel:     { fontSize:rf(14), fontWeight:'600', color:'#111827', marginBottom:rs(2) },
  menuSub:       { fontSize:rf(11), color:'#9CA3AF' },
  logoutBtn:     { flexDirection:'row', alignItems:'center', justifyContent:'center', marginHorizontal:H_PAD, backgroundColor:'#FEF2F2', borderRadius:rs(14), paddingVertical:rs(15), marginBottom:rs(8) },
  logoutTxt:     { fontSize:rf(15), fontWeight:'800', color:'#EF4444' },
  version:       { textAlign:'center', fontSize:rf(11), color:'#9CA3AF' },
});
