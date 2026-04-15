import React, { Component } from 'react';
import { Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { StatusBar }              from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider }       from 'react-native-safe-area-context';
import { AuthProvider }           from './context/AuthContext';
import { UserProvider }           from './context/UserContext';
import { BookingProvider }        from './context/BookingContext';
import AppNavigator               from './navigation/AppNavigator';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[Vayal] CRASH:', error.message);
    console.error('[Vayal] STACK:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ScrollView contentContainerStyle={s.wrap}>
          <Text style={s.icon}>⚠️</Text>
          <Text style={s.title}>App Error</Text>
          <Text style={s.msg}>{this.state.error?.message || 'Unknown error'}</Text>
          <TouchableOpacity
            style={s.btn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={s.btnTxt}>Retry</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  wrap:   { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#fff' },
  icon:   { fontSize: 48, marginBottom: 12 },
  title:  { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 8 },
  msg:    { fontSize: 13, color: '#B91C1C', textAlign: 'center', marginBottom: 20 },
  btn:    { backgroundColor: '#1C7C54', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  btnTxt: { color: '#fff', fontWeight: '700' },
});

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <AuthProvider>
            <UserProvider>
              <BookingProvider>
                <StatusBar style="light" backgroundColor="#1C7C54" />
                <AppNavigator />
              </BookingProvider>
            </UserProvider>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
