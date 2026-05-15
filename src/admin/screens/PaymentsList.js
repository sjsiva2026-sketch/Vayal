// src/admin/screens/PaymentsList.js
// FIXED: Screenshot image responsive (aspectRatio: 1.5)
// FIXED: SafeAreaView + StatusBar correct
// FIXED: All cards responsive flexbox

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert, StatusBar, Image, Linking,
  Modal, Dimensions,
} from 'react-native';
import { useFocusEffect }            from '@react-navigation/native';
import { collection, getDocs }       from 'firebase/firestore';
import { db }                        from '../../../firebase/config';
import { adminVerifyPayment, adminRejectPayment } from '../../../firebase/commission';
import { COLORS }      from '../../../constants/colors';
import { rs, rf, H_PAD } from '../../../utils/responsive';
import Loader          from '../../common/components/Loader';

const { width: W } = Dimensions.get('window');

const STATUS = {
  pending_verification: { bg: '#FFF3CD', color: '#92400E', label: '⏳ Pending Review',  border: '#F59E0B' },
  paid:                 { bg: '#DCFCE7', color: '#065F46', label: '✅ Verified & Paid',  border: '#22C55E' },
  rejected:             { bg: '#FEE2E2', color: '#B91C1C', label: '❌ Rejected',          border: '#EF4444' },
  pending:              { bg: '#F3F4F6', color: '#374151', label: '📋 Not Submitted',     border: '#E5E7EB' },
};

// Screenshot preview modal
function ScreenshotModal({ visible, url, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={sm.overlay} activeOpacity={1} onPress={onClose}>
        <View style={sm.box}>
          <Image
            source={{ uri: url }}
            style={sm.img}
            resizeMode="contain"
          />
          <TouchableOpacity style={sm.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={sm.closeTxt}>✕ Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const sm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: rs(16) },
  box:     { width: '100%', backgroundColor: '#111', borderRadius: rs(16), overflow: 'hidden' },
  img:     { width: '100%', aspectRatio: 0.65, backgroundColor: '#000' },
  closeBtn:{ padding: rs(16), alignItems: 'center' },
  closeTxt:{ color: '#fff', fontSize: rf(15), fontWeight: '700' },
});

