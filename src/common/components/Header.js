import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function Header({ title, subtitle, onBack, rightAction }) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {onBack && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {rightAction && (
          <TouchableOpacity style={styles.rightBtn} onPress={rightAction.onPress} activeOpacity={0.7}>
            <Text style={styles.rightIcon}>{rightAction.icon}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16,
  },
  row:       { flexDirection: 'row', alignItems: 'center' },
  backBtn:   { marginRight: 12, padding: 4 },
  backIcon:  { fontSize: 22, color: COLORS.white, fontWeight: '700' },
  titleWrap: { flex: 1 },
  title:     { fontSize: 18, fontWeight: '800', color: COLORS.white },
  subtitle:  { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  rightBtn:  { marginLeft: 12, padding: 4 },
  rightIcon: { fontSize: 22, color: COLORS.white },
});
