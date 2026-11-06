export type ManufacturerStatus = 'Active' | 'Removed' | 'Archived';

export interface Manufacturer {
  id: string; // e.g. "M001"
  name: string; // e.g. "JLCPCB"
  website: string;
  contactPortal: string; // "Website Live Chat", email, etc.
  productsOfInterest: string; // "5,000 PCBs – Functional testing & test jigs"
  notes: string;
  status: ManufacturerStatus;
  createdAt: string;
  updatedAt: string;
}

export type CommChannel = 
  | 'Live Chat (Session)'
  | 'Website'
  | 'Email - Received'
  | 'Email - Sent'
  | 'Phone Call'
  | 'Video Meeting'
  | 'Portal / Ticket';

export type CommStatus = 
  | 'Completed'
  | 'Awaiting Reply'
  | 'Information Received'
  | 'Pending Review'
  | 'Action Required';

export interface FileAttachment {
  id: string;
  name: string;
  size: number; // in bytes
  type: string; // MIME type or extension
  dataUrl?: string; // base64 / data URL for viewing & downloading
  uploadedAt: string;
}

export interface CommunicationEntry {
  id: string; // internal UUID / string
  date: string; // YYYY-MM-DD
  manufacturerId: string; // "M001"
  manufacturerName: string; // "JLCPCB"
  threadSelection: string; // "New Thread" or existing Thread ID
  threadId: string; // "T001", "T004"
  channel: CommChannel;
  subject: string;
  keyOutcome: string;
  status: CommStatus;
  nextAction?: string;
  followUpDate?: string; // YYYY-MM-DD
  threadDoc?: string; // legacy attachment filename if any
  fullEmailText?: string; // Full raw pasted email content
  documentsReceived?: string[]; // array of filenames, e.g. ["A76XX_Series_AT_Command_Manual_V2.02.pdf"]
  attachments?: FileAttachment[]; // uploaded file attachments with metadata & dataUrl
  informationReceived?: string;
  entryKey?: string; // "M001|1"
  createdBy?: string;
  createdAt?: string;
}

export type UserRoleType = 'admin' | 'manager' | 'engineer' | 'auditor';

export interface RolePermissions {
  canCreateManufacturer: boolean;
  canEditManufacturer: boolean;
  canDeleteManufacturer: boolean; // archive/remove
  canLogCommunication: boolean;
  canEditCommunication: boolean;
  canDeleteCommunication: boolean;
  canManageUsers: boolean;
  canModifyPermissions: boolean;
  canExportData: boolean;
  canImportData: boolean;
  canViewAuditLog: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRoleType;
  department: string;
  avatar: string;
  isActive: boolean;
  lastLogin: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string; // e.g. "LOG_COMMUNICATION", "UPDATE_MANUFACTURER"
  category: 'MANUFACTURER' | 'COMMUNICATION' | 'PERMISSION' | 'DATA';
  details: string;
  targetId?: string;
}
