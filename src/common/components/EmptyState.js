import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function EmptyState({ icon = '📭', title = 'Nothing here', subtitle = '' }) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  icon:      { fontSize: 52, marginBottom: 16 },
  title:     { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  subtitle:  { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
});
