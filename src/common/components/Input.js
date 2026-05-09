// src/common/components/Input.js
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { rs, rf } from '../../../utils/responsive';
import { COLORS } from '../../../constants/colors';

export default function Input({ label, value, onChangeText, placeholder, keyboardType, editable = true, multiline, numberOfLines, style }) {
  return (
    <View style={s.wrap}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        style={[s.input, multiline && s.multi, !editable && s.disabled, style]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#C9D1DA"
        keyboardType={keyboardType || 'default'}
        editable={editable}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap:     { marginBottom: rs(14) },
  label:    { fontSize: rf(13), fontWeight: '700', color: '#374151', marginBottom: rs(8) },
  input:    { backgroundColor: '#fff', borderWidth: rs(1.5), borderColor: '#E5E7EB', borderRadius: rs(12), paddingVertical: rs(13), paddingHorizontal: rs(16), fontSize: rf(15), color: '#111827' },
  multi:    { minHeight: rs(90), paddingTop: rs(12) },
  disabled: { backgroundColor: '#F4F6F8', color: '#9CA3AF' },
});
