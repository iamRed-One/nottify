import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function RepHomeScreen({ navigation }) {
  const { user } = useAuth();

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-4">
        <Text className="text-xl text-gray-900 font-jakarta-extra">Course Rep</Text>
        <Text className="text-sm text-gray-400 font-jakarta mt-0.5">
          {user?.department} · {user?.level ? `${user.level} Level` : ''}
        </Text>
      </View>

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
          onPress={() => navigation.navigate('RoomFeed')}
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
    </View>
  );
}
