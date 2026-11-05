import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Layers,
  Plus,
  Shield,
  ChevronDown,
  Building2,
  MessageSquare,
  Lock,
  Wand2,
  BarChart3,
  LogOut,
} from 'lucide-react';

interface NavbarProps {
  onOpenCommModal: () => void;
  onOpenAiCommModal: () => void;
  onOpenManufacturerModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCommModal,
  onOpenAiCommModal,
}) => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    hasPermission,
    manufacturers,
    communications,
    logout,
  } = useApp();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser.role !== 'admin' && activeTab === 'permissions') {
      setActiveTab('communications');
    }
  }, [currentUser.role, activeTab, setActiveTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'manager':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'engineer':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'auditor':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'manager':
        return 'Manager';
      case 'engineer':
        return 'Engineer';
      case 'auditor':
        return 'Viewer';
      default:
        return role;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-0 sm:h-16 gap-2 sm:gap-4">
          {/* Top Row on Mobile: Brand + Account Menu + Actions */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            {/* Brand */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
                <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                  Manufacturer Communication
                </span>
                <p className="text-[10px] sm:text-[11px] text-slate-500 hidden md:block">
                  Procurement & Supplier Tracker
                </p>
              </div>
            </div>

            {/* Mobile Actions: Account Menu & Log Comm */}
            <div className="flex items-center gap-1.5 sm:hidden shrink-0">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                >
                  <span className="font-bold text-slate-800 text-[11px]">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-200 p-2.5 z-50">
                    <div className="px-2 py-1.5 border-b border-slate-100">
                      <div className="font-semibold text-xs text-slate-900">{currentUser.name}</div>
                      {currentUser.email && (
                        <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                      )}
                      <span
                        className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getRoleBadge(
                          currentUser.role
                        )}`}
                      >
                        {getRoleLabel(currentUser.role)}
                      </span>
                    </div>

                    <div className="mt-1.5">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5 text-red-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Auto-Fill */}
              <button
                onClick={onOpenAiCommModal}
                disabled={!hasPermission('canLogCommunication')}
                className="px-2 py-1.5 rounded-lg text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 flex items-center gap-1"
                title="AI Auto-Fill"
              >
                <Wand2 className="h-3.5 w-3.5 text-indigo-600" />
                <span>AI</span>
              </button>

              {/* Log Comm */}
              <button
                onClick={onOpenCommModal}
                disabled={!hasPermission('canLogCommunication')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Central Navigation Tabs */}
          <nav className="flex items-center bg-slate-100/90 p-1 rounded-xl w-full sm:w-auto overflow-x-auto whitespace-nowrap scrollbar-none">
            <div className="flex items-center w-full sm:w-auto gap-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'overview'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                <span className="truncate">Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('communications')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'communications'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Comms</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full hidden xs:inline-block ${
                    activeTab === 'communications'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-slate-200/60 text-slate-600'
                  }`}
                >
                  {communications.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('manufacturers')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'manufacturers'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Vendors</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full hidden xs:inline-block ${
                    activeTab === 'manufacturers'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-slate-200/60 text-slate-600'
                  }`}
                >
                  {manufacturers.length}
                </span>
              </button>

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === 'permissions'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100'
                  }`}
                  title="Admin Permissions Settings"
                >
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Permissions</span>
                  <span className="text-[9px] bg-indigo-500 text-white font-bold px-1 py-0.2 rounded hidden sm:inline-block">
                    Admin
                  </span>
                </button>
              )}
            </div>
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {/* Active User Profile Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
                title="Account Menu"
              >
                <div className="h-5 w-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                  {currentUser.avatar}
                </div>
                <span className="font-semibold text-slate-800">{currentUser.name.split(' ')[0]}</span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getRoleBadge(
                    currentUser.role
                  )}`}
                >
                  {getRoleLabel(currentUser.role)}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-slate-200 p-2.5 z-50 animate-in fade-in">
                  <div className="px-2 py-1.5 border-b border-slate-100">
                    <div className="font-bold text-xs text-slate-900">{currentUser.name}</div>
                    {currentUser.email && (
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{currentUser.email}</div>
                    )}
                    {currentUser.department && (
                      <div className="text-[10px] text-slate-400 mt-0.5">{currentUser.department}</div>
                    )}
                  </div>

                  <div className="mt-1.5">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AI Paste Email Button */}
            <button
              onClick={onOpenAiCommModal}
              disabled={!hasPermission('canLogCommunication')}
              title="Paste raw email or chat text to automatically fill fields with AI"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Wand2 className="h-3.5 w-3.5 text-indigo-600" />
              <span>Paste Email (AI)</span>
            </button>

            {/* Standard Log Comm Button */}
            <button
              onClick={onOpenCommModal}
              disabled={!hasPermission('canLogCommunication')}
              title={!hasPermission('canLogCommunication') ? 'Your role has read-only access' : 'Record new communication'}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
            >
              {!hasPermission('canLogCommunication') ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>Log Comm</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg px-2 py-1.5 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'overview' ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-600'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('communications')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'communications' ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-600'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Comms</span>
        </button>

        <button
          onClick={() => setActiveTab('manufacturers')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'manufacturers' ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-600'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Vendors</span>
        </button>

        {currentUser.role === 'admin' ? (
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
              activeTab === 'permissions' ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-700 font-medium'
            }`}
          >
            <Shield className="h-4 w-4 text-indigo-600" />
            <span className="text-indigo-700 font-semibold">Permissions</span>
          </button>
        ) : (
          <div className="flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] text-slate-400 opacity-60">
            <Lock className="h-4 w-4 text-slate-300" />
            <span>(Admin Only)</span>
          </div>
        )}
      </div>
    </header>
  );
};
