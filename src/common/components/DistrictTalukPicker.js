// src/common/components/DistrictTalukPicker.js
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, FlatList,
  TextInput, SafeAreaView, StatusBar,
} from 'react-native';
import { TN_DISTRICTS, getTaluks } from '../../../constants/tamilnadu';
import { COLORS }   from '../../../constants/colors';
import { rs, rf }   from '../../../utils/responsive';
import { FIcon }    from '../../../utils/icons';

function PickerModal({ visible, title, items, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = items.filter(i => i.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={m.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={m.header}>
          <Text style={m.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={m.closeBtn} activeOpacity={0.7}>
            <Text style={m.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={m.searchWrap}>
          <FIcon name="search" size={rs(16)} color="#9CA3AF" fallback="🔍" style={{ marginRight: rs(8) }} />
          <TextInput
            style={m.searchInput}
            placeholder={`Search ${title.toLowerCase()}...`}
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <Text style={{ color: '#9CA3AF', fontSize: rf(15), paddingLeft: rs(8) }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={filtered}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <TouchableOpacity style={m.item} onPress={() => { onSelect(item); setSearch(''); onClose(); }} activeOpacity={0.7}>
              <Text style={m.itemTxt}>{item}</Text>
              <Text style={m.arrow}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={m.empty}>No results found</Text>}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
  );
}

const m = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#fff' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: rs(16), paddingVertical: rs(16), borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  title:       { fontSize: rf(17), fontWeight: '800', color: '#111827' },
  closeBtn:    { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center' },
  closeTxt:    { fontSize: rf(16), color: '#374151', fontWeight: '700' },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F5F7', borderRadius: rs(12), marginHorizontal: rs(16), marginVertical: rs(12), paddingHorizontal: rs(12), paddingVertical: rs(10) },
  searchInput: { flex: 1, fontSize: rf(15), color: '#111827' },
  item:        { flexDirection: 'row', alignItems: 'center', paddingVertical: rs(14), paddingHorizontal: rs(16), borderBottomWidth: 1, borderBottomColor: '#F4F5F7' },
  itemTxt:     { flex: 1, fontSize: rf(15), color: '#111827' },
  arrow:       { fontSize: rf(20), color: '#9CA3AF' },
  empty:       { textAlign: 'center', padding: rs(32), color: '#9CA3AF', fontSize: rf(14) },
});

export default function DistrictTalukPicker({ district, taluk, onDistrictChange, onTalukChange }) {
  const [showDistrict, setShowDistrict] = useState(false);
  const [showTaluk,    setShowTaluk]    = useState(false);
  const taluks = district ? getTaluks(district) : [];

  return (
    <View style={p.wrap}>
      {/* District selector */}
      <View style={p.fieldGroup}>
        <Text style={p.label}>🗺️ District <Text style={p.req}>*</Text></Text>
        <TouchableOpacity
          style={[p.selector, district && p.selectorDone]}
          onPress={() => setShowDistrict(true)}
          activeOpacity={0.85}
        >
          <Text style={[p.selectorTxt, !district && p.placeholder]}>
            {district || 'Select District'}
          </Text>
          <Text style={p.chevron}>{district ? '✓' : '›'}</Text>
        </TouchableOpacity>
      </View>

      {/* Taluk selector */}
      <View style={p.fieldGroup}>
        <Text style={p.label}>📍 Taluk <Text style={p.req}>*</Text></Text>
        <TouchableOpacity
          style={[p.selector, taluk && p.selectorDone, !district && p.selectorDisabled]}
          onPress={() => district && setShowTaluk(true)}
          activeOpacity={district ? 0.85 : 1}
        >
          <Text style={[p.selectorTxt, !taluk && p.placeholder]}>
            {taluk || (district ? 'Select Taluk' : 'Select district first')}
          </Text>
          <Text style={p.chevron}>{taluk ? '✓' : '›'}</Text>
        </TouchableOpacity>
      </View>

      <PickerModal
        visible={showDistrict}
        title="District"
        items={TN_DISTRICTS}
        onSelect={(d) => { onDistrictChange(d); onTalukChange(''); }}
        onClose={() => setShowDistrict(false)}
      />
      <PickerModal
        visible={showTaluk}
        title="Taluk"
        items={taluks}
        onSelect={onTalukChange}
        onClose={() => setShowTaluk(false)}
      />
    </View>
  );
}

const p = StyleSheet.create({
  wrap:             { marginBottom: rs(6) },
  fieldGroup:       { marginBottom: rs(14) },
  label:            { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(8) },
  req:              { color: '#EF4444' },
  selector:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: rs(1.5), borderColor: '#E5E7EB', borderRadius: rs(12), paddingVertical: rs(13), paddingHorizontal: rs(16) },
  selectorDone:     { borderColor: COLORS.primary, backgroundColor: '#FAFFFE' },
  selectorDisabled: { backgroundColor: '#F4F6F8', opacity: 0.6 },
  selectorTxt:      { fontSize: rf(15), fontWeight: '600', color: '#111827', flex: 1 },
  placeholder:      { color: '#C9D1DA', fontWeight: '400' },
  chevron:          { fontSize: rf(18), color: COLORS.primary, fontWeight: '800' },
});
