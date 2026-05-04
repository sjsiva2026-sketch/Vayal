// src/farmer/screens/BookingHistory.js
// Swipe LEFT on any card to reveal red Delete button
// Delete disabled if: status == 'completed' | 'ongoing' | paymentStatus == 'paid'

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  FlatList, TouchableOpacity, Alert,
  ScrollView, Animated,
} from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { doc, deleteDoc }                    from 'firebase/firestore';
import { db }                                from '../../../firebase/config';
import { listenBookingsByFarmer, cancelBooking } from '../../../firebase/firestore';
import { useUser }          from '../../../context/UserContext';
import { getCategoryLabel } from '../../../constants/categories';
import PhoneConnect         from '../../common/components/PhoneConnect';
import EmptyState           from '../../common/components/EmptyState';
import Loader               from '../../common/components/Loader';
import { COLORS }           from '../../../constants/colors';
import { rs, rf, RADIUS, H_PAD } from '../../../utils/responsive';

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',       label: 'ALL'       },
  { key: 'pending',   label: 'PENDING'   },
  { key: 'accepted',  label: 'ACCEPTED'  },
  { key: 'ongoing',   label: 'ONGOING'   },
  { key: 'completed', label: 'DONE'      },
  { key: 'cancelled', label: 'CANCELLED' },
  { key: 'rejected',  label: 'REJECTED'  },
];

// ── Status colours ────────────────────────────────────────────────────────────
const STATUS = {
  pending:   { bg: '#FFF9E6', dot: '#F59E0B', text: '#92400E', label: 'PENDING'   },
  accepted:  { bg: '#ECFDF5', dot: '#22C55E', text: '#065F46', label: 'ACCEPTED'  },
  ongoing:   { bg: '#EFF6FF', dot: '#3B82F6', text: '#1D4ED8', label: 'ONGOING'   },
  completed: { bg: '#F0FDF4', dot: '#22C55E', text: '#166534', label: 'DONE'      },
  cancelled: { bg: '#F4F6F8', dot: '#9CA3AF', text: '#374151', label: 'CANCELLED' },
  rejected:  { bg: '#FEF2F2', dot: '#EF4444', text: '#991B1B', label: 'REJECTED'  },
};
const FB = { bg: '#F4F6F8', dot: '#ccc', text: '#555', label: '—' };

// ── Can delete? ───────────────────────────────────────────────────────────────
function canDelete(item, farmerId) {
  if (item.farmerId !== farmerId)         return false; // only own bookings
  if (item.status === 'completed')        return false; // job done — keep record
  if (item.status === 'ongoing')          return false; // work in progress
  if (item.paymentStatus === 'paid')      return false; // commission paid
  return true;
}

// ── Animated delete panel ─────────────────────────────────────────────────────
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

