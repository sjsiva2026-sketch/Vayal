import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert } from 'react-native';
import { getDocs, collection, updateDoc, doc } from 'firebase/firestore';
import { db }       from '../../../firebase/config';
import PhoneConnect from '../../common/components/PhoneConnect';
import Loader       from '../../common/components/Loader';
import EmptyState   from '../../common/components/EmptyState';
import { COLORS }   from '../../../constants/colors';

export default function PaymentsList() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'dailyPayments'));
    setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.date > a.date ? 1 : -1));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleForceUnlock = async (ownerId, paymentId) => {
    await updateDoc(doc(db, 'dailyPayments', paymentId), { status: 'paid' });
    await updateDoc(doc(db, 'users', ownerId), { isLocked: false });
    load();
    Alert.alert('Unlocked', 'Owner unlocked and payment marked paid.');
  };

  const filtered     = filter === 'all' ? payments : payments.filter(p => p.status === filter);
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.totalCommission || 0), 0);

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.revenueBanner}>
        <Text style={s.revenueLabel}>Total Revenue Collected</Text>
        <Text style={s.revenueValue}>₹{totalRevenue}</Text>
      </View>
      <View style={s.filterRow}>
        {['all', 'paid', 'unpaid'].map((f, i) => (
          <TouchableOpacity key={f} style={[s.tab, filter === f && s.tabOn, i > 0 && { marginLeft: 8 }]} onPress={() => setFilter(f)}>
            <Text style={[s.tabTxt, filter === f && s.tabTxtOn]}>
              {f === 'all' ? '📋 All' : f === 'paid' ? '✅ Paid' : '❌ Unpaid'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={<EmptyState icon="💰" title="No payments found" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => setExpanded(expanded === item.id ? null : item.id)} activeOpacity={0.9}>
            <View style={s.cardHeader}>
              <Text style={s.date}>📅 {item.date}</Text>
              <View style={[s.badge, { backgroundColor: item.status === 'paid' ? COLORS.success : COLORS.error }]}>
                <Text style={s.badgeTxt}>{item.status?.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={s.meta}>Owner: {item.ownerName || item.ownerId}</Text>
            <View style={s.amountsRow}>
              <Text style={s.hectare}>🌾 {item.totalHectare} ha</Text>
              <Text style={s.commission}>₹{item.totalCommission}</Text>
            </View>
            {item.ownerPhone && <Text style={s.phone}>📞 +91 {item.ownerPhone}</Text>}
            {expanded === item.id && (
              <View style={s.expanded}>
                {item.ownerPhone && <PhoneConnect phone={item.ownerPhone} name={item.ownerName || 'Owner'} role="Machine Owner 🚜" />}
                {item.status === 'unpaid' && (
                  <TouchableOpacity style={s.unlockBtn} onPress={() => handleForceUnlock(item.ownerId, item.id)}>
                    <Text style={s.unlockTxt}>🔓 Force Unlock & Mark Paid</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <Text style={s.hint}>{expanded === item.id ? '▲ Collapse' : '▼ Details & Contact'}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.background },
  revenueBanner: { backgroundColor: COLORS.primaryDark, padding: 20, alignItems: 'center' },
  revenueLabel:  { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  revenueValue:  { fontSize: 32, fontWeight: '900', color: COLORS.white, marginTop: 4 },
  filterRow:     { flexDirection: 'row', padding: 12 },
  tab:           { flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  tabOn:         { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabTxt:        { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  tabTxtOn:      { color: COLORS.white },
  card:          { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3 },
  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  date:          { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  badge:         { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTxt:      { fontSize: 10, color: COLORS.white, fontWeight: '700' },
  meta:          { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  amountsRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hectare:       { fontSize: 13, color: COLORS.textSecondary },
  commission:    { fontSize: 18, fontWeight: '800', color: COLORS.secondary },
  phone:         { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  expanded:      { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  unlockBtn:     { backgroundColor: COLORS.warning, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  unlockTxt:     { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  hint:          { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
});
