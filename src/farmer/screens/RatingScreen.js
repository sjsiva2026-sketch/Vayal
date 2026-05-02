// src/farmer/screens/RatingScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, Alert, ScrollView, StatusBar,
} from 'react-native';
import { submitRating }   from '../../../firebase/firestore';
import { useUser }        from '../../../context/UserContext';
import { COLORS }         from '../../../constants/colors';
import { rs, rf, H_PAD }  from '../../../utils/responsive';
import { FIcon }          from '../../../utils/icons';
import Loader             from '../../common/components/Loader';
import Button             from '../../common/components/Button';

const ASPECTS = [
  { key: 'punctuality', label: '⏰ Punctuality',  desc: 'Arrived on time to the field' },
  { key: 'workQuality', label: '🚜 Work Quality', desc: 'Quality of machine work done' },
  { key: 'behaviour',   label: '🤝 Behaviour',    desc: 'Polite and professional conduct' },
];

function StarRow({ value, onChange }) {
  return (
    <View style={sr.row}>
      {[1,2,3,4,5].map(star => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.7} style={sr.starBtn}>
          <Text style={[sr.star, star <= value && sr.starFilled]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const sr = StyleSheet.create({
  row:        { flexDirection: 'row', gap: rs(6) },
  starBtn:    { padding: rs(4) },
  star:       { fontSize: rf(28), color: '#D1D5DB' },
  starFilled: { color: '#F59E0B' },
});

export default function RatingScreen({ navigation, route }) {
  const { booking }     = route.params;
  const { userProfile } = useUser();
  const [ratings, setRatings] = useState({ punctuality: 0, workQuality: 0, behaviour: 0 });
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const vals    = Object.values(ratings).filter(v => v > 0);
  const overall = vals.length ? (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1) : 0;

  const handleSubmit = async () => {
    const missing = ASPECTS.filter(a => ratings[a.key] === 0);
    if (missing.length) { Alert.alert('⭐ Rate All Areas', `Please rate: ${missing.map(a => a.label).join(', ')}`); return; }
    setLoading(true);
    try {
      await submitRating({
        bookingId: booking.id, farmerId: userProfile?.id || booking.farmerId,
        farmerName: userProfile?.name || booking.farmerName || '',
        ownerId: booking.ownerId, ownerName: booking.ownerName || '',
        machineId: booking.machineId, machineType: booking.machineTypeLabel || booking.machineType,
        date: booking.date, ...ratings, overall: parseFloat(overall), comment: comment.trim(),
      });
      Alert.alert('🙏 Thank You!', 'Your rating has been submitted.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not submit rating. Try again.');
    } finally { setLoading(false); }
  };

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <FIcon name="arrow-left" size={22} color="#111827" fallback="←" />
          </TouchableOpacity>
        </View>
        <Text style={s.headerTitle}>Rate Experience</Text>
        <View style={{ width: rs(40) }} />
      </View>
      <View style={s.divider} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Summary card */}
        <View style={s.summaryCard}>
          <Text style={s.summaryMachine}>🚜 {booking.machineTypeLabel || booking.machineType}</Text>
          <Text style={s.summaryMeta}>📅 {booking.date}  ·  ✅ {booking.hectareCompleted || booking.hectareRequested} ha</Text>
          {booking.ownerName && <Text style={s.summaryMeta}>👤 {booking.ownerName}</Text>}
        </View>

        {/* Overall */}
        {parseFloat(overall) > 0 && (
          <View style={s.overallCard}>
            <Text style={s.overallLabel}>Overall Rating</Text>
            <Text style={s.overallScore}>{overall} ⭐</Text>
          </View>
        )}

        {/* Aspect ratings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Rate Each Area</Text>
          {ASPECTS.map(a => (
            <View key={a.key} style={s.aspectCard}>
              <View style={s.aspectTop}>
                <Text style={s.aspectLabel}>{a.label}</Text>
                <Text style={s.aspectScore}>{ratings[a.key] > 0 ? `${ratings[a.key]}/5` : '—'}</Text>
              </View>
              <Text style={s.aspectDesc}>{a.desc}</Text>
              <StarRow value={ratings[a.key]} onChange={val => setRatings(prev => ({ ...prev, [a.key]: val }))} />
            </View>
          ))}
        </View>

        {/* Comment */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Comments <Text style={s.opt}>(optional)</Text></Text>
          <TextInput
            style={s.textArea}
            placeholder="Share your experience..."
            placeholderTextColor={COLORS.textSecondary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{comment.length}/300</Text>
        </View>

        {/* Buttons */}
        <View style={s.section}>
          <Button title="⭐ Submit Rating" onPress={handleSubmit} />
          <TouchableOpacity style={s.skipBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={s.skipTxt}>Skip for now</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: rs(32) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#fff' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: H_PAD, paddingVertical: rs(14) },
  headerLeft:   {},
  backBtn:      { width: rs(38), height: rs(38), borderRadius: rs(19), backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: rf(18), fontWeight: '800', color: '#111827' },
  divider:      { height: 1, backgroundColor: COLORS.border },
  scroll:       { paddingBottom: rs(32) },
  summaryCard:  { backgroundColor: '#fff', marginHorizontal: H_PAD, marginTop: rs(16), borderRadius: rs(14), padding: rs(16), elevation: 2, borderWidth: 1, borderColor: COLORS.border },
  summaryMachine: { fontSize: rf(15), fontWeight: '800', color: COLORS.textPrimary, marginBottom: rs(4) },
  summaryMeta:  { fontSize: rf(13), color: COLORS.textSecondary, marginTop: rs(2) },
  overallCard:  { backgroundColor: COLORS.primary, marginHorizontal: H_PAD, marginTop: rs(14), borderRadius: rs(14), padding: rs(16), alignItems: 'center' },
  overallLabel: { fontSize: rf(12), color: 'rgba(255,255,255,0.7)', marginBottom: rs(6) },
  overallScore: { fontSize: rf(32), fontWeight: '900', color: '#fff' },
  section:      { paddingHorizontal: H_PAD, marginTop: rs(20) },
  sectionTitle: { fontSize: rf(15), fontWeight: '700', color: COLORS.textPrimary, marginBottom: rs(12) },
  opt:          { fontSize: rf(13), color: COLORS.textSecondary, fontWeight: '400' },
  aspectCard:   { backgroundColor: '#fff', borderRadius: rs(14), padding: rs(14), marginBottom: rs(10), elevation: 2, borderWidth: 1, borderColor: COLORS.border },
  aspectTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aspectLabel:  { fontSize: rf(14), fontWeight: '700', color: COLORS.textPrimary },
  aspectScore:  { fontSize: rf(13), fontWeight: '800', color: COLORS.primary },
  aspectDesc:   { fontSize: rf(12), color: COLORS.textSecondary, marginTop: rs(2), marginBottom: rs(10) },
  textArea:     { backgroundColor: '#fff', borderRadius: rs(12), borderWidth: 1, borderColor: COLORS.border, padding: rs(14), minHeight: rs(100), fontSize: rf(14), color: COLORS.textPrimary, elevation: 1 },
  charCount:    { fontSize: rf(11), color: COLORS.textSecondary, textAlign: 'right', marginTop: rs(4) },
  skipBtn:      { alignItems: 'center', marginTop: rs(14), paddingVertical: rs(10) },
  skipTxt:      { fontSize: rf(14), color: COLORS.textSecondary, textDecorationLine: 'underline' },
});
