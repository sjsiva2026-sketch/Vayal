// src/owner/navigation/OwnerTabNavigator.js
// KEY RULE:
//   isWithin24h = true  → "Pay" tab COMPLETELY HIDDEN from bottom nav
//   isLocked = true     → Only PayCommission accessible (handled by AppNavigator)
//   pendingCount        → Real-time badge on Requests tab

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FIcon, MCIcon }            from '../../../utils/icons';
import { COLORS }                   from '../../../constants/colors';
import { listenBookingsByOwner }     from '../../../firebase/firestore';
import { listenOwnerLockState }      from '../../../firebase/commission';
import { useUser }                   from '../../../context/UserContext';

import BookingRequestsScreen  from '../screens/BookingRequests';
import MachineListOwnerScreen from '../screens/MachineListOwner';
import AddMachineScreen       from '../screens/AddMachine';
import DailySummaryScreen     from '../screens/DailySummary';
import PayCommissionScreen    from '../screens/PayCommission';

const Tab     = createBottomTabNavigator();
const PRIMARY = COLORS.primary;

function CustomTabBar({ state, navigation, pendingCount, showPayTab }) {
  // Build tabs dynamically — hide Pay tab before 24h
  const ALL_TABS = [
    {
      name: 'Requests',
      label: 'Requests',
      renderIcon: (c) => <FIcon name="bell" size={22} color={c} fallback="🔔" />,
      badge: pendingCount,
    },
    {
      name: 'MyMachines',
      label: 'Machines',
      renderIcon: (c) => <MCIcon name="tractor" size={22} color={c} fallback="🚜" />,
    },
    {
      name: 'AddMachine',
      label: 'Add',
      isCenter: true,
      renderIcon: () => <FIcon name="plus" size={24} color="#fff" fallback="+" />,
    },
    {
      name: 'TodaysWork',
      label: "Today",
      renderIcon: (c) => <FIcon name="bar-chart-2" size={22} color={c} fallback="📊" />,
    },
    // Pay tab — only shown when 24h has passed (showPayTab = true)
    ...(showPayTab ? [{
      name: 'PayCommissionTab',
      label: 'Pay',
      renderIcon: (c) => <FIcon name="credit-card" size={22} color={c} fallback="💳" />,
      lockBadge: true,
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
            type:             'tabPress',
            target:           state.routes[routeIndex]?.key || '',
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

        const badgeCount = tab.badge ?? 0;
        const showBadge  = badgeCount > 0;
        const showLock   = tab.lockBadge;

        return (
          <TouchableOpacity key={tab.name} style={tb.tab} activeOpacity={0.7} onPress={onPress}>
            <View style={[tb.iconWrap, focused && tb.iconWrapFocused]}>
              {tab.renderIcon(color)}
              {showBadge && (
                <View style={tb.badge}>
                  <Text style={tb.badgeTxt}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                </View>
              )}
              {showLock && !showBadge && (
                <View style={[tb.badge, { backgroundColor: '#EF4444' }]}>
                  <Text style={{ fontSize: 8, color: '#fff', fontWeight: '900' }}>!</Text>
                </View>
              )}
            </View>
            <Text style={[tb.label, focused && tb.labelFocused]} numberOfLines={1}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tb = StyleSheet.create({
  bar:             { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8E8E8', paddingBottom: Platform.OS === 'ios' ? 20 : 8, paddingTop: 8, alignItems: 'flex-end', elevation: 16 },
  tab:             { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 },
  centerTab:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 4 },
  fab:             { width: 48, height: 48, borderRadius: 24, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  iconWrap:        { width: 44, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, position: 'relative' },
  iconWrapFocused: { backgroundColor: '#E8F5EE' },
  label:           { fontSize: 10, color: '#9CA3AF', fontWeight: '500', marginTop: 2 },
  labelFocused:    { color: PRIMARY, fontWeight: '700' },
  badge:           { position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff' },
  badgeTxt:        { fontSize: 9, color: '#fff', fontWeight: '900' },
});

export default function OwnerTabNavigator({ navigation: stackNav }) {
  const { userProfile } = useUser();
  const uid             = userProfile?.id || '';

  const [pendingCount, setPendingCount] = useState(0);
  const [showPayTab,   setShowPayTab]   = useState(false);  // hidden before 24h

  // Real-time pending booking count
  useEffect(() => {
    if (!uid) return;
    const unsub = listenBookingsByOwner(uid, (bookings) => {
      setPendingCount(bookings.filter(b => b.status === 'pending').length);
    });
    return unsub;
  }, [uid]);

  // Real-time commission state — show Pay tab only after 24h window passes
  useEffect(() => {
    if (!uid) return;
    const unsub = listenOwnerLockState(uid, (state) => {
      // showPayTab = true ONLY when isLocked OR after 24h (not within24h)
      const shouldShow = !state.isWithin24h && !!state.otpVerifiedAt && state.paymentStatus !== 'paid';
      setShowPayTab(shouldShow);
    });
    return unsub;
  }, [uid]);

  return (
    <Tab.Navigator
      tabBar={(props) => (
        <CustomTabBar {...props} pendingCount={pendingCount} showPayTab={showPayTab} />
      )}
      screenOptions={({ navigation }) => ({
        headerShown:      true,
        headerStyle:      { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
        headerTintColor:  '#111827',
        headerTitleStyle: { fontWeight: '800', fontSize: 20, color: '#111827' },
        headerRight: () => (
          <TouchableOpacity
            style={{ marginRight: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => navigation.navigate('OwnerProfile')}
            activeOpacity={0.8}
          >
            <FIcon name="user" size={20} color={PRIMARY} fallback="👤" />
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
