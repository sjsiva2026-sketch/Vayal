import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function CategoryItem({ category, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.icon}>{category.icon}</Text>
      <Text style={styles.label}>{category.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, margin: 8, backgroundColor: COLORS.white, borderRadius: 18,
    padding: 24, alignItems: 'center', elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8,
  },
  icon:  { fontSize: 40, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
});
