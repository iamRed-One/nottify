import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signUp } from '../../services/authService';
import { db } from '../../config/firebase';
import { parseMatric, inferLevel } from '../../utils/matricParser';

const ROLES = [
  { key: 'student',   label: 'Student',     icon: 'school-outline' },
  { key: 'courserep', label: 'Course Rep',   icon: 'ribbon-outline' },
  { key: 'lecturer',  label: 'Lecturer',    icon: 'briefcase-outline' },
  { key: 'dean',      label: 'Dean',        icon: 'shield-outline' },
];

export default function SignupScreen({ navigation }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [matricNumber, setMatricNumber] = useState('');
  const [staffId, setStaffId] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isStudent = role === 'student' || role === 'courserep';
  const isStaff = role === 'lecturer' || role === 'dean';

  async function handleSignup() {
    if (!displayName || !email || !password) {
      setError('Name, email, and password are required.');
      return;
    }
    if (isStudent && !matricNumber) {
      setError('Matric number is required for students and course reps.');
      return;
    }
    if (isStaff && !staffId) {
      setError('Staff ID is required for lecturers and deans.');
      return;
    }

    let parsed = null;
    if (isStudent) {
      parsed = parseMatric(matricNumber);
      if (!parsed) {
        setError('Invalid matric number format. Expected e.g. U23CS1019.');
        return;
      }
    }

    setError('');
    setLoading(true);
    try {
      const { user } = await signUp(email.trim(), password);

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email.trim().toLowerCase(),
        displayName: displayName.trim(),
        role,
        status: 'pending',
        department: parsed?.department ?? null,
        level: parsed ? inferLevel(parsed.year) : null,
        matricNumber: parsed?.raw ?? null,
        staffId: isStaff ? staffId.trim() : null,
        idCardImageUrl: null,
        pushToken: null,
        createdAt: serverTimestamp(),
      });

      navigation.replace('IDVerification');
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
          contentContainerClassName="px-6 pt-16 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand header */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 items-center justify-center mb-3">
              <Ionicons name="megaphone" size={32} color="#111827" />
            </View>
            <Text className="text-2xl font-jakarta-extra text-gray-900 mb-1">Nottify</Text>
            <Text className="text-sm font-jakarta text-gray-400">Create your account</Text>
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
              Join your university board
            </Text>

            {/* Error banner */}
            {error ? (
              <View className="flex-row items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">
                <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                <Text className="text-xs font-jakarta text-red-600 flex-1">{error}</Text>
              </View>
            ) : null}

            {/* Full name */}
            <View className="mb-3.5">
              <Text className="text-xs font-jakarta-semi text-gray-500 mb-1.5">Full name</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5">
                <Ionicons name="person-outline" size={16} color="#9CA3AF" style={{ marginRight: 9 }} />
                <TextInput
                  className="flex-1 text-sm text-gray-900 font-jakarta p-0"
                  placeholder="Your full name"
                  placeholderTextColor="#D1D5DB"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </View>
            </View>

            {/* Email */}
            <View className="mb-3.5">
              <Text className="text-xs font-jakarta-semi text-gray-500 mb-1.5">Email address</Text>
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

            {/* Password */}
            <View className="mb-3.5">
              <Text className="text-xs font-jakarta-semi text-gray-500 mb-1.5">Password</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5">
                <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" style={{ marginRight: 9 }} />
                <TextInput
                  className="flex-1 text-sm text-gray-900 font-jakarta p-0"
                  placeholder="Min. 6 characters"
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

            {/* Role selector */}
            <View className="mb-3.5">
              <Text className="text-xs font-jakarta-semi text-gray-500 mb-1.5">I am a…</Text>
              <View className="flex-row flex-wrap gap-2">
                {ROLES.map((r) => {
                  const active = role === r.key;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      className={`flex-row items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border ${
                        active
                          ? 'bg-gray-900 border-gray-900'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                      style={{ minWidth: '46%', flexGrow: 1 }}
                      onPress={() => setRole(r.key)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={r.icon}
                        size={15}
                        color={active ? '#fff' : '#6B7280'}
                      />
                      <Text
                        className={`text-xs font-jakarta-semi ${
                          active ? 'text-white' : 'text-gray-500'
                        }`}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Matric number — students & course reps */}
            {isStudent && (
              <View className="mb-3.5">
                <Text className="text-xs font-jakarta-semi text-gray-500 mb-1.5">
                  Matric number
                </Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5">
                  <Ionicons name="card-outline" size={16} color="#9CA3AF" style={{ marginRight: 9 }} />
                  <TextInput
                    className="flex-1 text-sm text-gray-900 font-jakarta p-0"
                    placeholder="e.g. U23CS1019"
                    placeholderTextColor="#D1D5DB"
                    autoCapitalize="characters"
                    value={matricNumber}
                    onChangeText={setMatricNumber}
                  />
                </View>
              </View>
            )}

            {/* Staff ID — lecturers & deans */}
            {isStaff && (
              <View className="mb-3.5">
                <Text className="text-xs font-jakarta-semi text-gray-500 mb-1.5">Staff ID</Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5">
                  <Ionicons name="id-card-outline" size={16} color="#9CA3AF" style={{ marginRight: 9 }} />
                  <TextInput
                    className="flex-1 text-sm text-gray-900 font-jakarta p-0"
                    placeholder="Your staff ID"
                    placeholderTextColor="#D1D5DB"
                    value={staffId}
                    onChangeText={setStaffId}
                  />
                </View>
              </View>
            )}

            {/* Submit button */}
            <TouchableOpacity
              className={`bg-gray-900 rounded-xl py-4 items-center mt-1.5 ${loading ? 'opacity-50' : ''}`}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-sm font-jakarta-bold">Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-5 gap-2.5">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="text-xs font-jakarta text-gray-400">or</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

            {/* Back to login */}
            <TouchableOpacity
              className="rounded-xl py-3.5 items-center border border-gray-200 bg-gray-50"
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text className="text-sm font-jakarta-semi text-gray-600">
                Already have an account?{' '}
                <Text className="text-gray-900 font-jakarta-bold">Sign in</Text>
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
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
