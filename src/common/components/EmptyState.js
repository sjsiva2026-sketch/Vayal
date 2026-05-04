// src/common/components/EmptyState.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { rs, rf } from '../../../utils/responsive';

export default function EmptyState({ icon = '📭', title = 'Nothing here', subtitle, action, onAction }) {
  return (
    <View style={s.wrap}>
      <Text style={s.icon}>{icon}</Text>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
      {action && onAction ? (
        <TouchableOpacity style={s.btn} onPress={onAction} activeOpacity={0.85}>
          <Text style={s.btnTxt}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(40), minHeight: rs(200) },
  icon:   { fontSize: rf(48), marginBottom: rs(14) },
  title:  { fontSize: rf(18), fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: rs(8) },
  sub:    { fontSize: rf(13), color: '#6B7280', textAlign: 'center', lineHeight: rf(20) },
  btn:    { marginTop: rs(16), backgroundColor: '#1C7C54', borderRadius: rs(12), paddingVertical: rs(11), paddingHorizontal: rs(28) },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: rf(14) },
});
