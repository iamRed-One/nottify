import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { createWorker } from 'tesseract.js';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

const MATRIC_REGEX = /[A-Z]\d{2}[A-Z]{2}\d+/g;

export default function IDVerificationScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | capturing | processing | done | failed
  const [statusMessage, setStatusMessage] = useState('');
  const cameraRef = useRef(null);

  // ── Permission gate ──────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <StatusBar style="dark" />
        <ActivityIndicator color="#111827" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <StatusBar style="dark" />
        <View className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 items-center justify-center mb-5">
          <Ionicons name="camera-outline" size={28} color="#9CA3AF" />
        </View>
        <Text className="text-base text-gray-900 font-jakarta-bold mb-2 text-center">Camera Required</Text>
        <Text className="text-sm text-gray-400 font-jakarta text-center leading-6 mb-8">
          Camera access is required to verify your student ID card.
        </Text>
        <TouchableOpacity
          className="bg-gray-900 rounded-xl py-3.5 px-6 items-center"
          onPress={requestPermission}
          activeOpacity={0.85}
        >
          <Text className="text-white text-sm font-jakarta-bold">Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Take photo ───────────────────────────────────────────────────────────
  async function takePhoto() {
    if (!cameraRef.current) return;
    setStatus('capturing');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setPhotoUri(photo.uri);
      setStatus('idle');
    } catch {
      setStatus('idle');
      Alert.alert('Error', 'Could not capture photo. Try again.');
    }
  }

  // ── OCR + verify ─────────────────────────────────────────────────────────
  async function verifyID() {
    if (!photoUri) return;
    setStatus('processing');
    setStatusMessage('Reading your ID card…');

    let worker;
    try {
      worker = await createWorker('eng');
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const dataUri = `data:image/jpeg;base64,${base64}`;

      setStatusMessage('Extracting text…');
      const { data } = await worker.recognize(dataUri);
      const extracted = data.text.toUpperCase();

      setStatusMessage('Looking for matric number…');
      const matches = extracted.match(MATRIC_REGEX) ?? [];

      const found = matches.find(
        (m) => user?.matricNumber && m === user.matricNumber.toUpperCase()
      );

      if (found) {
        await markVerified(photoUri);
        setStatus('done');
        setStatusMessage('Identity verified!');
        await refreshUser();
        setTimeout(() => navigation.replace('Login'), 1500);
      } else {
        setStatus('failed');
        setStatusMessage(
          matches.length
            ? `Found ${matches.join(', ')} — doesn't match your registered matric number.`
            : 'No matric number detected. Make sure the card is clearly visible.'
        );
      }
    } catch (err) {
      console.error('IDVerification OCR error:', err);
      setStatus('failed');
      setStatusMessage('Something went wrong. Please try again.');
    } finally {
      if (worker) await worker.terminate();
    }
  }

  async function markVerified(imageUri) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid), {
      idCardImageUrl: imageUri,
      idVerified: true,
    });
  }

  function retry() {
    setPhotoUri(null);
    setStatus('idle');
    setStatusMessage('');
  }

  // ── Photo review state ───────────────────────────────────────────────────
  if (photoUri && status !== 'capturing') {
    return (
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }}>
        <StatusBar style="dark" />
        <Text className="text-2xl text-gray-900 font-jakarta-extra mb-6">Review & Verify</Text>

        <Image
          source={{ uri: photoUri }}
          style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 12, marginBottom: 20, backgroundColor: '#000' }}
          resizeMode="contain"
        />

        {status === 'processing' && (
          <View className="items-center mb-5">
            <ActivityIndicator color="#111827" style={{ marginBottom: 8 }} />
            <Text className="text-sm text-gray-500 font-jakarta text-center">{statusMessage}</Text>
          </View>
        )}

        {status === 'done' && (
          <View className="flex-row items-start gap-3 bg-green-50 rounded-xl p-4 mb-4">
            <Ionicons name="checkmark-circle-outline" size={20} color="#16A34A" style={{ marginTop: 1 }} />
            <Text className="flex-1 text-sm text-gray-700 font-jakarta leading-5">{statusMessage}</Text>
          </View>
        )}

        {status === 'failed' && (
          <View className="flex-row items-start gap-3 bg-red-50 rounded-xl p-4 mb-4">
            <Ionicons name="close-circle-outline" size={20} color="#DC2626" style={{ marginTop: 1 }} />
            <Text className="flex-1 text-sm text-gray-700 font-jakarta leading-5">{statusMessage}</Text>
          </View>
        )}

        {status === 'idle' && (
          <TouchableOpacity
            className="bg-gray-900 rounded-xl py-4 items-center mb-3"
            onPress={verifyID}
            activeOpacity={0.85}
          >
            <Text className="text-white text-sm font-jakarta-bold">Verify This Photo</Text>
          </TouchableOpacity>
        )}

        {(status === 'failed' || status === 'idle') && (
          <TouchableOpacity className="items-center py-3" onPress={retry}>
            <Text className="text-sm text-gray-500 font-jakarta-semi">Retake Photo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  // ── Camera view ──────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-white px-6 pt-16 pb-8">
      <StatusBar style="dark" />
      <Text className="text-2xl text-gray-900 font-jakarta-extra mb-2">Verify Your ID</Text>
      <Text className="text-sm text-gray-400 font-jakarta leading-6 mb-5">
        Take a clear photo of your student ID card so we can confirm your matric number.
      </Text>

      <CameraView
        ref={cameraRef}
        facing="back"
        style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}
      >
        <View className="flex-1 items-center justify-center">
          <View style={{ width: '85%', aspectRatio: 1.586, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 8, borderStyle: 'dashed' }} />
        </View>
      </CameraView>

      <TouchableOpacity
        className={`bg-gray-900 rounded-xl py-4 items-center mb-3 ${status === 'capturing' ? 'opacity-50' : ''}`}
        onPress={takePhoto}
        disabled={status === 'capturing'}
        activeOpacity={0.85}
      >
        {status === 'capturing'
          ? <ActivityIndicator color="#fff" />
          : <Text className="text-white text-sm font-jakarta-bold">Take Photo</Text>}
      </TouchableOpacity>

      <TouchableOpacity className="items-center py-3" onPress={() => navigation.navigate('Login')}>
        <Text className="text-sm text-gray-400 font-jakarta-semi">Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}
