import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Building2,
  CheckCircle2,
  AlertCircle,
  Mail,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  MessageSquare,
} from 'lucide-react';

export const SummaryMetricsPanel: React.FC = () => {
  const { communications, manufacturers } = useApp();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showActionDetails, setShowActionDetails] = useState(false);

  // Key Metrics Calculations
  const activeComms = communications.filter(c => c.status !== 'Completed' && c.status !== 'Reply Received');
  const awaitingReply = communications.filter(c => c.status === 'Awaiting Reply');
  const actionRequired = communications.filter(
    c =>
      c.status === 'Action Required' ||
      c.status === 'Pending Review' ||
      (Boolean(c.nextAction && c.nextAction.trim()) &&
        c.status !== 'Completed' &&
        c.status !== 'Reply Received')
  );
  const activeManufacturers = manufacturers.filter(m => m.status === 'Active');

  // Status Breakdown Data for Chart
  const statusCounts = {
    'Completed': communications.filter(c => c.status === 'Completed' || c.status === 'Reply Received').length,
    'Awaiting Reply': awaitingReply.length,
    'Information Received': communications.filter(c => c.status === 'Information Received').length,
    'Action Required': actionRequired.length,
  };

  const totalComms = communications.length || 1;

  // Manufacturer Activity Counts
  const manufacturerActivityMap = new Map<string, number>();
  communications.forEach(c => {
    const key = c.manufacturerName || c.manufacturerId;
    manufacturerActivityMap.set(key, (manufacturerActivityMap.get(key) || 0) + 1);
  });

  const topManufacturers = Array.from(manufacturerActivityMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const maxManufacturerCount = topManufacturers[0]?.count || 1;

  // Recent Updates Feed (Sort newest first)
  const recentUpdates = [...communications]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 4);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all">
      
      {/* Header Bar */}
      <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <span>Executive Procurement Summary</span>
              <span className="text-[10px] font-mono bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded font-semibold">
                Live Data
              </span>
            </h2>
            <p className="text-[11px] text-slate-300">
              Key metrics, status charts, and recent manufacturer activity updates
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
              <span>Collapse Panel</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 text-indigo-400" />
              <span>Expand Metrics & Charts</span>
            </>
          )}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-5 bg-slate-50/50">
          
          {/* Top 4 KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Card 1: Active Communications */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Active Comms</span>
                <Clock className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {activeComms.length}
                <span className="text-xs font-normal text-slate-400 ml-1.5">/ {communications.length} total</span>
              </div>
              <div className="text-[10px] text-indigo-700 font-medium">
                {Math.round((activeComms.length / totalComms) * 100)}% pending resolution
              </div>
            </div>

            {/* Card 2: Awaiting Reply */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Awaiting Reply</span>
                <Mail className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-600">
                {awaitingReply.length}
              </div>
              <div className="text-[10px] text-amber-800 font-medium">
                Outbound responses pending
              </div>
            </div>

            {/* Card 3: Action Required (Clickable to show what requires an action) */}
            <div
              onClick={() => setShowActionDetails(prev => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowActionDetails(prev => !prev);
                }
              }}
              className={`p-3.5 rounded-xl border shadow-2xs space-y-1 cursor-pointer transition-all select-none ${
                showActionDetails
                  ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20'
                  : 'bg-white border-slate-200 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Action Required</span>
                <AlertCircle className="h-4 w-4 text-rose-600" />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-2xl font-black text-rose-600">
                  {actionRequired.length}
                </div>
                <span className="text-[10px] font-bold text-rose-700 underline">
                  {showActionDetails ? 'Hide Action List' : 'Show What Needs Action'}
                </span>
              </div>
              <div className="text-[10px] text-rose-700 font-medium">
                Click to view required actions
              </div>
            </div>

            {/* Card 4: Active Suppliers */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Active Suppliers</span>
                <Building2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600">
                {activeManufacturers.length}
              </div>
              <div className="text-[10px] text-emerald-800 font-medium">
                {manufacturers.length} total registered
              </div>
            </div>

          </div>

          {/* Expandable Breakdown of What Requires an Action */}
          {showActionDetails && (
            <div className="p-4 bg-white rounded-xl border border-rose-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <span>What Requires an Action ({actionRequired.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowActionDetails(false)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
              {actionRequired.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">
                  No communications currently require action.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {actionRequired.map(item => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-rose-50/60 border border-rose-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          {item.manufacturerId} · {item.manufacturerName} ({item.threadId})
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                          {item.status}
                        </span>
                      </div>
                      <div className="font-bold text-rose-950">
                        Required Action: {item.nextAction || item.keyOutcome || item.subject}
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        Subject: {item.subject} · {item.date}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Middle Row: 2 Charts + Recent Manufacturer Updates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Chart 1: Status Distribution Bar Chart */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Status Breakdown</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">{totalComms} records</span>
                </div>
                <p className="text-[10px] text-slate-500">Communication states across threads</p>
              </div>

              {/* Stacked Progress Bar */}
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${(statusCounts['Completed'] / totalComms) * 100}%` }}
                  className="bg-emerald-500 h-full"
                  title={`Completed: ${statusCounts['Completed']}`}
                />
                <div
                  style={{ width: `${(statusCounts['Awaiting Reply'] / totalComms) * 100}%` }}
                  className="bg-amber-500 h-full"
                  title={`Awaiting Reply: ${statusCounts['Awaiting Reply']}`}
                />
                <div
                  style={{ width: `${(statusCounts['Information Received'] / totalComms) * 100}%` }}
                  className="bg-blue-500 h-full"
                  title={`Information Received: ${statusCounts['Information Received']}`}
                />
                <div
                  style={{ width: `${(statusCounts['Action Required'] / totalComms) * 100}%` }}
                  className="bg-rose-500 h-full"
                  title={`Action Required: ${statusCounts['Action Required']}`}
                />
              </div>

              {/* Chart Legend */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-600 font-medium">Completed</span>
                  </div>
                  <span className="font-bold text-slate-900">{statusCounts['Completed']}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-slate-600 font-medium">Awaiting Reply</span>
                  </div>
                  <span className="font-bold text-slate-900">{statusCounts['Awaiting Reply']}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-slate-600 font-medium">Info Received</span>
                  </div>
                  <span className="font-bold text-slate-900">{statusCounts['Information Received']}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span className="text-slate-600 font-medium">Action Needed</span>
                  </div>
                  <span className="font-bold text-slate-900">{statusCounts['Action Required']}</span>
                </div>
              </div>
            </div>

            {/* Chart 2: Top Active Manufacturers */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div>
                <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Top Active Suppliers</span>
                </h3>
                <p className="text-[10px] text-slate-500">Communication volume by manufacturer</p>
              </div>

              <div className="space-y-2">
                {topManufacturers.map(item => {
                  const percent = Math.round((item.count / maxManufacturerCount) * 100);
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                          {item.name}
                        </span>
                        <span className="font-mono text-slate-500 font-medium">{item.count} comms</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className="bg-indigo-600 h-full rounded-full transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 3: Recent Manufacturer Updates Feed */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Recent Supplier Updates</span>
                </h3>
                <span className="text-[10px] text-indigo-600 font-semibold">Latest Feed</span>
              </div>

              <div className="space-y-2">
                {recentUpdates.map(comm => (
                  <div
                    key={comm.id}
                    className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-900 truncate max-w-[130px]">
                        {comm.manufacturerName}
                      </span>
                      <span className="font-mono text-slate-400">{comm.date}</span>
                    </div>
                    <p className="text-[11px] text-slate-700 font-medium truncate">
                      {comm.subject}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
