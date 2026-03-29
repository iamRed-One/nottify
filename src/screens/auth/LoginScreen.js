import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { signIn } from '../../services/authService';
import { useTheme } from '../../contexts/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { theme: t, isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <StatusBar style={t.statusBar} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: t.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 72, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Theme toggle */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={{
              position: 'absolute', top: 20, right: 24,
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: t.bgElevated, borderWidth: 1, borderColor: t.border,
              alignItems: 'center', justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={16} color={t.textSub} />
          </TouchableOpacity>

          {/* Brand */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 20,
              backgroundColor: t.bgElevated, borderWidth: 1, borderColor: t.border,
              alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            }}>
              <Ionicons name="megaphone" size={28} color={t.text} />
            </View>
            <Text style={{ fontSize: 26, fontFamily: 'PlusJakartaSans_800ExtraBold', color: t.text, marginBottom: 4 }}>
              Nottify
            </Text>
            <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: t.textSub }}>
              Welcome back
            </Text>
          </View>

          {/* Card */}
          <View style={{
            backgroundColor: t.bgCard, borderRadius: 20,
            borderWidth: 1, borderColor: t.border, padding: 24,
          }}>
            <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: t.textSub, marginBottom: 20 }}>
              Sign in to your account
            </Text>

            {/* Error */}
            {error ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: t.dangerBg, borderRadius: 12,
                paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
              }}>
                <Ionicons name="alert-circle-outline" size={14} color={t.dangerText} />
                <Text style={{ flex: 1, fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: t.dangerText }}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: t.textSub, marginBottom: 6 }}>
                Email address
              </Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder,
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
              }}>
                <Ionicons name="mail-outline" size={15} color={t.textMuted} style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 14, color: t.inputText, fontFamily: 'PlusJakartaSans_400Regular', padding: 0 }}
                  placeholder="you@university.edu.ng"
                  placeholderTextColor={t.placeholder}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: t.textSub, marginBottom: 6 }}>
                Password
              </Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder,
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
              }}>
                <Ionicons name="lock-closed-outline" size={15} color={t.textMuted} style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 14, color: t.inputText, fontFamily: 'PlusJakartaSans_400Regular', padding: 0 }}
                  placeholder="Enter your password"
                  placeholderTextColor={t.placeholder}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={{ paddingLeft: 10 }}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={15} color={t.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign in */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
              style={{
                backgroundColor: t.btnPrimaryBg, borderRadius: 12,
                paddingVertical: 15, alignItems: 'center',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading
                ? <ActivityIndicator color={t.btnPrimaryText} />
                : <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: t.btnPrimaryText }}>Sign In</Text>}
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
              <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', color: t.textMuted }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
            </View>

            {/* Sign up link */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Signup')}
              activeOpacity={0.85}
              style={{
                borderRadius: 12, paddingVertical: 14, alignItems: 'center',
                backgroundColor: t.btnSecondaryBg, borderWidth: 1, borderColor: t.btnSecondaryBorder,
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: t.btnSecondaryText }}>
                Don't have an account?{'  '}
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function friendlyError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
