// src/owner/navigation/OwnerTabNavigator.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, StatusBar,
} from 'react-native';
import { createBottomTabNavigator }  from '@react-navigation/bottom-tabs';
import { FIcon, MCIcon }             from '../../../utils/icons';
import { COLORS }                    from '../../../constants/colors';
import { listenBookingsByOwner }     from '../../../firebase/firestore';
import { listenOwnerLockState }      from '../../../firebase/commission';
import { useUser }                   from '../../../context/UserContext';
import { rs, rf, BOTTOM_NAV_H }     from '../../../utils/responsive';

import BookingRequestsScreen  from '../screens/BookingRequests';
import MachineListOwnerScreen from '../screens/MachineListOwner';
import AddMachineScreen       from '../screens/AddMachine';
import DailySummaryScreen     from '../screens/DailySummary';
import PayCommissionScreen    from '../screens/PayCommission';

const Tab     = createBottomTabNavigator();
const PRIMARY = COLORS.primary;

function CustomTabBar({ state, navigation, pendingCount, showPayTab }) {
  const ALL_TABS = [
    {
      name:       'Requests',
      label:      'Requests',
      renderIcon: (c) => <FIcon name="bell" size={rs(22)} color={c} fallback="🔔" />,
      badge:      pendingCount,
    },
    {
      name:       'MyMachines',
      label:      'Machines',
      renderIcon: (c) => <MCIcon name="tractor" size={rs(22)} color={c} fallback="🚜" />,
    },
    {
      name:       'AddMachine',
      label:      'Add',
      isCenter:   true,
      renderIcon: () => <FIcon name="plus" size={rs(24)} color="#fff" fallback="+" />,
    },
    {
      name:       'TodaysWork',
      label:      'Today',
      renderIcon: (c) => <FIcon name="bar-chart-2" size={rs(22)} color={c} fallback="📊" />,
    },
    ...(showPayTab ? [{
      name:       'PayCommissionTab',
      label:      'Pay',
      renderIcon: (c) => <FIcon name="credit-card" size={rs(22)} color={c} fallback="💳" />,
      lockBadge:  true,
    }] : []),
  ];

  return (
    <View style={tb.bar}>
      {ALL_TABS.map((tab) => {
        const routeIndex = state.routes.findIndex(r => r.name === tab.name);
        const focused    = routeIndex !== -1 && state.index === routeIndex;
        const color      = focused ? PRIMARY : '#9CA3AF';

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

        if (tab.isCenter) {
          return (
            <TouchableOpacity key={tab.name} style={tb.centerTab} activeOpacity={0.85} onPress={onPress}>
              <View style={tb.fab}>{tab.renderIcon(color)}</View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={tab.name} style={tb.tab} activeOpacity={0.7} onPress={onPress}>
            <View style={[tb.iconWrap, focused && tb.iconWrapActive]}>
              {tab.renderIcon(color)}
              {(tab.badge ?? 0) > 0 && (
                <View style={tb.badge}>
                  <Text style={tb.badgeTxt}>{(tab.badge ?? 0) > 9 ? '9+' : tab.badge}</Text>
                </View>
              )}
              {tab.lockBadge && !(tab.badge > 0) && (
                <View style={[tb.badge, { backgroundColor: '#EF4444' }]}>
                  <Text style={[tb.badgeTxt, { fontSize: rf(8) }]}>!</Text>
                </View>
              )}
            </View>
            <Text style={[tb.label, focused && tb.labelActive]} numberOfLines={1}>{tab.label}</Text>
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
    paddingTop:      rs(8),
    alignItems:      'center',
    elevation:       16,
  },
  tab:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerTab:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fab:           { width: rs(48), height: rs(48), borderRadius: rs(24), backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  iconWrap:      { width: rs(44), height: rs(30), alignItems: 'center', justifyContent: 'center', borderRadius: rs(10), position: 'relative' },
  iconWrapActive:{ backgroundColor: '#E8F5EE' },
  label:         { fontSize: rf(10), color: '#9CA3AF', fontWeight: '500', marginTop: rs(2) },
  labelActive:   { color: PRIMARY, fontWeight: '700' },
  badge:         { position: 'absolute', top: -rs(5), right: -rs(5), minWidth: rs(17), height: rs(17), borderRadius: rs(9), backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: rs(3), borderWidth: 1.5, borderColor: '#fff' },
  badgeTxt:      { fontSize: rf(9), color: '#fff', fontWeight: '900' },
});

export default function OwnerTabNavigator() {
  const { userProfile } = useUser();
  const uid             = userProfile?.id || '';
  const [pendingCount, setPendingCount] = useState(0);
  const [showPayTab,   setShowPayTab]   = useState(false);

  useEffect(() => {
    if (!uid) return;
    const unsub = listenBookingsByOwner(uid, (bookings) => {
      setPendingCount(bookings.filter(b => b.status === 'pending').length);
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const unsub = listenOwnerLockState(uid, (state) => {
      setShowPayTab(!state.isWithin24h && !!state.otpVerifiedAt && state.paymentStatus !== 'paid');
    });
    return unsub;
  }, [uid]);

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} pendingCount={pendingCount} showPayTab={showPayTab} />}
      screenOptions={({ navigation }) => ({
        headerShown:      true,
        headerStyle:      { backgroundColor: '#fff', elevation: 0, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
        headerTintColor:  '#111827',
        headerTitleStyle: { fontWeight: '800', fontSize: rf(18), color: '#111827' },
        headerStatusBarHeight: Platform.OS === 'android' ? StatusBar.currentHeight : undefined,
        headerRight: () => (
          <TouchableOpacity
            style={{ marginRight: rs(16), width: rs(38), height: rs(38), borderRadius: rs(19), backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => navigation.navigate('OwnerProfile')}
            activeOpacity={0.8}
          >
            <FIcon name="user" size={rs(20)} color={PRIMARY} fallback="👤" />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Requests"         component={BookingRequestsScreen}  options={{ title: 'Requests' }} />
      <Tab.Screen name="MyMachines"       component={MachineListOwnerScreen} options={{ title: 'My Machines' }} />
      <Tab.Screen name="AddMachine"       component={AddMachineScreen}       options={{ title: 'Add Machine' }} />
      <Tab.Screen name="TodaysWork"       component={DailySummaryScreen}     options={{ title: "Today's Work" }} />
      <Tab.Screen name="PayCommissionTab" component={PayCommissionScreen}    options={{ title: 'Pay Commission' }} />
    </Tab.Navigator>
  );
}
