import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, ActivityIndicator,
  TouchableOpacity, Modal, KeyboardAvoidingView, ScrollView,
  TextInput, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  collection, doc, getDoc, query, orderBy, onSnapshot,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { postNotice } from '../../services/roomService';
import NoticeCard from '../../components/NoticeCard';

export default function RoomFeedScreen({ route }) {
  const { roomId } = route.params ?? {};
  const { user } = useAuth();
  const { theme: t, isDark } = useTheme();

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

  // ─── Not a member ────────────────────────────────────────────────────────────
  if (notMember) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <StatusBar style={t.statusBar} />
        <Ionicons name="lock-closed-outline" size={36} color={t.textMuted} />
        <Text style={{ marginTop: 16, fontSize: 15, fontWeight: '700', color: t.textSub, textAlign: 'center', letterSpacing: 0.1 }}>
          Not a member of this room
        </Text>
      </View>
    );
  }

  // ─── FAB shadow (light mode only) ────────────────────────────────────────────
  const fabShadow = !isDark
    ? {
        shadowColor: '#000000',
        shadowOpacity: 0.22,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }
    : {};

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.statusBar} />

      {loading ? (
        <ActivityIndicator color={t.text} style={{ marginTop: 80 }} />
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NoticeCard notice={item} showMeta />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 80 }}>
              <Ionicons name="document-text-outline" size={40} color={t.textMuted} />
              <Text style={{ marginTop: 14, fontSize: 14, color: t.textSub, textAlign: 'center', letterSpacing: 0.1 }}>
                No notices yet
              </Text>
            </View>
          }
        />
      )}

      {/* ─── FAB ─────────────────────────────────────────────────────────────── */}
      {canPost && (
        <TouchableOpacity
          onPress={() => { setTitle(''); setBody(''); setModalVisible(true); }}
          activeOpacity={0.82}
          style={[
            {
              position: 'absolute',
              bottom: 28,
              right: 20,
              backgroundColor: t.btnPrimaryBg,
              borderRadius: 28,
              paddingHorizontal: 20,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            },
            fabShadow,
          ]}
        >
          <Ionicons name="add" size={18} color={t.btnPrimaryText} />
          <Text style={{ color: t.btnPrimaryText, fontSize: 14, fontWeight: '700', letterSpacing: 0.2 }}>
            Notice
          </Text>
        </TouchableOpacity>
      )}

      {/* ─── Post Notice Modal (bottom sheet) ────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: t.overlay }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
          >
            <View
              style={{
                backgroundColor: t.sidebarBg,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: 40,
              }}
            >
              {/* Drag handle */}
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: t.border,
                  borderRadius: 100,
                  alignSelf: 'center',
                  marginBottom: 22,
                }}
              />

              {/* Title */}
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '800',
                  color: t.text,
                  marginBottom: 18,
                  letterSpacing: 0.1,
                }}
              >
                Post Notice
              </Text>

              {/* Title input */}
              <TextInput
                style={{
                  backgroundColor: t.inputBg,
                  borderWidth: 1,
                  borderColor: t.inputBorder,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 14,
                  color: t.inputText,
                  marginBottom: 12,
                }}
                placeholder="Title"
                placeholderTextColor={t.placeholder}
                value={title}
                onChangeText={setTitle}
              />

              {/* Body input */}
              <TextInput
                style={{
                  backgroundColor: t.inputBg,
                  borderWidth: 1,
                  borderColor: t.inputBorder,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 14,
                  color: t.inputText,
                  height: 110,
                  marginBottom: 20,
                  textAlignVertical: 'top',
                }}
                placeholder="Message…"
                placeholderTextColor={t.placeholder}
                multiline
                numberOfLines={4}
                value={body}
                onChangeText={setBody}
              />

              {/* Action row */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {/* Cancel */}
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    backgroundColor: t.btnSecondaryBg,
                    borderWidth: 1,
                    borderColor: t.btnSecondaryBorder,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: t.btnSecondaryText, letterSpacing: 0.1 }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                {/* Post */}
                <TouchableOpacity
                  onPress={handlePost}
                  disabled={posting}
                  activeOpacity={0.82}
                  style={{
                    flex: 2,
                    backgroundColor: t.btnPrimaryBg,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                    opacity: posting ? 0.5 : 1,
                  }}
                >
                  {posting
                    ? <ActivityIndicator color={t.btnPrimaryText} size="small" />
                    : <Text style={{ fontSize: 14, fontWeight: '700', color: t.btnPrimaryText, letterSpacing: 0.2 }}>Post</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
