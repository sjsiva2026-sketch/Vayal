import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../../../constants/colors';
import { CONFIG } from '../../../constants/config';

export default function LocationDropdown({ selected, onSelect, type = 'district' }) {
  const options = type === 'district' ? CONFIG.TAMIL_NADU_DISTRICTS : [];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.chip, selected === opt && styles.chipActive]}
          onPress={() => onSelect(opt)}
        >
          <Text style={[styles.chipText, selected === opt && styles.chipTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:         { marginBottom: 12 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:       { fontSize: 13, color: COLORS.textPrimary },
  chipTextActive: { color: COLORS.white, fontWeight: '600' },
});
