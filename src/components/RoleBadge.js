import { View, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ROLE } from '../theme';

export default function RoleBadge({ role }) {
  const { theme: t } = useTheme();
  const color = ROLE[role]?.color ?? '#888888';
  const label = ROLE[role]?.label ?? role;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: `${color}18`,
        borderWidth: 1,
        borderColor: `${color}30`,
        alignSelf: 'flex-start',
      }}
    >
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
      <Text
        style={{
          color,
          fontSize: 11,
          fontFamily: 'PlusJakartaSans_600SemiBold',
          textTransform: 'capitalize',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
