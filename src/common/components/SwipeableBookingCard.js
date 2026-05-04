// src/common/components/SwipeableBookingCard.js
//
// Reusable swipe-to-delete card wrapper.
// Swipe RIGHT → LEFT to reveal a red Delete button.
//
// Props:
//   children  — the card content to display
//   item      — booking object  { id, status, paymentStatus, ownerId, farmerId }
//   role      — 'owner' | 'farmer'  (controls who can delete)
//   userId    — current user's uid  (safety: only delete own bookings)
//   onDelete  — async fn(item) called after Firestore delete succeeds
//   onSwipeOpen — optional fn() called when swipe opens (to close others)

import React, { useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { doc, deleteDoc } from 'firebase/firestore';
import { db }  from '../../../firebase/config';
import { rs, rf } from '../../../utils/responsive';

// ── Statuses where delete is DISABLED ────────────────────────────────────────
const NO_DELETE_STATUSES   = new Set(['completed', 'ongoing']);
const NO_DELETE_PAY_STATUS = new Set(['paid']);

function canDelete(item, role, userId) {
  if (NO_DELETE_STATUSES.has(item.status))            return false;
  if (NO_DELETE_PAY_STATUS.has(item.paymentStatus))   return false;
  if (role === 'owner'  && item.ownerId  !== userId)  return false;
  if (role === 'farmer' && item.farmerId !== userId)  return false;
  return true;
}

export default function SwipeableBookingCard({
  children,
  item,
  role,
  userId,
  onDelete,
  onSwipeOpen,
}) {
  const swipeRef = useRef(null);
  const deletable = canDelete(item, role, userId);

  // Close swipe programmatically
  const close = useCallback(() => swipeRef.current?.close(), []);

  // Firestore delete + callback
  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Booking',
      'Are you sure you want to delete this booking?',
      [
        {
          text: 'No',
          style: 'cancel',
          onPress: close,
        },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'bookings', item.id));
              onDelete?.(item);
            } catch (e) {
              Alert.alert('Error', e.message || 'Could not delete. Try again.');
            }
          },
        },
      ],
      { cancelable: true, onDismiss: close }
    );
  }, [item, onDelete, close]);

  // Animated red action panel (appears as user swipes left)
  const renderRightActions = useCallback((progress) => {
    if (!deletable) return null;

    // Slide in from right as drag progress increases
    const translateX = progress.interpolate({
      inputRange:  [0, 1],
      outputRange: [rs(80), 0],
      extrapolate: 'clamp',
    });
    const opacity = progress.interpolate({
      inputRange:  [0, 0.5, 1],
      outputRange: [0, 0.6, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[sa.actionWrap, { transform: [{ translateX }], opacity }]}>
        <TouchableOpacity
          style={sa.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.82}
        >
          {/* Trash icon using plain text unicode */}
          <Text style={sa.trashIcon}>🗑</Text>
          <Text style={sa.deleteTxt}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [deletable, handleDelete]);

  // If not deletable, render without swipe wrapper
  if (!deletable) {
    return <View style={sa.wrap}>{children}</View>;
  }

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      rightThreshold={rs(40)}
      renderRightActions={renderRightActions}
      onSwipeableOpen={() => onSwipeOpen?.(swipeRef)}
      overshootRight={false}
    >
      <View style={sa.wrap}>{children}</View>
    </Swipeable>
  );
}

const sa = StyleSheet.create({
  wrap: {
    // Needed so Swipeable has a measurable child
    backgroundColor: 'transparent',
  },
  actionWrap: {
    width:          rs(80),
    justifyContent: 'center',
    alignItems:     'center',
    marginBottom:   rs(12),  // matches card marginBottom
    borderRadius:   rs(16),
    overflow:       'hidden',
  },
  deleteBtn: {
    flex:            1,
    width:           '100%',
    backgroundColor: '#EF4444',
    justifyContent:  'center',
    alignItems:      'center',
    borderRadius:    rs(16),
  },
  trashIcon: {
    fontSize:     rf(22),
    marginBottom: rs(2),
  },
  deleteTxt: {
    fontSize:   rf(12),
    fontWeight: '800',
    color:      '#fff',
  },
});
