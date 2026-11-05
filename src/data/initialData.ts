import { Manufacturer, CommunicationEntry, AppUser, RolePermissions, UserRoleType, AuditLogItem } from '../types';

export const INITIAL_MANUFACTURERS: Manufacturer[] = [];

export const INITIAL_COMMUNICATIONS: CommunicationEntry[] = [];

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'usr-admin',
    name: 'Admin User',
    email: 'admin@company.com',
    role: 'admin',
    department: 'Procurement & Management',
    avatar: 'AU',
    isActive: true,
    lastLogin: 'Just now',
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRoleType, RolePermissions> = {
  admin: {
    canCreateManufacturer: true,
    canEditManufacturer: true,
    canDeleteManufacturer: true,
    canLogCommunication: true,
    canEditCommunication: true,
    canDeleteCommunication: true,
    canManageUsers: true,
    canModifyPermissions: true,
    canExportData: true,
    canImportData: true,
    canViewAuditLog: true,
  },
  manager: {
    canCreateManufacturer: true,
    canEditManufacturer: true,
    canDeleteManufacturer: false, // Managers cannot delete records
    canLogCommunication: true,
    canEditCommunication: true,
    canDeleteCommunication: true,
    canManageUsers: false,
    canModifyPermissions: false,
    canExportData: true,
    canImportData: true,
    canViewAuditLog: true,
  },
  engineer: {
    canCreateManufacturer: false,
    canEditManufacturer: false,
    canDeleteManufacturer: false,
    canLogCommunication: true,
    canEditCommunication: true, // can update own logs
    canDeleteCommunication: false,
    canManageUsers: false,
    canModifyPermissions: false,
    canExportData: true,
    canImportData: false,
    canViewAuditLog: false,
  },
  auditor: {
    canCreateManufacturer: false,
    canEditManufacturer: false,
    canDeleteManufacturer: false,
    canLogCommunication: false,
    canEditCommunication: false,
    canDeleteCommunication: false,
    canManageUsers: false,
    canModifyPermissions: false,
    canExportData: true,
    canImportData: false,
    canViewAuditLog: true,
  },
};

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [];
