// src/owner/navigation/OwnerTabNavigator.js
// UPDATED:
//   ✅ Tab order: Requests | Machines | Add(center) | Today | Profile
//   ✅ Profile tab added at right end
//   ✅ Dashboard tab removed
//   ✅ Header profile button removed
//   ✅ Lock guard maintained

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, Image,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect }           from '@react-navigation/native';
import { IIcon, MCIcon }            from '../../../utils/icons';
import { COLORS }                   from '../../../constants/colors';
import { listenBookingsByOwner }    from '../../../firebase/firestore';
import { listenOwnerLockState, checkCommissionLock } from '../../../firebase/commission';
import { useUser }                  from '../../../context/UserContext';
import { rs, rf, BOTTOM_NAV_H }     from '../../../utils/responsive';

import BookingRequestsScreen  from '../screens/BookingRequests';
import MachineListOwnerScreen from '../screens/MachineListOwner';
import AddMachineScreen       from '../screens/AddMachine';
import DailySummaryScreen     from '../screens/DailySummary';
import OwnerProfileScreen     from '../screens/OwnerProfile';
import PayCommissionScreen    from '../screens/PayCommission';

const Tab = createBottomTabNavigator();

// ── Profile avatar mini (shown in tab bar) ─────────────────────────────────
function ProfileTabIcon({ color, photoURL }) {
  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={{ width: rs(24), height: rs(24), borderRadius: rs(12), borderWidth: rs(1.5), borderColor: color }}
      />
    );
  }
  return <IIcon name="person-circle-outline" size={rs(24)} color={color} fallback="👤" />;
}

