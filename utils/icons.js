/**
 * utils/icons.js
 *
 * Safe icon wrappers for @expo/vector-icons.
 * - Never crashes even if font not yet loaded
 * - Shows emoji fallback if icon unavailable
 *
 * Usage:
 *   import { FIcon, IIcon, MIcon, MCIcon } from '../../../utils/icons';
 *   <FIcon  name="home"     size={22} color="#111" fallback="🏠" />
 *   <IIcon  name="location" size={18} color="red"  fallback="📍" />
 *   <MCIcon name="tractor"  size={22} color="green" fallback="🚜" />
 */
import React from 'react';
import { Text } from 'react-native';

// Import icon components — safe require
let Feather            = null;
let Ionicons           = null;
let MaterialIcons      = null;
let MaterialCommunity  = null;
let FontAwesome        = null;

try { Feather           = require('@expo/vector-icons').Feather;                   } catch {}
try { Ionicons          = require('@expo/vector-icons').Ionicons;                  } catch {}
try { MaterialIcons     = require('@expo/vector-icons').MaterialIcons;             } catch {}
try { MaterialCommunity = require('@expo/vector-icons').MaterialCommunityIcons;    } catch {}
try { FontAwesome       = require('@expo/vector-icons').FontAwesome;               } catch {}

/**
 * Safe icon renderer.
 * If the icon library or name fails → shows fallback text/emoji.
 */
function SafeIcon({ Lib, name, size = 20, color = '#374151', style, fallback }) {
  if (!Lib) {
    return fallback
      ? <Text style={[{ fontSize: size * 0.85, color, lineHeight: size * 1.2 }, style]}>{fallback}</Text>
      : null;
  }
  try {
    return <Lib name={name} size={size} color={color} style={style} />;
  } catch (e) {
    return fallback
      ? <Text style={[{ fontSize: size * 0.85, color, lineHeight: size * 1.2 }, style]}>{fallback}</Text>
      : null;
  }
}

// Feather icons — used for: home, search, user, settings, chevron-right,
//                            arrow-left, bell, clipboard, bar-chart-2,
//                            credit-card, plus, lock, check, log-out, etc.
export const FIcon = (props) => <SafeIcon Lib={Feather}           {...props} />;

// Ionicons — used for: location, phone-portrait-outline, location-outline
export const IIcon = (props) => <SafeIcon Lib={Ionicons}          {...props} />;

// MaterialIcons — used for: edit, etc.
export const MIcon = (props) => <SafeIcon Lib={MaterialIcons}     {...props} />;

// MaterialCommunityIcons — used for: tractor, sprout, account-cowboy-hat
export const MCIcon = (props) => <SafeIcon Lib={MaterialCommunity} {...props} />;

// FontAwesome — fallback generic icons
export const FAIcon = (props) => <SafeIcon Lib={FontAwesome}      {...props} />;
