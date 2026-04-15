import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, FlatList, TextInput, SafeAreaView, StatusBar,
} from 'react-native';
import { TN_DISTRICTS, getTaluks } from '../../../constants/tamilnadu';
import { COLORS } from '../../../constants/colors';

function PickerModal({ visible, title, items, selected, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = search.trim()
    ? items.filter(i => i.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={m.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#145A3E" />
        <View style={m.header}>
          <TouchableOpacity onPress={onClose} style={m.closeBtn}>
            <Text style={m.closeTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={m.title} numberOfLines={1}>{title}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={m.searchWrap}>
          <Text style={m.searchIcon}>🔍</Text>
          <TextInput
            style={m.searchInput}
            placeholder="Search…"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={m.clearTxt}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={m.countTxt}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</Text>
        <FlatList
          data={filtered}
          keyExtractor={item => item}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSel = item === selected;
            return (
              <TouchableOpacity
                style={[m.item, isSel && m.itemSelected]}
                onPress={() => { onSelect(item); onClose(); setSearch(''); }}
                activeOpacity={0.75}
              >
                <Text style={[m.itemTxt, isSel && m.itemTxtSelected]}>{item}</Text>
                {isSel && <Text style={m.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={m.empty}>
              <Text style={m.emptyEmoji}>🔍</Text>
              <Text style={m.emptyTxt}>No results for "{search}"</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

export default function DistrictTalukPicker({ district, taluk, onDistrictChange, onTalukChange }) {
  const [showDistrict, setShowDistrict] = useState(false);
  const [showTaluk,    setShowTaluk]    = useState(false);
  const taluks = getTaluks(district);

  const handleDistrictSelect = (d) => {
    onDistrictChange(d);
    onTalukChange('');
  };

  return (
    <View>
      {/* District */}
      <View style={s.group}>
        <View style={s.labelRow}>
          <Text style={s.labelIcon}>🗺️</Text>
          <Text style={s.labelTxt}>District <Text style={s.req}>*</Text></Text>
        </View>
        <TouchableOpacity
          style={[s.selector, district ? s.selectorDone : null]}
          onPress={() => setShowDistrict(true)}
          activeOpacity={0.85}
        >
          <Text style={district ? s.selectorValue : s.selectorPlaceholder} numberOfLines={1}>
            {district || 'Tap to select district…'}
          </Text>
          <View style={[s.badge, district ? s.badgeDone : null]}>
            <Text style={[s.badgeTxt, district ? s.badgeTxtDone : null]}>
              {district ? '✓' : '▾'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Taluk — shown only after district selected */}
      {district ? (
        <View style={s.group}>
          <View style={s.labelRow}>
            <Text style={s.labelIcon}>📍</Text>
            <Text style={s.labelTxt}>Taluk <Text style={s.req}>*</Text></Text>
          </View>
          <TouchableOpacity
            style={[s.selector, taluk ? s.selectorDone : null]}
            onPress={() => setShowTaluk(true)}
            activeOpacity={0.85}
          >
            <Text style={taluk ? s.selectorValue : s.selectorPlaceholder} numberOfLines={1}>
              {taluk || `Select taluk in ${district}…`}
            </Text>
            <View style={[s.badge, taluk ? s.badgeDone : null]}>
              <Text style={[s.badgeTxt, taluk ? s.badgeTxtDone : null]}>
                {taluk ? '✓' : '▾'}
              </Text>
            </View>
          </TouchableOpacity>
          <Text style={s.hint}>{taluks.length} taluks in {district}</Text>
        </View>
      ) : (
        <View style={s.lockedBox}>
          <Text style={s.lockedIcon}>📍</Text>
          <Text style={s.lockedTxt}>  Select a district first to see taluks</Text>
        </View>
      )}

      <PickerModal
        visible={showDistrict}
        title="Select District"
        items={TN_DISTRICTS}
        selected={district}
        onSelect={handleDistrictSelect}
        onClose={() => setShowDistrict(false)}
      />
      <PickerModal
        visible={showTaluk}
        title={`Taluks in ${district}`}
        items={taluks}
        selected={taluk}
        onSelect={onTalukChange}
        onClose={() => setShowTaluk(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  group:               { marginBottom: 16 },
  labelRow:            { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  labelIcon:           { fontSize: 18, marginRight: 8 },
  labelTxt:            { fontSize: 14, fontWeight: '700', color: '#374151' },
  req:                 { color: '#EF4444' },
  selector:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 2, borderColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 14 },
  selectorDone:        { borderColor: COLORS.primary, backgroundColor: '#FAFFFE' },
  selectorPlaceholder: { flex: 1, fontSize: 15, color: '#9CA3AF', marginRight: 10 },
  selectorValue:       { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827', marginRight: 10 },
  badge:               { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  badgeDone:           { backgroundColor: COLORS.primary },
  badgeTxt:            { fontSize: 14, color: '#6B7280', fontWeight: '700' },
  badgeTxtDone:        { color: '#fff' },
  hint:                { fontSize: 12, color: '#9CA3AF', marginTop: 5 },
  lockedBox:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, borderWidth: 2, borderColor: '#E5E7EB', marginBottom: 16 },
  lockedIcon:          { fontSize: 18, opacity: 0.35 },
  lockedTxt:           { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },
});

const m = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#fff' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#145A3E', paddingHorizontal: 16, paddingVertical: 14 },
  closeBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:        { color: '#fff', fontSize: 16, fontWeight: '700' },
  title:           { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#fff' },
  searchWrap:      { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', paddingHorizontal: 14 },
  searchIcon:      { fontSize: 16, marginRight: 10 },
  searchInput:     { flex: 1, paddingVertical: 13, fontSize: 15, color: '#111827' },
  clearTxt:        { fontSize: 16, color: '#9CA3AF', paddingLeft: 8 },
  countTxt:        { fontSize: 12, color: '#9CA3AF', paddingHorizontal: 16, marginBottom: 4 },
  item:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemSelected:    { backgroundColor: '#ECFDF5' },
  itemTxt:         { fontSize: 15, color: '#374151' },
  itemTxtSelected: { fontWeight: '700', color: COLORS.primary },
  checkmark:       { fontSize: 18, color: COLORS.primary, fontWeight: '900' },
  empty:           { alignItems: 'center', paddingTop: 60 },
  emptyEmoji:      { fontSize: 40, marginBottom: 12 },
  emptyTxt:        { fontSize: 15, color: '#9CA3AF' },
});
