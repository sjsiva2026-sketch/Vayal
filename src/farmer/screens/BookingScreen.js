import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createBooking, getUser }    from '../../../firebase/firestore';
import { useUser }                   from '../../../context/UserContext';
import { generateOTP }               from '../../../utils/generateOTP';
import { todayString }               from '../../../utils/dateFormatter';
import { validateHectare }           from '../../../utils/hectareValidator';
import { getCategoryLabel, getCategoryIcon } from '../../../constants/categories';
import { COLORS }                    from '../../../constants/colors';
import { CONFIG }                    from '../../../constants/config';
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
          <Text style={{ fontSize: 48, marginBottom: 12 }}>⚠️</Text>
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
        farmerId: uid, farmerName: userProfile?.name || '', farmerPhone: userProfile?.phone || '',
        ownerId: machine.ownerId, ownerName, ownerPhone,
        machineId: machine.id, machineType: machine.type, machineTypeLabel: getCategoryLabel(machine.type),
        pricePerHour: machine.price_per_hour,
        date, timeSlot: slot, hectareRequested: parseFloat(hectare),
        hectareCompleted: 0, commission: 0, status: 'pending', otp, taluk: machine.taluk,
      });
      navigation.replace('BookingConfirm', {
        otp, machine: { ...machine, ownerPhone, ownerName }, date, slot, hectare,
      });
    } catch (e) {
      Alert.alert('Booking Failed', e.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const rate         = CONFIG.COMMISSION_PER_HECTARE;
  const machineLabel = getCategoryLabel(machine.type);
  const machineIcon  = getCategoryIcon(machine.type);
  const commission   = (parseFloat(hectare) || 0) * rate;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Machine Banner ── */}
        <LinearGradient colors={['#145A3E', '#1C7C54']} style={s.banner}>
          <Text style={s.bannerIcon}>{machineIcon}</Text>
          <View>
            <Text style={s.bannerTitle}>{machineLabel}</Text>
            <Text style={s.bannerSub}>₹{machine.price_per_hour}/hr  ·  📍 {machine.taluk}</Text>
          </View>
        </LinearGradient>

        <View style={s.form}>

          {/* Date */}
          <Input label="📅 Date *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

          {/* Time Slot */}
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

          {/* Hectare */}
          <Input label="🌾 Hectares Required *" value={hectare} onChangeText={setHectare} placeholder="e.g. 2.5" keyboardType="decimal-pad" />

          {/* Commission preview */}
          {hectare ? (
            <View style={s.previewRow}>
              <View style={s.previewItem}>
                <Text style={s.previewLabel}>Hectares</Text>
                <Text style={s.previewVal}>{hectare} ha</Text>
              </View>
              <View style={s.previewDivider} />
              <View style={s.previewItem}>
                <Text style={s.previewLabel}>Commission</Text>
                <Text style={[s.previewVal, { color: COLORS.primary }]}>₹{commission}</Text>
              </View>
              <View style={s.previewDivider} />
              <View style={s.previewItem}>
                <Text style={s.previewLabel}>Rate</Text>
                <Text style={s.previewVal}>₹{rate}/ha</Text>
              </View>
            </View>
          ) : null}

          {/* Info note */}
          <View style={s.infoBox}>
            <Text style={s.infoTxt}>🔐 You'll receive an OTP after the owner accepts your request.</Text>
          </View>

          <Button title="📅 Send Booking Request" onPress={handleBook} loading={loading} style={{ marginTop: 4 }} />

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.background },
  scroll:        { paddingBottom: 40 },
  errorBox:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorTxt:      { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },

  banner:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, gap: 14 },
  bannerIcon:    { fontSize: 40, marginRight: 14 },
  bannerTitle:   { fontSize: 20, fontWeight: '900', color: '#fff' },
  bannerSub:     { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  form:          { paddingHorizontal: 16, paddingTop: 20 },
  fieldLabel:    { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10 },

  slotGrid:      { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  slotChip:      { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 22, margin: 4, backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border },
  slotChipOn:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  slotTxt:       { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },
  slotTxtOn:     { color: '#fff', fontWeight: '700' },

  previewRow:    { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 1, alignItems: 'center' },
  previewItem:   { flex: 1, alignItems: 'center' },
  previewDivider:{ width: 1, height: 32, backgroundColor: COLORS.border },
  previewLabel:  { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  previewVal:    { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },

  infoBox:       { backgroundColor: '#FFF9E6', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: '#F59E0B', marginBottom: 16 },
  infoTxt:       { fontSize: 13, color: '#92400E', lineHeight: 20 },
});
