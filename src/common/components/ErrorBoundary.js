// src/common/components/ErrorBoundary.js
// Global error boundary — catches all JS crashes

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar,
} from 'react-native';
import { rs, rf } from '../../../utils/responsive';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to crash service if available
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={s.container}>
          <Text style={s.emoji}>⚠️</Text>
          <Text style={s.title}>Something went wrong</Text>
          <Text style={s.msg}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity style={s.btn} onPress={this.reset} activeOpacity={0.88}>
            <Text style={s.btnTxt}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: rs(32) },
  emoji:     { fontSize: rf(56), marginBottom: rs(16) },
  title:     { fontSize: rf(22), fontWeight: '900', color: '#111827', marginBottom: rs(10), textAlign: 'center' },
  msg:       { fontSize: rf(14), color: '#6B7280', textAlign: 'center', lineHeight: rf(22), marginBottom: rs(28) },
  btn:       { backgroundColor: '#1C7C54', borderRadius: rs(14), paddingVertical: rs(14), paddingHorizontal: rs(36) },
  btnTxt:    { color: '#fff', fontSize: rf(15), fontWeight: '800' },
});
