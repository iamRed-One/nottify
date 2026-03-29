import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';


export default function IDVerificationScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { theme: t } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState(null);
  const [status, setStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const cameraRef = useRef(null);

  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style={t.statusBar} />
        <ActivityIndicator color={t.text} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <StatusBar style={t.statusBar} />
        <View style={{
          width: 64, height: 64, borderRadius: 20,
          backgroundColor: t.bgElevated, borderWidth: 1, borderColor: t.border,
          alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}>
          <Ionicons name="camera-outline" size={28} color={t.textSub} />
        </View>
        <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: t.text, textAlign: 'center', marginBottom: 8 }}>
          Camera Required
        </Text>
        <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: t.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          Camera access is required to verify your student ID card.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          activeOpacity={0.85}
          style={{ backgroundColor: t.btnPrimaryBg, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 }}
        >
          <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: t.btnPrimaryText }}>
            Grant Camera Access
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

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

  async function uploadToCloudinary(imageUri) {
    const formData = new FormData();
    formData.append('file', { uri: imageUri, type: 'image/jpeg', name: 'id_card.jpg' });
    formData.append('upload_preset', 'idVerification');
    formData.append('cloud_name', 'dnsmvknml');

    const res = await fetch('https://api.cloudinary.com/v1_1/dnsmvknml/image/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');
    return data.secure_url;
  }

  async function verifyID() {
    if (!photoUri) return;
    setStatus('processing');
    setStatusMessage('Uploading ID photo…');
    try {
      const cloudUrl = await uploadToCloudinary(photoUri);
      setStatusMessage('Saving your details…');
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Not signed in');
      await updateDoc(doc(db, 'users', uid), { idCardImageUrl: cloudUrl, idVerified: true });
      setStatus('done');
      setStatusMessage('ID submitted! Your account is pending approval.');
      await refreshUser();
      setTimeout(() => navigation.replace('Login'), 2000);
    } catch (err) {
      console.error('IDVerification error:', err);
      setStatus('failed');
      setStatusMessage('Upload failed. Check your connection and try again.');
    }
  }

  function retry() { setPhotoUri(null); setStatus('idle'); setStatusMessage(''); }

  if (photoUri && status !== 'capturing') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: t.bg }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }}
      >
        <StatusBar style={t.statusBar} />
        <Text style={{ fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', color: t.text, marginBottom: 24 }}>
          Review & Verify
        </Text>

        <Image
          source={{ uri: photoUri }}
          style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 16, marginBottom: 20, backgroundColor: '#000' }}
          resizeMode="contain"
        />

        {status === 'processing' && (
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <ActivityIndicator color={t.text} style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: t.textSub, textAlign: 'center' }}>
              {statusMessage}
            </Text>
          </View>
        )}

        {status === 'done' && (
          <View style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 12,
            backgroundColor: t.successBg, borderRadius: 14, padding: 16, marginBottom: 16,
          }}>
            <Ionicons name="checkmark-circle-outline" size={20} color={t.successText} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: t.successText, lineHeight: 20 }}>
              {statusMessage}
            </Text>
          </View>
        )}

        {status === 'failed' && (
          <View style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 12,
            backgroundColor: t.dangerBg, borderRadius: 14, padding: 16, marginBottom: 16,
          }}>
            <Ionicons name="close-circle-outline" size={20} color={t.dangerText} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: t.dangerText, lineHeight: 20 }}>
              {statusMessage}
            </Text>
          </View>
        )}

        {status === 'idle' && (
          <TouchableOpacity
            onPress={verifyID}
            activeOpacity={0.85}
            style={{ backgroundColor: t.btnPrimaryBg, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 12 }}
          >
            <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: t.btnPrimaryText }}>Verify This Photo</Text>
          </TouchableOpacity>
        )}

        {(status === 'failed' || status === 'idle') && (
          <TouchableOpacity onPress={retry} style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: t.textSub }}>Retake Photo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32 }}>
      <StatusBar style={t.statusBar} />
      <Text style={{ fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', color: t.text, marginBottom: 6 }}>
        Verify Your ID
      </Text>
      <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: t.textSub, lineHeight: 22, marginBottom: 24 }}>
        Take a clear photo of your student ID card so we can confirm your matric number.
      </Text>

      <CameraView
        ref={cameraRef}
        facing="back"
        style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{
            width: '85%', aspectRatio: 1.586,
            borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
            borderRadius: 10, borderStyle: 'dashed',
          }} />
        </View>
      </CameraView>

      <TouchableOpacity
        onPress={takePhoto}
        disabled={status === 'capturing'}
        activeOpacity={0.85}
        style={{
          backgroundColor: t.btnPrimaryBg, borderRadius: 12, paddingVertical: 15,
          alignItems: 'center', marginBottom: 12, opacity: status === 'capturing' ? 0.5 : 1,
        }}
      >
        {status === 'capturing'
          ? <ActivityIndicator color={t.btnPrimaryText} />
          : <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: t.btnPrimaryText }}>Take Photo</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ alignItems: 'center', paddingVertical: 12 }}>
        <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: t.textMuted }}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}
