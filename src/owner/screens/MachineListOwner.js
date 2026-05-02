// src/owner/screens/MachineListOwner.js
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert, Image, StatusBar,
} from 'react-native';
import { useFocusEffect }    from '@react-navigation/native';
import { getMachinesByOwner, updateMachine, deleteMachine } from '../../../firebase/firestore';
import { useUser }           from '../../../context/UserContext';
import { getCategoryLabel }  from '../../../constants/categories';
import { CATEGORY_IMAGES }   from '../../../assets/index';
import { COLORS }            from '../../../constants/colors';
import { rs, rf, H_PAD }     from '../../../utils/responsive';
import { IMG }               from '../../../utils/imageSize';
import { FIcon }             from '../../../utils/icons';
import EmptyState            from '../../common/components/EmptyState';
import Loader                from '../../common/components/Loader';

const THEMES = {
  harvester:    { bg: '#FFF8E7', border: '#F59E0B', lc: '#92400E', bar: '#F59E0B' },
  rotavator:    { bg: '#EFF6FF', border: '#3B82F6', lc: '#1D4ED8', bar: '#3B82F6' },
  cultivator:   { bg: '#F0FDF4', border: '#22C55E', lc: '#166534', bar: '#22C55E' },
  strawchopper: { bg: '#FEF2F2', border: '#EF4444', lc: '#991B1B', bar: '#EF4444' },
};
const DT = { bg: '#F4F6F8', border: '#9CA3AF', lc: '#374151', bar: COLORS.primary };

