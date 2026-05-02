// src/farmer/screens/MachineList.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, SafeAreaView, Image, StatusBar,
} from 'react-native';
import { getMachinesByTalukAndCategory, getUser } from '../../../firebase/firestore';
import { useUser }          from '../../../context/UserContext';
import { getCategoryLabel } from '../../../constants/categories';
import { CATEGORY_IMAGES }  from '../../../assets/index';
import { COLORS }           from '../../../constants/colors';
import { rs, rf, H_PAD }    from '../../../utils/responsive';
import { IMG }              from '../../../utils/imageSize';
import Loader               from '../../common/components/Loader';
import EmptyState           from '../../common/components/EmptyState';

const THEMES = {
  harvester:    { bg: '#FFF3E0', border: '#F59E0B', lc: '#92400E', bar: '#F59E0B' },
  rotavator:    { bg: '#E8F5E9', border: '#22C55E', lc: '#166534', bar: '#22C55E' },
  cultivator:   { bg: '#E3F2FD', border: '#3B82F6', lc: '#1D4ED8', bar: '#3B82F6' },
  strawchopper: { bg: '#F3E5F5', border: '#A855F7', lc: '#6B21A8', bar: '#A855F7' },
};
const DT = { bg: '#F4F6F8', border: '#9CA3AF', lc: '#374151', bar: COLORS.primary };

