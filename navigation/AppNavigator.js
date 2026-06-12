// navigation/AppNavigator.js

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { FIcon }          from '../utils/icons';
import { useAuth }        from '../context/AuthContext';
import { useUser }        from '../context/UserContext';
import { checkTimeLock, listenOwnerLockState, computeLockState } from '../firebase/commission';
import { listenKycStatus }  from '../firebase/kyc';
import { registerForPushNotifications } from '../firebase/notifications';
import { COLORS } from '../constants/colors';
import { ROLES }  from '../constants/roles';
import { ICONS }  from '../assets/index';
import { rs, rf } from '../utils/responsive';

import RoleSelect                from '../src/common/screens/RoleSelect';
import LoginScreen               from '../src/common/screens/LoginScreen';
import OTPScreen                 from '../src/common/screens/OTPScreen';
import ProfileSetup              from '../src/common/screens/ProfileSetup';
import FarmerTabNavigator        from '../src/farmer/navigation/FarmerTabNavigator';
import LocationSelect            from '../src/farmer/screens/LocationSelect';
import MachineList               from '../src/farmer/screens/MachineList';
import MachineDetails            from '../src/farmer/screens/MachineDetails';
import BookingScreen             from '../src/farmer/screens/BookingScreen';
import BookingConfirm            from '../src/farmer/screens/BookingConfirm';
import RatingScreen              from '../src/farmer/screens/RatingScreen';
import OwnerTabNavigator         from '../src/owner/navigation/OwnerTabNavigator';
import OwnerDashboard            from '../src/owner/screens/OwnerDashboard';
import BookingDetails            from '../src/owner/screens/BookingDetails';
import WorkStartOTP              from '../src/owner/screens/WorkStartOTP';
import WorkInProgress            from '../src/owner/screens/WorkInProgress';
import WorkComplete              from '../src/owner/screens/WorkComplete';
import PayCommission             from '../src/owner/screens/PayCommission';
import PaymentScreenshotUpload   from '../src/owner/screens/PaymentScreenshotUpload';
import OwnerProfile              from '../src/owner/screens/OwnerProfile';
import EditMachine               from '../src/owner/screens/EditMachine';
import KycScreen                 from '../src/owner/screens/KycScreen';
import AdminLoginScreen          from '../src/admin/screens/AdminLoginScreen';
import AdminNavigator            from './AdminNavigator';
import AdminDashboard            from '../src/admin/screens/AdminDashboard';
import UsersList                 from '../src/admin/screens/UsersList';
import MachinesList              from '../src/admin/screens/MachinesList';
import PaymentsList              from '../src/admin/screens/PaymentsList';
import KycVerificationList       from '../src/admin/screens/KycVerificationList';
import Reports                   from '../src/admin/screens/Reports';
import AdminAppAccount           from '../src/admin/screens/AdminAppAccount';

const Stack = createNativeStackNavigator();

