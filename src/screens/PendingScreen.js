import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { logOut } from '../services/authService';

export default function PendingScreen() {
  return (
    <View className="flex-1 bg-white items-center justify-center px-8">
      <StatusBar style="dark" />

      <View className="w-20 h-20 rounded-full bg-gray-50 border border-gray-100 items-center justify-center mb-6">
        <Ionicons name="time-outline" size={40} color="#6B7280" />
      </View>

      <Text className="text-xl text-gray-900 font-jakarta-extra mb-2 text-center">
        Account Pending
      </Text>
      <Text className="text-sm text-gray-400 font-jakarta text-center leading-6 mb-8">
        Your account is under review. You'll be notified once it's approved.
        Make sure you've uploaded your student ID card.
      </Text>

      <TouchableOpacity
        className="border border-gray-200 rounded-xl py-3.5 px-8"
        onPress={logOut}
        activeOpacity={0.85}
      >
        <Text className="text-sm text-gray-600 font-jakarta-semi">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
