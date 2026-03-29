import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function RoomFeedScreen() {
  return (
    <View className="flex-1 bg-gray-50 items-center justify-center px-8">
      <StatusBar style="dark" />

      <View className="w-20 h-20 rounded-full bg-white border border-gray-100 items-center justify-center mb-5">
        <Ionicons name="chatbubbles-outline" size={36} color="#D1D5DB" />
      </View>

      <Text className="text-lg text-gray-900 font-jakarta-bold mb-2 text-center">
        Room Feed
      </Text>
      <Text className="text-sm text-gray-400 font-jakarta text-center leading-6">
        Notices from your course room will appear here.
      </Text>
    </View>
  );
}