export default function MachineList({ navigation, route }) {
  const { category, categoryLabel } = route.params;
  const { userProfile }             = useUser();
  const [machines, setMachines]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const t = THEMES[category] || DT;

  useEffect(() => {
    const load = async () => {
      try {
        const taluk = userProfile?.taluk || '';
        const snap  = await getMachinesByTalukAndCategory(taluk, category);
        const list  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const enriched = await Promise.all(
          list.map(async (m) => {
            if (!m.ownerPhone && m.ownerId) {
              const o = await getUser(m.ownerId).catch(() => null);
              return { ...m, ownerPhone: o?.phone || '', ownerName: o?.name || m.ownerName };
            }
            return m;
          })
        );
        setMachines(enriched);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <Loader />;

  const img = CATEGORY_IMAGES[category];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <FlatList
        data={machines}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: H_PAD, paddingBottom: rs(32), flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.header}>
            <View style={[s.heroBanner, { backgroundColor: t.bg, borderColor: t.border }]}>
              <View style={s.heroImgWrap}>
                {img
                  ? <Image source={img} style={{ width: IMG.CATEGORY_IMG_IN_BOX * 1.2, height: IMG.CATEGORY_IMG_IN_BOX * 1.2 }} resizeMode="contain" />
                  : <Text style={{ fontSize: rf(38) }}>🚜</Text>
                }
              </View>
              <View style={s.heroText}>
                <Text style={[s.heroLabel, { color: t.lc }]}>{categoryLabel}</Text>
                <View style={s.metaRow}>
                  <View style={s.metaPill}><Text style={s.metaPillTxt}>📍 {userProfile?.taluk || 'your taluk'}</Text></View>
                  <View style={[s.metaPill, { backgroundColor: machines.length > 0 ? '#ECFDF5' : '#FEF2F2', marginLeft: rs(8) }]}>
                    <Text style={[s.metaPillTxt, { color: machines.length > 0 ? '#065F46' : '#B91C1C' }]}>
                      {machines.length} available
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="🚜" title="No machines available" subtitle={`No ${categoryLabel} found in ${userProfile?.taluk || 'your taluk'}.\nTry changing your location.`} />
        }
        renderItem={({ item }) => {
          const mLabel = getCategoryLabel(item.type);
          const mImg   = CATEGORY_IMAGES[item.type];
          const mt     = THEMES[item.type] || DT;
          return (
            <TouchableOpacity style={s.card} onPress={() => navigation.navigate('MachineDetails', { machine: item })} activeOpacity={0.9}>
              <View style={[s.accentBar, { backgroundColor: mt.bar }]} />
              <View style={s.cardContent}>
                <View style={s.cardTop}>
                  {/* Image block */}
                  <View style={[s.machineImgBlock, { backgroundColor: mt.bg, borderColor: mt.border }]}>
                    {mImg
                      ? <Image source={mImg} style={{ width: IMG.CATEGORY_IMG_IN_BOX, height: IMG.CATEGORY_IMG_IN_BOX }} resizeMode="contain" />
                      : <Text style={{ fontSize: rf(28) }}>🚜</Text>
                    }
                    <Text style={[s.machineImgLabel, { color: mt.lc }]} numberOfLines={1}>{mLabel.toUpperCase()}</Text>
                  </View>
                  {/* Info */}
                  <View style={s.cardInfo}>
                    <Text style={s.machineTypeName}>{mLabel}</Text>
                    <View style={s.ownerRow}>
                      <View style={s.ownerAvatar}><Text style={{ fontSize: rf(13) }}>👤</Text></View>
                      <Text style={s.ownerName} numberOfLines={1}>{item.ownerName || 'Machine Owner'}</Text>
                    </View>
                    <View style={s.pillsRow}>
                      <View style={s.infoPill}><Text style={s.infoPillTxt}>💰 ₹{item.price_per_hour}/hr</Text></View>
                      <View style={[s.infoPill, { marginLeft: rs(6) }]}><Text style={s.infoPillTxt}>📍 {item.taluk}</Text></View>
                    </View>
                    {item.ownerPhone && (
                      <View style={[s.infoPill, { backgroundColor: '#ECFDF5', marginTop: rs(4), alignSelf: 'flex-start' }]}>
                        <Text style={[s.infoPillTxt, { color: '#065F46' }]}>📞 {item.ownerPhone}</Text>
                      </View>
                    )}
                  </View>
                  {/* Right col */}
                  <View style={s.rightCol}>
                    <View style={s.availBadge}>
                      <View style={s.availDot} />
                      <Text style={s.availTxt}>Ready</Text>
                    </View>
                    <View style={[s.ctaArrow, { backgroundColor: mt.bar }]}>
                      <Text style={s.ctaArrowTxt}>→</Text>
                    </View>
                  </View>
                </View>
                <Text style={s.ctaHint}>Tap for Details & Booking</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F4F6F8' },
  header:          { marginBottom: rs(16) },
  heroBanner:      { flexDirection: 'row', alignItems: 'center', borderRadius: rs(18), borderWidth: rs(1.5), padding: rs(14), marginBottom: rs(4) },
  heroImgWrap:     { width: rs(72), height: rs(72), marginRight: rs(14), alignItems: 'center', justifyContent: 'center' },
  heroText:        { flex: 1 },
  heroLabel:       { fontSize: rf(22), fontWeight: '900', marginBottom: rs(8) },
  metaRow:         { flexDirection: 'row' },
  metaPill:        { backgroundColor: '#EFF6FF', borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(5) },
  metaPillTxt:     { fontSize: rf(12), color: '#1D4ED8', fontWeight: '600' },
  card:            { flexDirection: 'row', backgroundColor: '#fff', borderRadius: rs(18), marginBottom: rs(12), elevation: 2, overflow: 'hidden' },
  accentBar:       { width: rs(5) },
  cardContent:     { flex: 1, padding: rs(14) },
  cardTop:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: rs(8) },
  machineImgBlock: { width: rs(74), borderRadius: rs(12), borderWidth: rs(1.5), alignItems: 'center', justifyContent: 'center', marginRight: rs(12), paddingVertical: rs(8), paddingHorizontal: rs(4) },
  machineImgLabel: { fontSize: rf(8), fontWeight: '900', textAlign: 'center', marginTop: rs(3) },
  cardInfo:        { flex: 1 },
  machineTypeName: { fontSize: rf(16), fontWeight: '800', color: '#111827', marginBottom: rs(5) },
  ownerRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: rs(6) },
  ownerAvatar:     { width: rs(24), height: rs(24), borderRadius: rs(12), backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: rs(5) },
  ownerName:       { fontSize: rf(12), color: '#374151', fontWeight: '600', flex: 1 },
  pillsRow:        { flexDirection: 'row', flexWrap: 'wrap' },
  infoPill:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: rs(8), paddingHorizontal: rs(7), paddingVertical: rs(3), borderWidth: 1, borderColor: '#E5E7EB', marginBottom: rs(3) },
  infoPillTxt:     { fontSize: rf(11), color: '#374151', fontWeight: '600' },
  rightCol:        { alignItems: 'center', justifyContent: 'space-between', paddingLeft: rs(6), minHeight: rs(70) },
  availBadge:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: rs(10), paddingHorizontal: rs(7), paddingVertical: rs(4) },
  availDot:        { width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: '#22C55E', marginRight: rs(4) },
  availTxt:        { fontSize: rf(10), color: '#065F46', fontWeight: '700' },
  ctaArrow:        { width: rs(28), height: rs(28), borderRadius: rs(14), alignItems: 'center', justifyContent: 'center' },
  ctaArrowTxt:     { color: '#fff', fontWeight: '800', fontSize: rf(14) },
  ctaHint:         { fontSize: rf(11), color: COLORS.textSecondary, textAlign: 'right' },
});
