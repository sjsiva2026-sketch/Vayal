// navigation/AppNavigator.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, ActivityIndicator,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import { NavigationContainer }        from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient }             from 'expo-linear-gradient';
import { Feather }                    from '@expo/vector-icons';

import { useAuth }    from '../context/AuthContext';
import { useUser }    from '../context/UserContext';
import { updateUser } from '../firebase/firestore';
import { COLORS }     from '../constants/colors';
import { ROLES }      from '../constants/roles';
import { ICONS }      from '../assets/index';

// Auth
import RoleSelect   from '../src/common/screens/RoleSelect';
import LoginScreen  from '../src/common/screens/LoginScreen';
import OTPScreen    from '../src/common/screens/OTPScreen';
import ProfileSetup from '../src/common/screens/ProfileSetup';

// ── Farmer — Bottom Tab Navigator
import FarmerTabNavigator from '../src/farmer/navigation/FarmerTabNavigator';
import LocationSelect from '../src/farmer/screens/LocationSelect';
import MachineList    from '../src/farmer/screens/MachineList';
import MachineDetails from '../src/farmer/screens/MachineDetails';
import BookingScreen  from '../src/farmer/screens/BookingScreen';
import BookingConfirm from '../src/farmer/screens/BookingConfirm';
import RatingScreen   from '../src/farmer/screens/RatingScreen';

// ── Owner — Bottom Tab Navigator
import OwnerTabNavigator from '../src/owner/navigation/OwnerTabNavigator';
import OwnerDashboard    from '../src/owner/screens/OwnerDashboard';
import BookingDetails    from '../src/owner/screens/BookingDetails';
import WorkStartOTP      from '../src/owner/screens/WorkStartOTP';
import WorkInProgress    from '../src/owner/screens/WorkInProgress';
import WorkComplete      from '../src/owner/screens/WorkComplete';
import PaymentScreen     from '../src/owner/screens/PaymentScreen';
import OwnerProfile      from '../src/owner/screens/OwnerProfile';
import EditMachine       from '../src/owner/screens/EditMachine';

// Admin
import AdminDashboard   from '../src/admin/screens/AdminDashboard';
import UsersList        from '../src/admin/screens/UsersList';
import MachinesList     from '../src/admin/screens/MachinesList';
import PaymentsList     from '../src/admin/screens/PaymentsList';
import Reports          from '../src/admin/screens/Reports';
import AdminAppAccount  from '../src/admin/screens/AdminAppAccount';

const Stack   = createNativeStackNavigator();
const PRIMARY = '#1C7C54';

