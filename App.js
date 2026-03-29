import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { syncPushToken } from './src/services/notificationService';

// Auth screens
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import IDVerificationScreen from './src/screens/auth/IDVerificationScreen';

// Role screens
import StudentHomeScreen from './src/screens/student/StudentHomeScreen';
import RoomFeedScreen from './src/screens/student/RoomFeedScreen';
import LecturerHomeScreen from './src/screens/lecturer/LecturerHomeScreen';
import RepHomeScreen from './src/screens/courserep/RepHomeScreen';
import ManageRoomScreen from './src/screens/courserep/ManageRoomScreen';
import DeanHomeScreen from './src/screens/dean/DeanHomeScreen';

// Pending
import PendingScreen from './src/screens/PendingScreen';

const Stack = createStackNavigator();

// ─── Auth Stack ──────────────────────────────────────────────────────────────
function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="IDVerification" component={IDVerificationScreen} />
    </Stack.Navigator>
  );
}

// ─── Student Stack ───────────────────────────────────────────────────────────
function StudentNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen
        name="StudentHome"
        component={StudentHomeScreen}
        options={{ title: 'Home' }}
      />
      <Stack.Screen
        name="RoomFeed"
        component={RoomFeedScreen}
        options={{ title: 'Room' }}
      />
    </Stack.Navigator>
  );
}

// ─── Lecturer Stack ──────────────────────────────────────────────────────────
function LecturerNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen
        name="LecturerHome"
        component={LecturerHomeScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen
        name="RoomFeed"
        component={RoomFeedScreen}
        options={{ title: 'Room', headerShown: true }}
      />
    </Stack.Navigator>
  );
}

// ─── Course Rep Stack ────────────────────────────────────────────────────────
function RepNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen
        name="RepHome"
        component={RepHomeScreen}
        options={{ title: 'Home' }}
      />
      <Stack.Screen
        name="ManageRoom"
        component={ManageRoomScreen}
        options={{ title: 'Manage Room' }}
      />
      <Stack.Screen
        name="RoomFeed"
        component={RoomFeedScreen}
        options={{ title: 'Room', headerShown: true }}
      />
    </Stack.Navigator>
  );
}

// ─── Dean Stack ──────────────────────────────────────────────────────────────
function DeanNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen
        name="DeanHome"
        component={DeanHomeScreen}
        options={{ title: 'Dean Dashboard' }}
      />
    </Stack.Navigator>
  );
}

// ─── Root navigator — switches on auth + role ────────────────────────────────
function RootNavigator() {
  const { user, loading } = useAuth();
  const notificationListener = useRef();
  const responseListener = useRef();

  // Register push token whenever a user becomes active
  useEffect(() => {
    if (user?.status === 'active') {
      syncPushToken().catch(console.error);
    }
  }, [user?.uid, user?.status]);

  // Listen for incoming notifications while app is foregrounded
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        // Notification received while app is open — handled by setNotificationHandler above
        console.log('Notification received:', notification);
      }
    );

    // Handle tap on notification (app in background/killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { roomId } = response.notification.request.content.data ?? {};
        console.log('Notification tapped, roomId:', roomId);
        // TODO: navigate to the relevant room feed when navigation ref is wired up
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Not logged in
  if (!user) return <AuthNavigator />;

  // Logged in but awaiting approval
  if (user.status !== 'active') return <PendingScreen />;

  // Route by role
  switch (user.role) {
    case 'dean':
      return <DeanNavigator />;
    case 'lecturer':
      return <LecturerNavigator />;
    case 'courserep':
      return <RepNavigator />;
    case 'student':
    default:
      return <StudentNavigator />;
  }
}

// ─── App root ────────────────────────────────────────────────────────────────
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
