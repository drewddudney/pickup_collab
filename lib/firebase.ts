import { initializeApp, getApps } from 'firebase/app';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Base types
export interface BaseLocation {
  id?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  createdBy: string;
  createdAt: number;
  hasLights?: boolean;
  accessType: 'public' | 'membership' | 'paid' | 'private';
  hourlyRate?: number;
  venueType: 'indoor' | 'outdoor';
}

export interface SportLocation extends BaseLocation {
  courtCount: number;
}

// Collections will be:
// - locations/basketball/[locationId]
// - locations/tennis/[locationId]
// - locations/pickleball/[locationId]
// - locations/volleyball/[locationId]
// - locations/football/[locationId]

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  createdAt: number;
  profilePicture?: string | null;
  athleticAttributes?: {
    height?: string; // e.g., "6'2"
    weight?: string; // e.g., "185 lbs"
    position?: string;
    experience?: string;
    skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    preferredSports?: string[];
    availability?: {
      weekdays?: boolean;
      weekends?: boolean;
      evenings?: boolean;
      mornings?: boolean;
    };
    sportSpecific?: {
      [sportId: string]: {
        // Basketball
        height?: string;
        weight?: string;
        position?: string;
        
        // Tennis/Pickleball
        playStyle?: 'singles' | 'doubles' | 'both';
        handedness?: 'right' | 'left';
        
        // Volleyball
        verticalJump?: string;
        
        // Football
        fortyYardDash?: string;
        
        // Any other sport-specific attributes
        [key: string]: any;
      };
    };
  };
}

export interface Notification {
  id?: string;
  type: 'friend_request' | 'team_invite' | 'game_invite' | 'system';
  fromUserId: string;
  toUserId: string;
  message: string;
  read: boolean;
  createdAt: number;
  data?: {
    [key: string]: any;
  };
}

// Initialize Firebase if it hasn't been initialized
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
let analytics = null;

if (typeof window !== 'undefined') {
  isSupported().then(yes => {
    if (yes) {
      analytics = getAnalytics(app);
    }
  });
}

const auth = getAuth(app);
const db = getFirestore(app);

// Auth helper functions
export const sendPasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Database helper functions
export const getSportLocationsPath = (sportId: string) => `locations/${sportId}`;
export const getUserProfilePath = (userId: string) => `users/${userId}`;

export const FIREBASE_ERRORS = {
  'auth/email-already-in-use': 'An account with this email already exists',
  'auth/weak-password': 'Password should be at least 6 characters',
  'auth/user-not-found': 'No account exists with this email',
  'auth/wrong-password': 'Incorrect password',
} as const;

export { auth, db, analytics }; 