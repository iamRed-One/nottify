import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * @param {{ notice: object, showMeta?: boolean, onPress?: () => void }} props
 */
export default function NoticeCard({ notice, showMeta = false, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.title}>{notice?.title}</Text>
      <Text style={styles.body} numberOfLines={showMeta ? 3 : undefined}>
        {notice?.body}
      </Text>

      {showMeta && (
        <View style={styles.meta}>
          <Text style={styles.poster}>
            {notice?.postedByName || 'Unknown'}
            {notice?.postedByRole ? ` · ${notice.postedByRole}` : ''}
          </Text>
          <Text style={styles.time}>{formatTime(notice?.createdAt)}</Text>
        </View>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  poster: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  time: { fontSize: 12, color: '#9CA3AF' },
});
