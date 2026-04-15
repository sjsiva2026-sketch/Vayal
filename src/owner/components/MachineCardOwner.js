import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function MachineCardOwner({ machine, onEdit, onToggle, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.type}>{machine.type}</Text>
        <TouchableOpacity
          style={[styles.toggleBtn, { backgroundColor: machine.isActive ? COLORS.success : COLORS.error }]}
          onPress={() => onToggle(machine)}
        >
          <Text style={styles.toggleText}>{machine.isActive ? '✅ Active' : '❌ Off'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.meta}>💰 ₹{machine.price_per_hour}/hr  •  📍 {machine.taluk}</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.editBtn}   onPress={() => onEdit(machine)}>
          <Text style={styles.editText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(machine.id)}>
          <Text style={styles.deleteText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 3,
  },
  top:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  type:       { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  toggleBtn:  { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  toggleText: { fontSize: 12, color: COLORS.white, fontWeight: '700' },
  meta:       { fontSize: 13, color: COLORS.textSecondary, marginBottom: 10 },
  actionRow:  { flexDirection: 'row', gap: 10 },
  editBtn:    { flex: 1, backgroundColor: '#EEF7FF', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  editText:   { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  deleteBtn:  { flex: 1, backgroundColor: '#FEF2F2', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  deleteText: { fontSize: 13, fontWeight: '600', color: COLORS.error },
});
