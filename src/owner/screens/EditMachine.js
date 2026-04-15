import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Alert, ScrollView,
} from 'react-native';
import { updateMachine } from '../../../firebase/firestore';
import Input             from '../../common/components/Input';
import Button            from '../../common/components/Button';
import { COLORS }        from '../../../constants/colors';

export default function EditMachine({ navigation, route }) {
  const { machine }           = route.params;
  const [price, setPrice]     = useState(String(machine.price_per_hour));
  const [taluk, setTaluk]     = useState(machine.taluk || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    // BUG FIX: validate price before saving — avoid NaN being written to Firestore.
    const p = parseFloat(price);
    if (!price.trim() || isNaN(p) || p <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price per hour.');
      return;
    }
    if (!taluk.trim()) {
      Alert.alert('Required', 'Taluk cannot be empty.');
      return;
    }
    setLoading(true);
    try {
      await updateMachine(machine.id, { price_per_hour: p, taluk: taluk.trim() });
      Alert.alert('✅ Updated', 'Machine updated!');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update machine. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>✏️ Edit Machine</Text>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{machine.type}</Text>
        </View>
        <Input
          label="Price per Hour (₹)"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="e.g. 1500"
        />
        <Input
          label="Taluk"
          value={taluk}
          onChangeText={setTaluk}
          placeholder="e.g. Madurai East"
        />
        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={loading}
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 20 },
  title:     { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
  tag: {
    backgroundColor: COLORS.primary, borderRadius: 20, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 6, marginBottom: 20,
  },
  tagText:   { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});
