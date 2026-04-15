import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style }) {
  const bgColor = variant === 'primary'   ? COLORS.primary
                : variant === 'secondary' ? COLORS.secondary
                : variant === 'danger'    ? COLORS.error
                : COLORS.border;

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bgColor }, (disabled || loading) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={COLORS.white} />
        : <Text style={styles.text}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn:      { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginVertical: 6 },
  text:     { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
