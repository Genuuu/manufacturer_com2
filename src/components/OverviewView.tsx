import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CommunicationEntry } from '../types';
import { compareCommByEntryOrder } from '../utils/spreadsheetSync';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Building2,
  CheckCircle2,
  AlertCircle,
  Mail,
  MessageSquare,
  Globe,
  FileText,
  ExternalLink,
  Filter,
  Plus,
  ArrowRight,
  Layers,
} from 'lucide-react';

interface OverviewViewProps {
  onOpenCommModalWithManufacturer: (mId: string) => void;
  onPreviewDoc: (filename: string, title: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onOpenCommModalWithManufacturer,
}) => {
  const { manufacturers, communications, updateCommunication, hasPermission, setActiveTab } = useApp();

  const [selectedMId, setSelectedMId] = useState<string>('ALL');
  const [showActionRequiredPanel, setShowActionRequiredPanel] = useState<boolean>(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editingActionText, setEditingActionText] = useState<string>('');

  // Overall Metrics
  const activeComms = communications.filter(
    c => c.status !== 'Completed' && c.status !== 'Reply Received'
  );
  const awaitingReply = communications.filter(c => c.status === 'Awaiting Reply');
  const actionRequired = communications
    .filter(
      c =>
        c.status === 'Action Required' ||
        c.status === 'Pending Review' ||
        (Boolean(c.nextAction && c.nextAction.trim()) &&
          c.status !== 'Completed' &&
          c.status !== 'Reply Received')
    )
    .sort(compareCommByEntryOrder);
  const activeManufacturers = manufacturers.filter(m => m.status === 'Active');

  // Selected Manufacturer Data
  const selectedManufacturer = manufacturers.find(m => m.id === selectedMId);
  const manufacturerComms =
    selectedMId === 'ALL'
      ? communications
      : communications.filter(c => c.manufacturerId === selectedMId);

  const scopedActionRequired =
    selectedMId === 'ALL'
      ? actionRequired
      : actionRequired.filter(c => c.manufacturerId === selectedMId);

  const handleSaveQuickActionText = (commId: string) => {
    if (!hasPermission('canEditCommunication')) return;
    updateCommunication(commId, { nextAction: editingActionText.trim() || undefined });
    setEditingActionId(null);
    setEditingActionText('');
  };

  const handleMarkCompleted = (commId: string) => {
    if (!hasPermission('canEditCommunication')) return;
    updateCommunication(commId, { status: 'Completed' });
  };

  // Group Selected Comms into Threads
  const threadMap = new Map<string, CommunicationEntry[]>();
  manufacturerComms.forEach(c => {
    const tid = c.threadId || 'T001';
    if (!threadMap.has(tid)) threadMap.set(tid, []);
    threadMap.get(tid)!.push(c);
  });

  const threads = Array.from(threadMap.entries()).map(([tid, msgs]) => {
    const sorted = [...msgs].sort(compareCommByEntryOrder);
    return {
      threadId: tid,
      messages: sorted,
      latestMsg: sorted[sorted.length - 1],
      firstMsg: sorted[0],
    };
  });

  return (
    <div className="space-y-4">
      
      {/* COMPACT EXECUTIVE HEADER & 4 KPI SUMMARY CARDS */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-xs border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base text-white">Overview</h1>
              <p className="text-[11px] text-slate-400">
                Summary of suppliers, open threads, and required actions
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {actionRequired.length > 0 && (
              <button
                type="button"
                onClick={() => setShowActionRequiredPanel(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  showActionRequiredPanel
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-500/40'
                }`}
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {showActionRequiredPanel
                    ? 'Hide Actions'
                    : `Action Required (${actionRequired.length})`}
                </span>
              </button>
            )}

            <select
              value={selectedMId}
              onChange={e => setSelectedMId(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Suppliers ({manufacturers.length})</option>
              {manufacturers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.id} · {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clean 4-Metric Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="bg-slate-800/70 border border-slate-700/80 px-3.5 py-2.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Active Suppliers
              </span>
              <div className="text-lg sm:text-xl font-bold text-white mt-0.5">
                {activeManufacturers.length}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {manufacturers.length}</span>
              </div>
            </div>
            <Building2 className="h-4 w-4 text-emerald-400 shrink-0" />
          </div>

          <div
            onClick={() => setActiveTab('communications')}
            className="bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 px-3.5 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
          >
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Open Comms
              </span>
              <div className="text-lg sm:text-xl font-bold text-white mt-0.5">
                {activeComms.length}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {communications.length}</span>
              </div>
            </div>
            <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
          </div>

          <div
            onClick={() => setActiveTab('communications')}
            className="bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 px-3.5 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
          >
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Awaiting Reply
              </span>
              <div className="text-lg sm:text-xl font-bold text-amber-400 mt-0.5">
                {awaitingReply.length}
              </div>
            </div>
            <Mail className="h-4 w-4 text-amber-400 shrink-0" />
          </div>

          <div
            onClick={() => setShowActionRequiredPanel(prev => !prev)}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowActionRequiredPanel(prev => !prev);
              }
            }}
            className={`px-3.5 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all select-none ${
              showActionRequiredPanel
                ? 'bg-rose-950/90 border-2 border-rose-500'
                : 'bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/50'
            }`}
          >
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 block">
                Action Required
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg sm:text-xl font-bold text-rose-400">
                  {actionRequired.length}
                </span>
                <span className="text-[10px] font-semibold text-rose-300 underline">
                  {showActionRequiredPanel ? 'Hide' : 'Show What Needs Action'}
                </span>
              </div>
            </div>
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* SIMPLE, CLEAN "WHAT REQUIRES AN ACTION" LIST */}
      {showActionRequiredPanel && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-2xs overflow-hidden animate-in fade-in">
          <div className="px-4 py-3 bg-rose-950 text-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>What Requires Action ({scopedActionRequired.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowActionRequiredPanel(false)}
              className="text-xs font-semibold text-rose-200 hover:text-white cursor-pointer"
            >
              Close ✕
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {scopedActionRequired.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No pending actions required right now.
              </div>
            ) : (
              scopedActionRequired.map(item => {
                const isEditingThis = editingActionId === item.id;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {item.manufacturerId} · {item.threadId}
                        </span>
                        <span className="font-bold text-slate-900">{item.manufacturerName}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          {item.status}
                        </span>
                        {item.followUpDate && (
                          <span className="font-mono text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Due: {item.followUpDate}
                          </span>
                        )}
                      </div>

                      {isEditingThis ? (
                        <div className="flex items-center gap-1.5 pt-1 max-w-xl">
                          <input
                            type="text"
                            value={editingActionText}
                            onChange={e => setEditingActionText(e.target.value)}
                            placeholder="What action is required?"
                            className="flex-1 px-2.5 py-1 text-xs bg-white border border-rose-300 rounded-lg text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveQuickActionText(item.id)}
                            className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-semibold cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingActionId(null)}
                            className="px-2 py-1 text-slate-500 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="text-slate-900 font-semibold">
                          <span className="text-rose-700 font-bold mr-1.5">Action:</span>
                          {item.nextAction || item.keyOutcome || item.subject}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500 truncate">
                        Subject: {item.subject} ({item.date})
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasPermission('canEditCommunication') && !isEditingThis && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingActionId(item.id);
                            setEditingActionText(item.nextAction || item.keyOutcome || '');
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                        >
                          Edit Action
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenCommModalWithManufacturer(item.manufacturerId)}
                        disabled={!hasPermission('canLogCommunication')}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        + Reply
                      </button>
                      {hasPermission('canEditCommunication') && (
                        <button
                          type="button"
                          onClick={() => handleMarkCompleted(item.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Done</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SINGLE SUPPLIER VIEW (WHEN A SPECIFIC MANUFACTURER IS SELECTED) */}
      {selectedMId !== 'ALL' && selectedManufacturer && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedMId('ALL')}
                  className="text-xs font-semibold text-indigo-600 hover:underline mr-1 cursor-pointer"
                >
                  ← All Suppliers
                </button>
                <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                  {selectedManufacturer.id}
                </span>
                <h2 className="font-bold text-base text-slate-900">
                  {selectedManufacturer.name}
                </h2>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    selectedManufacturer.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {selectedManufacturer.status}
                </span>
              </div>
              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>{selectedManufacturer.productsOfInterest || 'General fabrication'}</span>
                {selectedManufacturer.website && (
                  <a
                    href={
                      selectedManufacturer.website.startsWith('http')
                        ? selectedManufacturer.website
                        : `https://${selectedManufacturer.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-mono"
                  >
                    <Globe className="h-3 w-3" />
                    <span>{selectedManufacturer.website.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={() => onOpenCommModalWithManufacturer(selectedManufacturer.id)}
              disabled={!hasPermission('canLogCommunication')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-40 cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Communication</span>
            </button>
          </div>

          {/* Clean Thread List for Selected Supplier */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              <span>Conversation Threads ({threads.length})</span>
            </h3>

            {threads.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No communications recorded yet for {selectedManufacturer.name}.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {threads.map(t => {
                  const needsAction =
                    t.latestMsg.status === 'Action Required' ||
                    t.latestMsg.status === 'Pending Review' ||
                    (Boolean(t.latestMsg.nextAction && t.latestMsg.nextAction.trim()) &&
                      t.latestMsg.status !== 'Completed' &&
                      t.latestMsg.status !== 'Reply Received');

                  return (
                    <div key={t.threadId} className="py-3 first:pt-1 last:pb-1 text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">
                            {t.threadId}
                          </span>
                          <span className="font-bold text-slate-900">
                            {t.firstMsg.subject}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({t.messages.length} msgs · {t.latestMsg.date})
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            t.latestMsg.status === 'Completed' || t.latestMsg.status === 'Reply Received'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : t.latestMsg.status === 'Action Required'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {t.latestMsg.status}
                        </span>
                      </div>

                      <p className="text-slate-600 line-clamp-2">
                        {t.latestMsg.keyOutcome}
                      </p>

                      {needsAction && (
                        <div className="text-xs text-rose-800 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 font-medium">
                          <strong className="mr-1">Action Required:</strong>
                          {t.latestMsg.nextAction || t.latestMsg.keyOutcome}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ALL SUPPLIERS: CLEAN, SIMPLE SUPPLIER GRID */}
      {selectedMId === 'ALL' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {manufacturers.map(m => {
            const mComms = communications.filter(c => c.manufacturerId === m.id);
            const mThreads = new Set(mComms.map(c => c.threadId)).size;
            const mActionItems = mComms.filter(
              c =>
                c.status === 'Action Required' ||
                c.status === 'Pending Review' ||
                (Boolean(c.nextAction && c.nextAction.trim()) &&
                  c.status !== 'Completed' &&
                  c.status !== 'Reply Received')
            );
            const sortedMComms = [...mComms].sort(compareCommByEntryOrder);
            const latestComm = sortedMComms[sortedMComms.length - 1];

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMId(m.id)}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-2.5">
                  {/* Header: ID, Name, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded shrink-0">
                          {m.id}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {m.name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                        {m.productsOfInterest || 'General fabrication & sourcing'}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                        m.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  {/* Single-Line Action Required Alert (Only if action is required) */}
                  {mActionItems.length > 0 && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-900 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                      <span className="font-semibold truncate">
                        Action: {mActionItems[mActionItems.length - 1].nextAction || mActionItems[mActionItems.length - 1].keyOutcome}
                      </span>
                    </div>
                  )}

                  {/* Clean 1-Line Latest Update */}
                  {latestComm ? (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{latestComm.threadId} · {latestComm.status}</span>
                        <span>{latestComm.date}</span>
                      </div>
                      <p className="text-[11px] text-slate-700 font-medium line-clamp-1">
                        {latestComm.keyOutcome || latestComm.subject}
                      </p>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic py-1">
                      No communications logged yet
                    </div>
                  )}
                </div>

                {/* Compact Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {mThreads} {mThreads === 1 ? 'thread' : 'threads'} · {mComms.length} {mComms.length === 1 ? 'msg' : 'msgs'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onOpenCommModalWithManufacturer(m.id);
                      }}
                      disabled={!hasPermission('canLogCommunication')}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] disabled:opacity-40 cursor-pointer"
                    >
                      + Log
                    </button>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
