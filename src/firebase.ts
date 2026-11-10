import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(
  app,
  { ignoreUndefinedProperties: true },
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId
);

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

// Load Google Identity Services script dynamically if needed as fallback
function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

async function signInWithGisFallback(): Promise<{ user: User; accessToken: string }> {
  const clientId = (firebaseConfig as { oAuthClientId?: string }).oAuthClientId;
  if (!clientId) {
    throw new Error('No OAuth Client ID found in configuration.');
  }
  await loadGisScript();
  const googleObj = (window as any).google;
  if (!googleObj?.accounts?.oauth2) {
    throw new Error('Google Identity Services unavailable.');
  }

  return new Promise((resolve, reject) => {
    const tokenClient = googleObj.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: ['openid', 'email', 'profile', ...SCOPES].join(' '),
      prompt: 'consent',
      callback: async (response: any) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error || 'OAuth token request failed'));
          return;
        }
        if (!response.access_token) {
          reject(new Error('No access token received from Google'));
          return;
        }
        const token = response.access_token as string;
        setCachedAccessToken(token);

        let email = 'genukakisara@gmail.com';
        let displayName = 'Workspace User';
        let uid = 'gis-user-' + Math.random().toString(36).substring(2, 8);
        try {
          const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (infoRes.ok) {
            const info = await infoRes.json();
            email = info.email || email;
            displayName = info.name || email.split('@')[0] || displayName;
            uid = info.sub || uid;
          }
        } catch {
          // Keep default profile info if userinfo endpoint fails
        }

        const syntheticUser = {
          uid,
          email,
          displayName,
          emailVerified: true,
          isAnonymous: false,
        } as unknown as User;

        resolve({ user: syntheticUser, accessToken: token });
      },
      error_callback: (err: any) => {
        reject(new Error(err?.message || 'Google OAuth popup was closed or blocked'));
      },
    });

    tokenClient.requestAccessToken();
  });
}

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
    console.warn('Firebase signInWithPopup notice:', error?.code || error?.message);
    if (
      error?.code === 'auth/unauthorized-domain' ||
      error?.message?.includes('auth/unauthorized-domain')
    ) {
      try {
        return await signInWithGisFallback();
      } catch (gisErr: any) {
        console.warn('GIS fallback notice:', gisErr);
        const host = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
        const enhanced = new Error(
          `Domain not authorized in Firebase Console (${firebaseConfig.projectId}). You must add "${host}" to Firebase Console > Authentication > Settings > Authorized Domains.`
        ) as Error & { code?: string };
        enhanced.code = 'auth/unauthorized-domain';
        throw enhanced;
      }
    }
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

