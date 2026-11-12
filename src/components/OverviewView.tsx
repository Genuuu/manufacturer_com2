import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CommunicationEntry } from '../types';
import { compareCommByEntryOrder } from '../utils/spreadsheetSync';
import {
  Clock,
  Building2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Globe,
  ExternalLink,
  Plus,
  ArrowRight,
  Search,
  X,
} from 'lucide-react';

interface OverviewViewProps {
  onOpenCommModalWithManufacturer: (mId: string) => void;
  onPreviewDoc: (filename: string, title: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onOpenCommModalWithManufacturer,
}) => {
  const {
    manufacturers,
    communications,
    updateCommunication,
    hasPermission,
    setActiveTab,
    searchQuery,
    setSearchQuery,
  } = useApp();

  const [selectedMId, setSelectedMId] = useState<string>('ALL');
  const [showActionRequiredPanel, setShowActionRequiredPanel] = useState<boolean>(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editingActionText, setEditingActionText] = useState<string>('');

  // Overall Metrics
  const allThreadIds = useMemo(() => {
    return Array.from(new Set(communications.map(c => c.threadId || 'T001')));
  }, [communications]);

  const openThreadIds = useMemo(() => {
    // A thread is open if at least one entry is not Completed and not Reply Received
    const threadStatusMap = new Map<string, boolean>();
    communications.forEach(c => {
      const tid = c.threadId || 'T001';
      const isOpen = c.status !== 'Completed' && c.status !== 'Reply Received';
      if (isOpen) {
        threadStatusMap.set(tid, true);
      } else if (!threadStatusMap.has(tid)) {
        threadStatusMap.set(tid, false);
      }
    });
    return Array.from(threadStatusMap.entries()).filter(([_, isOpen]) => isOpen).map(([tid]) => tid);
  }, [communications]);

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

  // Filter suppliers by global searchQuery
  const visibleManufacturers = useMemo(() => {
    if (!searchQuery.trim()) return manufacturers;
    const q = searchQuery.toLowerCase().trim();
    return manufacturers.filter(m => {
      const mMatch =
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.productsOfInterest || '').toLowerCase().includes(q) ||
        (m.notes || '').toLowerCase().includes(q);
      if (mMatch) return true;
      return communications.some(
        c =>
          c.manufacturerId === m.id &&
          ((c.subject || '').toLowerCase().includes(q) ||
            (c.keyOutcome || '').toLowerCase().includes(q) ||
            (c.threadId || '').toLowerCase().includes(q))
      );
    });
  }, [manufacturers, communications, searchQuery]);

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
      {/* CLEAN 4-METRIC STRIP + SUPPLIER FILTER */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm text-slate-900">Workspace Overview</h1>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 tabular-nums">
              {manufacturers.length} suppliers · {communications.length} logs
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mobile Search Input */}
            <div className="relative md:hidden flex-1 min-w-[150px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <select
              value={selectedMId}
              onChange={e => setSelectedMId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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

        {/* Flat 4-Metric Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100">
          <div className="px-3 py-2 rounded-lg bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Active Suppliers</span>
              <div className="text-lg font-bold text-slate-900 tabular-nums">
                {activeManufacturers.length}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {manufacturers.length}</span>
              </div>
            </div>
            <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('communications')}
            className="px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Open Threads</span>
              <div className="text-lg font-bold text-slate-900 tabular-nums">
                {openThreadIds.length}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {allThreadIds.length}</span>
              </div>
            </div>
            <Clock className="h-4 w-4 text-indigo-600 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('communications')}
            className="px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Awaiting Reply</span>
              <div className="text-lg font-bold text-amber-600 tabular-nums">
                {awaitingReply.length}
              </div>
            </div>
            <Mail className="h-4 w-4 text-amber-600 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setShowActionRequiredPanel(prev => !prev)}
            className={`px-3 py-2 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer border ${
              showActionRequiredPanel
                ? 'bg-rose-50 border-rose-300'
                : 'bg-slate-50 border-transparent hover:border-rose-200'
            }`}
          >
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Action Required</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-rose-600 tabular-nums">
                  {actionRequired.length}
                </span>
                <span className="text-[11px] font-semibold text-rose-600 underline">
                  {showActionRequiredPanel ? 'Hide' : 'Show Actions'}
                </span>
              </div>
            </div>
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          </button>
        </div>
      </div>

      {/* ACTION REQUIRED LIST */}
      {showActionRequiredPanel && (
        <div className="bg-white rounded-xl border border-rose-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>Items Requiring Action ({scopedActionRequired.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowActionRequiredPanel(false)}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {scopedActionRequired.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-500">
                No pending actions required right now.
              </div>
            ) : (
              scopedActionRequired.map(item => {
                const isEditingThis = editingActionId === item.id;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap text-slate-500">
                        <span className="font-mono font-bold text-indigo-600">
                          {item.manufacturerId} · {item.threadId}
                        </span>
                        <span>·</span>
                        <span className="font-bold text-slate-900">{item.manufacturerName}</span>
                        <span>·</span>
                        <span className="font-semibold text-rose-600">{item.status}</span>
                        {item.followUpDate && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-amber-700 tabular-nums">
                              Due {item.followUpDate}
                            </span>
                          </>
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
                          <span className="text-rose-600 font-bold mr-1">Action:</span>
                          {item.nextAction || item.keyOutcome || item.subject}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500 truncate">
                        {item.subject} · <span className="font-mono tabular-nums">{item.date}</span>
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
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenCommModalWithManufacturer(item.manufacturerId)}
                        disabled={!hasPermission('canLogCommunication')}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        + Reply
                      </button>
                      {hasPermission('canEditCommunication') && (
                        <button
                          type="button"
                          onClick={() => handleMarkCompleted(item.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 cursor-pointer"
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

      {/* SINGLE SUPPLIER VIEW */}
      {selectedMId !== 'ALL' && selectedManufacturer && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <button
                  onClick={() => setSelectedMId('ALL')}
                  className="font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  ← All Suppliers
                </button>
                <span className="text-slate-300">|</span>
                <span className="font-mono font-bold text-indigo-600">
                  {selectedManufacturer.id}
                </span>
                <h2 className="font-bold text-sm sm:text-base text-slate-900">
                  {selectedManufacturer.name}
                </h2>
                <span className="text-slate-400">·</span>
                <span
                  className={`font-semibold ${
                    selectedManufacturer.status === 'Active'
                      ? 'text-emerald-600'
                      : 'text-slate-500'
                  }`}
                >
                  {selectedManufacturer.status}
                </span>
              </div>
              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
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
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Comm</span>
            </button>
          </div>

          {/* Thread List for Selected Supplier */}
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {threads.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No communications recorded yet for {selectedManufacturer.name}.
              </div>
            ) : (
              threads.map(t => {
                const needsAction =
                  t.latestMsg.status === 'Action Required' ||
                  t.latestMsg.status === 'Pending Review' ||
                  (Boolean(t.latestMsg.nextAction && t.latestMsg.nextAction.trim()) &&
                    t.latestMsg.status !== 'Completed' &&
                    t.latestMsg.status !== 'Reply Received');

                return (
                  <div key={t.threadId} className="p-3.5 text-xs space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600">{t.threadId}</span>
                        <span className="font-bold text-slate-900">{t.firstMsg.subject}</span>
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          · {t.messages.length} msgs · {t.latestMsg.date}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold ${
                          t.latestMsg.status === 'Completed' || t.latestMsg.status === 'Reply Received'
                            ? 'text-emerald-600'
                            : t.latestMsg.status === 'Action Required'
                            ? 'text-rose-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {t.latestMsg.status}
                      </span>
                    </div>

                    <p className="text-slate-600 line-clamp-2">{t.latestMsg.keyOutcome}</p>

                    {needsAction && (
                      <div className="text-xs text-rose-700 font-semibold pt-0.5">
                        Action Required: {t.latestMsg.nextAction || t.latestMsg.keyOutcome}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ALL SUPPLIERS: FLAT, SINGLE-ELEVATION SUPPLIER GRID */}
      {selectedMId === 'ALL' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleManufacturers.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
              No suppliers match "{searchQuery}".
            </div>
          ) : (
            visibleManufacturers.map(m => {
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
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 transition-colors cursor-pointer flex flex-col justify-between space-y-2.5 group"
                >
                  <div className="space-y-1.5">
                    {/* Header: Unboxed ID, Name, Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-indigo-600 shrink-0">
                            {m.id}
                          </span>
                          <span className="text-slate-300">·</span>
                          <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                            {m.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {m.productsOfInterest || 'General fabrication & sourcing'}
                        </p>
                      </div>

                      <span
                        className={`text-[11px] font-semibold shrink-0 ${
                          m.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    {/* Action Required or Latest Update (no nested card box) */}
                    {mActionItems.length > 0 ? (
                      <div className="pt-1 text-xs text-rose-600 font-semibold flex items-center gap-1.5 truncate">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          Action:{' '}
                          {mActionItems[mActionItems.length - 1].nextAction ||
                            mActionItems[mActionItems.length - 1].keyOutcome}
                        </span>
                      </div>
                    ) : latestComm ? (
                      <div className="pt-1 text-xs text-slate-600 line-clamp-1">
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums mr-1.5">
                          {latestComm.date}:
                        </span>
                        <span>{latestComm.keyOutcome || latestComm.subject}</span>
                      </div>
                    ) : (
                      <div className="pt-1 text-[11px] text-slate-400">
                        No communications logged yet
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {mThreads} {mThreads === 1 ? 'thread' : 'threads'} · {mComms.length}{' '}
                      {mComms.length === 1 ? 'log' : 'logs'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onOpenCommModalWithManufacturer(m.id);
                        }}
                        disabled={!hasPermission('canLogCommunication')}
                        className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-semibold text-[11px] disabled:opacity-40 cursor-pointer transition-colors"
                      >
                        + Log
                      </button>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