// ── Single booking card ───────────────────────────────────────────────────────
function BookingCard({
  item, farmerId, expanded, onToggle,
  onDeleted, onCancel, cancelling,
  openSwipeRef, navigation,
}) {
  const swipeRef   = useRef(null);
  const st         = STATUS[item.status] || FB;
  const isExpanded = expanded === item.id;
  const deletable  = canDelete(item, farmerId);
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

  const canCancel = item.status === 'pending';
  const canRate   = item.status === 'completed' && !item.rated;

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      rightThreshold={rs(40)}
      renderRightActions={renderRight}
      overshootRight={false}
      onSwipeableOpen={() => {
        if (openSwipeRef.current && openSwipeRef.current !== swipeRef.current) {
          openSwipeRef.current.close();
        }
        openSwipeRef.current = swipeRef.current;
      }}
    >
      <View style={[s.card, { borderLeftColor: st.dot }]}>

        {/* Tappable card header */}
        <TouchableOpacity
          style={s.cardTouch}
          onPress={() => onToggle(item.id)}
          activeOpacity={0.85}
        >
          <View style={s.cardTop}>
            <Text style={s.machineType} numberOfLines={1}>🚜 {displayType}</Text>
            <View style={s.badgeRow}>
              {canRate && <View style={s.rateDot} />}
              <View style={[s.badge, { backgroundColor: st.bg }]}>
                <View style={[s.dot, { backgroundColor: st.dot }]} />
                <Text style={[s.badgeTxt, { color: st.text }]}>{st.label}</Text>
              </View>
            </View>
          </View>

          <Text style={s.meta}>📅 {item.date}  ·  ⏰ {item.timeSlot}</Text>
          <Text style={s.meta}>🌾 {item.hectareRequested} ha requested</Text>
          {item.ownerName ? <Text style={s.meta}>👤 {item.ownerName}</Text> : null}

          <View style={s.hintRow}>
            <Text style={s.hint}>{isExpanded ? '▲ Collapse' : '▼ Details & Actions'}</Text>
            {deletable && <Text style={s.swipeHint}>← Swipe to delete</Text>}
          </View>
        </TouchableOpacity>

        {/* Expanded detail section */}
        {isExpanded && (
          <View style={s.expanded}>

            {(item.status === 'accepted' || item.status === 'ongoing') && (
              <View style={s.otpBox}>
                <Text style={s.otpLabel}>🔐 Your OTP — Give to Owner at the field</Text>
                <Text style={s.otpValue}>{item.otp}</Text>
                <Text style={s.otpWarn}>⚠️ Keep safe — do not share with others</Text>
              </View>
            )}

            {item.status === 'completed' && (
              <View style={s.doneBox}>
                <Text style={s.doneTxt}>✅ Work Done: {item.hectareCompleted} ha</Text>
                {item.commission ? <Text style={s.doneTxt}>💰 Commission: Rs.{item.commission}</Text> : null}
              </View>
            )}

            {canRate && (
              <TouchableOpacity
                style={s.rateBtn}
                onPress={() => navigation.navigate('RatingScreen', { booking: item })}
                activeOpacity={0.85}
              >
                <Text style={s.rateBtnTxt}>⭐ Rate Your Experience</Text>
                <Text style={s.rateBtnSub}>Help other farmers — share your feedback</Text>
              </TouchableOpacity>
            )}

            {item.status === 'completed' && item.rated && (
              <View style={s.ratedBox}><Text style={s.ratedTxt}>✅ Already rated</Text></View>
            )}
            {item.status === 'cancelled' && (
              <View style={s.cancelledBox}><Text style={s.cancelledTxt}>🚫 You cancelled this booking.</Text></View>
            )}
            {item.status === 'rejected' && (
              <View style={s.rejBox}><Text style={s.rejTxt}>❌ Booking rejected by owner.</Text></View>
            )}

            {item.ownerPhone && !['cancelled', 'rejected'].includes(item.status) && (
              <PhoneConnect phone={item.ownerPhone} name={item.ownerName || 'Owner'} role="Machine Owner 🚜" />
            )}

            {canCancel && (
              <TouchableOpacity
                style={[s.cancelBtn, cancelling === item.id && s.btnDim]}
                onPress={() => onCancel(item)}
                disabled={cancelling === item.id}
                activeOpacity={0.85}
              >
                <Text style={s.cancelBtnTxt}>
                  {cancelling === item.id ? '⏳ Cancelling…' : '🚫 Cancel Booking'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Swipeable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function BookingHistory({ navigation }) {
  const { userProfile }               = useUser();
  const uid                           = userProfile?.id || '';
  const [allBookings, setAllBookings] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState(null);
  const [activeTab,   setActiveTab]   = useState('all');
  const [cancelling,  setCancelling]  = useState(null);
  const alive        = useRef(true);
  const openSwipeRef = useRef(null);

  useEffect(() => () => { alive.current = false; }, []);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const unsub = listenBookingsByFarmer(uid, (data) => {
      if (!alive.current) return;
      setAllBookings(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const handleDeleted = useCallback((id) => {
    setAllBookings(prev => prev.filter(b => b.id !== id));
    if (expanded === id) setExpanded(null);
  }, [expanded]);

  const handleCancel = useCallback((item) => {
    Alert.alert('Cancel Booking?', `Cancel booking for ${item.machineTypeLabel || getCategoryLabel(item.machineType)} on ${item.date}?`, [
      { text: 'Keep Booking', style: 'cancel' },
      { text: 'Yes, Cancel',  style: 'destructive', onPress: async () => {
          setCancelling(item.id);
          try { await cancelBooking(item.id); }
          catch (e) { Alert.alert('Error', e.message || 'Could not cancel.'); }
          finally { if (alive.current) setCancelling(null); }
        },
      },
    ]);
  }, []);

  const bookings = activeTab === 'all' ? allBookings : allBookings.filter(b => b.status === activeTab);
  const count    = (k) => k === 'all' ? allBookings.length : allBookings.filter(b => b.status === k).length;

  if (loading) return <Loader />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={s.safe}>

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.tabBar}
          contentContainerStyle={s.tabBarContent}
        >
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

        {/* Booking list */}
        <FlatList
          data={bookings}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: H_PAD, paddingBottom: rs(40), flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              icon="📋"
              title={activeTab === 'all' ? 'No Bookings Yet' : `No ${activeTab.toUpperCase()} Bookings`}
              subtitle={activeTab === 'all' ? 'Book a machine to get started' : 'Switch to ALL tab'}
            />
          }
          renderItem={({ item }) => (
            <BookingCard
              key={item.id}
              item={item}
              farmerId={uid}
              expanded={expanded}
              onToggle={(id) => setExpanded(prev => prev === id ? null : id)}
              onDeleted={handleDeleted}
              onCancel={handleCancel}
              cancelling={cancelling}
              openSwipeRef={openSwipeRef}
              navigation={navigation}
            />
          )}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ── Delete action styles ──────────────────────────────────────────────────────
const sa = StyleSheet.create({
  actionWrap: {
    width: rs(80), justifyContent: 'center', alignItems: 'center',
    marginBottom: rs(12), borderRadius: rs(16), overflow: 'hidden',
  },
  deleteBtn: {
    flex: 1, width: '100%', backgroundColor: '#EF4444',
    justifyContent: 'center', alignItems: 'center', borderRadius: rs(16),
  },
  trashIcon: { fontSize: rf(22), marginBottom: rs(2) },
  deleteTxt: { fontSize: rf(12), fontWeight: '800', color: '#fff' },
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

  card:        { backgroundColor: '#fff', borderRadius: RADIUS.lg, marginBottom: rs(12), elevation: 3, overflow: 'hidden', borderLeftWidth: rs(4) },
  cardTouch:   { padding: rs(14) },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(6) },
  machineType: { fontSize: rf(15), fontWeight: '800', color: '#111827', flex: 1, marginRight: rs(8) },
  badgeRow:    { flexDirection: 'row', alignItems: 'center', gap: rs(6) },
  rateDot:     { width: rs(8), height: rs(8), borderRadius: rs(4), backgroundColor: '#F59E0B' },
  badge:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(10), paddingVertical: rs(5), borderRadius: rs(20) },
  dot:         { width: rs(7), height: rs(7), borderRadius: rs(4), marginRight: rs(5) },
  badgeTxt:    { fontSize: rf(10), fontWeight: '800' },
  meta:        { fontSize: rf(13), color: '#6B7280', marginTop: rs(3) },
  hintRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: rs(8) },
  hint:        { fontSize: rf(11), color: '#9CA3AF' },
  swipeHint:   { fontSize: rf(11), color: '#EF4444', fontWeight: '600' },

  expanded:    { borderTopWidth: 1, borderTopColor: '#F0F0F0', padding: rs(14) },
  otpBox:      { backgroundColor: '#1C7C54', borderRadius: RADIUS.md, padding: rs(16), alignItems: 'center', marginBottom: rs(12) },
  otpLabel:    { fontSize: rf(12), color: 'rgba(255,255,255,0.75)', marginBottom: rs(8), textAlign: 'center' },
  otpValue:    { fontSize: rf(34), fontWeight: '900', color: '#fff', letterSpacing: rs(10), marginBottom: rs(8) },
  otpWarn:     { fontSize: rf(11), color: 'rgba(255,255,255,0.65)', textAlign: 'center' },
  doneBox:     { backgroundColor: '#ECFDF5', borderRadius: RADIUS.sm, padding: rs(12), marginBottom: rs(12) },
  doneTxt:     { fontSize: rf(14), fontWeight: '600', color: '#065F46', marginBottom: rs(2) },
  rateBtn:     { backgroundColor: '#FFF9E6', borderWidth: rs(1.5), borderColor: '#F59E0B', borderRadius: RADIUS.md, padding: rs(16), alignItems: 'center', marginBottom: rs(10) },
  rateBtnTxt:  { fontSize: rf(15), fontWeight: '800', color: '#92400E' },
  rateBtnSub:  { fontSize: rf(12), color: '#B45309', marginTop: rs(4) },
  ratedBox:    { backgroundColor: '#ECFDF5', borderRadius: RADIUS.sm, padding: rs(12), marginBottom: rs(10), alignItems: 'center' },
  ratedTxt:    { fontSize: rf(13), fontWeight: '600', color: '#065F46' },
  cancelledBox:{ backgroundColor: '#F4F6F8', borderRadius: RADIUS.sm, padding: rs(12), marginBottom: rs(12) },
  cancelledTxt:{ fontSize: rf(13), fontWeight: '600', color: '#374151', textAlign: 'center' },
  rejBox:      { backgroundColor: '#FEF2F2', borderRadius: RADIUS.sm, padding: rs(12), marginBottom: rs(12) },
  rejTxt:      { fontSize: rf(13), fontWeight: '600', color: '#991B1B', textAlign: 'center' },
  cancelBtn:   { backgroundColor: '#EF4444', borderRadius: RADIUS.md, paddingVertical: rs(14), alignItems: 'center', marginTop: rs(10) },
  btnDim:      { opacity: 0.5 },
  cancelBtnTxt:{ color: '#fff', fontSize: rf(15), fontWeight: '800' },
});
