// src/common/components/Loader.js
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { rs, rf } from '../../../utils/responsive';

export default function Loader({ message = 'Loading...' }) {
  return (
    <View style={s.wrap}>
      <ActivityIndicator color="#1C7C54" size="large" />
      {message ? <Text style={s.txt}>{message}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F8', padding: rs(32) },
  txt:  { marginTop: rs(12), fontSize: rf(14), color: '#6B7280', textAlign: 'center' },
});
