// src/common/components/PhoneConnect.js
import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert, StyleSheet } from 'react-native';
import { rs, rf } from '../../../utils/responsive';
import { COLORS } from '../../../constants/colors';

export default function PhoneConnect({ phone, name, role }) {
  const call = () => {
    const url = `tel:${phone}`;
    Linking.canOpenURL(url)
      .then(ok => ok ? Linking.openURL(url) : Alert.alert('Error', 'Cannot open phone app'))
      .catch(() => Alert.alert('Error', 'Cannot make call'));
  };

  const whatsapp = () => {
    const cleaned = phone.replace(/\D/g, '');
    const number  = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
    const url     = `whatsapp://send?phone=${number}`;
    Linking.canOpenURL(url)
      .then(ok => ok ? Linking.openURL(url) : Alert.alert('WhatsApp not installed'))
      .catch(() => Alert.alert('Error', 'Cannot open WhatsApp'));
  };

  return (
    <View style={s.card}>
      <View style={s.info}>
        <Text style={s.role}>{role}</Text>
        <Text style={s.name}>{name}</Text>
        <Text style={s.phone}>📞 +91 {phone}</Text>
      </View>
      <View style={s.actions}>
        <TouchableOpacity style={s.callBtn} onPress={call} activeOpacity={0.85}>
          <Text style={s.callTxt}>📞 Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.waBtn} onPress={whatsapp} activeOpacity={0.85}>
          <Text style={s.waTxt}>💬 WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card:    { backgroundColor: '#fff', borderRadius: rs(14), padding: rs(14), elevation: 2, borderWidth: 1, borderColor: '#F0F0F0', marginBottom: rs(12) },
  info:    { marginBottom: rs(12) },
  role:    { fontSize: rf(11), color: '#9CA3AF', fontWeight: '600', marginBottom: rs(2) },
  name:    { fontSize: rf(15), fontWeight: '800', color: '#111827', marginBottom: rs(4) },
  phone:   { fontSize: rf(13), color: COLORS.primary, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: rs(10) },
  callBtn: { flex: 1, backgroundColor: COLORS.primaryLight, borderRadius: rs(10), paddingVertical: rs(10), alignItems: 'center', borderWidth: 1, borderColor: '#6EE7B7' },
  callTxt: { fontSize: rf(13), fontWeight: '700', color: COLORS.primary },
  waBtn:   { flex: 1, backgroundColor: '#E7F9E7', borderRadius: rs(10), paddingVertical: rs(10), alignItems: 'center', borderWidth: 1, borderColor: '#86EFAC' },
  waTxt:   { fontSize: rf(13), fontWeight: '700', color: '#16A34A' },
});
