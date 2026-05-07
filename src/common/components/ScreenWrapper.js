// src/common/components/ScreenWrapper.js
// ─────────────────────────────────────────────────────────────────────────────
// Reusable screen wrapper — handles ALL Android screen ratios
//
// Usage:
//   <ScreenWrapper>
//     <YourContent />
//   </ScreenWrapper>
//
//   <ScreenWrapper scroll keyboard>
//     <FormContent />
//   </ScreenWrapper>
//
// Props:
//   scroll   → wraps children in ScrollView
//   keyboard → adds KeyboardAvoidingView (for forms with TextInput)
//   bg       → background color (default #F4F6F8)
//   padH     → add horizontal padding (default false)
// ─────────────────────────────────────────────────────────────────────────────

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
}) {
  // Inner content
  let content = (
    <View style={[s.inner, padH && { paddingHorizontal: H_PAD }, style]}>
      {children}
    </View>
  );

  // Wrap in ScrollView if scroll=true
  if (scroll) {
    content = (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          s.scrollContent,
          padH && { paddingHorizontal: H_PAD },
          style,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {children}
      </ScrollView>
    );
  }

  // Wrap in KAV if keyboard=true (forms)
  if (keyboard) {
    content = (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return (
    // SafeAreaView with edges — handles all Android screen ratios
    <SafeAreaView
      style={[s.safe, { backgroundColor: bg }]}
      edges={['left', 'right', 'bottom']}
    >
      {/* Manual top padding for Android status bar */}
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
