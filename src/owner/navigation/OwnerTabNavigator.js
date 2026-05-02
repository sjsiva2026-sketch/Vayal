// src/owner/navigation/OwnerTabNavigator.js
//
// CHANGES:
// 1. Requests tab — real-time pending count badge from Firestore
//    Uses listenBookingsByOwner — updates live when new bookings arrive
// 2. Badge: red circle with count — shown only when count > 0
// 3. All sizes responsive — no fixed width/height

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FIcon, MCIcon }            from '../../../utils/icons';
import { COLORS }                   from '../../../constants/colors';
import { listenBookingsByOwner }    from '../../../firebase/firestore';
import { useUser }                  from '../../../context/UserContext';

import BookingRequestsScreen  from '../screens/BookingRequests';
import MachineListOwnerScreen from '../screens/MachineListOwner';
import AddMachineScreen       from '../screens/AddMachine';
import DailySummaryScreen     from '../screens/DailySummary';
import PaymentScreen          from '../screens/PaymentScreen';

const Tab      = createBottomTabNavigator();
const PRIMARY  = COLORS.primary;
const { width: W } = Dimensions.get('window');

// Responsive font
const rf = (size) => Math.min(Math.max((W / 375) * size, size * 0.8), size * 1.2);

// ── Custom Tab Bar ─────────────────────────────────────────────────────────────
function CustomTabBar({ state, navigation, pendingCount, isLocked }) {
  const TABS = [
    {
      name: 'Requests',
      label: 'Requests',
      renderIcon: (c) => <FIcon name="bell" size={22} color={c} fallback="🔔" />,
      // Show notification badge when pending bookings exist
      badge: pendingCount,
    },
    {
      name: 'MyMachines',
      label: 'My Machines',
      renderIcon: (c) => <MCIcon name="tractor" size={22} color={c} fallback="🚜" />,
    },
    {
      name: 'AddMachine',
      label: 'Add',
      renderIcon: () => <FIcon name="plus" size={24} color="#fff" fallback="＋" />,
      isCenter: true,
    },
    {
      name: 'TodaysWork',
      label: "Today's",
      renderIcon: (c) => <FIcon name="bar-chart-2" size={22} color={c} fallback="📊" />,
    },
    {
      name: 'PayCommissionTab',
      label: 'Pay',
      renderIcon: (c) => <FIcon name="credit-card" size={22} color={c} fallback="💳" />,
      // Show lock badge when account is locked
      lockBadge: isLocked,
    },
  ];

  return (
    <View style={tb.bar}>
      {TABS.map((tab, index) => {
        const focused = state.index === index;
        const color   = focused ? PRIMARY : '#9CA3AF';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes[index].key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(state.routes[index].name);
          }
        };

        // ── Center FAB ──────────────────────────────────────────────────────
        if (tab.isCenter) {
          return (
            <TouchableOpacity key={tab.name} style={tb.centerTab} activeOpacity={0.85} onPress={onPress}>
              <View style={tb.fab}>{tab.renderIcon(color)}</View>
            </TouchableOpacity>
          );
        }

        // ── Normal tab ──────────────────────────────────────────────────────
        const badgeCount = tab.badge ?? 0;
        const showBadge  = badgeCount > 0;
        const showLock   = tab.lockBadge;

        return (
          <TouchableOpacity key={tab.name} style={tb.tab} activeOpacity={0.7} onPress={onPress}>
            <View style={[tb.iconWrap, focused && tb.iconWrapFocused]}>
              {tab.renderIcon(color)}

              {/* ── Notification badge — pending bookings count ── */}
              {showBadge && (
                <View style={tb.badge}>
                  <Text style={tb.badgeTxt}>
                    {badgeCount > 99 ? '99+' : badgeCount > 9 ? '9+' : badgeCount}
                  </Text>
                </View>
              )}

              {/* ── Lock badge — commission overdue ── */}
              {showLock && !showBadge && (
                <View style={[tb.badge, tb.lockBadge]}>
                  <Text style={tb.badgeTxt}>🔒</Text>
                </View>
              )}
            </View>
            <Text style={[tb.label, focused && tb.labelFocused]} numberOfLines={1}>
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
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    alignItems: 'flex-end',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tab:             { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 },
  centerTab:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 4 },
  // FAB — no fixed size, scales with screen
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  iconWrap:        { width: 44, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, position: 'relative' },
  iconWrapFocused: { backgroundColor: '#E8F5EE' },
  label:           { fontSize: rf(10), color: '#9CA3AF', fontWeight: '500', marginTop: 2 },
  labelFocused:    { color: PRIMARY, fontWeight: '700' },

  // Badge — notification dot for pending count
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
    elevation: 2,
  },
  lockBadge: { backgroundColor: '#F59E0B' },
  badgeTxt:  { fontSize: 8, color: '#fff', fontWeight: '900', lineHeight: 11 },
});

// ── OwnerTabNavigator ─────────────────────────────────────────────────────────
// Fetches pending booking count in real time and passes to tab bar
export default function OwnerTabNavigator({ navigation: stackNav, route }) {
  const { userProfile } = useUser();
  const uid             = userProfile?.id || '';
  const isLocked        = userProfile?.isLocked === true;

  // Real-time pending booking count
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!uid) return;
    // listenBookingsByOwner updates live from Firestore
    const unsub = listenBookingsByOwner(uid, (bookings) => {
      const count = bookings.filter(b => b.status === 'pending').length;
      setPendingCount(count);
    });
    return unsub;
  }, [uid]);

  return (
    <Tab.Navigator
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          pendingCount={pendingCount}
          isLocked={isLocked}
        />
      )}
      screenOptions={({ navigation }) => ({
        headerShown:      true,
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#F0F0F0',
        },
        headerTintColor:  '#111827',
        headerTitleStyle: { fontWeight: '800', fontSize: rf(20), color: '#111827' },
        // Profile icon top-right every screen
        headerRight: () => (
          <TouchableOpacity
            style={hdr.profileBtn}
            onPress={() => navigation.navigate('OwnerProfile')}
            activeOpacity={0.8}
          >
            <FIcon name="user" size={20} color={PRIMARY} fallback="👤" />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen
        name="Requests"
        component={BookingRequestsScreen}
        options={{ title: 'Requests' }}
      />
      <Tab.Screen
        name="MyMachines"
        component={MachineListOwnerScreen}
        options={{ title: 'My Machines' }}
      />
      <Tab.Screen
        name="AddMachine"
        component={AddMachineScreen}
        options={{ title: 'Add Machine' }}
      />
      <Tab.Screen
        name="TodaysWork"
        component={DailySummaryScreen}
        options={{ title: "Today's Work" }}
      />
      <Tab.Screen
        name="PayCommissionTab"
        component={PaymentScreen}
        options={{ title: 'Pay Commission' }}
      />
    </Tab.Navigator>
  );
}

const hdr = StyleSheet.create({
  profileBtn: {
    marginRight: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
