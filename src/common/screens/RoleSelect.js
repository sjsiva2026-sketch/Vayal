// src/common/screens/RoleSelect.js
// Images: farmer_role.png (256×256) + owner_role.png (256×256) + logo.png (512×512)
// Sizes from IMG constants — pixel-accurate

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, Image, Dimensions, ScrollView,
} from 'react-native';
import { ICONS } from '../../../assets/index';
import { ROLES } from '../../../constants/roles';
import { FIcon } from '../../../utils/icons';
import { IMG }   from '../../../utils/imageSize';

const PRIMARY       = '#1C7C54';
const { width: W }  = Dimensions.get('window');
const scale         = W / 375;
const rf            = (dp) => Math.round(dp * scale);

export default function RoleSelect({ navigation }) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Top: Logo + name ── */}
        <View style={s.topSection}>
          {/*
            logo.png: 512×512px source
            Container: IMG.LOGO_CONTAINER (80dp) circle
            Image: IMG.LOGO_SIZE (64dp) — renders at 192px on xxhdpi
            Source 512px → 37% scale → very sharp, no pixelation
          */}
          <View style={[s.logoBg, { width: IMG.LOGO_CONTAINER, height: IMG.LOGO_CONTAINER, borderRadius: IMG.LOGO_CONTAINER / 2 }]}>
            <Image
              source={ICONS.logo}
              style={{ width: IMG.LOGO_SIZE, height: IMG.LOGO_SIZE }}
              resizeMode="contain"
            />
          </View>
          <Text style={s.appName}>Namma Vayal</Text>
          <Text style={s.appTamil}>நம்ம வாயல்</Text>
          <View style={s.tagPill}>
            <Text style={s.tagPillTxt}>Tamil Nadu's Farm Machinery App</Text>
          </View>
        </View>

        {/* ── Sheet ── */}
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>Get Started</Text>
          <Text style={s.sheetSub}>Choose how you want to use the app</Text>

          {/* ── Farmer card ── */}
          <TouchableOpacity
            style={s.roleCard}
            onPress={() => navigation.navigate('Login', { role: ROLES.FARMER })}
            activeOpacity={0.88}
          >
            {/*
              farmer_role.png: 256×256px source
              Container: IMG.ROLE_CONTAINER (80dp) circle
              Image: IMG.ROLE_SIZE (64dp) — renders at 192px on xxhdpi
              Source 256px → 75% scale → sharp ✅
            */}
            <View style={[s.roleIconBox, { width: IMG.ROLE_CONTAINER, height: IMG.ROLE_CONTAINER, borderRadius: IMG.ROLE_CONTAINER / 2, backgroundColor: '#E8F5EE' }]}>
              <Image
                source={ICONS.farmer}
                style={{ width: IMG.ROLE_SIZE, height: IMG.ROLE_SIZE }}
                resizeMode="contain"
              />
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
              <FIcon name="chevron-right" size={20} color={PRIMARY} fallback="›" />
            </View>
          </TouchableOpacity>

          {/* ── Owner card ── */}
          <TouchableOpacity
            style={s.roleCard}
            onPress={() => navigation.navigate('Login', { role: ROLES.OWNER })}
            activeOpacity={0.88}
          >
            {/*
              owner_role.png: 256×256px source
              Same sizing as farmer_role — sharp at 75% scale
            */}
            <View style={[s.roleIconBox, { width: IMG.ROLE_CONTAINER, height: IMG.ROLE_CONTAINER, borderRadius: IMG.ROLE_CONTAINER / 2, backgroundColor: '#FFF8E1' }]}>
              <Image
                source={ICONS.owner}
                style={{ width: IMG.ROLE_SIZE, height: IMG.ROLE_SIZE }}
                resizeMode="contain"
              />
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
              <FIcon name="chevron-right" size={20} color="#F59E0B" fallback="›" />
            </View>
          </TouchableOpacity>

          <Text style={s.footer}>🔒  Secure OTP login · No password · No spam</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#fff' },
  scroll:         { flexGrow: 1 },
  topSection:     { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  logoBg:         { backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: 14, overflow: 'hidden' },
  appName:        { fontSize: rf(28), fontWeight: '900', color: '#111827', letterSpacing: 1, marginBottom: 2 },
  appTamil:       { fontSize: rf(14), color: '#6B7280', letterSpacing: 3, marginBottom: 14 },
  tagPill:        { backgroundColor: '#F4F5F7', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  tagPillTxt:     { fontSize: rf(12), color: '#374151', fontWeight: '600' },
  sheet:          { flex: 1, backgroundColor: '#F4F5F7', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  handle:         { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 20 },
  sheetTitle:     { fontSize: rf(22), fontWeight: '800', color: '#111827', marginBottom: 4 },
  sheetSub:       { fontSize: rf(14), color: '#6B7280', marginBottom: 20 },
  roleCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#F0F0F0', elevation: 2 },
  roleIconBox:    { alignItems: 'center', justifyContent: 'center', marginRight: 14, overflow: 'hidden' },
  roleBody:       { flex: 1 },
  roleTitle:      { fontSize: rf(16), fontWeight: '800', color: '#111827' },
  roleTitleTamil: { fontSize: rf(11), color: '#9CA3AF', marginBottom: 3 },
  roleDesc:       { fontSize: rf(12), color: '#6B7280', lineHeight: rf(17), marginBottom: 8 },
  tagRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag:            { backgroundColor: '#E8F5EE', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  tagTxt:         { fontSize: rf(11), color: PRIMARY, fontWeight: '700' },
  arrowCircle:    { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  footer:         { fontSize: rf(12), color: '#9CA3AF', textAlign: 'center', paddingTop: 8 },
});
