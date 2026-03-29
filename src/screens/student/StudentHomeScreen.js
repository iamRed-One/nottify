import { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

const AUDIENCE_LABELS = { all_students: 'All Students', all: 'Everyone' };
const AUDIENCE_COLORS = { all_students: '#DBEAFE', all: '#FEF9C3' };
const AUDIENCE_TEXT_COLORS = { all_students: '#1D4ED8', all: '#854D0E' };

export default function StudentHomeScreen() {
  const { user, signOut } = useAuth();
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'broadcasts'),
      where('audience', 'in', ['all_students', 'all']),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setBroadcasts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('StudentHome:', err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'S';

  function renderBroadcast({ item }) {
    const bgColor = AUDIENCE_COLORS[item.audience] ?? '#F3F4F6';
    const textColor = AUDIENCE_TEXT_COLORS[item.audience] ?? '#374151';
    const label = AUDIENCE_LABELS[item.audience] ?? item.audience;
    return (
      <View
        className="bg-white border border-gray-100 rounded-2xl p-4 mb-3"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        }}
      >
        <View className="flex-row items-start justify-between mb-2 gap-2">
          <Text className="flex-1 text-sm text-gray-900 font-jakarta-bold">{item.title}</Text>
          <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: bgColor }}>
            <Text className="text-xs font-jakarta-semi" style={{ color: textColor }}>
              {label}
            </Text>
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
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-4 flex-row items-start justify-between">
        <View>
          <Text className="text-xl text-gray-900 font-jakarta-extra">
            Hello, {user?.displayName?.split(' ')[0] || 'Student'} 👋
          </Text>
          <Text className="text-sm text-gray-400 font-jakarta mt-0.5">
            {user?.department} · {user?.level ? `${user.level} Level` : ''}
          </Text>
        </View>
        <TouchableOpacity
          className="p-1 mt-1"
          onPress={() => setSidebarVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="menu-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Section label */}
      <Text className="text-xs text-gray-400 font-jakarta-semi uppercase tracking-widest px-5 pt-5 pb-3">
        Notices & Announcements
      </Text>

      {/* Broadcasts list */}
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

      {/* Sidebar Modal */}
      <Modal
        visible={sidebarVisible}
        animationType="none"
        transparent
        onRequestClose={() => setSidebarVisible(false)}
      >
        {/* Full-screen overlay — tap to dismiss */}
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => setSidebarVisible(false)}
        >
          {/* Sidebar panel — stop propagation so taps inside don't close */}
          <TouchableOpacity
            className="w-72 absolute right-0 top-0 bottom-0 bg-white"
            activeOpacity={1}
            onPress={() => {}}
          >
            {/* Profile section */}
            <View className="pt-16 pb-6 px-6 border-b border-gray-100">
              <View className="w-12 h-12 rounded-full bg-gray-900 items-center justify-center mb-3">
                <Text className="text-white text-base font-jakarta-bold">{initials}</Text>
              </View>
              <Text className="text-gray-900 text-sm font-jakarta-bold" numberOfLines={1}>
                {user?.displayName || 'Student'}
              </Text>
              <Text className="text-gray-400 text-xs font-jakarta mt-0.5" numberOfLines={1}>
                {user?.email || ''}
              </Text>
              <View className="mt-2 self-start bg-gray-100 rounded-full px-2.5 py-0.5">
                <Text className="text-gray-600 text-xs font-jakarta-semi">Student</Text>
              </View>
            </View>

            {/* Menu rows */}
            <View className="flex-1 px-3 pt-3">
              <SidebarRow icon="person-outline" label="Profile" onPress={() => setSidebarVisible(false)} />
              <SidebarRow icon="notifications-outline" label="Notifications" onPress={() => setSidebarVisible(false)} />
              <SidebarRow icon="settings-outline" label="Settings" onPress={() => setSidebarVisible(false)} />
            </View>

            {/* Sign out */}
            <View className="px-3 pb-10 border-t border-gray-100">
              <TouchableOpacity
                className="flex-row items-center gap-3 px-3 py-3.5 rounded-xl bg-red-50 mt-3"
                onPress={() => { setSidebarVisible(false); signOut && signOut(); }}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                <Text className="text-red-500 text-sm font-jakarta-semi">Sign Out</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function SidebarRow({ icon, label, onPress }) {
  return (
    <TouchableOpacity
      className="flex-row items-center gap-3 px-3 py-3.5 rounded-xl"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={18} color="#374151" />
      <Text className="text-gray-700 text-sm font-jakarta-semi">{label}</Text>
    </TouchableOpacity>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
