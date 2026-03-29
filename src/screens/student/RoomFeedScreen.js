import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, ActivityIndicator,
  TouchableOpacity, Modal, KeyboardAvoidingView, ScrollView,
  TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  collection, doc, getDoc, query, orderBy, onSnapshot,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { postNotice } from '../../services/roomService';
import NoticeCard from '../../components/NoticeCard';

export default function RoomFeedScreen({ route }) {
  const { roomId } = route.params ?? {};
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memberRole, setMemberRole] = useState(null);
  const [notMember, setNotMember] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  // Check membership + role
  useEffect(() => {
    if (!roomId || !user?.uid) return;
    getDoc(doc(db, 'rooms', roomId, 'members', user.uid)).then((snap) => {
      if (!snap.exists()) { setNotMember(true); return; }
      setMemberRole(snap.data().role);
    }).catch(console.error);
  }, [roomId, user?.uid]);

  // Real-time notices
  useEffect(() => {
    if (!roomId) { setLoading(false); return; }
    const q = query(
      collection(db, 'rooms', roomId, 'notices'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q,
      (snap) => { setNotices(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (err) => { console.error('RoomFeed:', err); setLoading(false); }
    );
    return unsub;
  }, [roomId]);

  const canPost = memberRole === 'lecturer' || memberRole === 'courserep';

  async function handlePost() {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Missing fields', 'Title and message are required.');
      return;
    }
    setPosting(true);
    try {
      await postNotice(roomId, title.trim(), body.trim());
      setTitle(''); setBody(''); setModalVisible(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setPosting(false);
    }
  }

  if (notMember) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-8">
        <StatusBar style="dark" />
        <Ionicons name="lock-closed-outline" size={36} color="#D1D5DB" />
        <Text className="text-base text-gray-700 font-jakarta-bold mt-4 text-center">
          Not a member of this room
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {loading ? (
        <ActivityIndicator color="#111827" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NoticeCard notice={item} showMeta />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text className="text-4xl mb-3">📋</Text>
              <Text className="text-sm text-gray-400 font-jakarta text-center">
                No notices yet.
              </Text>
            </View>
          }
        />
      )}

      {canPost && (
        <TouchableOpacity
          className="absolute bottom-7 right-5 bg-gray-900 rounded-3xl px-5 py-3.5 flex-row items-center gap-2"
          style={{ elevation: 6, shadowColor: '#111827', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
          onPress={() => { setTitle(''); setBody(''); setModalVisible(true); }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-white text-sm font-jakarta-bold">Notice</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          behavior="padding"
        >
          <ScrollView keyboardShouldPersistTaps="handled" scrollEnabled={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
          <View className="bg-white rounded-t-3xl px-6 pt-4 pb-10">
            <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-5" />
            <Text className="text-lg text-gray-900 font-jakarta-extra mb-4">Post Notice</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 font-jakarta mb-3"
              placeholder="Title" placeholderTextColor="#CBD5E1"
              value={title} onChangeText={setTitle}
            />
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 font-jakarta mb-4"
              placeholder="Message…" placeholderTextColor="#CBD5E1"
              multiline numberOfLines={4} textAlignVertical="top"
              style={{ height: 110 }} value={body} onChangeText={setBody}
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
                onPress={handlePost} disabled={posting}
              >
                {posting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text className="text-white text-sm font-jakarta-bold">Post</Text>}
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
