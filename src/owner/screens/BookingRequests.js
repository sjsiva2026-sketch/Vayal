import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  FlatList, TouchableOpacity, Alert,
  RefreshControl, ScrollView,
} from 'react-native';
import { listenBookingsByOwner, updateBooking, getUser } from '../../../firebase/firestore';
import { useUser }          from '../../../context/UserContext';
import { getCategoryLabel } from '../../../constants/categories';
import PhoneConnect         from '../../common/components/PhoneConnect';
import Loader               from '../../common/components/Loader';
import { COLORS }           from '../../../constants/colors';

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',       label: 'ALL'       },
  { key: 'pending',   label: 'PENDING'   },
  { key: 'accepted',  label: 'ACCEPTED'  },
  { key: 'ongoing',   label: 'ONGOING'   },
  { key: 'completed', label: 'DONE'      },
  { key: 'rejected',  label: 'REJECTED'  },
];

// ─── Status visual config ─────────────────────────────────────────────────────
const STATUS = {
  pending:   { bg: '#FFF9E6', badge: '#F59E0B', text: '#92400E', dot: '#F59E0B', label: 'PENDING'   },
  accepted:  { bg: '#ECFDF5', badge: '#1C7C54', text: '#065F46', dot: '#22C55E', label: 'ACCEPTED'  },
  ongoing:   { bg: '#EFF6FF', badge: '#3B82F6', text: '#1D4ED8', dot: '#3B82F6', label: 'ONGOING'   },
  completed: { bg: '#F0FDF4', badge: '#22C55E', text: '#166534', dot: '#22C55E', label: 'DONE'       },
  rejected:  { bg: '#FEF2F2', badge: '#EF4444', text: '#991B1B', dot: '#EF4444', label: 'REJECTED'  },
};
const fallbackStatus = { bg: '#F4F6F8', badge: '#9CA3AF', text: '#374151', dot: '#9CA3AF', label: '—' };

