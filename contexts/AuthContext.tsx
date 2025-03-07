'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authInitialized: boolean;
  isAuthenticating: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  updateUserProfile: (firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  createdAt: number;
  lastLoginAt: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Loading component to show during auth initialization
function AuthLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Initialize auth state
  useEffect(() => {
    console.log('Setting up auth state listener');
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'No user');
      
      if (!isMounted) return;

      if (user) {
        try {
          await user.getIdToken(true);
          console.log('Auth token refreshed');
          
          // Update last login timestamp
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            await setDoc(userRef, { lastLoginAt: Date.now() }, { merge: true });
          }
        } catch (error) {
          console.error('Error refreshing auth token:', error);
        }
      }
      
      setUser(user);
      setLoading(false);
      setAuthInitialized(true);
    });

    // Handle the case where Firebase auth is slow to initialize
    const timeoutId = setTimeout(() => {
      if (isMounted && !authInitialized) {
        console.log('Auth initialization timeout - forcing initialized state');
        setAuthInitialized(true);
        setLoading(false);
      }
    }, 2000); // 2 second timeout

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [authInitialized]);

  // Periodically refresh token
  useEffect(() => {
    if (!user) return;

    const refreshToken = async () => {
      try {
        await user.getIdToken(true);
        console.log('Auth token refreshed periodically');
      } catch (error) {
        console.error('Error refreshing auth token:', error);
      }
    };

    const intervalId = setInterval(refreshToken, 30 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user]);

  const signInWithGoogle = async () => {
    setIsAuthenticating(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('Google sign in successful');
      
      // Force a token refresh
      await result.user.getIdToken(true);
      
      // Extract user info from Google profile
      const user = result.user;
      const displayName = user.displayName || '';
      const nameParts = displayName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const email = user.email || '';
      
      // Save user profile to Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // New user - create profile
        await setDoc(userRef, {
          firstName,
          lastName,
          email,
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          authProvider: 'google'
        });
      } else {
        // Existing user - update last login
        await setDoc(userRef, { 
          lastLoginAt: Date.now() 
        }, { merge: true });
      }
      
      setUser(user);
      return new Promise<void>((resolve) => {
        // Short delay to ensure auth state is updated before redirecting
        setTimeout(resolve, 500);
      });
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setIsAuthenticating(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Email sign in successful');
      
      // Force a token refresh
      await result.user.getIdToken(true);
      
      // Update last login timestamp
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(userRef, { 
        lastLoginAt: Date.now() 
      }, { merge: true });
      
      setUser(result.user);
      return new Promise<void>((resolve) => {
        // Short delay to ensure auth state is updated before redirecting
        setTimeout(resolve, 500);
      });
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, firstName: string, lastName: string) => {
    setIsAuthenticating(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Email sign up successful');
      
      // Update user profile with display name
      await updateProfile(result.user, {
        displayName: `${firstName} ${lastName}`
      });
      
      // Force a token refresh
      await result.user.getIdToken(true);
      
      // Save user profile to Firestore
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(userRef, {
        firstName,
        lastName,
        email,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        authProvider: 'email'
      });
      
      setUser(result.user);
      return new Promise<void>((resolve) => {
        // Short delay to ensure auth state is updated before redirecting
        setTimeout(resolve, 500);
      });
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };
  
  const updateUserProfile = async (firstName: string, lastName: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });
      
      // Update Firestore profile
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        firstName,
        lastName,
        updatedAt: Date.now()
      }, { merge: true });
      
      // Force refresh the user object
      setUser({ ...user });
      
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      // Force a reload after logout to ensure clean state
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    authInitialized,
    isAuthenticating,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    updateUserProfile,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {loading && !authInitialized && <AuthLoader />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 