export default function PaymentsList() {
  const [payments,   setPayments]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('pending_verification');
  const [preview,    setPreview]    = useState({ visible: false, url: '' });
  const [actioning,  setActioning]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'commissionPayments'));
      setPayments(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a,b) => (b.submittedAt?.seconds||0) - (a.submittedAt?.seconds||0))
      );
    } catch(e) { console.warn('PaymentsList:', e.message); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleVerify = (item) => {
    Alert.alert(
      '✅ Verify Payment',
      `Mark ₹${item.amount} as PAID?\nThis will unlock the owner's account immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Verify & Unlock', onPress: async () => {
            setActioning(item.id);
            try {
              await adminVerifyPayment(item.ownerId, item.id);
              Alert.alert('✅ Done', 'Payment verified. Owner account unlocked.');
              load();
            } catch(e) { Alert.alert('Error', e.message); }
            finally { setActioning(null); }
          },
        },
      ]
    );
  };

  const handleReject = (item) => {
    Alert.alert(
      '❌ Reject Payment',
      'Reject this screenshot? Owner must resubmit.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: async () => {
            setActioning(item.id);
            try {
              await adminRejectPayment(item.ownerId, item.id);
              Alert.alert('Done', 'Payment rejected. Owner notified.');
              load();
            } catch(e) { Alert.alert('Error', e.message); }
            finally { setActioning(null); }
          },
        },
      ]
    );
  };

  const pendingCount = payments.filter(p => p.paymentStatus === 'pending_verification').length;
  const filtered     = filter === 'all' ? payments : payments.filter(p => (p.paymentStatus||'pending') === filter);

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Commission Payments</Text>
        {pendingCount > 0 && (
          <View style={s.pendingPill}>
            <Text style={s.pendingTxt}>{pendingCount} pending</Text>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={s.tabRow}>
        {[
          { key:'pending_verification', label:`Pending${pendingCount>0?` (${pendingCount})`:''}`},
          { key:'paid',     label:'Verified' },
          { key:'rejected', label:'Rejected' },
          { key:'all',      label:'All' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, filter===tab.key && s.tabActive]}
            onPress={() => setFilter(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabTxt, filter===tab.key && s.tabTxtActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding:H_PAD, flexGrow:1, paddingBottom:rs(40) }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>💰</Text>
            <Text style={s.emptyTxt}>No {filter==='all'?'':filter.replace('_',' ')} payments</Text>
          </View>
        }
        renderItem={({ item }) => {
          const st         = STATUS[item.paymentStatus] || STATUS.pending;
          const isPending  = item.paymentStatus === 'pending_verification';
          const isActioning_ = actioning === item.id;
          const date       = item.submittedAt?.seconds
            ? new Date(item.submittedAt.seconds * 1000).toLocaleString('en-IN')
            : item.date || '—';

          return (
            <View style={[s.card, { borderLeftColor: st.border }]}>
              {/* Amount + status */}
              <View style={s.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.amount}>₹{item.amount || 0}</Text>
                  <Text style={s.date}>{date}</Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                  <Text style={[s.statusTxt, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              {/* Details */}
              <View style={s.detailBox}>
                <DetailRow label="Owner ID" value={item.ownerId || '—'} />
                <DetailRow label="Date"     value={item.date   || '—'} />
              </View>

              {/* Screenshot */}
              {item.paymentProofUrl ? (
                <TouchableOpacity
                  style={s.screenshotWrap}
                  onPress={() => setPreview({ visible: true, url: item.paymentProofUrl })}
                  activeOpacity={0.9}
                >
                  {/* Responsive thumbnail */}
                  <Image
                    source={{ uri: item.paymentProofUrl }}
                    style={s.screenshotThumb}
                    resizeMode="cover"
                  />
                  <View style={s.screenshotOverlay}>
                    <Text style={s.screenshotOverlayTxt}>👁 Tap to view full screenshot</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={s.noScreenshot}>
                  <Text style={s.noScreenshotTxt}>📷 No screenshot uploaded</Text>
                </View>
              )}

              {/* Action buttons */}
              {isPending && (
                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={[s.verifyBtn, isActioning_ && s.btnDisabled]}
                    onPress={() => !isActioning_ && handleVerify(item)}
                    activeOpacity={0.88}
                  >
                    <Text style={s.verifyBtnTxt}>
                      {isActioning_ ? 'Processing...' : '✅ Verify & Unlock'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.rejectBtn, isActioning_ && s.btnDisabled]}
                    onPress={() => !isActioning_ && handleReject(item)}
                    activeOpacity={0.88}
                  >
                    <Text style={s.rejectBtnTxt}>❌ Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {item.paymentStatus === 'paid' && (
                <View style={s.decidedBox}>
                  <Text style={s.decidedTxt}>✅ Verified — owner account unlocked</Text>
                </View>
              )}
              {item.paymentStatus === 'rejected' && (
                <View style={[s.decidedBox, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[s.decidedTxt, { color: '#B91C1C' }]}>❌ Rejected — owner must resubmit</Text>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Screenshot full-screen preview */}
      <ScreenshotModal
        visible={preview.visible}
        url={preview.url}
        onClose={() => setPreview({ visible: false, url: '' })}
      />
    </SafeAreaView>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailKey}>{label}</Text>
      <Text style={s.detailVal} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#F4F5F7' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: H_PAD, paddingVertical: rs(14), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle:    { fontSize: rf(20), fontWeight: '900', color: '#111827' },
  pendingPill:    { backgroundColor: '#FEE2E2', borderRadius: rs(12), paddingHorizontal: rs(12), paddingVertical: rs(4) },
  pendingTxt:     { fontSize: rf(12), color: '#B91C1C', fontWeight: '800' },
  tabRow:         { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingHorizontal: rs(10), paddingVertical: rs(8) },
  tab:            { paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(20), marginRight: rs(6), backgroundColor: '#F4F5F7' },
  tabActive:      { backgroundColor: COLORS.primary },
  tabTxt:         { fontSize: rf(12), fontWeight: '700', color: '#6B7280' },
  tabTxtActive:   { color: '#fff' },
  emptyBox:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: rs(60) },
  emptyIcon:      { fontSize: rf(40), marginBottom: rs(10) },
  emptyTxt:       { fontSize: rf(15), color: '#6B7280' },

  // Card
  card:           { backgroundColor: '#fff', borderRadius: rs(16), marginBottom: rs(12), padding: rs(16), elevation: 2, borderLeftWidth: rs(4) },
  cardTopRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: rs(12) },
  amount:         { fontSize: rf(28), fontWeight: '900', color: '#111827', marginBottom: rs(2) },
  date:           { fontSize: rf(12), color: '#9CA3AF' },
  statusPill:     { borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(5), alignSelf: 'flex-start' },
  statusTxt:      { fontSize: rf(11), fontWeight: '800' },

  // Details
  detailBox:      { backgroundColor: '#F9FAFB', borderRadius: rs(10), padding: rs(12), marginBottom: rs(12) },
  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: rs(4) },
  detailKey:      { fontSize: rf(12), color: '#9CA3AF', fontWeight: '500' },
  detailVal:      { fontSize: rf(12), fontWeight: '700', color: '#111827', maxWidth: '60%', textAlign: 'right' },

  // Screenshot — responsive, no stretching
  screenshotWrap:    { position: 'relative', borderRadius: rs(12), overflow: 'hidden', marginBottom: rs(12) },
  screenshotThumb:   {
    width:       '100%',
    aspectRatio: 1.8,        // responsive, no fixed height
    backgroundColor: '#F0F0F0',
  },
  screenshotOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: rs(8), alignItems: 'center' },
  screenshotOverlayTxt: { fontSize: rf(12), color: '#fff', fontWeight: '700' },
  noScreenshot:      { backgroundColor: '#F9FAFB', borderRadius: rs(10), paddingVertical: rs(14), alignItems: 'center', marginBottom: rs(12), borderWidth: rs(1.5), borderColor: '#E5E7EB', borderStyle: 'dashed' },
  noScreenshotTxt:   { fontSize: rf(13), color: '#9CA3AF' },

  // Action buttons
  actionRow:      { flexDirection: 'row', gap: rs(10) },
  verifyBtn:      { flex: 1, backgroundColor: '#DCFCE7', borderRadius: rs(12), paddingVertical: rs(13), alignItems: 'center', borderWidth: 1, borderColor: '#22C55E' },
  verifyBtnTxt:   { fontSize: rf(13), fontWeight: '800', color: '#065F46' },
  rejectBtn:      { flex: 1, backgroundColor: '#FEE2E2', borderRadius: rs(12), paddingVertical: rs(13), alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' },
  rejectBtnTxt:   { fontSize: rf(13), fontWeight: '800', color: '#B91C1C' },
  btnDisabled:    { opacity: 0.55 },
  decidedBox:     { backgroundColor: '#DCFCE7', borderRadius: rs(10), paddingVertical: rs(10), alignItems: 'center' },
  decidedTxt:     { fontSize: rf(13), fontWeight: '700', color: '#065F46' },
});
