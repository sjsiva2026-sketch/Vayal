import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  FlatList, TouchableOpacity, Alert,
} from 'react-native';
import { useFocusEffect }    from '@react-navigation/native';
import { getMachinesByOwner, updateMachine, deleteMachine } from '../../../firebase/firestore';
import { useUser }           from '../../../context/UserContext';
import { getCategoryLabel, getCategoryIcon } from '../../../constants/categories';
import EmptyState            from '../../common/components/EmptyState';
import Loader                from '../../common/components/Loader';
import { COLORS }            from '../../../constants/colors';
import { useState } from 'react';

// ─── 4 action icons per machine card ──────────────────────────────────────────
// EDIT · TOGGLE · BOOKINGS · DELETE
// Each uses a coloured circle badge with a caps abbreviation label below

const ACTION_ICONS = [
  {
    key:    'edit',
    icon:   '✏️',
    label:  'EDIT',
    bg:     '#EEF7FF',
    color:  '#1D4ED8',
    border: '#BFDBFE',
  },
  {
    key:    'toggle',
    icon:   '🔄',
    label:  'STATUS',
    bg:     '#F0FDF4',
    color:  '#15803D',
    border: '#BBF7D0',
  },
  {
    key:    'bookings',
    icon:   '📋',
    label:  'REQUESTS',
    bg:     '#FFF9E6',
    color:  '#92400E',
    border: '#FDE68A',
  },
  {
    key:    'delete',
    icon:   '🗑️',
    label:  'DELETE',
    bg:     '#FEF2F2',
    color:  '#B91C1C',
    border: '#FECACA',
  },
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
      .then(snap => {
        setMachines(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleActive = async (m) => {
    await updateMachine(m.id, { isActive: !m.isActive });
    load();
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Machine?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteMachine(id); load(); },
      },
    ]);
  };

  const handleAction = (key, item) => {
    switch (key) {
      case 'edit':
        navigation.navigate('EditMachine', { machine: item });
        break;
      case 'toggle':
        Alert.alert(
          item.isActive ? 'Deactivate Machine?' : 'Activate Machine?',
          item.isActive
            ? 'Farmers won\'t be able to book this machine.'
            : 'This machine will be visible to farmers.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Confirm', onPress: () => toggleActive(item) },
          ],
        );
        break;
      case 'bookings':
        navigation.navigate('BookingRequests');
        break;
      case 'delete':
        handleDelete(item.id);
        break;
    }
  };

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={machines}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => navigation.navigate('AddMachine')}
            activeOpacity={0.88}
          >
            <Text style={s.addTxt}>➕  Add New Machine</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <EmptyState
            icon="🚜"
            title="No machines yet"
            subtitle="Tap above to add your first machine"
          />
        }
        renderItem={({ item }) => {
          const label = getCategoryLabel(item.type);
          const icon  = getCategoryIcon(item.type);
          return (
            <View style={s.card}>

              {/* ── Card Header ── */}
              <View style={s.cardHeader}>
                <View style={s.iconCircle}>
                  <Text style={s.iconCircleTxt}>{icon}</Text>
                </View>
                <View style={s.headerMid}>
                  <Text style={s.machineType}>{label}</Text>
                  <Text style={s.metaRow}>
                    💰 ₹{item.price_per_hour}/hr  ·  📍 {item.taluk}
                  </Text>
                </View>
                {/* Active / Inactive pill */}
                <View style={[
                  s.statusPill,
                  { backgroundColor: item.isActive ? '#DCFCE7' : '#FEE2E2' },
                ]}>
                  <View style={[
                    s.statusDot,
                    { backgroundColor: item.isActive ? COLORS.success : COLORS.error },
                  ]} />
                  <Text style={[
                    s.statusTxt,
                    { color: item.isActive ? '#166534' : '#991B1B' },
                  ]}>
                    {item.isActive ? 'ACTIVE' : 'OFF'}
                  </Text>
                </View>
              </View>

              {/* ── 4 Action Icons ── */}
              <View style={s.actionsRow}>
                {ACTION_ICONS.map((a) => {
                  // Dynamically override toggle appearance based on current state
                  const isToggle = a.key === 'toggle';
                  const bg     = isToggle
                    ? (item.isActive ? '#FEF2F2' : '#F0FDF4')
                    : a.bg;
                  const color  = isToggle
                    ? (item.isActive ? '#B91C1C' : '#15803D')
                    : a.color;
                  const border = isToggle
                    ? (item.isActive ? '#FECACA' : '#BBF7D0')
                    : a.border;
                  const dynIcon  = isToggle
                    ? (item.isActive ? '⏸️' : '▶️')
                    : a.icon;
                  const dynLabel = isToggle
                    ? (item.isActive ? 'PAUSE' : 'RESUME')
                    : a.label;

                  return (
                    <TouchableOpacity
                      key={a.key}
                      style={s.actionItem}
                      onPress={() => handleAction(a.key, item)}
                      activeOpacity={0.75}
                    >
                      <View style={[s.actionCircle, { backgroundColor: bg, borderColor: border }]}>
                        <Text style={s.actionIcon}>{dynIcon}</Text>
                      </View>
                      <Text style={[s.actionLabel, { color }]}>{dynLabel}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.background },

  addBtn:        {
    backgroundColor: COLORS.primary,
    borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 16, elevation: 3,
  },
  addTxt:        { color: '#fff', fontWeight: '800', fontSize: 15 },

  // ── Card ──
  card:          {
    backgroundColor: '#fff',
    borderRadius: 18, padding: 16,
    marginBottom: 14, elevation: 3,
  },

  // ── Card Header ──
  cardHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconCircle:    {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#F4F6F8',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  iconCircleTxt: { fontSize: 26 },
  headerMid:     { flex: 1 },
  machineType:   { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 3 },
  metaRow:       { fontSize: 12, color: COLORS.textSecondary },

  statusPill:    {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot:     { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusTxt:     { fontSize: 11, fontWeight: '800' },

  // ── 4 Action Icons ──
  actionsRow:    {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingTop: 14,
  },
  actionItem:    { flex: 1, alignItems: 'center' },
  actionCircle:  {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  actionIcon:    { fontSize: 20 },
  actionLabel:   { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
});
