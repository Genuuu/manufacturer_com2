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
  FileSpreadsheet,
  Sun,
  Moon,
  Mail,
  Search,
  X,
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
    searchQuery,
    setSearchQuery,
    theme,
    toggleTheme,
  } = useApp();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canViewTemplates = currentUser.role === 'admin' || currentUser.role === 'moderator';

  useEffect(() => {
    if (currentUser.role !== 'admin' && activeTab === 'permissions') {
      setActiveTab('communications');
    }
    if (!canViewTemplates && activeTab === 'templates') {
      setActiveTab('communications');
    }
  }, [currentUser.role, canViewTemplates, activeTab, setActiveTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'moderator':
        return 'Moderator';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
          <div className="flex items-center justify-between h-14 gap-3">
            {/* Zone 1: Single-Line Brand Wordmark */}
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="flex items-center gap-2 shrink-0 cursor-pointer text-left"
            >
              <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Layers className="h-4 w-4 text-indigo-400" />
              </div>
              <span className="font-bold text-slate-900 text-sm tracking-tight whitespace-nowrap">
                FabricateOps
              </span>
            </button>

            {/* Zone 2: Clean Desktop Navigation Links + Global Search */}
            <div className="hidden md:flex items-center gap-3 flex-1 justify-center max-w-3xl">
              <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 shrink-0">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'overview'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Overview
                </button>

                <button
                  onClick={() => setActiveTab('communications')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
                    activeTab === 'communications'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Comms</span>
                  <span className="text-[10px] font-mono tabular-nums text-slate-400">
                    {communications.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('manufacturers')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
                    activeTab === 'manufacturers'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Vendors</span>
                  <span className="text-[10px] font-mono tabular-nums text-slate-400">
                    {manufacturers.length}
                  </span>
                </button>

                {canViewTemplates && (
                  <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      activeTab === 'templates'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Templates
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('spreadsheet')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'spreadsheet'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sheet
                </button>

                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => setActiveTab('permissions')}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      activeTab === 'permissions'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Access
                  </button>
                )}
              </nav>

              {/* Global Search Input */}
              <div className="relative w-44 lg:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search vendors & comms..."
                  className="w-full pl-8 pr-6 py-1.5 bg-slate-100 border border-slate-200/80 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Zone 3: Streamlined Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Single-Click Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle Light/Dark Mode"
              >
                {theme === 'dark' ? (
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <Moon className="h-3.5 w-3.5 text-slate-600" />
                )}
              </button>

              {/* AI Auto-Fill Quick Button */}
              <button
                onClick={onOpenAiCommModal}
                disabled={!hasPermission('canLogCommunication')}
                title="Paste email or chat text to auto-fill with AI"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 hover:bg-indigo-100 transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Wand2 className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden lg:inline">AI Paste</span>
              </button>

              {/* Primary CTA: Log Communication */}
              <button
                onClick={onOpenCommModal}
                disabled={!hasPermission('canLogCommunication')}
                title={
                  !hasPermission('canLogCommunication')
                    ? 'Your role has read-only access'
                    : 'Record new communication'
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
              >
                {!hasPermission('canLogCommunication') ? (
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>Log Comm</span>
              </button>

              {/* User Profile Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
                  title="Account Menu"
                >
                  <div className="h-5 w-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {currentUser.avatar}
                  </div>
                  <span className="font-semibold text-slate-800 hidden xl:inline whitespace-nowrap">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-200 p-2.5 z-50">
                    <div className="px-2 py-1.5 border-b border-slate-100 space-y-0.5">
                      <div className="font-bold text-xs text-slate-900">{currentUser.name}</div>
                      {currentUser.email && (
                        <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                      )}
                      <div className="text-[11px] text-slate-500 pt-0.5">
                        {currentUser.department || 'Team Member'} ·{' '}
                        <span className="font-semibold text-indigo-600">
                          {getRoleLabel(currentUser.role)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1.5">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (< 768px) */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1 grid ${
          canViewTemplates ? 'grid-cols-6' : 'grid-cols-5'
        } items-center h-14`}
      >
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center justify-center gap-0.5 h-11 rounded-lg text-[10px] font-semibold ${
            activeTab === 'overview' ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('communications')}
          className={`flex flex-col items-center justify-center gap-0.5 h-11 rounded-lg text-[10px] font-semibold ${
            activeTab === 'communications' ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Comms</span>
        </button>

        <button
          onClick={() => setActiveTab('manufacturers')}
          className={`flex flex-col items-center justify-center gap-0.5 h-11 rounded-lg text-[10px] font-semibold ${
            activeTab === 'manufacturers' ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Vendors</span>
        </button>

        {canViewTemplates && (
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex flex-col items-center justify-center gap-0.5 h-11 rounded-lg text-[10px] font-semibold ${
              activeTab === 'templates' ? 'text-indigo-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>Templates</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('spreadsheet')}
          className={`flex flex-col items-center justify-center gap-0.5 h-11 rounded-lg text-[10px] font-semibold ${
            activeTab === 'spreadsheet' ? 'text-emerald-600 font-bold' : 'text-slate-500'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Sheet</span>
        </button>

        {currentUser.role === 'admin' ? (
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex flex-col items-center justify-center gap-0.5 h-11 rounded-lg text-[10px] font-semibold ${
              activeTab === 'permissions' ? 'text-indigo-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Access</span>
          </button>
        ) : (
          <div className="flex flex-col items-center justify-center gap-0.5 h-11 text-[10px] text-slate-300">
            <Lock className="h-4 w-4" />
            <span>Admin</span>
          </div>
        )}
      </nav>
    </>
  );
};
