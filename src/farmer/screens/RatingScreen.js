// src/farmer/screens/RatingScreen.js
// Farmer rates machine owner after job completion

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
  StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { submitRating } from '../../../firebase/firestore';
import { useUser }      from '../../../context/UserContext';
import { COLORS }       from '../../../constants/colors';
import { rs, rf, H_PAD } from '../../../utils/responsive';

const STARS = [1, 2, 3, 4, 5];

export default function RatingScreen({ navigation, route }) {
  const { booking }     = route.params;
  const { userProfile } = useUser();
  const [rating,   setRating]   = useState(0);
  const [comment,  setComment]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [submitted,setSubmitted]= useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { Alert.alert('Required', 'Please select a star rating'); return; }
    setLoading(true);
    try {
      await submitRating({
        bookingId: booking.id,
        farmerId:  userProfile?.id,
        ownerId:   booking.ownerId,
        machineId: booking.machineId,
        overall:   rating,
        comment:   comment.trim(),
        date:      new Date().toISOString().slice(0, 10),
      });
      setSubmitted(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not submit rating.');
    } finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.doneEmoji}>⭐</Text>
          <Text style={s.doneTitle}>Thank You!</Text>
          <Text style={s.doneSub}>Your rating helps other farmers make better choices.</Text>
          <TouchableOpacity
            style={s.doneBtn}
            onPress={() => navigation.navigate('FarmerHome')}
            activeOpacity={0.88}
          >
            <Text style={s.doneBtnTxt}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerEmoji}>⭐</Text>
            <Text style={s.headerTitle}>Rate Your Experience</Text>
            <Text style={s.headerSub}>
              {booking.farmerName || 'Farmer'} · {booking.date}
            </Text>
          </View>

          {/* Stars */}
          <View style={s.starsCard}>
            <Text style={s.starsLabel}>Overall Rating</Text>
            <View style={s.starsRow}>
              {STARS.map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                  style={s.starBtn}
                >
                  <Text style={[s.star, star <= rating && s.starActive]}>
                    {star <= rating ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.ratingHint}>
              {rating === 0 ? 'Tap a star to rate'
              : rating === 1 ? 'Poor'
              : rating === 2 ? 'Fair'
              : rating === 3 ? 'Good'
              : rating === 4 ? 'Very Good'
              : 'Excellent!'}
            </Text>
          </View>

          {/* Comment */}
          <View style={s.commentCard}>
            <Text style={s.commentLabel}>Comment (optional)</Text>
            <TextInput
              style={s.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Share your experience with this machine owner..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Submit */}
          <View style={s.btnWrap}>
            <TouchableOpacity
              style={[s.submitBtn, (rating === 0 || loading) && s.submitBtnOff]}
              onPress={handleSubmit}
              disabled={rating === 0 || loading}
              activeOpacity={0.88}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitBtnTxt}>Submit Rating</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={s.skipBtn}
              onPress={() => navigation.navigate('FarmerHome')}
              activeOpacity={0.7}
            >
              <Text style={s.skipBtnTxt}>Skip for now</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: rs(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F4F6F8' },
  scroll:        { flexGrow: 1, paddingBottom: rs(24) },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: H_PAD * 2 },
  doneEmoji:     { fontSize: rf(64), marginBottom: rs(16) },
  doneTitle:     { fontSize: rf(24), fontWeight: '900', color: '#111827', marginBottom: rs(8) },
  doneSub:       { fontSize: rf(14), color: '#6B7280', textAlign: 'center', marginBottom: rs(24) },
  doneBtn:       { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(14), paddingHorizontal: rs(32) },
  doneBtnTxt:    { color: '#fff', fontWeight: '800', fontSize: rf(15) },
  header:        { backgroundColor: COLORS.primary, paddingTop: rs(36), paddingBottom: rs(28), paddingHorizontal: H_PAD, alignItems: 'center' },
  headerEmoji:   { fontSize: rf(44), marginBottom: rs(8) },
  headerTitle:   { fontSize: rf(22), fontWeight: '900', color: '#fff', marginBottom: rs(4) },
  headerSub:     { fontSize: rf(13), color: 'rgba(255,255,255,0.75)' },
  starsCard:     { backgroundColor: '#fff', marginHorizontal: H_PAD, marginTop: rs(20), borderRadius: rs(16), padding: rs(20), alignItems: 'center', elevation: 2 },
  starsLabel:    { fontSize: rf(14), fontWeight: '700', color: '#374151', marginBottom: rs(16) },
  starsRow:      { flexDirection: 'row', marginBottom: rs(12) },
  starBtn:       { paddingHorizontal: rs(8) },
  star:          { fontSize: rf(40), color: '#D1D5DB' },
  starActive:    { color: '#F59E0B' },
  ratingHint:    { fontSize: rf(13), color: '#6B7280', fontWeight: '600' },
  commentCard:   { backgroundColor: '#fff', marginHorizontal: H_PAD, marginTop: rs(16), borderRadius: rs(16), padding: rs(16), elevation: 1 },
  commentLabel:  { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(10) },
  commentInput:  { backgroundColor: '#F9FAFB', borderRadius: rs(12), borderWidth: rs(1.5), borderColor: '#E5E7EB', padding: rs(12), fontSize: rf(14), color: '#111827', minHeight: rs(100) },
  btnWrap:       { paddingHorizontal: H_PAD, marginTop: rs(24) },
  submitBtn:     { backgroundColor: COLORS.primary, borderRadius: rs(14), paddingVertical: rs(15), alignItems: 'center', marginBottom: rs(10) },
  submitBtnOff:  { backgroundColor: '#D1D5DB' },
  submitBtnTxt:  { color: '#fff', fontSize: rf(15), fontWeight: '800' },
  skipBtn:       { alignItems: 'center', paddingVertical: rs(12) },
  skipBtnTxt:    { fontSize: rf(14), color: '#6B7280' },
});
