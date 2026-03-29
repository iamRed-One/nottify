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
import { useTheme } from '../../contexts/ThemeContext';
import { sendBroadcastPush } from '../../services/notificationService';
import { getRoomsForUser } from '../../services/roomService';

const PURPLE = '#A855F7';

export default function LecturerHomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { theme: t, isDark, toggleTheme } = useTheme();

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
      <View style={{
        flexDirection: 'row',
        backgroundColor: t.bgCard,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
      }}>
        {/* Left accent bar */}
        <View style={{ width: 3, backgroundColor: PURPLE }} />

        <View style={{ flex: 1, padding: 16 }}>
          {/* Title row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: t.text, lineHeight: 20 }}>
              {item.title}
            </Text>
          </View>

          {/* Body */}
          <Text style={{ fontSize: 13, color: t.textSub, lineHeight: 19, marginBottom: 12 }}>
            {item.body}
          </Text>

          {/* Meta row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: PURPLE }} />
              <Text style={{ fontSize: 12, color: t.textSub, fontWeight: '600' }}>
                {item.postedByName || 'Staff'}
                <Text style={{ fontWeight: '400' }}> · {item.postedByRole}</Text>
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: t.textMuted }}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.statusBar} />

      {/* ── Header ── */}
      <View style={{
        backgroundColor: t.bg,
        borderBottomWidth: 1,
        borderBottomColor: t.border,
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 0,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
      }}>
        <View style={{ paddingBottom: 0 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: t.text, letterSpacing: -0.5 }}>
            Lecturer Dashboard
          </Text>
          <Text style={{ fontSize: 13, color: t.textSub, marginTop: 2, marginBottom: 14 }}>
            {user?.displayName ? `Dr. ${user.displayName}` : 'Welcome'}
          </Text>
        </View>

        {/* Avatar */}
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          activeOpacity={0.75}
          style={{ marginTop: 4 }}
        >
          <View style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: '#A855F750',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: PURPLE }}>{initials}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Tab Bar ── */}
      <View style={{
        backgroundColor: t.bg,
        borderBottomWidth: 1,
        borderBottomColor: t.border,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 0,
        flexDirection: 'row',
        gap: 8,
      }}>
        {[{ key: 'rooms', label: 'My Rooms' }, { key: 'broadcasts', label: 'Broadcasts' }].map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              activeOpacity={0.75}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginBottom: 10,
                backgroundColor: isActive ? t.bgCard : 'transparent',
                borderWidth: isActive ? 1 : 0,
                borderColor: isActive ? t.border : 'transparent',
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: isActive ? '700' : '500',
                color: isActive ? t.text : t.textSub,
              }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Rooms Tab ── */}
      {activeTab === 'rooms' && (
        roomsLoading
          ? <ActivityIndicator color={PURPLE} style={{ marginTop: 48 }} />
          : (
            <FlatList
              data={rooms}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 72 }}>
                  <Ionicons name="albums-outline" size={48} color={t.textMuted} style={{ marginBottom: 12 }} />
                  <Text style={{ fontSize: 14, color: t.textSub, textAlign: 'center', lineHeight: 20 }}>
                    You haven't been added to any rooms yet.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => navigation.navigate('RoomFeed', { roomId: item.id })}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: t.bgCard,
                    borderWidth: 1,
                    borderColor: t.border,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  {/* Icon box */}
                  <View style={{
                    width: 40,
                    height: 40,
                    backgroundColor: t.bgElevated,
                    borderWidth: 1,
                    borderColor: t.border,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}>
                    <Ionicons name="albums-outline" size={18} color={t.textSub} />
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: t.text, marginBottom: 3 }}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: t.textSub }}>
                      {item.department} · {item.level} Level · Sem {item.semester}
                    </Text>
                  </View>

                  {/* Status badge */}
                  <View style={{
                    backgroundColor: '#A855F718',
                    borderWidth: 1,
                    borderColor: '#A855F730',
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    marginRight: 10,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: PURPLE, textTransform: 'capitalize' }}>
                      {item.status}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
                </TouchableOpacity>
              )}
            />
          )
      )}

      {/* ── Broadcasts Tab ── */}
      {activeTab === 'broadcasts' && (
        <View style={{ flex: 1 }}>
          {/* Post button */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
            <TouchableOpacity
              onPress={() => { setTitle(''); setBody(''); setModalVisible(true); }}
              activeOpacity={0.85}
              style={{
                backgroundColor: t.btnPrimaryBg,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="megaphone-outline" size={16} color={t.btnPrimaryText} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: t.btnPrimaryText }}>
                Post Notice to Students
              </Text>
            </TouchableOpacity>
          </View>

          {feedLoading
            ? <ActivityIndicator color={PURPLE} style={{ marginTop: 40 }} />
            : (
              <FlatList
                data={broadcasts}
                keyExtractor={(item) => item.id}
                renderItem={renderBroadcast}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', marginTop: 72 }}>
                    <Ionicons name="megaphone-outline" size={48} color={t.textMuted} style={{ marginBottom: 12 }} />
                    <Text style={{ fontSize: 14, color: t.textSub, textAlign: 'center' }}>No broadcasts yet.</Text>
                  </View>
                }
              />
            )}

          {/* ── Post Notice Modal ── */}
          <Modal
            visible={modalVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setModalVisible(false)}
          >
            <KeyboardAvoidingView
              style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: t.overlay }}
              behavior="padding"
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                scrollEnabled={false}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
              >
                <View style={{
                  backgroundColor: t.sidebarBg,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingHorizontal: 24,
                  paddingTop: 16,
                  paddingBottom: 40,
                }}>
                  {/* Drag handle */}
                  <View style={{
                    width: 40,
                    height: 4,
                    backgroundColor: t.border,
                    borderRadius: 2,
                    alignSelf: 'center',
                    marginBottom: 20,
                  }} />

                  <Text style={{ fontSize: 17, fontWeight: '800', color: t.text, marginBottom: 20, letterSpacing: -0.3 }}>
                    New Notice — All Students
                  </Text>

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

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => setModalVisible(false)}
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
                      <Text style={{ fontSize: 14, fontWeight: '600', color: t.btnSecondaryText }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handlePost}
                      disabled={posting}
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
                        : <Text style={{ fontSize: 14, fontWeight: '700', color: t.btnPrimaryText }}>Post</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>
        </View>
      )}

      {/* ── Sidebar ── */}
      <Modal
        visible={sidebarVisible}
        animationType="none"
        transparent
        onRequestClose={() => setSidebarVisible(false)}
      >
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: t.overlay }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSidebarVisible(false)} />

          <View style={{
            width: 288,
            backgroundColor: t.sidebarBg,
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            paddingHorizontal: 20,
            paddingTop: 64,
            paddingBottom: 32,
            flexDirection: 'column',
          }}>
            {/* Profile block */}
            <View style={{ alignItems: 'center', marginBottom: 28 }}>
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#A855F750',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: PURPLE }}>{initials}</Text>
              </View>

              <Text style={{ fontSize: 15, fontWeight: '700', color: t.text, textAlign: 'center' }}>
                {user?.displayName || 'Lecturer'}
              </Text>
              <Text style={{ fontSize: 12, color: t.textSub, marginTop: 2, textAlign: 'center' }}>
                {user?.email || ''}
              </Text>

              {/* Role badge */}
              <View style={{
                backgroundColor: '#A855F718',
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 4,
                marginTop: 10,
              }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: PURPLE }}>Lecturer</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: t.border, marginBottom: 20 }} />

            {/* Theme toggle */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 14,
              marginBottom: 8,
            }}>
              <Ionicons
                name={isDark ? 'moon-outline' : 'sunny-outline'}
                size={18}
                color={t.textSub}
                style={{ marginRight: 12 }}
              />
              <Text style={{ flex: 1, fontSize: 14, color: t.text, fontWeight: '500' }}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
              <TouchableOpacity
                onPress={toggleTheme}
                activeOpacity={0.8}
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: isDark ? PURPLE : t.borderStrong,
                  justifyContent: 'center',
                  paddingHorizontal: 3,
                }}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: '#FFFFFF',
                  alignSelf: isDark ? 'flex-end' : 'flex-start',
                }} />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: t.border, marginBottom: 20 }} />

            {/* Sign out */}
            <TouchableOpacity
              onPress={() => { setSidebarVisible(false); signOut?.(); }}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 12,
                paddingVertical: 14,
                backgroundColor: t.dangerBg,
                borderRadius: 12,
                marginTop: 'auto',
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={t.danger} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: t.dangerText }}>Sign Out</Text>
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
