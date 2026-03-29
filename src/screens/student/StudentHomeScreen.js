import { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

const AUDIENCE_LABELS = { all_students: 'All Students', all: 'Everyone' };
const AUDIENCE_COLORS = { all_students: '#DBEAFE', all: '#FEF9C3' };
const AUDIENCE_TEXT_COLORS = { all_students: '#1D4ED8', all: '#854D0E' };

export default function StudentHomeScreen() {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'broadcasts'),
      where('audience', 'in', ['all_students', 'all']),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => { setBroadcasts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (err) => { console.error('StudentHome:', err); setLoading(false); }
    );
    return unsubscribe;
  }, []);

  function renderBroadcast({ item }) {
    const bgColor = AUDIENCE_COLORS[item.audience] ?? '#F3F4F6';
    const textColor = AUDIENCE_TEXT_COLORS[item.audience] ?? '#374151';
    const label = AUDIENCE_LABELS[item.audience] ?? item.audience;
    return (
      <View
        className="bg-white border border-gray-100 rounded-2xl p-4 mb-3"
        style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}
      >
        <View className="flex-row items-start justify-between mb-2 gap-2">
          <Text className="flex-1 text-sm text-gray-900 font-jakarta-bold">{item.title}</Text>
          <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: bgColor }}>
            <Text className="text-xs font-jakarta-semi" style={{ color: textColor }}>{label}</Text>
          </View>
        </View>
        <Text className="text-sm text-gray-500 font-jakarta leading-5">{item.body}</Text>
        <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-50">
          <Text className="text-xs text-gray-400 font-jakarta-semi">
            {item.postedByName || 'Admin'} · {item.postedByRole}
          </Text>
          <Text className="text-xs text-gray-300 font-jakarta">{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-4">
        <Text className="text-xl text-gray-900 font-jakarta-extra">
          Hello, {user?.displayName?.split(' ')[0] || 'Student'} 👋
        </Text>
        <Text className="text-sm text-gray-400 font-jakarta mt-0.5">
          {user?.department} · {user?.level ? `${user.level} Level` : ''}
        </Text>
      </View>

      <Text className="text-xs text-gray-400 font-jakarta-semi uppercase tracking-widest px-5 pt-5 pb-3">
        Notices & Announcements
      </Text>

      {loading ? (
        <ActivityIndicator color="#111827" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={broadcasts}
          keyExtractor={(item) => item.id}
          renderItem={renderBroadcast}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Text className="text-4xl mb-3">📭</Text>
              <Text className="text-base text-gray-700 font-jakarta-bold">No announcements yet.</Text>
              <Text className="text-sm text-gray-400 font-jakarta mt-1 text-center">
                You'll be notified when something is posted.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
