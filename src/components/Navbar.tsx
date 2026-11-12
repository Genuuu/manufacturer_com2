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
    sheetBackupConfig,
    currentDataHash,
    theme,
    setTheme,
    toggleTheme,
  } = useApp();

  const isSheetOutOfSync = Boolean(
    sheetBackupConfig && sheetBackupConfig.lastSyncedHash !== currentDataHash
  );

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  const desktopDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser.role !== 'admin' && activeTab === 'permissions') {
      setActiveTab('communications');
    }
  }, [currentUser.role, activeTab, setActiveTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inMobile = mobileDropdownRef.current && mobileDropdownRef.current.contains(target);
      const inDesktop = desktopDropdownRef.current && desktopDropdownRef.current.contains(target);
      if (!inMobile && !inDesktop) {
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
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
          <div className="flex items-center justify-between h-14 md:h-16 gap-2 lg:gap-4">
            {/* Left: Brand */}
            <div className="flex items-center gap-2 min-w-0 shrink-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" />
              </div>
              <div className="leading-tight min-w-0">
                <span className="font-bold text-slate-900 text-xs sm:text-sm lg:text-base tracking-tight block truncate">
                  Manufacturer Comms
                </span>
                <p className="text-[10px] text-slate-500 hidden xl:block whitespace-nowrap">
                  Procurement & Supplier Tracker
                </p>
              </div>
            </div>

            {/* Mobile & Small Tablet Actions (< 768px): Theme Toggle, AI Paste, Log Comm & Account Menu */}
            <div className="flex items-center gap-1.5 md:hidden shrink-0">
              <button
                type="button"
                onClick={toggleTheme}
                className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle Light/Dark Mode"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-600" />
                )}
              </button>

              <button
                onClick={onOpenAiCommModal}
                disabled={!hasPermission('canLogCommunication')}
                className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-40"
                title="AI Auto-Fill"
              >
                <Wand2 className="h-3.5 w-3.5 text-indigo-600" />
                <span>AI</span>
              </button>

              <button
                onClick={onOpenCommModal}
                disabled={!hasPermission('canLogCommunication')}
                className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 flex items-center gap-1 shadow-2xs active:scale-95 transition-transform disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Log</span>
              </button>

              {/* Mobile User Profile Dropdown */}
              <div className="relative" ref={mobileDropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="min-h-[38px] flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                >
                  <div className="h-5 w-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                    {currentUser.avatar}
                  </div>
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

                    {/* Appearance / Theme Switcher */}
                    <div className="py-2 px-1 border-b border-slate-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                        Appearance
                      </div>
                      <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                            theme === 'light'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <Sun className="h-3 w-3 text-amber-500" />
                          <span>Light</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('dark')}
                          className={`flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <Moon className="h-3 w-3 text-indigo-400" />
                          <span>Dark</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-1.5">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5 text-red-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tablet & Desktop Central Navigation Tabs (>= 768px) */}
            <nav className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 shrink-0">
              <div className="flex items-center gap-0.5 lg:gap-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center justify-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'overview'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <BarChart3
                    className={`h-3.5 w-3.5 shrink-0 ${
                      activeTab === 'overview' ? 'text-indigo-600' : 'text-slate-500'
                    }`}
                  />
                  <span>Overview</span>
                </button>

                <button
                  onClick={() => setActiveTab('communications')}
                  className={`flex items-center justify-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'communications'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <MessageSquare
                    className={`h-3.5 w-3.5 shrink-0 ${
                      activeTab === 'communications' ? 'text-indigo-600' : 'text-slate-500'
                    }`}
                  />
                  <span>Comms</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      activeTab === 'communications'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {communications.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('manufacturers')}
                  className={`flex items-center justify-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'manufacturers'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Building2
                    className={`h-3.5 w-3.5 shrink-0 ${
                      activeTab === 'manufacturers' ? 'text-indigo-600' : 'text-slate-500'
                    }`}
                  />
                  <span>Vendors</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      activeTab === 'manufacturers'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {manufacturers.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('spreadsheet')}
                  className={`flex items-center justify-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'spreadsheet'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                  title="Live Online Backup Spreadsheet & Google Sheets Sync"
                >
                  <FileSpreadsheet
                    className={`h-3.5 w-3.5 shrink-0 ${
                      activeTab === 'spreadsheet' ? 'text-emerald-600' : 'text-emerald-600/80'
                    }`}
                  />
                  <span className="hidden lg:inline">Backup Sheet</span>
                  <span className="lg:hidden">Sheet</span>
                  {sheetBackupConfig && (
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        isSheetOutOfSync ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                      }`}
                      title={
                        isSheetOutOfSync
                          ? 'Pending changes to sync to Google Sheets'
                          : 'Google Sheet backup up to date'
                      }
                    />
                  )}
                </button>

                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => setActiveTab('permissions')}
                    className={`flex items-center justify-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'permissions'
                        ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                    title="Admin Permissions & Team Settings"
                  >
                    <Shield
                      className={`h-3.5 w-3.5 shrink-0 ${
                        activeTab === 'permissions' ? 'text-indigo-600' : 'text-slate-500'
                      }`}
                    />
                    <span>Access</span>
                  </button>
                )}
              </div>
            </nav>

            {/* Tablet & Desktop Right Actions (>= 768px) */}
            <div className="hidden md:flex items-center gap-1.5 lg:gap-2 shrink-0">
              {/* Light / Dark Mode Toggle Pill */}
              <div
                className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80"
                title="Switch between Light Mode and Dark Mode"
              >
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Light Mode"
                >
                  <Sun className={`h-3.5 w-3.5 ${theme === 'light' ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span className="hidden xl:inline">Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Dark Mode"
                >
                  <Moon className={`h-3.5 w-3.5 ${theme === 'dark' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="hidden xl:inline">Dark</span>
                </button>
              </div>

              {/* Active User Profile Menu */}
              <div className="relative" ref={desktopDropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
                  title="Account Menu"
                >
                  <div className="h-5 w-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {currentUser.avatar}
                  </div>
                  <span className="font-semibold text-slate-800 hidden lg:inline">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border hidden xl:inline-block ${getRoleBadge(
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
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {currentUser.email}
                        </div>
                      )}
                      {currentUser.department && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {currentUser.department}
                        </div>
                      )}
                      <span
                        className={`inline-block mt-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getRoleBadge(
                          currentUser.role
                        )}`}
                      >
                        {getRoleLabel(currentUser.role)}
                      </span>
                    </div>

                    {/* Appearance / Theme Switcher */}
                    <div className="py-2 px-1 border-b border-slate-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                        Theme Mode
                      </div>
                      <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            theme === 'light'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <Sun className="h-3.5 w-3.5 text-amber-500" />
                          <span>Light</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('dark')}
                          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <Moon className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Dark</span>
                        </button>
                      </div>
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
                className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                <Wand2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span className="hidden xl:inline">Paste Email (AI)</span>
                <span className="xl:hidden">AI Paste</span>
              </button>

              {/* Standard Log Comm Button */}
              <button
                onClick={onOpenCommModal}
                disabled={!hasPermission('canLogCommunication')}
                title={
                  !hasPermission('canLogCommunication')
                    ? 'Your role has read-only access'
                    : 'Record new communication'
                }
                className="inline-flex items-center gap-1.5 px-3 lg:px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-xs disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                {!hasPermission('canLogCommunication') ? (
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>Log Comm</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile & Small Tablet Fixed Bottom Navigation Bar (< 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-1.5 py-1 grid grid-cols-5 items-center h-16">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl text-[10px] font-semibold transition-colors ${
            activeTab === 'overview'
              ? 'text-indigo-600 bg-indigo-50/80 font-bold'
              : 'text-slate-600'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('communications')}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl text-[10px] font-semibold transition-colors ${
            activeTab === 'communications'
              ? 'text-indigo-600 bg-indigo-50/80 font-bold'
              : 'text-slate-600'
          }`}
        >
          <div className="relative">
            <MessageSquare className="h-4 w-4" />
            <span className="absolute -top-1.5 -right-3 bg-indigo-100 text-indigo-800 text-[9px] font-mono font-bold px-1 rounded-full">
              {communications.length}
            </span>
          </div>
          <span>Comms</span>
        </button>

        <button
          onClick={() => setActiveTab('manufacturers')}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl text-[10px] font-semibold transition-colors ${
            activeTab === 'manufacturers'
              ? 'text-indigo-600 bg-indigo-50/80 font-bold'
              : 'text-slate-600'
          }`}
        >
          <div className="relative">
            <Building2 className="h-4 w-4" />
            <span className="absolute -top-1.5 -right-3 bg-slate-200 text-slate-700 text-[9px] font-mono font-bold px-1 rounded-full">
              {manufacturers.length}
            </span>
          </div>
          <span>Vendors</span>
        </button>

        <button
          onClick={() => setActiveTab('spreadsheet')}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl text-[10px] font-semibold transition-colors ${
            activeTab === 'spreadsheet'
              ? 'text-emerald-700 bg-emerald-50 font-bold'
              : 'text-slate-600'
          }`}
        >
          <div className="relative">
            <FileSpreadsheet
              className={`h-4 w-4 ${
                activeTab === 'spreadsheet' ? 'text-emerald-600' : 'text-slate-600'
              }`}
            />
            {sheetBackupConfig && (
              <span
                className={`absolute -top-1 -right-1.5 h-2 w-2 rounded-full ${
                  isSheetOutOfSync ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                }`}
              />
            )}
          </div>
          <span>Sheet</span>
        </button>

        {currentUser.role === 'admin' ? (
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl text-[10px] font-semibold transition-colors ${
              activeTab === 'permissions'
                ? 'text-indigo-600 bg-indigo-50/80 font-bold'
                : 'text-slate-600'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Access</span>
          </button>
        ) : (
          <div className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] text-[10px] text-slate-400 opacity-60">
            <Lock className="h-4 w-4 text-slate-300" />
            <span>Admin</span>
          </div>
        )}
      </nav>
    </>
  );
};
