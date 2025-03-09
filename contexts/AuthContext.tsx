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
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Loading } from '@/components/ui/loading';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface ProfileUpdateOptions {
  displayName?: string;
  photoURL?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authInitialized: boolean;
  isAuthenticating: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  updateUserProfile: (options: ProfileUpdateOptions) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
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
  return <Loading fullScreen />;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check for corrupted auth state in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Try to access localStorage - this can throw in some browsers with privacy settings
        const localStorageAvailable = (() => {
          try {
            const testKey = '__test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
          } catch (e) {
            return false;
          }
        })();

        if (localStorageAvailable) {
          // Check for corrupted Firebase auth data
          const firebaseLocalStorageKeys = Object.keys(localStorage).filter(
            key => key.startsWith('firebase:') || key.includes('firebase')
          );
          
          for (const key of firebaseLocalStorageKeys) {
            try {
              // Try to parse the JSON data
              const data = localStorage.getItem(key);
              if (data) JSON.parse(data);
            } catch (error) {
              console.error(`Corrupted auth data found in localStorage key: ${key}`, error);
              // Clear the corrupted data
              localStorage.removeItem(key);
              setAuthError('Corrupted authentication data detected and cleared. Please refresh the page.');
            }
          }
        }
      } catch (error) {
        console.error('Error checking localStorage:', error);
      }
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    console.log('Setting up auth state listener');
    let isMounted = true;

    try {
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
            // Handle token refresh errors gracefully
            if (error instanceof Error) {
              setAuthError(`Authentication error: ${error.message}. Please try logging in again.`);
            }
          }
        }
        
        setUser(user);
        setLoading(false);
        setAuthInitialized(true);
      }, (error) => {
        // This is the error handler for onAuthStateChanged
        console.error('Auth state change error:', error);
        setAuthError('Authentication error. Please refresh and try again.');
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
    } catch (error) {
      console.error('Error setting up auth state listener:', error);
      setAuthError('Failed to initialize authentication. Please refresh the page.');
      setLoading(false);
      setAuthInitialized(true);
      return () => {};
    }
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
          profilePicture: user.photoURL,
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          authProvider: 'google'
        });
      } else {
        // Existing user - update last login
        await setDoc(userRef, { 
          lastLoginAt: Date.now(),
          profilePicture: user.photoURL || userDoc.data().profilePicture
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
      await firebaseUpdateProfile(result.user, {
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
  
  const updateUserProfile = async (options: ProfileUpdateOptions) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Update Firebase Auth profile
      await firebaseUpdateProfile(user, options);
      
      // Force a token refresh to update the user object
      await user.getIdToken(true);
      
      // Update Firestore profile
      const userRef = doc(db, 'users', user.uid);
      const updateData: Record<string, any> = {};
      
      if (options.displayName) {
        const nameParts = options.displayName.split(' ');
        updateData.firstName = nameParts[0] || '';
        updateData.lastName = nameParts.slice(1).join(' ') || '';
      }
      
      if (options.photoURL) {
        updateData.profilePicture = options.photoURL;
      }
      
      await setDoc(userRef, updateData, { merge: true });
      
      // Update local user state to reflect changes
      setUser({ ...user });
      
      console.log('User profile updated successfully');
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

  // Add a function to refresh the user data
  const refreshUser = async () => {
    if (!auth.currentUser) return;
    
    try {
      // Don't force a token refresh every time - this is causing quota exceeded errors
      // Only update the user state with the current user data
      setUser({ ...auth.currentUser });
      
      console.log("User data refreshed");
    } catch (error) {
      console.error("Error refreshing user data:", error);
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
    refreshUser,
  };

  // Show error message if auth initialization failed
  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-4">Authentication Error</h2>
        <p className="mb-4">{authError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  // Show loading state during auth initialization
  if (!authInitialized) {
    return <AuthLoader />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
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