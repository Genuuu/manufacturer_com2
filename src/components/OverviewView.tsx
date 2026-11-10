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
  onPreviewDoc,
}) => {
  const { manufacturers, communications, updateCommunication, hasPermission, setActiveTab } = useApp();

  // Filter by specific manufacturer or 'ALL'
  const [selectedMId, setSelectedMId] = useState<string>('ALL');
  // Toggle to show/hide what requires an action
  const [showActionRequiredPanel, setShowActionRequiredPanel] = useState<boolean>(false);
  // Track per-card expanded action required details on supplier overview cards
  const [expandedSupplierActionId, setExpandedSupplierActionId] = useState<string | null>(null);
  // Inline quick-edit state for updating what requires action (nextAction)
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

  // Status Counts for Selected Scope
  const scopeStatusCounts = {
    Completed: manufacturerComms.filter(
      c => c.status === 'Completed' || c.status === 'Reply Received'
    ).length,
    'Awaiting Reply': manufacturerComms.filter(c => c.status === 'Awaiting Reply').length,
    'Information Received': manufacturerComms.filter(
      c => c.status === 'Information Received'
    ).length,
    'Action Required': manufacturerComms.filter(
      c =>
        c.status === 'Action Required' ||
        c.status === 'Pending Review' ||
        (Boolean(c.nextAction && c.nextAction.trim()) &&
          c.status !== 'Completed' &&
          c.status !== 'Reply Received')
    ).length,
  };

  const scopeTotalComms = manufacturerComms.length || 1;

  // Channel Breakdown for Selected Scope
  const channelMap = new Map<string, number>();
  manufacturerComms.forEach(c => {
    channelMap.set(c.channel, (channelMap.get(c.channel) || 0) + 1);
  });

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
    <div className="space-y-5">
      
      {/* TOP EXECUTIVE DASHBOARD BANNER & MANUFACTURER SELECTOR */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-sm border border-slate-800 space-y-4 sm:space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-white">
                  Executive Overview & Supplier Insights
                </h1>
                <span className="text-[10px] font-mono bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded font-semibold">
                  Live Tracker
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Inspect overall procurement status or select a specific manufacturer for detailed analysis
              </p>
            </div>
          </div>

          {/* Manufacturer Selector Dropdown + Action Required Button */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setShowActionRequiredPanel(prev => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                showActionRequiredPanel
                  ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                  : actionRequired.length > 0
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>
                {showActionRequiredPanel
                  ? 'Hide What Requires Action'
                  : `Show What Requires Action (${actionRequired.length})`}
              </span>
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-300 font-medium hidden xl:flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-indigo-400" />
                <span>Supplier:</span>
              </span>
              <select
                value={selectedMId}
                onChange={e => setSelectedMId(e.target.value)}
                className="w-full sm:w-60 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Manufacturers ({manufacturers.length} Suppliers)</option>
                {manufacturers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.id} · {m.name} ({m.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Top 4 Global KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
          <div className="bg-slate-800/80 border border-slate-700 p-3 sm:p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Active Suppliers</span>
              <Building2 className="h-4 w-4 text-emerald-400 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {activeManufacturers.length}
              <span className="text-xs font-normal text-slate-400 ml-1.5">
                / {manufacturers.length} total
              </span>
            </div>
            <div className="text-[10px] text-emerald-400 font-medium">
              Evaluated hardware & PCB vendors
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-3 sm:p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Active Comms</span>
              <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {activeComms.length}
              <span className="text-xs font-normal text-slate-400 ml-1.5">
                / {communications.length} logs
              </span>
            </div>
            <div className="text-[10px] text-indigo-300 font-medium">
              Open threads in progress
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-3 sm:p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Awaiting Reply</span>
              <Mail className="h-4 w-4 text-amber-400 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400">
              {awaitingReply.length}
            </div>
            <div className="text-[10px] text-amber-300/90 font-medium">
              Pending vendor response
            </div>
          </div>

          {/* Interactive Card 4: Action Required */}
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
            className={`p-3 sm:p-3.5 rounded-xl space-y-1 transition-all cursor-pointer select-none ${
              showActionRequiredPanel
                ? 'bg-rose-950/90 border-2 border-rose-500 ring-2 ring-rose-500/30'
                : 'bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-rose-500/60'
            }`}
          >
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] font-bold uppercase tracking-wider">Action Required</span>
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-xl sm:text-2xl font-black text-rose-400">
                {actionRequired.length}
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-500/30">
                {showActionRequiredPanel ? 'Hide Details ▲' : 'View What Needs Action ▼'}
              </span>
            </div>
            <div className="text-[10px] text-rose-300/90 font-medium">
              Click to inspect required actions
            </div>
          </div>
        </div>
      </div>

      {/* EXPANDABLE "WHAT REQUIRES AN ACTION" INSPECTOR PANEL */}
      {showActionRequiredPanel && (
        <div className="bg-white rounded-2xl border-2 border-rose-200 shadow-sm overflow-hidden animate-in fade-in">
          <div className="p-4 bg-rose-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-sm sm:text-base text-white">
                    Action Required & Pending Review Breakdown
                  </h2>
                  <span className="text-[10px] font-mono bg-rose-500/30 text-rose-100 border border-rose-400/30 px-2 py-0.5 rounded font-semibold">
                    {scopedActionRequired.length} {scopedActionRequired.length === 1 ? 'Item' : 'Items'}
                    {selectedMId !== 'ALL' && selectedManufacturer ? ` for ${selectedManufacturer.name}` : ' Total'}
                  </span>
                </div>
                <p className="text-xs text-rose-200 mt-0.5">
                  Showing exact engineering decisions, reviews, and follow-up actions required across threads
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('communications')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-800/80 hover:bg-rose-800 text-rose-100 border border-rose-700 transition-colors cursor-pointer"
              >
                Open in Comm Logs →
              </button>
              <button
                type="button"
                onClick={() => setShowActionRequiredPanel(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/70 hover:bg-slate-900 text-slate-200 border border-rose-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-rose-50/30 space-y-3">
            {scopedActionRequired.length === 0 ? (
              <div className="p-8 bg-white rounded-xl border border-slate-200 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <div className="font-bold text-sm text-slate-900">
                  No Pending Action Items {selectedMId !== 'ALL' && selectedManufacturer ? `for ${selectedManufacturer.name}` : ''}
                </div>
                <p className="text-xs text-slate-500">
                  All communications are either completed, awaiting vendor reply, or informational.
                </p>
                {selectedMId !== 'ALL' && actionRequired.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMId('ALL')}
                    className="mt-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Show All {actionRequired.length} Action Items Across All Suppliers
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {scopedActionRequired.map(item => {
                  const isEditingThis = editingActionId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-rose-200/90 p-3.5 sm:p-4 shadow-2xs space-y-3 hover:border-rose-300 transition-all"
                    >
                      {/* Top Bar: Supplier, Thread, Status & Date */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                            {item.manufacturerId}
                          </span>
                          <span className="font-bold text-sm text-slate-900">
                            {item.manufacturerName}
                          </span>
                          <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                            Thread {item.threadId}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {item.channel}
                          </span>
                          <span className="font-mono text-xs text-slate-500">
                            Logged: {item.date}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.followUpDate && (
                            <span className="font-mono text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                              Follow-up Due: {item.followUpDate}
                            </span>
                          )}
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                              item.status === 'Action Required'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : item.status === 'Pending Review'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {/* Highlighted Box: WHAT REQUIRES AN ACTION */}
                      <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                            <span>What Requires Action:</span>
                          </span>
                          {hasPermission('canEditCommunication') && !isEditingThis && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingActionId(item.id);
                                setEditingActionText(item.nextAction || item.keyOutcome || '');
                              }}
                              className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                            >
                              {item.nextAction ? 'Edit Action Note' : '+ Specify Exact Action'}
                            </button>
                          )}
                        </div>

                        {isEditingThis ? (
                          <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            <input
                              type="text"
                              value={editingActionText}
                              onChange={e => setEditingActionText(e.target.value)}
                              placeholder="Specify what action is required (e.g. Approve PCB stackup v2, confirm MOQ pricing)..."
                              className="flex-1 px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                            />
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveQuickActionText(item.id)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                Save Action
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingActionId(null);
                                  setEditingActionText('');
                                }}
                                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs sm:text-sm font-bold text-rose-950 leading-relaxed">
                            {item.nextAction ? (
                              item.nextAction
                            ) : (
                              <span>
                                {item.keyOutcome || item.subject}
                                <span className="ml-2 text-[11px] font-normal text-rose-700 italic">
                                  (Derived from latest outcome — click &ldquo;+ Specify Exact Action&rdquo; to customize)
                                </span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Subject & Key Outcome Context */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                            Communication Subject:
                          </span>
                          <div className="font-semibold text-slate-900">{item.subject}</div>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                            Key Outcome / Context:
                          </span>
                          <div className="text-slate-700 font-medium line-clamp-2">{item.keyOutcome}</div>
                        </div>
                      </div>

                      {/* Direct Action Footer */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedMId(item.manufacturerId)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition-colors cursor-pointer"
                          >
                            Inspect {item.manufacturerName}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenCommModalWithManufacturer(item.manufacturerId)}
                            disabled={!hasPermission('canLogCommunication')}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            + Log Follow-up / Reply
                          </button>
                        </div>

                        {hasPermission('canEditCommunication') && (
                          <button
                            type="button"
                            onClick={() => handleMarkCompleted(item.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Mark Action Completed</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK SUPPLIER PILL SELECTOR BAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 shrink-0">
          Quick Select:
        </span>
        <button
          onClick={() => setSelectedMId('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedMId === 'ALL'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Suppliers ({manufacturers.length})
        </button>

        <button
          type="button"
          onClick={() => setShowActionRequiredPanel(prev => !prev)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
            showActionRequiredPanel
              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
          }`}
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>What Requires Action ({actionRequired.length})</span>
        </button>

        {manufacturers.map(m => {
          const isSelected = selectedMId === m.id;
          const count = communications.filter(c => c.manufacturerId === m.id).length;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMId(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="font-mono text-[10px] opacity-75">{m.id}</span>
              <span>{m.name}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* IF A SPECIFIC MANUFACTURER IS SELECTED: DETAILED SUPPLIER OVERVIEW */}
      {selectedMId !== 'ALL' && selectedManufacturer && (
        <div className="space-y-5 animate-in fade-in">
          
          {/* Detailed Supplier Dossier Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-start sm:items-center gap-3">
                <span className="font-mono text-xs sm:text-sm font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shrink-0">
                  {selectedManufacturer.id}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-base sm:text-lg text-slate-900">
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
                  <p className="text-xs text-slate-500">
                    Detailed Manufacturer Dossier & Communication Summary
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {scopedActionRequired.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowActionRequiredPanel(prev => !prev)}
                    className="w-full sm:w-auto justify-center px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>
                      {showActionRequiredPanel
                        ? 'Hide Required Actions'
                        : `Show What Requires Action (${scopedActionRequired.length})`}
                    </span>
                  </button>
                )}
                <button
                  onClick={() =>
                    onOpenCommModalWithManufacturer(selectedManufacturer.id)
                  }
                  disabled={!hasPermission('canLogCommunication')}
                  className="w-full sm:w-auto justify-center px-3.5 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log Comm for {selectedManufacturer.name}</span>
                </button>
              </div>
            </div>

            {/* Dossier Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Website & Contact Portal
                </span>
                {selectedManufacturer.website ? (
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5 min-w-0">
                    <Globe className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <a
                      href={
                        selectedManufacturer.website.startsWith('http')
                          ? selectedManufacturer.website
                          : `https://${selectedManufacturer.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline text-indigo-700 truncate"
                    >
                      {selectedManufacturer.website}
                    </a>
                    <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" />
                  </div>
                ) : (
                  <div className="text-slate-400 italic">No website listed</div>
                )}
                <div className="text-[11px] text-slate-600 font-medium pt-1 break-words">
                  Portal: {selectedManufacturer.contactPortal || 'Direct website / email'}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Products / Services of Interest
                </span>
                <p className="font-semibold text-slate-900 leading-relaxed">
                  {selectedManufacturer.productsOfInterest || 'General fabrication & sourcing'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Engineering & Sourcing Notes
                </span>
                <p className="text-slate-700 font-medium leading-relaxed">
                  {selectedManufacturer.notes || 'No special notes recorded.'}
                </p>
              </div>
            </div>
          </div>

          {/* Supplier Specific Charts & Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Status Breakdown for this Manufacturer */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Status Breakdown ({selectedManufacturer.name})</span>
                </h3>
                <span className="font-mono text-xs font-bold text-indigo-700">
                  {manufacturerComms.length} Total Comms
                </span>
              </div>

              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${(scopeStatusCounts['Completed'] / scopeTotalComms) * 100}%` }}
                  className="bg-emerald-500 h-full"
                />
                <div
                  style={{ width: `${(scopeStatusCounts['Awaiting Reply'] / scopeTotalComms) * 100}%` }}
                  className="bg-amber-500 h-full"
                />
                <div
                  style={{ width: `${(scopeStatusCounts['Information Received'] / scopeTotalComms) * 100}%` }}
                  className="bg-blue-500 h-full"
                />
                <div
                  style={{ width: `${(scopeStatusCounts['Action Required'] / scopeTotalComms) * 100}%` }}
                  className="bg-rose-500 h-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
                <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-100 flex items-center justify-between">
                  <span className="font-medium text-emerald-900">Completed / Replied</span>
                  <span className="font-bold text-emerald-950 font-mono">{scopeStatusCounts['Completed']}</span>
                </div>
                <div className="p-2 bg-amber-50/60 rounded-lg border border-amber-100 flex items-center justify-between">
                  <span className="font-medium text-amber-900">Awaiting Reply</span>
                  <span className="font-bold text-amber-950 font-mono">{scopeStatusCounts['Awaiting Reply']}</span>
                </div>
                <div className="p-2 bg-blue-50/60 rounded-lg border border-blue-100 flex items-center justify-between">
                  <span className="font-medium text-blue-900">Info Received</span>
                  <span className="font-bold text-blue-950 font-mono">{scopeStatusCounts['Information Received']}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowActionRequiredPanel(prev => !prev)}
                  className="p-2 bg-rose-50 hover:bg-rose-100/80 rounded-lg border border-rose-200 flex items-center justify-between transition-colors cursor-pointer text-left"
                  title="Click to show what requires an action"
                >
                  <span className="font-semibold text-rose-900 underline decoration-rose-300">
                    Action Required (View)
                  </span>
                  <span className="font-bold text-rose-950 font-mono">{scopeStatusCounts['Action Required']}</span>
                </button>
              </div>
            </div>

            {/* Channel Breakdown for this Manufacturer */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                <span>Communication Channels Used ({selectedManufacturer.name})</span>
              </h3>

              <div className="space-y-2">
                {Array.from(channelMap.entries()).map(([ch, count]) => {
                  const percent = Math.round((count / scopeTotalComms) * 100);
                  return (
                    <div key={ch} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between font-medium text-slate-700">
                        <span>{ch}</span>
                        <span className="font-mono text-slate-900 font-bold">{count} ({percent}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width: `${percent}%` }} className="bg-indigo-600 h-full rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Supplier Thread Stream List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span>All Conversation Threads with {selectedManufacturer.name} ({threads.length})</span>
            </h3>

            {threads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No communications recorded yet for {selectedManufacturer.name}.
              </div>
            ) : (
              <div className="space-y-3">
                {threads.map(t => {
                  const needsAction =
                    t.latestMsg.status === 'Action Required' ||
                    t.latestMsg.status === 'Pending Review' ||
                    (Boolean(t.latestMsg.nextAction && t.latestMsg.nextAction.trim()) &&
                      t.latestMsg.status !== 'Completed' &&
                      t.latestMsg.status !== 'Reply Received');

                  return (
                    <div
                      key={t.threadId}
                      className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                        needsAction
                          ? 'bg-rose-50/30 border-rose-200'
                          : 'bg-slate-50 border-slate-200/90'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">
                            {t.threadId}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {t.firstMsg.subject}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            t.latestMsg.status === 'Completed' || t.latestMsg.status === 'Reply Received'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : t.latestMsg.status === 'Action Required'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {t.latestMsg.status}
                        </span>
                      </div>

                      <p className="text-slate-700 font-medium bg-white p-2.5 rounded-lg border border-slate-200/80">
                        <strong className="text-slate-900">Latest Outcome: </strong>
                        {t.latestMsg.keyOutcome}
                      </p>

                      {(t.latestMsg.nextAction || needsAction) && (
                        <div className="text-xs text-rose-950 bg-rose-50 px-3 py-2 rounded-lg border border-rose-200 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <strong className="text-rose-800 uppercase text-[10px] tracking-wider mr-1.5">
                              What Requires Action:
                            </strong>
                            <span className="font-semibold">
                              {t.latestMsg.nextAction || t.latestMsg.keyOutcome}
                            </span>
                          </div>
                          {t.latestMsg.followUpDate && (
                            <span className="font-mono text-[10px] font-bold bg-white text-rose-800 border border-rose-200 px-2 py-0.5 rounded">
                              Due: {t.latestMsg.followUpDate}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>{t.messages.length} entries in thread · Last updated {t.latestMsg.date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* IF 'ALL' MANUFACTURERS SELECTED: SHOW INDIVIDUAL SUPPLIER OVERVIEW CARDS */}
      {selectedMId === 'ALL' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-slate-900">
                Manufacturer-by-Manufacturer Overview Cards
              </h2>
              <p className="text-xs text-slate-500">
                Click any supplier card to inspect its complete communication dossier, documents, and threads
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {manufacturers.map(m => {
              const mComms = communications.filter(c => c.manufacturerId === m.id);
              const mThreads = new Set(mComms.map(c => c.threadId)).size;
              const pendingCount = mComms.filter(
                c => c.status !== 'Completed' && c.status !== 'Reply Received'
              ).length;
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
              const isActionExpanded = expandedSupplierActionId === m.id;

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMId(m.id)}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                            {m.id}
                          </span>
                          <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {m.name}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                          {m.productsOfInterest || 'General fabrication & sourcing'}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          m.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    {/* Mini Metrics Bar */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                        <div className="text-sm font-black text-slate-900">{mThreads}</div>
                        <div className="text-[10px] text-slate-500 font-medium">Threads</div>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                        <div className="text-sm font-black text-slate-900">{mComms.length}</div>
                        <div className="text-[10px] text-slate-500 font-medium">Messages</div>
                      </div>
                      <div className="p-2 bg-amber-50/70 rounded-lg border border-amber-200/60">
                        <div className="text-sm font-black text-amber-700">{pendingCount}</div>
                        <div className="text-[10px] text-amber-800 font-medium">Open</div>
                      </div>
                    </div>

                    {/* Per-Supplier "Show What Requires Action" Toggle & Breakdown */}
                    {mActionItems.length > 0 && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="rounded-xl border border-rose-200 bg-rose-50/70 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSupplierActionId(isActionExpanded ? null : m.id)
                          }
                          className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-rose-800 hover:bg-rose-100/70 transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                            <span>
                              {mActionItems.length} Action Required —{' '}
                              {isActionExpanded ? 'Hide Details' : 'Show What Needs Action'}
                            </span>
                          </span>
                          <span className="text-[10px] font-mono bg-rose-200/70 text-rose-900 px-1.5 py-0.5 rounded">
                            {isActionExpanded ? '▲' : '▼'}
                          </span>
                        </button>

                        {isActionExpanded && (
                          <div className="p-2.5 bg-white border-t border-rose-200 space-y-2 text-xs">
                            {mActionItems.map(act => (
                              <div
                                key={act.id}
                                className="p-2 rounded-lg bg-rose-50/50 border border-rose-100 space-y-1"
                              >
                                <div className="flex items-center justify-between text-[10px] font-mono text-rose-700">
                                  <span className="font-bold">{act.threadId} · {act.status}</span>
                                  <span>{act.date}</span>
                                </div>
                                <div className="font-bold text-slate-900 text-[11px]">
                                  {act.nextAction || act.keyOutcome || act.subject}
                                </div>
                                {act.nextAction && (
                                  <div className="text-[10px] text-slate-500 truncate">
                                    Re: {act.subject}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Latest Activity Box */}
                    {latestComm ? (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>Latest ({latestComm.threadId})</span>
                          <span>{latestComm.date}</span>
                        </div>
                        <div className="font-semibold text-slate-900 truncate">
                          {latestComm.subject}
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2">
                          {latestComm.keyOutcome}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-slate-400 text-xs text-center">
                        No communications logged yet
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-indigo-600 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>Inspect Supplier Overview</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>

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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
