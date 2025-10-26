import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';
import { User } from '../types';
import * as authService from '../services/authService';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from '../services/firebase';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void; // Kept for AuthPage to work
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Firebase's real-time auth listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in, fetch their role from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser({
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            role: userData.role
          });
        } else {
          // User exists in Auth but not in our 'users' collection.
          // This is an inconsistent state, so sign them out.
          await authService.logout();
          setCurrentUser(null);
        }
      } else {
        // User is signed out
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);


  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  const value = useMemo(() => ({
    currentUser,
    setCurrentUser, // This is still needed by the AuthPage after signup/login
    logout,
    isLoading
  }), [currentUser, isLoading]);

  if (isLoading) {
    // Render a loading screen while checking for user session
    return (
        <div className="min-h-screen bg-brand-gray flex justify-center items-center">
            <svg className="animate-spin h-10 w-10 text-brand-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};