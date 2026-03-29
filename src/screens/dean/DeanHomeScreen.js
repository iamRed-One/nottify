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
import { AUDIENCE } from '../../theme';

const DEAN_COLOR = '#06B6D4';

export default function DeanHomeScreen() {
  const { user, signOut } = useAuth();
  const { theme: t, isDark, toggleTheme } = useTheme();

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
    const aud = AUDIENCE[item.audience] ?? { color: '#888888', label: item.audience };
    return (
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: t.bgCard,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 12,
        }}
      >
        {/* Left accent bar */}
        <View style={{ width: 3, backgroundColor: aud.color }} />

        {/* Content */}
        <View style={{ flex: 1, padding: 14 }}>
          {/* Title row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: t.text, lineHeight: 20 }}>
              {item.title}
            </Text>
          </View>

          {/* Body */}
          <Text style={{ fontSize: 13, color: t.textSub, lineHeight: 19 }}>{item.body}</Text>

          {/* Meta row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}>
            {/* Colored dot + audience label */}
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: aud.color }} />
            <Text style={{ fontSize: 11, color: t.textSub, fontWeight: '500' }}>{aud.label}</Text>
            <Text style={{ fontSize: 11, color: t.textMuted, marginLeft: 2 }}>·</Text>
            <Text style={{ fontSize: 11, color: t.textSub, flex: 1 }}>{item.postedByName || 'Dean'}</Text>
            <Text style={{ fontSize: 11, color: t.textMuted }}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.statusBar} />

      {/* ── Header ─────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: t.bg,
          borderBottomWidth: 1,
          borderBottomColor: t.border,
          paddingHorizontal: 20,
          paddingTop: 56,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: t.text, letterSpacing: -0.5 }}>
            Dean Dashboard
          </Text>
          <Text style={{ fontSize: 13, color: t.textSub, marginTop: 2 }}>
            {user?.displayName ? `Welcome, ${user.displayName}` : 'Faculty of Sciences'}
          </Text>
        </View>

        {/* Avatar */}
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          activeOpacity={0.75}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${DEAN_COLOR}50`,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: DEAN_COLOR }}>
            {initials}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Action Cards ───────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
        {/* All Students — primary */}
        <TouchableOpacity
          onPress={() => openCompose('all_students')}
          activeOpacity={0.82}
          style={{
            flex: 1,
            backgroundColor: t.btnPrimaryBg,
            borderRadius: 16,
            padding: 14,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: `${t.btnPrimaryText}18`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Ionicons name="megaphone-outline" size={20} color={t.btnPrimaryText} />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: t.btnPrimaryText }}>
            All Students
          </Text>
          <Text style={{ fontSize: 11, color: `${t.btnPrimaryText}80`, marginTop: 2 }}>
            Broadcast to students
          </Text>
        </TouchableOpacity>

        {/* Staff Only — secondary */}
        <TouchableOpacity
          onPress={() => openCompose('staff_only')}
          activeOpacity={0.82}
          style={{
            flex: 1,
            backgroundColor: t.bgCard,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 16,
            padding: 14,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: `${t.textSub}14`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Ionicons name="people-outline" size={20} color={t.textSub} />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: t.text }}>
            Staff Only
          </Text>
          <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
            Broadcast to staff
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Section Label ──────────────────────────────────────── */}
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: t.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 12,
        }}
      >
        Recent Broadcasts
      </Text>

      {/* ── Feed ───────────────────────────────────────────────── */}
      {feedLoading ? (
        <ActivityIndicator color={t.text} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={broadcasts}
          keyExtractor={(item) => item.id}
          renderItem={renderBroadcast}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 64 }}>
              <Ionicons name="megaphone-outline" size={40} color={t.textMuted} style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 14, color: t.textSub, textAlign: 'center' }}>
                No broadcasts yet.
              </Text>
            </View>
          }
        />
      )}

      {/* ── Compose Modal (Bottom Sheet) ───────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: t.overlay }}
          behavior="padding"
        >
          <ScrollView
            scrollEnabled={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }}
          >
            <View
              style={{
                backgroundColor: t.sidebarBg,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
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
                  borderRadius: 2,
                  backgroundColor: t.border,
                  alignSelf: 'center',
                  marginBottom: 20,
                }}
              />

              <Text style={{ fontSize: 17, fontWeight: '800', color: t.text, marginBottom: 16, letterSpacing: -0.3 }}>
                New Broadcast
              </Text>

              {/* Audience Chips */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {Object.entries(AUDIENCE).map(([key, aud]) => {
                  const isActive = audience === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setAudience(key)}
                      activeOpacity={0.75}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        alignItems: 'center',
                        backgroundColor: isActive ? `${aud.color}18` : t.inputBg,
                        borderColor: isActive ? `${aud.color}50` : t.inputBorder,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: isActive ? aud.color : t.textSub,
                        }}
                      >
                        {aud.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Title Input */}
              <TextInput
                style={{
                  backgroundColor: t.inputBg,
                  borderWidth: 1,
                  borderColor: t.inputBorder,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  fontSize: 14,
                  color: t.inputText,
                  marginBottom: 10,
                }}
                placeholder="Title"
                placeholderTextColor={t.placeholder}
                value={title}
                onChangeText={setTitle}
              />

              {/* Body Input */}
              <TextInput
                style={{
                  backgroundColor: t.inputBg,
                  borderWidth: 1,
                  borderColor: t.inputBorder,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  fontSize: 14,
                  color: t.inputText,
                  height: 110,
                  marginBottom: 16,
                  textAlignVertical: 'top',
                }}
                placeholder="Message…"
                placeholderTextColor={t.placeholder}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={body}
                onChangeText={setBody}
              />

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    backgroundColor: t.btnSecondaryBg,
                    borderWidth: 1,
                    borderColor: t.btnSecondaryBorder,
                    borderRadius: 12,
                    paddingVertical: 13,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: t.btnSecondaryText }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePost}
                  disabled={posting}
                  activeOpacity={0.82}
                  style={{
                    flex: 2,
                    backgroundColor: t.btnPrimaryBg,
                    borderRadius: 12,
                    paddingVertical: 13,
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

      {/* ── Sidebar Modal ──────────────────────────────────────── */}
      <Modal visible={sidebarVisible} animationType="none" transparent onRequestClose={() => setSidebarVisible(false)}>
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: t.overlay }}>
          {/* Dismiss overlay */}
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSidebarVisible(false)} />

          {/* Sidebar Panel */}
          <View
            style={{
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
            }}
          >
            {/* User Info */}
            <View style={{ alignItems: 'center', marginBottom: 28 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: `${DEAN_COLOR}50`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: DEAN_COLOR }}>{initials}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: t.text, textAlign: 'center' }}>
                {user?.displayName || 'Dean'}
              </Text>
              <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 2, textAlign: 'center' }}>
                {user?.email || ''}
              </Text>
              <View
                style={{
                  backgroundColor: `${DEAN_COLOR}18`,
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  marginTop: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: DEAN_COLOR }}>Dean</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: t.border, marginBottom: 16 }} />

            {/* Menu Items */}
            <View style={{ flex: 1, gap: 2 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 12 }}
              >
                <Ionicons name="person-outline" size={20} color={t.textSub} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: t.text }}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 12 }}
              >
                <Ionicons name="notifications-outline" size={20} color={t.textSub} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: t.text }}>Notifications</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 12 }}
              >
                <Ionicons name="settings-outline" size={20} color={t.textSub} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: t.text }}>Settings</Text>
              </TouchableOpacity>

              {/* Theme Toggle */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 13,
                  borderRadius: 12,
                  gap: 12,
                }}
              >
                <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={20} color={t.textSub} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: t.text, flex: 1 }}>
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </Text>
                <TouchableOpacity
                  onPress={toggleTheme}
                  activeOpacity={0.8}
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: isDark ? DEAN_COLOR : t.border,
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                    alignItems: isDark ? 'flex-end' : 'flex-start',
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Out */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => { setSidebarVisible(false); signOut && signOut(); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 12,
                paddingVertical: 13,
                borderRadius: 12,
                backgroundColor: t.dangerBg,
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
