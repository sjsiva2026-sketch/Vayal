// utils/icons.js — Safe icon wrappers with text fallbacks
import React from 'react';
import { Text } from 'react-native';

let _Feather = null, _Ionicons = null, _MC = null;
try { _Feather   = require('@expo/vector-icons').Feather;   } catch {}
try { _Ionicons  = require('@expo/vector-icons').Ionicons;  } catch {}
try { _MC        = require('@expo/vector-icons').MaterialCommunityIcons; } catch {}

export function FIcon({ name, size = 22, color = '#111827', fallback = '•', style }) {
  if (_Feather) {
    try { return <_Feather name={name} size={size} color={color} style={style} />; } catch {}
  }
  return <Text style={[{ fontSize: size * 0.8, color }, style]}>{fallback}</Text>;
}

export function IIcon({ name, size = 22, color = '#111827', fallback = '•', style }) {
  if (_Ionicons) {
    try { return <_Ionicons name={name} size={size} color={color} style={style} />; } catch {}
  }
  return <Text style={[{ fontSize: size * 0.8, color }, style]}>{fallback}</Text>;
}

export function MCIcon({ name, size = 22, color = '#111827', fallback = '•', style }) {
  if (_MC) {
    try { return <_MC name={name} size={size} color={color} style={style} />; } catch {}
  }
  return <Text style={[{ fontSize: size * 0.8, color }, style]}>{fallback}</Text>;
}
