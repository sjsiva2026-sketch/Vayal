// src/admin/screens/Reports.js
// UPGRADED: Beautiful stats, charts bars, district breakdown

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  StatusBar, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db }     from '../../../firebase/config';
import { COLORS } from '../../../constants/colors';
import { rs, rf, H_PAD } from '../../../utils/responsive';
import Loader     from '../../common/components/Loader';

const BAR_COLORS = ['#1C7C54','#3B82F6','#F59E0B','#8B5CF6','#EF4444'];

function StatRow({ label, value, color, subtext }) {
  return (
    <View style={r.statRow}>
      <View style={{flex:1}}>
        <Text style={r.statLabel}>{label}</Text>
        {subtext && <Text style={r.statSub}>{subtext}</Text>}
      </View>
      <Text style={[r.statVal, color && {color}]}>{value}</Text>
    </View>
  );
}

function Section({ title, icon, children }) {
  return (
    <View style={r.section}>
      <Text style={r.sectionTitle}>{icon} {title}</Text>
      {children}
    </View>
  );
}

export default function Reports() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [usersSnap, machinesSnap, bookingsSnap, paymentsSnap] = await Promise.all([
        getDocs(collection(db,'users')),
        getDocs(collection(db,'machines')),
        getDocs(collection(db,'bookings')),
        getDocs(collection(db,'commissionPayments')),
      ]);

      const users    = usersSnap.docs.map(d => d.data());
      const bookings = bookingsSnap.docs.map(d => d.data());
      const payments = paymentsSnap.docs.map(d => d.data());
      const machines = machinesSnap.docs.map(d => d.data());

      const farmers  = users.filter(u => u.role==='farmer');
      const owners   = users.filter(u => u.role==='owner');

      const completed  = bookings.filter(b => b.status==='completed');
      const pending    = bookings.filter(b => b.status==='pending');
      const accepted   = bookings.filter(b => b.status==='accepted');
      const cancelled  = bookings.filter(b => b.status==='cancelled');

      const totalHectare   = completed.reduce((s,b) => s+(b.hectareCompleted||0), 0);
      const totalRevenue   = payments.filter(p=>p.paymentStatus==='paid').reduce((s,p)=>s+(p.amount||0),0);
      const pendingRevenue = payments.filter(p=>p.paymentStatus==='pending_verification').reduce((s,p)=>s+(p.amount||0),0);

      // District breakdown
      const distMap = {};
      users.forEach(u => {
        const d = u.district || 'Unknown';
        distMap[d] = (distMap[d]||0)+1;
      });
      const topDistricts = Object.entries(distMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
      const maxDist = topDistricts[0]?.[1] || 1;

      // Machine types
      const machineMap = {};
      machines.forEach(m => {
        const t = m.type || 'unknown';
        machineMap[t] = (machineMap[t]||0)+1;
      });

      setData({
        farmers:         farmers.length,
        owners:          owners.length,
        verifiedOwners:  owners.filter(o=>o.kycStatus==='verified').length,
        pendingKyc:      owners.filter(o=>o.kycStatus==='pending').length,
        lockedOwners:    users.filter(u=>u.isLocked).length,
        totalMachines:   machines.length,
        activeMachines:  machines.filter(m=>m.isActive).length,
        totalBookings:   bookings.length,
        completed:       completed.length,
        pending:         pending.length,
        accepted:        accepted.length,
        cancelled:       cancelled.length,
        totalHectare:    totalHectare.toFixed(1),
        totalRevenue, pendingRevenue,
        topDistricts, maxDist,
        machineMap,
      });
    } catch(e){ console.warn('Reports:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return <Loader />;
  if (!data)   return <Loader />;

  return (
    <SafeAreaView style={r.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={r.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        <Text style={r.pageTitle}>📊 Platform Reports</Text>
        <Text style={r.pageSub}>Pull down to refresh</Text>

        {/* SUMMARY CARDS */}
        <View style={r.summaryGrid}>
          {[
            { label:'Total Revenue', value:`₹${data.totalRevenue}`, color:'#1C7C54', icon:'💰' },
            { label:'Total Hectares', value:`${data.totalHectare} ha`, color:'#3B82F6', icon:'🌾' },
            { label:'Total Bookings', value:data.totalBookings, color:'#F59E0B', icon:'📋' },
            { label:'Total Users', value:data.farmers+data.owners, color:'#8B5CF6', icon:'👥' },
          ].map(c => (
            <View key={c.label} style={[r.summaryCard, {borderTopColor:c.color}]}>
              <Text style={r.summaryIcon}>{c.icon}</Text>
              <Text style={[r.summaryVal, {color:c.color}]}>{c.value}</Text>
              <Text style={r.summaryLbl}>{c.label}</Text>
            </View>
          ))}
        </View>

        <Section title="Users Overview" icon="👥">
          <StatRow label="Total Farmers"    value={data.farmers}         color="#1C7C54" />
          <StatRow label="Total Owners"     value={data.owners}          color="#F59E0B" />
          <StatRow label="Verified Owners"  value={data.verifiedOwners}  color="#22C55E" />
          <StatRow label="Pending KYC"      value={data.pendingKyc}      color="#F59E0B" />
          <StatRow label="Locked Accounts"  value={data.lockedOwners}    color="#EF4444" />
        </Section>

        <Section title="Bookings" icon="📋">
          <StatRow label="Total Bookings"  value={data.totalBookings} />
          <StatRow label="Completed"       value={data.completed}     color="#22C55E" />
          <StatRow label="Pending"         value={data.pending}       color="#F59E0B" />
          <StatRow label="Accepted"        value={data.accepted}      color="#3B82F6" />
          <StatRow label="Cancelled"       value={data.cancelled}     color="#EF4444" />
          <StatRow label="Total Hectares"  value={`${data.totalHectare} ha`} color="#1C7C54" />
        </Section>

        <Section title="Revenue" icon="💰">
          <StatRow label="Total Collected"    value={`₹${data.totalRevenue}`}   color="#22C55E" />
          <StatRow label="Pending Payments"   value={`₹${data.pendingRevenue}`} color="#F59E0B" />
          <StatRow label="Commission Rate"    value="₹20/hectare"                color="#3B82F6" />
        </Section>

        <Section title="Machines" icon="🚜">
          <StatRow label="Total Machines"  value={data.totalMachines}  />
          <StatRow label="Active Machines" value={data.activeMachines} color="#22C55E" />
          {Object.entries(data.machineMap).map(([type, count]) => (
            <StatRow key={type} label={`  · ${type}`} value={count} color="#6B7280" />
          ))}
        </Section>

        {/* TOP DISTRICTS */}
        <View style={r.section}>
          <Text style={r.sectionTitle}>📍 Top Districts</Text>
          {data.topDistricts.map(([dist, count], i) => {
            const pct = Math.round((count / data.maxDist) * 100);
            return (
              <View key={dist} style={r.distRow}>
                <View style={r.distLeft}>
                  <Text style={[r.distRank, {color:BAR_COLORS[i]||'#374151'}]}>#{i+1}</Text>
                  <Text style={r.distName} numberOfLines={1}>{dist}</Text>
                </View>
                <View style={r.barTrack}>
                  <View style={[r.barFill, {width:`${pct}%`, backgroundColor:BAR_COLORS[i]||COLORS.primary}]} />
                </View>
                <Text style={r.distCount}>{count}</Text>
              </View>
            );
          })}
        </View>

        <View style={{height:rs(40)}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const r = StyleSheet.create({
  safe:        { flex:1, backgroundColor:'#F4F5F7' },
  scroll:      { padding:H_PAD, paddingBottom:rs(40) },
  pageTitle:   { fontSize:rf(22), fontWeight:'900', color:'#111827', marginBottom:rs(4) },
  pageSub:     { fontSize:rf(12), color:'#9CA3AF', marginBottom:rs(16) },
  summaryGrid: { flexDirection:'row', flexWrap:'wrap', marginBottom:rs(8) },
  summaryCard: { width:'46%', margin:'2%', backgroundColor:'#fff', borderRadius:rs(14), padding:rs(14), alignItems:'center', borderTopWidth:rs(3), elevation:3 },
  summaryIcon: { fontSize:rf(22), marginBottom:rs(6) },
  summaryVal:  { fontSize:rf(20), fontWeight:'900', marginBottom:rs(3) },
  summaryLbl:  { fontSize:rf(10), color:'#6B7280', textAlign:'center' },
  section:     { backgroundColor:'#fff', borderRadius:rs(16), padding:rs(16), marginBottom:rs(12), elevation:2 },
  sectionTitle:{ fontSize:rf(15), fontWeight:'800', color:'#111827', marginBottom:rs(12) },
  statRow:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:rs(10), borderBottomWidth:1, borderBottomColor:'#F4F5F7' },
  statLabel:   { fontSize:rf(13), color:'#374151' },
  statSub:     { fontSize:rf(11), color:'#9CA3AF', marginTop:rs(2) },
  statVal:     { fontSize:rf(14), fontWeight:'800', color:'#111827' },
  distRow:     { flexDirection:'row', alignItems:'center', paddingVertical:rs(10), borderBottomWidth:1, borderBottomColor:'#F4F5F7' },
  distLeft:    { flexDirection:'row', alignItems:'center', width:rs(110) },
  distRank:    { fontSize:rf(12), fontWeight:'800', width:rs(26) },
  distName:    { fontSize:rf(13), color:'#111827', flex:1 },
  barTrack:    { flex:1, height:rs(8), backgroundColor:'#F0F0F0', borderRadius:rs(4), marginHorizontal:rs(10), overflow:'hidden' },
  barFill:     { height:'100%', borderRadius:rs(4) },
  distCount:   { fontSize:rf(12), fontWeight:'700', color:'#374151', width:rs(24), textAlign:'right' },
});
