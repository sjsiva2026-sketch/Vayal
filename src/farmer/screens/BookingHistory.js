import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { listenBookingsByFarmer } from '../../../firebase/firestore';
import { useUser }          from '../../../context/UserContext';
// BUG FIX: show human-readable machine label instead of raw id
import { getCategoryLabel } from '../../../constants/categories';
import PhoneConnect         from '../../common/components/PhoneConnect';
import EmptyState           from '../../common/components/EmptyState';
import Loader               from '../../common/components/Loader';
import { COLORS }           from '../../../constants/colors';

const STATUS_COLOR = {
  pending:   COLORS.warning,
  accepted:  COLORS.primary,
  ongoing:   '#F4B400',
  completed: COLORS.success,
  rejected:  COLORS.error,
};

export default function BookingHistory() {
  const { userProfile }           = useUser();
  const uid                       = userProfile?.id || '';
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const unsub = listenBookingsByFarmer(uid, (data) => {
      setBookings(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={<EmptyState icon="📋" title="No Bookings Yet" subtitle="Book a Machine to Get Started" />}
        renderItem={({ item }) => {
          // BUG FIX: prefer stored label, fall back to getCategoryLabel(id)
          const displayType = item.machineTypeLabel || getCategoryLabel(item.machineType);
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => setExpanded(expanded === item.id ? null : item.id)}
              activeOpacity={0.9}
            >
              <View style={s.cardTop}>
                <Text style={s.machineType}>🚜 {displayType}</Text>
                <View style={[s.badge, { backgroundColor: STATUS_COLOR[item.status] || '#ccc' }]}>
                  <Text style={s.badgeTxt}>{item.status?.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={s.meta}>📅 {item.date}  ·  ⏰ {item.timeSlot}</Text>
              <Text style={s.meta}>🌾 {item.hectareRequested} Hectare Requested</Text>

              {expanded === item.id && (
                <View style={s.expanded}>
                  {(item.status === 'accepted' || item.status === 'ongoing') && (
                    <View style={s.otpBox}>
                      <Text style={s.otpLabel}>🔐 Your OTP (Give to Owner)</Text>
                      <Text style={s.otpValue}>{item.otp}</Text>
                    </View>
                  )}
                  {item.status === 'completed' && (
                    <View style={s.doneBox}>
                      <Text style={s.doneTxt}>✅ Work Done: {item.hectareCompleted} ha</Text>
                    </View>
                  )}
                  {item.ownerPhone && (
                    <PhoneConnect phone={item.ownerPhone} name={item.ownerName || 'Owner'} role="Machine Owner 🚜" />
                  )}
                </View>
              )}
              <Text style={s.hint}>{expanded === item.id ? '▲ Collapse' : '▼ Details & Contact'}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: COLORS.background },
  card:       { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3 },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  machineType:{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  badge:      { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTxt:   { fontSize: 10, color: '#fff', fontWeight: '700' },
  meta:       { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  expanded:   { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  otpBox:     { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  otpLabel:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  otpValue:   { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 8 },
  doneBox:    { backgroundColor: '#E8FAF0', borderRadius: 10, padding: 10, marginBottom: 10 },
  doneTxt:    { fontSize: 14, fontWeight: '600', color: COLORS.success },
  hint:       { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
});
