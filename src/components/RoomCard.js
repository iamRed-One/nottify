import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function RoomCard({ room, onPress }) {
  const { theme: t } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.bgCard,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: t.border,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: t.bgElevated,
          borderWidth: 1,
          borderColor: t.borderStrong,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons name="albums-outline" size={18} color={t.textSub} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: t.text, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, marginBottom: 2 }}>
          {room?.name}
        </Text>
        {room?.description ? (
          <Text style={{ color: t.textSub, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12 }} numberOfLines={1}>
            {room.description}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
    </TouchableOpacity>
  );
}
