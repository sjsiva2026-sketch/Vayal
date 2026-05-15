// src/farmer/screens/FarmerHome.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { FIcon, IIcon }           from '../../../utils/icons';
import { useUser }                from '../../../context/UserContext';
import { COLORS }                 from '../../../constants/colors';
import { listenBookingsByFarmer } from '../../../firebase/firestore';
import { getCategoryLabel }       from '../../../constants/categories';
import { rs, rf, H_PAD }          from '../../../utils/responsive';

const STATUS_META = {
  pending:   { color: '#F59E0B', bg: '#FFFBEB', dot: '#F59E0B', label: 'Pending'   },
  accepted:  { color: COLORS.primary, bg: '#ECFDF5', dot: '#22C55E', label: 'Accepted' },
  ongoing:   { color: '#3B82F6', bg: '#EFF6FF', dot: '#3B82F6', label: 'Ongoing'   },
  completed: { color: '#22C55E', bg: '#F0FDF4', dot: '#22C55E', label: 'Done'      },
  cancelled: { color: '#9CA3AF', bg: '#F4F6F8', dot: '#9CA3AF', label: 'Cancelled' },
  rejected:  { color: '#EF4444', bg: '#FEF2F2', dot: '#EF4444', label: 'Rejected'  },
};

export default function FarmerHome({ navigation }) {
  const { userProfile }     = useUser();
  const uid                 = userProfile?.id || '';
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    if (!uid) return;
    const unsub = listenBookingsByFarmer(uid, (data) => {
      setRecent(
        [...data]
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 5)
      );
    });
    return unsub;
  }, [uid]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* Header */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greetTxt}>Hello! 👋</Text>
            <View style={s.locRow}>
              <IIcon name="location" size={rs(14)} color="#EF4444" fallback="📍" />
              <Text style={s.locTxt} numberOfLines={1}>
                {userProfile?.taluk || 'Set location'}
                {userProfile?.district ? `, ${userProfile.district}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Search bar */}
        <TouchableOpacity
          style={s.searchBar}
          onPress={() => navigation.navigate('FindMachine')}
          activeOpacity={0.85}
        >
          <FIcon name="search" size={rs(18)} color="#9CA3AF" fallback="🔍" style={{ marginRight: rs(10) }} />
          <Text style={s.searchPlaceholder}>Search products...</Text>
        </TouchableOpacity>

        {/* Featured */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Featured Products</Text>
          <TouchableOpacity onPress={() => navigation.navigate('FindMachine')}>
            <Text style={s.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {recent.length === 0 && (
          <Text style={s.emptyTxt}>No products available</Text>
        )}

        {/* CTA Banner */}
        <TouchableOpacity
          style={s.ctaBanner}
          onPress={() => navigation.navigate('FindMachine')}
          activeOpacity={0.9}
        >
          <Text style={s.ctaTitle}>Start Booking Today! 🚜</Text>
          <Text style={s.ctaSub}>
            Book farm machinery in your taluk instantly
          </Text>
        </TouchableOpacity>

        {/* Recent Bookings */}
        {recent.length > 0 && (
          <>
            <View style={[s.sectionRow, { marginTop: rs(24) }]}>
              <Text style={s.sectionTitle}>Recent Bookings</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyBookings')}>
                <Text style={s.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {recent.map(b => {
              const meta  = STATUS_META[b.status] || STATUS_META.pending;
              const label = b.machineTypeLabel || getCategoryLabel(b.machineType);
              return (
                <View key={b.id} style={s.bookingCard}>
                  <View style={[s.bookingIconWrap, { backgroundColor: meta.bg }]}>
                    <Text style={s.bookingIconEmoji}>🚜</Text>
                  </View>
                  <View style={s.bookingInfo}>
                    <Text style={s.bookingType} numberOfLines={1}>{label}</Text>
                    <Text style={s.bookingMeta}>{b.date}  ·  {b.timeSlot}</Text>
                    <Text style={s.bookingHa}>🌾 {b.hectareRequested} ha</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
                    <View style={[s.statusDot, { backgroundColor: meta.dot }]} />
                    <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: rs(24) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#fff' },
  scroll:           { flexGrow: 1, paddingBottom: rs(20) },

  headerRow:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: H_PAD, paddingTop: rs(16), paddingBottom: rs(16) },
  greetTxt:         { fontSize: rf(22), fontWeight: '800', color: '#111827' },
  locRow:           { flexDirection: 'row', alignItems: 'center', marginTop: rs(4) },
  locTxt:           { fontSize: rf(13), color: '#6B7280', marginLeft: rs(3), flex: 1 },

  avatarBtn:        {},
  avatarImg:        {},
  avatarFallback:   {},
  avatarTxt:        {},

  searchBar:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F5F7', borderRadius: rs(14), paddingHorizontal: rs(16), paddingVertical: rs(13), marginHorizontal: H_PAD, marginBottom: rs(20) },
  searchPlaceholder:{ fontSize: rf(15), color: '#9CA3AF', flex: 1 },

  sectionRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: H_PAD, marginBottom: rs(14) },
  sectionTitle:     { fontSize: rf(17), fontWeight: '800', color: '#111827' },
  seeAll:           { fontSize: rf(14), color: COLORS.primary, fontWeight: '700' },

  emptyTxt:         { fontSize: rf(14), color: '#9CA3AF', paddingHorizontal: H_PAD, marginBottom: rs(8) },

  ctaBanner:        { marginHorizontal: H_PAD, marginTop: rs(8), backgroundColor: COLORS.primary, borderRadius: rs(18), padding: rs(22), elevation: 3 },
  ctaTitle:         { fontSize: rf(18), fontWeight: '900', color: '#fff', marginBottom: rs(4) },
  ctaSub:           { fontSize: rf(13), color: 'rgba(255,255,255,0.85)', lineHeight: rf(20) },

  bookingCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: rs(14), marginHorizontal: H_PAD, marginBottom: rs(10), padding: rs(12), elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
  bookingIconWrap:  { width: rs(50), height: rs(50), borderRadius: rs(12), alignItems: 'center', justifyContent: 'center', marginRight: rs(12) },
  bookingIconEmoji: { fontSize: rf(24) },
  bookingInfo:      { flex: 1 },
  bookingType:      { fontSize: rf(14), fontWeight: '700', color: '#111827', marginBottom: rs(2) },
  bookingMeta:      { fontSize: rf(12), color: '#6B7280' },
  bookingHa:        { fontSize: rf(12), color: COLORS.primary, fontWeight: '600', marginTop: rs(2) },
  statusBadge:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(8), paddingVertical: rs(4), borderRadius: rs(10) },
  statusDot:        { width: rs(6), height: rs(6), borderRadius: rs(3), marginRight: rs(4) },
  statusTxt:        { fontSize: rf(10), fontWeight: '800' },
});
