import { Manufacturer, CommunicationEntry, AppUser, RolePermissions, UserRoleType, AuditLogItem } from '../types';

export const INITIAL_MANUFACTURERS: Manufacturer[] = [];

export const INITIAL_COMMUNICATIONS: CommunicationEntry[] = [];

export const INITIAL_USERS: AppUser[] = [];

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
  moderator: {
    canCreateManufacturer: true,
    canEditManufacturer: true,
    canDeleteManufacturer: false, // Moderators cannot delete supplier records by default
    canLogCommunication: true,
    canEditCommunication: true,
    canDeleteCommunication: true,
    canManageUsers: false,
    canModifyPermissions: false,
    canExportData: true,
    canImportData: true,
    canViewAuditLog: true,
  },
  viewer: {
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
