// navigation/AppNavigator.js
import React, { useState, useEffect } from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import { NavigationContainer }        from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient }             from 'expo-linear-gradient';

import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { COLORS }  from '../constants/colors';
import { ROLES }   from '../constants/roles';
import { ICONS }   from '../assets/index';

// Auth
import RoleSelect   from '../src/common/screens/RoleSelect';
import LoginScreen  from '../src/common/screens/LoginScreen';
import OTPScreen    from '../src/common/screens/OTPScreen';
import ProfileSetup from '../src/common/screens/ProfileSetup';

// Farmer
import FarmerHome     from '../src/farmer/screens/FarmerHome';
import LocationSelect from '../src/farmer/screens/LocationSelect';
import CategoryScreen from '../src/farmer/screens/CategoryScreen';
import MachineList    from '../src/farmer/screens/MachineList';
import MachineDetails from '../src/farmer/screens/MachineDetails';
import BookingScreen  from '../src/farmer/screens/BookingScreen';
import BookingConfirm from '../src/farmer/screens/BookingConfirm';
import BookingHistory from '../src/farmer/screens/BookingHistory';
import FarmerProfile  from '../src/farmer/screens/FarmerProfile';

// Owner
import OwnerDashboard   from '../src/owner/screens/OwnerDashboard';
import AddMachine       from '../src/owner/screens/AddMachine';
import EditMachine      from '../src/owner/screens/EditMachine';
import MachineListOwner from '../src/owner/screens/MachineListOwner';
import BookingRequests  from '../src/owner/screens/BookingRequests';
import BookingDetails   from '../src/owner/screens/BookingDetails';
import WorkStartOTP     from '../src/owner/screens/WorkStartOTP';
import WorkInProgress   from '../src/owner/screens/WorkInProgress';
import WorkComplete     from '../src/owner/screens/WorkComplete';
import DailySummary     from '../src/owner/screens/DailySummary';
import PaymentScreen    from '../src/owner/screens/PaymentScreen';
import OwnerProfile     from '../src/owner/screens/OwnerProfile';

// Admin
import AdminDashboard from '../src/admin/screens/AdminDashboard';
import UsersList      from '../src/admin/screens/UsersList';
import MachinesList   from '../src/admin/screens/MachinesList';
import PaymentsList   from '../src/admin/screens/PaymentsList';
import Reports        from '../src/admin/screens/Reports';

const Stack = createNativeStackNavigator();

const HEADER = {
  headerStyle:      { backgroundColor: COLORS.primaryDark },
  headerTintColor:  '#fff',
  headerTitleStyle: { fontWeight: '800', fontSize: 17 },
};

function Splash() {
  return (
    <LinearGradient
      colors={['#145A3E', '#1C7C54', '#2E9E6B']}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{
        width: 110, height: 110, borderRadius: 28, overflow: 'hidden',
        borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)',
        marginBottom: 24, elevation: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {ICONS.logo
          ? <Image source={ICONS.logo} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          : <Text style={{ fontSize: 56 }}>🌾</Text>
        }
      </View>
      <Text style={{ fontSize: 44, fontWeight: '900', color: '#fff', letterSpacing: 10, marginBottom: 4 }}>
        VAYAL
      </Text>
      <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', letterSpacing: 3, marginBottom: 48 }}>
        வாயல்
      </Text>
      <ActivityIndicator size="large" color="rgba(255,255,255,0.85)" />
    </LinearGradient>
  );
}

export default function AppNavigator() {
  const { user, loading: authLoading, userProfile: authProfile } = useAuth();
  const { userProfile: ctxProfile, setUserProfile }              = useUser();

  // Safety — never freeze on splash > 8 s
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (authProfile && !ctxProfile) setUserProfile(authProfile);
  }, [authProfile, ctxProfile, setUserProfile]);

  if (authLoading && !ready) return <Splash />;

  const profile = ctxProfile || authProfile;
  let initialRoute = 'RoleSelect';
  if (user?.uid && profile?.role) {
    if      (profile.role === ROLES.FARMER) initialRoute = 'FarmerHome';
    else if (profile.role === ROLES.OWNER)  initialRoute = 'OwnerDashboard';
    else if (profile.role === ROLES.ADMIN)  initialRoute = 'AdminDashboard';
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={HEADER}>

        {/* Auth */}
        <Stack.Screen name="RoleSelect"   component={RoleSelect}   options={{ headerShown: false }} />
        <Stack.Screen name="Login"        component={LoginScreen}  options={{ headerShown: false }} />
        <Stack.Screen name="OTP"          component={OTPScreen}    options={{ headerShown: false }} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetup} options={{ headerShown: false }} />

        {/* Farmer */}
        <Stack.Screen name="FarmerHome"     component={FarmerHome}     options={{ headerShown: false }} />
        <Stack.Screen name="LocationSelect" component={LocationSelect}  options={{ title: 'Set Location' }} />
        <Stack.Screen name="Category"       component={CategoryScreen}  options={{ title: 'Machine Type' }} />
        <Stack.Screen name="MachineList"    component={MachineList}     options={{ title: 'Available Machines' }} />
        <Stack.Screen name="MachineDetails" component={MachineDetails}  options={{ title: 'Machine Details' }} />
        <Stack.Screen name="Booking"        component={BookingScreen}   options={{ title: 'Book Machine' }} />
        <Stack.Screen name="BookingConfirm" component={BookingConfirm}  options={{ title: 'Booking Confirmed' }} />
        <Stack.Screen name="BookingHistory" component={BookingHistory}  options={{ title: 'My Bookings' }} />
        <Stack.Screen name="FarmerProfile"  component={FarmerProfile}   options={{ title: 'My Profile' }} />

        {/* Owner */}
        <Stack.Screen name="OwnerDashboard"   component={OwnerDashboard}   options={{ headerShown: false }} />
        <Stack.Screen name="AddMachine"       component={AddMachine}       options={{ title: 'Add Machine' }} />
        <Stack.Screen name="EditMachine"      component={EditMachine}      options={{ title: 'Edit Machine' }} />
        <Stack.Screen name="MachineListOwner" component={MachineListOwner} options={{ title: 'My Machines' }} />
        <Stack.Screen name="BookingRequests"  component={BookingRequests}  options={{ title: 'Booking Requests' }} />
        <Stack.Screen name="BookingDetails"   component={BookingDetails}   options={{ title: 'Booking Details' }} />
        <Stack.Screen name="WorkStartOTP"     component={WorkStartOTP}     options={{ title: 'Start Work' }} />
        <Stack.Screen name="WorkInProgress"   component={WorkInProgress}   options={{ title: 'Work In Progress' }} />
        <Stack.Screen name="WorkComplete"     component={WorkComplete}     options={{ title: 'Complete Work' }} />
        <Stack.Screen name="DailySummary"     component={DailySummary}     options={{ title: "Today's Summary" }} />
        <Stack.Screen name="Payment"          component={PaymentScreen}    options={{ title: 'Pay Commission' }} />
        <Stack.Screen name="OwnerProfile"     component={OwnerProfile}     options={{ title: 'My Profile' }} />

        {/* Admin */}
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ title: 'Admin' }} />
        <Stack.Screen name="UsersList"      component={UsersList}      options={{ title: 'Users' }} />
        <Stack.Screen name="MachinesList"   component={MachinesList}   options={{ title: 'Machines' }} />
        <Stack.Screen name="PaymentsList"   component={PaymentsList}   options={{ title: 'Payments' }} />
        <Stack.Screen name="Reports"        component={Reports}        options={{ title: 'Reports' }} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
