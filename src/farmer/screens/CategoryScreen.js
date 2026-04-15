import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, FlatList, Dimensions, Image,
} from 'react-native';
import { LinearGradient }  from 'expo-linear-gradient';
import { COLORS }          from '../../../constants/colors';
import { CATEGORIES }      from '../../../constants/categories';
import { CATEGORY_IMAGES } from '../../../assets/index';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

// Visual accent colours per category id
const ACCENT = {
  harvester:    { color1: '#FFF3E0', color2: '#FFE0B2', accent: '#F59E0B' },
  rotavator:    { color1: '#E8F5E9', color2: '#C8E6C9', accent: '#22C55E' },
  cultivator:   { color1: '#E3F2FD', color2: '#BBDEFB', accent: '#3B82F6' },
  strawchopper: { color1: '#F3E5F5', color2: '#E1BEE7', accent: '#A855F7' },
};

const DEFAULT_ACCENT = { color1: '#F4F6F8', color2: '#E5E7EB', accent: '#6B7280' };

export default function CategoryScreen({ navigation }) {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <Text style={s.title}>Machine Types</Text>
        <Text style={s.subtitle}>What Do You Need Today?</Text>
      </View>
      <FlatList
        data={CATEGORIES}
        numColumns={2}
        keyExtractor={item => item.id}
        contentContainerStyle={s.grid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const colors = ACCENT[item.id] || DEFAULT_ACCENT;
          return (
            <TouchableOpacity
              style={[s.card, index % 2 === 0 ? { marginRight: 8 } : { marginLeft: 8 }]}
              onPress={() => navigation.navigate('MachineList', {
                category:      item.id,    // stored id used for Firestore query
                categoryLabel: item.label, // human-readable label for display
              })}
              activeOpacity={0.88}
            >
              <LinearGradient colors={[colors.color1, colors.color2]} style={s.cardGradient}>
                <View style={s.emojiWrap}>
                  {CATEGORY_IMAGES[item.id]
                    ? <Image source={CATEGORY_IMAGES[item.id]} style={s.catImage} resizeMode="cover" />
                    : <Text style={s.emoji}>{item.icon}</Text>
                  }
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardLabel}>{item.label}</Text>
                  <View style={[s.bookBtn, { backgroundColor: colors.accent }]}>
                    <Text style={s.bookBtnTxt}>Find →</Text>
                  </View>
                </View>
                <View style={[s.accentDot, { backgroundColor: colors.accent }]} />
              </LinearGradient>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#F4F6F8' },
  topBar:       { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title:        { fontSize: 26, fontWeight: '900', color: '#111827' },
  subtitle:     { fontSize: 14, color: '#6B7280', marginTop: 4 },
  grid:         { paddingHorizontal: 16, paddingBottom: 32 },
  card:         { width: CARD_W, borderRadius: 22, overflow: 'hidden', marginBottom: 16, elevation: 3 },
  cardGradient: { position: 'relative' },
  emojiWrap:    { width: '100%', height: 120, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  catImage:     { width: '100%', height: '100%' },
  emoji:        { fontSize: 60 },
  cardBody:     { padding: 14 },
  cardLabel:    { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 10 },
  bookBtn:      { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  bookBtnTxt:   { fontSize: 12, color: '#fff', fontWeight: '700' },
  accentDot:    { position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 5 },
});
