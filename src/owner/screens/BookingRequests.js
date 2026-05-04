// src/owner/screens/BookingRequests.js
// Swipe LEFT on any card to reveal red Delete button
// Delete disabled if: status == 'completed' | 'ongoing' | paymentStatus == 'paid'

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  FlatList, TouchableOpacity, Alert,
  RefreshControl, ScrollView, Animated,
} from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { doc, deleteDoc }                    from 'firebase/firestore';
import { db }                                from '../../../firebase/config';
import { listenBookingsByOwner, updateBooking, getUser } from '../../../firebase/firestore';
import { useUser }          from '../../../context/UserContext';
import { getCategoryLabel } from '../../../constants/categories';
import PhoneConnect         from '../../common/components/PhoneConnect';
import Loader               from '../../common/components/Loader';
import { COLORS }           from '../../../constants/colors';
import { rs, rf }           from '../../../utils/responsive';

// ── Filter tabs ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',       label: 'ALL'      },
  { key: 'pending',   label: 'PENDING'  },
  { key: 'accepted',  label: 'ACCEPTED' },
  { key: 'ongoing',   label: 'ONGOING'  },
  { key: 'completed', label: 'DONE'     },
  { key: 'rejected',  label: 'REJECTED' },
];

// ── Status colours ────────────────────────────────────────────────────────────
const STATUS = {
  pending:   { bg: '#FFF9E6', dot: '#F59E0B', text: '#92400E', label: 'PENDING'  },
  accepted:  { bg: '#ECFDF5', dot: '#22C55E', text: '#065F46', label: 'ACCEPTED' },
  ongoing:   { bg: '#EFF6FF', dot: '#3B82F6', text: '#1D4ED8', label: 'ONGOING'  },
  completed: { bg: '#F0FDF4', dot: '#22C55E', text: '#166534', label: 'DONE'     },
  rejected:  { bg: '#FEF2F2', dot: '#EF4444', text: '#991B1B', label: 'REJECTED' },
};
const FB = { bg: '#F4F6F8', dot: '#9CA3AF', text: '#374151', label: '—' };

// ── Can this booking be deleted? ──────────────────────────────────────────────
function canDelete(item, ownerId) {
  if (item.ownerId !== ownerId)           return false; // only own bookings
  if (item.status === 'completed')        return false; // job done
  if (item.status === 'ongoing')          return false; // work in progress
  if (item.paymentStatus === 'paid')      return false; // commission paid
  return true;
}

