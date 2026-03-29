import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { postNotice, createRoom, autoEnrollStudents } from '../../services/roomService';
import NoticeCard from '../../components/NoticeCard';

export default function ManageRoomScreen({ navigation }) {
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [notices, setNotices] = useState([]);
  const [roomLoading, setRoomLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const semester = currentMonth <= 6 ? 1 : 2;
  const roomId = user?.department && user?.level
    ? `${user.department}_${user.level}L_${currentYear}_SEM${semester}`
    : null;

  useEffect(() => {
    if (!roomId) return;
    setRoomLoading(true);
    getDoc(doc(db, 'rooms', roomId))
      .then((snap) => setRoom(snap.exists() ? { id: snap.id, ...snap.data() } : null))
      .catch(console.error)
      .finally(() => setRoomLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const noticesQuery = query(
      collection(db, 'rooms', roomId, 'notices'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      noticesQuery,
      (snapshot) => setNotices(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('ManageRoom notices listener error:', err)
    );
    return unsubscribe;
  }, [roomId]);

  async function handleCreateRoom() {
    if (!user?.department || !user?.level) return;
    try {
      const id = await createRoom(user.department, user.level, currentYear, semester);
      const count = await autoEnrollStudents(id, user.department, user.level);
      Alert.alert('Room Created', `${count} student(s) auto-enrolled.`);
      const snap = await getDoc(doc(db, 'rooms', id));
      setRoom({ id: snap.id, ...snap.data() });
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  async function handlePostNotice(title, body) {
    if (!roomId) return;
    setPosting(true);
    try {
      await postNotice(roomId, title, body);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setPosting(false);
    }
  }

  if (roomLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (!room) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-7">
        <StatusBar style="dark" />
        <View className="w-16 h-16 rounded-2xl bg-white border border-gray-100 items-center justify-center mb-5">
          <Ionicons name="albums-outline" size={28} color="#9CA3AF" />
        </View>
        <Text className="text-lg text-gray-900 font-jakarta-extra mb-2 text-center">No Active Room</Text>
        <Text className="text-sm text-gray-400 font-jakarta text-center leading-6 mb-8">
          Create a room for {user?.department} {user?.level} Level — {currentYear} Sem {semester}.
        </Text>
        <TouchableOpacity
          className="bg-gray-900 rounded-xl py-3.5 px-6 items-center"
          onPress={handleCreateRoom}
          activeOpacity={0.85}
        >
          <Text className="text-white text-sm font-jakarta-bold">Create Room + Auto-Enroll</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusBg = room.status === 'active' ? '#DCFCE7' : '#F3F4F6';
  const statusText = room.status === 'active' ? '#15803D' : '#6B7280';

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Room header */}
      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-4 flex-row items-center justify-between">
        <Text className="flex-1 text-base text-gray-900 font-jakarta-bold mr-3" numberOfLines={1}>
          {room.name || roomId}
        </Text>
        <View className="rounded-full px-3 py-1" style={{ backgroundColor: statusBg }}>
          <Text className="text-xs font-jakarta-semi capitalize" style={{ color: statusText }}>
            {room.status}
          </Text>
        </View>
      </View>

      {/* Notices list */}
      <FlatList
        data={notices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NoticeCard notice={item} showMeta onPress={() => {}} />
        )}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListHeaderComponent={
          <Text className="text-xs text-gray-400 font-jakarta-semi uppercase tracking-widest mb-3">
            Notices {notices.length > 0 ? `(${notices.length})` : ''}
          </Text>
        }
        ListEmptyComponent={
          <View className="items-center py-10">
            <Text className="text-sm text-gray-400 font-jakarta">No notices yet. Post the first one!</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        className={`absolute bottom-7 right-5 bg-gray-900 rounded-3xl px-5 py-3.5 flex-row items-center gap-2 ${posting ? 'opacity-50' : ''}`}
        style={{ shadowColor: '#111827', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
        onPress={() => navigation.navigate('PostNotice', { roomId, onPost: handlePostNotice })}
        disabled={posting}
        activeOpacity={0.85}
      >
        {posting
          ? <ActivityIndicator color="#fff" size="small" />
          : <>
              <Ionicons name="add" size={18} color="#fff" />
              <Text className="text-white text-sm font-jakarta-bold">Notice</Text>
            </>
        }
      </TouchableOpacity>
    </View>
  );
}
