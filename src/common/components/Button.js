// src/common/components/Button.js
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { rs, rf } from '../../../utils/responsive';
import { COLORS } from '../../../constants/colors';

export default function Button({ title, onPress, loading, disabled, style, textStyle, variant = 'primary' }) {
  const bg = variant === 'outline' ? '#fff' : variant === 'danger' ? '#EF4444' : COLORS.primary;
  const tc = variant === 'outline' ? COLORS.primary : '#fff';
  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: bg }, variant === 'outline' && s.outline, (disabled || loading) && s.dim, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.88}
    >
      {loading
        ? <ActivityIndicator color={tc} size="small" />
        : <Text style={[s.txt, { color: tc }, textStyle]}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn:     { borderRadius: rs(14), paddingVertical: rs(15), alignItems: 'center', justifyContent: 'center' },
  outline: { borderWidth: rs(2), borderColor: COLORS.primary },
  dim:     { opacity: 0.6 },
  txt:     { fontSize: rf(15), fontWeight: '800' },
});
