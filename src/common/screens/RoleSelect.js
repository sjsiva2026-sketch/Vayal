// src/common/screens/RoleSelect.js
// Logo tap 5 times → Admin option appears with "Admin Login" button
// Admin uses email/password, NOT phone OTP

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, Image, Dimensions, ScrollView,
} from 'react-native';
import { ICONS } from '../../../assets/index';
import { ROLES } from '../../../constants/roles';
import { FIcon } from '../../../utils/icons';
import { IMG }   from '../../../utils/imageSize';

const PRIMARY      = '#1C7C54';
const { width: W } = Dimensions.get('window');
const scale        = W / 375;
const rf           = (dp) => Math.round(Math.min(Math.max(dp * scale, dp * 0.8), dp * 1.2));
const rs           = (dp) => Math.round(dp * scale);

export default function RoleSelect({ navigation }) {
  const [logoTaps,  setLogoTaps]  = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);

  const handleLogoTap = () => {
    const next = logoTaps + 1;
    setLogoTaps(next);
    if (next >= 5) { setShowAdmin(true); setLogoTaps(0); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} bounces={false}>

        {/* Logo */}
        <View style={s.topSection}>
          <TouchableOpacity onPress={handleLogoTap} activeOpacity={0.9}>
            <View style={[s.logoBg, {
              width: IMG.LOGO_CONTAINER, height: IMG.LOGO_CONTAINER,
              borderRadius: IMG.LOGO_CONTAINER / 2,
            }]}>
              <Image
                source={ICONS.logo}
                style={{ width: IMG.LOGO_SIZE, height: IMG.LOGO_SIZE }}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
          <Text style={s.appName}>Namma Vayal</Text>
          <Text style={s.appTamil}>நம்ம வயல்</Text>
          <View style={s.tagPill}>
            <Text style={s.tagPillTxt}>Tamil Nadu's Farm Machinery App</Text>
          </View>
          {logoTaps > 0 && logoTaps < 5 && (
            <Text style={s.tapHint}>{5 - logoTaps} more taps for admin</Text>
          )}
        </View>

        {/* Bottom sheet */}
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>Get Started</Text>
          <Text style={s.sheetSub}>Choose how you want to use the app</Text>

          {/* Farmer card */}
          <TouchableOpacity
            style={s.roleCard}
            onPress={() => navigation.navigate('Login', { role: ROLES.FARMER })}
            activeOpacity={0.88}
          >
            <View style={[s.roleIconBox, {
              width: IMG.ROLE_CONTAINER, height: IMG.ROLE_CONTAINER,
              borderRadius: IMG.ROLE_CONTAINER / 2, backgroundColor: '#E8F5EE',
            }]}>
              <Image source={ICONS.farmer} style={{ width: IMG.ROLE_SIZE, height: IMG.ROLE_SIZE }} resizeMode="contain" />
            </View>
            <View style={s.roleBody}>
              <Text style={s.roleTitle}>Farmer</Text>
              <Text style={s.roleTitleTamil}>விவசாயி</Text>
              <Text style={s.roleDesc}>Find & book farm machines near you</Text>
              <View style={s.tagRow}>
                <View style={s.tag}><Text style={s.tagTxt}>🔍 Search</Text></View>
                <View style={s.tag}><Text style={s.tagTxt}>📅 Book</Text></View>
                <View style={s.tag}><Text style={s.tagTxt}>📞 Call</Text></View>
              </View>
            </View>
            <View style={[s.arrowCircle, { backgroundColor: '#E8F5EE' }]}>
              <FIcon name="chevron-right" size={rs(20)} color={PRIMARY} fallback="›" />
            </View>
          </TouchableOpacity>

          {/* Owner card */}
          <TouchableOpacity
            style={s.roleCard}
            onPress={() => navigation.navigate('Login', { role: ROLES.OWNER })}
            activeOpacity={0.88}
          >
            <View style={[s.roleIconBox, {
              width: IMG.ROLE_CONTAINER, height: IMG.ROLE_CONTAINER,
              borderRadius: IMG.ROLE_CONTAINER / 2, backgroundColor: '#FFF8E1',
            }]}>
              <Image source={ICONS.owner} style={{ width: IMG.ROLE_SIZE, height: IMG.ROLE_SIZE }} resizeMode="contain" />
            </View>
            <View style={s.roleBody}>
              <Text style={s.roleTitle}>Machine Owner</Text>
              <Text style={s.roleTitleTamil}>இயந்திர உரிமையாளர்</Text>
              <Text style={s.roleDesc}>List machines & earn daily commission</Text>
              <View style={s.tagRow}>
                <View style={[s.tag, { backgroundColor: '#FFF3CD' }]}><Text style={[s.tagTxt, { color: '#92400E' }]}>🚜 List</Text></View>
                <View style={[s.tag, { backgroundColor: '#FFF3CD' }]}><Text style={[s.tagTxt, { color: '#92400E' }]}>💰 Earn</Text></View>
                <View style={[s.tag, { backgroundColor: '#FFF3CD' }]}><Text style={[s.tagTxt, { color: '#92400E' }]}>📊 Track</Text></View>
              </View>
            </View>
            <View style={[s.arrowCircle, { backgroundColor: '#FFF3CD' }]}>
              <FIcon name="chevron-right" size={rs(20)} color="#F59E0B" fallback="›" />
            </View>
          </TouchableOpacity>

          {/* Admin card — hidden, shows after 5 logo taps */}
          {showAdmin && (
            <TouchableOpacity
              style={[s.roleCard, s.adminCard]}
              onPress={() => {
                setShowAdmin(false);
                setLogoTaps(0);
                navigation.navigate('AdminLogin');  // → email/password screen
              }}
              activeOpacity={0.88}
            >
              <View style={[s.roleIconBox, {
                width: IMG.ROLE_CONTAINER, height: IMG.ROLE_CONTAINER,
                borderRadius: IMG.ROLE_CONTAINER / 2, backgroundColor: '#F5F0FF',
              }]}>
                <Text style={{ fontSize: rf(34) }}>🔐</Text>
              </View>
              <View style={s.roleBody}>
                <Text style={[s.roleTitle, { color: '#5B21B6' }]}>Admin</Text>
                <Text style={s.roleTitleTamil}>நிர்வாகி</Text>
                <Text style={s.roleDesc}>Sign in with email & password</Text>
                <View style={s.tagRow}>
                  <View style={[s.tag, { backgroundColor: '#EDE9FE' }]}>
                    <Text style={[s.tagTxt, { color: '#5B21B6' }]}>📧 Email Login</Text>
                  </View>
                  <View style={[s.tag, { backgroundColor: '#EDE9FE' }]}>
                    <Text style={[s.tagTxt, { color: '#5B21B6' }]}>🔑 Password</Text>
                  </View>
                </View>
              </View>
              <View style={[s.arrowCircle, { backgroundColor: '#EDE9FE' }]}>
                <FIcon name="chevron-right" size={rs(20)} color="#5B21B6" fallback="›" />
              </View>
            </TouchableOpacity>
          )}

          <Text style={s.footer}>🔒  Secure OTP login · No password · No spam</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#fff' },
  scroll:         { flexGrow: 1 },
  topSection:     { alignItems: 'center', paddingVertical: rs(32), paddingHorizontal: rs(24) },
  logoBg:         { backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: rs(14), overflow: 'hidden' },
  appName:        { fontSize: rf(28), fontWeight: '900', color: '#111827', letterSpacing: 1, marginBottom: rs(2) },
  appTamil:       { fontSize: rf(14), color: '#6B7280', letterSpacing: 3, marginBottom: rs(14) },
  tagPill:        { backgroundColor: '#F4F5F7', borderRadius: rs(20), paddingHorizontal: rs(16), paddingVertical: rs(6) },
  tagPillTxt:     { fontSize: rf(12), color: '#374151', fontWeight: '600' },
  tapHint:        { fontSize: rf(11), color: '#9CA3AF', marginTop: rs(8) },
  sheet:          { flex: 1, backgroundColor: '#F4F5F7', borderTopLeftRadius: rs(28), borderTopRightRadius: rs(28), paddingHorizontal: rs(20), paddingTop: rs(16), paddingBottom: rs(28) },
  handle:         { width: rs(40), height: rs(4), borderRadius: rs(2), backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: rs(20) },
  sheetTitle:     { fontSize: rf(22), fontWeight: '800', color: '#111827', marginBottom: rs(4) },
  sheetSub:       { fontSize: rf(14), color: '#6B7280', marginBottom: rs(20) },
  roleCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: rs(18), padding: rs(14), marginBottom: rs(14), borderWidth: 1, borderColor: '#F0F0F0', elevation: 2 },
  adminCard:      { borderColor: '#C4B5FD', borderWidth: rs(2) },
  roleIconBox:    { alignItems: 'center', justifyContent: 'center', marginRight: rs(14), overflow: 'hidden' },
  roleBody:       { flex: 1 },
  roleTitle:      { fontSize: rf(16), fontWeight: '800', color: '#111827' },
  roleTitleTamil: { fontSize: rf(11), color: '#9CA3AF', marginBottom: rs(3) },
  roleDesc:       { fontSize: rf(12), color: '#6B7280', lineHeight: rf(17), marginBottom: rs(8) },
  tagRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: rs(6) },
  tag:            { backgroundColor: '#E8F5EE', borderRadius: rs(10), paddingHorizontal: rs(9), paddingVertical: rs(3) },
  tagTxt:         { fontSize: rf(11), color: PRIMARY, fontWeight: '700' },
  arrowCircle:    { width: rs(34), height: rs(34), borderRadius: rs(17), alignItems: 'center', justifyContent: 'center' },
  footer:         { fontSize: rf(12), color: '#9CA3AF', textAlign: 'center', paddingTop: rs(8) },
});