const ACTIONS = [
  { key: 'edit',     icon: 'edit-2',   label: 'EDIT',     bg: '#EEF7FF', color: '#1D4ED8', border: '#BFDBFE' },
  { key: 'toggle',   icon: 'refresh-cw', label: 'STATUS', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  { key: 'bookings', icon: 'clipboard', label: 'ORDERS',  bg: '#FFF9E6', color: '#92400E', border: '#FDE68A' },
  { key: 'delete',   icon: 'trash-2',  label: 'DELETE',   bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
];

export default function MachineListOwner({ navigation }) {
  const { userProfile }         = useUser();
  const uid                     = userProfile?.id || '';
  const [machines, setMachines] = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(() => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    getMachinesByOwner(uid)
      .then(snap => { setMachines(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); })
      .catch(() => setLoading(false));
  }, [uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleActive = async (m) => { await updateMachine(m.id, { isActive: !m.isActive }); load(); };
  const handleDelete = (id) => {
    Alert.alert('Delete Machine?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteMachine(id); load(); }},
    ]);
  };
  const handleAction = (key, item) => {
    switch (key) {
      case 'edit':     return navigation.navigate('EditMachine', { machine: item });
      case 'toggle':
        Alert.alert(
          item.isActive ? 'Deactivate?' : 'Activate?',
          item.isActive ? "Farmers won't see this machine." : 'Machine will be visible to farmers.',
          [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => toggleActive(item) }]
        ); return;
      case 'bookings': return navigation.navigate('BookingRequests');
      case 'delete':   return handleDelete(item.id);
    }
  };

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <FlatList
        data={machines}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: H_PAD, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('AddMachine')} activeOpacity={0.88}>
            <FIcon name="plus-circle" size={20} color="#fff" fallback="＋" style={{ marginRight: rs(8) }} />
            <Text style={s.addTxt}>Add New Machine</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <EmptyState icon="🚜" title="No machines yet" subtitle="Tap above to add your first machine" />
        }
        renderItem={({ item }) => {
          const label = getCategoryLabel(item.type);
          const img   = CATEGORY_IMAGES[item.type];
          const t     = THEMES[item.type] || DT;

          return (
            <View style={s.card}>
              {/* Left bar */}
              <View style={[s.accentBar, { backgroundColor: t.bar }]} />

              <View style={s.cardInner}>
                {/* Header row */}
                <View style={s.cardHeader}>
                  {/* Image block */}
                  <View style={[s.imageBlock, { backgroundColor: t.bg, borderColor: t.border }]}>
                    {img
                      ? <Image source={img} style={{ width: IMG.CATEGORY_IMG_IN_BOX, height: IMG.CATEGORY_IMG_IN_BOX }} resizeMode="contain" />
                      : <Text style={{ fontSize: rf(28) }}>🚜</Text>
                    }
                    <Text style={[s.imageBlockLabel, { color: t.lc }]} numberOfLines={1}>{label.toUpperCase()}</Text>
                  </View>

                  {/* Info */}
                  <View style={s.headerInfo}>
                    <Text style={s.machineType}>{label}</Text>
                    <Text style={s.metaRow}>💰 ₹{item.price_per_hour}/hr</Text>
                    <Text style={s.metaRow}>📍 {item.taluk}</Text>
                  </View>

                  {/* Active pill */}
                  <View style={[s.statusPill, { backgroundColor: item.isActive ? '#DCFCE7' : '#FEE2E2' }]}>
                    <View style={[s.statusDot, { backgroundColor: item.isActive ? COLORS.success : COLORS.error }]} />
                    <Text style={[s.statusTxt, { color: item.isActive ? '#166534' : '#991B1B' }]}>
                      {item.isActive ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </View>

                {/* 4 action icons */}
                <View style={s.actionsRow}>
                  {ACTIONS.map(a => {
                    const isToggle = a.key === 'toggle';
                    const bg     = isToggle ? (item.isActive ? '#FEF2F2' : '#F0FDF4') : a.bg;
                    const color  = isToggle ? (item.isActive ? '#B91C1C' : '#15803D') : a.color;
                    const border = isToggle ? (item.isActive ? '#FECACA' : '#BBF7D0') : a.border;
                    const dynLabel = isToggle ? (item.isActive ? 'PAUSE' : 'RESUME') : a.label;
                    return (
                      <TouchableOpacity key={a.key} style={s.actionItem} onPress={() => handleAction(a.key, item)} activeOpacity={0.75}>
                        <View style={[s.actionCircle, { backgroundColor: bg, borderColor: border }]}>
                          <FIcon name={a.icon} size={18} color={color} fallback="•" />
                        </View>
                        <Text style={[s.actionLabel, { color }]}>{dynLabel}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: COLORS.background },
  addBtn:          { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: rs(14), padding: rs(16), alignItems: 'center', justifyContent: 'center', marginBottom: rs(16), elevation: 3 },
  addTxt:          { color: '#fff', fontWeight: '800', fontSize: rf(15) },
  card:            { flexDirection: 'row', backgroundColor: '#fff', borderRadius: rs(18), marginBottom: rs(14), elevation: 3, overflow: 'hidden' },
  accentBar:       { width: rs(5) },
  cardInner:       { flex: 1, padding: rs(14) },
  cardHeader:      { flexDirection: 'row', alignItems: 'center', marginBottom: rs(14) },
  imageBlock:      { width: rs(76), borderRadius: rs(14), borderWidth: rs(1.5), alignItems: 'center', justifyContent: 'center', marginRight: rs(12), paddingVertical: rs(10), paddingHorizontal: rs(4) },
  imageBlockLabel: { fontSize: rf(9), fontWeight: '800', textAlign: 'center', marginTop: rs(4) },
  headerInfo:      { flex: 1 },
  machineType:     { fontSize: rf(16), fontWeight: '800', color: COLORS.textPrimary, marginBottom: rs(4) },
  metaRow:         { fontSize: rf(12), color: COLORS.textSecondary, marginTop: rs(2) },
  statusPill:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(10), paddingVertical: rs(5), borderRadius: rs(20), alignSelf: 'flex-start' },
  statusDot:       { width: rs(7), height: rs(7), borderRadius: rs(4), marginRight: rs(5) },
  statusTxt:       { fontSize: rf(11), fontWeight: '800' },
  actionsRow:      { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: rs(14) },
  actionItem:      { flex: 1, alignItems: 'center' },
  actionCircle:    { width: rs(44), height: rs(44), borderRadius: rs(22), borderWidth: rs(1.5), alignItems: 'center', justifyContent: 'center', marginBottom: rs(6) },
  actionLabel:     { fontSize: rf(10), fontWeight: '800' },
});
