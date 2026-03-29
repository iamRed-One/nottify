import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function RepHomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { theme: t, isDark, toggleTheme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const semester = currentMonth <= 6 ? 1 : 2;
  const roomId = user?.department && user?.level
    ? `${user.department}_${user.level}L_${currentYear}_SEM${semester}`
    : null;

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'R';

  return (
    <View style={[styles.flex1, { backgroundColor: t.bg }]}>
      <StatusBar style={t.statusBar} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.bg, borderBottomColor: t.border }]}>
        <View style={styles.flex1}>
          <Text style={[styles.headerTitle, { color: t.text }]}>Course Rep</Text>
          <Text style={[styles.headerSub, { color: t.textSub }]}>
            {user?.department} · {user?.level ? `${user.level} Level` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => setSidebarVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Action cards */}
      <View style={styles.cardsContainer}>
        {/* Manage Room — primary filled card */}
        <TouchableOpacity
          style={[styles.primaryCard, { backgroundColor: t.btnPrimaryBg }]}
          onPress={() => navigation.navigate('ManageRoom')}
          activeOpacity={0.85}
        >
          <View style={styles.primaryIconBox}>
            <Ionicons name="albums-outline" size={22} color="#fff" />
          </View>
          <View style={styles.cardBody}>
            <Text style={[styles.primaryCardTitle, { color: t.btnPrimaryText }]}>Manage Room</Text>
            <Text style={styles.primaryCardSub}>View notices, post updates</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>

        {/* Room Feed — secondary outlined card */}
        <TouchableOpacity
          style={[styles.secondaryCard, { backgroundColor: t.bgCard, borderColor: t.border }]}
          onPress={() => navigation.navigate('RoomFeed', { roomId })}
          activeOpacity={0.85}
        >
          <View style={[styles.secondaryIconBox, { backgroundColor: t.bgElevated, borderColor: t.border }]}>
            <Ionicons name="chatbubbles-outline" size={22} color={t.textSub} />
          </View>
          <View style={styles.cardBody}>
            <Text style={[styles.secondaryCardTitle, { color: t.text }]}>Room Feed</Text>
            <Text style={[styles.secondaryCardSub, { color: t.textSub }]}>View all room notices</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Sidebar */}
      <Modal
        visible={sidebarVisible}
        animationType="none"
        transparent
        onRequestClose={() => setSidebarVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: t.overlay }]}>
          <TouchableOpacity style={styles.flex1} activeOpacity={1} onPress={() => setSidebarVisible(false)} />
          <View style={[styles.sidebar, { backgroundColor: t.sidebarBg, borderLeftColor: t.border }]}>
            {/* Sidebar avatar + identity */}
            <View style={styles.sidebarProfile}>
              <View style={styles.sidebarAvatarCircle}>
                <Text style={styles.sidebarAvatarText}>{initials}</Text>
              </View>
              <Text style={[styles.sidebarName, { color: t.text }]}>{user?.displayName || 'Course Rep'}</Text>
              <Text style={[styles.sidebarEmail, { color: t.textSub }]}>{user?.email || ''}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Course Rep</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: t.border }]} />

            {/* Theme toggle */}
            <TouchableOpacity
              style={[styles.sidebarRow, { borderColor: t.border }]}
              activeOpacity={0.7}
              onPress={toggleTheme}
            >
              <View style={[styles.sidebarRowIconBox, { backgroundColor: t.bgElevated }]}>
                <Ionicons
                  name={isDark ? 'sunny-outline' : 'moon-outline'}
                  size={18}
                  color={t.textSub}
                />
              </View>
              <Text style={[styles.sidebarRowLabel, { color: t.text }]}>
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </Text>
            </TouchableOpacity>

            <View style={styles.flex1} />

            {/* Sign out */}
            <TouchableOpacity
              style={[styles.signOutRow, { backgroundColor: t.dangerBg, borderColor: t.danger + '30' }]}
              activeOpacity={0.7}
              onPress={() => { setSidebarVisible(false); signOut && signOut(); }}
            >
              <Ionicons name="log-out-outline" size={20} color={t.danger} />
              <Text style={[styles.signOutText, { color: t.danger }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },

  // Header
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 2,
  },
  avatarBtn: { padding: 2 },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F9731650',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#F97316',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // Cards
  cardsContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  primaryCard: {
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  primaryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  primaryCardTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.2,
  },
  primaryCardSub: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  secondaryCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  secondaryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCardTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.2,
  },
  secondaryCardSub: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 2,
  },

  // Sidebar / Modal
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 288,
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    paddingTop: 64,
    paddingBottom: 32,
    paddingHorizontal: 20,
    flexDirection: 'column',
    borderLeftWidth: 1,
  },
  sidebarProfile: {
    alignItems: 'center',
    marginBottom: 28,
  },
  sidebarAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F9731650',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sidebarAvatarText: {
    color: '#F97316',
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  sidebarName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
    textAlign: 'center',
  },
  sidebarEmail: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 3,
    textAlign: 'center',
  },
  roleBadge: {
    backgroundColor: '#F9731618',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#F97316',
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },

  // Theme toggle row
  sidebarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sidebarRowIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarRowLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  // Sign out
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
