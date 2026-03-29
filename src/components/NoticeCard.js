import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ROLE } from '../theme';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function NoticeCard({ notice, showMeta = false, onPress }) {
  const { theme: t } = useTheme();
  const Wrapper = onPress ? TouchableOpacity : View;
  const accentColor = ROLE[notice?.postedByRole]?.color ?? '#888888';

  return (
    <Wrapper
      style={{
        flexDirection: 'row',
        backgroundColor: t.bgCard,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: t.border,
        marginBottom: 12,
        overflow: 'hidden',
      }}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Left accent bar */}
      <View style={{ width: 3, backgroundColor: accentColor }} />

      {/* Content */}
      <View style={{ flex: 1, padding: 16 }}>
        <Text
          style={{ color: t.text, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, marginBottom: 6 }}
          numberOfLines={2}
        >
          {notice?.title}
        </Text>
        <Text
          style={{ color: t.textSub, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, lineHeight: 20 }}
          numberOfLines={showMeta ? 3 : undefined}
        >
          {notice?.body}
        </Text>

        {showMeta && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accentColor }} />
              <Text style={{ color: t.textSub, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11 }}>
                {notice?.postedByName || 'Unknown'}
                {notice?.postedByRole ? `  ·  ${notice.postedByRole}` : ''}
              </Text>
            </View>
            <Text style={{ color: t.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11 }}>
              {formatTime(notice?.createdAt)}
            </Text>
          </View>
        )}
      </View>
    </Wrapper>
  );
}
