import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { logOut } from '../services/authService';

export default function PendingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⏳</Text>
      <Text style={styles.title}>Account Pending</Text>
      <Text style={styles.body}>
        Your account is under review. You'll be notified once it's approved.
        Make sure you've uploaded your student ID card.
      </Text>
      <TouchableOpacity style={styles.button} onPress={logOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: { fontSize: 52, marginBottom: 16 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  buttonText: { color: '#374151', fontWeight: '600' },
});
