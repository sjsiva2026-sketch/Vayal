// src/admin/screens/MachinesList.js
// UPGRADED: Search, filter, realtime onSnapshot, responsive UI

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert, StatusBar, TextInput,
} from 'react-native';
import { useFocusEffect }                from '@react-navigation/native';
import { onSnapshot, collection, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db }          from '../../../firebase/config';
import PhoneConnect    from '../../common/components/PhoneConnect';
import Loader          from '../../common/components/Loader';
import { COLORS }      from '../../../constants/colors';
import { rs, rf, H_PAD } from '../../../utils/responsive';
import { FIcon }       from '../../../utils/icons';

const TYPE_ICONS = { harvester:'🌾', rotavator:'🚜', cultivator:'🌱', strawchopper:'🌿' };

export default function MachinesList() {
  const [machines,  setMachines]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all');
  const [expanded,  setExpanded]  = useState(null);
  const [actioning, setActioning] = useState(null);

  // Realtime listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'machines'), (snap) => {
      setMachines(snap.docs.map(d => ({ id:d.id, ...d.data() }))
        .sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)));
      setLoading(false);
    }, (e) => { console.warn('MachinesList:', e.message); setLoading(false); });
    return unsub;
  }, []);

  const handleToggle = async (item) => {
    setActioning(item.id);
    try {
      await updateDoc(doc(db,'machines',item.id), { isActive: !item.isActive });
    } catch(e) { Alert.alert('Error', e.message); }
    finally { setActioning(null); }
  };

  const handleDelete = (item) => {
    Alert.alert(
      '🗑️ Delete Machine?',
      `Delete ${item.type || 'this machine'}? This cannot be undone.`,
      [
        { text:'Cancel', style:'cancel' },
        { text:'Delete', style:'destructive', onPress: async () => {
            setActioning(item.id);
            try {
              await deleteDoc(doc(db,'machines',item.id));
            } catch(e) { Alert.alert('Error', e.message); }
            finally { setActioning(null); }
          },
        },
      ],
    );
  };

  const TYPES = ['all', ...new Set(machines.map(m => m.type).filter(Boolean))];

  const visible = machines.filter(m => {
    if (filter !== 'all' && m.type !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (m.type||'').toLowerCase().includes(q)
        || (m.ownerName||'').toLowerCase().includes(q)
        || (m.taluk||'').toLowerCase().includes(q)
        || (m.district||'').toLowerCase().includes(q);
    }
    return true;
  });

  const activeCount   = machines.filter(m=>m.isActive).length;
  const inactiveCount = machines.filter(m=>!m.isActive).length;

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Stats strip */}
      <View style={s.statsStrip}>
        {[
          { label:'Total',    value:machines.length,  color:'#374151' },
          { label:'Active',   value:activeCount,       color:'#22C55E' },
          { label:'Inactive', value:inactiveCount,     color:'#EF4444' },
        ].map(st => (
          <View key={st.label} style={s.stripItem}>
            <Text style={[s.stripVal,{color:st.color}]}>{st.value}</Text>
            <Text style={s.stripLbl}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <FIcon name="search" size={rs(16)} color="#9CA3AF" fallback="🔍" style={{marginRight:rs(8)}} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by type, owner, taluk..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
            <Text style={{color:'#9CA3AF',fontSize:rf(15),paddingLeft:rs(8)}}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Type filter */}
      <View style={s.filterRow}>
        {TYPES.slice(0,5).map(type => (
          <TouchableOpacity
            key={type}
            style={[s.filterTab, filter===type && s.filterTabActive]}
            onPress={() => { setFilter(type); setExpanded(null); }}
            activeOpacity={0.8}
          >
            <Text style={[s.filterTxt, filter===type && s.filterTxtActive]}>
              {type==='all' ? `All (${machines.length})` : `${TYPE_ICONS[type]||'🚜'} ${type}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={visible}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding:H_PAD, paddingBottom:rs(40), flexGrow:1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>🚜</Text>
            <Text style={s.emptyTxt}>{search ? 'No results' : 'No machines registered'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded  = expanded === item.id;
          const isActioning = actioning === item.id;
          const icon = TYPE_ICONS[item.type] || '🚜';

          return (
            <View style={s.card}>
              <TouchableOpacity style={s.cardTouch} onPress={() => setExpanded(isExpanded ? null : item.id)} activeOpacity={0.85}>
                <View style={s.cardRow}>
                  <View style={s.typeIconWrap}>
                    <Text style={s.typeIcon}>{icon}</Text>
                  </View>
                  <View style={{flex:1}}>
                    <View style={{flexDirection:'row', alignItems:'center', gap:rs(6)}}>
                      <Text style={s.machineType}>{item.type || '—'}</Text>
                      <View style={[s.statusBadge, {backgroundColor: item.isActive ? '#DCFCE7' : '#F3F4F6'}]}>
                        <Text style={[s.statusTxt, {color: item.isActive ? '#065F46' : '#6B7280'}]}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    <Text style={s.machineOwner}>👤 {item.ownerName || '—'}</Text>
                    <Text style={s.machineMeta}>📍 {item.taluk||'—'}, {item.district||'—'}  ·  💰 ₹{item.price_per_hour||0}/hr</Text>
                  </View>
                </View>
                <Text style={s.hint}>{isExpanded ? '▲ Collapse' : '▼ Actions'}</Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={s.expanded}>
                  {item.ownerPhone && (
                    <PhoneConnect phone={item.ownerPhone} name={item.ownerName||'Owner'} role="Machine Owner 🚜" />
                  )}
                  <View style={s.actionRow}>
                    <TouchableOpacity
                      style={[s.toggleBtn, { backgroundColor: item.isActive ? '#FEE2E2' : '#DCFCE7' }, isActioning && {opacity:0.6}]}
                      onPress={() => !isActioning && handleToggle(item)}
                      activeOpacity={0.88}
                    >
                      <Text style={[s.toggleTxt, { color: item.isActive ? '#B91C1C' : '#065F46' }]}>
                        {isActioning ? 'Processing...' : item.isActive ? '❌ Deactivate' : '✅ Activate'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.deleteBtn, isActioning && {opacity:0.6}]}
                      onPress={() => !isActioning && handleDelete(item)}
                      activeOpacity={0.88}
                    >
                      <Text style={s.deleteTxt}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex:1, backgroundColor:'#F4F5F7' },
  statsStrip:     { flexDirection:'row', backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#F0F0F0' },
  stripItem:      { flex:1, alignItems:'center', paddingVertical:rs(12) },
  stripVal:       { fontSize:rf(18), fontWeight:'900' },
  stripLbl:       { fontSize:rf(10), color:'#9CA3AF', marginTop:rs(2) },
  searchWrap:     { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', margin:rs(12), borderRadius:rs(12), paddingHorizontal:rs(14), paddingVertical:rs(10), elevation:1 },
  searchInput:    { flex:1, fontSize:rf(14), color:'#111827' },
  filterRow:      { flexDirection:'row', backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#F0F0F0', paddingHorizontal:rs(10), paddingVertical:rs(8) },
  filterTab:      { paddingHorizontal:rs(12), paddingVertical:rs(6), borderRadius:rs(20), marginRight:rs(6), backgroundColor:'#F4F5F7' },
  filterTabActive:{ backgroundColor:COLORS.primary },
  filterTxt:      { fontSize:rf(11), fontWeight:'700', color:'#6B7280' },
  filterTxtActive:{ color:'#fff' },
  emptyBox:       { flex:1, alignItems:'center', justifyContent:'center', paddingTop:rs(60) },
  emptyIcon:      { fontSize:rf(40), marginBottom:rs(10) },
  emptyTxt:       { fontSize:rf(15), color:'#6B7280' },
  card:           { backgroundColor:'#fff', borderRadius:rs(16), marginBottom:rs(10), elevation:2, overflow:'hidden' },
  cardTouch:      { padding:rs(14) },
  cardRow:        { flexDirection:'row', alignItems:'center', marginBottom:rs(6) },
  typeIconWrap:   { width:rs(44), height:rs(44), borderRadius:rs(12), backgroundColor:'#E8F5EE', alignItems:'center', justifyContent:'center', marginRight:rs(12) },
  typeIcon:       { fontSize:rf(22) },
  machineType:    { fontSize:rf(14), fontWeight:'800', color:'#111827', marginBottom:rs(2) },
  statusBadge:    { borderRadius:rs(8), paddingHorizontal:rs(8), paddingVertical:rs(3) },
  statusTxt:      { fontSize:rf(10), fontWeight:'700' },
  machineOwner:   { fontSize:rf(12), color:'#6B7280', marginBottom:rs(2) },
  machineMeta:    { fontSize:rf(11), color:'#9CA3AF' },
  hint:           { fontSize:rf(11), color:'#9CA3AF', textAlign:'center', marginTop:rs(4) },
  expanded:       { borderTopWidth:1, borderTopColor:'#F0F0F0', padding:rs(14) },
  actionRow:      { flexDirection:'row', gap:rs(10), marginTop:rs(8) },
  toggleBtn:      { flex:1, borderRadius:rs(10), paddingVertical:rs(12), alignItems:'center', borderWidth:1, borderColor:'transparent' },
  toggleTxt:      { fontSize:rf(13), fontWeight:'700' },
  deleteBtn:      { flex:1, backgroundColor:'#FEE2E2', borderRadius:rs(10), paddingVertical:rs(12), alignItems:'center', borderWidth:1, borderColor:'#EF4444' },
  deleteTxt:      { fontSize:rf(13), fontWeight:'700', color:'#B91C1C' },
});
