import { db, auth } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { notifyRoomMembers } from './notificationService';

/**
 * Creates a new room with a unique-constraint check.
 * Room ID is deterministic: DEPT_LEVELl_YEAR_SEMn
 * Returns the roomId, or throws if it already exists.
 *
 * @param {string} dept       - e.g. "CS"
 * @param {number} level      - e.g. 300
 * @param {number} year       - e.g. 2025
 * @param {number} semester   - 1 or 2
 * @returns {Promise<string>} roomId
 */
export async function createRoom(dept, level, year, semester) {
  const roomId = `${dept}_${level}L_${year}_SEM${semester}`;
  const roomRef = doc(db, 'rooms', roomId);

  // Unique constraint check — Firestore has no native unique index, so we check manually
  const existing = await getDoc(roomRef);
  if (existing.exists()) {
    throw new Error(`Room "${roomId}" already exists.`);
  }

  await setDoc(roomRef, {
    id: roomId,
    name: `${dept} ${level} Level — ${year} Semester ${semester}`,
    department: dept,
    level,
    year,
    semester,
    createdBy: auth.currentUser?.uid ?? null,
    status: 'active',
    createdAt: serverTimestamp(),
  });

  return roomId;
}

/**
 * Auto-enrolls all active students whose dept and level match the room.
 * Skips students already in the members subcollection.
 *
 * @param {string} roomId
 * @param {string} dept   - e.g. "CS"
 * @param {number} level  - e.g. 300
 * @returns {Promise<number>} count of newly enrolled students
 */
export async function autoEnrollStudents(roomId, dept, level) {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) throw new Error(`Room "${roomId}" not found.`);

  const studentsQuery = query(
    collection(db, 'users'),
    where('role', 'in', ['student', 'courserep']),
    where('department', '==', dept),
    where('level', '==', level),
    where('status', '==', 'active')
  );

  const snapshot = await getDocs(studentsQuery);
  if (snapshot.empty) return 0;

  // Fetch existing members to avoid duplicate writes
  const membersSnap = await getDocs(collection(db, 'rooms', roomId, 'members'));
  const existingIds = new Set(membersSnap.docs.map((d) => d.id));

  const newStudents = snapshot.docs.filter((d) => !existingIds.has(d.id));

  await Promise.all(
    newStudents.map((d) =>
      setDoc(doc(db, 'rooms', roomId, 'members', d.id), {
        userId: d.id,
        role: d.data().role,
        addedAt: serverTimestamp(),
        addedBy: auth.currentUser?.uid ?? 'system',
      })
    )
  );

  return newStudents.length;
}

/**
 * Adds a single user to a room's members subcollection.
 * @param {string} roomId
 * @param {string} userId
 */
export async function addMemberToRoom(roomId, userId) {
  const userSnap = await getDoc(doc(db, 'users', userId));
  if (!userSnap.exists()) throw new Error(`User "${userId}" not found.`);

  const { role } = userSnap.data();
  await setDoc(doc(db, 'rooms', roomId, 'members', userId), {
    userId,
    role,
    addedAt: serverTimestamp(),
    addedBy: auth.currentUser?.uid ?? null,
  });
}

/**
 * Posts a notice to a room's notices subcollection.
 * @param {string} roomId
 * @param {string} title
 * @param {string} body
 * @param {string} [attachmentUrl]
 * @returns {Promise<string>} noticeId
 */
export async function postNotice(roomId, title, body, attachmentUrl = '') {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Must be signed in to post a notice.');

  const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
  const { displayName = '', role = '' } = userSnap.exists() ? userSnap.data() : {};

  const ref = await addDoc(collection(db, 'rooms', roomId, 'notices'), {
    title,
    body,
    postedBy: firebaseUser.uid,
    postedByName: displayName,
    postedByRole: role,
    attachmentUrl,
    createdAt: serverTimestamp(),
    readBy: [],
  });

  // Fire push notifications to all room members (non-blocking)
  notifyRoomMembers(roomId, title, body).catch(console.error);

  return ref.id;
}

/**
 * Marks a notice as read by the current user (idempotent).
 * @param {string} roomId
 * @param {string} noticeId
 */
export async function markNoticeRead(roomId, noticeId) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return;

  const noticeRef = doc(db, 'rooms', roomId, 'notices', noticeId);
  const snap = await getDoc(noticeRef);
  if (!snap.exists()) return;

  const { readBy = [] } = snap.data();
  if (readBy.includes(firebaseUser.uid)) return;

  await updateDoc(noticeRef, { readBy: [...readBy, firebaseUser.uid] });
}

/**
 * Returns the active room for a given dept + level + year + semester, or null.
 * @param {string} dept
 * @param {number} level
 * @param {number} year
 * @param {number} semester
 */
export async function findRoom(dept, level, year, semester) {
  const roomId = `${dept}_${level}L_${year}_SEM${semester}`;
  const snap = await getDoc(doc(db, 'rooms', roomId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Approves a pending student: sets status → active, adds to room members.
 * @param {string} roomId
 * @param {string} userId
 */
export async function approveStudent(roomId, userId) {
  await updateDoc(doc(db, 'users', userId), { status: 'active' });
  await setDoc(doc(db, 'rooms', roomId, 'members', userId), {
    userId,
    role: 'student',
    addedAt: serverTimestamp(),
    addedBy: auth.currentUser?.uid ?? null,
  });
}

/**
 * Rejects a pending student: sets status → rejected.
 * @param {string} userId
 */
export async function rejectStudent(userId) {
  await updateDoc(doc(db, 'users', userId), { status: 'rejected' });
}

/**
 * Returns all rooms the current user is a member of.
 * @param {string} userId
 */
export async function getRoomsForUser(userId) {
  const roomsSnap = await getDocs(collection(db, 'rooms'));
  const results = [];
  for (const roomDoc of roomsSnap.docs) {
    const memberSnap = await getDoc(doc(db, 'rooms', roomDoc.id, 'members', userId));
    if (memberSnap.exists()) {
      results.push({ id: roomDoc.id, ...roomDoc.data() });
    }
  }
  return results;
}
