import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AUDIENCE, ROLE } from '../../theme';
import NoticeCard from '../../components/NoticeCard';
import { StatusBar } from 'expo-status-bar';

const STUDENT_COLOR = ROLE.student.color; // '#3B82F6'

export default function StudentHomeScreen() {
  const { user, signOut } = useAuth();
  const { theme: t, isDark, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('announcements');
  const [broadcasts, setBroadcasts] = useState([]);
  const [notices, setNotices] = useState([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(true);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const semester = currentMonth <= 6 ? 1 : 2;
  const roomId =
    user?.department && user?.level
      ? `${user.department}_${user.level}L_${currentYear}_SEM${semester}`
      : null;

  // Global broadcasts
  useEffect(() => {
    const q = query(
      collection(db, 'broadcasts'),
      where('audience', 'in', ['all_students', 'all']),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(
      q,
      (snap) => {
        setBroadcasts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setBroadcastsLoading(false);
      },
      (err) => {
        console.error('StudentHome broadcasts:', err);
        setBroadcastsLoading(false);
      }
    );
  }, []);

  // Room notices
  useEffect(() => {
    if (!roomId) {
      setNoticesLoading(false);
      return;
    }
    const q = query(
      collection(db, 'rooms', roomId, 'notices'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(
      q,
      (snap) => {
        setNotices(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setNoticesLoading(false);
      },
      (err) => {
        console.error('StudentHome notices:', err);
        setNoticesLoading(false);
      }
    );
  }, [roomId]);

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'S';

  const firstName = user?.displayName?.split(' ')[0] || 'Student';

  function renderBroadcast({ item }) {
    const audienceData = AUDIENCE[item.audience] ?? { color: '#6B7280', label: item.audience };
    const accentColor = audienceData.color;
    const shadow = isDark
      ? {}
      : {
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        };

    return (
      <View
        style={[
          {
            flexDirection: 'row',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.bgCard,
            marginBottom: 12,
            overflow: 'hidden',
          },
          shadow,
        ]}
      >
        {/* Left accent bar */}
        <View style={{ width: 3, backgroundColor: accentColor }} />

        {/* Content */}
        <View style={{ flex: 1, padding: 14 }}>
          {/* Title */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: t.text,
              marginBottom: 4,
              fontFamily: 'PlusJakartaSans_700Bold',
            }}
          >
            {item.title}
          </Text>

          {/* Body */}
          <Text
            style={{
              fontSize: 13,
              color: t.textSub,
              lineHeight: 19,
              fontFamily: 'PlusJakartaSans_400Regular',
            }}
          >
            {item.body}
          </Text>

          {/* Meta row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: t.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {/* Dot */}
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: accentColor,
                }}
              />
              <Text
                style={{
                  fontSize: 11,
                  color: accentColor,
                  fontWeight: '600',
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                }}
              >
                {audienceData.label}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: t.textSub,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                }}
              >
                {item.postedByName || 'Admin'}
                {item.postedByRole ? ` · ${item.postedByRole}` : ''}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: t.textMuted,
                  fontFamily: 'PlusJakartaSans_400Regular',
                }}
              >
                {formatTime(item.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.statusBar} />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: t.bg,
          paddingHorizontal: 20,
          paddingTop: 56,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '800',
              color: t.text,
              fontFamily: 'PlusJakartaSans_800ExtraBold',
            }}
          >
            Hello, {firstName}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: t.textSub,
              marginTop: 2,
              fontFamily: 'PlusJakartaSans_400Regular',
            }}
          >
            {user?.department}
            {user?.level ? ` · ${user.level} Level` : ''}
          </Text>
        </View>

        {/* Avatar button */}
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          activeOpacity={0.75}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${STUDENT_COLOR}33`,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
          }}
        >
          <Text
            style={{
              color: STUDENT_COLOR,
              fontSize: 14,
              fontWeight: '700',
              fontFamily: 'PlusJakartaSans_700Bold',
            }}
          >
            {initials}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab Bar ─────────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 20,
          paddingBottom: 12,
          gap: 8,
          backgroundColor: t.bg,
        }}
      >
        {[
          { key: 'announcements', label: 'Announcements' },
          { key: 'room', label: 'My Room' },
        ].map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              activeOpacity={0.75}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: isActive ? t.bgCard : 'transparent',
                borderWidth: isActive ? 1 : 0,
                borderColor: isActive ? t.border : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? t.text : t.textSub,
                  fontFamily: isActive
                    ? 'PlusJakartaSans_700Bold'
                    : 'PlusJakartaSans_500Medium',
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Announcements Tab ────────────────────────────────────────── */}
      {activeTab === 'announcements' &&
        (broadcastsLoading ? (
          <ActivityIndicator color={t.text} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={broadcasts}
            keyExtractor={(item) => item.id}
            renderItem={renderBroadcast}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 40,
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 64 }}>
                <Ionicons name="mail-outline" size={40} color={t.textMuted} style={{ marginBottom: 12 }} />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: t.text,
                    fontFamily: 'PlusJakartaSans_700Bold',
                    marginBottom: 4,
                  }}
                >
                  No announcements yet
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: t.textSub,
                    textAlign: 'center',
                    fontFamily: 'PlusJakartaSans_400Regular',
                  }}
                >
                  You'll be notified when something is posted.
                </Text>
              </View>
            }
          />
        ))}

      {/* ── My Room Tab ──────────────────────────────────────────────── */}
      {activeTab === 'room' &&
        (noticesLoading ? (
          <ActivityIndicator color={t.text} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={notices}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <NoticeCard notice={item} showMeta />}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 40,
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 64 }}>
                <Ionicons name="clipboard-outline" size={40} color={t.textMuted} style={{ marginBottom: 12 }} />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: t.text,
                    fontFamily: 'PlusJakartaSans_700Bold',
                    marginBottom: 4,
                  }}
                >
                  No room notices yet
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: t.textSub,
                    textAlign: 'center',
                    fontFamily: 'PlusJakartaSans_400Regular',
                  }}
                >
                  Notices from your course rep and lecturers will appear here.
                </Text>
              </View>
            }
          />
        ))}

      {/* ── Sidebar Modal ────────────────────────────────────────────── */}
      <Modal
        visible={sidebarVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSidebarVisible(false)}
      >
        {/* Overlay */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: t.overlay }}
          activeOpacity={1}
          onPress={() => setSidebarVisible(false)}
        />

        {/* Panel — positioned absolutely so it slides from right */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 288,
            backgroundColor: t.sidebarBg,
            borderLeftWidth: 1,
            borderLeftColor: t.border,
          }}
        >
          {/* Profile section */}
          <View
            style={{
              paddingTop: 60,
              paddingBottom: 20,
              paddingHorizontal: 24,
              borderBottomWidth: 1,
              borderBottomColor: t.border,
            }}
          >
            {/* Avatar */}
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: `${STUDENT_COLOR}50`,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: STUDENT_COLOR,
                  fontSize: 18,
                  fontWeight: '700',
                  fontFamily: 'PlusJakartaSans_700Bold',
                }}
              >
                {initials}
              </Text>
            </View>

            {/* Name */}
            <Text
              style={{
                color: t.text,
                fontSize: 15,
                fontWeight: '700',
                fontFamily: 'PlusJakartaSans_700Bold',
              }}
              numberOfLines={1}
            >
              {user?.displayName || 'Student'}
            </Text>

            {/* Email */}
            <Text
              style={{
                color: t.textSub,
                fontSize: 12,
                marginTop: 2,
                fontFamily: 'PlusJakartaSans_400Regular',
              }}
              numberOfLines={1}
            >
              {user?.email || ''}
            </Text>

            {/* Role badge */}
            <View
              style={{
                marginTop: 10,
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: `${STUDENT_COLOR}18`,
                borderWidth: 1,
                borderColor: `${STUDENT_COLOR}30`,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}
            >
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: STUDENT_COLOR,
                }}
              />
              <Text
                style={{
                  color: STUDENT_COLOR,
                  fontSize: 11,
                  fontWeight: '600',
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                }}
              >
                {ROLE.student.label}
              </Text>
            </View>
          </View>

          {/* Menu items */}
          <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 8 }}>
            <SidebarRow
              icon="person-outline"
              label="Profile"
              t={t}
              onPress={() => setSidebarVisible(false)}
            />
            <SidebarRow
              icon="notifications-outline"
              label="Notifications"
              t={t}
              onPress={() => setSidebarVisible(false)}
            />
            <SidebarRow
              icon="settings-outline"
              label="Settings"
              t={t}
              onPress={() => setSidebarVisible(false)}
            />

            {/* Theme toggle row */}
            <TouchableOpacity
              onPress={toggleTheme}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderRadius: 12,
                marginTop: 2,
              }}
            >
              <Ionicons
                name={isDark ? 'moon-outline' : 'sunny-outline'}
                size={18}
                color={t.textSub}
              />
              <Text
                style={{
                  flex: 1,
                  marginLeft: 12,
                  fontSize: 14,
                  color: t.text,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontWeight: '600',
                }}
              >
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
              {/* Toggle pill */}
              <View
                style={{
                  width: 42,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: isDark ? STUDENT_COLOR : t.bgElevated,
                  borderWidth: 1,
                  borderColor: isDark ? STUDENT_COLOR : t.border,
                  justifyContent: 'center',
                  paddingHorizontal: 3,
                  alignItems: isDark ? 'flex-end' : 'flex-start',
                }}
              >
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: isDark ? '#fff' : t.textMuted,
                  }}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Sign out */}
          <View
            style={{
              paddingHorizontal: 12,
              paddingBottom: 40,
              borderTopWidth: 1,
              borderTopColor: t.border,
              paddingTop: 8,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setSidebarVisible(false);
                signOut && signOut();
              }}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: t.dangerBg,
                marginTop: 8,
              }}
            >
              <Ionicons name="log-out-outline" size={18} color={t.danger} />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: t.dangerText,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                }}
              >
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Sidebar menu row ──────────────────────────────────────────────────────────
function SidebarRow({ icon, label, onPress, t }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 2,
      }}
    >
      <Ionicons name={icon} size={18} color={t.textSub} />
      <Text
        style={{
          marginLeft: 12,
          fontSize: 14,
          fontWeight: '600',
          color: t.text,
          fontFamily: 'PlusJakartaSans_600SemiBold',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
