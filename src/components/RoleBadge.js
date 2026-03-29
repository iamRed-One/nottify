import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ROLE_COLORS = {
  student: '#3B82F6',
  lecturer: '#10B981',
  courserep: '#F59E0B',
  dean: '#8B5CF6',
};

export default function RoleBadge({ role }) {
  return (
    <View style={[styles.badge, { backgroundColor: ROLE_COLORS[role] || '#6B7280' }]}>
      <Text style={styles.text}>{role}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: { color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
