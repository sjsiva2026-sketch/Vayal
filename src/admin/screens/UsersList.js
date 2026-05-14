// src/admin/screens/UsersList.js
// UPGRADED: Search, filter, lock/unlock, realtime counts

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert, StatusBar, TextInput, Image,
} from 'react-native';
import { useFocusEffect }          from '@react-navigation/native';
import { getDocs, collection, updateDoc, doc } from 'firebase/firestore';
import { db }          from '../../../firebase/config';
import { COLORS }      from '../../../constants/colors';
import { rs, rf, H_PAD } from '../../../utils/responsive';
import { FIcon }       from '../../../utils/icons';
import Loader          from '../../common/components/Loader';
import PhoneConnect    from '../../common/components/PhoneConnect';

const ROLE_CFG = {
  farmer: { icon:'👨‍🌾', color:'#1C7C54', bg:'#DCFCE7', label:'Farmer' },
  owner:  { icon:'🚜',   color:'#F59E0B', bg:'#FFF3CD', label:'Owner'  },
};

export default function UsersList() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [search,   setSearch]   = useState('');
  const [expanded, setExpanded] = useState(null);
  const [actioning,setActioning]= useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db,'users'));
      setUsers(snap.docs.map(d => ({ id:d.id, ...d.data() }))
        .sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)));
    } catch(e){ console.warn(e.message); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleLock = (item) => {
    const nextLock = !item.isLocked;
    Alert.alert(
      nextLock ? '🔒 Lock Account?' : '🔓 Unlock Account?',
      `${nextLock ? 'Lock' : 'Unlock'} ${item.name || item.phone}?`,
      [
        { text:'Cancel', style:'cancel' },
        { text: nextLock ? 'Lock' : 'Unlock', style: nextLock ? 'destructive' : 'default',
          onPress: async () => {
            setActioning(item.id);
            try {
              await updateDoc(doc(db,'users',item.id), { isLocked: nextLock });
              await load();
            } catch(e){ Alert.alert('Error', e.message); }
            finally { setActioning(null); }
          },
        },
      ],
    );
  };

  const handleDelete = (item) => {
    Alert.alert('Delete User?', `Delete ${item.name || item.phone}? This cannot be undone.`, [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: async () => {
          try {
            await updateDoc(doc(db,'users',item.id), { deleted: true, isActive: false });
            await load();
            Alert.alert('Done', 'User marked as deleted.');
          } catch(e){ Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  // Filter + search
  const visible = users.filter(u => {
    if (filter !== 'all' && u.role !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (u.name||'').toLowerCase().includes(q) || (u.phone||'').includes(q) || (u.district||'').toLowerCase().includes(q);
    }
    return true;
  });

  const farmerCount = users.filter(u=>u.role==='farmer').length;
  const ownerCount  = users.filter(u=>u.role==='owner').length;
  const lockedCount = users.filter(u=>u.isLocked).length;

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Stats strip */}
      <View style={s.statsStrip}>
        {[
          { label:'All',     value:users.length,  color:'#374151' },
          { label:'Farmers', value:farmerCount,   color:'#1C7C54' },
          { label:'Owners',  value:ownerCount,    color:'#F59E0B' },
          { label:'Locked',  value:lockedCount,   color:'#EF4444' },
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
          placeholder="Search by name, phone, district..."
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

      {/* Filter tabs */}
      <View style={s.tabRow}>
        {[
          { key:'all',    label:`All (${users.length})` },
          { key:'farmer', label:`Farmers (${farmerCount})` },
          { key:'owner',  label:`Owners (${ownerCount})` },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, filter===tab.key && s.tabActive]}
            onPress={() => { setFilter(tab.key); setExpanded(null); }}
            activeOpacity={0.8}
          >
            <Text style={[s.tabTxt, filter===tab.key && s.tabTxtActive]}>{tab.label}</Text>
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
            <Text style={s.emptyIcon}>👥</Text>
            <Text style={s.emptyTxt}>{search ? 'No results found' : 'No users yet'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg        = ROLE_CFG[item.role] || ROLE_CFG.farmer;
          const isExpanded = expanded === item.id;

          return (
            <View style={s.card}>
              <TouchableOpacity style={s.cardTouch} onPress={() => setExpanded(isExpanded ? null : item.id)} activeOpacity={0.85}>
                <View style={s.cardRow}>
                  {item.profilePhotoUrl ? (
                    <Image source={{ uri:item.profilePhotoUrl }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, s.avatarFb]}>
                      <Text style={{fontSize:rf(22)}}>{cfg.icon}</Text>
                    </View>
                  )}
                  <View style={{flex:1}}>
                    <View style={{flexDirection:'row', alignItems:'center', gap:rs(6)}}>
                      <Text style={s.userName}>{item.name || 'No Name'}</Text>
                      {item.isLocked && <Text style={s.lockBadge}>🔒</Text>}
                    </View>
                    <Text style={s.userPhone}>📞 +91 {item.phone || '—'}</Text>
                    <Text style={s.userLoc}>📍 {item.taluk||'—'}, {item.district||'—'}</Text>
                  </View>
                  <View style={[s.rolePill, {backgroundColor:cfg.bg}]}>
                    <Text style={[s.roleTxt, {color:cfg.color}]}>{cfg.icon} {cfg.label}</Text>
                  </View>
                </View>
                <Text style={s.hint}>{isExpanded ? '▲ Collapse' : '▼ Actions & Details'}</Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={s.expanded}>
                  <PhoneConnect phone={item.phone} name={item.name||'User'} role={cfg.label} />

                  {/* Owner-specific info */}
                  {item.role === 'owner' && (
                    <View style={s.ownerInfo}>
                      <View style={s.infoRow}>
                        <Text style={s.infoKey}>KYC Status</Text>
                        <Text style={[s.infoVal, {color: item.kycStatus==='verified'?'#22C55E': item.kycStatus==='rejected'?'#EF4444':'#F59E0B'}]}>
                          {item.kycStatus || 'not_submitted'}
                        </Text>
                      </View>
                      <View style={s.infoRow}>
                        <Text style={s.infoKey}>Vehicle</Text>
                        <Text style={s.infoVal}>{item.vehicleNumber || '—'}</Text>
                      </View>
                      <View style={s.infoRow}>
                        <Text style={s.infoKey}>Commission Due</Text>
                        <Text style={[s.infoVal, {color:'#F59E0B'}]}>₹{item.commissionAmount || 0}</Text>
                      </View>
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={s.actionRow}>
                    <TouchableOpacity
                      style={[s.actionBtn, item.isLocked ? s.unlockBtn : s.lockBtn, actioning===item.id && {opacity:0.6}]}
                      onPress={() => actioning!==item.id && handleLock(item)}
                      activeOpacity={0.88}
                    >
                      <Text style={s.actionBtnTxt}>{item.isLocked ? '🔓 Unlock' : '🔒 Lock'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, s.deleteBtn]}
                      onPress={() => handleDelete(item)}
                      activeOpacity={0.88}
                    >
                      <Text style={s.actionBtnTxt}>🗑 Delete</Text>
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
  safe:        { flex:1, backgroundColor:'#F4F5F7' },
  statsStrip:  { flexDirection:'row', backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#F0F0F0' },
  stripItem:   { flex:1, alignItems:'center', paddingVertical:rs(12) },
  stripVal:    { fontSize:rf(18), fontWeight:'900' },
  stripLbl:    { fontSize:rf(10), color:'#9CA3AF', marginTop:rs(2) },
  searchWrap:  { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', margin:rs(12), borderRadius:rs(12), paddingHorizontal:rs(14), paddingVertical:rs(10), elevation:1 },
  searchInput: { flex:1, fontSize:rf(14), color:'#111827' },
  tabRow:      { flexDirection:'row', backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#F0F0F0', paddingHorizontal:rs(10), paddingVertical:rs(8) },
  tab:         { paddingHorizontal:rs(14), paddingVertical:rs(6), borderRadius:rs(20), marginRight:rs(6), backgroundColor:'#F4F5F7' },
  tabActive:   { backgroundColor:COLORS.primary },
  tabTxt:      { fontSize:rf(12), fontWeight:'700', color:'#6B7280' },
  tabTxtActive:{ color:'#fff' },
  emptyBox:    { flex:1, alignItems:'center', justifyContent:'center', paddingTop:rs(60) },
  emptyIcon:   { fontSize:rf(40), marginBottom:rs(10) },
  emptyTxt:    { fontSize:rf(15), color:'#6B7280' },
  card:        { backgroundColor:'#fff', borderRadius:rs(16), marginBottom:rs(10), elevation:2, overflow:'hidden' },
  cardTouch:   { padding:rs(14) },
  cardRow:     { flexDirection:'row', alignItems:'center', marginBottom:rs(6) },
  avatar:      { width:rs(48), height:rs(48), borderRadius:rs(24), marginRight:rs(12) },
  avatarFb:    { backgroundColor:'#F4F5F7', alignItems:'center', justifyContent:'center' },
  userName:    { fontSize:rf(14), fontWeight:'800', color:'#111827', marginBottom:rs(2) },
  lockBadge:   { fontSize:rf(14) },
  userPhone:   { fontSize:rf(12), color:COLORS.primary, fontWeight:'600', marginBottom:rs(2) },
  userLoc:     { fontSize:rf(11), color:'#9CA3AF' },
  rolePill:    { borderRadius:rs(10), paddingHorizontal:rs(10), paddingVertical:rs(5) },
  roleTxt:     { fontSize:rf(11), fontWeight:'700' },
  hint:        { fontSize:rf(11), color:'#9CA3AF', textAlign:'center', marginTop:rs(4) },
  expanded:    { borderTopWidth:1, borderTopColor:'#F0F0F0', padding:rs(14) },
  ownerInfo:   { backgroundColor:'#F9FAFB', borderRadius:rs(10), padding:rs(12), marginBottom:rs(12) },
  infoRow:     { flexDirection:'row', justifyContent:'space-between', paddingVertical:rs(6), borderBottomWidth:1, borderBottomColor:'#F0F0F0' },
  infoKey:     { fontSize:rf(12), color:'#6B7280' },
  infoVal:     { fontSize:rf(13), fontWeight:'700', color:'#111827' },
  actionRow:   { flexDirection:'row', gap:rs(10) },
  actionBtn:   { flex:1, borderRadius:rs(10), paddingVertical:rs(12), alignItems:'center' },
  lockBtn:     { backgroundColor:'#FEE2E2', borderWidth:1, borderColor:'#EF4444' },
  unlockBtn:   { backgroundColor:'#DCFCE7', borderWidth:1, borderColor:'#22C55E' },
  deleteBtn:   { backgroundColor:'#F4F5F7', borderWidth:1, borderColor:'#D1D5DB' },
  actionBtnTxt:{ fontSize:rf(13), fontWeight:'700', color:'#374151' },
});
