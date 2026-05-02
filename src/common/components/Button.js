// src/common/components/Button.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { COLORS } from '../../../constants/colors';
import { rf, rs } from '../../../utils/responsive';

export default function Button({
  title, onPress,
  variant  = 'primary',
  loading  = false,
  disabled = false,
  style,
  icon,
  iconRight,
}) {
  const bg  = variant === 'primary'  ? COLORS.primary
             : variant === 'danger'  ? COLORS.error
             : variant === 'outline' ? 'transparent'
             : '#F4F5F7';
  const col = variant === 'outline'  ? COLORS.primary
             : variant === 'ghost'   ? COLORS.textPrimary
             : '#fff';
  const bw  = variant === 'outline'  ? rs(1.5) : 0;
  const bc  = variant === 'outline'  ? COLORS.primary : 'transparent';

  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: bg, borderWidth: bw, borderColor: bc },
              (disabled || loading) && s.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
    >
      {loading ? (
        <ActivityIndicator color={col} size="small" />
      ) : (
        <View style={s.inner}>
          {icon && <View style={{ marginRight: rs(8) }}>{icon}</View>}
          <Text style={[s.text, { color: col }]}>{title}</Text>
          {iconRight && <View style={{ marginLeft: rs(8) }}>{iconRight}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn:      { borderRadius: rs(14), paddingVertical: rs(14), alignItems: 'center', justifyContent: 'center' },
  inner:    { flexDirection: 'row', alignItems: 'center' },
  text:     { fontSize: rf(15), fontWeight: '700' },
  disabled: { opacity: 0.55 },
});
