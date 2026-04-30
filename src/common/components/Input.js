import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function Input({
  label, value, onChangeText, placeholder,
  keyboardType = 'default', maxLength,
  secureTextEntry = false, error, style,
  editable = true,
}) {
  return (
    <View style={[s.wrap, style]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        style={[s.input, error && s.inputError, !editable && s.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        keyboardType={keyboardType}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
        editable={editable}
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:         { marginBottom: 16 },
  label:        {
    fontSize: 13, fontWeight: '700',
    color: COLORS.textSecondary, marginBottom: 8,
  },
  input:        {
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 14, fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputError:   { borderColor: COLORS.error },
  inputDisabled:{ backgroundColor: COLORS.borderLight, color: COLORS.textTertiary },
  error:        { fontSize: 12, color: COLORS.error, marginTop: 5 },
});