const HEADER = {
  headerStyle:      { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTintColor:  '#111827',
  headerTitleStyle: { fontWeight: '800', fontSize: 18, color: '#111827' },
  headerBackTitleVisible: false,
};

// ── Splash ────────────────────────────────────────────────────────────────────
function Splash() {
  return (
    <LinearGradient
      colors={['#145A3E', '#1C7C54', '#2E9E6B']}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{
        width: 110, height: 110, borderRadius: 28, overflow: 'hidden',
        borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)', marginBottom: 24,
        elevation: 10, backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {ICONS.logo
          ? <Image source={ICONS.logo} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          : <Text style={{ fontSize: 56 }}>🌾</Text>}
      </View>
      <Text style={{ fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 4, marginBottom: 4 }}>
        Namma Vayal
      </Text>
      <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', letterSpacing: 3, marginBottom: 48 }}>
        நம்ம வாயல்
      </Text>
      <ActivityIndicator size="large" color="rgba(255,255,255,0.85)" />
    </LinearGradient>
  );
}

// ── LockWall ──────────────────────────────────────────────────────────────────
function LockWallScreen({ navigation }) {
  return (
    <LinearGradient colors={['#7F1D1D', '#B91C1C', '#EF4444']} style={ls.safe}>
      <View style={ls.iconBox}>
        <Feather name="lock" size={48} color="#fff" />
      </View>
      <Text style={ls.appName}>Namma Vayal</Text>
      <Text style={ls.title}>Account Locked</Text>
      <Text style={ls.sub}>
        Your 24-hour commission window has passed.{'\n'}
        Pay commission to unlock all features.
      </Text>
      <View style={ls.infoCard}>
        <Text style={ls.infoTitle}>Pay to unlock:</Text>
        {[
          'Accept new booking requests',
          'Start & complete work',
          'Manage your machines',
          'All dashboard features',
        ].map(t => (
          <View key={t} style={ls.infoRow}>
            <Feather name="check-circle" size={14} color="#6EE7B7" style={{ marginRight: 8 }} />
            <Text style={ls.infoItem}>{t}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={ls.payBtn}
        onPress={() => navigation.navigate('PayCommission')}
        activeOpacity={0.88}
      >
        <Feather name="credit-card" size={18} color="#B91C1C" style={{ marginRight: 8 }} />
        <Text style={ls.payBtnTxt}>Pay Commission Now</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const ls = StyleSheet.create({
  safe:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  iconBox:   { width: 96, height: 96, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  appName:   { fontSize: 14, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: 8 },
  title:     { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 10, textAlign: 'center' },
  sub:       { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  infoCard:  { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, padding: 20, width: '100%', marginBottom: 28 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 12 },
  infoRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoItem:  { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 20 },
  payBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 18, width: '100%', elevation: 4 },
  payBtnTxt: { color: '#B91C1C', fontSize: 17, fontWeight: '900' },
});

// ── AppNavigator ──────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading: authLoading, userProfile: authProfile } = useAuth();
  const { userProfile: ctxProfile, setUserProfile, updateProfile } = useUser();
  const [ready, setReady] = useState(false);
  const lockTimerRef      = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (authProfile && !ctxProfile) setUserProfile(authProfile);
  }, [authProfile, ctxProfile, setUserProfile]);

  const profile = ctxProfile || authProfile;

  // 24-hour auto-lock
  useEffect(() => {
    clearTimeout(lockTimerRef.current);
    if (profile?.role !== ROLES.OWNER) return;
    if (profile?.isLocked === true)    return;
    const deadline = profile?.paymentDeadline;
    if (!deadline) return;
    const uid    = profile?.id;
    const msLeft = new Date(deadline).getTime() - Date.now();
    const doLock = async () => {
      try {
        await updateUser(uid, { isLocked: true });
        updateProfile({ isLocked: true });
      } catch { lockTimerRef.current = setTimeout(doLock, 30_000); }
    };
    if (msLeft <= 0) doLock();
    else lockTimerRef.current = setTimeout(doLock, msLeft);
    return () => clearTimeout(lockTimerRef.current);
  }, [profile?.role, profile?.isLocked, profile?.paymentDeadline, profile?.id]);

  if (authLoading && !ready) return <Splash />;

  const role     = profile?.role;
  const isLocked = profile?.isLocked === true;

  let initialRoute = 'RoleSelect';
  if (user?.uid && role) {
    if      (role === ROLES.FARMER) initialRoute = 'FarmerHome';
    else if (role === ROLES.OWNER)  initialRoute = isLocked ? 'LockWall' : 'OwnerHome';
    else if (role === ROLES.ADMIN)  initialRoute = 'AdminDashboard';
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={HEADER}>

        {/* ── Auth ── */}
        <Stack.Screen name="RoleSelect"   component={RoleSelect}   options={{ headerShown: false }} />
        <Stack.Screen name="Login"        component={LoginScreen}  options={{ headerShown: false }} />
        <Stack.Screen name="OTP"          component={OTPScreen}    options={{ headerShown: false }} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetup} options={{ headerShown: false }} />

        {/* ── Farmer — Tab Navigator ── */}
        <Stack.Screen name="FarmerHome"     component={FarmerTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="LocationSelect" component={LocationSelect}     options={{ title: 'Set Location' }} />
        <Stack.Screen name="MachineList"    component={MachineList}        options={{ title: 'Available Machines' }} />
        <Stack.Screen name="MachineDetails" component={MachineDetails}     options={{ title: 'Machine Details' }} />
        <Stack.Screen name="Booking"        component={BookingScreen}      options={{ title: 'Book Machine' }} />
        <Stack.Screen name="BookingConfirm" component={BookingConfirm}     options={{ title: 'Booking Confirmed' }} />
        <Stack.Screen name="RatingScreen"   component={RatingScreen}       options={{ title: 'Rate Experience' }} />

        {/* ── Lock Wall — always registered ── */}
        <Stack.Screen
          name="LockWall"
          component={LockWallScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="PayCommission"
          component={PaymentScreen}
          options={{
            title: 'Pay Commission',
            headerStyle: { backgroundColor: '#B91C1C' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '800' },
            gestureEnabled: false,
          }}
        />

        {/* ── Owner — Tab Navigator as home ── */}
        <Stack.Screen
          name="OwnerHome"
          component={OwnerTabNavigator}
          options={{ headerShown: false }}
        />

        {/* ── Owner — legacy Dashboard (for navigate('OwnerDashboard') calls) ── */}
        <Stack.Screen
          name="OwnerDashboard"
          component={OwnerDashboard}
          options={{ headerShown: false }}
        />

        {/* ── Owner — stack screens pushed from tabs ── */}
        <Stack.Screen name="BookingDetails"    component={BookingDetails}   options={{ title: 'Booking Details' }} />
        <Stack.Screen name="WorkStartOTP"      component={WorkStartOTP}     options={{ title: 'Start Work' }} />
        <Stack.Screen name="WorkInProgress"    component={WorkInProgress}   options={{ title: 'Work In Progress' }} />
        <Stack.Screen name="WorkComplete"      component={WorkComplete}     options={{ title: 'Complete Work' }} />
        <Stack.Screen name="Payment"           component={PaymentScreen}    options={{ title: 'Pay Commission' }} />
        <Stack.Screen name="OwnerProfile"      component={OwnerProfile}     options={{ title: 'My Profile' }} />
        <Stack.Screen name="EditMachine"       component={EditMachine}      options={{ title: 'Edit Machine' }} />

        {/* ── Admin ── */}
        <Stack.Screen name="AdminDashboard"   component={AdminDashboard}  options={{ headerShown: false }} />
        <Stack.Screen name="UsersList"        component={UsersList}       options={{ title: 'Users' }} />
        <Stack.Screen name="MachinesList"     component={MachinesList}    options={{ title: 'Machines' }} />
        <Stack.Screen name="PaymentsList"     component={PaymentsList}    options={{ title: 'Payments' }} />
        <Stack.Screen name="Reports"          component={Reports}         options={{ title: 'Reports' }} />
        <Stack.Screen name="AdminAppAccount"  component={AdminAppAccount} options={{ title: 'App Bank Account' }} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
