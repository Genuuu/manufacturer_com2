import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  
  setActiveTab: (tab: NavTab) => void;
  setSelectedManufacturerId: (id: string) => void;
  setSelectedThreadId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  switchUser: (userId: string) => void;
  
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
  createUser: (userData: Omit<AppUser, 'id' | 'lastLogin'>) => { success: boolean; message: string };
  updateUser: (userId: string, data: Partial<AppUser>) => { success: boolean; message: string };
  toggleUserStatus: (userId: string) => { success: boolean; message: string };
  
  // Data Tools
  exportCsvData: () => string;
  importCsvData: (csvContent: string) => { success: boolean; count: { manufacturers: number; communications: number }; error?: string };
  resetDatabase: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  MANUFACTURERS: 'fabricateops_manufacturers_v1',
  COMMUNICATIONS: 'fabricateops_communications_v1',
  USERS: 'fabricateops_users_v1',
  CURRENT_USER: 'fabricateops_current_user_v1',
  PERMISSIONS: 'fabricateops_permissions_v1',
  AUDIT: 'fabricateops_audit_logs_v1',
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load stored or fallback data
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
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        const match = INITIAL_USERS.find(u => u.id === parsed.id) || parsed;
        return match;
      }
      return INITIAL_USERS[0]; // Admin by default
    } catch {
      return INITIAL_USERS[0];
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
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('M001');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MANUFACTURERS, JSON.stringify(manufacturers));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, [manufacturers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMMUNICATIONS, JSON.stringify(communications));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, [communications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(rolePermissions));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, [rolePermissions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, [auditLogs]);

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
      targetId,
    };
    setAuditLogs(prev => [newLog, ...prev]);
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
          return {
            ...m,
            ...data,
            updatedAt: new Date().toISOString(),
          };
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
      prev.map(m => (m.id === id ? { ...m, status, updatedAt: new Date().toISOString() } : m))
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
      prev.map(c => (c.id === id ? { ...c, ...data } : c))
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

    setRolePermissions(prev => ({
      ...prev,
      [role]: permissions,
    }));

    addAuditLog('MODIFY_PERMISSIONS', 'PERMISSION', `Updated security policies for role: ${role.toUpperCase()}`);
    return { success: true, message: `Security permissions for ${role} updated` };
  };

  const createUser = (userData: Omit<AppUser, 'id' | 'lastLogin'>) => {
    if (!hasPermission('canManageUsers')) {
      return { success: false, message: 'Permission Denied: Only Admins can manage team members.' };
    }

    const initials = userData.name
      .split(' ')
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
    addAuditLog('CREATE_USER', 'PERMISSION', `Added new team member ${newUser.name} as ${newUser.role}`);
    return { success: true, message: `User ${newUser.name} created successfully` };
  };

  const updateUser = (userId: string, data: Partial<AppUser>) => {
    if (!hasPermission('canManageUsers')) {
      return { success: false, message: 'Permission Denied: Only Admins can edit users.' };
    }

    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, ...data } : u)));
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
      prev.map(u => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
    );
    addAuditLog('TOGGLE_USER_STATUS', 'PERMISSION', `Toggled account activation state for ${userId}`);
    return { success: true, message: 'User status updated' };
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
      }
      if (parsedComms.length > 0) {
        setCommunications(parsedComms);
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
      alert('Permission Denied: Only Lead Administrators can restore factory database.');
      return;
    }
    setManufacturers(INITIAL_MANUFACTURERS);
    setCommunications(INITIAL_COMMUNICATIONS);
    setUsers(INITIAL_USERS);
    setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCurrentUser(INITIAL_USERS[0]);
    localStorage.clear();
    addAuditLog('SYSTEM_RESET', 'DATA', 'Database restored to original manufacturing sheet seed data');
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
        setActiveTab,
        setSelectedManufacturerId,
        setSelectedThreadId,
        setSearchQuery,
        switchUser,
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
        exportCsvData,
        importCsvData,
        resetDatabase,
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