// ── Swipeable delete action panel ─────────────────────────────────────────────
function DeleteAction({ progress, onPress }) {
  const trans = progress.interpolate({
    inputRange: [0, 1], outputRange: [rs(88), 0], extrapolate: 'clamp',
  });
  return (
    <Animated.View style={[sa.actionWrap, { transform: [{ translateX: trans }] }]}>
      <TouchableOpacity style={sa.deleteBtn} onPress={onPress} activeOpacity={0.82}>
        <Text style={sa.trashIcon}>🗑</Text>
        <Text style={sa.deleteTxt}>Delete</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Single swipeable booking card ─────────────────────────────────────────────
function BookingCard({ item, ownerId, expanded, onToggle, onDeleted, onAccept, onReject, navigation, actioning, openSwipeRef }) {
  const swipeRef  = useRef(null);
  const st        = STATUS[item.status] || FB;
  const isExpanded = expanded === item.id;
  const deletable  = canDelete(item, ownerId);
  const displayType = item.machineTypeLabel || getCategoryLabel(item.machineType);

  const closeSwipe = () => swipeRef.current?.close();

  const handleDelete = () => {
    Alert.alert(
      'Delete Booking',
      'Are you sure you want to delete this booking?',
      [
        { text: 'No',         style: 'cancel',      onPress: closeSwipe },
        { text: 'Yes, Delete',style: 'destructive', onPress: async () => {
            try {
              await deleteDoc(doc(db, 'bookings', item.id));
              onDeleted(item.id);
            } catch (e) {
              Alert.alert('Error', e.message || 'Could not delete.');
            }
          },
        },
      ],
      { cancelable: true, onDismiss: closeSwipe }
    );
  };

  const renderRight = (progress) =>
    deletable ? <DeleteAction progress={progress} onPress={handleDelete} /> : null;

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      rightThreshold={rs(40)}
      renderRightActions={renderRight}
      overshootRight={false}
      onSwipeableOpen={() => {
        // close any previously open swipe
        if (openSwipeRef.current && openSwipeRef.current !== swipeRef.current) {
          openSwipeRef.current.close();
        }
        openSwipeRef.current = swipeRef.current;
      }}
    >
      <View style={[s.card, { borderLeftColor: st.dot }]}>

        {/* ── Tappable header ── */}
        <TouchableOpacity
          style={s.cardTouch}
          onPress={() => onToggle(item.id)}
          activeOpacity={0.85}
        >
          <View style={s.cardHeader}>
            <View style={[s.avatar, { backgroundColor: st.bg }]}>
              <Text style={s.avatarTxt}>👨‍🌾</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.farmerName} numberOfLines={1}>{item.farmerName || 'Farmer'}</Text>
              {item.farmerPhone
                ? <Text style={s.farmerPhone}>📞 +91 {item.farmerPhone}</Text>
                : null}
            </View>
            <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
              <View style={[s.statusDot, { backgroundColor: st.dot }]} />
              <Text style={[s.statusTxt, { color: st.text }]}>{st.label}</Text>
            </View>
          </View>

          <View style={s.chipsRow}>
            {[`🚜 ${displayType}`, `📅 ${item.date}`, `⏰ ${item.timeSlot}`, `🌾 ${item.hectareRequested} ha`].map(c => (
              <View key={c} style={s.chip}><Text style={s.chipTxt}>{c}</Text></View>
            ))}
          </View>

          <View style={s.hintRow}>
            <Text style={s.hint}>{isExpanded ? '▲ Collapse' : '▼ Actions & Contact'}</Text>
            {deletable && <Text style={s.swipeHint}>← Swipe to delete</Text>}
          </View>
        </TouchableOpacity>

        {/* ── Expanded section ── */}
        {isExpanded && (
          <View style={s.expanded}>
            {item.farmerPhone
              ? <PhoneConnect phone={item.farmerPhone} name={item.farmerName || 'Farmer'} role="Farmer 👨‍🌾" />
              : <View style={s.noPhone}><Text style={s.noPhoneTxt}>📵 Farmer phone not available</Text></View>
            }

            {item.status === 'pending' && (
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={[s.acceptBtn, actioning === item.id && s.btnDim]}
                  onPress={() => onAccept(item)}
                  disabled={actioning === item.id}
                  activeOpacity={0.85}
                >
                  <Text style={s.acceptTxt}>{actioning === item.id ? 'Processing…' : '✅  ACCEPT'}</Text>
                </TouchableOpacity>
                <View style={{ width: rs(10) }} />
                <TouchableOpacity
                  style={[s.rejectBtn, actioning === item.id && s.btnDim]}
                  onPress={() => onReject(item)}
                  disabled={actioning === item.id}
                  activeOpacity={0.85}
                >
                  <Text style={s.rejectTxt}>❌  REJECT</Text>
                </TouchableOpacity>
              </View>
            )}
            {item.status === 'accepted' && (
              <TouchableOpacity style={s.startBtn} onPress={() => navigation.navigate('WorkStartOTP', { booking: item })} activeOpacity={0.85}>
                <Text style={s.startTxt}>🔐  ENTER OTP & START WORK</Text>
              </TouchableOpacity>
            )}
            {item.status === 'ongoing' && (
              <TouchableOpacity style={s.ongoingBtn} onPress={() => navigation.navigate('WorkInProgress', { booking: item })} activeOpacity={0.85}>
                <Text style={s.ongoingTxt}>⚙️  WORK IN PROGRESS →</Text>
              </TouchableOpacity>
            )}
            {item.status === 'completed' && (
              <View style={s.doneBox}>
                <Text style={s.doneTxt}>✅ Work Done: {item.hectareCompleted || 0} ha · Commission: Rs.{item.commission || 0}</Text>
              </View>
            )}
            {item.status === 'rejected' && (
              <View style={s.rejBox}><Text style={s.rejTxt}>❌ Booking was rejected.</Text></View>
            )}
          </View>
        )}
      </View>
    </Swipeable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function BookingRequests({ navigation }) {
  const { userProfile }               = useUser();
  const uid                           = userProfile?.id || '';
  const [allBookings, setAllBookings] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [expanded,    setExpanded]    = useState(null);
  const [activeTab,   setActiveTab]   = useState('all');
  const [refreshing,  setRefreshing]  = useState(false);
  const [actioning,   setActioning]   = useState(null);
  const alive        = useRef(true);
  const openSwipeRef = useRef(null);   // tracks currently open swipe row

  useEffect(() => () => { alive.current = false; }, []);

  useEffect(() => {
    if (!uid) { setError('Not logged in.'); setLoading(false); return; }
    setLoading(true);
    const unsub = listenBookingsByOwner(uid, async (raw) => {
      try {
        const enriched = await Promise.all(raw.map(async b => {
          if (!b.farmerPhone && b.farmerId) {
            const f = await getUser(b.farmerId).catch(() => null);
            return { ...b, farmerPhone: f?.phone || '', farmerName: f?.name || b.farmerName || 'Farmer' };
          }
          return b;
        }));
        if (!alive.current) return;
        setAllBookings(enriched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        setError('');
      } catch (e) { if (alive.current) setError(e.message || 'Load error'); }
      finally     { if (alive.current) { setLoading(false); setRefreshing(false); } }
    }, (e) => {
      if (!alive.current) return;
      setError(e?.message || 'Connection error');
      setLoading(false); setRefreshing(false);
    });
    return unsub;
  }, [uid]);

  const handleDeleted = useCallback((id) => {
    setAllBookings(prev => prev.filter(b => b.id !== id));
    if (expanded === id) setExpanded(null);
  }, [expanded]);

  const handleAccept = (booking) => {
    Alert.alert('Accept Booking?', `Accept request from ${booking.farmerName || 'Farmer'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: async () => {
          setActioning(booking.id);
          try { await updateBooking(booking.id, { status: 'accepted' }); }
          catch (e) { Alert.alert('Error', e.message); }
          finally { if (alive.current) setActioning(null); }
        },
      },
    ]);
  };

  const handleReject = (booking) => {
    Alert.alert('Reject Booking?', `Reject request from ${booking.farmerName || 'Farmer'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
          setActioning(booking.id);
          try { await updateBooking(booking.id, { status: 'rejected' }); }
          catch (e) { Alert.alert('Error', e.message); }
          finally { if (alive.current) setActioning(null); }
        },
      },
    ]);
  };

  const bookings = activeTab === 'all' ? allBookings : allBookings.filter(b => b.status === activeTab);
  const count    = (k) => k === 'all' ? allBookings.length : allBookings.filter(b => b.status === k).length;

  if (loading) return <Loader />;
  if (error)   return (
    <SafeAreaView style={s.safe}>
      <View style={s.errBox}>
        <Text style={s.errIcon}>⚠️</Text>
        <Text style={s.errTitle}>Something went wrong</Text>
        <Text style={s.errMsg}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => { setLoading(true); setError(''); }}>
          <Text style={s.retryTxt}>Retry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={s.safe}>

        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
          {TABS.map(tab => {
            const n      = count(tab.key);
            const active = activeTab === tab.key;
            const dotCol = STATUS[tab.key]?.dot || COLORS.primary;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s.tab, active && { backgroundColor: dotCol, borderColor: dotCol }]}
                onPress={() => { setActiveTab(tab.key); setExpanded(null); openSwipeRef.current?.close(); }}
                activeOpacity={0.8}
              >
                <Text style={[s.tabTxt, active && s.tabTxtActive]}>{tab.label}</Text>
                {n > 0 && (
                  <View style={[s.tabBadge, active ? s.tabBadgeOn : { backgroundColor: dotCol }]}>
                    <Text style={s.tabBadgeTxt}>{n}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List */}
        <FlatList
          data={bookings}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: rs(14), paddingBottom: rs(40), flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>📭</Text>
              <Text style={s.emptyTitle}>{activeTab === 'all' ? 'No Bookings Yet' : `No ${activeTab.toUpperCase()} Bookings`}</Text>
              <Text style={s.emptySub}>{activeTab === 'all' ? 'Farmers will send requests here.' : 'Switch to ALL tab.'}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <BookingCard
              key={item.id}
              item={item}
              ownerId={uid}
              expanded={expanded}
              onToggle={(id) => setExpanded(prev => prev === id ? null : id)}
              onDeleted={handleDeleted}
              onAccept={handleAccept}
              onReject={handleReject}
              navigation={navigation}
              actioning={actioning}
              openSwipeRef={openSwipeRef}
            />
          )}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ── Shared delete action styles ───────────────────────────────────────────────
const sa = StyleSheet.create({
  actionWrap: {
    width: rs(80), justifyContent: 'center', alignItems: 'center',
    marginBottom: rs(12), borderRadius: rs(16), overflow: 'hidden',
  },
  deleteBtn: {
    flex: 1, width: '100%', backgroundColor: '#EF4444',
    justifyContent: 'center', alignItems: 'center', borderRadius: rs(16),
  },
  trashIcon:  { fontSize: rf(22), marginBottom: rs(2) },
  deleteTxt:  { fontSize: rf(12), fontWeight: '800', color: '#fff' },
});

// ── Screen styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F4F6F8' },
  tabBar:      { maxHeight: rs(52), borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: '#fff' },
  tabBarContent:{ paddingHorizontal: rs(12), paddingVertical: rs(8), alignItems: 'center' },
  tab:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(14), paddingVertical: rs(6), borderRadius: rs(20), borderWidth: rs(1.5), borderColor: '#E5E7EB', marginRight: rs(8), backgroundColor: '#fff' },
  tabTxt:      { fontSize: rf(11), fontWeight: '700', color: '#6B7280' },
  tabTxtActive:{ color: '#fff' },
  tabBadge:    { marginLeft: rs(5), minWidth: rs(18), height: rs(18), borderRadius: rs(9), alignItems: 'center', justifyContent: 'center', paddingHorizontal: rs(4) },
  tabBadgeOn:  { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeTxt: { fontSize: rf(10), fontWeight: '900', color: '#fff' },

  card:        { backgroundColor: '#fff', borderRadius: rs(16), marginBottom: rs(12), elevation: 3, overflow: 'hidden', borderLeftWidth: rs(4) },
  cardTouch:   { padding: rs(14) },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: rs(10) },
  avatar:      { width: rs(42), height: rs(42), borderRadius: rs(21), alignItems: 'center', justifyContent: 'center', marginRight: rs(10) },
  avatarTxt:   { fontSize: rf(20) },
  farmerName:  { fontSize: rf(15), fontWeight: '800', color: '#111827' },
  farmerPhone: { fontSize: rf(12), color: '#6B7280', marginTop: rs(2) },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(10), paddingVertical: rs(5), borderRadius: rs(20) },
  statusDot:   { width: rs(7), height: rs(7), borderRadius: rs(4), marginRight: rs(5) },
  statusTxt:   { fontSize: rf(11), fontWeight: '800' },
  chipsRow:    { flexDirection: 'row', flexWrap: 'wrap', marginBottom: rs(6) },
  chip:        { backgroundColor: '#F4F6F8', borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(4), marginRight: rs(6), marginBottom: rs(5) },
  chipTxt:     { fontSize: rf(12), color: '#374151', fontWeight: '600' },
  hintRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hint:        { fontSize: rf(11), color: '#9CA3AF' },
  swipeHint:   { fontSize: rf(11), color: '#EF4444', fontWeight: '600' },

  expanded:    { borderTopWidth: 1, borderTopColor: '#F0F0F0', padding: rs(14) },
  noPhone:     { backgroundColor: '#FFF9E6', borderRadius: rs(10), padding: rs(10), marginBottom: rs(10), alignItems: 'center' },
  noPhoneTxt:  { fontSize: rf(13), color: '#92400E' },

  actionRow:   { flexDirection: 'row', marginTop: rs(4) },
  acceptBtn:   { flex: 1, backgroundColor: '#1C7C54', borderRadius: rs(12), paddingVertical: rs(13), alignItems: 'center' },
  acceptTxt:   { color: '#fff', fontWeight: '800', fontSize: rf(14) },
  rejectBtn:   { flex: 1, backgroundColor: '#EF4444', borderRadius: rs(12), paddingVertical: rs(13), alignItems: 'center' },
  rejectTxt:   { color: '#fff', fontWeight: '800', fontSize: rf(14) },
  btnDim:      { opacity: 0.5 },
  startBtn:    { backgroundColor: '#1D4ED8', borderRadius: rs(12), paddingVertical: rs(13), alignItems: 'center', marginTop: rs(4) },
  startTxt:    { color: '#fff', fontWeight: '800', fontSize: rf(14) },
  ongoingBtn:  { backgroundColor: '#F59E0B', borderRadius: rs(12), paddingVertical: rs(13), alignItems: 'center', marginTop: rs(4) },
  ongoingTxt:  { color: '#fff', fontWeight: '800', fontSize: rf(14) },
  doneBox:     { backgroundColor: '#ECFDF5', borderRadius: rs(10), padding: rs(12), marginTop: rs(4) },
  doneTxt:     { fontSize: rf(13), fontWeight: '600', color: '#065F46', textAlign: 'center' },
  rejBox:      { backgroundColor: '#FEF2F2', borderRadius: rs(10), padding: rs(12), marginTop: rs(4) },
  rejTxt:      { fontSize: rf(13), fontWeight: '600', color: '#991B1B', textAlign: 'center' },

  errBox:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: rs(32) },
  errIcon:     { fontSize: rf(48), marginBottom: rs(12) },
  errTitle:    { fontSize: rf(18), fontWeight: '700', color: '#111827', marginBottom: rs(8) },
  errMsg:      { fontSize: rf(13), color: '#EF4444', textAlign: 'center', marginBottom: rs(20) },
  retryBtn:    { backgroundColor: '#1C7C54', borderRadius: rs(12), paddingHorizontal: rs(28), paddingVertical: rs(12) },
  retryTxt:    { color: '#fff', fontWeight: '700', fontSize: rf(15) },
  emptyBox:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: rs(40) },
  emptyIcon:   { fontSize: rf(48), marginBottom: rs(12) },
  emptyTitle:  { fontSize: rf(18), fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptySub:    { fontSize: rf(13), color: '#6B7280', textAlign: 'center', marginTop: rs(8) },
});
