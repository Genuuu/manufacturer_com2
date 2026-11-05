import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Layers,
  Shield,
  Lock,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginWithGoogle, firebaseProjectId } = useApp();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

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

  const copyDomain = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
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
          
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-slate-200">Sign In with Google</p>
              <p className="text-xs text-slate-400">
                Single sign-on with your verified Google account. Access is restricted to authorized team members.
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-red-950/80 border border-red-800/80 p-4 text-xs text-red-300 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="font-semibold text-red-200">Authentication Notice</p>
                  <p className="text-red-300/90 leading-relaxed">{errorMessage}</p>

                  {errorMessage.includes('Authorized Domains') && currentHostname && (
                    <div className="mt-2 pt-2 border-t border-red-900/60">
                      <p className="text-[11px] text-red-300/80 mb-1.5">
                        Domain to add in Firebase Console:
                      </p>
                      <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 px-2.5 rounded-lg border border-red-900/50">
                        <code className="text-[11px] font-mono text-white flex-1 truncate">
                          {currentHostname}
                        </code>
                        <button
                          type="button"
                          onClick={copyDomain}
                          className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 shrink-0 cursor-pointer"
                          title="Copy hostname to clipboard"
                        >
                          {copiedDomain ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

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
              <span>Firebase Auth Project: {firebaseProjectId}</span>
            </div>
          </div>

          {/* Security Banner */}
          <div className="mt-8 pt-6 border-t border-slate-700/60 text-center">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Google OAuth Authentication Enforced</span>
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
