import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FIcon, MCIcon } from '../../../utils/icons';
import { COLORS } from '../../../constants/colors';

import FarmerHomeScreen    from '../screens/FarmerHome';
import FindMachineScreen   from '../screens/CategoryScreen';
import MyBookingsScreen    from '../screens/BookingHistory';
import FarmerProfileScreen from '../screens/FarmerProfile';

const Tab     = createBottomTabNavigator();
const PRIMARY = COLORS.primary;

const TABS = [
  { name: 'Home',        label: 'Home',         renderIcon: (color) => <FIcon  name="home"      size={22} color={color} fallback="🏠" /> },
  { name: 'FindMachine', label: 'Find Machine', renderIcon: (color) => <MCIcon name="tractor"   size={22} color={color} fallback="🚜" /> },
  { name: 'MyBookings',  label: 'My Bookings',  renderIcon: (color) => <FIcon  name="clipboard" size={22} color={color} fallback="📋" /> },
  { name: 'Profile',     label: 'Profile',      renderIcon: (color) => <FIcon  name="user"      size={22} color={color} fallback="👤" /> },
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
              const event = navigation.emit({ type: 'tabPress', target: state.routes[index].key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(state.routes[index].name);
            }}
          >
            <View style={[tb.iconWrap, focused && tb.iconWrapFocused]}>
              {tab.renderIcon(color)}
            </View>
            <Text style={[tb.label, focused && tb.labelFocused]} numberOfLines={1}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tb = StyleSheet.create({
  bar:             { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8E8E8', paddingBottom: Platform.OS === 'ios' ? 20 : 6, paddingTop: 8, elevation: 16 },
  tab:             { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap:        { width: 44, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  iconWrapFocused: { backgroundColor: '#E8F5EE' },
  label:           { fontSize: 10, color: '#9CA3AF', fontWeight: '500', marginTop: 2 },
  labelFocused:    { color: PRIMARY, fontWeight: '700' },
});

export default function FarmerTabNavigator() {
  return (
    <Tab.Navigator tabBar={props => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home"        component={FarmerHomeScreen}    />
      <Tab.Screen name="FindMachine" component={FindMachineScreen}   />
      <Tab.Screen name="MyBookings"  component={MyBookingsScreen}    />
      <Tab.Screen name="Profile"     component={FarmerProfileScreen} />
    </Tab.Navigator>
  );
}
