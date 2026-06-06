// src/common/components/PhoneConnect.js
// WhatsApp ONLY — no call button

import React from 'react';
import {
  View, Text, TouchableOpacity, Linking,
  Alert, StyleSheet,
} from 'react-native';
import { rs, rf } from '../../../utils/responsive';
import { COLORS }  from '../../../constants/colors';

export default function PhoneConnect({ phone, name, role }) {
  if (!phone) return null;

  const cleaned     = phone.replace(/\D/g, '');
  const withCountry = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
  const localNum    = cleaned.startsWith('91') ? cleaned.slice(2) : cleaned;

  const whatsapp = async () => {
    const appUrl = `whatsapp://send?phone=${withCountry}`;
    const webUrl = `https://wa.me/${withCountry}`;
    try {
      const canApp = await Linking.canOpenURL(appUrl);
      await Linking.openURL(canApp ? appUrl : webUrl);
    } catch {
      try { await Linking.openURL(webUrl); }
      catch { Alert.alert('WhatsApp', `Send message to: +91 ${localNum}`); }
    }
  };

  return (
    <View style={s.card}>
      <View style={s.info}>
        {role ? <Text style={s.role}>{role}</Text> : null}
        {name ? <Text style={s.name}>{name}</Text> : null}
        <Text style={s.phone}>📱 +91 {localNum}</Text>
      </View>
      <TouchableOpacity style={s.waBtn} onPress={whatsapp} activeOpacity={0.85}>
        <Text style={s.waIcon}>💬</Text>
        <Text style={s.waTxt}>WhatsApp</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card:   { backgroundColor:'#fff', borderRadius:rs(14), padding:rs(14), elevation:2, borderWidth:1, borderColor:'#F0F0F0', marginBottom:rs(12) },
  info:   { marginBottom:rs(12) },
  role:   { fontSize:rf(11), color:'#9CA3AF', fontWeight:'600', marginBottom:rs(2) },
  name:   { fontSize:rf(15), fontWeight:'800', color:'#111827', marginBottom:rs(4) },
  phone:  { fontSize:rf(13), color:COLORS.primary, fontWeight:'600' },
  waBtn:  { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#25D366', borderRadius:rs(12), paddingVertical:rs(12), gap:rs(8) },
  waIcon: { fontSize:rf(18) },
  waTxt:  { fontSize:rf(14), fontWeight:'800', color:'#fff' },
});
