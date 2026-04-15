import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, SafeAreaView,
} from 'react-native';
import { getMachinesByTalukAndCategory, getUser } from '../../../firebase/firestore';
import { useUser }    from '../../../context/UserContext';
import { COLORS }     from '../../../constants/colors';
import Loader         from '../../common/components/Loader';
import EmptyState     from '../../common/components/EmptyState';

export default function MachineList({ navigation, route }) {
  const { category, categoryLabel } = route.params;
  const { userProfile }             = useUser();
  const [machines, setMachines]     = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const taluk = userProfile?.taluk || '';
        const snap  = await getMachinesByTalukAndCategory(taluk, category);
        const list  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const enriched = await Promise.all(
          list.map(async (m) => {
            if (!m.ownerPhone && m.ownerId) {
              const owner = await getUser(m.ownerId).catch(() => null);
              return { ...m, ownerPhone: owner?.phone || '', ownerName: owner?.name || m.ownerName };
            }
            return m;
          })
        );
        setMachines(enriched);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={machines}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.headerTitle}>{categoryLabel}</Text>
            <View style={s.headerMeta}>
              <View style={s.metaPill}>
                <Text style={s.metaPillTxt}>📍  {userProfile?.taluk || 'your taluk'}</Text>
              </View>
              <View style={[s.metaPill, { backgroundColor: machines.length > 0 ? '#ECFDF5' : '#FEF2F2', marginLeft: 8 }]}>
                <Text style={[s.metaPillTxt, { color: machines.length > 0 ? '#065F46' : '#B91C1C' }]}>
                  {machines.length} available
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="🚜"
            title="No machines available"
            subtitle={`No ${categoryLabel} found in ${userProfile?.taluk || 'your taluk'}.\nTry changing your location.`}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => navigation.navigate('MachineDetails', { machine: item })}
            activeOpacity={0.9}
          >
            <View style={s.accentBar} />
            <View style={s.cardContent}>
              <View style={s.cardTop}>
                <View style={s.typeBox}>
                  <Text style={s.typeIcon}>🚜</Text>
                  <Text style={s.typeTxt}>{item.type}</Text>
                </View>
                <View style={s.availBadge}>
                  <View style={s.availDot} />
                  <Text style={s.availTxt}>Available</Text>
                </View>
              </View>
              <View style={s.ownerRow}>
                <View style={s.ownerAvatar}><Text style={{ fontSize: 14 }}>👤</Text></View>
                <Text style={s.ownerName}>  {item.ownerName || 'Machine Owner'}</Text>
              </View>
              <View style={s.pillsRow}>
                <View style={s.infoPill}>
                  <Text style={s.infoPillTxt}>💰 ₹{item.price_per_hour}/hr</Text>
                </View>
                <View style={[s.infoPill, { marginLeft: 8 }]}>
                  <Text style={s.infoPillTxt}>📍 {item.taluk}</Text>
                </View>
                {item.ownerPhone && (
                  <View style={[s.infoPill, { backgroundColor: '#ECFDF5', marginLeft: 8 }]}>
                    <Text style={[s.infoPillTxt, { color: '#065F46' }]}>📞 +91 {item.ownerPhone}</Text>
                  </View>
                )}
              </View>
              <View style={s.ctaRow}>
                <Text style={s.ctaHint}>Tap for Details & Booking</Text>
                <View style={s.ctaArrow}><Text style={s.ctaArrowTxt}>→</Text></View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#F4F6F8' },
  header:       { marginBottom: 16 },
  headerTitle:  { fontSize: 26, fontWeight: '900', color: '#111827', marginBottom: 10 },
  headerMeta:   { flexDirection: 'row' },
  metaPill:     { backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  metaPillTxt:  { fontSize: 12, color: '#1D4ED8', fontWeight: '600' },
  card:         { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, marginBottom: 12, elevation: 2, overflow: 'hidden' },
  accentBar:    { width: 5, backgroundColor: COLORS.primary },
  cardContent:  { flex: 1, padding: 14 },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBox:      { flexDirection: 'row', alignItems: 'center' },
  typeIcon:     { fontSize: 20, marginRight: 6 },
  typeTxt:      { fontSize: 17, fontWeight: '800', color: '#111827' },
  availBadge:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  availDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 5 },
  availTxt:     { fontSize: 12, color: '#065F46', fontWeight: '700' },
  ownerRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  ownerAvatar:  { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  ownerName:    { fontSize: 13, color: '#374151', fontWeight: '600' },
  pillsRow:     { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  infoPill:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 4 },
  infoPillTxt:  { fontSize: 12, color: '#374151', fontWeight: '600' },
  ctaRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ctaHint:      { fontSize: 11, color: '#9CA3AF' },
  ctaArrow:     { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  ctaArrowTxt:  { color: '#fff', fontWeight: '800', fontSize: 14 },
});
