// src/admin/screens/PaymentsList.js
// ADMIN VERIFICATION SCREEN
// Admin views screenshot → taps Verify (unlock owner) or Reject

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert, StatusBar, Linking,
} from 'react-native';
import { useFocusEffect }            from '@react-navigation/native';
import { collection, getDocs }       from 'firebase/firestore';
import { db }                        from '../../../firebase/config';
import { adminVerifyPayment, adminRejectPayment } from '../../../firebase/commission';
import { COLORS }                    from '../../../constants/colors';
import { rs, rf, H_PAD }             from '../../../utils/responsive';
import Loader                        from '../../common/components/Loader';

const STATUS = {
  pending_verification: { bg: '#FFF3CD', color: '#92400E', label: 'Pending review' },
  paid:                 { bg: '#DCFCE7', color: '#065F46', label: 'Verified' },
  rejected:             { bg: '#FEE2E2', color: '#B91C1C', label: 'Rejected' },
  pending:              { bg: '#F3F4F6', color: '#374151', label: 'Not submitted' },
};

export default function PaymentsList() {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('pending_verification');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'commissionPayments'));
      const all  = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
      setPayments(all);
    } catch (e) { console.warn('PaymentsList:', e.message); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleVerify = (item) => {
    Alert.alert(
      'Verify Payment',
      `Mark Rs.${item.amount} from this owner as PAID?\n\nThis will unlock their account immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify & Unlock',
          onPress: async () => {
            try {
              await adminVerifyPayment(item.ownerId, item.id);
              Alert.alert('Done', 'Payment verified. Owner account unlocked.');
              load();
            } catch (e) { Alert.alert('Error', e.message); }
          },
        },
      ]
    );
  };

  const handleReject = (item) => {
    Alert.alert(
      'Reject Payment',
      'Reject this payment proof? Owner will need to resubmit.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminRejectPayment(item.ownerId, item.id);
              Alert.alert('Done', 'Payment rejected.');
              load();
            } catch (e) { Alert.alert('Error', e.message); }
          },
        },
      ]
    );
  };

  const pendingCount = payments.filter(p => p.paymentStatus === 'pending_verification').length;
  const filtered     = filter === 'all' ? payments : payments.filter(p => (p.paymentStatus || 'pending') === filter);

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Commission Payments</Text>
        {pendingCount > 0 && (
          <View style={s.pendingPill}>
            <Text style={s.pendingPillTxt}>{pendingCount} pending</Text>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={s.tabRow}>
        {[
          { key: 'pending_verification', label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          { key: 'paid',    label: 'Verified' },
          { key: 'rejected',label: 'Rejected' },
          { key: 'all',     label: 'All' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, filter === tab.key && s.tabActive]}
            onPress={() => setFilter(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabTxt, filter === tab.key && s.tabTxtActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: H_PAD, flexGrow: 1, paddingBottom: rs(40) }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>💰</Text>
            <Text style={s.emptyTxt}>No {filter === 'all' ? '' : filter.replace('_', ' ')} payments</Text>
          </View>
        }
        renderItem={({ item }) => {
          const st   = STATUS[item.paymentStatus] || STATUS.pending;
          const date = item.submittedAt?.seconds
            ? new Date(item.submittedAt.seconds * 1000).toLocaleString('en-IN')
            : item.date || '—';
          const isPending = item.paymentStatus === 'pending_verification';

          return (
            <View style={s.card}>
              {/* Top row */}
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardAmount}>Rs.{item.amount || 0}</Text>
                  <Text style={s.cardDate}>{date}</Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                  <Text style={[s.statusTxt, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              {/* Details */}
              <View style={s.detailBox}>
                <View style={s.detailRow}>
                  <Text style={s.detailKey}>Transaction ID</Text>
                  <Text style={s.detailVal} selectable>{item.transactionId || '—'}</Text>
                </View>
                <View style={s.detailRow}>
                  <Text style={s.detailKey}>Owner</Text>
                  <Text style={s.detailVal} numberOfLines={1}>{item.ownerId || '—'}</Text>
                </View>
              </View>

              {/* Screenshot button */}
              {item.paymentProofUrl ? (
                <TouchableOpacity
                  style={s.screenshotBtn}
                  onPress={() => Linking.openURL(item.paymentProofUrl).catch(() => Alert.alert('Error', 'Cannot open image'))}
                  activeOpacity={0.85}
                >
                  <Text style={s.screenshotBtnTxt}>View Payment Screenshot</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.noScreenshot}>
                  <Text style={s.noScreenshotTxt}>No screenshot uploaded yet</Text>
                </View>
              )}

              {/* Admin action buttons — ONLY for pending_verification */}
              {isPending && (
                <View style={s.actionRow}>
                  <TouchableOpacity style={s.verifyBtn} onPress={() => handleVerify(item)} activeOpacity={0.88}>
                    <Text style={s.verifyBtnTxt}>Verify & Unlock</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => handleReject(item)} activeOpacity={0.88}>
                    <Text style={s.rejectBtnTxt}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Already decided */}
              {item.paymentStatus === 'paid' && (
                <View style={s.decidedBox}>
                  <Text style={s.decidedTxt}>Verified — owner unlocked</Text>
                </View>
              )}
              {item.paymentStatus === 'rejected' && (
                <View style={[s.decidedBox, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[s.decidedTxt, { color: '#B91C1C' }]}>Rejected — owner must resubmit</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#F4F6F8' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: H_PAD, paddingVertical: rs(14), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle:      { fontSize: rf(20), fontWeight: '900', color: '#111827' },
  pendingPill:      { backgroundColor: '#FEE2E2', borderRadius: rs(12), paddingHorizontal: rs(12), paddingVertical: rs(4) },
  pendingPillTxt:   { fontSize: rf(12), color: '#B91C1C', fontWeight: '800' },
  tabRow:           { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingHorizontal: rs(10), paddingVertical: rs(8) },
  tab:              { paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(20), marginRight: rs(6), backgroundColor: '#F4F5F7' },
  tabActive:        { backgroundColor: COLORS.primary },
  tabTxt:           { fontSize: rf(12), fontWeight: '700', color: COLORS.textSecondary },
  tabTxtActive:     { color: '#fff' },
  emptyBox:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: rs(60) },
  emptyIcon:        { fontSize: rf(40), marginBottom: rs(10) },
  emptyTxt:         { fontSize: rf(15), color: COLORS.textSecondary },
  card:             { backgroundColor: '#fff', borderRadius: rs(16), marginBottom: rs(12), padding: rs(16), elevation: 2 },
  cardTop:          { flexDirection: 'row', alignItems: 'flex-start', marginBottom: rs(12) },
  cardAmount:       { fontSize: rf(24), fontWeight: '900', color: '#111827' },
  cardDate:         { fontSize: rf(12), color: COLORS.textSecondary, marginTop: rs(2) },
  statusPill:       { borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(5) },
  statusTxt:        { fontSize: rf(12), fontWeight: '800' },
  detailBox:        { backgroundColor: '#F9FAFB', borderRadius: rs(10), padding: rs(12), marginBottom: rs(12) },
  detailRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: rs(4) },
  detailKey:        { fontSize: rf(12), color: COLORS.textSecondary },
  detailVal:        { fontSize: rf(12), fontWeight: '700', color: '#111827', maxWidth: '55%', textAlign: 'right' },
  screenshotBtn:    { backgroundColor: '#EFF6FF', borderRadius: rs(10), paddingVertical: rs(12), alignItems: 'center', marginBottom: rs(12), borderWidth: 1, borderColor: '#BFDBFE' },
  screenshotBtnTxt: { fontSize: rf(14), fontWeight: '700', color: '#1D4ED8' },
  noScreenshot:     { backgroundColor: '#F9FAFB', borderRadius: rs(10), paddingVertical: rs(12), alignItems: 'center', marginBottom: rs(12) },
  noScreenshotTxt:  { fontSize: rf(13), color: COLORS.textSecondary },
  actionRow:        { flexDirection: 'row', gap: rs(10) },
  verifyBtn:        { flex: 1, backgroundColor: '#DCFCE7', borderRadius: rs(10), paddingVertical: rs(13), alignItems: 'center', borderWidth: 1, borderColor: '#22C55E' },
  verifyBtnTxt:     { fontSize: rf(14), fontWeight: '800', color: '#065F46' },
  rejectBtn:        { flex: 1, backgroundColor: '#FEE2E2', borderRadius: rs(10), paddingVertical: rs(13), alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' },
  rejectBtnTxt:     { fontSize: rf(14), fontWeight: '800', color: '#B91C1C' },
  decidedBox:       { backgroundColor: '#DCFCE7', borderRadius: rs(10), paddingVertical: rs(10), alignItems: 'center' },
  decidedTxt:       { fontSize: rf(13), fontWeight: '700', color: '#065F46' },
});
