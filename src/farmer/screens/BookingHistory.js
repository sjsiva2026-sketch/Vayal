import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  FlatList, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { listenBookingsByFarmer, cancelBooking } from '../../../firebase/firestore';
import { useUser }          from '../../../context/UserContext';
import { getCategoryLabel } from '../../../constants/categories';
import PhoneConnect         from '../../common/components/PhoneConnect';
import EmptyState           from '../../common/components/EmptyState';
import Loader               from '../../common/components/Loader';
import { COLORS }           from '../../../constants/colors';

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',       label: 'ALL'       },
  { key: 'pending',   label: 'PENDING'   },
  { key: 'accepted',  label: 'ACCEPTED'  },
  { key: 'ongoing',   label: 'ONGOING'   },
  { key: 'completed', label: 'DONE'      },
  { key: 'cancelled', label: 'CANCELLED' },
  { key: 'rejected',  label: 'REJECTED'  },
];

// ─── Status visual config ─────────────────────────────────────────────────────
const STATUS = {
  pending:   { bg: '#FFF9E6', border: '#F59E0B', dot: '#F59E0B', text: '#92400E', label: 'PENDING'   },
  accepted:  { bg: '#ECFDF5', border: '#1C7C54', dot: '#22C55E', text: '#065F46', label: 'ACCEPTED'  },
  ongoing:   { bg: '#EFF6FF', border: '#3B82F6', dot: '#3B82F6', text: '#1D4ED8', label: 'ONGOING'   },
  completed: { bg: '#F0FDF4', border: '#22C55E', dot: '#22C55E', text: '#166534', label: 'DONE'      },
  cancelled: { bg: '#F4F6F8', border: '#9CA3AF', dot: '#9CA3AF', text: '#374151', label: 'CANCELLED' },
  rejected:  { bg: '#FEF2F2', border: '#EF4444', dot: '#EF4444', text: '#991B1B', label: 'REJECTED'  },
};
const fallback = { bg: '#F4F6F8', border: '#ccc', dot: '#ccc', text: '#555', label: '—' };

