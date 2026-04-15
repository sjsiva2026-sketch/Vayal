import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Dimensions, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../../constants/colors';
import { ROLES }  from '../../../constants/roles';
import { ICONS }  from '../../../assets/index';

const { height } = Dimensions.get('window');

export default function RoleSelect({ navigation }) {
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#145A3E" />

      <LinearGradient colors={['#145A3E', '#1C7C54', '#2E9E6B']} style={s.hero}>
        <View style={s.circle1} />
        <View style={s.circle2} />
        <View style={s.logoWrap}>
          {ICONS.logo
            ? <Image source={ICONS.logo} style={s.logoImg} resizeMode="cover" />
            : <Text style={s.logoEmoji}>🌾</Text>
          }
        </View>
        <Text style={s.appName}>VAYAL</Text>
        <Text style={s.appTamil}>வாயல்</Text>
        <View style={s.taglineWrap}>
          <Text style={s.tagline}>Farmer · Machine Connect</Text>
        </View>
        <Text style={s.taglineSub}>Tamil Nadu's Agricultural Marketplace</Text>
      </LinearGradient>

      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <Text style={s.sheetTitle}>Select Your Role</Text>
        <Text style={s.sheetSub}>Choose how you want to use Vayal</Text>

        {/* Farmer card */}
        <TouchableOpacity
          style={s.roleCard}
          onPress={() => navigation.navigate('Login', { role: ROLES.FARMER })}
          activeOpacity={0.9}
        >
          <View style={[s.roleIconBox, { backgroundColor: '#E8FAF2' }]}>
            {ICONS.farmer
              ? <Image source={ICONS.farmer} style={s.roleImg} resizeMode="contain" />
              : <Text style={s.roleEmoji}>👨‍🌾</Text>
            }
          </View>
          <View style={s.roleBody}>
            <Text style={s.roleTitle}>Farmer</Text>
            <Text style={s.roleTitleTamil}>விவசாயி</Text>
            <Text style={s.roleDesc}>Find & book farm machines near you</Text>
            <View style={s.roleTagRow}>
              <View style={s.tag}><Text style={s.tagTxt}>🔍 Search</Text></View>
              <View style={[s.tag, { marginLeft: 6 }]}><Text style={s.tagTxt}>📅 Book</Text></View>
              <View style={[s.tag, { marginLeft: 6 }]}><Text style={s.tagTxt}>📞 Call</Text></View>
            </View>
          </View>
          <View style={s.arrowBox}>
            <Text style={s.arrowTxt}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Owner card */}
        <TouchableOpacity
          style={s.roleCard}
          onPress={() => navigation.navigate('Login', { role: ROLES.OWNER })}
          activeOpacity={0.9}
        >
          <View style={[s.roleIconBox, { backgroundColor: '#FFF8E1' }]}>
            {ICONS.owner
              ? <Image source={ICONS.owner} style={s.roleImg} resizeMode="contain" />
              : <Text style={s.roleEmoji}>🚜</Text>
            }
          </View>
          <View style={s.roleBody}>
            <Text style={s.roleTitle}>Machine Owner</Text>
            <Text style={s.roleTitleTamil}>இயந்திர உரிமையாளர்</Text>
            <Text style={s.roleDesc}>List machines & earn daily commission</Text>
            <View style={s.roleTagRow}>
              <View style={[s.tag, { backgroundColor: '#FFF3CD' }]}><Text style={[s.tagTxt, { color: '#92400E' }]}>🚜 List</Text></View>
              <View style={[s.tag, { backgroundColor: '#FFF3CD', marginLeft: 6 }]}><Text style={[s.tagTxt, { color: '#92400E' }]}>💰 Earn</Text></View>
              <View style={[s.tag, { backgroundColor: '#FFF3CD', marginLeft: 6 }]}><Text style={[s.tagTxt, { color: '#92400E' }]}>📊 Track</Text></View>
            </View>
          </View>
          <View style={[s.arrowBox, { backgroundColor: '#FFF3CD' }]}>
            <Text style={[s.arrowTxt, { color: '#92400E' }]}>›</Text>
          </View>
        </TouchableOpacity>

        <View style={s.footerRow}>
          <Text style={s.footerTxt}>🔒  Secure OTP login · No password · No spam</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#145A3E' },
  hero:           { height: height * 0.44, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  circle1:        { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.04)', top: -60, right: -80 },
  circle2:        { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.05)', bottom: 0, left: -50 },
  logoWrap:       { width: 88, height: 88, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, elevation: 10, overflow: 'hidden' },
  logoImg:        { width: '100%', height: '100%' },
  logoEmoji:      { fontSize: 44 },
  appName:        { fontSize: 48, fontWeight: '900', color: '#fff', letterSpacing: 10, marginBottom: 2 },
  appTamil:       { fontSize: 18, color: 'rgba(255,255,255,0.7)', letterSpacing: 4, marginBottom: 14 },
  taglineWrap:    { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 6, marginBottom: 8 },
  tagline:        { fontSize: 13, color: 'rgba(255,255,255,0.95)', fontWeight: '600' },
  taglineSub:     { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  sheet:          { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20 },
  sheetHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 20 },
  sheetTitle:     { fontSize: 24, fontWeight: '800', color: '#111827' },
  sheetSub:       { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 20 },
  roleCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1.5, borderColor: '#E8FAF0', elevation: 3 },
  roleIconBox:    { width: 72, height: 72, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 14, overflow: 'hidden' },
  roleImg:        { width: 68, height: 68 },
  roleEmoji:      { fontSize: 38 },
  roleBody:       { flex: 1 },
  roleTitle:      { fontSize: 16, fontWeight: '800', color: '#111827' },
  roleTitleTamil: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  roleDesc:       { fontSize: 12, color: '#6B7280', lineHeight: 17, marginBottom: 8 },
  roleTagRow:     { flexDirection: 'row' },
  tag:            { backgroundColor: '#E8FAF0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tagTxt:         { fontSize: 11, color: '#065F46', fontWeight: '600' },
  arrowBox:       { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8FAF0', alignItems: 'center', justifyContent: 'center' },
  arrowTxt:       { fontSize: 22, color: COLORS.primary, fontWeight: '700', lineHeight: 28 },
  footerRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  footerTxt:      { fontSize: 12, color: '#9CA3AF' },
});
