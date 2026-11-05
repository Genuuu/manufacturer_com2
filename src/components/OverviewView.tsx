import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CommunicationEntry, CommStatus } from '../types';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Building2,
  Mail,
  AlertCircle,
  MessageSquare,
  Globe,
  ExternalLink,
  Plus,
  ArrowRight,
  Filter,
  CheckCircle2,
  Calendar,
  FileText,
  Send,
  Eye,
} from 'lucide-react';

interface OverviewViewProps {
  onOpenCommModalWithManufacturer: (mId: string) => void;
  onPreviewDoc: (filename: string, title: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onOpenCommModalWithManufacturer,
  onPreviewDoc,
}) => {
  const { manufacturers, communications, hasPermission } = useApp();

  // Selected Manufacturer Filter for Detailed Individual Summary
  const [selectedMId, setSelectedMId] = useState<string>('ALL');

  // Overall Metrics
  const activeComms = communications.filter(c => c.status !== 'Completed');
  const awaitingReply = communications.filter(c => c.status === 'Awaiting Reply');
  const actionRequired = communications.filter(
    c => c.status === 'Action Required' || c.status === 'Pending Review'
  );
  const activeManufacturers = manufacturers.filter(m => m.status === 'Active');
  const totalCommsCount = communications.length || 1;

  // Selected Manufacturer Data
  const selectedManufacturer = manufacturers.find(m => m.id === selectedMId);
  const manufacturerComms = selectedMId === 'ALL'
    ? communications
    : communications.filter(c => c.manufacturerId === selectedMId);

  // Status Counts for Selected Scope
  const scopeStatusCounts = {
    'Completed': manufacturerComms.filter(c => c.status === 'Completed').length,
    'Awaiting Reply': manufacturerComms.filter(c => c.status === 'Awaiting Reply').length,
    'Information Received': manufacturerComms.filter(c => c.status === 'Information Received').length,
    'Action Required': manufacturerComms.filter(c => c.status === 'Action Required' || c.status === 'Pending Review').length,
  };

  const scopeTotalComms = manufacturerComms.length || 1;

  // Channel Breakdown
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
    const sorted = [...msgs].sort((a, b) => (a.date > b.date ? 1 : -1));
    return {
      threadId: tid,
      messages: sorted,
      latestMsg: sorted[sorted.length - 1],
      firstMsg: sorted[0],
    };
  });

  return (
    <div className="space-y-6">
      
      {/* GLOBAL EXECUTIVE SUMMARY HEADER */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                Procurement & Manufacturer Overview
              </h1>
              <p className="text-xs text-slate-300">
                Executive dashboard and detailed supplier-by-supplier summary analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              Database Scope: <strong>{manufacturers.length} Suppliers</strong> · <strong>{communications.length} Comms</strong>
            </span>
          </div>
        </div>

        {/* Top 4 Global Key KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          
          <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Comms</span>
              <Clock className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white">{activeComms.length}</div>
            <div className="text-[10px] text-indigo-300 font-medium">Unresolved threads</div>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Awaiting Reply</span>
              <Mail className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">{awaitingReply.length}</div>
            <div className="text-[10px] text-amber-300 font-medium">Outbound vendor replies</div>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Action Needed</span>
              <AlertCircle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400">{actionRequired.length}</div>
            <div className="text-[10px] text-rose-300 font-medium">Requires engineering review</div>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Suppliers</span>
              <Building2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">{activeManufacturers.length}</div>
            <div className="text-[10px] text-emerald-300 font-medium">Section A Manufacturers</div>
          </div>

        </div>
      </div>

      {/* SUPPLIER SELECTOR BAR FOR DETAILED SUMMARY */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Filter className="h-4 w-4 text-indigo-600" />
              <span>Detailed Manufacturer Summary & Inspection</span>
            </h2>
            <p className="text-xs text-slate-500">
              Select a specific supplier to view their detailed dossier, metrics, and thread history
            </p>
          </div>

          {/* Supplier Selector Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-700 shrink-0">Select Supplier:</label>
            <select
              value={selectedMId}
              onChange={e => setSelectedMId(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">🌐 All Manufacturers (Combined Summary)</option>
              {manufacturers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.id} · {m.name} ({m.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Manufacturer Pill Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          <button
            onClick={() => setSelectedMId('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedMId === 'ALL'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Suppliers
          </button>

          {manufacturers.map(m => {
            const isSelected = selectedMId === m.id;
            const count = communications.filter(c => c.manufacturerId === m.id).length;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMId(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{m.name}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* IF A SPECIFIC MANUFACTURER IS SELECTED */}
      {selectedMId !== 'ALL' && selectedManufacturer && (
        <div className="space-y-5">
          
          {/* Detailed Supplier Dossier Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2.5 py-1 rounded-lg">
                  {selectedManufacturer.id}
                </span>
                <div>
                  <h2 className="font-extrabold text-lg text-slate-900">{selectedManufacturer.name}</h2>
                  <p className="text-xs text-slate-500 font-mono">Registered Supplier Entry (Section A)</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                  selectedManufacturer.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {selectedManufacturer.status}
                </span>

                <button
                  onClick={() => onOpenCommModalWithManufacturer(selectedManufacturer.id)}
                  disabled={!hasPermission('canLogCommunication')}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log Comm for {selectedManufacturer.name}</span>
                </button>
              </div>
            </div>

            {/* Dossier Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Website & Contact Portal</span>
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <a
                    href={selectedManufacturer.website.startsWith('http') ? selectedManufacturer.website : `https://${selectedManufacturer.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline text-indigo-700 truncate"
                  >
                    {selectedManufacturer.website}
                  </a>
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </div>
                <div className="text-[11px] text-slate-600 font-medium mt-1">
                  Portal: {selectedManufacturer.contactPortal}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Products / Services Offered</span>
                <p className="font-semibold text-slate-800 leading-relaxed">
                  {selectedManufacturer.productsOfInterest || 'General PCB fabrication and electronic component sourcing'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Supplier Internal Notes</span>
                <p className="text-slate-700 font-medium leading-relaxed">
                  {selectedManufacturer.notes || 'No special procurement constraints recorded.'}
                </p>
              </div>

            </div>
          </div>

          {/* Supplier Specific Charts & Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Chart 1: Status Breakdown for this Manufacturer */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Communication Status Breakdown ({selectedManufacturer.name})</span>
                </h3>
                <span className="font-mono text-xs font-bold text-indigo-700">{manufacturerComms.length} Comms</span>
              </div>

              {/* Progress bar */}
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

              {/* Metric grid */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between">
                  <span className="font-medium text-emerald-900">Completed</span>
                  <span className="font-bold text-emerald-950 font-mono">{scopeStatusCounts['Completed']}</span>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 flex items-center justify-between">
                  <span className="font-medium text-amber-900">Awaiting Reply</span>
                  <span className="font-bold text-amber-950 font-mono">{scopeStatusCounts['Awaiting Reply']}</span>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
                  <span className="font-medium text-blue-900">Info Received</span>
                  <span className="font-bold text-blue-950 font-mono">{scopeStatusCounts['Information Received']}</span>
                </div>
                <div className="p-2 bg-rose-50 rounded-lg border border-rose-100 flex items-center justify-between">
                  <span className="font-medium text-rose-900">Action Needed</span>
                  <span className="font-bold text-rose-950 font-mono">{scopeStatusCounts['Action Required']}</span>
                </div>
              </div>
            </div>

            {/* Chart 2: Communication Channels Breakdown */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                <span>Channels & Touchpoints ({selectedManufacturer.name})</span>
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
                        <div
                          style={{ width: `${percent}%` }}
                          className="bg-indigo-600 h-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Supplier Thread Stream List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              <span>Communication Threads for {selectedManufacturer.name} ({threads.length})</span>
            </h3>

            {threads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No communications recorded yet for this manufacturer.
              </div>
            ) : (
              <div className="space-y-3">
                {threads.map(t => (
                  <div key={t.threadId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">
                          Thread {t.threadId}
                        </span>
                        <span className="font-bold text-slate-900">{t.firstMsg.subject}</span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        t.latestMsg.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {t.latestMsg.status}
                      </span>
                    </div>

                    <p className="text-slate-700 font-medium bg-white p-2.5 rounded-lg border border-slate-200/80">
                      <strong>Latest Outcome: </strong> {t.latestMsg.keyOutcome}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>{t.messages.length} messages · Last updated {t.latestMsg.date}</span>
                      {t.latestMsg.nextAction && (
                        <span className="text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                          Next: {t.latestMsg.nextAction}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* IF ALL MANUFACTURERS SIDE-BY-SIDE VIEW IS SELECTED */}
      {selectedMId === 'ALL' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              <span>Manufacturer Overview Breakdown ({manufacturers.length} Suppliers)</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">Side-by-Side Analysis</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {manufacturers.map(m => {
              const mComms = communications.filter(c => c.manufacturerId === m.id);
              const mThreads = new Set(mComms.map(c => c.threadId)).size;
              const pendingCount = mComms.filter(c => c.status !== 'Completed').length;
              const latestComm = [...mComms].sort((a, b) => (a.date < b.date ? 1 : -1))[0];

              return (
                <div
                  key={m.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        {m.id}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        m.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{m.name}</h3>
                      <a
                        href={m.website.startsWith('http') ? m.website : `https://${m.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-mono truncate mt-0.5"
                      >
                        <span>{m.website}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {/* Summary Metrics */}
                    <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80">
                        <div className="text-xs font-bold text-slate-900">{mThreads}</div>
                        <div className="text-[9px] text-slate-500 font-medium">Threads</div>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80">
                        <div className="text-xs font-bold text-slate-900">{mComms.length}</div>
                        <div className="text-[9px] text-slate-500 font-medium">Messages</div>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-lg border border-amber-200/80">
                        <div className="text-xs font-bold text-amber-700">{pendingCount}</div>
                        <div className="text-[9px] text-amber-800 font-medium">Pending</div>
                      </div>
                    </div>

                    {latestComm ? (
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="text-[10px] text-slate-400 font-mono font-semibold">
                          Latest ({latestComm.date}):
                        </div>
                        <p className="text-[11px] text-slate-800 font-medium line-clamp-2">
                          {latestComm.keyOutcome}
                        </p>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-lg text-slate-400 text-xs italic">
                        No communications recorded yet
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedMId(m.id)}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-indigo-200 mt-2"
                  >
                    <span>Inspect Detailed Summary</span>
                    <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
                  </button>

                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
