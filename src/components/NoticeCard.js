import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function NoticeCard({ notice, showMeta = false, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      className="bg-white border border-gray-100 rounded-2xl p-4 mb-3"
      style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text className="text-sm text-gray-900 font-jakarta-bold mb-1.5">{notice?.title}</Text>
      <Text className="text-sm text-gray-500 font-jakarta leading-5" numberOfLines={showMeta ? 3 : undefined}>
        {notice?.body}
      </Text>

      {showMeta && (
        <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-50">
          <Text className="text-xs text-gray-400 font-jakarta-semi">
            {notice?.postedByName || 'Unknown'}
            {notice?.postedByRole ? ` · ${notice.postedByRole}` : ''}
          </Text>
          <Text className="text-xs text-gray-300 font-jakarta">{formatTime(notice?.createdAt)}</Text>
        </View>
      )}
    </Wrapper>
  );
}
