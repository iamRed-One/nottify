import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // loading = true until we've fetched both auth state + Firestore profile
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: data.role ?? null,
            status: data.status ?? 'pending',
            department: data.department ?? null,
            level: data.level ?? null,
            displayName: data.displayName ?? firebaseUser.displayName ?? '',
            matricNumber: data.matricNumber ?? null,
            staffId: data.staffId ?? null,
            pushToken: data.pushToken ?? null,
          });
        } else {
          // Auth record exists but no Firestore profile yet (e.g. mid sign-up)
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: null,
            status: 'pending',
            department: null,
            level: null,
            displayName: firebaseUser.displayName ?? '',
            matricNumber: null,
            staffId: null,
            pushToken: null,
          });
        }
      } catch (err) {
        console.error('AuthContext: failed to fetch user profile', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  /**
   * Call this after updating the Firestore profile so context stays in sync
   * without waiting for the next onAuthStateChanged event.
   */
  async function refreshUser() {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;

    const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (userSnap.exists()) {
      const data = userSnap.data();
      setUser((prev) => ({
        ...prev,
        ...data,
        uid: firebaseUser.uid,
        email: firebaseUser.email,
      }));
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
