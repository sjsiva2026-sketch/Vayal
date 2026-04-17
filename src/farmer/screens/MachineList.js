import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, SafeAreaView, Image,
} from 'react-native';
import { getMachinesByTalukAndCategory, getUser } from '../../../firebase/firestore';
import { useUser }          from '../../../context/UserContext';
import { getCategoryLabel } from '../../../constants/categories';
import { CATEGORY_IMAGES }  from '../../../assets/index';
import { COLORS }           from '../../../constants/colors';
import Loader               from '../../common/components/Loader';
import EmptyState           from '../../common/components/EmptyState';

// Per-machine-type accent colours (matches CategoryScreen palette)
const MACHINE_THEME = {
  harvester:    { bg: '#FFF3E0', border: '#F59E0B', labelColor: '#92400E', barColor: '#F59E0B' },
  rotavator:    { bg: '#E8F5E9', border: '#22C55E', labelColor: '#166534', barColor: '#22C55E' },
  cultivator:   { bg: '#E3F2FD', border: '#3B82F6', labelColor: '#1D4ED8', barColor: '#3B82F6' },
  strawchopper: { bg: '#F3E5F5', border: '#A855F7', labelColor: '#6B21A8', barColor: '#A855F7' },
};
const DEFAULT_THEME = { bg: '#F4F6F8', border: '#9CA3AF', labelColor: '#374151', barColor: COLORS.primary };

export default function MachineList({ navigation, route }) {
  const { category, categoryLabel } = route.params;
  const { userProfile }             = useUser();
  const [machines, setMachines]     = useState([]);
  const [loading, setLoading]       = useState(true);

  const theme = MACHINE_THEME[category] || DEFAULT_THEME;

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

  const img   = CATEGORY_IMAGES[category];
  const label = getCategoryLabel(category);

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={machines}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.header}>
            {/* Category hero banner */}
            <View style={[s.heroBanner, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <View style={s.heroImgWrap}>
                {img
                  ? <Image source={img} style={s.heroImg} resizeMode="contain" />
                  : <Text style={s.heroEmoji}>🚜</Text>
                }
              </View>
              <View style={s.heroText}>
                <Text style={[s.heroLabel, { color: theme.labelColor }]}>{categoryLabel}</Text>
                <View style={s.headerMeta}>
                  <View style={s.metaPill}>
                    <Text style={s.metaPillTxt}>📍 {userProfile?.taluk || 'your taluk'}</Text>
                  </View>
                  <View style={[
                    s.metaPill,
                    { backgroundColor: machines.length > 0 ? '#ECFDF5' : '#FEF2F2', marginLeft: 8 },
                  ]}>
                    <Text style={[
                      s.metaPillTxt,
                      { color: machines.length > 0 ? '#065F46' : '#B91C1C' },
                    ]}>
                      {machines.length} available
                    </Text>
                  </View>
                </View>
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
        renderItem={({ item }) => {
          const machineLabel = getCategoryLabel(item.type);
          const machineImg   = CATEGORY_IMAGES[item.type];
          const t            = MACHINE_THEME[item.type] || DEFAULT_THEME;

          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => navigation.navigate('MachineDetails', { machine: item })}
              activeOpacity={0.9}
            >
              {/* Coloured left accent bar */}
              <View style={[s.accentBar, { backgroundColor: t.barColor }]} />

              <View style={s.cardContent}>
                <View style={s.cardTop}>

                  {/* Machine image + name block */}
                  <View style={[s.machineImgBlock, { backgroundColor: t.bg, borderColor: t.border }]}>
                    {machineImg
                      ? <Image source={machineImg} style={s.machineImg} resizeMode="contain" />
                      : <Text style={s.machineEmoji}>🚜</Text>
                    }
                    <Text style={[s.machineImgLabel, { color: t.labelColor }]} numberOfLines={1}>
                      {machineLabel.toUpperCase()}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={s.cardInfo}>
                    <Text style={s.machineTypeName}>{machineLabel}</Text>
                    <View style={s.ownerRow}>
                      <View style={s.ownerAvatar}><Text style={{ fontSize: 13 }}>👤</Text></View>
                      <Text style={s.ownerName} numberOfLines={1}>
                        {item.ownerName || 'Machine Owner'}
                      </Text>
                    </View>
                    <View style={s.pillsRow}>
                      <View style={s.infoPill}>
                        <Text style={s.infoPillTxt}>💰 ₹{item.price_per_hour}/hr</Text>
                      </View>
                      <View style={[s.infoPill, { marginLeft: 6 }]}>
                        <Text style={s.infoPillTxt}>📍 {item.taluk}</Text>
                      </View>
                    </View>
                    {item.ownerPhone ? (
                      <View style={[s.infoPill, { backgroundColor: '#ECFDF5', marginTop: 4, alignSelf: 'flex-start' }]}>
                        <Text style={[s.infoPillTxt, { color: '#065F46' }]}>
                          📞 {item.ownerPhone}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Available badge + arrow */}
                  <View style={s.rightCol}>
                    <View style={s.availBadge}>
                      <View style={s.availDot} />
                      <Text style={s.availTxt}>Ready</Text>
                    </View>
                    <View style={[s.ctaArrow, { backgroundColor: t.barColor }]}>
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
  safe: { flex: 1, backgroundColor: '#F4F6F8' },

  // ── Header banner ──
  header:      { marginBottom: 16 },
  heroBanner:  {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, borderWidth: 1.5,
    padding: 14, marginBottom: 4,
  },
  heroImgWrap: { width: 72, height: 72, marginRight: 14, alignItems: 'center', justifyContent: 'center' },
  heroImg:     { width: 72, height: 62 },
  heroEmoji:   { fontSize: 38 },
  heroText:    { flex: 1 },
  heroLabel:   { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  headerMeta:  { flexDirection: 'row' },
  metaPill:    { backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  metaPillTxt: { fontSize: 12, color: '#1D4ED8', fontWeight: '600' },

  // ── Card ──
  card:        {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 18, marginBottom: 12,
    elevation: 2, overflow: 'hidden',
  },
  accentBar:   { width: 5 },
  cardContent: { flex: 1, padding: 14 },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },

  // Machine image + name
  machineImgBlock: {
    width: 74, height: 80, borderRadius: 12,
    borderWidth: 1.5, alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
    paddingBottom: 4,
  },
  machineImg:      { width: 50, height: 42 },
  machineEmoji:    { fontSize: 28 },
  machineImgLabel: {
    fontSize: 8, fontWeight: '900',
    letterSpacing: 0.4, textAlign: 'center', marginTop: 3,
  },

  // Card info
  cardInfo:    { flex: 1 },
  machineTypeName: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 5 },
  ownerRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  ownerAvatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginRight: 5,
  },
  ownerName:   { fontSize: 12, color: '#374151', fontWeight: '600', flex: 1 },
  pillsRow:    { flexDirection: 'row', flexWrap: 'wrap' },
  infoPill:    {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 3,
  },
  infoPillTxt: { fontSize: 11, color: '#374151', fontWeight: '600' },

  // Right column
  rightCol:    { alignItems: 'center', justifyContent: 'space-between', paddingLeft: 6, minHeight: 70 },
  availBadge:  {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ECFDF5', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 4,
  },
  availDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginRight: 4 },
  availTxt:    { fontSize: 10, color: '#065F46', fontWeight: '700' },
  ctaArrow:    {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaArrowTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },

  ctaHint:     { fontSize: 11, color: '#9CA3AF', textAlign: 'right' },
});
