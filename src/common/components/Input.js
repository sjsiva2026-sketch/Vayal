import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function Input({ label, value, onChangeText, placeholder, keyboardType = 'default', maxLength, secureTextEntry = false, error, style }) {
  return (
    <View style={[styles.wrap, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        keyboardType={keyboardType}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:       { marginBottom: 14 },
  label:      { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.textPrimary,
  },
  inputError: { borderColor: COLORS.error },
  error:      { fontSize: 12, color: COLORS.error, marginTop: 4 },
});
