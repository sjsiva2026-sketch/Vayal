import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Alert, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { updateMachine } from '../../../firebase/firestore';
import Input             from '../../common/components/Input';
import Button            from '../../common/components/Button';
import { COLORS }        from '../../../constants/colors';
import { rs, rf, RADIUS, H_PAD } from '../../../utils/responsive';

export default function EditMachine({ navigation, route }) {
  const { machine }           = route.params;
  const [price, setPrice]     = useState(String(machine.price_per_hour));
  const [taluk, setTaluk]     = useState(machine.taluk || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const p = parseFloat(price);
    if (!price.trim() || isNaN(p) || p <= 0) { Alert.alert('Invalid Price', 'Please enter a valid price per hour.'); return; }
    if (!taluk.trim()) { Alert.alert('Required', 'Taluk cannot be empty.'); return; }
    setLoading(true);
    try {
      await updateMachine(machine.id, { price_per_hour: p, taluk: taluk.trim() });
      Alert.alert('✅ Updated', 'Machine updated!');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update machine. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>✏️ Edit Machine</Text>
          <View style={s.tag}><Text style={s.tagText}>{machine.type}</Text></View>
          <Input label="Price per Hour (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="e.g. 1500" />
          <Input label="Taluk" value={taluk} onChangeText={setTaluk} placeholder="e.g. Madurai East" />
          <Button title="Save Changes" onPress={handleSave} loading={loading} style={{ marginTop: rs(12) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: COLORS.background },
  scroll:   { padding: H_PAD, paddingBottom: rs(40), flexGrow: 1 },
  title:    { fontSize: rf(22), fontWeight: '800', color: COLORS.textPrimary, marginBottom: rs(12) },
  tag:      { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, alignSelf: 'flex-start', paddingHorizontal: rs(14), paddingVertical: rs(6), marginBottom: rs(20) },
  tagText:  { color: COLORS.white, fontWeight: '700', fontSize: rf(14) },
});
