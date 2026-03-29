import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, Modal, KeyboardAvoidingView, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { sendBroadcastPush } from '../../services/notificationService';

const AUDIENCE_LABELS = { all_students: 'All Students', staff_only: 'Staff Only', all: 'Everyone' };
const AUDIENCE_COLORS = { all_students: '#DBEAFE', staff_only: '#F3E8FF', all: '#FEF9C3' };
const AUDIENCE_TEXT_COLORS = { all_students: '#1D4ED8', staff_only: '#7E22CE', all: '#854D0E' };

export default function DeanHomeScreen() {
  const { user, signOut } = useAuth();
  const [broadcasts, setBroadcasts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [audience, setAudience] = useState('all_students');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q,
      (snap) => { setBroadcasts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setFeedLoading(false); },
      (err) => { console.error('DeanHome broadcasts listener:', err); setFeedLoading(false); }
    );
    return unsubscribe;
  }, []);

  async function handlePost() {
    if (!title.trim() || !body.trim()) { Alert.alert('Missing fields', 'Both title and message are required.'); return; }
    setPosting(true);
    try {
      await addDoc(collection(db, 'broadcasts'), {
        title: title.trim(), body: body.trim(), audience,
        postedBy: user.uid, postedByName: user.displayName ?? '', postedByRole: 'dean',
        createdAt: serverTimestamp(),
      });
      sendBroadcastPush(title.trim(), body.trim(), audience).catch(console.error);
      setTitle(''); setBody(''); setModalVisible(false);
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setPosting(false); }
  }

  function openCompose(targetAudience) { setAudience(targetAudience); setTitle(''); setBody(''); setModalVisible(true); }

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'D';

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
          <Text className="text-xs text-gray-400 font-jakarta-semi">{item.postedByName || 'Dean'}</Text>
          <Text className="text-xs text-gray-300 font-jakarta">{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-4 flex-row items-start justify-between">
        <View>
          <Text className="text-xl text-gray-900 font-jakarta-extra">Dean Dashboard</Text>
          <Text className="text-sm text-gray-400 font-jakarta mt-0.5">
            {user?.displayName ? `Welcome, ${user.displayName}` : 'Faculty of Sciences'}
          </Text>
        </View>
        <TouchableOpacity className="p-1 mt-1" onPress={() => setSidebarVisible(true)} activeOpacity={0.7}>
          <Ionicons name="menu-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-3 px-5 pt-4 pb-2">
        <TouchableOpacity
          className="flex-1 bg-gray-900 rounded-xl py-3.5 items-center flex-row justify-center gap-2"
          onPress={() => openCompose('all_students')}
          activeOpacity={0.85}
        >
          <Ionicons name="megaphone-outline" size={15} color="#fff" />
          <Text className="text-white text-xs font-jakarta-bold">All Students</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 border border-gray-200 bg-white rounded-xl py-3.5 items-center flex-row justify-center gap-2"
          onPress={() => openCompose('staff_only')}
          activeOpacity={0.85}
        >
          <Ionicons name="people-outline" size={15} color="#374151" />
          <Text className="text-gray-700 text-xs font-jakarta-bold">Staff Only</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-xs text-gray-400 font-jakarta-semi uppercase tracking-widest px-5 pt-4 pb-3">
        Recent Broadcasts
      </Text>

      {feedLoading ? (
        <ActivityIndicator color="#111827" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={broadcasts}
          keyExtractor={(item) => item.id}
          renderItem={renderBroadcast}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Text className="text-4xl mb-3">📋</Text>
              <Text className="text-sm text-gray-400 font-jakarta text-center">No broadcasts yet.</Text>
            </View>
          }
        />
      )}

      {/* Compose Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          behavior="padding"
        >
          <ScrollView
            scrollEnabled={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }}
          >
            <View className="bg-white rounded-t-3xl px-6 pt-4 pb-10">
              <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-5" />
              <Text className="text-lg text-gray-900 font-jakarta-extra mb-4">
                New Broadcast — {AUDIENCE_LABELS[audience]}
              </Text>

              {/* Audience Chips */}
              <View className="flex-row gap-2 mb-4">
                {Object.entries(AUDIENCE_LABELS).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setAudience(key)}
                    className={`flex-1 py-2 rounded-xl border items-center ${audience === key ? 'bg-gray-900 border-gray-900' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <Text className={`text-xs font-jakarta-semi ${audience === key ? 'text-white' : 'text-gray-500'}`}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 font-jakarta mb-3"
                placeholder="Title"
                placeholderTextColor="#CBD5E1"
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 font-jakarta mb-4"
                placeholder="Message…"
                placeholderTextColor="#CBD5E1"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{ height: 110 }}
                value={body}
                onChangeText={setBody}
              />

              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 border border-gray-200 rounded-xl py-3.5 items-center"
                  onPress={() => setModalVisible(false)}
                >
                  <Text className="text-sm text-gray-600 font-jakarta-semi">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-[2] bg-gray-900 rounded-xl py-3.5 items-center ${posting ? 'opacity-50' : ''}`}
                  onPress={handlePost}
                  disabled={posting}
                >
                  {posting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text className="text-white text-sm font-jakarta-bold">Post</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sidebar Modal */}
      <Modal visible={sidebarVisible} animationType="none" transparent onRequestClose={() => setSidebarVisible(false)}>
        <View className="flex-1 flex-row" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
          {/* Dismiss overlay (left side) */}
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setSidebarVisible(false)} />

          {/* Sidebar Panel */}
          <View className="w-72 bg-white absolute right-0 top-0 bottom-0 px-5 pt-16 pb-8 flex flex-col">

            {/* User Info */}
            <View className="items-center mb-8">
              <View className="w-12 h-12 rounded-full bg-gray-900 items-center justify-center mb-3">
                <Text className="text-white text-base font-jakarta-bold">{initials}</Text>
              </View>
              <Text className="text-sm text-gray-900 font-jakarta-bold text-center">
                {user?.displayName || 'Dean'}
              </Text>
              <Text className="text-xs text-gray-400 font-jakarta mt-0.5 text-center">
                {user?.email || ''}
              </Text>
              <View className="bg-gray-100 rounded-full px-3 py-1 mt-2">
                <Text className="text-xs text-gray-600 font-jakarta-semi">Dean</Text>
              </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-gray-100 mb-4" />

            {/* Menu Items */}
            <View className="flex-1 gap-1">
              <TouchableOpacity
                className="flex-row items-center gap-3 px-3 py-3.5 rounded-xl"
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={20} color="#374151" />
                <Text className="text-sm text-gray-700 font-jakarta-semi">Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center gap-3 px-3 py-3.5 rounded-xl"
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={20} color="#374151" />
                <Text className="text-sm text-gray-700 font-jakarta-semi">Notifications</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center gap-3 px-3 py-3.5 rounded-xl"
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={20} color="#374151" />
                <Text className="text-sm text-gray-700 font-jakarta-semi">Settings</Text>
              </TouchableOpacity>
            </View>

            {/* Sign Out */}
            <TouchableOpacity
              className="flex-row items-center gap-3 px-3 py-3.5 bg-red-50 rounded-xl"
              activeOpacity={0.7}
              onPress={() => {
                setSidebarVisible(false);
                signOut && signOut();
              }}
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

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
