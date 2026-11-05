import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import {
  Manufacturer,
  CommunicationEntry,
  AppUser,
  RolePermissions,
  UserRoleType,
  AuditLogItem,
  ManufacturerStatus,
} from '../types';
import {
  INITIAL_MANUFACTURERS,
  INITIAL_COMMUNICATIONS,
  INITIAL_USERS,
  DEFAULT_ROLE_PERMISSIONS,
  INITIAL_AUDIT_LOGS,
} from '../data/initialData';
import { testFirestoreConnection, auth, googleProvider, db, handleFirestoreError, OperationType } from '../firebase';

export type NavTab = 
  | 'overview'
  | 'communications'
  | 'manufacturers'
  | 'permissions';

interface AppContextType {
  manufacturers: Manufacturer[];
  communications: CommunicationEntry[];
  users: AppUser[];
  currentUser: AppUser;
  rolePermissions: Record<UserRoleType, RolePermissions>;
  auditLogs: AuditLogItem[];
  activeTab: NavTab;
  selectedManufacturerId: string;
  selectedThreadId: string | null;
  searchQuery: string;
  firebaseConnected: boolean;
  firebaseProjectId: string;
  isAuthenticated: boolean;
  
  setActiveTab: (tab: NavTab) => void;
  setSelectedManufacturerId: (id: string) => void;
  setSelectedThreadId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  switchUser: (userId: string) => void;
  
  loginWithUser: (user: AppUser) => void;
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  
  hasPermission: (permission: keyof RolePermissions) => boolean;
  
  // Manufacturers
  addManufacturer: (data: Omit<Manufacturer, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; message: string; id?: string };
  updateManufacturer: (id: string, data: Partial<Manufacturer>) => { success: boolean; message: string };
  toggleManufacturerStatus: (id: string, status: ManufacturerStatus) => { success: boolean; message: string };
  getNextManufacturerId: () => string;
  
  // Communications
  addCommunication: (data: Omit<CommunicationEntry, 'id' | 'createdAt' | 'createdBy' | 'entryKey'>) => { success: boolean; message: string; id?: string };
  updateCommunication: (id: string, data: Partial<CommunicationEntry>) => { success: boolean; message: string };
  deleteCommunication: (id: string) => { success: boolean; message: string };
  getNextThreadId: (mId?: string) => string;
  getThreadsForManufacturer: (mId: string) => string[];
  
  // Permissions & Users
  updateRolePermissions: (role: UserRoleType, permissions: RolePermissions) => { success: boolean; message: string };
  createUser: (userData: Omit<AppUser, 'id' | 'lastLogin'>) => { success: boolean; message: string; user?: AppUser };
  updateUser: (userId: string, data: Partial<AppUser>) => { success: boolean; message: string };
  toggleUserStatus: (userId: string) => { success: boolean; message: string };
  deleteUser: (userId: string) => { success: boolean; message: string };
  
  // Data Tools
  exportCsvData: () => string;
  importCsvData: (csvContent: string) => { success: boolean; count: { manufacturers: number; communications: number }; error?: string };
  resetDatabase: () => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  MANUFACTURERS: 'fabricateops_manufacturers_v1',
  COMMUNICATIONS: 'fabricateops_communications_v1',
  USERS: 'fabricateops_users_v1',
  CURRENT_USER: 'fabricateops_current_user_v1',
  PERMISSIONS: 'fabricateops_permissions_v1',
  AUDIT: 'fabricateops_audit_logs_v1',
  IS_AUTH: 'fabricateops_is_auth_v1',
};

const HARDCODED_USER_IDS = new Set(['usr-admin', 'usr-admin-gk', 'usr-1', 'usr-2', 'usr-3', 'usr-4']);
const HARDCODED_USER_EMAILS = new Set([
  'admin@company.com',
  's.jenkins@fabricateops.io',
  'm.chen@fabricateops.io',
  'd.kovacs@fabricateops.io',
  'e.rostova@fabricateops.io',
]);

function isHardcodedUser(u: Partial<AppUser> | null | undefined): boolean {
  if (!u) return true;
  if (u.id && HARDCODED_USER_IDS.has(u.id)) return true;
  if (u.email && HARDCODED_USER_EMAILS.has(u.email.toLowerCase())) return true;
  return false;
}