// ── Normal tab bar ─────────────────────────────────────────────────────────
function NormalTabBar({ state, navigation, pendingCount, photoURL }) {
  const TABS = [
    {
      name:    'Requests',
      label:   'Requests',
      icon:    (c) => <IIcon name="list-outline" size={rs(22)} color={c} fallback="📋" />,
      badge:   pendingCount,
    },
    {
      name:    'MyMachines',
      label:   'Machines',
      icon:    (c) => <MCIcon name="tractor" size={rs(22)} color={c} fallback="🚜" />,
    },
    {
      name:     'AddMachine',
      label:    'Add',
      icon:     () => <IIcon name="add-circle-outline" size={rs(28)} color="#fff" fallback="+" />,
      isCenter: true,
    },
    {
      name:  'TodaysWork',
      label: 'Today',
      icon:  (c) => <IIcon name="calendar-outline" size={rs(22)} color={c} fallback="📅" />,
    },
    {
      name:  'OwnerProfileTab',
      label: 'Profile',
      icon:  (c) => <ProfileTabIcon color={c} photoURL={photoURL} />,
    },
  ];

  return (
    <View style={tb.bar}>
      {TABS.map((tab) => {
        const routeIndex = state.routes.findIndex(r => r.name === tab.name);
        const focused    = routeIndex !== -1 && state.index === routeIndex;
        const color      = focused ? COLORS.primary : '#9CA3AF';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress', target: state.routes[routeIndex]?.key || '',
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented && routeIndex !== -1) {
            navigation.navigate(state.routes[routeIndex].name);
          }
        };

        // Center FAB button
        if (tab.isCenter) {
          return (
            <TouchableOpacity key={tab.name} style={tb.centerTab} activeOpacity={0.85} onPress={onPress}>
              <View style={[tb.fab, focused && tb.fabActive]}>{tab.icon(color)}</View>
              <Text style={[tb.label, focused && tb.labelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={tab.name} style={tb.tab} activeOpacity={0.7} onPress={onPress}>
            <View style={[tb.iconWrap, focused && tb.iconWrapActive]}>
              {tab.icon(color)}
              {(tab.badge ?? 0) > 0 && (
                <View style={tb.badge}>
                  <Text style={tb.badgeTxt}>{(tab.badge ?? 0) > 9 ? '9+' : tab.badge}</Text>
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

// ── Locked tab bar — ONLY Pay Commission ──────────────────────────────────
function LockedTabBar({ navigation }) {
  return (
    <View style={[tb.bar, { backgroundColor: '#7F1D1D' }]}>
      <TouchableOpacity style={[tb.tab, { flex: 1 }]} activeOpacity={0.7}
        onPress={() => navigation.navigate('PayCommissionTab')}>
        <View style={[tb.iconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <IIcon name="card-outline" size={rs(22)} color="#fff" fallback="💳" />
        </View>
        <Text style={[tb.label, { color: '#fff', fontWeight: '700' }]}>Pay Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const tb = StyleSheet.create({
  bar:            { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EBEBEB', height: BOTTOM_NAV_H, paddingBottom: Platform.OS === 'android' ? rs(6) : rs(20), paddingTop: rs(8), alignItems: 'center', elevation: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.04, shadowRadius: 8 },
  tab:            { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerTab:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fab:            { width: rs(44), height: rs(44), borderRadius: rs(22), backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, marginBottom: rs(2) },
  fabActive:      { backgroundColor: '#0F4C2A' },
  iconWrap:       { width: rs(44), height: rs(30), alignItems: 'center', justifyContent: 'center', borderRadius: rs(10), position: 'relative' },
  iconWrapActive: { backgroundColor: '#E8F5EE' },
  label:          { fontSize: rf(10), color: '#9CA3AF', fontWeight: '500', marginTop: rs(2) },
  labelActive:    { color: COLORS.primary, fontWeight: '700' },
  badge:          { position: 'absolute', top: -rs(5), right: -rs(5), minWidth: rs(17), height: rs(17), borderRadius: rs(9), backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: rs(3), borderWidth: 1.5, borderColor: '#fff' },
  badgeTxt:       { fontSize: rf(9), color: '#fff', fontWeight: '900' },
});

// ── Lock overlay for blocked screens ──────────────────────────────────────
function LockOverlay({ navigation }) {
  return (
    <View style={ov.container}>
      <Text style={ov.icon}>🔒</Text>
      <Text style={ov.title}>Account Locked</Text>
      <Text style={ov.sub}>Pay commission to access this screen</Text>
      <TouchableOpacity style={ov.btn} onPress={() => navigation.navigate('PayCommissionTab')} activeOpacity={0.88}>
        <Text style={ov.btnTxt}>💳 Pay Commission Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const ov = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', padding: rs(32) },
  icon:      { fontSize: rf(56), marginBottom: rs(16) },
  title:     { fontSize: rf(22), fontWeight: '900', color: '#B91C1C', marginBottom: rs(8) },
  sub:       { fontSize: rf(14), color: '#EF4444', textAlign: 'center', marginBottom: rs(28), lineHeight: rf(22) },
  btn:       { backgroundColor: '#B91C1C', borderRadius: rs(14), paddingVertical: rs(15), paddingHorizontal: rs(32) },
  btnTxt:    { color: '#fff', fontSize: rf(15), fontWeight: '800' },
});

function withLockGuard(WrappedScreen, isLocked) {
  return function GuardedScreen({ navigation, route }) {
    if (isLocked) return <LockOverlay navigation={navigation} />;
    return <WrappedScreen navigation={navigation} route={route} />;
  };
}

// ── Main Navigator ─────────────────────────────────────────────────────────
export default function OwnerTabNavigator() {
  const { userProfile, updateProfile } = useUser();
  const uid      = userProfile?.id || '';
  const photoURL = userProfile?.profilePhotoUrl || null;

  const [pendingCount, setPendingCount] = useState(0);
  const [isLocked,     setIsLocked]     = useState(userProfile?.isLocked === true);
  const [initialized,  setInitialized]  = useState(false);

  // Lock check on every focus
  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      checkCommissionLock(uid).then(result => {
        setIsLocked(result.isLocked);
        if (result.isLocked) updateProfile({ isLocked: true });
      }).catch(() => {});
    }, [uid]),
  );

  // Pending booking count
  useEffect(() => {
    if (!uid) return;
    const unsub = listenBookingsByOwner(uid, (bookings) => {
      setPendingCount(bookings.filter(b => b.status === 'pending').length);
    });
    return unsub;
  }, [uid]);

  // Global realtime lock listener
  useEffect(() => {
    if (!uid) return;
    const unsub = listenOwnerLockState(uid, (state) => {
      const locked = state.isLocked === true && state.paymentStatus !== 'paid';
      setIsLocked(locked);
      if (locked)  updateProfile({ isLocked: true });
      if (!locked && state.paymentStatus === 'paid') updateProfile({ isLocked: false });
      setInitialized(true);
    });
    return unsub;
  }, [uid]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  // ── LOCKED MODE ──────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <Tab.Navigator
        tabBar={(props) => <LockedTabBar {...props} />}
        screenOptions={{
          headerShown:      true,
          headerStyle:      { backgroundColor: '#B91C1C', elevation: 0 },
          headerTintColor:  '#fff',
          headerTitleStyle: { fontWeight: '800', fontSize: rf(18), color: '#fff' },
        }}
      >
        <Tab.Screen name="PayCommissionTab" component={PayCommissionScreen}                       options={{ title: 'Pay Commission' }} />
        <Tab.Screen name="Requests"         component={withLockGuard(BookingRequestsScreen, true)} options={{ title: 'Locked', tabBarButton: () => null }} />
        <Tab.Screen name="MyMachines"       component={withLockGuard(MachineListOwnerScreen,true)} options={{ title: 'Locked', tabBarButton: () => null }} />
        <Tab.Screen name="AddMachine"       component={withLockGuard(AddMachineScreen,      true)} options={{ title: 'Locked', tabBarButton: () => null }} />
        <Tab.Screen name="TodaysWork"       component={withLockGuard(DailySummaryScreen,    true)} options={{ title: 'Locked', tabBarButton: () => null }} />
        <Tab.Screen name="OwnerProfileTab"  component={withLockGuard(OwnerProfileScreen,    true)} options={{ title: 'Locked', tabBarButton: () => null }} />
      </Tab.Navigator>
    );
  }

  // ── NORMAL MODE ───────────────────────────────────────────────────────────
  // Tab order: Requests | Machines | Add(center) | Today | Profile
  // NO header profile button — profile accessible only from tab
  return (
    <Tab.Navigator
      tabBar={(props) => (
        <NormalTabBar {...props} pendingCount={pendingCount} photoURL={photoURL} />
      )}
      screenOptions={{
        headerShown:      true,
        headerStyle:      { backgroundColor: '#fff', elevation: 0, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
        headerTintColor:  '#111827',
        headerTitleStyle: { fontWeight: '800', fontSize: rf(18), color: '#111827' },
        // ✅ headerRight removed — no profile button in header
      }}
    >
      {/* Tab 1: Requests */}
      <Tab.Screen
        name="Requests"
        component={BookingRequestsScreen}
        options={{ title: 'Booking Requests' }}
      />
      {/* Tab 2: Machines */}
      <Tab.Screen
        name="MyMachines"
        component={MachineListOwnerScreen}
        options={{ title: 'My Machines' }}
      />
      {/* Tab 3: Add Machine (center FAB) */}
      <Tab.Screen
        name="AddMachine"
        component={AddMachineScreen}
        options={{ title: 'Add Machine' }}
      />
      {/* Tab 4: Today */}
      <Tab.Screen
        name="TodaysWork"
        component={DailySummaryScreen}
        options={{ title: "Today's Work" }}
      />
      {/* Tab 5: Profile (right end) */}
      <Tab.Screen
        name="OwnerProfileTab"
        component={OwnerProfileScreen}
        options={{ title: 'My Profile' }}
      />
      {/* Hidden: PayCommission — accessible from LockWall/explicit navigate */}
      <Tab.Screen
        name="PayCommissionTab"
        component={PayCommissionScreen}
        options={{ title: 'Pay Commission', tabBarButton: () => null, headerShown: false }}
      />
    </Tab.Navigator>
  );
}
