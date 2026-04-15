import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert } from 'react-native';
import { getDocs, collection, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db }       from '../../../firebase/config';
import PhoneConnect from '../../common/components/PhoneConnect';
import Loader       from '../../common/components/Loader';
import EmptyState   from '../../common/components/EmptyState';
import { COLORS }   from '../../../constants/colors';

export default function MachinesList() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'machines'));
    setMachines(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleToggle = async (id, current) => {
    await updateDoc(doc(db, 'machines', id), { isActive: !current });
    load();
  };
  const handleDelete = (id) => {
    Alert.alert('Delete?', 'Cannot be undone.', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDoc(doc(db, 'machines', id)); load(); } },
    ]);
  };

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={machines}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListHeaderComponent={<Text style={s.header}>🚜 All Machines ({machines.length})</Text>}
        ListEmptyComponent={<EmptyState icon="🚜" title="No machines registered" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => setExpanded(expanded === item.id ? null : item.id)} activeOpacity={0.9}>
            <View style={s.cardHeader}>
              <Text style={s.type}>{item.type}</Text>
              <View style={[s.badge, { backgroundColor: item.isActive ? COLORS.success : COLORS.error }]}>
                <Text style={s.badgeTxt}>{item.isActive ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>
            <Text style={s.meta}>💰 ₹{item.price_per_hour}/hr  ·  📍 {item.taluk}</Text>
            <Text style={s.meta}>Owner: {item.ownerName || '—'}</Text>
            {item.ownerPhone && <Text style={s.phone}>📞 +91 {item.ownerPhone}</Text>}
            {expanded === item.id && (
              <View style={s.expanded}>
                {item.ownerPhone && <PhoneConnect phone={item.ownerPhone} name={item.ownerName || 'Owner'} role="Machine Owner 🚜" />}
                <View style={s.actionRow}>
                  <TouchableOpacity style={[s.toggleBtn, { backgroundColor: item.isActive ? COLORS.error : COLORS.success }]} onPress={() => handleToggle(item.id, item.isActive)}>
                    <Text style={s.actionTxt}>{item.isActive ? '❌ Deactivate' : '✅ Activate'}</Text>
                  </TouchableOpacity>
                  <View style={{ width: 10 }} />
                  <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item.id)}>
                    <Text style={s.actionTxt}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <Text style={s.hint}>{expanded === item.id ? '▲ Collapse' : '▼ Details & Actions'}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: COLORS.background },
  header:    { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  card:      { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3 },
  cardHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  type:      { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  badge:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTxt:  { fontSize: 11, color: COLORS.white, fontWeight: '700' },
  meta:      { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  phone:     { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  expanded:  { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  actionRow: { flexDirection: 'row', marginTop: 8 },
  toggleBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  deleteBtn: { flex: 1, backgroundColor: COLORS.error, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  actionTxt: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  hint:      { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
});
