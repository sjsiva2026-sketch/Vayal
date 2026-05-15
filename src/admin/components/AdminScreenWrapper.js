// src/admin/components/AdminScreenWrapper.js
// Reusable wrapper — SafeAreaView + StatusBar + Android padding

import React from 'react';
import {
  SafeAreaView, StatusBar, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';

export default function AdminScreenWrapper({
  children,
  style,
  keyboardAvoiding = false,
  statusBarStyle = 'dark-content',
  statusBarColor = '#fff',
}) {
  const inner = keyboardAvoiding ? (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {children}
    </KeyboardAvoidingView>
  ) : children;

  return (
    <SafeAreaView style={[s.safe, style]}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarColor} translucent={false} />
      {inner}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F5F7' },
});
