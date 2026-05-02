// src/common/components/Input.js
import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants/colors';
import { rf, rs } from '../../../utils/responsive';

export default function Input({
  label, value, onChangeText, placeholder,
  keyboardType = 'default', maxLength,
  secureTextEntry = false, error, style,
  editable = true, leftIcon, rightIcon,
}) {
  return (
    <View style={[s.wrap, style]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={[s.row, !!error && s.rowErr, !editable && s.rowDisabled]}>
        {leftIcon && <View style={s.side}>{leftIcon}</View>}
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          keyboardType={keyboardType}
          maxLength={maxLength}
          secureTextEntry={secureTextEntry}
          editable={editable}
        />
        {rightIcon && <View style={s.side}>{rightIcon}</View>}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:        { marginBottom: rs(14) },
  label:       { fontSize: rf(13), fontWeight: '700', color: COLORS.textSecondary, marginBottom: rs(8) },
  row:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: rs(1.5), borderColor: COLORS.border, borderRadius: rs(12), paddingHorizontal: rs(14) },
  rowErr:      { borderColor: COLORS.error },
  rowDisabled: { backgroundColor: COLORS.borderLight, opacity: 0.7 },
  input:       { flex: 1, paddingVertical: rs(13), fontSize: rf(15), color: COLORS.textPrimary },
  side:        { paddingHorizontal: rs(6) },
  error:       { fontSize: rf(12), color: COLORS.error, marginTop: rs(5) },
});