export default function BookingRequests({ navigation }) {
  const { userProfile }           = useUser();
  const uid                       = userProfile?.id || '';

  const [allBookings, setAllBookings] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [expanded,    setExpanded]    = useState(null);
  const [activeTab,   setActiveTab]   = useState('all');
  const [refreshing,  setRefreshing]  = useState(false);
  const [actioning,   setActioning]   = useState(null); // booking id currently being updated

  // prevent setState after unmount
  const alive = useRef(true);
  useEffect(() => { return () => { alive.current = false; }; }, []);

  // ── Firestore real-time listener ─────────────────────────────────────────
  useEffect(() => {
    if (!uid) {
      setError('Not logged in. Please restart the app.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const unsub = listenBookingsByOwner(
      uid,
      async (rawData) => {
        try {
          // Enrich missing farmerPhone from users collection
          const enriched = await Promise.all(
            rawData.map(async (b) => {
              if (!b.farmerPhone && b.farmerId) {
                const farmer = await getUser(b.farmerId).catch(() => null);
                return {
                  ...b,
                  farmerPhone: farmer?.phone || '',
                  farmerName:  farmer?.name  || b.farmerName || 'Farmer',
                };
              }
              return b;
            })
          );

          if (!alive.current) return;

          // Sort: newest first
          const sorted = enriched.sort(
            (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
          );

          setAllBookings(sorted);
          setError('');
        } catch (e) {
          if (alive.current) setError('Failed to load bookings: ' + (e.message || ''));
        } finally {
          if (alive.current) { setLoading(false); setRefreshing(false); }
        }
      },
      (e) => {
        if (!alive.current) return;
        setError('Connection error: ' + (e?.message || 'Please check your internet.'));
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsub;
  }, [uid]);

  // ── Filter by active tab ──────────────────────────────────────────────────
  const bookings = activeTab === 'all'
    ? allBookings
    : allBookings.filter(b => b.status === activeTab);

  // ── Count per tab for badges ──────────────────────────────────────────────
  const count = (key) => key === 'all'
    ? allBookings.length
    : allBookings.filter(b => b.status === key).length;

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAccept = (booking) => {
    Alert.alert(
      '✅ Accept Booking?',
      `Accept request from ${booking.farmerName || 'Farmer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setActioning(booking.id);
            try {
              await updateBooking(booking.id, { status: 'accepted' });
              Alert.alert('✅ Accepted', 'Farmer has been notified. Show up at the field!');
            } catch (e) {
              Alert.alert('Error', e.message || 'Could not accept. Try again.');
            } finally {
              if (alive.current) setActioning(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = (booking) => {
    Alert.alert(
      '❌ Reject Booking?',
      `Reject request from ${booking.farmerName || 'Farmer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActioning(booking.id);
            try {
              await updateBooking(booking.id, { status: 'rejected' });
            } catch (e) {
              Alert.alert('Error', e.message || 'Could not reject. Try again.');
            } finally {
              if (alive.current) setActioning(null);
            }
          },
        },
      ]
    );
  };

  // ── Loading / Error states ────────────────────────────────────────────────
  if (loading) return <Loader />;

  if (error) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.errorBox}>
          <Text style={s.errorIcon}>⚠️</Text>
          <Text style={s.errorTitle}>Something went wrong</Text>
          <Text style={s.errorMsg}>{error}</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => { setLoading(true); setError(''); }}
          >
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
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
          const n       = count(tab.key);
          const active  = activeTab === tab.key;
          const st      = STATUS[tab.key] || {};
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, active && { backgroundColor: st.badge || COLORS.primary, borderColor: st.badge || COLORS.primary }]}
              onPress={() => { setActiveTab(tab.key); setExpanded(null); }}
              activeOpacity={0.8}
            >
              <Text style={[s.tabTxt, active && s.tabTxtActive]}>
                {tab.label}
              </Text>
              {n > 0 && (
                <View style={[s.tabBadge, active ? s.tabBadgeActive : { backgroundColor: st.badge || '#ccc' }]}>
                  <Text style={s.tabBadgeTxt}>{n}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Booking Cards ── */}
      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 40, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => setRefreshing(true)} // listener will reset it
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>📭</Text>
            <Text style={s.emptyTitle}>
              {activeTab === 'all' ? 'No Bookings Yet' : `No ${activeTab.toUpperCase()} Bookings`}
            </Text>
            <Text style={s.emptySub}>
              {activeTab === 'all'
                ? 'Farmers will send requests here once you add machines.'
                : `Switch to ALL tab to see all bookings.`}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const st          = STATUS[item.status] || fallbackStatus;
          const isExpanded  = expanded === item.id;
          const isActioning = actioning === item.id;
          const displayType = item.machineTypeLabel || getCategoryLabel(item.machineType);

          return (
            <View style={[s.card, { borderLeftColor: st.dot, borderLeftWidth: 4 }]}>

              {/* ── Card Top: farmer + status badge ── */}
              <TouchableOpacity
                style={s.cardTouchable}
                onPress={() => setExpanded(isExpanded ? null : item.id)}
                activeOpacity={0.85}
              >
                <View style={s.cardHeader}>
                  {/* Left: avatar + name */}
                  <View style={[s.avatar, { backgroundColor: st.bg }]}>
                    <Text style={s.avatarTxt}>👨‍🌾</Text>
                  </View>
                  <View style={s.cardMid}>
                    <Text style={s.farmerName} numberOfLines={1}>
                      {item.farmerName || 'Farmer'}
                    </Text>
                    {item.farmerPhone ? (
                      <Text style={s.farmerPhone}>📞 +91 {item.farmerPhone}</Text>
                    ) : null}
                  </View>
                  {/* Right: status badge */}
                  <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                    <View style={[s.statusDot, { backgroundColor: st.dot }]} />
                    <Text style={[s.statusTxt, { color: st.text }]}>{st.label}</Text>
                  </View>
                </View>

                {/* ── Machine + booking details ── */}
                <View style={s.detailsRow}>
                  <View style={s.detailChip}>
                    <Text style={s.detailChipTxt}>🚜 {displayType}</Text>
                  </View>
                  <View style={s.detailChip}>
                    <Text style={s.detailChipTxt}>📅 {item.date}</Text>
                  </View>
                  <View style={s.detailChip}>
                    <Text style={s.detailChipTxt}>⏰ {item.timeSlot}</Text>
                  </View>
                  <View style={s.detailChip}>
                    <Text style={s.detailChipTxt}>🌾 {item.hectareRequested} ha</Text>
                  </View>
                </View>

                {/* Expand hint */}
                <Text style={s.expandHint}>{isExpanded ? '▲ Collapse' : '▼ Actions & Contact'}</Text>
              </TouchableOpacity>

              {/* ── Expanded Section ── */}
              {isExpanded && (
                <View style={s.expandedSection}>

                  {/* Contact farmer */}
                  {item.farmerPhone ? (
                    <PhoneConnect
                      phone={item.farmerPhone}
                      name={item.farmerName || 'Farmer'}
                      role="Farmer 👨‍🌾"
                    />
                  ) : (
                    <View style={s.noPhoneBox}>
                      <Text style={s.noPhoneTxt}>📵 Farmer phone not available</Text>
                    </View>
                  )}

                  {/* ── Action Buttons based on status ── */}

                  {/* PENDING → Accept / Reject */}
                  {item.status === 'pending' && (
                    <View style={s.actionRow}>
                      <TouchableOpacity
                        style={[s.acceptBtn, isActioning && s.btnDisabled]}
                        onPress={() => handleAccept(item)}
                        disabled={isActioning}
                        activeOpacity={0.85}
                      >
                        <Text style={s.acceptBtnTxt}>
                          {isActioning ? 'Processing…' : '✅  ACCEPT'}
                        </Text>
                      </TouchableOpacity>
                      <View style={{ width: 10 }} />
                      <TouchableOpacity
                        style={[s.rejectBtn, isActioning && s.btnDisabled]}
                        onPress={() => handleReject(item)}
                        disabled={isActioning}
                        activeOpacity={0.85}
                      >
                        <Text style={s.rejectBtnTxt}>
                          {isActioning ? '…' : '❌  REJECT'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* ACCEPTED → Start Work */}
                  {item.status === 'accepted' && (
                    <TouchableOpacity
                      style={s.startBtn}
                      onPress={() => navigation.navigate('WorkStartOTP', { booking: item })}
                      activeOpacity={0.85}
                    >
                      <Text style={s.startBtnTxt}>🔐  ENTER OTP & START WORK</Text>
                    </TouchableOpacity>
                  )}

                  {/* ONGOING → Continue */}
                  {item.status === 'ongoing' && (
                    <TouchableOpacity
                      style={s.ongoingBtn}
                      onPress={() => navigation.navigate('WorkInProgress', { booking: item })}
                      activeOpacity={0.85}
                    >
                      <Text style={s.ongoingBtnTxt}>⚙️  WORK IN PROGRESS →</Text>
                    </TouchableOpacity>
                  )}

                  {/* COMPLETED → summary info */}
                  {item.status === 'completed' && (
                    <View style={s.completedBox}>
                      <Text style={s.completedTxt}>
                        ✅  Work Done: {item.hectareCompleted || 0} ha  ·  Commission: ₹{item.commission || 0}
                      </Text>
                    </View>
                  )}

                  {/* REJECTED */}
                  {item.status === 'rejected' && (
                    <View style={s.rejectedBox}>
                      <Text style={s.rejectedTxt}>❌  This booking was rejected.</Text>
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  // Tab bar
  tabBar:        { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBarContent: { paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  tab:           {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: COLORS.border, marginRight: 8,
    backgroundColor: '#fff',
  },
  tabTxt:        { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  tabTxtActive:  { color: '#fff' },
  tabBadge:      {
    marginLeft: 5, minWidth: 18, height: 18,
    borderRadius: 9, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 4,
  },
  tabBadgeActive:{ backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeTxt:   { fontSize: 10, fontWeight: '900', color: '#fff' },

  // Card
  card:          {
    backgroundColor: '#fff', borderRadius: 16,
    marginBottom: 12, elevation: 3,
    overflow: 'hidden',
  },
  cardTouchable: { padding: 14 },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar:        {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  avatarTxt:     { fontSize: 22 },
  cardMid:       { flex: 1 },
  farmerName:    { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  farmerPhone:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  statusBadge:   {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusDot:     { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusTxt:     { fontSize: 11, fontWeight: '800' },

  detailsRow:    { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  detailChip:    {
    backgroundColor: '#F4F6F8', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    marginRight: 6, marginBottom: 6,
  },
  detailChipTxt: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600' },

  expandHint:    { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },

  // Expanded
  expandedSection: {
    borderTopWidth: 1, borderTopColor: COLORS.border,
    padding: 14,
  },
  noPhoneBox:    { backgroundColor: '#FFF9E6', borderRadius: 10, padding: 10, marginBottom: 10, alignItems: 'center' },
  noPhoneTxt:    { fontSize: 13, color: '#92400E' },

  // Action buttons
  actionRow:     { flexDirection: 'row', marginTop: 4 },
  acceptBtn:     {
    flex: 1, backgroundColor: COLORS.primary,
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  acceptBtnTxt:  { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  rejectBtn:     {
    flex: 1, backgroundColor: COLORS.error,
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  rejectBtnTxt:  { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  btnDisabled:   { opacity: 0.5 },

  startBtn:      {
    backgroundColor: '#1D4ED8', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  startBtnTxt:   { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },

  ongoingBtn:    {
    backgroundColor: '#F59E0B', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  ongoingBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },

  completedBox:  {
    backgroundColor: '#ECFDF5', borderRadius: 10,
    padding: 12, marginTop: 4,
  },
  completedTxt:  { fontSize: 13, fontWeight: '700', color: '#065F46', textAlign: 'center' },

  rejectedBox:   {
    backgroundColor: '#FEF2F2', borderRadius: 10,
    padding: 12, marginTop: 4,
  },
  rejectedTxt:   { fontSize: 13, fontWeight: '700', color: '#991B1B', textAlign: 'center' },

  // Error state
  errorBox:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorIcon:     { fontSize: 52, marginBottom: 12 },
  errorTitle:    { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  errorMsg:      { fontSize: 13, color: COLORS.error, textAlign: 'center', marginBottom: 20 },
  retryBtn:      {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  retryTxt:      { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Empty state
  emptyBox:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon:     { fontSize: 52, marginBottom: 14 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  emptySub:      { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
});
