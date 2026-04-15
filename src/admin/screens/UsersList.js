import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert } from 'react-native';
import { getDocs, collection, updateDoc, doc } from 'firebase/firestore';
import { db }       from '../../../firebase/config';
import Loader       from '../../common/components/Loader';
import EmptyState   from '../../common/components/EmptyState';
import PhoneConnect from '../../common/components/PhoneConnect';
import { COLORS }   from '../../../constants/colors';

export default function UsersList() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'users'));
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleVerify = async (uid) => {
    await updateDoc(doc(db, 'users', uid), { verified: true });
    load();
    Alert.alert('Verified', 'Owner verified.');
  };
  const handleLock = async (uid, isLocked) => {
    await updateDoc(doc(db, 'users', uid), { isLocked: !isLocked });
    load();
  };

  const filtered = filter === 'all' ? users : users.filter(u => u.role === filter);
  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.filterRow}>
        {['all', 'farmer', 'owner'].map((f, i) => (
          <TouchableOpacity
            key={f}
            style={[s.tab, filter === f && s.tabOn, i > 0 && { marginLeft: 8 }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.tabTxt, filter === f && s.tabTxtOn]}>
              {f === 'all' ? '👥 All' : f === 'farmer' ? '👨‍🌾 Farmers' : '🚜 Owners'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={<EmptyState icon="👥" title="No users found" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => setExpanded(expanded === item.id ? null : item.id)} activeOpacity={0.9}>
            <View style={s.cardHeader}>
              <View style={s.nameRow}>
                <Text style={{ fontSize: 28, marginRight: 10 }}>{item.role === 'farmer' ? '👨‍🌾' : '🚜'}</Text>
                <View>
                  <Text style={s.name}>{item.name || 'No Name'}</Text>
                  <Text style={s.phone}>📞 +91 {item.phone}</Text>
                </View>
              </View>
              <View style={s.badges}>
                {item.isLocked && <View style={[s.badge, { backgroundColor: COLORS.error }]}><Text style={s.badgeTxt}>🔒</Text></View>}
                {item.verified && <View style={[s.badge, { backgroundColor: COLORS.success, marginLeft: 4 }]}><Text style={s.badgeTxt}>✅</Text></View>}
              </View>
            </View>
            <Text style={s.meta}>📍 {item.taluk}, {item.district}</Text>
            {expanded === item.id && (
              <View style={s.expanded}>
                <PhoneConnect phone={item.phone} name={item.name || 'User'} role={item.role === 'farmer' ? 'Farmer' : 'Owner'} />
                <View style={s.actionRow}>
                  {item.role === 'owner' && !item.verified && (
                    <TouchableOpacity style={s.verifyBtn} onPress={() => handleVerify(item.id)}>
                      <Text style={s.actionTxt}>✅ Verify</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[s.lockBtn, { backgroundColor: item.isLocked ? COLORS.success : COLORS.error, marginLeft: (item.role === 'owner' && !item.verified) ? 10 : 0 }]}
                    onPress={() => handleLock(item.id, item.isLocked)}
                  >
                    <Text style={s.actionTxt}>{item.isLocked ? '🔓 Unlock' : '🔒 Lock'}</Text>
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
  filterRow: { flexDirection: 'row', padding: 12 },
  tab:       { flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  tabOn:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabTxt:    { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  tabTxtOn:  { color: COLORS.white },
  card:      { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3 },
  cardHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  nameRow:   { flexDirection: 'row', alignItems: 'center' },
  name:      { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  phone:     { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  badges:    { flexDirection: 'row' },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeTxt:  { fontSize: 11, color: COLORS.white },
  meta:      { fontSize: 12, color: COLORS.textSecondary },
  expanded:  { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  actionRow: { flexDirection: 'row', marginTop: 8 },
  verifyBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  lockBtn:   { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  actionTxt: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  hint:      { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
});