const HEADER = {
  headerStyle:      { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTintColor:  '#111827',
  headerTitleStyle: { fontWeight: '800', fontSize: 18, color: '#111827' },
  headerBackTitleVisible: false,
};

function ownerKycPassed(profile) {
  return profile?.isVerified    === true
      && profile?.kycStatus     === 'verified'
      && profile?.accessGranted === true;
}

// ── THE ONE AND ONLY SPLASH SCREEN ────────────────────────────────────────
// இது மட்டும் தெரியும் — app open ஆகும்போது authLoading true ஆ இருக்கும் வரை
// Green gradient + logo + "Namma Vayal" + "நம்ம வயல்" + spinner
function Splash() {
  return (
    <LinearGradient
      colors={['#145A3E', '#1C7C54', '#2E9E6B']}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{
        width: rs(120), height: rs(120),
        borderRadius: rs(30),
        overflow: 'hidden',
        borderWidth: rs(3),
        borderColor: 'rgba(255,255,255,0.25)',
        marginBottom: rs(28),
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {ICONS.logo
          ? <Image source={ICONS.logo} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          : <Text style={{ fontSize: rf(52) }}>🌾</Text>
        }
      </View>

      <Text style={{
        fontSize: rf(32), fontWeight: '900', color: '#fff',
        letterSpacing: 2, marginBottom: rs(6),
      }}>
        Namma Vayal
      </Text>

      <Text style={{
        fontSize: rf(16), color: 'rgba(255,255,255,0.70)',
        letterSpacing: 3, marginBottom: rs(48),
      }}>
        நம்ம வயல்
      </Text>

      <ActivityIndicator size="large" color="rgba(255,255,255,0.90)" />
    </LinearGradient>
  );
}

// ── LOCK WALL ─────────────────────────────────────────────────────────────
function LockWallScreen({ navigation }) {
  return (
    <LinearGradient colors={['#7F1D1D', '#B91C1C', '#EF4444']} style={lw.safe}>
      <View style={lw.iconBox}>
        <FIcon name="lock" size={rs(44)} color="#fff" fallback="🔒" />
      </View>
      <Text style={lw.appName}>Namma Vayal</Text>
      <Text style={lw.title}>Account Locked</Text>
      <Text style={lw.sub}>
        Your 24-hour commission window has passed.{'\n'}Pay commission to restore full access.
      </Text>
      <View style={lw.infoCard}>
        <Text style={lw.infoTitle}>Locked until payment:</Text>
        {['Accept new bookings', 'Start & complete work', 'Manage machines', 'All dashboard features'].map(t => (
          <View key={t} style={lw.infoRow}>
            <Text style={lw.checkMark}>✕</Text>
            <Text style={lw.infoItem}>{t}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={lw.payBtn}
        onPress={() => navigation.navigate('PayCommission')}
        activeOpacity={0.88}
      >
        <FIcon name="credit-card" size={rs(18)} color="#B91C1C" fallback="💳" style={{ marginRight: rs(8) }} />
        <Text style={lw.payBtnTxt}>Pay Commission Now</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const lw = StyleSheet.create({
  safe:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(28) },
  iconBox:   { width: rs(88), height: rs(88), borderRadius: rs(22), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: rs(14) },
  appName:   { fontSize: rf(13), color: 'rgba(255,255,255,0.55)', letterSpacing: 2, marginBottom: rs(6) },
  title:     { fontSize: rf(26), fontWeight: '900', color: '#fff', marginBottom: rs(10), textAlign: 'center' },
  sub:       { fontSize: rf(14), color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: rf(22), marginBottom: rs(24) },
  infoCard:  { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: rs(16), padding: rs(18), width: '100%', marginBottom: rs(24) },
  infoTitle: { fontSize: rf(13), fontWeight: '800', color: 'rgba(255,255,255,0.7)', marginBottom: rs(10) },
  infoRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: rs(7) },
  checkMark: { color: '#FCA5A5', marginRight: rs(8), fontSize: rf(13), fontWeight: '800' },
  infoItem:  { fontSize: rf(13), color: 'rgba(255,255,255,0.85)' },
  payBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: rs(16), paddingVertical: rs(17), width: '100%', elevation: 4 },
  payBtnTxt: { color: '#B91C1C', fontSize: rf(16), fontWeight: '900' },
});

// ── APP NAVIGATOR ─────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading: authLoading, userProfile: authProfile } = useAuth();
  const { userProfile: ctxProfile, setUserProfile, updateProfile } = useUser();
  const navRef       = useNavigationContainerRef();
  const lockTimerRef = useRef(null);
  const kycPassedRef = useRef(false);
  const pushRegRef   = useRef(false);
  const [ready, setReady] = useState(false);

  // 5s hard timeout — authLoading-ஐ force resolve பண்றது
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (authProfile && !ctxProfile) setUserProfile(authProfile);
  }, [authProfile, ctxProfile]);

  const profile = ctxProfile || authProfile;
  const uid     = profile?.id || user?.uid;
  const role    = profile?.role;

  // Push notification registration
  useEffect(() => {
    if (!uid || pushRegRef.current) return;
    pushRegRef.current = true;
    registerForPushNotifications(uid).catch(() => {});
  }, [uid]);

  // Notification tap → navigate
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const screen = response.notification.request.content.data?.screen;
      if (!screen) return;
      setTimeout(() => {
        if (navRef.isReady()) {
          try { navRef.navigate(screen); } catch {}
        }
      }, 500);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    kycPassedRef.current = ownerKycPassed(profile);
  }, [profile?.isVerified, profile?.kycStatus, profile?.accessGranted]);

  // KYC status listener for owner
  useEffect(() => {
    if (!uid || role !== ROLES.OWNER) return;
    const unsub = listenKycStatus(uid, ({ kycStatus, accessGranted, isVerified }) => {
      updateProfile({ kycStatus, accessGranted, isVerified });
      if (!navRef.isReady()) return;
      const passed    = isVerified === true && kycStatus === 'verified' && accessGranted === true;
      const wasPassed = kycPassedRef.current;
      if (passed && !wasPassed) {
        kycPassedRef.current = true;
        navRef.reset({ index: 0, routes: [{ name: 'OwnerHome' }] });
      } else if (!passed && wasPassed) {
        kycPassedRef.current = false;
        navRef.reset({ index: 0, routes: [{ name: 'KycScreen' }] });
      }
    });
    return unsub;
  }, [uid, role]);

  // Lock state listener for owner
  useEffect(() => {
    if (!uid || role !== ROLES.OWNER || !kycPassedRef.current) return;
    const unsub = listenOwnerLockState(uid, (state) => {
      const wasLocked = profile?.isLocked === true;
      updateProfile({
        isLocked:         state.isLocked,
        paymentStatus:    state.paymentStatus,
        otpVerifiedAt:    state.otpVerifiedAt,
        paymentDeadline:  state.paymentDeadline,
        commissionAmount: state.commissionAmount,
      });
      if (!navRef.isReady()) return;
      if (state.isLocked && !wasLocked) {
        navRef.reset({ index: 0, routes: [{ name: 'LockWall' }] });
      } else if (!state.isLocked && wasLocked && state.paymentStatus === 'paid') {
        navRef.reset({ index: 0, routes: [{ name: 'OwnerHome' }] });
      }
    });
    return unsub;
  }, [uid, role, profile?.accessGranted, profile?.isVerified]);

  // Auto-lock timer
  useEffect(() => {
    clearTimeout(lockTimerRef.current);
    if (!uid || role !== ROLES.OWNER || !kycPassedRef.current) return;
    if (profile?.paymentStatus === 'paid' || profile?.isLocked) return;
    const { msRemaining } = computeLockState(profile);
    if (!msRemaining || msRemaining <= 0) return;
    lockTimerRef.current = setTimeout(async () => {
      const result = await checkTimeLock(uid).catch(() => null);
      if (result?.isLocked) {
        updateProfile({ isLocked: true });
        if (navRef.isReady()) navRef.reset({ index: 0, routes: [{ name: 'LockWall' }] });
      }
    }, msRemaining);
    return () => clearTimeout(lockTimerRef.current);
  }, [uid, role, profile?.otpVerifiedAt, profile?.isLocked, profile?.paymentStatus, profile?.accessGranted]);

  // ── SPLASH — authLoading true-ஆ இருக்கும்போது இந்த screen மட்டும் தெரியும்
  if (authLoading && !ready) return <Splash />;

  // ── Initial route decide ──────────────────────────────────────────────
  let initialRoute = 'RoleSelect';
  if (user?.uid && role) {
    if (role === ROLES.FARMER) {
      initialRoute = 'FarmerHome';
    } else if (role === ROLES.OWNER) {
      const kycOk = ownerKycPassed(profile);
      kycPassedRef.current = kycOk;
      if (!kycOk) {
        initialRoute = 'KycScreen';
      } else {
        const isLocked = profile?.isLocked === true || computeLockState(profile).shouldLock;
        initialRoute = isLocked ? 'LockWall' : 'OwnerHome';
      }
    } else if (role === ROLES.ADMIN) {
      initialRoute = 'AdminDashboard';
    }
  }

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={HEADER}>

        <Stack.Screen name="RoleSelect"   component={RoleSelect}   options={{ headerShown: false }} />
        <Stack.Screen name="Login"        component={LoginScreen}  options={{ headerShown: false }} />
        <Stack.Screen name="OTP"          component={OTPScreen}    options={{ headerShown: false }} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetup} options={{ headerShown: false }} />

        <Stack.Screen name="FarmerHome"     component={FarmerTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="LocationSelect" component={LocationSelect}     options={{ title: 'Set Location' }} />
        <Stack.Screen name="MachineList"    component={MachineList}        options={{ title: 'Available Machines' }} />
        <Stack.Screen name="MachineDetails" component={MachineDetails}     options={{ title: 'Machine Details' }} />
        <Stack.Screen name="Booking"        component={BookingScreen}      options={{ title: 'Book Machine' }} />
        <Stack.Screen name="BookingConfirm" component={BookingConfirm}     options={{ title: 'Booking Confirmed' }} />
        <Stack.Screen name="RatingScreen"   component={RatingScreen}       options={{ title: 'Rate Experience' }} />

        <Stack.Screen name="KycScreen"  component={KycScreen}      options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="LockWall"   component={LockWallScreen} options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen
          name="PayCommission"
          component={PayCommission}
          options={{
            title: 'Pay Commission',
            headerStyle: { backgroundColor: '#B91C1C', elevation: 0 },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '800', fontSize: 18, color: '#fff' },
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="PaymentScreenshotUpload" component={PaymentScreenshotUpload} options={{ headerShown: false }} />
        <Stack.Screen name="OwnerHome"      component={OwnerTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="OwnerDashboard" component={OwnerDashboard}    options={{ headerShown: false }} />
        <Stack.Screen name="BookingDetails" component={BookingDetails}    options={{ title: 'Booking Details' }} />
        <Stack.Screen name="WorkStartOTP"   component={WorkStartOTP}      options={{ title: 'Start Work' }} />
        <Stack.Screen name="WorkInProgress" component={WorkInProgress}    options={{ title: 'Work In Progress' }} />
        <Stack.Screen name="WorkComplete"   component={WorkComplete}      options={{ title: 'Complete Work' }} />
        <Stack.Screen name="OwnerProfile"   component={OwnerProfile}      options={{ title: 'My Profile' }} />
        <Stack.Screen name="EditMachine"    component={EditMachine}       options={{ title: 'Edit Machine' }} />

        <Stack.Screen name="AdminLogin"          component={AdminLoginScreen}    options={{ headerShown: false }} />
        <Stack.Screen name="AdminDashboard"      component={AdminNavigator}      options={{ headerShown: false }} />
        <Stack.Screen name="UsersList"           component={UsersList}           options={{ title: 'Users' }} />
        <Stack.Screen name="MachinesList"        component={MachinesList}        options={{ title: 'Machines' }} />
        <Stack.Screen name="PaymentsList"        component={PaymentsList}        options={{ title: 'Commission Payments' }} />
        <Stack.Screen name="KycVerificationList" component={KycVerificationList} options={{ title: 'KYC Verification' }} />
        <Stack.Screen name="Reports"             component={Reports}             options={{ title: 'Reports' }} />
        <Stack.Screen name="AdminAppAccount"     component={AdminAppAccount}     options={{ title: 'App Account' }} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
