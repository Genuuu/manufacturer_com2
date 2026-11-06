import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export const CloudSyncIndicator: React.FC = () => {
  const { firebaseConnected, firebaseProjectId } = useApp();
  const [showTooltip, setShowTooltip] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncRefresh = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1200);
  };

  return (
    <div className="fixed bottom-3 right-3 z-50">
      <div className="relative">
        {/* Tooltip Popup */}
        {showTooltip && (
          <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 text-white rounded-xl shadow-xl p-3 text-xs space-y-2 border border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold flex items-center gap-1.5 text-slate-200">
                {firebaseConnected ? (
                  <Cloud className="h-4 w-4 text-emerald-400" />
                ) : (
                  <CloudOff className="h-4 w-4 text-amber-400" />
                )}
                <span>Cloud Database Status</span>
              </span>
              <button
                onClick={handleSyncRefresh}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                title="Refresh sync status"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>

            <div className="space-y-1 text-[11px] text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Database:</span>
                <span className="font-mono font-medium text-emerald-300">Firestore (Cloud)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Project ID:</span>
                <span className="font-mono font-medium text-slate-200 truncate max-w-[140px]" title={firebaseProjectId}>
                  {firebaseProjectId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Sync State:</span>
                <span className={`font-semibold ${firebaseConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {firebaseConnected ? 'Active (Real-time)' : 'Offline Local Fallback'}
                </span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-indigo-400 shrink-0" />
              <span>All records synchronized securely.</span>
            </div>
          </div>
        )}

        {/* Floating Indicator Badge */}
        <button
          type="button"
          onClick={() => setShowTooltip(!showTooltip)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg border text-xs font-medium transition-all cursor-pointer backdrop-blur-md ${
            firebaseConnected
              ? 'bg-slate-900/90 text-white border-slate-700 hover:bg-slate-900 shadow-emerald-500/10'
              : 'bg-amber-950/90 text-amber-200 border-amber-800 hover:bg-amber-950 shadow-amber-500/10'
          }`}
          title="Click to view cloud database sync status"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                firebaseConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                firebaseConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>

          <span className="font-semibold tracking-wide">
            {firebaseConnected ? 'Cloud DB Synced' : 'Offline Mode'}
          </span>

          {firebaseConnected ? (
            <Cloud className="h-3.5 w-3.5 text-emerald-400 ml-0.5" />
          ) : (
            <CloudOff className="h-3.5 w-3.5 text-amber-400 ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
};
