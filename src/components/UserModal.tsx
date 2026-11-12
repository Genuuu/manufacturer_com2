import React, { useState, useEffect } from 'react';
import { useApp, normalizeUserRole } from '../context/AppContext';
import { AppUser, UserRoleType } from '../types';
import { X, UserPlus, Shield, User, Mail, Briefcase, AlertCircle } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser?: AppUser | null;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  editingUser,
}) => {
  const { createUser, updateUser } = useApp();

  const isEditing = Boolean(editingUser);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRoleType>('moderator');
  const [position, setPosition] = useState('Procurement Specialist');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingUser) {
      setName(editingUser.name);
      setEmail(editingUser.email);
      setRole(normalizeUserRole(editingUser.role));
      setPosition(editingUser.department || 'Procurement Specialist');
      setIsActive(editingUser.isActive !== false);
    } else {
      setName('');
      setEmail('');
      setRole('moderator');
      setPosition('Procurement Specialist');
      setIsActive(true);
    }
    setErrorMsg('');
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('A valid email address is required.');
      return;
    }

    if (isEditing && editingUser) {
      const res = updateUser(editingUser.id, {
        name: name.trim(),
        email: email.trim(),
        role,
        department: position.trim() || 'Team Member',
        isActive,
      });

      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }
    } else {
      const res = createUser({
        name: name.trim(),
        email: email.trim(),
        role,
        department: position.trim() || 'Team Member',
        isActive,
        avatar: name
          .split(' ')
          .map(p => p[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
      });

      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden sm:my-auto animate-in fade-in zoom-in-95 max-h-[92dvh] sm:max-h-[90vh] flex flex-col">
        {/* Mobile Grab Handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 bg-slate-50">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                {isEditing ? 'Edit Team Member' : 'Add New Team Member'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Assign member position, security role, and account permissions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Alert Error */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs flex-1 overflow-y-auto">
          
          {/* Full Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>Full Name *</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter full name"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>Email Address *</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@company.com"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
            />
          </div>

          {/* Position */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5 text-slate-400" />
              <span>Position</span>
            </label>
            <input
              type="text"
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder="e.g. Procurement Lead, Hardware Engineer"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Account Role */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-slate-400" />
              <span>Assigned Security Role *</span>
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRoleType)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="admin">Admin (Full System Control & Template Editor)</option>
              <option value="moderator">Moderator (Manage Suppliers, Comms & View Templates)</option>
              <option value="viewer">Viewer (Read-Only Database Access)</option>
            </select>
          </div>

          {/* Active Status Switch */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800 text-xs">Account Status</span>
              <p className="text-[10px] text-slate-500">Allow user to log in and access system</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                isActive
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-200 text-slate-600 border border-slate-300'
              }`}
            >
              {isActive ? '✓ Active Account' : '✕ Suspended'}
            </button>
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-xs"
            >
              {isEditing ? 'Save Changes' : 'Create User'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
