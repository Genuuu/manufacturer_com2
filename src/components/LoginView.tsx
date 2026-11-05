import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Layers,
  Shield,
  Lock,
  UserCheck,
  LogIn,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Users,
  UserPlus,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { users, loginWithUser, loginWithGoogle, createUser, firebaseProjectId } = useApp();

  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'google' | 'team'>('google');

  // Create initial admin account state when no users exist in the database
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState('Operations & Administration');

  useEffect(() => {
    if (users.length > 0 && !users.some(u => u.id === selectedUserId)) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  const handleTeamLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const user = users.find(u => u.id === selectedUserId);
      if (!user) {
        setErrorMessage('Selected user account was not found in the database.');
        setIsLoading(false);
        return;
      }
      if (!user.isActive) {
        setErrorMessage('This user account has been suspended by an administrator.');
        setIsLoading(false);
        return;
      }

      loginWithUser(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFirstAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newName.trim() || !newEmail.trim()) {
      setErrorMessage('Please enter both your name and email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = createUser({
        name: newName.trim(),
        email: newEmail.trim(),
        role: 'admin',
        department: newDepartment.trim() || 'Administration',
        avatar: '',
        isActive: true,
      });

      if (!res.success || !res.user) {
        setErrorMessage(res.message || 'Could not create account.');
        setIsLoading(false);
        return;
      }

      loginWithUser(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register user account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Logo & Brand */}
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-500/20">
            <Layers className="h-8 w-8 text-white" />
          </div>
        </div>

        <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          FabricateOps
        </h2>
        <p className="mt-1.5 text-center text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
          Manufacturer Communication & Procurement Tracker
        </p>

        {/* Security Badge */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 shadow-inner">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span>Protected Workspace Access</span>
          </span>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-800/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-slate-700/80 sm:px-10">
          {/* Method Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-slate-900/80 p-1 rounded-xl mb-6 border border-slate-700/50">
            <button
              type="button"
              onClick={() => setActiveTab('google')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'google'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Google SSO</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'team'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Team Account</span>
            </button>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-xl bg-red-950/80 border border-red-800/80 p-4 text-xs text-red-300 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-200">Authentication Notice</p>
                <p className="mt-0.5 text-red-300/90 leading-relaxed">{errorMessage}</p>

                {errorMessage.includes('Authorized Domains') && (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setActiveTab('team');
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors text-xs cursor-pointer"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Use Team Account Sign-In Instead</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'google' ? (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-slate-200">Sign in with Google Workspace</p>
                <p className="text-xs text-slate-400">
                  Secure single sign-on using your verified company account.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm text-slate-900 bg-white hover:bg-slate-100 active:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {googleLoading ? (
                  <div className="h-5 w-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Connected to Firebase Auth ({firebaseProjectId})</span>
              </div>
            </div>
          ) : users.length === 0 ? (
            <form onSubmit={handleCreateFirstAccount} className="space-y-4">
              <div className="text-center space-y-1 mb-2">
                <p className="text-sm font-semibold text-white">Create Administrator Account</p>
                <p className="text-xs text-slate-400">
                  No users are registered in the database yet. Create your administrator profile to get started.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={newDepartment}
                  onChange={e => setNewDepartment(e.target.value)}
                  placeholder="e.g. Hardware Engineering"
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Create Admin Account & Sign In</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTeamLogin} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Select Database Account
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {users.map(u => {
                    const isSelected = u.id === selectedUserId;
                    return (
                      <div
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-950/80 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                            : 'bg-slate-900/60 border-slate-700/70 hover:bg-slate-900 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {u.avatar}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-white">{u.name}</div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold border ${
                              u.role === 'admin'
                                ? 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                                : u.role === 'manager'
                                ? 'bg-blue-950/80 text-blue-300 border-blue-800/60'
                                : u.role === 'engineer'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                          {isSelected && <UserCheck className="h-4 w-4 text-indigo-400" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !selectedUserId}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>Authorize & Open Workspace</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Security Banner */}
          <div className="mt-8 pt-6 border-t border-slate-700/60 text-center">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Role-Based Access Control (RBAC) Enforced</span>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} FabricateOps Procurement System. Internal Use Only.
        </p>
      </div>
    </div>
  );
};
