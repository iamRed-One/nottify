import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signUp } from '../../services/authService';
import { db } from '../../config/firebase';
import { parseMatric, inferLevel } from '../../utils/matricParser';
import { useTheme } from '../../contexts/ThemeContext';
import { ROLE } from '../../theme';

const ROLES = [
  { key: 'student',   label: 'Student',    icon: 'school-outline' },
  { key: 'courserep', label: 'Course Rep',  icon: 'ribbon-outline' },
  { key: 'lecturer',  label: 'Lecturer',   icon: 'briefcase-outline' },
  { key: 'dean',      label: 'Dean',       icon: 'shield-outline' },
];

export default function SignupScreen({ navigation }) {
  const { theme: t, isDark, toggleTheme } = useTheme();
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
    if (!displayName || !email || !password) { setError('Name, email, and password are required.'); return; }
    if (isStudent && !matricNumber) { setError('Matric number is required for students and course reps.'); return; }
    if (isStaff && !staffId) { setError('Staff ID is required for lecturers and deans.'); return; }

    let parsed = null;
    if (isStudent) {
      parsed = parseMatric(matricNumber);
      if (!parsed) { setError('Invalid matric number format. Expected e.g. U23CS1019.'); return; }
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
      if (isStudent) {
        navigation.replace('IDVerification');
      } else {
        navigation.replace('Login');
      }
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  function Field({ label, icon, children }) {
    return (
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: t.textSub, marginBottom: 6 }}>
          {label}
        </Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder,
          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
        }}>
          <Ionicons name={icon} size={15} color={t.textMuted} style={{ marginRight: 10 }} />
          {children}
        </View>
      </View>
    );
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
          <View style={{ alignItems: 'center', marginBottom: 36 }}>
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
              Create your account
            </Text>
          </View>

          {/* Card */}
          <View style={{
            backgroundColor: t.bgCard, borderRadius: 20,
            borderWidth: 1, borderColor: t.border, padding: 24,
          }}>
            <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: t.textSub, marginBottom: 20 }}>
              Join your university board
            </Text>

            {/* Error */}
            {error ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: t.dangerBg, borderRadius: 12,
                paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
              }}>
                <Ionicons name="alert-circle-outline" size={14} color={t.dangerText} />
                <Text style={{ flex: 1, fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: t.dangerText }}>{error}</Text>
              </View>
            ) : null}

            {/* Full name */}
            <Field label="Full name" icon="person-outline">
              <TextInput
                style={{ flex: 1, fontSize: 14, color: t.inputText, fontFamily: 'PlusJakartaSans_400Regular', padding: 0 }}
                placeholder="Your full name"
                placeholderTextColor={t.placeholder}
                value={displayName}
                onChangeText={setDisplayName}
              />
            </Field>

            {/* Email */}
            <Field label="Email address" icon="mail-outline">
              <TextInput
                style={{ flex: 1, fontSize: 14, color: t.inputText, fontFamily: 'PlusJakartaSans_400Regular', padding: 0 }}
                placeholder="you@university.edu.ng"
                placeholderTextColor={t.placeholder}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </Field>

            {/* Password */}
            <View style={{ marginBottom: 14 }}>
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
                  placeholder="Min. 6 characters"
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

            {/* Role selector */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: t.textSub, marginBottom: 8 }}>
                I am a…
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {ROLES.map((r) => {
                  const active = role === r.key;
                  const roleColor = ROLE[r.key]?.color ?? '#888';
                  return (
                    <TouchableOpacity
                      key={r.key}
                      onPress={() => setRole(r.key)}
                      activeOpacity={0.8}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingHorizontal: 12, paddingVertical: 10,
                        borderRadius: 12, minWidth: '46%', flexGrow: 1,
                        backgroundColor: active ? `${roleColor}18` : t.inputBg,
                        borderWidth: 1,
                        borderColor: active ? `${roleColor}50` : t.inputBorder,
                      }}
                    >
                      <Ionicons name={r.icon} size={14} color={active ? roleColor : t.textMuted} />
                      <Text style={{
                        fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold',
                        color: active ? roleColor : t.textSub,
                      }}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Matric number */}
            {isStudent && (
              <Field label="Matric number" icon="card-outline">
                <TextInput
                  style={{ flex: 1, fontSize: 14, color: t.inputText, fontFamily: 'PlusJakartaSans_400Regular', padding: 0 }}
                  placeholder="e.g. U23CS1019"
                  placeholderTextColor={t.placeholder}
                  autoCapitalize="characters"
                  value={matricNumber}
                  onChangeText={setMatricNumber}
                />
              </Field>
            )}

            {/* Staff ID */}
            {isStaff && (
              <Field label="Staff ID" icon="id-card-outline">
                <TextInput
                  style={{ flex: 1, fontSize: 14, color: t.inputText, fontFamily: 'PlusJakartaSans_400Regular', padding: 0 }}
                  placeholder="Your staff ID"
                  placeholderTextColor={t.placeholder}
                  value={staffId}
                  onChangeText={setStaffId}
                />
              </Field>
            )}

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.85}
              style={{
                backgroundColor: t.btnPrimaryBg, borderRadius: 12,
                paddingVertical: 15, alignItems: 'center',
                opacity: loading ? 0.5 : 1, marginTop: 4,
              }}
            >
              {loading
                ? <ActivityIndicator color={t.btnPrimaryText} />
                : <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: t.btnPrimaryText }}>Create Account</Text>}
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
              <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', color: t.textMuted }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
              style={{
                borderRadius: 12, paddingVertical: 14, alignItems: 'center',
                backgroundColor: t.btnSecondaryBg, borderWidth: 1, borderColor: t.btnSecondaryBorder,
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: t.btnSecondaryText }}>
                Already have an account?{'  '}
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>Sign in</Text>
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
    case 'auth/email-already-in-use': return 'An account with this email already exists.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/network-request-failed': return 'Network error. Check your connection.';
    default: return 'Something went wrong. Please try again.';
  }
}
