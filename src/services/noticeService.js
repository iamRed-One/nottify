import { db } from '../config/firebase';
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

export async function getNotices(roomId) {
  const q = query(
    collection(db, 'notices'),
    where('roomId', '==', roomId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function postNotice(data) {
  return addDoc(collection(db, 'notices'), data);
}
