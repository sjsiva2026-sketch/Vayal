// src/admin/screens/KycVerificationList.js
// FIXED: Alert.prompt → custom modal (Android-compatible)
// FIXED: adminApproveKyc properly sets all 3 fields

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert, StatusBar, Image, Linking,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect }                  from '@react-navigation/native';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db }                              from '../../../firebase/config';
import { adminApproveKyc, adminRejectKyc } from '../../../firebase/kyc';
import { COLORS }                          from '../../../constants/colors';
import { rs, rf, H_PAD }                   from '../../../utils/responsive';
import Loader                              from '../../common/components/Loader';

const KYC_STATUS = {
  not_submitted: { bg: '#F3F4F6', color: '#374151', label: 'Not Submitted' },
  pending:       { bg: '#FFF3CD', color: '#92400E', label: 'Pending Review' },
  verified:      { bg: '#DCFCE7', color: '#065F46', label: 'Verified ✅' },
  rejected:      { bg: '#FEE2E2', color: '#B91C1C', label: 'Rejected ❌' },
};

// ── Reject reason modal (Alert.prompt Android-ல் work ஆகாது) ─────────────
function RejectModal({ visible, ownerName, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={rm.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={rm.box}>
          <Text style={rm.title}>Reject KYC</Text>
          <Text style={rm.sub}>Enter reason for {ownerName || 'this owner'}:</Text>
          <TextInput
            style={rm.input}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Blurry documents, wrong info..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            autoFocus
          />
          <View style={rm.btnRow}>
            <TouchableOpacity
              style={rm.cancelBtn}
              onPress={() => { setReason(''); onCancel(); }}
              activeOpacity={0.8}
            >
              <Text style={rm.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={rm.rejectBtn}
              onPress={() => { onConfirm(reason); setReason(''); }}
              activeOpacity={0.88}
            >
              <Text style={rm.rejectTxt}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const rm = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: rs(24) },
  box:       { backgroundColor: '#fff', borderRadius: rs(18), padding: rs(20), width: '100%' },
  title:     { fontSize: rf(17), fontWeight: '900', color: '#111827', marginBottom: rs(6) },
  sub:       { fontSize: rf(13), color: '#6B7280', marginBottom: rs(14) },
  input:     { backgroundColor: '#F9FAFB', borderWidth: rs(1.5), borderColor: '#E5E7EB', borderRadius: rs(12), padding: rs(12), fontSize: rf(14), color: '#111827', minHeight: rs(80), marginBottom: rs(16) },
  btnRow:    { flexDirection: 'row', gap: rs(10) },
  cancelBtn: { flex: 1, backgroundColor: '#F4F6F8', borderRadius: rs(10), paddingVertical: rs(13), alignItems: 'center' },
  cancelTxt: { fontSize: rf(14), fontWeight: '700', color: '#374151' },
  rejectBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: rs(10), paddingVertical: rs(13), alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' },
  rejectTxt: { fontSize: rf(14), fontWeight: '800', color: '#B91C1C' },
});

// ── Main Screen ────────────────────────────────────────────────────────────
export default function KycVerificationList() {
  const [owners,      setOwners]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('pending');
  const [expanded,    setExpanded]    = useState(null);
  const [rejectModal, setRejectModal] = useState({ visible: false, owner: null });
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'owner')));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.kycSubmittedAt?.seconds || 0) - (a.kycSubmittedAt?.seconds || 0));
      setOwners(list);
    } catch (e) {
      console.warn('KycList:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── APPROVE ───────────────────────────────────────────────────────────────
  const handleApprove = (owner) => {
    Alert.alert(
      '✅ Approve KYC?',
      `Grant full app access to ${owner.name || 'this owner'}?\n\nThis sets:\n• kycStatus = verified\n• isVerified = true\n• accessGranted = true`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Unlock',
          onPress: async () => {
            setActionLoading(owner.id);
            try {
              await adminApproveKyc(owner.id);
              // Reload list to reflect change
              await load();
              Alert.alert('✅ Approved!', `${owner.name || 'Owner'} can now use the full app.`);
            } catch (e) {
              Alert.alert('Error', e.message || 'Could not approve. Try again.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  // ── REJECT ────────────────────────────────────────────────────────────────
  const handleRejectConfirm = async (reason) => {
    const owner = rejectModal.owner;
    setRejectModal({ visible: false, owner: null });
    if (!owner) return;
    setActionLoading(owner.id);
    try {
      await adminRejectKyc(owner.id, reason);
      await load();
      Alert.alert('Done', 'Owner notified to resubmit documents.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not reject. Try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered     = filter === 'all' ? owners : owners.filter(o => (o.kycStatus || 'not_submitted') === filter);
  const pendingCount = owners.filter(o => o.kycStatus === 'pending').length;

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>KYC Verification</Text>
        {pendingCount > 0 && (
          <View style={s.pendingPill}>
            <Text style={s.pendingTxt}>{pendingCount} pending</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {[
          { key: 'pending',  label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          { key: 'verified', label: 'Verified' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'all',      label: 'All' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, filter === tab.key && s.tabActive]}
            onPress={() => { setFilter(tab.key); setExpanded(null); }}
            activeOpacity={0.8}
          >
            <Text style={[s.tabTxt, filter === tab.key && s.tabTxtActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: H_PAD, paddingBottom: rs(40), flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>🪪</Text>
            <Text style={s.emptyTxt}>No {filter === 'all' ? '' : filter} submissions</Text>
          </View>
        }
        renderItem={({ item }) => {
          const ks         = item.kycStatus || 'not_submitted';
          const cfg        = KYC_STATUS[ks] || KYC_STATUS.not_submitted;
          const isExpanded = expanded === item.id;
          const isPending  = ks === 'pending';
          const isActioning = actionLoading === item.id;

          return (
            <View style={s.card}>
              <TouchableOpacity
                style={s.cardTouch}
                onPress={() => setExpanded(isExpanded ? null : item.id)}
                activeOpacity={0.85}
              >
                <View style={s.cardTop}>
                  {item.profilePhotoUrl ? (
                    <Image source={{ uri: item.profilePhotoUrl }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, s.avatarFallback]}>
                      <Text style={{ fontSize: rf(22) }}>👤</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.ownerName}>{item.name || 'No Name'}</Text>
                    <Text style={s.ownerPhone}>📞 +91 {item.phone || '—'}</Text>
                    {item.vehicleNumber && <Text style={s.vehicleNum}>🚜 {item.vehicleNumber}</Text>}
                  </View>
                  <View style={[s.badge, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                <Text style={s.hint}>{isExpanded ? '▲ Collapse' : '▼ View Documents & Actions'}</Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={s.expanded}>

                  {/* Documents */}
                  <Text style={s.docsTitle}>Documents</Text>
                  <View style={s.docsRow}>
                    {[
                      { label: 'Profile',  url: item.profilePhotoUrl },
                      { label: 'License',  url: item.licenseUrl      },
                      { label: 'Aadhar',   url: item.aadharUrl       },
                      { label: 'Vehicle',  url: item.vehicleImageUrl },
                    ].map(doc => (
                      <TouchableOpacity
                        key={doc.label}
                        style={s.docThumb}
                        onPress={() => doc.url
                          ? Linking.openURL(doc.url).catch(() => {})
                          : null
                        }
                        activeOpacity={0.85}
                      >
                        {doc.url ? (
                          <Image source={{ uri: doc.url }} style={s.docImg} resizeMode="cover" />
                        ) : (
                          <View style={s.docImgEmpty}>
                            <Text style={{ fontSize: rf(18), color: '#9CA3AF' }}>—</Text>
                          </View>
                        )}
                        <Text style={s.docLabel}>{doc.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Reject reason */}
                  {ks === 'rejected' && item.kycRejectReason ? (
                    <View style={s.reasonBox}>
                      <Text style={s.reasonLabel}>Reject reason:</Text>
                      <Text style={s.reasonTxt}>{item.kycRejectReason}</Text>
                    </View>
                  ) : null}

                  {/* Action buttons */}
                  {isPending && (
                    <View style={s.actionRow}>
                      <TouchableOpacity
                        style={[s.approveBtn, isActioning && { opacity: 0.6 }]}
                        onPress={() => !isActioning && handleApprove(item)}
                        activeOpacity={0.88}
                      >
                        <Text style={s.approveBtnTxt}>
                          {isActioning ? 'Processing...' : '✅ Approve & Unlock'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.rejectBtn, isActioning && { opacity: 0.6 }]}
                        onPress={() => !isActioning && setRejectModal({ visible: true, owner: item })}
                        activeOpacity={0.88}
                      >
                        <Text style={s.rejectBtnTxt}>❌ Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {ks === 'verified' && (
                    <View style={s.decidedBox}>
                      <Text style={s.decidedTxt}>✅ Approved — owner has full access</Text>
                    </View>
                  )}
                  {ks === 'rejected' && (
                    <View style={[s.decidedBox, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[s.decidedTxt, { color: '#B91C1C' }]}>❌ Rejected — owner must resubmit</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Reject modal */}
      <RejectModal
        visible={rejectModal.visible}
        ownerName={rejectModal.owner?.name}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectModal({ visible: false, owner: null })}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#F4F6F8' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: H_PAD, paddingVertical: rs(14), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle:  { fontSize: rf(20), fontWeight: '900', color: '#111827' },
  pendingPill:  { backgroundColor: '#FEE2E2', borderRadius: rs(12), paddingHorizontal: rs(12), paddingVertical: rs(4) },
  pendingTxt:   { fontSize: rf(12), color: '#B91C1C', fontWeight: '800' },
  tabRow:       { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingHorizontal: rs(10), paddingVertical: rs(8) },
  tab:          { paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(20), marginRight: rs(6), backgroundColor: '#F4F5F7' },
  tabActive:    { backgroundColor: COLORS.primary },
  tabTxt:       { fontSize: rf(12), fontWeight: '700', color: '#6B7280' },
  tabTxtActive: { color: '#fff' },
  emptyBox:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: rs(60) },
  emptyIcon:    { fontSize: rf(40), marginBottom: rs(10) },
  emptyTxt:     { fontSize: rf(15), color: '#6B7280' },
  card:         { backgroundColor: '#fff', borderRadius: rs(16), marginBottom: rs(12), elevation: 2 },
  cardTouch:    { padding: rs(14) },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: rs(8) },
  avatar:       { width: rs(52), height: rs(52), borderRadius: rs(26), marginRight: rs(12) },
  avatarFallback: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  ownerName:    { fontSize: rf(15), fontWeight: '800', color: '#111827', marginBottom: rs(2) },
  ownerPhone:   { fontSize: rf(13), color: '#6B7280', marginBottom: rs(2) },
  vehicleNum:   { fontSize: rf(12), color: COLORS.primary, fontWeight: '700' },
  badge:        { borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(5), alignSelf: 'flex-start' },
  badgeTxt:     { fontSize: rf(11), fontWeight: '800' },
  hint:         { fontSize: rf(11), color: '#9CA3AF', textAlign: 'center' },
  expanded:     { borderTopWidth: 1, borderTopColor: '#F0F0F0', padding: rs(14) },
  docsTitle:    { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(10) },
  docsRow:      { flexDirection: 'row', gap: rs(8), marginBottom: rs(14) },
  docThumb:     { flex: 1, alignItems: 'center' },
  docImg:       { width: '100%', height: rs(72), borderRadius: rs(8), marginBottom: rs(4), backgroundColor: '#F3F4F6' },
  docImgEmpty:  { width: '100%', height: rs(72), borderRadius: rs(8), backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: rs(4) },
  docLabel:     { fontSize: rf(10), fontWeight: '600', color: '#374151', textAlign: 'center' },
  reasonBox:    { backgroundColor: '#FEF2F2', borderRadius: rs(10), padding: rs(12), marginBottom: rs(12) },
  reasonLabel:  { fontSize: rf(12), fontWeight: '700', color: '#B91C1C', marginBottom: rs(4) },
  reasonTxt:    { fontSize: rf(13), color: '#7F1D1D' },
  actionRow:    { flexDirection: 'row', gap: rs(10) },
  approveBtn:   { flex: 1, backgroundColor: '#DCFCE7', borderRadius: rs(10), paddingVertical: rs(13), alignItems: 'center', borderWidth: 1, borderColor: '#22C55E' },
  approveBtnTxt:{ fontSize: rf(13), fontWeight: '800', color: '#065F46' },
  rejectBtn:    { flex: 1, backgroundColor: '#FEE2E2', borderRadius: rs(10), paddingVertical: rs(13), alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' },
  rejectBtnTxt: { fontSize: rf(13), fontWeight: '800', color: '#B91C1C' },
  decidedBox:   { backgroundColor: '#DCFCE7', borderRadius: rs(10), paddingVertical: rs(10), alignItems: 'center' },
  decidedTxt:   { fontSize: rf(13), fontWeight: '700', color: '#065F46' },
});
