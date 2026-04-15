import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function PhoneConnect({ phone, name, role = '', showLabel = true }) {
  if (!phone) return null;

  const handleCall = () => {
    const url = `tel:+91${phone}`;
    Linking.canOpenURL(url)
      .then((ok) => { if (ok) Linking.openURL(url); else Alert.alert('Error', 'Cannot open dialer'); })
      .catch(() => Alert.alert('Error', 'Cannot open dialer'));
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(`Hello ${name}, I am contacting you via Vayal app.`);
    const url = `whatsapp://send?phone=91${phone}&text=${msg}`;
    Linking.canOpenURL(url)
      .then((ok) => {
        if (ok) Linking.openURL(url);
        else Alert.alert('WhatsApp not installed', 'Please install WhatsApp to use this feature.');
      })
      .catch(() => Alert.alert('Error', 'Cannot open WhatsApp'));
  };

  return (
    <View style={s.container}>
      {showLabel && (
        <View style={s.labelRow}>
          <Text style={s.roleTag}>{role}</Text>
          <Text style={s.name}>{name}</Text>
          <Text style={s.phoneText}>📞 +91 {phone}</Text>
        </View>
      )}
      <View style={s.btnRow}>
        <TouchableOpacity style={s.callBtn} onPress={handleCall} activeOpacity={0.8}>
          <Text style={s.callIcon}>📞</Text>
          <Text style={s.callText}> Call</Text>
        </TouchableOpacity>
        <View style={{ width: 10 }} />
        <TouchableOpacity style={s.waBtn} onPress={handleWhatsApp} activeOpacity={0.8}>
          <Text style={s.callIcon}>💬</Text>
          <Text style={s.waText}> WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { backgroundColor: '#F0FAF5', borderRadius: 14, padding: 14, marginVertical: 10, borderWidth: 1, borderColor: COLORS.primaryLight },
  labelRow:   { marginBottom: 10 },
  roleTag:    { fontSize: 11, fontWeight: '700', color: '#fff', backgroundColor: COLORS.primary, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 4 },
  name:       { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  phoneText:  { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  btnRow:     { flexDirection: 'row' },
  callBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10 },
  waBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', borderRadius: 10, paddingVertical: 10 },
  callIcon:   { fontSize: 16 },
  callText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  waText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
});
