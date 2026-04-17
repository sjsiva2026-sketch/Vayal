// src/farmer/screens/RatingScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, TextInput, Alert, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { submitRating }   from '../../../firebase/firestore';
import { useUser }        from '../../../context/UserContext';
import { COLORS }         from '../../../constants/colors';
import Loader             from '../../common/components/Loader';

const ASPECTS = [
  { key: 'punctuality', label: '⏰ Punctuality',    desc: 'Arrived on time to the field' },
  { key: 'workQuality', label: '🚜 Work Quality',   desc: 'Quality of machine work done' },
  { key: 'behaviour',   label: '🤝 Behaviour',      desc: 'Polite and professional conduct' },
];

function StarRow({ value, onChange }) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.7}>
          <Text style={[s.star, star <= value && s.starFilled]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function RatingScreen({ navigation, route }) {
  const { booking }     = route.params;
  const { userProfile } = useUser();

  const [ratings, setRatings] = useState({ punctuality: 0, workQuality: 0, behaviour: 0 });
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const overall = (() => {
    const vals = Object.values(ratings).filter(v => v > 0);
    if (!vals.length) return 0;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  })();

  const handleSubmit = async () => {
    const missing = ASPECTS.filter(a => ratings[a.key] === 0);
    if (missing.length) {
      Alert.alert('⭐ Rate All Areas', `Please rate: ${missing.map(a => a.label).join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      await submitRating({
        bookingId:    booking.id,
        farmerId:     userProfile?.id  || booking.farmerId,
        farmerName:   userProfile?.name || booking.farmerName || '',
        ownerId:      booking.ownerId,
        ownerName:    booking.ownerName || '',
        machineId:    booking.machineId,
        machineType:  booking.machineTypeLabel || booking.machineType,
        date:         booking.date,
        ...ratings,
        overall:      parseFloat(overall),
        comment:      comment.trim(),
      });

      Alert.alert(
        '🙏 Thank You!',
        'Your rating has been submitted.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not submit rating. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.header}>
          <Text style={s.headerIcon}>⭐</Text>
          <Text style={s.headerTitle}>Rate Your Experience</Text>
          <Text style={s.headerSub}>
            Help other farmers by rating {booking.ownerName || 'the owner'}
          </Text>
        </LinearGradient>

        {/* Job Summary */}
        <View style={s.summaryCard}>
          <Text style={s.summaryMachine}>🚜 {booking.machineTypeLabel || booking.machineType}</Text>
          <Text style={s.summaryMeta}>📅 {booking.date}  ·  ✅ {booking.hectareCompleted || booking.hectareRequested} ha done</Text>
          {booking.ownerName ? <Text style={s.summaryMeta}>👤 {booking.ownerName}</Text> : null}
        </View>

        {/* Overall Score */}
        {parseFloat(overall) > 0 && (
          <View style={s.overallCard}>
            <Text style={s.overallLabel}>Overall Rating</Text>
            <Text style={s.overallScore}>{overall} ⭐</Text>
          </View>
        )}

        {/* Aspect Ratings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Rate Each Area</Text>
          {ASPECTS.map(a => (
            <View key={a.key} style={s.aspectCard}>
              <View style={s.aspectTop}>
                <Text style={s.aspectLabel}>{a.label}</Text>
                <Text style={s.aspectScore}>
                  {ratings[a.key] > 0 ? `${ratings[a.key]}/5` : '—'}
                </Text>
              </View>
              <Text style={s.aspectDesc}>{a.desc}</Text>
              <StarRow
                value={ratings[a.key]}
                onChange={val => setRatings(prev => ({ ...prev, [a.key]: val }))}
              />
            </View>
          ))}
        </View>

        {/* Comment */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Comments (optional)</Text>
          <TextInput
            style={s.textArea}
            placeholder="Share your experience with this owner..."
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

        {/* Submit */}
        <View style={s.section}>
          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
            <Text style={s.submitTxt}>⭐ Submit Rating</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.skipBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={s.skipTxt}>Skip for now</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.background },
  scroll:        { paddingBottom: 24 },

  // Header
  header:        { paddingTop: 36, paddingBottom: 28, paddingHorizontal: 24, alignItems: 'center' },
  headerIcon:    { fontSize: 44, marginBottom: 10 },
  headerTitle:   { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6 },
  headerSub:     { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  // Summary
  summaryCard:   {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, padding: 16, elevation: 2,
  },
  summaryMachine:{ fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  summaryMeta:   { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  // Overall
  overallCard:   {
    backgroundColor: COLORS.primary, marginHorizontal: 16, marginTop: 14,
    borderRadius: 14, padding: 16, alignItems: 'center',
  },
  overallLabel:  { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  overallScore:  { fontSize: 32, fontWeight: '900', color: '#fff' },

  // Section
  section:       { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle:  { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10 },

  // Aspect
  aspectCard:    {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 10, elevation: 2,
  },
  aspectTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aspectLabel:   { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  aspectScore:   { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  aspectDesc:    { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, marginBottom: 8 },

  // Stars
  starRow:       { flexDirection: 'row', gap: 6 },
  star:          { fontSize: 30, color: '#D1D5DB' },
  starFilled:    { color: '#F59E0B' },

  // Comment
  textArea: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, minHeight: 100,
    fontSize: 14, color: COLORS.textPrimary, elevation: 1,
  },
  charCount:     { fontSize: 11, color: COLORS.textSecondary, textAlign: 'right', marginTop: 4 },

  // Buttons
  submitBtn:     {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  submitTxt:     { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  skipBtn:       { alignItems: 'center', marginTop: 14, paddingVertical: 10 },
  skipTxt:       { fontSize: 14, color: COLORS.textSecondary, textDecorationLine: 'underline' },
});
