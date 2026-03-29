import { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  collection, query, orderBy, onSnapshot,
  doc, getDoc, getDocs, where,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { postNotice, createRoom, autoEnrollStudents, addMemberToRoom } from '../../services/roomService';
import NoticeCard from '../../components/NoticeCard';

export default function ManageRoomScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('notices');
  const [room, setRoom] = useState(null);
  const [notices, setNotices] = useState([]);
  const [members, setMembers] = useState([]);
  const [roomLoading, setRoomLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const searchDebounce = useRef(null);

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
    const q = query(collection(db, 'rooms', roomId, 'notices'), orderBy('createdAt', 'desc'));
    return onSnapshot(q,
      (snap) => setNotices(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('ManageRoom notices:', err)
    );
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    return onSnapshot(collection(db, 'rooms', roomId, 'members'), async (snap) => {
      const memberDocs = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      const withProfiles = await Promise.all(
        memberDocs.map(async (m) => {
          const userSnap = await getDoc(doc(db, 'users', m.uid));
          return { ...m, ...(userSnap.exists() ? userSnap.data() : {}) };
        })
      );
      setMembers(withProfiles);
    }, (err) => console.error('ManageRoom members:', err));
  }, [roomId]);

  useEffect(() => {
    if (searchText.length < 2) { setSearchResults([]); return; }
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const snap = await getDocs(
          query(collection(db, 'users'),
            where('role', '==', 'lecturer'),
            where('status', '==', 'active'))
        );
        const lower = searchText.toLowerCase();
        const results = snap.docs
          .map((d) => ({ uid: d.id, ...d.data() }))
          .filter((u) =>
            (u.displayName?.toLowerCase().includes(lower)) ||
            (u.staffId?.toLowerCase().includes(lower))
          )
          .slice(0, 5);
        setSearchResults(results);
      } catch (err) {
        console.error('Lecturer search:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [searchText]);

  const memberIds = new Set(members.map((m) => m.uid));

  async function handleAddLecturer(lecturer) {
    setAddingId(lecturer.uid);
    try {
      await addMemberToRoom(roomId, lecturer.uid);
      setSearchText('');
      setSearchResults([]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setAddingId(null);
    }
  }

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
          onPress={handleCreateRoom} activeOpacity={0.85}
        >
          <Text className="text-white text-sm font-jakarta-bold">Create Room + Auto-Enroll</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lecturers = members.filter((m) => m.role === 'lecturer');
  const students = members.filter((m) => m.role !== 'lecturer');
  const statusBg = room.status === 'active' ? '#DCFCE7' : '#F3F4F6';
  const statusText = room.status === 'active' ? '#15803D' : '#6B7280';

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

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

      {/* Tab bar */}
      <View className="flex-row bg-white border-b border-gray-100 px-5 gap-4">
        {['notices', 'members'].map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} className="py-3">
            <Text className={`text-sm font-jakarta-bold capitalize ${activeTab === tab ? 'text-gray-900' : 'text-gray-400'}`}>
              {tab === 'members' ? `Members (${members.length})` : 'Notices'}
            </Text>
            {activeTab === tab && <View className="h-0.5 bg-gray-900 rounded-full mt-1" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Notices Tab */}
      {activeTab === 'notices' && (
        <View className="flex-1">
          <FlatList
            data={notices}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <NoticeCard notice={item} showMeta onPress={() => {}} />}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Text className="text-sm text-gray-400 font-jakarta">No notices yet. Post the first one!</Text>
              </View>
            }
          />
          <TouchableOpacity
            className={`absolute bottom-7 right-5 bg-gray-900 rounded-3xl px-5 py-3.5 flex-row items-center gap-2 ${posting ? 'opacity-50' : ''}`}
            style={{ elevation: 6, shadowColor: '#111827', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
            onPress={() => navigation.navigate('RoomFeed', { roomId })}
            disabled={posting}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-white text-sm font-jakarta-bold">Notice</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <View className="flex-1">
          <View className="px-5 pt-4 pb-2">
            <View className="bg-white border border-gray-200 rounded-xl flex-row items-center px-4 gap-2">
              <Ionicons name="search-outline" size={16} color="#9CA3AF" />
              <TextInput
                className="flex-1 py-3 text-sm text-gray-900 font-jakarta"
                placeholder="Search by name or staff ID"
                placeholderTextColor="#CBD5E1"
                value={searchText}
                onChangeText={setSearchText}
                autoCorrect={false}
              />
              {searching && <ActivityIndicator size="small" color="#9CA3AF" />}
              {searchText.length > 0 && !searching && (
                <TouchableOpacity onPress={() => { setSearchText(''); setSearchResults([]); }}>
                  <Ionicons name="close-circle" size={16} color="#D1D5DB" />
                </TouchableOpacity>
              )}
            </View>

            {searchResults.length > 0 && (
              <View
                className="bg-white border border-gray-200 rounded-xl mt-1 overflow-hidden"
                style={{ elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
              >
                {searchResults.map((lecturer) => {
                  const alreadyAdded = memberIds.has(lecturer.uid);
                  return (
                    <TouchableOpacity
                      key={lecturer.uid}
                      className={`flex-row items-center px-4 py-3 border-b border-gray-50 ${alreadyAdded ? 'opacity-50' : ''}`}
                      onPress={() => !alreadyAdded && handleAddLecturer(lecturer)}
                      disabled={alreadyAdded || addingId === lecturer.uid}
                      activeOpacity={0.7}
                    >
                      <View className="flex-1">
                        <Text className="text-sm text-gray-900 font-jakarta-bold">{lecturer.displayName}</Text>
                        <Text className="text-xs text-gray-400 font-jakarta">{lecturer.staffId || 'No staff ID'}</Text>
                      </View>
                      {alreadyAdded
                        ? <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                        : addingId === lecturer.uid
                          ? <ActivityIndicator size="small" color="#111827" />
                          : <Ionicons name="add-circle-outline" size={18} color="#6B7280" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            <Text className="text-xs text-gray-400 font-jakarta-semi uppercase tracking-widest mb-2 mt-2">
              Lecturers ({lecturers.length})
            </Text>
            {lecturers.length === 0
              ? <Text className="text-sm text-gray-300 font-jakarta mb-4">No lecturers added yet.</Text>
              : lecturers.map((m) => (
                <View key={m.uid} className="bg-white border border-gray-100 rounded-xl px-4 py-3 mb-2 flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-sm text-gray-900 font-jakarta-bold">{m.displayName || 'Lecturer'}</Text>
                    <Text className="text-xs text-gray-400 font-jakarta">{m.staffId || ''}</Text>
                  </View>
                  <View className="bg-violet-100 rounded-full px-2.5 py-0.5">
                    <Text className="text-xs text-violet-700 font-jakarta-semi">Lecturer</Text>
                  </View>
                </View>
              ))}

            <Text className="text-xs text-gray-400 font-jakarta-semi uppercase tracking-widest mb-2 mt-4">
              Students ({students.length})
            </Text>
            {students.length === 0
              ? <Text className="text-sm text-gray-300 font-jakarta">No students enrolled yet.</Text>
              : students.map((m) => (
                <View key={m.uid} className="bg-white border border-gray-100 rounded-xl px-4 py-3 mb-2 flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-sm text-gray-900 font-jakarta-bold">{m.displayName || 'Student'}</Text>
                    <Text className="text-xs text-gray-400 font-jakarta">{m.matricNumber || ''}</Text>
                  </View>
                  <View className="bg-gray-100 rounded-full px-2.5 py-0.5">
                    <Text className="text-xs text-gray-600 font-jakarta-semi capitalize">{m.role}</Text>
                  </View>
                </View>
              ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
