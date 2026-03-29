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
import { getRoomsForUser } from '../../services/roomService';

export default function LecturerHomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('rooms');
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  const [broadcasts, setBroadcasts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'L';

  useEffect(() => {
    if (!user?.uid) return;
    getRoomsForUser(user.uid)
      .then(setRooms)
      .catch(console.error)
      .finally(() => setRoomsLoading(false));
  }, [user?.uid]);

  useEffect(() => {
    const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q,
      (snap) => { setBroadcasts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setFeedLoading(false); },
      (err) => { console.error('LecturerHome broadcasts:', err); setFeedLoading(false); }
    );
  }, []);

  async function handlePost() {
    if (!title.trim() || !body.trim()) { Alert.alert('Missing fields', 'Both title and message are required.'); return; }
    setPosting(true);
    try {
      await addDoc(collection(db, 'broadcasts'), {
        title: title.trim(), body: body.trim(), audience: 'all_students',
        postedBy: user.uid, postedByName: user.displayName ?? '', postedByRole: 'lecturer',
        createdAt: serverTimestamp(),
      });
      sendBroadcastPush(title.trim(), body.trim(), 'all_students').catch(console.error);
      setTitle(''); setBody(''); setModalVisible(false);
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setPosting(false); }
  }

  function renderBroadcast({ item }) {
    return (
      <View className="bg-white border border-gray-100 rounded-2xl p-4 mb-3"
        style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
        <View className="flex-row items-start justify-between mb-2 gap-2">
          <Text className="flex-1 text-sm text-gray-900 font-jakarta-bold">{item.title}</Text>
          <View className="bg-violet-100 rounded-full px-2.5 py-0.5">
            <Text className="text-xs text-violet-700 font-jakarta-semi">{item.postedByRole}</Text>
          </View>
        </View>
        <Text className="text-sm text-gray-500 font-jakarta leading-5">{item.body}</Text>
        <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-50">
          <Text className="text-xs text-gray-400 font-jakarta-semi">{item.postedByName || 'Staff'}</Text>
          <Text className="text-xs text-gray-300 font-jakarta">{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-0 flex-row items-start justify-between">
        <View className="pb-0">
          <Text className="text-xl text-gray-900 font-jakarta-extra">Lecturer Dashboard</Text>
          <Text className="text-sm text-gray-400 font-jakarta mt-0.5 mb-3">
            {user?.displayName ? `Dr. ${user.displayName}` : 'Welcome'}
          </Text>
        </View>
        <TouchableOpacity className="p-1 mt-1" onPress={() => setSidebarVisible(true)} activeOpacity={0.7}>
          <Ionicons name="menu-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View className="flex-row bg-white border-b border-gray-100 px-5 gap-4">
        {[{ key: 'rooms', label: 'My Rooms' }, { key: 'broadcasts', label: 'Broadcasts' }].map(({ key, label }) => (
          <TouchableOpacity key={key} onPress={() => setActiveTab(key)} className="py-3">
            <Text className={`text-sm font-jakarta-bold ${activeTab === key ? 'text-gray-900' : 'text-gray-400'}`}>{label}</Text>
            {activeTab === key && <View className="h-0.5 bg-gray-900 rounded-full mt-1" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Rooms Tab */}
      {activeTab === 'rooms' && (
        roomsLoading
          ? <ActivityIndicator color="#111827" style={{ marginTop: 40 }} />
          : (
            <FlatList
              data={rooms}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              ListEmptyComponent={
                <View className="items-center mt-16">
                  <Text className="text-4xl mb-3">🏫</Text>
                  <Text className="text-sm text-gray-400 font-jakarta text-center">
                    You haven't been added to any rooms yet.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 flex-row items-center"
                  style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
                  onPress={() => navigation.navigate('RoomFeed', { roomId: item.id })}
                  activeOpacity={0.8}
                >
                  <View className="flex-1">
                    <Text className="text-sm text-gray-900 font-jakarta-bold">{item.name}</Text>
                    <Text className="text-xs text-gray-400 font-jakarta mt-0.5">
                      {item.department} · {item.level} Level · Sem {item.semester}
                    </Text>
                  </View>
                  <View className="bg-blue-50 rounded-full px-2.5 py-0.5 mr-2">
                    <Text className="text-xs text-blue-700 font-jakarta-semi capitalize">{item.status}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </TouchableOpacity>
              )}
            />
          )
      )}

      {/* Broadcasts Tab */}
      {activeTab === 'broadcasts' && (
        <View className="flex-1">
          <View className="px-5 pt-4 pb-2">
            <TouchableOpacity
              className="bg-gray-900 rounded-xl py-3.5 items-center flex-row justify-center gap-2"
              onPress={() => { setTitle(''); setBody(''); setModalVisible(true); }}
              activeOpacity={0.85}
            >
              <Ionicons name="megaphone-outline" size={16} color="#fff" />
              <Text className="text-white text-sm font-jakarta-bold">Post Notice to Students</Text>
            </TouchableOpacity>
          </View>

          {feedLoading
            ? <ActivityIndicator color="#111827" style={{ marginTop: 32 }} />
            : (
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

          <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
            <KeyboardAvoidingView className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} behavior="padding">
              <ScrollView keyboardShouldPersistTaps="handled" scrollEnabled={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
                <View className="bg-white rounded-t-3xl px-6 pt-4 pb-10">
                  <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-5" />
                  <Text className="text-lg text-gray-900 font-jakarta-extra mb-4">New Notice — All Students</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 font-jakarta mb-3"
                    placeholder="Title" placeholderTextColor="#CBD5E1" value={title} onChangeText={setTitle}
                  />
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 font-jakarta mb-4"
                    placeholder="Message…" placeholderTextColor="#CBD5E1"
                    multiline numberOfLines={4} textAlignVertical="top"
                    style={{ height: 110 }} value={body} onChangeText={setBody}
                  />
                  <View className="flex-row gap-3">
                    <TouchableOpacity className="flex-1 border border-gray-200 rounded-xl py-3.5 items-center" onPress={() => setModalVisible(false)}>
                      <Text className="text-sm text-gray-600 font-jakarta-semi">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className={`flex-[2] bg-gray-900 rounded-xl py-3.5 items-center ${posting ? 'opacity-50' : ''}`}
                      onPress={handlePost} disabled={posting}
                    >
                      {posting ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white text-sm font-jakarta-bold">Post</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>
        </View>
      )}

      {/* Sidebar */}
      <Modal visible={sidebarVisible} animationType="none" transparent onRequestClose={() => setSidebarVisible(false)}>
        <View className="flex-1 flex-row" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setSidebarVisible(false)} />
          <View className="w-72 bg-white absolute right-0 top-0 bottom-0 px-5 pt-16 pb-8 flex flex-col">
            <View className="items-center mb-8">
              <View className="w-12 h-12 rounded-full bg-gray-900 items-center justify-center mb-3">
                <Text className="text-white text-base font-jakarta-bold">{initials}</Text>
              </View>
              <Text className="text-sm text-gray-900 font-jakarta-bold text-center">{user?.displayName || 'Lecturer'}</Text>
              <Text className="text-xs text-gray-400 font-jakarta mt-0.5 text-center">{user?.email || ''}</Text>
              <View className="bg-gray-100 rounded-full px-3 py-1 mt-2">
                <Text className="text-xs text-gray-600 font-jakarta-semi">Lecturer</Text>
              </View>
            </View>
            <View className="h-px bg-gray-100 mb-4" />
            <TouchableOpacity
              className="flex-row items-center gap-3 px-3 py-3.5 bg-red-50 rounded-xl mt-auto"
              activeOpacity={0.7}
              onPress={() => { setSidebarVisible(false); signOut?.(); }}
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
