import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device.');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'f21bc151-6fb9-4d2f-93a8-4235fa47eda0',
  });
  return tokenData.data;
}

export async function syncPushToken() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const token = await registerForPushNotifications();
  if (!token) return;

  await updateDoc(doc(db, 'users', uid), { pushToken: token });
  return token;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendPushToTokens(tokens, title, body, data = {}) {
  const validTokens = tokens.filter((t) => t && t.startsWith('ExponentPushToken'));
  if (!validTokens.length) return;

  const messages = validTokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    data,
  }));

  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  await Promise.all(
    chunks.map((chunk) =>
      fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      })
    )
  );
}

export async function notifyRoomMembers(roomId, noticeTitle, noticeBody) {
  const membersSnap = await getDocs(collection(db, 'rooms', roomId, 'members'));
  const memberIds = membersSnap.docs.map((d) => d.data().userId);
  if (!memberIds.length) return;

  const tokenResults = await Promise.all(
    memberIds.map((uid) => getDoc(doc(db, 'users', uid)))
  );

  const tokens = tokenResults
    .filter((snap) => snap.exists())
    .map((snap) => snap.data().pushToken)
    .filter(Boolean);

  await sendPushToTokens(tokens, noticeTitle, noticeBody, { roomId });
}

export async function sendBroadcastPush(title, body, audience) {
  let roleFilter;
  if (audience === 'all_students') roleFilter = ['student', 'courserep'];
  else if (audience === 'staff_only') roleFilter = ['lecturer', 'dean'];
  else roleFilter = ['student', 'courserep', 'lecturer', 'dean'];

  const usersSnap = await getDocs(
    query(collection(db, 'users'), where('role', 'in', roleFilter), where('status', '==', 'active'))
  );

  const tokens = usersSnap.docs
    .map((d) => d.data().pushToken)
    .filter(Boolean);

  await sendPushToTokens(tokens, title, body, { audience });
}
