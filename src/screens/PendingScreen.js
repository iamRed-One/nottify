import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { logOut } from '../services/authService';
import { useTheme } from '../contexts/ThemeContext';

export default function PendingScreen() {
  const { theme: t } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
      <StatusBar style={t.statusBar} />

      {/* Icon */}
      <View style={{
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border,
        alignItems: 'center', justifyContent: 'center', marginBottom: 24,
      }}>
        <Ionicons name="time-outline" size={36} color={t.textSub} />
      </View>

      {/* Pulsing dot row */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 24 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === 1 ? t.textSub : t.textMuted }} />
        ))}
      </View>

      <Text style={{
        fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold',
        color: t.text, textAlign: 'center', marginBottom: 10,
      }}>
        Account Pending
      </Text>
      <Text style={{
        fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular',
        color: t.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 36,
      }}>
        Your account is under review. You'll be notified once it's approved.
        Make sure you've uploaded your student ID card.
      </Text>

      <TouchableOpacity
        onPress={logOut}
        activeOpacity={0.85}
        style={{
          borderRadius: 12, paddingVertical: 13, paddingHorizontal: 32,
          backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border,
        }}
      >
        <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: t.textSub }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
