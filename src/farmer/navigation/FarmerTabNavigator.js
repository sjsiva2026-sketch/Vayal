// src/farmer/navigation/FarmerTabNavigator.js
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, StatusBar,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FIcon, MCIcon }  from '../../../utils/icons';
import { COLORS }         from '../../../constants/colors';
import { rs, rf, BOTTOM_NAV_H } from '../../../utils/responsive';

import FarmerHomeScreen    from '../screens/FarmerHome';
import FindMachineScreen   from '../screens/CategoryScreen';
import MyBookingsScreen    from '../screens/BookingHistory';
import FarmerProfileScreen from '../screens/FarmerProfile';

const Tab     = createBottomTabNavigator();
const PRIMARY = COLORS.primary;

const TABS = [
  { name: 'Home',        label: 'Home',        renderIcon: (c) => <FIcon  name="home"      size={rs(22)} color={c} fallback="🏠" /> },
  { name: 'FindMachine', label: 'Find Machine', renderIcon: (c) => <MCIcon name="tractor"   size={rs(22)} color={c} fallback="🚜" /> },
  { name: 'MyBookings',  label: 'Bookings',     renderIcon: (c) => <FIcon  name="clipboard" size={rs(22)} color={c} fallback="📋" /> },
  { name: 'Profile',     label: 'Profile',      renderIcon: (c) => <FIcon  name="user"      size={rs(22)} color={c} fallback="👤" /> },
];

function CustomTabBar({ state, navigation }) {
  return (
    <View style={tb.bar}>
      {TABS.map((tab, index) => {
        const focused = state.index === index;
        const color   = focused ? PRIMARY : '#9CA3AF';
        return (
          <TouchableOpacity
            key={tab.name}
            style={tb.tab}
            activeOpacity={0.7}
            onPress={() => {
              const e = navigation.emit({
                type: 'tabPress',
                target: state.routes[index].key,
                canPreventDefault: true,
              });
              if (!focused && !e.defaultPrevented) navigation.navigate(state.routes[index].name);
            }}
          >
            <View style={[tb.iconWrap, focused && tb.iconWrapActive]}>
              {tab.renderIcon(color)}
            </View>
            <Text style={[tb.label, focused && tb.labelActive]} numberOfLines={1}>
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
    flexDirection:    'row',
    backgroundColor:  '#fff',
    borderTopWidth:   1,
    borderTopColor:   '#EBEBEB',
    // Responsive height — taller on 20:9 / 21:9 phones
    height:           BOTTOM_NAV_H,
    paddingBottom:    Platform.OS === 'android' ? rs(6) : rs(20),
    paddingTop:       rs(8),
    alignItems:       'center',
    elevation:        16,
    shadowColor:      '#000',
    shadowOpacity:    0.08,
    shadowRadius:     8,
  },
  tab:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap:      { width: rs(44), height: rs(30), alignItems: 'center', justifyContent: 'center', borderRadius: rs(10) },
  iconWrapActive:{ backgroundColor: '#E8F5EE' },
  label:         { fontSize: rf(10), color: '#9CA3AF', fontWeight: '500', marginTop: rs(2) },
  labelActive:   { color: PRIMARY, fontWeight: '700' },
});

export default function FarmerTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown:      true,
        // Status bar safe header
        headerStyle: {
          backgroundColor: '#fff',
          elevation:       0,
          shadowOpacity:   0,
          borderBottomWidth: 1,
          borderBottomColor: '#F0F0F0',
        },
        headerTintColor:   '#111827',
        headerTitleStyle:  { fontWeight: '800', fontSize: rf(18), color: '#111827' },
        headerStatusBarHeight: Platform.OS === 'android' ? StatusBar.currentHeight : undefined,
      }}
    >
      <Tab.Screen name="Home"        component={FarmerHomeScreen}    options={{ title: 'Namma Vayal 🌾' }} />
      <Tab.Screen name="FindMachine" component={FindMachineScreen}   options={{ title: 'Find Machine' }} />
      <Tab.Screen name="MyBookings"  component={MyBookingsScreen}    options={{ title: 'My Bookings' }} />
      <Tab.Screen name="Profile"     component={FarmerProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
