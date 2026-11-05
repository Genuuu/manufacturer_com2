import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { UserRoleType, RolePermissions, AppUser } from '../types';
import {
  ShieldCheck,
  UserCheck,
  Check,
  X,
  Download,
  Upload,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Lock,
  UserPlus,
  KeyRound,
  ShieldAlert,
  Edit2,
  Trash2,
  Users,
  Building2,
  Mail,
  User,
  Power,
  Sparkles,
} from 'lucide-react';
import { UserModal } from './UserModal';

export const AccessView: React.FC = () => {
  const {
    currentUser,
    users,
    switchUser,
    rolePermissions,
    updateRolePermissions,
    toggleUserStatus,
    deleteUser,
    exportCsvData,
    importCsvData,
    resetDatabase,
    clearAllData,
    manufacturers,
    communications,
    hasPermission,
    firebaseProjectId,
  } = useApp();

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin Guard: Restrict view to Admins
  if (currentUser.role !== 'admin') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center space-y-3 max-w-md mx-auto my-8 shadow-sm">
        <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mx-auto font-bold text-lg">
          🔒
        </div>
        <h2 className="text-base font-bold text-slate-900">Admin Access Required</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          The Permissions & Access Control panel can only be viewed and edited by Lead Administrators.
          Your active account is logged in as <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.role}).
        </p>
      </div>
    );
  }

  const rolesList: { id: UserRoleType; name: string; desc: string; badge: string }[] = [
    {
      id: 'admin',
      name: 'Lead Administrator',
      desc: 'Full system control',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      id: 'manager',
      name: 'Sourcing Manager',
      desc: 'Supplier & comms management',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      id: 'engineer',
      name: 'Hardware Engineer',
      desc: 'Log notes & technical files',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      id: 'auditor',
      name: 'Viewer / Auditor',
      desc: 'Read-only access across database',
      badge: 'bg-slate-100 text-slate-700 border-slate-300',
    },
  ];

  const permissionsList: { key: keyof RolePermissions; label: string; desc: string }[] = [
    { key: 'canCreateManufacturer', label: 'Create new suppliers', desc: 'Add new vendors in Section A' },
    { key: 'canEditManufacturer', label: 'Edit supplier profiles', desc: 'Modify website, contact details, notes' },
    { key: 'canDeleteManufacturer', label: 'Remove / deactivate suppliers', desc: 'Change supplier status to Removed' },
    { key: 'canLogCommunication', label: 'Log new communications', desc: 'Record emails, live chats, RFQ quotes' },
    { key: 'canEditCommunication', label: 'Edit communication entries', desc: 'Update outcomes, pricing, next actions' },
    { key: 'canDeleteCommunication', label: 'Delete communication logs', desc: 'Permanently delete communication records' },
    { key: 'canExportData', label: 'Export database to CSV', desc: 'Download Section A & B spreadsheet data' },
    { key: 'canImportData', label: 'Import database from CSV', desc: 'Upload spreadsheet files' },
    { key: 'canModifyPermissions', label: 'Modify Security Policies', desc: 'Edit role permissions matrix' },
  ];

  const handleTogglePermission = (role: UserRoleType, permKey: keyof RolePermissions) => {
    // Protect root admin permissions
    if (role === 'admin' && permKey === 'canModifyPermissions') {
      setFeedbackMsg({ type: 'error', text: 'Root admin security policy cannot be revoked.' });
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }

    const currentPerms = { ...rolePermissions[role] };
    currentPerms[permKey] = !currentPerms[permKey];

    const res = updateRolePermissions(role, currentPerms);
    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: `Updated permission '${permKey}' for role ${role.toUpperCase()}`,
      });
    } else {
      setFeedbackMsg({ type: 'error', text: res.message });
    }
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleDownloadCsv = () => {
    const csv = exportCsvData();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Manufacturer_Communication_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      if (text) {
        const res = importCsvData(text);
        if (res.success) {
          setImportStatus({
            type: 'success',
            message: `Successfully imported ${res.count.manufacturers} suppliers and ${res.count.communications} communication records!`,
          });
        } else {
          setImportStatus({
            type: 'error',
            message: res.error || 'Failed to import CSV.',
          });
        }
        setTimeout(() => setImportStatus(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (u: AppUser) => {
    setEditingUser(u);
    setUserModalOpen(true);
  };

  const handleDeleteUser = (u: AppUser) => {
    if (u.id === currentUser.id) {
      alert('Cannot delete your own active Admin session.');
      return;
    }
    if (confirm(`Are you sure you want to delete team member "${u.name}" (${u.email})?`)) {
      const res = deleteUser(u.id);
      if (!res.success) alert(res.message);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto px-1 sm:px-0">
      
      {/* Top Header */}
      <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Team Management & Access Control</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin Console: Manage team member accounts, assign security roles, and customize permissions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
          <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
            ✓ Firebase Connected: {firebaseProjectId || 'manufacturer-11fe2'}
          </span>
          <span className="text-xs font-mono font-semibold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
            ✓ Admin Console Active
          </span>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {importStatus && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
            importStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {importStatus.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{importStatus.message}</span>
        </div>
      )}

      {/* TEAM MEMBERS & USER MANAGEMENT PANEL */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Team Members ({users.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Add users, manage access states, and switch active role for testing
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAddUser}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Add New User</span>
          </button>
        </div>

        {/* Users Table / Cards */}
        <div className="divide-y divide-slate-100">
          {users.map(u => {
            const isCurrent = u.id === currentUser.id;
            const rInfo = rolesList.find(r => r.id === u.role);

            return (
              <div
                key={u.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isCurrent ? 'bg-indigo-50/30' : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    {u.avatar || u.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{u.name}</h4>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.2 rounded-full border border-indigo-200">
                          Active Session
                        </span>
                      )}
                      {!u.isActive && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.2 rounded-full border border-slate-200">
                          Suspended
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-slate-500">
                      <span className="font-mono text-slate-600">{u.email}</span>
                      {u.department && <span>· {u.department}</span>}
                    </div>
                  </div>
                </div>

                {/* Right Actions & Role Badge */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${rInfo?.badge}`}>
                    {rInfo?.name}
                  </span>

                  {!isCurrent && (
                    <button
                      onClick={() => switchUser(u.id)}
                      title="Switch session to test this user's role"
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Switch Session</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEditUser(u)}
                    title="Edit user profile"
                    className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  {!isCurrent && (
                    <button
                      onClick={() => handleDeleteUser(u)}
                      title="Delete user"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Permissions Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Interactive Role Permissions Matrix
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Admin: Click any checkmark/cross to grant or revoke specific capabilities live.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 text-[11px] bg-slate-50">
                <th className="py-3 px-4 font-semibold w-72">Capability / Action</th>
                <th className="py-3 px-3 text-center font-semibold w-24">
                  <span className="text-purple-700 font-bold">Admin</span>
                </th>
                <th className="py-3 px-3 text-center font-semibold w-24">
                  <span className="text-blue-700 font-bold">Manager</span>
                </th>
                <th className="py-3 px-3 text-center font-semibold w-24">
                  <span className="text-amber-700 font-bold">Engineer</span>
                </th>
                <th className="py-3 px-3 text-center font-semibold w-24">
                  <span className="text-slate-700 font-bold">Viewer</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionsList.map(item => (
                <tr key={item.key} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{item.label}</div>
                    <div className="text-[10px] text-slate-400">{item.desc}</div>
                  </td>

                  {/* Admin Column */}
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleTogglePermission('admin', item.key)}
                      className={`p-1.5 rounded-lg transition-all ${
                        rolePermissions.admin[item.key]
                          ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                          : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                      }`}
                      title="Click to toggle permission for Admin"
                    >
                      {rolePermissions.admin[item.key] ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </td>

                  {/* Manager Column */}
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleTogglePermission('manager', item.key)}
                      className={`p-1.5 rounded-lg transition-all ${
                        rolePermissions.manager[item.key]
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                      }`}
                      title="Click to toggle permission for Manager"
                    >
                      {rolePermissions.manager[item.key] ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </td>

                  {/* Engineer Column */}
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleTogglePermission('engineer', item.key)}
                      className={`p-1.5 rounded-lg transition-all ${
                        rolePermissions.engineer[item.key]
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                      }`}
                      title="Click to toggle permission for Engineer"
                    >
                      {rolePermissions.engineer[item.key] ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </td>

                  {/* Viewer / Auditor Column */}
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleTogglePermission('auditor', item.key)}
                      className={`p-1.5 rounded-lg transition-all ${
                        rolePermissions.auditor[item.key]
                          ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                          : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                      }`}
                      title="Click to toggle permission for Viewer"
                    >
                      {rolePermissions.auditor[item.key] ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Maintenance Tools */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Database Maintenance & Clean Up
        </h3>
        <p className="text-xs text-slate-500">
          Export full database as a CSV backup file, import spreadsheet data, or clear database records to start fresh.
        </p>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 flex items-center gap-2 shadow-2xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 flex items-center gap-2 shadow-2xs"
          >
            <Upload className="h-3.5 w-3.5 text-indigo-600" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Clear all manufacturers and communication logs to start with a completely empty database?')) {
                clearAllData();
              }
            }}
            className="px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 flex items-center gap-2 shadow-2xs ml-auto"
          >
            <Trash2 className="h-3.5 w-3.5 text-amber-600" />
            <span>Clear Communications & Vendors</span>
          </button>
        </div>
      </div>

      {/* User Creation Modal */}
      <UserModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        editingUser={editingUser}
      />

    </div>
  );
};
