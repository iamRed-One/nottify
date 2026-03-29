import { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, ScrollView, StyleSheet, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  collection, query, orderBy, onSnapshot,
  doc, getDoc, getDocs, where,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { createRoom, autoEnrollStudents, addMemberToRoom, approveStudent, rejectStudent } from '../../services/roomService';
import NoticeCard from '../../components/NoticeCard';

export default function ManageRoomScreen({ navigation }) {
  const { user } = useAuth();
  const { theme: t, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('notices');
  const [room, setRoom] = useState(null);
  const [notices, setNotices] = useState([]);
  const [members, setMembers] = useState([]);
  const [roomLoading, setRoomLoading] = useState(true);
  const [posting] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const searchDebounce = useRef(null);

  const [pendingStudents, setPendingStudents] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

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
    if (!user?.department || !user?.level) { setPendingLoading(false); return; }
    const q = query(
      collection(db, 'users'),
      where('role', 'in', ['student', 'courserep']),
      where('department', '==', user.department),
      where('level', '==', user.level),
      where('status', '==', 'pending')
    );
    return onSnapshot(q,
      (snap) => { setPendingStudents(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))); setPendingLoading(false); },
      (err) => { console.error('ManageRoom pending:', err); setPendingLoading(false); }
    );
  }, [user?.department, user?.level]);

  async function handleApprove(student) {
    if (!roomId) { Alert.alert('No Room', 'Create a room first before approving students.'); return; }
    setActionId(student.uid);
    try {
      await approveStudent(roomId, student.uid);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(student) {
    Alert.alert(
      'Reject Student',
      `Are you sure you want to reject ${student.displayName || 'this student'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject', style: 'destructive',
          onPress: async () => {
            setActionId(student.uid);
            try { await rejectStudent(student.uid); }
            catch (err) { Alert.alert('Error', err.message); }
            finally { setActionId(null); }
          },
        },
      ]
    );
  }

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

  // ── Loading state ──────────────────────────────────────────────────────────
  if (roomLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: t.bg }]}>
        <StatusBar style={t.statusBar} />
        <ActivityIndicator size="large" color={t.text} />
      </View>
    );
  }

  // ── No-room state ──────────────────────────────────────────────────────────
  if (!room) {
    return (
      <View style={[styles.centered, { backgroundColor: t.bg, paddingHorizontal: 28 }]}>
        <StatusBar style={t.statusBar} />
        <View style={[styles.noRoomIconBox, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <Ionicons name="albums-outline" size={30} color={t.textSub} />
        </View>
        <Text style={[styles.noRoomTitle, { color: t.text }]}>No Active Room</Text>
        <Text style={[styles.noRoomDesc, { color: t.textSub }]}>
          Create a room for {user?.department} {user?.level} Level — {currentYear} Sem {semester}.
        </Text>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: t.btnPrimaryBg }]}
          onPress={handleCreateRoom}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaBtnText, { color: t.btnPrimaryText }]}>Create Room + Auto-Enroll</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lecturers = members.filter((m) => m.role === 'lecturer');
  const students = members.filter((m) => m.role !== 'lecturer');

  const isActive = room.status === 'active';
  const statusBadgeBg = isActive ? '#30D15820' : t.bgElevated;
  const statusBadgeText = isActive ? '#30D158' : t.textSub;

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.flex1, { backgroundColor: t.bg }]}>
      <StatusBar style={t.statusBar} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.bg, borderBottomColor: t.border }]}>
        <Text style={[styles.headerRoomName, { color: t.text }]} numberOfLines={1}>
          {room.name || roomId}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusBadgeBg }]}>
          <Text style={[styles.statusBadgeText, { color: statusBadgeText }]} numberOfLines={1}>
            {room.status}
          </Text>
        </View>
      </View>

      {/* Tab bar — pill style */}
      <View style={[styles.tabBar, { backgroundColor: t.bg, borderBottomColor: t.border }]}>
        {[
          { key: 'notices', label: 'Notices' },
          { key: 'members', label: `Members (${members.length})` },
          { key: 'pending', label: `Pending${pendingStudents.length > 0 ? ` (${pendingStudents.length})` : ''}` },
        ].map(({ key, label }) => {
          const active = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              activeOpacity={0.7}
              style={[
                styles.tabPill,
                active && { backgroundColor: t.bgCard, borderColor: t.border },
              ]}
            >
              <Text style={[styles.tabPillText, { color: active ? t.text : t.textMuted }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Notices Tab */}
      {activeTab === 'notices' && (
        <View style={styles.flex1}>
          <FlatList
            data={notices}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <NoticeCard notice={item} showMeta onPress={() => {}} />}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.emptyNotices}>
                <Text style={[styles.emptyNoticesText, { color: t.textMuted }]}>
                  No notices yet. Post the first one!
                </Text>
              </View>
            }
          />
          {/* FAB */}
          <TouchableOpacity
            style={[
              styles.fab,
              { backgroundColor: t.btnPrimaryBg },
              posting && { opacity: 0.5 },
              isDark
                ? { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }
                : { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
            ]}
            onPress={() => navigation.navigate('RoomFeed', { roomId })}
            disabled={posting}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color={t.btnPrimaryText} />
            <Text style={[styles.fabText, { color: t.btnPrimaryText }]}>Notice</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        pendingLoading ? (
          <ActivityIndicator color={t.text} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
            {pendingStudents.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>✅</Text>
                <Text style={{ fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: t.text, textAlign: 'center' }}>
                  No pending students
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: t.textSub, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
                  New sign-ups from your department and level will appear here.
                </Text>
              </View>
            ) : (
              pendingStudents.map((student) => (
                <View
                  key={student.uid}
                  style={[styles.memberRow, { backgroundColor: t.bgCard, borderColor: t.border, flexDirection: 'column', alignItems: 'stretch', gap: 12 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.memberName, { color: t.text }]}>{student.displayName || 'Student'}</Text>
                      <Text style={[styles.memberSub, { color: t.textSub }]}>{student.matricNumber || student.email}</Text>
                    </View>
                    <View style={[styles.studentBadge, { backgroundColor: '#F9731620', borderColor: '#F9731640' }]}>
                      <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#F97316' }}>Pending</Text>
                    </View>
                  </View>
                  {student.idCardImageUrl ? (
                    <Image
                      source={{ uri: student.idCardImageUrl }}
                      style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 10, backgroundColor: t.bgElevated }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 10, backgroundColor: t.bgElevated, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="image-outline" size={28} color={t.textMuted} />
                      <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: t.textMuted, marginTop: 6 }}>No ID photo submitted</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
                        backgroundColor: t.btnPrimaryBg,
                        opacity: actionId === student.uid ? 0.5 : 1,
                      }}
                      onPress={() => handleApprove(student)}
                      disabled={actionId === student.uid}
                      activeOpacity={0.8}
                    >
                      {actionId === student.uid
                        ? <ActivityIndicator size="small" color={t.btnPrimaryText} />
                        : <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: t.btnPrimaryText }}>Approve</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
                        backgroundColor: t.dangerBg, borderWidth: 1, borderColor: t.danger + '40',
                        opacity: actionId === student.uid ? 0.5 : 1,
                      }}
                      onPress={() => handleReject(student)}
                      disabled={actionId === student.uid}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: t.dangerText }}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <View style={styles.flex1}>
          {/* Search bar */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
              <Ionicons name="search-outline" size={16} color={t.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: t.inputText }]}
                placeholder="Search by name or staff ID"
                placeholderTextColor={t.placeholder}
                value={searchText}
                onChangeText={setSearchText}
                autoCorrect={false}
              />
              {searching && <ActivityIndicator size="small" color={t.textMuted} />}
              {searchText.length > 0 && !searching && (
                <TouchableOpacity onPress={() => { setSearchText(''); setSearchResults([]); }}>
                  <Ionicons name="close-circle" size={16} color={t.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <View
                style={[
                  styles.searchDropdown,
                  { backgroundColor: t.bgCard, borderColor: t.border },
                  !isDark && {
                    shadowColor: '#000',
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 8,
                  },
                ]}
              >
                {searchResults.map((lecturer, idx) => {
                  const alreadyAdded = memberIds.has(lecturer.uid);
                  return (
                    <TouchableOpacity
                      key={lecturer.uid}
                      style={[
                        styles.searchResultRow,
                        idx < searchResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.border },
                        alreadyAdded && { opacity: 0.5 },
                      ]}
                      onPress={() => !alreadyAdded && handleAddLecturer(lecturer)}
                      disabled={alreadyAdded || addingId === lecturer.uid}
                      activeOpacity={0.7}
                    >
                      <View style={styles.flex1}>
                        <Text style={[styles.resultName, { color: t.text }]}>{lecturer.displayName}</Text>
                        <Text style={[styles.resultSub, { color: t.textSub }]}>{lecturer.staffId || 'No staff ID'}</Text>
                      </View>
                      {alreadyAdded
                        ? <Ionicons name="checkmark-circle" size={20} color="#30D158" />
                        : addingId === lecturer.uid
                          ? <ActivityIndicator size="small" color={t.textMuted} />
                          : <Ionicons name="add-circle-outline" size={20} color={t.textMuted} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.membersList}>
            {/* Lecturers section */}
            <Text style={[styles.sectionHeader, { color: t.textMuted }]}>
              LECTURERS ({lecturers.length})
            </Text>
            {lecturers.length === 0
              ? <Text style={[styles.emptySection, { color: t.textMuted }]}>No lecturers added yet.</Text>
              : lecturers.map((m) => (
                <View key={m.uid} style={[styles.memberRow, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                  <View style={styles.flex1}>
                    <Text style={[styles.memberName, { color: t.text }]}>{m.displayName || 'Lecturer'}</Text>
                    <Text style={[styles.memberSub, { color: t.textSub }]}>{m.staffId || ''}</Text>
                  </View>
                  <View style={styles.lecturerBadge}>
                    <Text style={styles.lecturerBadgeText}>Lecturer</Text>
                  </View>
                </View>
              ))}

            {/* Students section */}
            <Text style={[styles.sectionHeader, { color: t.textMuted, marginTop: 20 }]}>
              STUDENTS ({students.length})
            </Text>
            {students.length === 0
              ? <Text style={[styles.emptySection, { color: t.textMuted }]}>No students enrolled yet.</Text>
              : students.map((m) => (
                <View key={m.uid} style={[styles.memberRow, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                  <View style={styles.flex1}>
                    <Text style={[styles.memberName, { color: t.text }]}>{m.displayName || 'Student'}</Text>
                    <Text style={[styles.memberSub, { color: t.textSub }]}>{m.matricNumber || ''}</Text>
                  </View>
                  <View style={[styles.studentBadge, { backgroundColor: t.bgElevated, borderColor: t.border }]}>
                    <Text style={[styles.studentBadgeText, { color: t.textSub }]} numberOfLines={1}>
                      {m.role ? m.role.charAt(0).toUpperCase() + m.role.slice(1) : 'Student'}
                    </Text>
                  </View>
                </View>
              ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // No-room state
  noRoomIconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  noRoomTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 8,
  },
  noRoomDesc: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  ctaBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ctaBtnText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // Header
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerRoomName: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.3,
    marginRight: 12,
  },
  statusBadge: {
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textTransform: 'capitalize',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabPillText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // Notices empty
  emptyNotices: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyNoticesText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // Members — search
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  searchBar: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  searchDropdown: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultName: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  resultSub: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 1,
  },

  // Members list
  membersList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  emptySection: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginBottom: 12,
  },
  memberRow: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  memberSub: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 2,
  },

  // Lecturer badge
  lecturerBadge: {
    backgroundColor: '#A855F718',
    borderWidth: 1,
    borderColor: '#A855F730',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lecturerBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#A855F7',
  },

  // Student badge
  studentBadge: {
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  studentBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
