import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createBooking, getUser } from '../../../firebase/firestore';
import { useUser }                   from '../../../context/UserContext';
import { generateOTP }               from '../../../utils/generateOTP';
import { todayString }               from '../../../utils/dateFormatter';
import { validateHectare }           from '../../../utils/hectareValidator';
import { getCategoryLabel, getCategoryIcon } from '../../../constants/categories';
import { COLORS }                    from '../../../constants/colors';
import { CONFIG }                    from '../../../constants/config';
import { rs, rf, SPACING, RADIUS, H_PAD } from '../../../utils/responsive';
import Input                         from '../../common/components/Input';
import Button                        from '../../common/components/Button';

export default function BookingScreen({ navigation, route }) {
  const { machine }     = route.params;
  const { userProfile } = useUser();
  const uid             = userProfile?.id || '';

  const [date, setDate]       = useState(todayString());
  const [slot, setSlot]       = useState('');
  const [hectare, setHectare] = useState('');
  const [loading, setLoading] = useState(false);

  if (!uid) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.errorBox}>
          <Text style={{ fontSize: rf(48), marginBottom: SPACING.md }}>⚠️</Text>
          <Text style={s.errorTxt}>Session expired. Please log in again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleBook = async () => {
    const h = validateHectare(hectare);
    if (!h.valid) { Alert.alert('Invalid Hectare', h.error); return; }
    if (!slot)    { Alert.alert('Required', 'Please select a time slot'); return; }
    if (!date)    { Alert.alert('Required', 'Please enter a date'); return; }

    const requested = parseFloat(hectare);
    setLoading(true);
    try {
      const otp = generateOTP();
      let ownerPhone = machine.ownerPhone || '';
      let ownerName  = machine.ownerName  || '';
      if ((!ownerPhone || !ownerName) && machine.ownerId) {
        const info = await getUser(machine.ownerId).catch(() => null);
        ownerPhone  = info?.phone || ownerPhone;
        ownerName   = info?.name  || ownerName;
      }
      await createBooking({
        farmerId: uid, farmerName: userProfile?.name || '',
        farmerPhone: userProfile?.phone || '',
        ownerId: machine.ownerId, ownerName, ownerPhone,
        machineId: machine.id, machineType: machine.type,
        machineTypeLabel: getCategoryLabel(machine.type),
        pricePerHour: machine.price_per_hour,
        date, timeSlot: slot, hectareRequested: requested,
        hectareCompleted: 0, commission: 0, status: 'pending',
        otp, taluk: machine.taluk,
      });
      navigation.replace('BookingConfirm', {
        otp, machine: { ...machine, ownerPhone, ownerName }, date, slot, hectare,
      });
    } catch (e) {
      Alert.alert('Booking Failed', e.message || 'Please try again');
    } finally { setLoading(false); }
  };

  const rate         = CONFIG.COMMISSION_PER_HECTARE;
  const machineLabel = getCategoryLabel(machine.type);
  const machineIcon  = getCategoryIcon(machine.type);
  const commission   = (parseFloat(hectare) || 0) * rate;

  return (
    <SafeAreaView style={s.safe}>
      {/* KAV: keyboard safe on all Android sizes */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Banner — no fixed height */}
          <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.banner}>
            <Text style={s.bannerIcon}>{machineIcon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>{machineLabel}</Text>
              <Text style={s.bannerSub}>₹{machine.price_per_hour}/hr  ·  📍 {machine.taluk}</Text>
            </View>
          </LinearGradient>

          <View style={s.form}>
            <Input label="📅 Date *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

            <Text style={s.fieldLabel}>⏰ Time Slot *</Text>
            <View style={s.slotGrid}>
              {CONFIG.TIME_SLOTS.map((sl) => (
                <TouchableOpacity
                  key={sl}
                  style={[s.slotChip, slot === sl && s.slotChipOn]}
                  onPress={() => setSlot(sl)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.slotTxt, slot === sl && s.slotTxtOn]}>{sl}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="🌾 Hectares Required *"
              value={hectare}
              onChangeText={setHectare}
              placeholder="e.g. 2.5"
              keyboardType="decimal-pad"
            />

            {hectare ? (
              <View style={s.previewRow}>
                {[
                  { l: 'Hectares',   v: `${hectare} ha` },
                  { l: 'Commission', v: `₹${commission}`, hi: true },
                  { l: 'Rate',       v: `₹${rate}/ha` },
                ].map((item, i, arr) => (
                  <React.Fragment key={item.l}>
                    <View style={s.previewItem}>
                      <Text style={s.previewLabel}>{item.l}</Text>
                      <Text style={[s.previewVal, item.hi && { color: COLORS.primary }]}>{item.v}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={s.previewDivider} />}
                  </React.Fragment>
                ))}
              </View>
            ) : null}

            <View style={s.infoBox}>
              <Text style={s.infoTxt}>🔐 You'll receive an OTP after the owner accepts your request.</Text>
            </View>

            <Button title="📅 Send Booking Request" onPress={handleBook} loading={loading} style={{ marginTop: SPACING.xs }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.background },
  scroll:         { paddingBottom: rs(40) },
  errorBox:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: H_PAD * 2 },
  errorTxt:       { fontSize: rf(15), color: COLORS.textSecondary, textAlign: 'center' },
  banner:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: H_PAD, paddingVertical: rs(20), gap: rs(14) },
  bannerIcon:     { fontSize: rf(40) },
  bannerTitle:    { fontSize: rf(20), fontWeight: '900', color: '#fff' },
  bannerSub:      { fontSize: rf(13), color: 'rgba(255,255,255,0.75)', marginTop: rs(4) },
  form:           { paddingHorizontal: H_PAD, paddingTop: rs(20) },
  fieldLabel:     { fontSize: rf(13), fontWeight: '700', color: COLORS.textSecondary, marginBottom: rs(10) },
  slotGrid:       { flexDirection: 'row', flexWrap: 'wrap', marginBottom: rs(16) },
  slotChip:       { paddingHorizontal: rs(16), paddingVertical: rs(11), borderRadius: RADIUS.xl, margin: rs(4), backgroundColor: '#fff', borderWidth: rs(1.5), borderColor: COLORS.border },
  slotChipOn:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  slotTxt:        { fontSize: rf(13), color: COLORS.textPrimary, fontWeight: '500' },
  slotTxtOn:      { color: '#fff', fontWeight: '700' },
  previewRow:     { flexDirection: 'row', backgroundColor: '#fff', borderRadius: RADIUS.md, padding: rs(16), marginBottom: rs(14), elevation: 1, alignItems: 'center' },
  previewItem:    { flex: 1, alignItems: 'center' },
  previewDivider: { width: 1, height: rs(32), backgroundColor: COLORS.border },
  previewLabel:   { fontSize: rf(11), color: COLORS.textSecondary, marginBottom: rs(4) },
  previewVal:     { fontSize: rf(16), fontWeight: '800', color: COLORS.textPrimary },
  infoBox:        { backgroundColor: '#FFF9E6', borderRadius: RADIUS.md, padding: rs(14), borderLeftWidth: rs(4), borderLeftColor: '#F59E0B', marginBottom: rs(16) },
  infoTxt:        { fontSize: rf(13), color: '#92400E', lineHeight: rf(20) },
});
