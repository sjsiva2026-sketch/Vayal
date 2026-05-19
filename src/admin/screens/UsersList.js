// src/admin/screens/UsersList.js
// PRODUCTION: Block/Unblock + Lock/Unlock + onSnapshot realtime
// Search, filter, confirm dialogs, error handling

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert, StatusBar, TextInput, Image,
  RefreshControl,
} from 'react-native';
import {
  collection, onSnapshot, updateDoc, deleteDoc, doc,
} from 'firebase/firestore';
import { db }        from '../../../firebase/config';
import { COLORS }    from '../../../constants/colors';
import { rs, rf, H_PAD } from '../../../utils/responsive';
import { FIcon }     from '../../../utils/icons';
import Loader        from '../../common/components/Loader';
import PhoneConnect  from '../../common/components/PhoneConnect';

const ROLE_CFG = {
  farmer: { icon:'👨‍🌾', color:'#1C7C54', bg:'#DCFCE7', label:'Farmer' },
  owner:  { icon:'🚜',   color:'#F59E0B', bg:'#FFF3CD', label:'Owner'  },
  admin:  { icon:'🔐',   color:'#8B5CF6', bg:'#EDE9FE', label:'Admin'  },
};

export default function UsersList() {
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [filter,    setFilter]    = useState('all');
  const [search,    setSearch]    = useState('');
  const [expanded,  setExpanded]  = useState(null);
  const [actioning, setActioning] = useState(null);

  // ── Realtime listener ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setUsers(
          snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(u => !u.deleted)
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        );
        setLoading(false);
        setRefreshing(false);
      },
      (e) => {
        Alert.alert('Error', 'Could not load users. Check connection.');
        setLoading(false);
        setRefreshing(false);
      },
    );
    return unsub;
  }, []);

  // ── Lock / Unlock ────────────────────────────────────────────────────────
  const handleLock = (item) => {
    const nextLock = !item.isLocked;
    Alert.alert(
      nextLock ? '🔒 Lock Account?' : '🔓 Unlock Account?',
      `${nextLock ? 'Lock' : 'Unlock'} account for ${item.name || item.phone}?\n\n${nextLock ? 'Owner cannot use the app.' : 'Owner can use the app again.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextLock ? 'Lock' : 'Unlock',
          style: nextLock ? 'destructive' : 'default',
          onPress: async () => {
            setActioning(item.id + '_lock');
            try {
              await updateDoc(doc(db, 'users', item.id), { isLocked: nextLock });
            } catch (e) {
              Alert.alert('Error', e.message || 'Action failed');
            } finally { setActioning(null); }
          },
        },
      ],
    );
  };

  // ── Block / Unblock ──────────────────────────────────────────────────────
  const handleBlock = (item) => {
    const nextBlock = !item.isBlocked;
    Alert.alert(
      nextBlock ? '🚫 Block User?' : '✅ Unblock User?',
      `${nextBlock ? 'Block' : 'Unblock'} ${item.name || item.phone}?\n\n${nextBlock ? 'User cannot login.' : 'User can login again.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextBlock ? 'Block' : 'Unblock',
          style: nextBlock ? 'destructive' : 'default',
          onPress: async () => {
            setActioning(item.id + '_block');
            try {
              await updateDoc(doc(db, 'users', item.id), { isBlocked: nextBlock });
            } catch (e) {
              Alert.alert('Error', e.message || 'Action failed');
            } finally { setActioning(null); }
          },
        },
      ],
    );
  };

  // ── Delete (soft) ────────────────────────────────────────────────────────
  const handleDelete = (item) => {
    Alert.alert(
      '🗑️ Delete User?',
      `Delete ${item.name || item.phone}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setActioning(item.id + '_del');
            try {
              await updateDoc(doc(db, 'users', item.id), {
                deleted: true, isActive: false, isBlocked: true,
              });
            } catch (e) {
              Alert.alert('Error', e.message || 'Delete failed');
            } finally { setActioning(null); }
          },
        },
      ],
    );
  };

  // ── Filter ───────────────────────────────────────────────────────────────
  const visible = users.filter(u => {
    if (filter === 'blocked') return u.isBlocked;
    if (filter === 'locked')  return u.isLocked;
    if (filter !== 'all' && u.role !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (u.name||'').toLowerCase().includes(q)
        || (u.phone||'').includes(q)
        || (u.district||'').toLowerCase().includes(q);
    }
    return true;
  });

  const farmerCount  = users.filter(u => u.role === 'farmer').length;
  const ownerCount   = users.filter(u => u.role === 'owner').length;
  const lockedCount  = users.filter(u => u.isLocked).length;
  const blockedCount = users.filter(u => u.isBlocked).length;

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Stats strip */}
      <View style={s.statsStrip}>
        {[
          { label:'Total',   value:users.length,  color:'#374151' },
          { label:'Farmers', value:farmerCount,   color:'#1C7C54' },
          { label:'Owners',  value:ownerCount,    color:'#F59E0B' },
          { label:'Locked',  value:lockedCount,   color:'#EF4444' },
          { label:'Blocked', value:blockedCount,  color:'#7C3AED' },
        ].map(st => (
          <View key={st.label} style={s.stripItem}>
            <Text style={[s.stripVal, { color: st.color }]}>{st.value}</Text>
            <Text style={s.stripLbl}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <FIcon name="search" size={rs(16)} color="#9CA3AF" fallback="🔍" style={{ marginRight: rs(8) }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search name, phone, district..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
            <Text style={s.clearTxt}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={s.tabRow}>
        {[
          { key:'all',     label:`All (${users.length})` },
          { key:'farmer',  label:`Farmers` },
          { key:'owner',   label:`Owners` },
          { key:'locked',  label:`Locked${lockedCount>0?` (${lockedCount})`:''}`},
          { key:'blocked', label:`Blocked${blockedCount>0?` (${blockedCount})`:''}`},
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, filter === tab.key && s.tabActive]}
            onPress={() => { setFilter(tab.key); setExpanded(null); }}
            activeOpacity={0.8}
          >
            <Text style={[s.tabTxt, filter === tab.key && s.tabTxtActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={visible}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: H_PAD, paddingBottom: rs(40), flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>👥</Text>
            <Text style={s.emptyTxt}>{search ? 'No results' : 'No users'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg        = ROLE_CFG[item.role] || ROLE_CFG.farmer;
          const isExpanded = expanded === item.id;
          const isBlocked  = item.isBlocked === true;
          const isLocked   = item.isLocked  === true;

          return (
            <View style={[s.card, isBlocked && s.cardBlocked]}>
              <TouchableOpacity
                style={s.cardTouch}
                onPress={() => setExpanded(isExpanded ? null : item.id)}
                activeOpacity={0.85}
              >
                <View style={s.cardRow}>
                  {item.profilePhotoUrl ? (
                    <Image source={{ uri: item.profilePhotoUrl }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, s.avatarFb]}>
                      <Text style={{ fontSize: rf(22) }}>{cfg.icon}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={s.nameRow}>
                      <Text style={s.userName}>{item.name || 'No Name'}</Text>
                      {isLocked  && <Text style={s.lockBadge}>🔒</Text>}
                      {isBlocked && <Text style={s.blockBadge}>🚫</Text>}
                    </View>
                    <Text style={s.userPhone}>+91 {item.phone || '—'}</Text>
                    <Text style={s.userLoc}>📍 {item.taluk||'—'}, {item.district||'—'}</Text>
                  </View>
                  <View style={[s.rolePill, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.roleTxt, { color: cfg.color }]}>{cfg.icon} {cfg.label}</Text>
                  </View>
                </View>
                <Text style={s.hint}>{isExpanded ? '▲ Collapse' : '▼ Actions'}</Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={s.expanded}>
                  <PhoneConnect phone={item.phone} name={item.name||'User'} role={cfg.label} />

                  {/* Owner info */}
                  {item.role === 'owner' && (
                    <View style={s.infoBox}>
                      {[
                        { k:'KYC Status',    v:item.kycStatus||'—',          c:item.kycStatus==='verified'?'#22C55E':item.kycStatus==='rejected'?'#EF4444':'#F59E0B' },
                        { k:'Vehicle',       v:item.vehicleNumber||'—',      c:'#111827' },
                        { k:'Commission Due',v:`₹${item.commissionAmount||0}`,c:'#F59E0B' },
                      ].map(row => (
                        <View key={row.k} style={s.infoRow}>
                          <Text style={s.infoKey}>{row.k}</Text>
                          <Text style={[s.infoVal, { color: row.c }]}>{row.v}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={s.actionGrid}>
                    {/* Lock / Unlock */}
                    <TouchableOpacity
                      style={[s.actionBtn, isLocked ? s.btnUnlock : s.btnLock,
                        actioning === item.id+'_lock' && s.btnDisabled]}
                      onPress={() => actioning !== item.id+'_lock' && handleLock(item)}
                      activeOpacity={0.88}
                    >
                      <Text style={s.actionBtnTxt}>
                        {actioning===item.id+'_lock' ? '...' : isLocked ? '🔓 Unlock' : '🔒 Lock'}
                      </Text>
                    </TouchableOpacity>

                    {/* Block / Unblock */}
                    <TouchableOpacity
                      style={[s.actionBtn, isBlocked ? s.btnUnblock : s.btnBlock,
                        actioning === item.id+'_block' && s.btnDisabled]}
                      onPress={() => actioning !== item.id+'_block' && handleBlock(item)}
                      activeOpacity={0.88}
                    >
                      <Text style={s.actionBtnTxt}>
                        {actioning===item.id+'_block' ? '...' : isBlocked ? '✅ Unblock' : '🚫 Block'}
                      </Text>
                    </TouchableOpacity>

                    {/* Delete */}
                    <TouchableOpacity
                      style={[s.actionBtn, s.btnDelete,
                        actioning === item.id+'_del' && s.btnDisabled]}
                      onPress={() => actioning !== item.id+'_del' && handleDelete(item)}
                      activeOpacity={0.88}
                    >
                      <Text style={s.actionBtnTxt}>
                        {actioning===item.id+'_del' ? '...' : '🗑 Delete'}
                      </Text>
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
  stripItem:   { flex:1, alignItems:'center', paddingVertical:rs(10) },
  stripVal:    { fontSize:rf(16), fontWeight:'900' },
  stripLbl:    { fontSize:rf(9), color:'#9CA3AF', marginTop:rs(2) },
  searchWrap:  { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', margin:rs(12), borderRadius:rs(12), paddingHorizontal:rs(14), paddingVertical:rs(10), elevation:1 },
  searchInput: { flex:1, fontSize:rf(14), color:'#111827' },
  clearTxt:    { color:'#9CA3AF', fontSize:rf(15), paddingLeft:rs(8) },
  tabRow:      { flexDirection:'row', backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#F0F0F0', paddingHorizontal:rs(8), paddingVertical:rs(8) },
  tab:         { paddingHorizontal:rs(10), paddingVertical:rs(6), borderRadius:rs(20), marginRight:rs(4), backgroundColor:'#F4F5F7' },
  tabActive:   { backgroundColor:COLORS.primary },
  tabTxt:      { fontSize:rf(10), fontWeight:'700', color:'#6B7280' },
  tabTxtActive:{ color:'#fff' },
  emptyBox:    { flex:1, alignItems:'center', justifyContent:'center', paddingTop:rs(60) },
  emptyIcon:   { fontSize:rf(40), marginBottom:rs(10) },
  emptyTxt:    { fontSize:rf(15), color:'#6B7280' },
  card:        { backgroundColor:'#fff', borderRadius:rs(16), marginBottom:rs(10), elevation:2, overflow:'hidden' },
  cardBlocked: { opacity:0.75, borderLeftWidth:rs(3), borderLeftColor:'#7C3AED' },
  cardTouch:   { padding:rs(14) },
  cardRow:     { flexDirection:'row', alignItems:'center', marginBottom:rs(6) },
  avatar:      { width:rs(46), height:rs(46), borderRadius:rs(23), marginRight:rs(12) },
  avatarFb:    { backgroundColor:'#F4F5F7', alignItems:'center', justifyContent:'center' },
  nameRow:     { flexDirection:'row', alignItems:'center', gap:rs(6), marginBottom:rs(2) },
  userName:    { fontSize:rf(14), fontWeight:'800', color:'#111827' },
  lockBadge:   { fontSize:rf(14) },
  blockBadge:  { fontSize:rf(14) },
  userPhone:   { fontSize:rf(12), color:COLORS.primary, fontWeight:'600', marginBottom:rs(2) },
  userLoc:     { fontSize:rf(11), color:'#9CA3AF' },
  rolePill:    { borderRadius:rs(10), paddingHorizontal:rs(8), paddingVertical:rs(4) },
  roleTxt:     { fontSize:rf(10), fontWeight:'700' },
  hint:        { fontSize:rf(11), color:'#9CA3AF', textAlign:'center', marginTop:rs(4) },
  expanded:    { borderTopWidth:1, borderTopColor:'#F0F0F0', padding:rs(14) },
  infoBox:     { backgroundColor:'#F9FAFB', borderRadius:rs(10), padding:rs(12), marginBottom:rs(12) },
  infoRow:     { flexDirection:'row', justifyContent:'space-between', paddingVertical:rs(6), borderBottomWidth:1, borderBottomColor:'#F0F0F0' },
  infoKey:     { fontSize:rf(12), color:'#6B7280' },
  infoVal:     { fontSize:rf(13), fontWeight:'700' },
  actionGrid:  { flexDirection:'row', gap:rs(8), flexWrap:'wrap' },
  actionBtn:   { flex:1, minWidth:rs(80), borderRadius:rs(10), paddingVertical:rs(11), alignItems:'center', borderWidth:1 },
  btnLock:     { backgroundColor:'#FEE2E2', borderColor:'#EF4444' },
  btnUnlock:   { backgroundColor:'#DCFCE7', borderColor:'#22C55E' },
  btnBlock:    { backgroundColor:'#EDE9FE', borderColor:'#8B5CF6' },
  btnUnblock:  { backgroundColor:'#DCFCE7', borderColor:'#22C55E' },
  btnDelete:   { backgroundColor:'#F4F5F7', borderColor:'#D1D5DB' },
  btnDisabled: { opacity:0.5 },
  actionBtnTxt:{ fontSize:rf(12), fontWeight:'700', color:'#374151' },
});
