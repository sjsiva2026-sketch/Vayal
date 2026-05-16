// src/common/components/ScreenWrapper.js
// ANDROID-ONLY: Global wrapper for all screens
// Handles: SafeAreaView, StatusBar, KeyboardAvoidingView, ScrollView

import React from 'react';
import {
  View, ScrollView, KeyboardAvoidingView,
  StyleSheet, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rs, H_PAD, STATUS_BAR_H } from '../../../utils/responsive';

export default function ScreenWrapper({
  children,
  scroll    = false,
  keyboard  = false,
  bg        = '#F4F6F8',
  padH      = false,
  style,
  contentStyle,
}) {
  let content = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        s.scrollContent,
        padH && { paddingHorizontal: H_PAD },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[s.inner, padH && { paddingHorizontal: H_PAD }, style]}>
      {children}
    </View>
  );

  // Android: behavior="height" works better than "padding"
  if (keyboard) {
    content = (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="height"
        keyboardVerticalOffset={0}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return (
    <SafeAreaView
      style={[s.safe, { backgroundColor: bg }]}
      edges={['left', 'right', 'bottom']}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={bg}
        translucent={false}
      />
      {/* Android status bar top padding */}
      <View style={{ height: STATUS_BAR_H }} />
      {content}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  inner:         { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: rs(40) },
});
