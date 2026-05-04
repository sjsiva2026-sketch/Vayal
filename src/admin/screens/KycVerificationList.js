// src/admin/screens/KycVerificationList.js
// Admin views submitted KYC documents and approves / rejects

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert, StatusBar, Image, Linking, TextInput,
} from 'react-native';
import { useFocusEffect }             from '@react-navigation/native';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db }                         from '../../../firebase/config';
import { adminApproveKyc, adminRejectKyc } from '../../../firebase/kyc';
import { COLORS }                     from '../../../constants/colors';
import { rs, rf, H_PAD }              from '../../../utils/responsive';
import Loader                         from '../../common/components/Loader';

const KYC_STATUS = {
  not_submitted: { bg: '#F3F4F6', color: '#374151', label: 'Not Submitted' },
  pending:       { bg: '#FFF3CD', color: '#92400E', label: 'Pending Review' },
  verified:      { bg: '#DCFCE7', color: '#065F46', label: 'Verified ✅'   },
  rejected:      { bg: '#FEE2E2', color: '#B91C1C', label: 'Rejected ❌'   },
};

export default function KycVerificationList() {
  const [owners,   setOwners]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('pending');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'owner')));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.kycSubmittedAt?.seconds || 0) - (a.kycSubmittedAt?.seconds || 0));
      setOwners(list);
    } catch (e) { console.warn('KycList:', e.message); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleApprove = (owner) => {
    Alert.alert(
      'Approve KYC?',
      `Approve and grant full access to ${owner.name || 'this owner'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve & Unlock', onPress: async () => {
            try {
              await adminApproveKyc(owner.id);
              Alert.alert('Approved!', `${owner.name || 'Owner'} can now use the app.`);
              load();
            } catch (e) { Alert.alert('Error', e.message); }
          },
        },
      ]
    );
  };

  const handleReject = (owner) => {
    Alert.prompt(
      'Reject KYC',
      'Enter reason for rejection (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: async (reason) => {
            try {
              await adminRejectKyc(owner.id, reason || '');
              Alert.alert('Rejected', 'Owner has been notified to resubmit.');
              load();
            } catch (e) { Alert.alert('Error', e.message); }
          },
        },
      ],
      'plain-text'
    );
  };

  const filtered = filter === 'all'
    ? owners
    : owners.filter(o => (o.kycStatus || 'not_submitted') === filter);

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

      {/* Filter tabs */}
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
            <Text style={s.emptyTxt}>No {filter === 'all' ? '' : filter} KYC submissions</Text>
          </View>
        }
        renderItem={({ item }) => {
          const ks         = item.kycStatus || 'not_submitted';
          const cfg        = KYC_STATUS[ks] || KYC_STATUS.not_submitted;
          const isExpanded = expanded === item.id;
          const isPending  = ks === 'pending';

          return (
            <View style={s.card}>
              {/* Card header */}
              <TouchableOpacity
                style={s.cardTouch}
                onPress={() => setExpanded(isExpanded ? null : item.id)}
                activeOpacity={0.85}
              >
                <View style={s.cardTop}>
                  {/* Profile photo thumbnail */}
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
                    {item.vehicleNumber && (
                      <Text style={s.vehicleNum}>🚜 {item.vehicleNumber}</Text>
                    )}
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.statusTxt, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                <Text style={s.hint}>{isExpanded ? '▲ Collapse' : '▼ View Documents & Actions'}</Text>
              </TouchableOpacity>

              {/* Expanded: documents + action buttons */}
              {isExpanded && (
                <View style={s.expanded}>

                  {/* Document thumbnails */}
                  <Text style={s.docsTitle}>Submitted Documents</Text>
                  <View style={s.docsRow}>
                    {[
                      { label: 'Profile Photo', url: item.profilePhotoUrl },
                      { label: 'License',        url: item.licenseUrl      },
                      { label: 'Aadhar',         url: item.aadharUrl       },
                    ].map(doc => (
                      <TouchableOpacity
                        key={doc.label}
                        style={s.docThumb}
                        onPress={() => doc.url
                          ? Linking.openURL(doc.url).catch(() => Alert.alert('Error', 'Cannot open image'))
                          : Alert.alert('Not Uploaded', `${doc.label} not submitted yet`)
                        }
                        activeOpacity={0.85}
                      >
                        {doc.url ? (
                          <Image source={{ uri: doc.url }} style={s.docImg} resizeMode="cover" />
                        ) : (
                          <View style={s.docImgEmpty}><Text style={s.docImgEmptyTxt}>—</Text></View>
                        )}
                        <Text style={s.docLabel}>{doc.label}</Text>
                        {doc.url && <Text style={s.docView}>Tap to view</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Reject reason */}
                  {ks === 'rejected' && item.kycRejectReason ? (
                    <View style={s.rejectReasonBox}>
                      <Text style={s.rejectReasonLabel}>Reject reason:</Text>
                      <Text style={s.rejectReasonTxt}>{item.kycRejectReason}</Text>
                    </View>
                  ) : null}

                  {/* Admin action buttons — only for pending */}
                  {isPending && (
                    <View style={s.actionRow}>
                      <TouchableOpacity style={s.approveBtn} onPress={() => handleApprove(item)} activeOpacity={0.88}>
                        <Text style={s.approveBtnTxt}>✅ Approve & Unlock</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.rejectBtn} onPress={() => handleReject(item)} activeOpacity={0.88}>
                        <Text style={s.rejectBtnTxt}>❌ Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Already decided */}
                  {ks === 'verified' && (
                    <View style={s.decidedBox}>
                      <Text style={s.decidedTxt}>✅ Approved — owner has full access</Text>
                    </View>
                  )}
                  {ks === 'rejected' && (
                    <View style={[s.decidedBox, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[s.decidedTxt, { color: '#B91C1C' }]}>❌ Rejected — waiting for owner to resubmit</Text>
                    </View>
                  )}
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
  safe:            { flex: 1, backgroundColor: '#F4F6F8' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: H_PAD, paddingVertical: rs(14), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle:     { fontSize: rf(20), fontWeight: '900', color: '#111827' },
  pendingPill:     { backgroundColor: '#FEE2E2', borderRadius: rs(12), paddingHorizontal: rs(12), paddingVertical: rs(4) },
  pendingTxt:      { fontSize: rf(12), color: '#B91C1C', fontWeight: '800' },
  tabRow:          { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingHorizontal: rs(10), paddingVertical: rs(8) },
  tab:             { paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(20), marginRight: rs(6), backgroundColor: '#F4F5F7' },
  tabActive:       { backgroundColor: COLORS.primary },
  tabTxt:          { fontSize: rf(12), fontWeight: '700', color: '#6B7280' },
  tabTxtActive:    { color: '#fff' },
  emptyBox:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: rs(60) },
  emptyIcon:       { fontSize: rf(40), marginBottom: rs(10) },
  emptyTxt:        { fontSize: rf(15), color: '#6B7280' },
  card:            { backgroundColor: '#fff', borderRadius: rs(16), marginBottom: rs(12), elevation: 2 },
  cardTouch:       { padding: rs(14) },
  cardTop:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: rs(8) },
  avatar:          { width: rs(52), height: rs(52), borderRadius: rs(26), marginRight: rs(12) },
  avatarFallback:  { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  ownerName:       { fontSize: rf(15), fontWeight: '800', color: '#111827', marginBottom: rs(2) },
  ownerPhone:      { fontSize: rf(13), color: '#6B7280', marginBottom: rs(2) },
  vehicleNum:      { fontSize: rf(12), color: COLORS.primary, fontWeight: '700' },
  statusBadge:     { borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(5), alignSelf: 'flex-start' },
  statusTxt:       { fontSize: rf(11), fontWeight: '800' },
  hint:            { fontSize: rf(11), color: '#9CA3AF', textAlign: 'center' },
  expanded:        { borderTopWidth: 1, borderTopColor: '#F0F0F0', padding: rs(14) },
  docsTitle:       { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(10) },
  docsRow:         { flexDirection: 'row', gap: rs(10), marginBottom: rs(14) },
  docThumb:        { flex: 1, alignItems: 'center' },
  docImg:          { width: '100%', height: rs(80), borderRadius: rs(10), marginBottom: rs(4), backgroundColor: '#F3F4F6' },
  docImgEmpty:     { width: '100%', height: rs(80), borderRadius: rs(10), backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: rs(4) },
  docImgEmptyTxt:  { fontSize: rf(18), color: '#9CA3AF' },
  docLabel:        { fontSize: rf(11), fontWeight: '700', color: '#374151', textAlign: 'center' },
  docView:         { fontSize: rf(10), color: COLORS.primary, fontWeight: '600', textAlign: 'center' },
  rejectReasonBox: { backgroundColor: '#FEF2F2', borderRadius: rs(10), padding: rs(12), marginBottom: rs(12) },
  rejectReasonLabel: { fontSize: rf(12), fontWeight: '700', color: '#B91C1C', marginBottom: rs(4) },
  rejectReasonTxt: { fontSize: rf(13), color: '#7F1D1D' },
  actionRow:       { flexDirection: 'row', gap: rs(10) },
  approveBtn:      { flex: 1, backgroundColor: '#DCFCE7', borderRadius: rs(10), paddingVertical: rs(13), alignItems: 'center', borderWidth: 1, borderColor: '#22C55E' },
  approveBtnTxt:   { fontSize: rf(14), fontWeight: '800', color: '#065F46' },
  rejectBtn:       { flex: 1, backgroundColor: '#FEE2E2', borderRadius: rs(10), paddingVertical: rs(13), alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' },
  rejectBtnTxt:    { fontSize: rf(14), fontWeight: '800', color: '#B91C1C' },
  decidedBox:      { backgroundColor: '#DCFCE7', borderRadius: rs(10), paddingVertical: rs(10), alignItems: 'center' },
  decidedTxt:      { fontSize: rf(13), fontWeight: '700', color: '#065F46' },
});
