import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { LinearGradient }  from 'expo-linear-gradient';
import { useFocusEffect }  from '@react-navigation/native';
import { getDailyPayment, getBookingsByOwner } from '../../../firebase/firestore';
import { useUser }         from '../../../context/UserContext';
import { todayString }     from '../../../utils/dateFormatter';
import { CONFIG }          from '../../../constants/config';
import Button              from '../../common/components/Button';
import Loader              from '../../common/components/Loader';
import EarningsCard        from '../components/EarningsCard';
import SummaryCard         from '../components/SummaryCard';
import { COLORS }          from '../../../constants/colors';

export default function DailySummary({ navigation }) {
  const { userProfile }       = useUser();
  const uid                   = userProfile?.id || '';
  const [summary, setSummary] = useState(null);
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const today                 = todayString();

  useFocusEffect(useCallback(() => {
    if (!uid) { setLoading(false); return; }
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const [payment, snap] = await Promise.all([
          getDailyPayment(uid, today),
          getBookingsByOwner(uid),
        ]);
        if (!alive) return;
        setSummary(payment);
        setJobs(snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(b => b.date === today && b.status === 'completed'));
      } catch (e) {
        console.warn('DailySummary:', e.message);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [uid, today]));

  if (loading) return <Loader />;

  const totalComm  = summary?.totalCommission || 0;
  const isPaid     = summary?.status === 'paid';

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.header}>
          <Text style={s.headerIcon}>📊</Text>
          <Text style={s.headerTitle}>Today's Summary</Text>
          <View style={s.datePill}>
            <Text style={s.dateTxt}>📅 {today}</Text>
          </View>
        </LinearGradient>

        {/* ── Earnings card ── */}
        <View style={s.section}>
          <EarningsCard
            totalHectare={summary?.totalHectare || 0}
            totalCommission={totalComm}
            status={summary?.status || 'unpaid'}
          />
        </View>

        {/* ── Completed jobs ── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>
              ✅ Completed Jobs
            </Text>
            <View style={[s.countBadge, { backgroundColor: jobs.length > 0 ? COLORS.primaryXLight : '#F3F4F6' }]}>
              <Text style={[s.countTxt, { color: jobs.length > 0 ? COLORS.primary : COLORS.textSecondary }]}>{jobs.length}</Text>
            </View>
          </View>

          {jobs.length > 0
            ? jobs.map((j, i) => (
                <SummaryCard
                  key={j.id}
                  jobNumber={i + 1}
                  farmerName={j.farmerName || 'Farmer'}
                  farmerPhone={j.farmerPhone || ''}
                  hectareCompleted={j.hectareCompleted || 0}
                  commission={(j.hectareCompleted || 0) * CONFIG.COMMISSION_PER_HECTARE}
                />
              ))
            : (
              <View style={s.emptyBox}>
                <Text style={s.emptyTxt}>No completed jobs today yet</Text>
              </View>
            )
          }
        </View>

        {/* ── Pay CTA ── */}
        {totalComm > 0 && !isPaid && (
          <View style={s.section}>
            <View style={s.warnBox}>
              <Text style={s.warnTxt}>⚠️ Pay commission before midnight to keep your account unlocked.</Text>
            </View>
            <Button
              title={`💳 Pay ₹${totalComm} Now`}
              onPress={() => navigation.navigate('Payment', { summary })}
              variant="secondary"
              style={{ marginTop: 12 }}
            />
          </View>
        )}

        {isPaid && (
          <View style={s.section}>
            <View style={s.paidBox}>
              <Text style={s.paidTxt}>🎉 Commission paid — account is unlocked!</Text>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: COLORS.background },
  scroll:     { paddingBottom: 32 },

  header:     { paddingTop: 36, paddingBottom: 28, paddingHorizontal: 24, alignItems: 'center' },
  headerIcon: { fontSize: 44, marginBottom: 10 },
  headerTitle:{ fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 10 },
  datePill:   { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  dateTxt:    { fontSize: 13, fontWeight: '600', color: '#fff' },

  section:    { paddingHorizontal: 16, marginTop: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle:{ fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, flex: 1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countTxt:   { fontSize: 13, fontWeight: '800' },

  emptyBox:   { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center', elevation: 1 },
  emptyTxt:   { fontSize: 13, color: COLORS.textSecondary },

  warnBox:    { backgroundColor: '#FFF3CD', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  warnTxt:    { fontSize: 13, color: '#856404', lineHeight: 20 },
  paidBox:    { backgroundColor: '#D4EDDA', borderRadius: 12, padding: 16, alignItems: 'center' },
  paidTxt:    { fontSize: 14, fontWeight: '700', color: '#155724' },
});
