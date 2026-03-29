import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { signIn } from '../../services/authService';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // AuthContext listener will update user state — navigation handled in App.js
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerClassName="px-6 pt-20 pb-10 justify-center"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand header */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 items-center justify-center mb-3">
              <Ionicons name="megaphone" size={32} color="#111827" />
            </View>
            <Text className="text-2xl font-jakarta-extra text-gray-900 mb-1">Nottify</Text>
            <Text className="text-sm font-jakarta text-gray-400">Welcome back</Text>
          </View>

          {/* Form card */}
          <View
            className="bg-white rounded-2xl border border-gray-200 p-6"
            style={{
              shadowColor: '#111827',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <Text className="text-sm font-jakarta-semi text-gray-700 mb-5">
              Sign in to your account
            </Text>

            {/* Error banner */}
            {error ? (
              <View className="flex-row items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">
                <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                <Text className="text-xs font-jakarta text-red-600 flex-1">{error}</Text>
              </View>
            ) : null}

            {/* Email field */}
            <View className="mb-3.5">
              <Text className="text-xs font-jakarta-semi text-gray-500 mb-1.5">
                Email address
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5">
                <Ionicons name="mail-outline" size={16} color="#9CA3AF" style={{ marginRight: 9 }} />
                <TextInput
                  className="flex-1 text-sm text-gray-900 font-jakarta p-0"
                  placeholder="you@university.edu.ng"
                  placeholderTextColor="#D1D5DB"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password field */}
            <View className="mb-3.5">
              <Text className="text-xs font-jakarta-semi text-gray-500 mb-1.5">
                Password
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5">
                <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" style={{ marginRight: 9 }} />
                <TextInput
                  className="flex-1 text-sm text-gray-900 font-jakarta p-0"
                  placeholder="Enter your password"
                  placeholderTextColor="#D1D5DB"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(prev => !prev)}
                  className="pl-2.5 py-0.5"
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign in button */}
            <TouchableOpacity
              className={`bg-gray-900 rounded-xl py-4 items-center mt-1.5 ${loading ? 'opacity-50' : ''}`}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-sm font-jakarta-bold">Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-5 gap-2.5">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="text-xs font-jakarta text-gray-400">or</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

            {/* Sign up link */}
            <TouchableOpacity
              className="rounded-xl py-3.5 items-center border border-gray-200 bg-gray-50"
              onPress={() => navigation.navigate('Signup')}
              activeOpacity={0.85}
            >
              <Text className="text-sm font-jakarta-semi text-gray-600">
                Don't have an account?{' '}
                <Text className="text-gray-900 font-jakarta-bold">Sign up</Text>
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
