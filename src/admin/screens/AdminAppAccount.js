// src/admin/screens/AdminAppAccount.js
// Full app bank account ledger — admin view of all commission payments received
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  FlatList, TouchableOpacity,
} from 'react-native';
import { LinearGradient }                       from 'expo-linear-gradient';
import { getAppAccountEntries, getAppAccountSummary } from '../../../firebase/firestore';
import Loader     from '../../common/components/Loader';
import EmptyState from '../../common/components/EmptyState';
import { COLORS } from '../../../constants/colors';

const METHOD_ICON  = { gpay: '🟢', phonepe: '🟣', paytm: '🔵', upi: '💳' };
const METHOD_COLOR = { gpay: '#065F46', phonepe: '#4C1D95', paytm: '#1D4ED8', upi: '#374151' };
const METHOD_BG    = { gpay: '#ECFDF5', phonepe: '#F5F3FF', paytm: '#EFF6FF', upi: '#F4F6F8' };

const TABS = [
  { key: 'all',   label: 'ALL'   },
  { key: 'week',  label: 'WEEK'  },
  { key: 'month', label: 'MONTH' },
];

function withinDays(dateStr, days) {
  const d = new Date(dateStr);
  const now = new Date();
  return (now - d) / (1000 * 60 * 60 * 24) <= days;
}

