import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
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

  // ── Derive roomId from user's dept + level ───────────────────────────────
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed
  const semester = currentMonth <= 6 ? 1 : 2;
  const roomId = user?.department && user?.level
    ? `${user.department}_${user.level}L_${currentYear}_SEM${semester}`
    : null;

  // ── Fetch room doc ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    setRoomLoading(true);
    getDoc(doc(db, 'rooms', roomId))
      .then((snap) => setRoom(snap.exists() ? { id: snap.id, ...snap.data() } : null))
      .catch(console.error)
      .finally(() => setRoomLoading(false));
  }, [roomId]);

  // ── Real-time listener on notices subcollection ──────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const noticesQuery = query(
      collection(db, 'rooms', roomId, 'notices'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      noticesQuery,
      (snapshot) => {
        setNotices(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      },
      (err) => console.error('ManageRoom notices listener error:', err)
    );

    return unsubscribe; // cleanup on unmount
  }, [roomId]);

  // ── Create room if it doesn't exist yet ─────────────────────────────────
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

  // ── Post a notice (stub — wire up a modal in RepHomeScreen later) ────────
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

  // ── Render helpers ───────────────────────────────────────────────────────
  function renderNotice({ item }) {
    return (
      <NoticeCard
        notice={item}
        showMeta
        onPress={() => {/* future: expand to detail view */}}
      />
    );
  }

  function renderEmpty() {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>No notices yet. Post the first one!</Text>
      </View>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (roomLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // ── No room created yet ──────────────────────────────────────────────────
  if (!room) {
    return (
      <View style={styles.center}>
        <Text style={styles.noRoomTitle}>No active room</Text>
        <Text style={styles.noRoomBody}>
          Create a room for {user?.department} {user?.level} Level — {currentYear} Sem {semester}.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleCreateRoom}>
          <Text style={styles.buttonText}>Create Room + Auto-Enroll Students</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Room header */}
      <View style={styles.roomHeader}>
        <Text style={styles.roomName}>{room.name}</Text>
        <View style={[styles.statusBadge, room.status === 'active' ? styles.active : styles.archived]}>
          <Text style={styles.statusText}>{room.status}</Text>
        </View>
      </View>

      {/* Notice list */}
      <FlatList
        data={notices}
        keyExtractor={(item) => item.id}
        renderItem={renderNotice}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            Notices {notices.length > 0 ? `(${notices.length})` : ''}
          </Text>
        }
      />

      {/* Post notice FAB */}
      <TouchableOpacity
        style={[styles.fab, posting && styles.fabDisabled]}
        onPress={() => navigation.navigate('PostNotice', { roomId, onPost: handlePostNotice })}
        disabled={posting}
      >
        {posting
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.fabText}>+ Notice</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  roomName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 10 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  active: { backgroundColor: '#DCFCE7' },
  archived: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },
  list: { padding: 16, paddingBottom: 100 },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  noRoomTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  noRoomBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    backgroundColor: '#2563EB',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 14,
    shadowColor: '#2563EB',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabDisabled: { opacity: 0.6 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
