// src/farmer/screens/CategoryScreen.js
// Images: harvester/rotavator/cultivator/straw_chopper.png (512×512px each)
// Pixel-accurate sizes from IMG constants

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, TextInput, ScrollView, Image, Dimensions,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { CATEGORY_IMAGES } from '../../../assets/index';
import { FIcon }           from '../../../utils/icons';
import { IMG }             from '../../../utils/imageSize';

const PRIMARY      = '#1C7C54';
const { width: W } = Dimensions.get('window');
const scale        = W / 375;
const rf           = (dp) => Math.round(dp * scale);

// BOX_W from IMG — (W - 32dp - 12dp) / 2
const BOX_W = IMG.CATEGORY_BOX_W;

const CATEGORIES = [
  {
    id: 'harvester',
    label: 'Harvester',
    tamil: 'அறுவடை இயந்திரம்',
    imageKey: 'harvester',
    bg: '#FFF8E7',
    border: '#F59E0B',
    iconBg: '#FEF3C7',
  },
  {
    id: 'rotavator',
    label: 'Rotavator',
    tamil: 'உழவு இயந்திரம்',
    imageKey: 'rotavator',
    bg: '#E8F5EE',
    border: '#1C7C54',
    iconBg: '#D1FAE5',
  },
  {
    id: 'cultivator',
    label: 'Cultivator',
    tamil: 'பண்படுத்தி',
    imageKey: 'cultivator',
    bg: '#EEF3FF',
    border: '#6366F1',
    iconBg: '#E0E7FF',
  },
  {
    id: 'strawchopper',
    label: 'Straw Chopper',
    tamil: 'வைக்கோல் வெட்டி',
    imageKey: 'strawchopper',
    bg: '#FFF0F0',
    border: '#EF4444',
    iconBg: '#FEE2E2',
  },
];

export default function CategoryScreen({ navigation }) {
  const [search, setSearch] = useState('');

  const filtered = CATEGORIES.filter(c =>
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.tamil.includes(search)
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Find Machine</Text>
          <Text style={s.headerSub}>Select a machine category</Text>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <FIcon name="search" size={18} color="#9CA3AF" fallback="🔍" style={{ marginRight: 10 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search machines..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <Text style={{ fontSize: 16, color: '#9CA3AF', paddingLeft: 8 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>🔍</Text>
              <Text style={s.emptyTitle}>No results found</Text>
              <Text style={s.emptySub}>Try a different search term</Text>
            </View>
          ) : (
            // 2×2 grid — flexWrap, 2 boxes per row
            <View style={s.grid}>
              {filtered.map(cat => {
                const imgSrc = CATEGORY_IMAGES[cat.imageKey];
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[s.box, { width: BOX_W, backgroundColor: cat.bg, borderColor: cat.border }]}
                    onPress={() => navigation.navigate('MachineList', { category: cat.id, categoryLabel: cat.label })}
                    activeOpacity={0.88}
                  >
                    {/*
                      Image circle:
                      - Container: IMG.CATEGORY_CIRCLE dp (56% of box width)
                      - Image: IMG.CATEGORY_IMG_IN_BOX dp (70% of circle)
                      - Source: 512×512px
                      - Rendered: ~195px at xxhdpi → very sharp vs 512px source ✅
                    */}
                    <View style={[
                      s.imageCircle,
                      {
                        width: IMG.CATEGORY_CIRCLE,
                        height: IMG.CATEGORY_CIRCLE,
                        borderRadius: IMG.CATEGORY_CIRCLE / 2,
                        backgroundColor: cat.iconBg,
                      }
                    ]}>
                      {imgSrc ? (
                        <Image
                          source={imgSrc}
                          style={{
                            width: IMG.CATEGORY_IMG_IN_BOX,
                            height: IMG.CATEGORY_IMG_IN_BOX,
                          }}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={{ fontSize: rf(32) }}>🚜</Text>
                      )}
                    </View>

                    <Text style={[s.boxLabel, { color: cat.border }]}>{cat.label}</Text>
                    <Text style={s.boxTamil}>{cat.tamil}</Text>

                    <View style={[s.arrowPill, { backgroundColor: cat.iconBg }]}>
                      <Text style={[s.arrowTxt, { color: cat.border }]}>Browse →</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#F4F6F8' },
  header:       { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle:  { fontSize: rf(22), fontWeight: '900', color: '#111827' },
  headerSub:    { fontSize: rf(13), color: '#6B7280', marginTop: 2 },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16, marginTop: 14, marginBottom: 14, paddingHorizontal: 14, paddingVertical: 12, elevation: 2 },
  searchInput:  { flex: 1, fontSize: rf(15), color: '#111827' },
  scroll:       { paddingHorizontal: 16, paddingTop: 4 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  box:          { borderRadius: 18, padding: 18, marginBottom: 12, alignItems: 'center', borderWidth: 1.5, elevation: 3 },
  imageCircle:  { alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' },
  boxLabel:     { fontSize: rf(15), fontWeight: '800', textAlign: 'center', marginBottom: 3 },
  boxTamil:     { fontSize: rf(11), color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  arrowPill:    { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  arrowTxt:     { fontSize: rf(12), fontWeight: '700' },
  emptyWrap:    { alignItems: 'center', paddingTop: 60 },
  emptyEmoji:   { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: rf(18), fontWeight: '800', color: '#111827', marginBottom: 6 },
  emptySub:     { fontSize: rf(13), color: '#9CA3AF' },
});