const FALLBACK_SESSION_USER: AppUser = {
  id: 'session-admin',
  name: 'Workspace Admin',
  email: '',
  role: 'admin',
  department: 'Procurement',
  avatar: 'WA',
  isActive: true,
  lastLogin: '',
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.IS_AUTH);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [manufacturers, setManufacturers] = useState<Manufacturer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MANUFACTURERS);
      return saved ? JSON.parse(saved) : INITIAL_MANUFACTURERS;
    } catch {
      return INITIAL_MANUFACTURERS;
    }
  });

  const [communications, setCommunications] = useState<CommunicationEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMMUNICATIONS);
      return saved ? JSON.parse(saved) : INITIAL_COMMUNICATIONS;
    } catch {
      return INITIAL_COMMUNICATIONS;
    }
  });

  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      if (saved) {
        const parsed: AppUser[] = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter(u => !isHardcodedUser(u)) : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!isHardcodedUser(parsed)) {
          return parsed;
        }
      }
      return FALLBACK_SESSION_USER;
    } catch {
      return FALLBACK_SESSION_USER;
    }
  });

  const [rolePermissions, setRolePermissions] = useState<Record<UserRoleType, RolePermissions>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PERMISSIONS);
      return saved ? JSON.parse(saved) : DEFAULT_ROLE_PERMISSIONS;
    } catch {
      return DEFAULT_ROLE_PERMISSIONS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIT);
      if (saved) {
        const parsed: AuditLogItem[] = JSON.parse(saved);
        return Array.isArray(parsed)
          ? parsed.filter(l => !HARDCODED_USER_IDS.has(l.userId) && !HARDCODED_USER_IDS.has(l.targetId || ''))
          : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Firebase state
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(true);
  const [firebaseProjectId, setFirebaseProjectId] = useState<string>('manufacturer-11fe2');

  useEffect(() => {
    testFirestoreConnection().then(res => {
      setFirebaseConnected(res.connected);
      if (res.projectId) setFirebaseProjectId(res.projectId);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, firebaseUser => {
      if (firebaseUser) {
        setIsAuthenticated(true);
        localStorage.setItem(STORAGE_KEYS.IS_AUTH, 'true');
      }
    });

    // Real-time Firestore Listeners — keep database records and sync any local unsynced records to Firestore
    let mInitialSync = false;
    const unsubManufacturers = onSnapshot(collection(db, 'manufacturers'), snapshot => {
      const remoteMap = new Map<string, Manufacturer>();
      snapshot.forEach(docSnap => {
        remoteMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Manufacturer);
      });

      setManufacturers(prev => {
        if (!mInitialSync) {
          mInitialSync = true;
          const merged = new Map<string, Manufacturer>(remoteMap);
          prev.forEach(localItem => {
            if (localItem && localItem.id && !merged.has(localItem.id)) {
              merged.set(localItem.id, localItem);
              setDoc(doc(db, 'manufacturers', localItem.id), localItem).catch(err =>
                console.warn('Sync manufacturer to Firestore notice:', err.message)
              );
            }
          });
          return Array.from(merged.values());
        }
        return Array.from(remoteMap.values());
      });
    }, err => console.warn('Firestore manufacturers sync notice:', err.message));

    let cInitialSync = false;
    const unsubCommunications = onSnapshot(collection(db, 'communications'), snapshot => {
      const remoteMap = new Map<string, CommunicationEntry>();
      snapshot.forEach(docSnap => {
        remoteMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as CommunicationEntry);
      });

      setCommunications(prev => {
        if (!cInitialSync) {
          cInitialSync = true;
          const merged = new Map<string, CommunicationEntry>(remoteMap);
          prev.forEach(localItem => {
            if (localItem && localItem.id && !merged.has(localItem.id)) {
              merged.set(localItem.id, localItem);
              setDoc(doc(db, 'communications', localItem.id), localItem).catch(err =>
                console.warn('Sync communication to Firestore notice:', err.message)
              );
            }
          });
          return Array.from(merged.values());
        }
        return Array.from(remoteMap.values());
      });
    }, err => console.warn('Firestore communications sync notice:', err.message));

    let uInitialSync = false;
    const unsubUsers = onSnapshot(collection(db, 'users'), snapshot => {
      const remoteMap = new Map<string, AppUser>();
      snapshot.forEach(docSnap => {
        const u = { id: docSnap.id, ...docSnap.data() } as AppUser;
        if (isHardcodedUser(u)) {
          deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
        } else {
          remoteMap.set(docSnap.id, u);
        }
      });

      setUsers(prev => {
        const cleanPrev = prev.filter(u => !isHardcodedUser(u));
        if (!uInitialSync) {
          uInitialSync = true;
          const merged = new Map<string, AppUser>(remoteMap);
          cleanPrev.forEach(localItem => {
            if (localItem && localItem.id && !merged.has(localItem.id)) {
              merged.set(localItem.id, localItem);
              setDoc(doc(db, 'users', localItem.id), localItem).catch(err =>
                console.warn('Sync user to Firestore notice:', err.message)
              );
            }
          });
          return Array.from(merged.values());
        }
        return Array.from(remoteMap.values());
      });
    }, err => console.warn('Firestore users sync notice:', err.message));

    let aInitialSync = false;
    const unsubAudit = onSnapshot(collection(db, 'auditLogs'), snapshot => {
      const remoteMap = new Map<string, AuditLogItem>();
      snapshot.forEach(docSnap => {
        const log = { id: docSnap.id, ...docSnap.data() } as AuditLogItem;
        if (HARDCODED_USER_IDS.has(log.userId) || HARDCODED_USER_IDS.has(log.targetId || '')) {
          deleteDoc(doc(db, 'auditLogs', docSnap.id)).catch(() => {});
        } else {
          remoteMap.set(docSnap.id, log);
        }
      });

      setAuditLogs(prev => {
        const cleanPrev = prev.filter(l => !HARDCODED_USER_IDS.has(l.userId) && !HARDCODED_USER_IDS.has(l.targetId || ''));
        if (!aInitialSync) {
          aInitialSync = true;
          const merged = new Map<string, AuditLogItem>(remoteMap);
          cleanPrev.forEach(localItem => {
            if (localItem && localItem.id && !merged.has(localItem.id)) {
              merged.set(localItem.id, localItem);
              setDoc(doc(db, 'auditLogs', localItem.id), localItem).catch(() => {});
            }
          });
          return Array.from(merged.values()).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
        }
        return Array.from(remoteMap.values()).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
      });
    }, err => console.warn('Firestore auditLogs sync notice:', err.message));

    const unsubPermissions = onSnapshot(doc(db, 'settings', 'permissions'), docSnap => {
      if (docSnap.exists()) {
        setRolePermissions(docSnap.data() as Record<UserRoleType, RolePermissions>);
      }
    }, err => console.warn('Firestore permissions sync notice:', err.message));

    return () => {
      unsubscribeAuth();
      unsubManufacturers();
      unsubCommunications();
      unsubUsers();
      unsubAudit();
      unsubPermissions();
    };
  }, []);

  // Ensure currentUser stays synchronized with database users
  useEffect(() => {
    if (users.length > 0 && (isHardcodedUser(currentUser) || currentUser.id === 'session-admin')) {
      setCurrentUser(users[0]);
    }
  }, [users, currentUser]);

  // Sync state to local server disk database (data/db.json) and localStorage
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Merge any non-default records from local database file on mount without overwriting existing items
  useEffect(() => {
    fetch('/api/db')
      .then(res => res.json())
      .then(result => {
        if (result && result.success && result.data) {
          const { manufacturers: mData, communications: cData, users: uData, rolePermissions: pData, auditLogs: aData } = result.data;
          if (mData && Array.isArray(mData) && mData.length > 0) {
            setManufacturers(prev => {
              const map = new Map(prev.map(item => [item.id, item]));
              mData.forEach((item: Manufacturer) => {
                if (item && item.id && !map.has(item.id)) {
                  map.set(item.id, item);
                  setDoc(doc(db, 'manufacturers', item.id), item).catch(() => {});
                }
              });
              return Array.from(map.values());
            });
          }
          if (cData && Array.isArray(cData) && cData.length > 0) {
            setCommunications(prev => {
              const map = new Map(prev.map(item => [item.id, item]));
              cData.forEach((item: CommunicationEntry) => {
                if (item && item.id && !map.has(item.id)) {
                  map.set(item.id, item);
                  setDoc(doc(db, 'communications', item.id), item).catch(() => {});
                }
              });
              return Array.from(map.values());
            });
          }
          if (uData && Array.isArray(uData)) {
            const validUsers = uData.filter((u: AppUser) => !isHardcodedUser(u));
            if (validUsers.length > 0) {
              setUsers(prev => {
                const map = new Map(prev.map(item => [item.id, item]));
                validUsers.forEach((item: AppUser) => {
                  if (item && item.id && !map.has(item.id)) {
                    map.set(item.id, item);
                    setDoc(doc(db, 'users', item.id), item).catch(() => {});
                  }
                });
                return Array.from(map.values());
              });
            }
          }
          if (pData) setRolePermissions(pData);
          if (aData && Array.isArray(aData)) {
            const validLogs = aData.filter(
              (l: AuditLogItem) => !HARDCODED_USER_IDS.has(l.userId) && !HARDCODED_USER_IDS.has(l.targetId || '')
            );
            if (validLogs.length > 0) {
              setAuditLogs(prev => {
                const map = new Map(prev.map(item => [item.id, item]));
                validLogs.forEach((item: AuditLogItem) => {
                  if (item && item.id && !map.has(item.id)) {
                    map.set(item.id, item);
                  }
                });
                return Array.from(map.values());
              });
            }
          }
        }
        setIsDbLoaded(true);
      })
      .catch(err => {
        console.warn('Failed to fetch local file db:', err);
        setIsDbLoaded(true);
      });
  }, []);

  // Save changes to local disk database file (data/db.json) & localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MANUFACTURERS, JSON.stringify(manufacturers));
      localStorage.setItem(STORAGE_KEYS.COMMUNICATIONS, JSON.stringify(communications));
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(rolePermissions));
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));

      if (isDbLoaded) {
        fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            manufacturers,
            communications,
            users,
            rolePermissions,
            auditLogs,
          }),
        }).catch(err => console.warn('Failed to save to local file db:', err));
      }
    } catch (e) {
      console.warn('Persistence error', e);
    }
  }, [manufacturers, communications, users, currentUser, rolePermissions, auditLogs, isDbLoaded]);

  // Log an audit trail entry
  const addAuditLog = (
    action: string,
    category: AuditLogItem['category'],
    details: string,
    targetId?: string
  ) => {
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      category,
      details,
      ...(targetId ? { targetId } : {}),
    };
    setAuditLogs(prev => [newLog, ...prev]);
    setDoc(doc(db, 'auditLogs', newLog.id), newLog).catch(err => {
      console.warn('Firestore audit write failure:', err);
    });
  };

  // Permission Check
  const hasPermission = (permission: keyof RolePermissions): boolean => {
    const role = currentUser.role;
    const permissions = rolePermissions[role];
    if (!permissions) return false;
    return Boolean(permissions[permission]);
  };

  const switchUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      setCurrentUser(target);
      addAuditLog('SESSION_SWITCH', 'PERMISSION', `Switched active user to ${target.name} (${target.role})`, target.id);
    }
  };

  const loginWithUser = (user: AppUser) => {
    const updated: AppUser = {
      ...user,
      lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    setUsers(prev => {
      const exists = prev.some(u => u.id === updated.id);
      return exists ? prev.map(u => (u.id === updated.id ? updated : u)) : [...prev, updated];
    });
    setDoc(doc(db, 'users', updated.id), updated, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `users/${updated.id}`);
    });
    setCurrentUser(updated);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEYS.IS_AUTH, 'true');
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));
    addAuditLog('LOGIN_TEAM', 'PERMISSION', `Team member ${user.name} logged in`, user.id);
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;

      let matched: AppUser | undefined = users.find(u => u.email.toLowerCase() === (googleUser.email || '').toLowerCase());
      if (!matched) {
        const initials = (googleUser.displayName || 'G U')
          .split(' ')
          .map(p => p[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);

        matched = {
          id: `usr-g-${googleUser.uid.substring(0, 8)}`,
          name: googleUser.displayName || 'Google User',
          email: googleUser.email || 'user@company.com',
          role: 'admin',
          department: 'Procurement Management',
          isActive: true,
          avatar: initials || 'GU',
          lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16),
        };

        setUsers(prev => [...prev, matched!]);
      } else {
        matched = {
          ...matched,
          lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16),
        };
      }

      const activeUser: AppUser = matched;
      setDoc(doc(db, 'users', activeUser.id), activeUser, { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${activeUser.id}`);
      });
      setCurrentUser(activeUser);
      setIsAuthenticated(true);
      localStorage.setItem(STORAGE_KEYS.IS_AUTH, 'true');
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(activeUser));
      addAuditLog('LOGIN_GOOGLE', 'PERMISSION', `Google user ${googleUser.email} authenticated`, activeUser.id);

      return { success: true, message: 'Google Sign-In successful' };
    } catch (err: any) {
      console.warn('Google Sign-In Error:', err);
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        return {
          success: false,
          message: 'The current domain is not added to Firebase Authorized Domains. To sign in with Google, add this domain in Firebase Console > Authentication > Settings > Authorized Domains.'
        };
      }
      return { success: false, message: err.message || 'Google Authentication failed' };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut warning:', e);
    }
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEYS.IS_AUTH);
  };

  const getNextManufacturerId = (): string => {
    const nums = manufacturers
      .map(m => {
        const match = m.id.match(/^M(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    const nextNum = maxNum + 1;
    return `M${nextNum.toString().padStart(3, '0')}`;
  };

  const getNextThreadId = (mId?: string): string => {
    const targetM = manufacturers.find(m => m.id === mId) || manufacturers.find(m => m.id === selectedManufacturerId) || manufacturers[0];
    const namePrefix = targetM ? targetM.name.replace(/[^a-zA-Z0-9]/g, '') : 'T';
    
    const mComms = communications.filter(c => c.manufacturerId === (targetM ? targetM.id : ''));
    const existingThreads = new Set<string>();
    mComms.forEach(c => {
      if (c.threadId) existingThreads.add(c.threadId);
    });

    let maxNum = 0;
    existingThreads.forEach(tId => {
      const match = tId.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const nextNum = maxNum + 1;
    return `${namePrefix}-T${nextNum.toString().padStart(2, '0')}`;
  };

  const getThreadsForManufacturer = (mId: string): string[] => {
    const threads = new Set<string>();
    communications
      .filter(c => c.manufacturerId === mId && c.threadId)
      .forEach(c => threads.add(c.threadId));
    return Array.from(threads);
  };

  // Manufacturers CRUD
  const addManufacturer = (data: Omit<Manufacturer, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!hasPermission('canCreateManufacturer')) {
      return { success: false, message: 'Permission Denied: Your current role cannot add manufacturers.' };
    }

    const nextId = getNextManufacturerId();
    const now = new Date().toISOString();
    const newM: Manufacturer = {
      ...data,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };

    setManufacturers(prev => [...prev, newM]);
    setDoc(doc(db, 'manufacturers', newM.id), newM).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `manufacturers/${newM.id}`);
    });

    addAuditLog('CREATE_MANUFACTURER', 'MANUFACTURER', `Created supplier ${newM.name} (${newM.id})`, newM.id);
    return { success: true, message: `Supplier ${newM.name} added successfully as ${newM.id}`, id: newM.id };
  };

  const updateManufacturer = (id: string, data: Partial<Manufacturer>) => {
    if (!hasPermission('canEditManufacturer')) {
      return { success: false, message: 'Permission Denied: Your current role cannot edit manufacturers.' };
    }

    let updatedName = '';
    setManufacturers(prev =>
      prev.map(m => {
        if (m.id === id) {
          updatedName = data.name || m.name;
          const updated = {
            ...m,
            ...data,
            updatedAt: new Date().toISOString(),
          };
          setDoc(doc(db, 'manufacturers', id), updated, { merge: true }).catch(err => {
            handleFirestoreError(err, OperationType.UPDATE, `manufacturers/${id}`);
          });
          return updated;
        }
        return m;
      })
    );

    addAuditLog('UPDATE_MANUFACTURER', 'MANUFACTURER', `Updated details for ${updatedName || id}`, id);
    return { success: true, message: `Supplier ${id} updated successfully` };
  };

  const toggleManufacturerStatus = (id: string, status: ManufacturerStatus) => {
    if (status === 'Removed' && !hasPermission('canDeleteManufacturer')) {
      return { success: false, message: 'Permission Denied: Only Admins can remove or deactivate suppliers.' };
    }
    if (!hasPermission('canEditManufacturer')) {
      return { success: false, message: 'Permission Denied: You cannot update supplier status.' };
    }

    setManufacturers(prev =>
      prev.map(m => {
        if (m.id === id) {
          const updated = { ...m, status, updatedAt: new Date().toISOString() };
          setDoc(doc(db, 'manufacturers', id), updated, { merge: true }).catch(err => {
            handleFirestoreError(err, OperationType.UPDATE, `manufacturers/${id}`);
          });
          return updated;
        }
        return m;
      })
    );

    addAuditLog('STATUS_CHANGE_MANUFACTURER', 'MANUFACTURER', `Changed status of ${id} to ${status}`, id);
    return { success: true, message: `Status updated to ${status}` };
  };

  // Communications CRUD
  const addCommunication = (data: Omit<CommunicationEntry, 'id' | 'createdAt' | 'createdBy' | 'entryKey'>) => {
    if (!hasPermission('canLogCommunication')) {
      return { success: false, message: 'Permission Denied: Your current role cannot log communications.' };
    }

    const existingCountForM = communications.filter(c => c.manufacturerId === data.manufacturerId).length;
    const entryIndex = existingCountForM + 1;
    const entryKey = `${data.manufacturerId}|${entryIndex}`;
    const newId = `comm-${Date.now()}`;
    const now = new Date().toISOString();

    let finalThreadId = data.threadId;
    if (data.threadSelection === 'New Thread' || !finalThreadId) {
      finalThreadId = getNextThreadId(data.manufacturerId);
    }

    const newComm: CommunicationEntry = {
      ...data,
      id: newId,
      threadId: finalThreadId,
      entryKey,
      createdBy: currentUser.name,
      createdAt: now,
    };

    setCommunications(prev => [newComm, ...prev]);
    setDoc(doc(db, 'communications', newComm.id), newComm).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `communications/${newComm.id}`);
    });

    addAuditLog(
      'LOG_COMMUNICATION',
      'COMMUNICATION',
      `Logged communication (${newComm.channel}) for ${newComm.manufacturerName} [${newComm.threadId}]`,
      newComm.id
    );

    return { success: true, message: `Communication logged successfully under Thread ${finalThreadId}`, id: newId };
  };

  const updateCommunication = (id: string, data: Partial<CommunicationEntry>) => {
    if (!hasPermission('canEditCommunication')) {
      return { success: false, message: 'Permission Denied: You do not have permission to edit communication records.' };
    }

    setCommunications(prev =>
      prev.map(c => {
        if (c.id === id) {
          const updated = { ...c, ...data };
          setDoc(doc(db, 'communications', id), updated, { merge: true }).catch(err => {
            handleFirestoreError(err, OperationType.UPDATE, `communications/${id}`);
          });
          return updated;
        }
        return c;
      })
    );

    addAuditLog('UPDATE_COMMUNICATION', 'COMMUNICATION', `Updated communication record ${id}`, id);
    return { success: true, message: 'Communication record updated' };
  };

  const deleteCommunication = (id: string) => {
    if (!hasPermission('canDeleteCommunication')) {
      return { success: false, message: 'Permission Denied: Only Manager or Admin can delete communication records.' };
    }

    const target = communications.find(c => c.id === id);
    setCommunications(prev => prev.filter(c => c.id !== id));
    deleteDoc(doc(db, 'communications', id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `communications/${id}`);
    });

    addAuditLog(
      'DELETE_COMMUNICATION',
      'COMMUNICATION',
      `Deleted record for ${target?.manufacturerName || id} - ${target?.subject || ''}`,
      id
    );

    return { success: true, message: 'Record deleted' };
  };

  // Permissions & Users
  const updateRolePermissions = (role: UserRoleType, permissions: RolePermissions) => {
    if (!hasPermission('canModifyPermissions')) {
      return { success: false, message: 'Permission Denied: Only Admins can modify security permissions.' };
    }

    const updatedPermissions = {
      ...rolePermissions,
      [role]: permissions,
    };
    setRolePermissions(updatedPermissions);
    setDoc(doc(db, 'settings', 'permissions'), updatedPermissions).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, 'settings/permissions');
    });

    addAuditLog('MODIFY_PERMISSIONS', 'PERMISSION', `Updated security policies for role: ${role.toUpperCase()}`);
    return { success: true, message: `Security permissions for ${role} updated` };
  };

  const createUser = (userData: Omit<AppUser, 'id' | 'lastLogin'>) => {
    if (users.length > 0 && !hasPermission('canManageUsers')) {
      return { success: false, message: 'Permission Denied: Only Admins can manage team members.' };
    }

    const initials = userData.name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    const newUser: AppUser = {
      ...userData,
      id: `usr-${Date.now()}`,
      avatar: initials || 'TU',
      lastLogin: 'Never',
    };

    setUsers(prev => [...prev, newUser]);
    setDoc(doc(db, 'users', newUser.id), newUser).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `users/${newUser.id}`);
    });

    addAuditLog('CREATE_USER', 'PERMISSION', `Added new team member ${newUser.name} as ${newUser.role}`);
    return { success: true, message: `User ${newUser.name} created successfully`, user: newUser };
  };

  const updateUser = (userId: string, data: Partial<AppUser>) => {
    if (!hasPermission('canManageUsers')) {
      return { success: false, message: 'Permission Denied: Only Admins can edit users.' };
    }

    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          const updated = { ...u, ...data };
          setDoc(doc(db, 'users', userId), updated, { merge: true }).catch(err => {
            handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
          });
          return updated;
        }
        return u;
      })
    );
    if (currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, ...data }));
    }

    addAuditLog('UPDATE_USER', 'PERMISSION', `Updated profile for user ${userId}`);
    return { success: true, message: 'User updated' };
  };

  const toggleUserStatus = (userId: string) => {
    if (!hasPermission('canManageUsers')) {
      return { success: false, message: 'Permission Denied: Only Admins can toggle user access.' };
    }
    if (userId === currentUser.id) {
      return { success: false, message: 'Action Prevented: Cannot deactivate your own active session.' };
    }

    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          const updated = { ...u, isActive: !u.isActive };
          setDoc(doc(db, 'users', userId), updated, { merge: true }).catch(err => {
            handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
          });
          return updated;
        }
        return u;
      })
    );
    addAuditLog('TOGGLE_USER_STATUS', 'PERMISSION', `Toggled account activation state for ${userId}`);
    return { success: true, message: 'User status updated' };
  };

  const deleteUser = (userId: string) => {
    if (!hasPermission('canManageUsers')) {
      return { success: false, message: 'Permission Denied: Only Admins can delete users.' };
    }
    if (userId === currentUser.id) {
      return { success: false, message: 'Action Prevented: Cannot delete your active Admin session.' };
    }

    const target = users.find(u => u.id === userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
    deleteDoc(doc(db, 'users', userId)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    });

    addAuditLog('DELETE_USER', 'PERMISSION', `Deleted user account for ${target?.name || userId}`);
    return { success: true, message: `User ${target?.name || userId} deleted` };
  };

  const clearAllData = () => {
    if (!hasPermission('canModifyPermissions')) {
      return;
    }
    manufacturers.forEach(m => {
      deleteDoc(doc(db, 'manufacturers', m.id)).catch(err =>
        console.warn('Firestore delete manufacturer error:', err)
      );
    });
    communications.forEach(c => {
      deleteDoc(doc(db, 'communications', c.id)).catch(err =>
        console.warn('Firestore delete communication error:', err)
      );
    });
    auditLogs.forEach(a => {
      deleteDoc(doc(db, 'auditLogs', a.id)).catch(err =>
        console.warn('Firestore delete auditLog error:', err)
      );
    });
    setManufacturers([]);
    setCommunications([]);
    setAuditLogs([]);
    addAuditLog('CLEAR_DATABASE', 'DATA', 'Cleared all manufacturers and communications records from database');
  };

  // CSV Export & Import matching spreadsheet structure
  const exportCsvData = (): string => {
    let csv = 'CENTRAL INPUT • Exported Database\n';
    csv += 'A. MANUFACTURER LIST (one row per manufacturer)\n';
    csv += 'Manufacturer ID,Manufacturer,Website,Contact Email / Chat Portal,Product(s) of Interest,Notes,Record Status\n';
    manufacturers.forEach(m => {
      csv += `"${m.id}","${m.name.replace(/"/g, '""')}","${m.website}","${m.contactPortal.replace(/"/g, '""')}","${m.productsOfInterest.replace(/"/g, '""')}","${m.notes.replace(/"/g, '""')}","${m.status}"\n`;
    });

    csv += '\nB. COMMUNICATION HISTORY (one row per email / call / chat)\n';
    csv += 'Date,Manufacturer,Thread Selection,Thread ID (auto),Channel / Direction,Subject / Purpose,Key Outcome / Latest Update,Current Status,Next Action,Follow-up Date,Chat / Thread Doc,Documents Received,Information Received,Manufacturer ID (auto),Entry key (helper)\n';
    communications.forEach(c => {
      const docs = (c.documentsReceived || []).join('; ');
      csv += `"${c.date}","${c.manufacturerName}","${c.threadSelection}","${c.threadId}","${c.channel}","${(c.subject || '').replace(/"/g, '""')}","${(c.keyOutcome || '').replace(/"/g, '""')}","${c.status}","${(c.nextAction || '').replace(/"/g, '""')}","${c.followUpDate || ''}","${c.threadDoc || ''}","${docs.replace(/"/g, '""')}","${(c.informationReceived || '').replace(/"/g, '""')}","${c.manufacturerId}","${c.entryKey || ''}"\n`;
    });

    addAuditLog('DATA_EXPORT', 'DATA', `Exported full database to CSV (${manufacturers.length} manufacturers, ${communications.length} records)`);
    return csv;
  };

  const importCsvData = (csvContent: string): { success: boolean; count: { manufacturers: number; communications: number }; error?: string } => {
    if (!hasPermission('canImportData')) {
      return { success: false, count: { manufacturers: 0, communications: 0 }, error: 'Permission Denied: Your role cannot import data.' };
    }

    try {
      const lines = csvContent.split(/\r?\n/);
      let inSectionA = false;
      let inSectionB = false;
      const parsedManufacturers: Manufacturer[] = [];
      const parsedComms: CommunicationEntry[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.includes('A. MANUFACTURER LIST')) {
          inSectionA = true;
          inSectionB = false;
          continue;
        }
        if (line.includes('B. COMMUNICATION HISTORY')) {
          inSectionA = false;
          inSectionB = true;
          continue;
        }

        // Standard robust CSV line parser handling commas inside quotes
        const parseRow = (text: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let c = 0; c < text.length; c++) {
            const char = text[c];
            if (char === '"') {
              if (inQuotes && text[c + 1] === '"') {
                current += '"';
                c++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        if (inSectionA) {
          if (line.startsWith('Manufacturer ID') || line.startsWith('"Manufacturer ID"')) continue;
          const cols = parseRow(line);
          if (cols.length >= 2 && cols[0] && cols[0].startsWith('M')) {
            parsedManufacturers.push({
              id: cols[0],
              name: cols[1],
              website: cols[2] || '',
              contactPortal: cols[3] || '',
              productsOfInterest: cols[4] || '',
              notes: cols[5] || '',
              status: (cols[6] === 'Removed' ? 'Removed' : 'Active') as ManufacturerStatus,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        } else if (inSectionB) {
          if (line.startsWith('Date') || line.startsWith('"Date"')) continue;
          const cols = parseRow(line);
          if (cols.length >= 6 && cols[0] && cols[0].match(/^\d{4}-\d{2}-\d{2}/)) {
            const date = cols[0];
            const mName = cols[1];
            const tSel = cols[2] || 'New Thread';
            const tId = cols[3] || 'T001';
            const channel = (cols[4] || 'Email - Received') as any;
            const subject = cols[5] || '';
            const outcome = cols[6] || '';
            const status = (cols[7] || 'Completed') as any;
            const nextAction = cols[8] || '';
            const followUp = cols[9] || '';
            const threadDoc = cols[10] || '';
            const docsStr = cols[11] || '';
            const info = cols[12] || '';
            const mId = cols[13] || '';
            const entryKey = cols[14] || '';

            parsedComms.push({
              id: `comm-import-${Date.now()}-${i}`,
              date,
              manufacturerName: mName,
              threadSelection: tSel,
              threadId: tId,
              channel,
              subject,
              keyOutcome: outcome,
              status,
              nextAction,
              followUpDate: followUp,
              threadDoc,
              documentsReceived: docsStr ? docsStr.split(/[;\n]/).map(d => d.trim()).filter(Boolean) : [],
              informationReceived: info,
              manufacturerId: mId,
              entryKey,
              createdBy: currentUser.name,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      if (parsedManufacturers.length > 0) {
        setManufacturers(parsedManufacturers);
        parsedManufacturers.forEach(m => {
          setDoc(doc(db, 'manufacturers', m.id), m).catch(err =>
            handleFirestoreError(err, OperationType.WRITE, `manufacturers/${m.id}`)
          );
        });
      }
      if (parsedComms.length > 0) {
        setCommunications(parsedComms);
        parsedComms.forEach(c => {
          setDoc(doc(db, 'communications', c.id), c).catch(err =>
            handleFirestoreError(err, OperationType.WRITE, `communications/${c.id}`)
          );
        });
      }

      addAuditLog(
        'DATA_IMPORT',
        'DATA',
        `Imported ${parsedManufacturers.length} suppliers and ${parsedComms.length} communication records via CSV`
      );

      return {
        success: true,
        count: {
          manufacturers: parsedManufacturers.length,
          communications: parsedComms.length,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        count: { manufacturers: 0, communications: 0 },
        error: err.message || 'Failed to parse CSV file',
      };
    }
  };

  const resetDatabase = () => {
    if (!hasPermission('canModifyPermissions')) {
      return;
    }
    manufacturers.forEach(m => {
      deleteDoc(doc(db, 'manufacturers', m.id)).catch(() => {});
    });
    communications.forEach(c => {
      deleteDoc(doc(db, 'communications', c.id)).catch(() => {});
    });
    auditLogs.forEach(a => {
      deleteDoc(doc(db, 'auditLogs', a.id)).catch(() => {});
    });
    setManufacturers(INITIAL_MANUFACTURERS);
    setCommunications(INITIAL_COMMUNICATIONS);
    setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCurrentUser(users[0] || FALLBACK_SESSION_USER);
    localStorage.clear();
    addAuditLog('SYSTEM_RESET', 'DATA', 'Database reset to clean state');
  };

  return (
    <AppContext.Provider
      value={{
        manufacturers,
        communications,
        users,
        currentUser,
        rolePermissions,
        auditLogs,
        activeTab,
        selectedManufacturerId,
        selectedThreadId,
        searchQuery,
        firebaseConnected,
        firebaseProjectId,
        isAuthenticated,
        setActiveTab,
        setSelectedManufacturerId,
        setSelectedThreadId,
        setSearchQuery,
        switchUser,
        loginWithUser,
        loginWithGoogle,
        logout,
        hasPermission,
        addManufacturer,
        updateManufacturer,
        toggleManufacturerStatus,
        getNextManufacturerId,
        addCommunication,
        updateCommunication,
        deleteCommunication,
        getNextThreadId,
        getThreadsForManufacturer,
        updateRolePermissions,
        createUser,
        updateUser,
        toggleUserStatus,
        deleteUser,
        exportCsvData,
        importCsvData,
        resetDatabase,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
