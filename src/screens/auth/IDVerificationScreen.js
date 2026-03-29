import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
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
      <View style={styles.center}>
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera access is required to verify your ID.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Access</Text>
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

      // Read the image as base64 for Tesseract
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
        // Short delay so user sees success state before navigating away
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
      idCardImageUrl: imageUri, // ideally upload to Storage first
      // status remains 'pending' — admin still needs to approve
      // but flag that OCR verification passed
      idVerified: true,
    });
  }

  // ── Retry ────────────────────────────────────────────────────────────────
  function retry() {
    setPhotoUri(null);
    setStatus('idle');
    setStatusMessage('');
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (photoUri && status !== 'capturing') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Review & Verify</Text>
        <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="contain" />

        {status === 'processing' && (
          <View style={styles.processingBox}>
            <ActivityIndicator color="#2563EB" style={{ marginBottom: 8 }} />
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        )}

        {status === 'done' && (
          <View style={[styles.resultBox, styles.successBox]}>
            <Text style={styles.resultIcon}>✓</Text>
            <Text style={styles.resultText}>{statusMessage}</Text>
          </View>
        )}

        {status === 'failed' && (
          <View style={[styles.resultBox, styles.failBox]}>
            <Text style={styles.resultIcon}>✗</Text>
            <Text style={styles.resultText}>{statusMessage}</Text>
          </View>
        )}

        {status === 'idle' && (
          <TouchableOpacity style={styles.button} onPress={verifyID}>
            <Text style={styles.buttonText}>Verify This Photo</Text>
          </TouchableOpacity>
        )}

        {(status === 'failed' || status === 'idle') && (
          <TouchableOpacity style={styles.secondaryButton} onPress={retry}>
            <Text style={styles.secondaryButtonText}>Retake Photo</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your ID</Text>
      <Text style={styles.subtitle}>
        Take a clear photo of your student ID card so we can confirm your matric number.
      </Text>

      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.cameraOverlay}>
          <View style={styles.idFrame} />
        </View>
      </CameraView>

      <TouchableOpacity
        style={[styles.button, status === 'capturing' && styles.buttonDisabled]}
        onPress={takePhoto}
        disabled={status === 'capturing'}
      >
        {status === 'capturing'
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Take Photo</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.secondaryButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 22,
  },
  permText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 20,
  },
  camera: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  cameraOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idFrame: {
    width: '85%',
    aspectRatio: 1.586, // standard ID card ratio
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#000',
  },
  processingBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  successBox: { backgroundColor: '#ECFDF5' },
  failBox: { backgroundColor: '#FEF2F2' },
  resultIcon: { fontSize: 18, marginTop: 1 },
  resultText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: { color: '#6B7280', fontSize: 14 },
});
