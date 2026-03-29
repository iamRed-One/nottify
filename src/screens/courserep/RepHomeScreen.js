import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';

export default function RepHomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const semester = currentMonth <= 6 ? 1 : 2;
  const roomId = user?.department && user?.level
    ? `${user.department}_${user.level}L_${currentYear}_SEM${semester}`
    : null;

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'R';

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-4 flex-row items-start justify-between">
        <View>
          <Text className="text-xl text-gray-900 font-jakarta-extra">Course Rep</Text>
          <Text className="text-sm text-gray-400 font-jakarta mt-0.5">
            {user?.department} · {user?.level ? `${user.level} Level` : ''}
          </Text>
        </View>
        <TouchableOpacity className="p-1 mt-1" onPress={() => setSidebarVisible(true)} activeOpacity={0.7}>
          <Ionicons name="menu-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Action cards */}
      <View className="px-5 pt-6 gap-3">
        <TouchableOpacity
          className="bg-gray-900 rounded-xl py-4 flex-row items-center px-5 gap-3"
          onPress={() => navigation.navigate('ManageRoom')}
          activeOpacity={0.85}
        >
          <Ionicons name="albums-outline" size={18} color="#fff" />
          <View className="flex-1">
            <Text className="text-white text-sm font-jakarta-bold">Manage Room</Text>
            <Text className="text-gray-400 text-xs font-jakarta mt-0.5">View notices, post updates</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#6B7280" />
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-white border border-gray-200 rounded-xl py-4 flex-row items-center px-5 gap-3"
          onPress={() => navigation.navigate('RoomFeed', { roomId })}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubbles-outline" size={18} color="#374151" />
          <View className="flex-1">
            <Text className="text-gray-900 text-sm font-jakarta-bold">Room Feed</Text>
            <Text className="text-gray-400 text-xs font-jakarta mt-0.5">View all room notices</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
        </TouchableOpacity>
      </View>

      {/* Sidebar */}
      <Modal visible={sidebarVisible} animationType="none" transparent onRequestClose={() => setSidebarVisible(false)}>
        <View className="flex-1 flex-row" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setSidebarVisible(false)} />
          <View className="w-72 bg-white absolute right-0 top-0 bottom-0 px-5 pt-16 pb-8 flex flex-col">
            <View className="items-center mb-8">
              <View className="w-12 h-12 rounded-full bg-gray-900 items-center justify-center mb-3">
                <Text className="text-white text-base font-jakarta-bold">{initials}</Text>
              </View>
              <Text className="text-sm text-gray-900 font-jakarta-bold text-center">{user?.displayName || 'Course Rep'}</Text>
              <Text className="text-xs text-gray-400 font-jakarta mt-0.5 text-center">{user?.email || ''}</Text>
              <View className="bg-gray-100 rounded-full px-3 py-1 mt-2">
                <Text className="text-xs text-gray-600 font-jakarta-semi">Course Rep</Text>
              </View>
            </View>
            <View className="h-px bg-gray-100 mb-4" />
            <View className="flex-1 gap-1">
              <TouchableOpacity className="flex-row items-center gap-3 px-3 py-3.5 rounded-xl" activeOpacity={0.7}>
                <Ionicons name="person-outline" size={20} color="#374151" />
                <Text className="text-sm text-gray-700 font-jakarta-semi">Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center gap-3 px-3 py-3.5 rounded-xl" activeOpacity={0.7}>
                <Ionicons name="notifications-outline" size={20} color="#374151" />
                <Text className="text-sm text-gray-700 font-jakarta-semi">Notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center gap-3 px-3 py-3.5 rounded-xl" activeOpacity={0.7}>
                <Ionicons name="settings-outline" size={20} color="#374151" />
                <Text className="text-sm text-gray-700 font-jakarta-semi">Settings</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              className="flex-row items-center gap-3 px-3 py-3.5 bg-red-50 rounded-xl"
              activeOpacity={0.7}
              onPress={() => { setSidebarVisible(false); signOut && signOut(); }}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text className="text-sm text-red-500 font-jakarta-semi">Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
