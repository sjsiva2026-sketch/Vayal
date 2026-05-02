// src/farmer/screens/FarmerHome.js
// CHANGE: Categories section REMOVED from home screen
// Categories available in "Find Machine" tab (CategoryScreen)

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar, Image,
} from 'react-native';
import { FIcon, IIcon }          from '../../../utils/icons';
import { useUser }               from '../../../context/UserContext';
import { COLORS }                from '../../../constants/colors';
import { listenBookingsByFarmer }from '../../../firebase/firestore';
import { getCategoryLabel }      from '../../../constants/categories';

const PRIMARY = '#1C7C54';

const STATUS_META = {
  pending:   { color: '#F59E0B', bg: '#FFFBEB', dot: '#F59E0B', label: 'Pending'   },
  accepted:  { color: PRIMARY,   bg: '#ECFDF5', dot: '#22C55E', label: 'Accepted'  },
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Header: Hello + location + avatar ── */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greetTxt}>Hello! 👋</Text>
            <View style={s.locRow}>
              <IIcon name="location" size={14} color="#EF4444" fallback="📍" />
              <Text style={s.locTxt} numberOfLines={1}>
                {userProfile?.taluk || 'Set location'}
                {userProfile?.district ? `, ${userProfile.district}` : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.avatarBtn}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.85}
          >
            {userProfile?.photoURL ? (
              <Image source={{ uri: userProfile.photoURL }} style={s.avatarImg} />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarTxt}>{(userProfile?.name || 'F')[0].toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Search bar ── */}
        <TouchableOpacity
          style={s.searchBar}
          onPress={() => navigation.navigate('FindMachine')}
          activeOpacity={0.85}
        >
          <FIcon name="search" size={18} color="#9CA3AF" fallback="🔍" style={{ marginRight: 10 }} />
          <Text style={s.searchPlaceholder}>Search products...</Text>
        </TouchableOpacity>

        {/* ── NO Categories section here — moved to Find Machine tab ── */}

        {/* ── Featured Products ── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Featured Products</Text>
          <TouchableOpacity onPress={() => navigation.navigate('FindMachine')}>
            <Text style={s.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {recent.length === 0 && (
          <Text style={s.emptyTxt}>No products available</Text>
        )}

        {/* ── CTA Banner ── */}
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

        {/* ── Recent Bookings ── */}
        {recent.length > 0 && (
          <>
            <View style={[s.sectionRow, { marginTop: 24 }]}>
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

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#fff' },
  scroll:           { paddingBottom: 20 },

  headerRow:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  greetTxt:         { fontSize: 22, fontWeight: '800', color: '#111827' },
  locRow:           { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locTxt:           { fontSize: 13, color: '#6B7280', marginLeft: 3, flex: 1 },

  // Avatar: 42×42 circle
  avatarBtn:        { marginLeft: 12 },
  avatarImg:        { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: PRIMARY },
  avatarFallback:   { width: 42, height: 42, borderRadius: 21, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:        { fontSize: 18, fontWeight: '900', color: '#fff' },

  searchBar:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F5F7', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, marginHorizontal: 20, marginBottom: 20 },
  searchPlaceholder:{ fontSize: 15, color: '#9CA3AF', flex: 1 },

  sectionRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle:     { fontSize: 17, fontWeight: '800', color: '#111827' },
  seeAll:           { fontSize: 14, color: PRIMARY, fontWeight: '700' },

  emptyTxt:         { fontSize: 14, color: '#9CA3AF', paddingHorizontal: 20, marginBottom: 8 },

  ctaBanner:        { marginHorizontal: 20, marginTop: 8, backgroundColor: PRIMARY, borderRadius: 18, padding: 22, elevation: 3 },
  ctaTitle:         { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 4 },
  ctaSub:           { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },

  bookingCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 20, marginBottom: 10, padding: 12, elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
  bookingIconWrap:  { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  bookingIconEmoji: { fontSize: 24 },
  bookingInfo:      { flex: 1 },
  bookingType:      { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  bookingMeta:      { fontSize: 12, color: '#6B7280' },
  bookingHa:        { fontSize: 12, color: PRIMARY, fontWeight: '600', marginTop: 2 },
  statusBadge:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusDot:        { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusTxt:        { fontSize: 10, fontWeight: '800' },
});
