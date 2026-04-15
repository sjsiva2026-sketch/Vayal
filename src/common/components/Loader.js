import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function Loader({ fullScreen = true }) {
  return (
    <View style={fullScreen ? styles.full : styles.inline}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  full:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  inline: { padding: 20, alignItems: 'center' },
});