export default function BookingHistory({ navigation }) {
  const { userProfile }               = useUser();
  const uid                           = userProfile?.id || '';
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState(null);
  const [activeTab, setActiveTab]     = useState('all');
  const [cancelling, setCancelling]   = useState(null);

  const alive = useRef(true);
  useEffect(() => { return () => { alive.current = false; }; }, []);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const unsub = listenBookingsByFarmer(uid, (data) => {
      if (!alive.current) return;
      setAllBookings(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  // ── Filter ────────────────────────────────────────────────────────────────
  const bookings = activeTab === 'all'
    ? allBookings
    : allBookings.filter(b => b.status === activeTab);

  const count = (key) => key === 'all'
    ? allBookings.length
    : allBookings.filter(b => b.status === key).length;

  // ── Cancel handler ────────────────────────────────────────────────────────
  const handleCancel = (item) => {
    Alert.alert(
      '🚫 Cancel Booking?',
      `Cancel your booking for ${item.machineTypeLabel || getCategoryLabel(item.machineType)} on ${item.date}?\n\nThis cannot be undone.`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(item.id);
            try {
              await cancelBooking(item.id);
            } catch (e) {
              Alert.alert('Error', e.message || 'Could not cancel. Please try again.');
            } finally {
              if (alive.current) setCancelling(null);
            }
          },
        },
      ]
    );
  };

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Filter Tab Bar ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabBar}
        contentContainerStyle={s.tabBarContent}
      >
        {TABS.map(tab => {
          const n      = count(tab.key);
          const active = activeTab === tab.key;
          const st     = STATUS[tab.key] || fallback;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                s.tab,
                active && { backgroundColor: st.dot, borderColor: st.dot },
              ]}
              onPress={() => { setActiveTab(tab.key); setExpanded(null); }}
              activeOpacity={0.8}
            >
              <Text style={[s.tabTxt, active && s.tabTxtActive]}>{tab.label}</Text>
              {n > 0 && (
                <View style={[s.tabBadge, active ? s.tabBadgeActive : { backgroundColor: st.dot }]}>
                  <Text style={s.tabBadgeTxt}>{n}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Booking List ── */}
      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 40, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title={activeTab === 'all' ? 'No Bookings Yet' : `No ${activeTab.toUpperCase()} Bookings`}
            subtitle={activeTab === 'all' ? 'Book a Machine to Get Started' : 'Switch to ALL tab to see all bookings'}
          />
        }
        renderItem={({ item }) => {
          const st           = STATUS[item.status] || fallback;
          const isExpanded   = expanded === item.id;
          const isCancelling = cancelling === item.id;
          const displayType  = item.machineTypeLabel || getCategoryLabel(item.machineType);
          const canCancel    = item.status === 'pending';
          // Show rate button only for completed, unrated bookings
          const canRate      = item.status === 'completed' && !item.rated;

          return (
            <View style={[s.card, { borderLeftColor: st.dot, borderLeftWidth: 4 }]}>

              {/* ── Card Header ── */}
              <TouchableOpacity
                style={s.cardTouchable}
                onPress={() => setExpanded(isExpanded ? null : item.id)}
                activeOpacity={0.85}
              >
                {/* Top row: machine + status badge */}
                <View style={s.cardTop}>
                  <Text style={s.machineType}>🚜 {displayType}</Text>
                  <View style={s.badgeRow}>
                    {/* Rating nudge dot for unrated completed bookings */}
                    {canRate && <View style={s.ratingNudge} />}
                    <View style={[s.badge, { backgroundColor: st.bg }]}>
                      <View style={[s.dot, { backgroundColor: st.dot }]} />
                      <Text style={[s.badgeTxt, { color: st.text }]}>{st.label}</Text>
                    </View>
                  </View>
                </View>

                {/* Meta info */}
                <Text style={s.meta}>📅 {item.date}  ·  ⏰ {item.timeSlot}</Text>
                <Text style={s.meta}>🌾 {item.hectareRequested} ha requested</Text>
                {item.ownerName ? <Text style={s.meta}>👤 {item.ownerName}</Text> : null}

                <Text style={s.hint}>{isExpanded ? '▲ Collapse' : '▼ Details & Actions'}</Text>
              </TouchableOpacity>

              {/* ── Expanded Section ── */}
              {isExpanded && (
                <View style={s.expanded}>

                  {/* OTP — show when accepted or ongoing */}
                  {(item.status === 'accepted' || item.status === 'ongoing') && (
                    <View style={s.otpBox}>
                      <Text style={s.otpLabel}>🔐 Your OTP — Give this to the Owner at the field</Text>
                      <Text style={s.otpValue}>{item.otp}</Text>
                      <Text style={s.otpWarn}>⚠️ Keep safe — do not share with others</Text>
                    </View>
                  )}

                  {/* Completed summary */}
                  {item.status === 'completed' && (
                    <View style={s.doneBox}>
                      <Text style={s.doneTxt}>✅ Work Done: {item.hectareCompleted} ha</Text>
                      {item.commission ? (
                        <Text style={s.doneTxt}>💰 Commission: ₹{item.commission}</Text>
                      ) : null}
                    </View>
                  )}

                  {/* ── RATE OWNER BUTTON — completed & not yet rated ── */}
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

                  {/* Already rated */}
                  {item.status === 'completed' && item.rated && (
                    <View style={s.ratedBox}>
                      <Text style={s.ratedTxt}>✅ You have already rated this booking</Text>
                    </View>
                  )}

                  {/* Cancelled note */}
                  {item.status === 'cancelled' && (
                    <View style={s.cancelledBox}>
                      <Text style={s.cancelledTxt}>🚫 You cancelled this booking.</Text>
                    </View>
                  )}

                  {/* Rejected note */}
                  {item.status === 'rejected' && (
                    <View style={s.rejectedBox}>
                      <Text style={s.rejectedTxt}>❌ This booking was rejected by the owner.</Text>
                    </View>
                  )}

                  {/* Owner contact */}
                  {item.ownerPhone && item.status !== 'cancelled' && item.status !== 'rejected' && (
                    <PhoneConnect
                      phone={item.ownerPhone}
                      name={item.ownerName || 'Owner'}
                      role="Machine Owner 🚜"
                    />
                  )}

                  {/* ── CANCEL BUTTON — only for pending bookings ── */}
                  {canCancel && (
                    <TouchableOpacity
                      style={[s.cancelBtn, isCancelling && s.cancelBtnDisabled]}
                      onPress={() => handleCancel(item)}
                      disabled={isCancelling}
                      activeOpacity={0.85}
                    >
                      <Text style={s.cancelBtnTxt}>
                        {isCancelling ? '⏳ Cancelling…' : '🚫 Cancel Booking'}
                      </Text>
                    </TouchableOpacity>
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
  safe: { flex: 1, backgroundColor: COLORS.background },

  // ── Tab bar
  tabBar:        { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBarContent: { paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: COLORS.border, marginRight: 8,
    backgroundColor: '#fff',
  },
  tabTxt:        { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  tabTxtActive:  { color: '#fff' },
  tabBadge: {
    marginLeft: 5, minWidth: 18, height: 18,
    borderRadius: 9, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeTxt:   { fontSize: 10, fontWeight: '900', color: '#fff' },

  // ── Card
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    marginBottom: 12, elevation: 3, overflow: 'hidden',
  },
  cardTouchable: { padding: 14 },
  cardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  machineType:   { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, flex: 1, marginRight: 8 },

  badgeRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingNudge:   { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' },

  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  dot:           { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  badgeTxt:      { fontSize: 10, fontWeight: '800' },

  meta:          { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  hint:          { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: 10 },

  // ── Expanded
  expanded: {
    borderTopWidth: 1, borderTopColor: COLORS.border,
    padding: 14,
  },

  // OTP box
  otpBox: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    padding: 16, alignItems: 'center', marginBottom: 12,
  },
  otpLabel:      { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 8, textAlign: 'center' },
  otpValue:      { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 10, marginBottom: 8 },
  otpWarn:       { fontSize: 11, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },

  // Done box
  doneBox: {
    backgroundColor: '#ECFDF5', borderRadius: 10,
    padding: 12, marginBottom: 12,
  },
  doneTxt:       { fontSize: 14, fontWeight: '600', color: '#065F46', marginBottom: 2 },

  // ── Rate button
  rateBtn: {
    backgroundColor: '#FFF9E6', borderWidth: 1.5, borderColor: '#F59E0B',
    borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10,
  },
  rateBtnTxt:    { fontSize: 15, fontWeight: '800', color: '#92400E' },
  rateBtnSub:    { fontSize: 12, color: '#B45309', marginTop: 4 },

  // Already rated
  ratedBox: {
    backgroundColor: '#ECFDF5', borderRadius: 10,
    padding: 12, marginBottom: 10, alignItems: 'center',
  },
  ratedTxt:      { fontSize: 13, fontWeight: '600', color: '#065F46' },

  // Cancelled box
  cancelledBox: {
    backgroundColor: '#F4F6F8', borderRadius: 10,
    padding: 12, marginBottom: 12,
  },
  cancelledTxt:  { fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'center' },

  // Rejected box
  rejectedBox: {
    backgroundColor: '#FEF2F2', borderRadius: 10,
    padding: 12, marginBottom: 12,
  },
  rejectedTxt:   { fontSize: 13, fontWeight: '600', color: '#991B1B', textAlign: 'center' },

  // ── Cancel button
  cancelBtn: {
    backgroundColor: '#EF4444', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 10,
  },
  cancelBtnDisabled: { opacity: 0.5 },
  cancelBtnTxt:  { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});