export default function AdminAppAccount() {
  const [entries, setEntries]   = useState([]);
  const [summary, setSummary]   = useState({ totalReceived: 0, totalHectare: 0, totalEntries: 0 });
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('all');

  useEffect(() => {
    const load = async () => {
      const [snap, sum] = await Promise.all([
        getAppAccountEntries(),
        getAppAccountSummary(),
      ]);
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setEntries(data);
      setSummary(sum);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = entries.filter(e => {
    if (tab === 'week')  return withinDays(e.date, 7);
    if (tab === 'month') return withinDays(e.date, 30);
    return true;
  });

  const filteredTotal   = filtered.reduce((s, e) => s + (e.amount  || 0), 0);
  const filteredHectare = filtered.reduce((s, e) => s + (e.hectare || 0), 0);

  // UPI method breakdown
  const byMethod = filtered.reduce((acc, e) => {
    const m = e.paymentMethod || 'upi';
    acc[m] = (acc[m] || 0) + (e.amount || 0);
    return acc;
  }, {});

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ── Hero Summary ── */}
            <LinearGradient colors={['#0F4C2A', '#145A3E', '#1C7C54']} style={s.hero}>
              <Text style={s.heroTitle}>🏦 Vayal App Account</Text>
              <Text style={s.heroSub}>Total commission received from all owners</Text>

              {/* All-time totals */}
              <View style={s.heroTotals}>
                <View style={s.heroTotalItem}>
                  <Text style={s.heroTotalVal}>₹{summary.totalReceived || 0}</Text>
                  <Text style={s.heroTotalLabel}>Total Received</Text>
                </View>
                <View style={s.heroDiv} />
                <View style={s.heroTotalItem}>
                  <Text style={s.heroTotalVal}>{(summary.totalHectare || 0).toFixed(1)} ha</Text>
                  <Text style={s.heroTotalLabel}>Total Hectares</Text>
                </View>
                <View style={s.heroDiv} />
                <View style={s.heroTotalItem}>
                  <Text style={s.heroTotalVal}>{summary.totalEntries || 0}</Text>
                  <Text style={s.heroTotalLabel}>Transactions</Text>
                </View>
              </View>
            </LinearGradient>

            {/* ── Filter tabs ── */}
            <View style={s.tabRow}>
              {TABS.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[s.tab, tab === t.key && s.tabActive]}
                  onPress={() => setTab(t.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.tabTxt, tab === t.key && s.tabTxtActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Period summary ── */}
            <View style={s.periodCard}>
              <Text style={s.periodTitle}>
                {tab === 'all' ? 'All Time' : tab === 'week' ? 'This Week' : 'This Month'} Summary
              </Text>
              <View style={s.periodRow}>
                <View style={s.periodStat}>
                  <Text style={s.periodVal}>₹{filteredTotal}</Text>
                  <Text style={s.periodLabel}>Collected</Text>
                </View>
                <View style={s.periodStat}>
                  <Text style={s.periodVal}>{filteredHectare.toFixed(1)} ha</Text>
                  <Text style={s.periodLabel}>Hectares</Text>
                </View>
                <View style={s.periodStat}>
                  <Text style={s.periodVal}>{filtered.length}</Text>
                  <Text style={s.periodLabel}>Payments</Text>
                </View>
              </View>
            </View>

            {/* ── UPI method breakdown ── */}
            {Object.keys(byMethod).length > 0 && (
              <View style={s.methodBreakdown}>
                <Text style={s.sectionTitle}>Payment Method Breakdown</Text>
                <View style={s.methodRow}>
                  {Object.entries(byMethod).map(([method, amt]) => (
                    <View
                      key={method}
                      style={[s.methodChip, { backgroundColor: METHOD_BG[method] || '#F4F6F8' }]}
                    >
                      <Text style={s.methodChipIcon}>{METHOD_ICON[method] || '💳'}</Text>
                      <Text style={[s.methodChipLabel, { color: METHOD_COLOR[method] || '#374151' }]}>
                        {method.toUpperCase()}
                      </Text>
                      <Text style={[s.methodChipAmt, { color: METHOD_COLOR[method] || '#374151' }]}>
                        ₹{amt}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Text style={s.sectionTitle}>Transaction Ledger</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="🏦"
            title="No Transactions Yet"
            subtitle="Commission payments from owners will appear here"
          />
        }
        renderItem={({ item }) => {
          const method = item.paymentMethod || 'upi';
          return (
            <View style={s.card}>
              <View style={s.cardLeft}>
                <View style={[s.methodDot, { backgroundColor: METHOD_BG[method] || '#F4F6F8' }]}>
                  <Text style={{ fontSize: 18 }}>{METHOD_ICON[method] || '💳'}</Text>
                </View>
              </View>
              <View style={s.cardMid}>
                <Text style={s.cardOwner}>{item.ownerName || item.ownerId}</Text>
                <Text style={s.cardMeta}>📅 {item.date}  ·  🌾 {item.hectare} ha</Text>
                <View style={[s.methodTag, { backgroundColor: METHOD_BG[method] || '#F4F6F8' }]}>
                  <Text style={[s.methodTagTxt, { color: METHOD_COLOR[method] || '#374151' }]}>
                    {method.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={s.cardRight}>
                <Text style={s.cardAmount}>₹{item.amount}</Text>
                <View style={s.paidBadge}>
                  <Text style={s.paidTxt}>✅ PAID</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.background },

  // Hero
  hero:             { borderRadius: 18, padding: 24, marginBottom: 16 },
  heroTitle:        { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  heroSub:          { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 20 },
  heroTotals:       { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 16 },
  heroTotalItem:    { flex: 1, alignItems: 'center' },
  heroTotalVal:     { fontSize: 20, fontWeight: '900', color: '#fff' },
  heroTotalLabel:   { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  heroDiv:          { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Tabs
  tabRow:           { flexDirection: 'row', marginBottom: 14, gap: 8 },
  tab:              { flex: 1, paddingVertical: 9, borderRadius: 20, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border },
  tabActive:        { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabTxt:           { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  tabTxtActive:     { color: '#fff' },

  // Period card
  periodCard:       { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 2 },
  periodTitle:      { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 12 },
  periodRow:        { flexDirection: 'row', justifyContent: 'space-around' },
  periodStat:       { alignItems: 'center' },
  periodVal:        { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  periodLabel:      { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // Method breakdown
  methodBreakdown:  { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 2 },
  methodRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  methodChip:       { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  methodChipIcon:   { fontSize: 16 },
  methodChipLabel:  { fontSize: 11, fontWeight: '700' },
  methodChipAmt:    { fontSize: 13, fontWeight: '900' },

  sectionTitle:     { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10 },

  // Ledger card
  card:             { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, flexDirection: 'row', alignItems: 'center' },
  cardLeft:         { marginRight: 12 },
  methodDot:        { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardMid:          { flex: 1 },
  cardOwner:        { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 3 },
  cardMeta:         { fontSize: 12, color: COLORS.textSecondary, marginBottom: 5 },
  methodTag:        { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  methodTagTxt:     { fontSize: 10, fontWeight: '700' },
  cardRight:        { alignItems: 'flex-end' },
  cardAmount:       { fontSize: 20, fontWeight: '900', color: COLORS.primary, marginBottom: 4 },
  paidBadge:        { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  paidTxt:          { fontSize: 9, fontWeight: '800', color: '#065F46' },
});
