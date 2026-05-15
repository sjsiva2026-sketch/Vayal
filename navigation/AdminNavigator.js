// navigation/AdminNavigator.js
// FIXED: 6 tabs — Dashboard, KYC, Payments, Users, Machines, Profile
// FIXED: Responsive tab bar — equal spacing, all screen ratios
// FIXED: SafeAreaView + StatusBar in all screens

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions,
} from 'react-native';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IIcon, FIcon }  from '../utils/icons';
import { COLORS }        from '../constants/colors';
import { rs, rf, BOTTOM_NAV_H } from '../utils/responsive';

import AdminDashboard      from '../src/admin/screens/AdminDashboard';
import KycVerificationList from '../src/admin/screens/KycVerificationList';
import PaymentsList        from '../src/admin/screens/PaymentsList';
import UsersList           from '../src/admin/screens/UsersList';
import MachinesList        from '../src/admin/screens/MachinesList';
import Reports             from '../src/admin/screens/Reports';
import AdminAppAccount     from '../src/admin/screens/AdminAppAccount';
import AdminProfile        from '../src/admin/screens/AdminProfile';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const { width: W } = Dimensions.get('window');

const ADMIN_GREEN = '#0F4C2A';
const ADMIN_ACTIVE_BG = '#E8F5EE';

const HEADER_OPTS = {
  headerStyle:      { backgroundColor: '#fff', elevation: 0, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTintColor:  '#111827',
  headerTitleStyle: { fontWeight: '800', fontSize: rf(18), color: '#111827' },
  headerBackTitleVisible: false,
};

// Dashboard + sub-screens stack
function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen name="AdminDashboardMain"  component={AdminDashboard}      options={{ headerShown: false }} />
      <Stack.Screen name="KycVerificationList" component={KycVerificationList} options={{ title: 'KYC Verification' }} />
      <Stack.Screen name="PaymentsList"        component={PaymentsList}        options={{ title: 'Commission Payments' }} />
      <Stack.Screen name="UsersList"           component={UsersList}           options={{ title: 'Users' }} />
      <Stack.Screen name="MachinesList"        component={MachinesList}        options={{ title: 'Machines' }} />
      <Stack.Screen name="Reports"             component={Reports}             options={{ title: 'Reports' }} />
      <Stack.Screen name="AdminAppAccount"     component={AdminAppAccount}     options={{ title: 'App Account' }} />
    </Stack.Navigator>
  );
}

// Tab definitions
const TABS = [
  {
    name:  'Dashboard',
    label: 'Home',
    icon:  (c, focused) => <FIcon name="home" size={rs(22)} color={c} fallback="🏠" />,
  },
  {
    name:  'KYCTab',
    label: 'KYC',
    icon:  (c, focused) => <IIcon name="document-text-outline" size={rs(22)} color={c} fallback="🪪" />,
  },
  {
    name:  'PayTab',
    label: 'Payments',
    icon:  (c, focused) => <IIcon name="card-outline" size={rs(22)} color={c} fallback="💰" />,
  },
  {
    name:  'UsersTab',
    label: 'Users',
    icon:  (c, focused) => <IIcon name="people-outline" size={rs(22)} color={c} fallback="👥" />,
  },
  {
    name:  'MachinesTab',
    label: 'Machines',
    icon:  (c, focused) => <IIcon name="construct-outline" size={rs(22)} color={c} fallback="🚜" />,
  },
  {
    name:  'ProfileTab',
    label: 'Profile',
    icon:  (c, focused) => <IIcon name="person-circle-outline" size={rs(24)} color={c} fallback="👤" />,
  },
];

// Responsive tab bar
function AdminTabBar({ state, navigation }) {
  return (
    <View style={tb.bar}>
      {TABS.map((tab, idx) => {
        const routeIndex = state.routes.findIndex(r => r.name === tab.name);
        const focused    = routeIndex !== -1 && state.index === routeIndex;
        const color      = focused ? ADMIN_GREEN : '#9CA3AF';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes[routeIndex]?.key || '',
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented && routeIndex !== -1) {
            navigation.navigate(state.routes[routeIndex].name);
          }
        };

        return (
          <TouchableOpacity
            key={tab.name}
            style={tb.tab}
            activeOpacity={0.7}
            onPress={onPress}
          >
            <View style={[tb.iconWrap, focused && tb.iconWrapActive]}>
              {tab.icon(color, focused)}
            </View>
            <Text
              style={[tb.label, focused && tb.labelActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tb = StyleSheet.create({
  bar: {
    flexDirection:   'row',
    backgroundColor: '#fff',
    borderTopWidth:  1,
    borderTopColor:  '#EBEBEB',
    height:          BOTTOM_NAV_H,
    paddingBottom:   Platform.OS === 'android' ? rs(6) : rs(20),
    paddingTop:      rs(6),
    alignItems:      'center',
    elevation:       16,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -2 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
  },
  tab: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    // Ensure no overflow on any screen ratio
    paddingHorizontal: rs(2),
  },
  iconWrap: {
    width:           rs(38),
    height:          rs(28),
    alignItems:      'center',
    justifyContent:  'center',
    borderRadius:    rs(8),
  },
  iconWrapActive: { backgroundColor: ADMIN_ACTIVE_BG },
  label: {
    fontSize:        rf(9),
    color:           '#9CA3AF',
    fontWeight:      '500',
    marginTop:       rs(2),
    maxWidth:        rs(52),
    textAlign:       'center',
  },
  labelActive: {
    color:      ADMIN_GREEN,
    fontWeight: '700',
  },
});

export default function AdminNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AdminTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard"   component={DashboardStack}     />
      <Tab.Screen name="KYCTab"      component={KycVerificationList}/>
      <Tab.Screen name="PayTab"      component={PaymentsList}       />
      <Tab.Screen name="UsersTab"    component={UsersList}          />
      <Tab.Screen name="MachinesTab" component={MachinesList}       />
      <Tab.Screen name="ProfileTab"  component={AdminProfile}       />
    </Tab.Navigator>
  );
}
