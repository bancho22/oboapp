"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  reauthenticateWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const reauthenticateWithGoogle = async () => {
    if (!user) {
      throw new Error("No user to reauthenticate");
    }
    try {
      const provider = new GoogleAuthProvider();
      const { reauthenticateWithPopup } = await import("firebase/auth");
      await reauthenticateWithPopup(user, provider);
    } catch (error) {
      console.error("Error reauthenticating with Google:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Unsubscribe from push notifications before signing out
      if (user) {
        try {
          const idToken = await user.getIdToken();
          const { unsubscribeOnSignOut } = await import(
            "./notification-service"
          );
          await unsubscribeOnSignOut(user.uid, idToken);
        } catch (notifError) {
          // Don't block sign-out if notification cleanup fails
          console.error("Error cleaning up notifications:", notifError);
        }
      }

      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      signInWithGoogle,
      reauthenticateWithGoogle,
      signOut,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
