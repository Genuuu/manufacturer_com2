import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

export const googleProvider = new GoogleAuthProvider();
SCOPES.forEach(scope => googleProvider.addScope(scope));

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory only (never in localStorage or sessionStorage).
let cachedAccessToken: string | null = null;
const tokenListeners = new Set<(token: string | null) => void>();

function notifyTokenListeners(token: string | null) {
  tokenListeners.forEach(listener => listener(token));
}

export const subscribeAccessToken = (listener: (token: string | null) => void) => {
  tokenListeners.add(listener);
  listener(cachedAccessToken);
  return () => {
    tokenListeners.delete(listener);
  };
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  notifyTokenListeners(cachedAccessToken);
};

// Initialize auth state listener. Clears cached token when user signs out.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        notifyTokenListeners(null);
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      notifyTokenListeners(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    // Force consent/account selection if needed so spreadsheets scope is granted
    googleProvider.setCustomParameters({ prompt: 'consent' });
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    setCachedAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.warn('Firestore Error Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

export async function testFirestoreConnection() {
  return { connected: Boolean(firebaseConfig.projectId), projectId: firebaseConfig.projectId };
}

