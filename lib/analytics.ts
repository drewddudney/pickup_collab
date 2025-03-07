import { analytics } from './firebase';
import { Analytics, logEvent } from 'firebase/analytics';

export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (analytics) {
    logEvent(analytics as Analytics, eventName, eventParams);
  }
};

// Predefined events for consistency
export const AnalyticsEvents = {
  LOGIN: 'user_login',
  SIGNUP: 'user_signup',
  LOGIN_WITH_GOOGLE: 'login_with_google',
  VIEW_COURT: 'view_court',
  CREATE_GAME: 'create_game',
  JOIN_GAME: 'join_game',
  SEARCH_COURTS: 'search_courts',
} as const; 