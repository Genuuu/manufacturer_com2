import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CommunicationEntry, CommChannel, CommStatus } from '../types';
import {
  Search,
  Filter,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  RotateCcw,
  Building2,
  Mail,
  MessageSquare,
  Globe,
  Clock,
  Eye,
  Calendar,
  Layers,
  Plus,
  ArrowRight,
  Send,
  Paperclip,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { ThreadConversationModal } from './ThreadConversationModal';
import { SummaryMetricsPanel } from './SummaryMetricsPanel';
import { compareCommByEntryOrder } from '../utils/spreadsheetSync';

interface CommunicationViewProps {
  onOpenCommModal: (entry?: CommunicationEntry) => void;
  onPreviewDoc: (filename: string, title: string) => void;
}

export const CommunicationView: React.FC<CommunicationViewProps> = ({
  onOpenCommModal,
  onPreviewDoc,
}) => {
  const {
    communications,
    manufacturers,
    deleteCommunication,
    updateCommunication,
    hasPermission,
    searchQuery,
    setSearchQuery,
  } = useApp();

  // Filters state
  const [displayMode, setDisplayMode] = useState<'threads' | 'table'>('threads');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('ALL');
  const [selectedCommType, setSelectedCommType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [onlyWithFollowup, setOnlyWithFollowup] = useState<boolean>(false);
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  
  // Expanded states
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [activeThreadModalId, setActiveThreadModalId] = useState<string | null>(null);
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(new Set());
  const [showActionRequiredDrawer, setShowActionRequiredDrawer] = useState<boolean>(false);

  const toggleThreadExpand = (threadId: string) => {
    setExpandedThreadIds(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  const collapseAllThreads = () => {
    setExpandedThreadIds(new Set());
  };

  const expandAllThreads = () => {
    const allIds = new Set(threadGroups.map(g => g.threadId));
    setExpandedThreadIds(allIds);
  };

  // Extract all distinct communication types/channels dynamically
  const commTypes = useMemo(() => {
    const types = new Set<string>();
    communications.forEach(c => {
      if (c.channel) types.add(c.channel);
    });
    ['Email - Received', 'Email - Sent', 'Live Chat (Session)', 'Website'].forEach(t => types.add(t));
    return Array.from(types);
  }, [communications]);

  const awaitingReplyCount = communications.filter(c => c.status === 'Awaiting Reply').length;
  const followupsDueCount = communications.filter(
    c => c.followUpDate && c.status !== 'Completed'
  ).length;

  const isCommActionRequired = (c: CommunicationEntry) =>
    c.status === 'Action Required' ||
    c.status === 'Pending Review' ||
    (Boolean(c.nextAction && c.nextAction.trim()) &&
      c.status !== 'Completed' &&
      c.status !== 'Reply Received');

  const actionRequiredItems = useMemo(
    () => communications.filter(isCommActionRequired).sort(compareCommByEntryOrder),
    [communications]
  );

  // Filtered dataset
  const filteredComms = useMemo(() => {
    return communications.filter(c => {
      // Manufacturer filter
      if (selectedManufacturer !== 'ALL' && c.manufacturerId !== selectedManufacturer) {
        return false;
      }

      // Communication Type / Channel filter
      if (selectedCommType !== 'ALL') {
        if (selectedCommType === 'ALL_EMAILS') {
          if (!c.channel.toLowerCase().includes('email')) return false;
        } else if (c.channel !== selectedCommType) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'ACTION_REQUIRED_GROUP') {
          if (!isCommActionRequired(c)) return false;
        } else if (c.status !== selectedStatus) {
          return false;
        }
      }

      // Follow-up toggle
      if (onlyWithFollowup && (!c.followUpDate || c.status === 'Completed')) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSub = (c.subject || '').toLowerCase().includes(q);
        const matchOutcome = (c.keyOutcome || '').toLowerCase().includes(q);
        const matchMName = (c.manufacturerName || '').toLowerCase().includes(q);
        const matchMId = (c.manufacturerId || '').toLowerCase().includes(q);
        const matchThread = (c.threadId || '').toLowerCase().includes(q);
        const matchChannel = (c.channel || '').toLowerCase().includes(q);
        const matchInfo = (c.informationReceived || '').toLowerCase().includes(q);
        const matchAction = (c.nextAction || '').toLowerCase().includes(q);
        const matchDocs = (c.threadDoc || '').toLowerCase().includes(q) ||
          (c.documentsReceived || []).some(d => d.toLowerCase().includes(q));
        return (
          matchSub ||
          matchOutcome ||
          matchMName ||
          matchMId ||
          matchThread ||
          matchChannel ||
          matchInfo ||
          matchAction ||
          matchDocs
        );
      }

      return true;
    }).sort(compareCommByEntryOrder);
  }, [
    communications,
    selectedManufacturer,
    selectedCommType,
    selectedStatus,
    onlyWithFollowup,
    searchQuery,
  ]);

  // Group filtered messages into Thread Groups (messages ordered strictly by entry sequence)
  const threadGroups = useMemo(() => {
    const groupsMap = new Map<string, CommunicationEntry[]>();

    // Sort all comms in exact data-entry order (1st entered -> 2nd entered -> 3rd entered)
    const sorted = [...filteredComms].sort(compareCommByEntryOrder);

    sorted.forEach(c => {
      const tid = c.threadId || 'T001';
      if (!groupsMap.has(tid)) {
        groupsMap.set(tid, []);
      }
      groupsMap.get(tid)!.push(c);
    });

    return Array.from(groupsMap.entries()).map(([threadId, msgs]) => {
      const orderedMsgs = [...msgs].sort(compareCommByEntryOrder);
      const firstMsg = orderedMsgs[0];
      const latestMsg = orderedMsgs[orderedMsgs.length - 1];
      return {
        threadId,
        messages: orderedMsgs,
        firstMsg,
        latestMsg,
        manufacturerName: firstMsg.manufacturerName,
        manufacturerId: firstMsg.manufacturerId,
        primarySubject: firstMsg.subject,
        status: latestMsg.status,
        date: latestMsg.date,
      };
    }).sort((a, b) => compareCommByEntryOrder(b.latestMsg, a.latestMsg)); // Sort threads with most recently entered message first
  }, [filteredComms]);

  // Check if any filter is active
  const isFiltered =
    selectedManufacturer !== 'ALL' ||
    selectedCommType !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    onlyWithFollowup ||
    Boolean(searchQuery.trim());

  const resetFilters = () => {
    setSelectedManufacturer('ALL');
    setSelectedCommType('ALL');
    setSelectedStatus('ALL');
    setOnlyWithFollowup(false);
    setSearchQuery('');
  };

  const handleStatusChange = (commId: string, newStatus: CommStatus) => {
    if (!hasPermission('canEditCommunication')) {
      alert('Permission Denied: Your current role cannot update status.');
      return;
    }
    updateCommunication(commId, { status: newStatus });
  };

  const handleDelete = (c: CommunicationEntry) => {
    if (!hasPermission('canDeleteCommunication')) {
      alert('Permission Denied: Only Manager or Admin can delete communication records.');
      return;
    }
    if (confirm(`Delete record for ${c.manufacturerName} - "${c.subject}"?`)) {
      deleteCommunication(c.id);
    }
  };

  const getChannelIcon = (ch: string) => {
    if (ch.toLowerCase().includes('email')) return <Mail className="h-3.5 w-3.5 text-blue-600" />;
    if (ch.toLowerCase().includes('chat')) return <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />;
    if (ch.toLowerCase().includes('website')) return <Globe className="h-3.5 w-3.5 text-indigo-600" />;
    return <Clock className="h-3.5 w-3.5 text-slate-500" />;
  };

  return (
    <div className="space-y-3.5">

      {/* UNIFIED COMPACT CONTROL BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Left: View Switcher + Search Input + Supplier Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <div className="grid grid-cols-2 sm:flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setDisplayMode('threads')}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  displayMode === 'threads'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${displayMode === 'threads' ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span>Threads ({threadGroups.length})</span>
              </button>

              <button
                onClick={() => setDisplayMode('table')}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  displayMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className={`h-3.5 w-3.5 shrink-0 ${displayMode === 'table' ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span>Table ({filteredComms.length})</span>
              </button>
            </div>

            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search threads, outcomes, specs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedManufacturer}
              onChange={e => setSelectedManufacturer(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shrink-0"
            >
              <option value="ALL">All Suppliers ({manufacturers.length})</option>
              {manufacturers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.id} · {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Quick Action Pills & More Filters Toggle */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
            <button
              onClick={() => {
                setSelectedCommType('ALL');
                setSelectedStatus('ALL');
                setOnlyWithFollowup(false);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCommType === 'ALL' && selectedStatus === 'ALL' && !onlyWithFollowup
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>

            <button
              onClick={() =>
                setSelectedStatus(selectedStatus === 'Awaiting Reply' ? 'ALL' : 'Awaiting Reply')
              }
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                selectedStatus === 'Awaiting Reply'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>Awaiting ({awaitingReplyCount})</span>
            </button>

            <button
              onClick={() => {
                const nextStatus =
                  selectedStatus === 'ACTION_REQUIRED_GROUP' ? 'ALL' : 'ACTION_REQUIRED_GROUP';
                setSelectedStatus(nextStatus);
                if (nextStatus === 'ACTION_REQUIRED_GROUP') {
                  setShowActionRequiredDrawer(true);
                }
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                selectedStatus === 'ACTION_REQUIRED_GROUP' || selectedStatus === 'Action Required'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <AlertCircle className="h-3 w-3" />
              <span>Action ({actionRequiredItems.length})</span>
            </button>

            <button
              onClick={() => setShowActionRequiredDrawer(prev => !prev)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer border ${
                showActionRequiredDrawer
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
              }`}
              title="Toggle list of items requiring action"
            >
              <Eye className="h-3 w-3" />
              <span>{showActionRequiredDrawer ? 'Hide Actions' : 'What Needs Action'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer ${
                showMobileFilters || selectedCommType !== 'ALL' || onlyWithFollowup
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Filter className="h-3 w-3" />
              <span>Filters</span>
            </button>

            {isFiltered && (
              <button
                onClick={resetFilters}
                className="px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1 cursor-pointer shrink-0"
                title="Reset all filters"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Secondary Filter Row */}
        {showMobileFilters && (
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCommType}
                onChange={e => setSelectedCommType(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer"
              >
                <option value="ALL">All Channels</option>
                <option value="ALL_EMAILS">All Emails</option>
                {commTypes.map(ct => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTION_REQUIRED_GROUP">⚡ All Action Required</option>
                <option value="Action Required">Action Required</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Awaiting Reply">Awaiting Reply</option>
                <option value="Reply Received">Reply Received</option>
                <option value="Information Received">Information Received</option>
                <option value="Completed">Completed</option>
              </select>

              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyWithFollowup}
                  onChange={e => setOnlyWithFollowup(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 h-3.5 w-3.5"
                />
                <span className="font-medium text-slate-700">Follow-up Due ({followupsDueCount})</span>
              </label>
            </div>

            {displayMode === 'threads' && threadGroups.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={expandAllThreads}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAllThreads}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* COMPACT "WHAT REQUIRES AN ACTION" DRAWER */}
      {showActionRequiredDrawer && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-rose-950 text-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span className="font-bold text-xs sm:text-sm">
                What Requires an Action ({actionRequiredItems.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowActionRequiredDrawer(false)}
              className="text-xs font-semibold text-rose-200 hover:text-white px-2 py-0.5 rounded cursor-pointer"
            >
              Close
            </button>
          </div>

          {actionRequiredItems.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No communications currently require action.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {actionRequiredItems.map(item => (
                <div
                  key={item.id}
                  className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-rose-50/30 transition-colors text-xs"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{item.manufacturerName}</span>
                      <button
                        type="button"
                        onClick={() => setActiveThreadModalId(item.threadId)}
                        className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 cursor-pointer"
                      >
                        {item.threadId}
                      </button>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        {item.status}
                      </span>
                      {item.followUpDate && (
                        <span className="text-[10px] font-mono text-slate-500">
                          Due: {item.followUpDate}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-rose-900 truncate">
                      Action: {item.nextAction || item.keyOutcome || item.subject}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveThreadModalId(item.threadId)}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenCommModal(item)}
                      disabled={!hasPermission('canEditCommunication')}
                      className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      Edit
                    </button>
                    {hasPermission('canEditCommunication') && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, 'Completed')}
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Done
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DISPLAY MODE 1: THREAD CONVERSATION GROUPS */}
      {displayMode === 'threads' && (
        <div className="space-y-2.5">
          {threadGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-600">No communication threads match your filters.</p>
              {isFiltered && (
                <button onClick={resetFilters} className="mt-1.5 text-indigo-600 hover:underline font-semibold cursor-pointer">
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            threadGroups.map(group => {
              const isCollapsed = !expandedThreadIds.has(group.threadId);
              const threadActionMsgs = group.messages.filter(isCommActionRequired);
              const latestActionMsg =
                threadActionMsgs.length > 0
                  ? threadActionMsgs[threadActionMsgs.length - 1]
                  : null;

              return (
                <div
                  key={group.threadId}
                  className={`bg-white rounded-2xl border shadow-2xs overflow-hidden transition-all ${
                    latestActionMsg ? 'border-rose-300' : 'border-slate-200'
                  }`}
                >
                  {/* Clean Compact Thread Header */}
                  <div
                    onClick={() => toggleThreadExpand(group.threadId)}
                    className="px-4 py-3 bg-white hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                      <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-lg shrink-0">
                        {group.threadId}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">
                            {group.manufacturerName}
                          </span>
                          <span className="text-xs text-slate-700 font-medium truncate">
                            — {group.primarySubject}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            ({group.messages.length})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          <span className="font-mono">{group.latestMsg.date}:</span> {group.latestMsg.keyOutcome}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          group.status === 'Completed' || group.status === 'Reply Received'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : group.status === 'Information Received'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : group.status === 'Action Required'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {group.status}
                      </span>

                      <button
                        onClick={() => setActiveThreadModalId(group.threadId)}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                      >
                        Modal
                      </button>

                      <button
                        onClick={() => toggleThreadExpand(group.threadId)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                        title={isCollapsed ? 'Expand messages' : 'Collapse messages'}
                      >
                        {isCollapsed ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Single-Line Action Callout When Applicable */}
                  {isCollapsed && latestActionMsg && (
                    <div className="px-4 py-2 bg-rose-50/70 border-t border-rose-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-rose-900 min-w-0">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span className="font-bold truncate">
                          Action: {latestActionMsg.nextAction || latestActionMsg.keyOutcome || latestActionMsg.subject}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenCommModal(latestActionMsg)}
                        disabled={!hasPermission('canEditCommunication')}
                        className="text-[11px] font-semibold text-rose-700 hover:underline disabled:opacity-40 cursor-pointer shrink-0"
                      >
                        Edit Action
                      </button>
                    </div>
                  )}

                  {/* Expanded Thread Messages Stream */}
                  {!isCollapsed && (
                    <div className="p-3 sm:p-4 bg-slate-50/60 border-t border-slate-100 space-y-2.5">
                      {group.messages.map((comm, idx) => {
                        const hasExtraDetails = Boolean(
                          (comm.chatTurns && comm.chatTurns.length > 0) ||
                            comm.outboundSummary ||
                            comm.inboundResponse ||
                            comm.informationReceived ||
                            comm.fullEmailText
                        );
                        const hasDocs = Boolean(
                          (comm.documentsReceived && comm.documentsReceived.length > 0) ||
                            (comm.attachments && comm.attachments.length > 0)
                        );

                        return (
                          <div
                            key={comm.id}
                            className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 text-xs"
                          >
                            {/* Message Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                                <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                  {getChannelIcon(comm.channel)}
                                  <span>{comm.channel}</span>
                                </span>
                                <span className="font-mono text-slate-500">{comm.date}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <select
                                  value={comm.status}
                                  onChange={e => handleStatusChange(comm.id, e.target.value as CommStatus)}
                                  disabled={!hasPermission('canEditCommunication')}
                                  className={`text-[10px] font-semibold rounded px-2 py-0.5 border cursor-pointer ${
                                    comm.status === 'Completed' || comm.status === 'Reply Received'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : comm.status === 'Information Received'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : comm.status === 'Action Required'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  <option value="Completed">Completed</option>
                                  <option value="Awaiting Reply">Awaiting Reply</option>
                                  <option value="Reply Received">Reply Received</option>
                                  <option value="Information Received">Information Received</option>
                                  <option value="Pending Review">Pending Review</option>
                                  <option value="Action Required">Action Required</option>
                                </select>

                                <button
                                  onClick={() => onOpenCommModal(comm)}
                                  disabled={!hasPermission('canEditCommunication')}
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                                  title="Edit message"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(comm)}
                                  disabled={!hasPermission('canDeleteCommunication')}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                  title="Delete message"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Subject & Key Outcome */}
                            <div>
                              <div className="font-bold text-slate-900">{comm.subject}</div>
                              {comm.keyOutcome && (
                                <p className="text-slate-600 mt-0.5 whitespace-pre-line">{comm.keyOutcome}</p>
                              )}
                            </div>

                            {/* Action Callout if applicable */}
                            {(comm.nextAction || isCommActionRequired(comm)) && (
                              <div className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                  <span className="font-bold">
                                    Action: {comm.nextAction || comm.keyOutcome || 'Review required'}
                                  </span>
                                  {comm.followUpDate && (
                                    <span className="font-mono text-[10px] text-rose-700">
                                      (Due: {comm.followUpDate})
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Attachments */}
                            {hasDocs && (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {comm.attachments?.map(att => (
                                  <button
                                    key={att.id}
                                    onClick={() => onPreviewDoc(att.name, `Attachment - ${att.name}`)}
                                    className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded font-mono text-[10px] text-indigo-700 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    <span className="max-w-[180px] truncate">{att.name}</span>
                                  </button>
                                ))}
                                {comm.documentsReceived
                                  ?.filter(doc => !comm.attachments?.some(a => a.name === doc))
                                  .map((doc, dIdx) => (
                                    <button
                                      key={dIdx}
                                      onClick={() => onPreviewDoc(doc, `Specification - ${doc}`)}
                                      className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded font-mono text-[10px] text-emerald-800 flex items-center gap-1 cursor-pointer"
                                    >
                                      <FileText className="h-3 w-3" />
                                      <span className="max-w-[180px] truncate">{doc}</span>
                                    </button>
                                  ))}
                              </div>
                            )}

                            {/* Collapsible Technical Specs / Transcript / Email Text */}
                            {hasExtraDetails && (
                              <details className="pt-1 border-t border-slate-100">
                                <summary className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer select-none">
                                  Show Technical Details / Transcript
                                </summary>
                                <div className="mt-2 space-y-2">
                                  {comm.informationReceived && (
                                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-line">
                                      {comm.informationReceived}
                                    </div>
                                  )}
                                  {comm.chatTurns && comm.chatTurns.length > 0 && (
                                    <div className="space-y-1.5">
                                      {comm.chatTurns.map((turn, tIdx) => (
                                        <div
                                          key={turn.id || tIdx}
                                          className={`p-2 rounded-lg border text-[11px] ${
                                            turn.sender === 'us'
                                              ? 'bg-indigo-50/50 border-indigo-200'
                                              : 'bg-emerald-50/50 border-emerald-200'
                                          }`}
                                        >
                                          <span className="font-bold text-[10px] block">
                                            {turn.sender === 'us' ? 'Us:' : `${comm.manufacturerName}:`}
                                          </span>
                                          <p className="whitespace-pre-line">{turn.message}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {comm.fullEmailText && (
                                    <div className="p-2.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] whitespace-pre-wrap">
                                      {comm.fullEmailText}
                                    </div>
                                  )}
                                </div>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      )}

      {/* DISPLAY MODE 2: FLAT ALL LOGS TABLE (Mobile/Tablet Card Grid + Desktop Table) */}
      {displayMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          {/* Mobile & Tablet Card Grid (lg:hidden) */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-3 md:p-3 divide-slate-100">
            {filteredComms.length === 0 ? (
              <div className="md:col-span-2 py-10 px-4 text-center text-slate-400 text-xs">
                <p className="font-medium text-slate-600">No communication records match your search filters.</p>
                <button onClick={resetFilters} className="text-xs text-indigo-600 hover:underline font-semibold mt-1">
                  Reset filters
                </button>
              </div>
            ) : (
              filteredComms.map(comm => {
                const isExpanded = expandedRowId === comm.id;
                return (
                  <div key={comm.id} className="p-3.5 md:rounded-xl md:border md:border-slate-200 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{comm.manufacturerName}</span>
                          <button
                            onClick={() => setActiveThreadModalId(comm.threadId)}
                            className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 inline-flex items-center gap-1"
                          >
                            <span>{comm.threadId}</span>
                            <MessageSquare className="h-2.5 w-2.5" />
                          </button>
                          <span className="font-mono text-[11px] text-slate-500">{comm.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          {getChannelIcon(comm.channel)}
                          <span>{comm.channel}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => onOpenCommModal(comm)}
                          disabled={!hasPermission('canEditCommunication')}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg border border-slate-200 bg-slate-50 disabled:opacity-30"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(comm)}
                          disabled={!hasPermission('canDeleteCommunication')}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 bg-slate-50 disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-slate-900">{comm.subject}</div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{comm.keyOutcome}</p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <select
                        value={comm.status}
                        onChange={e => handleStatusChange(comm.id, e.target.value as CommStatus)}
                        disabled={!hasPermission('canEditCommunication')}
                        className={`text-[11px] font-semibold rounded-lg px-2.5 py-1 border ${
                          comm.status === 'Completed' || comm.status === 'Reply Received'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : comm.status === 'Information Received'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="Completed">Completed</option>
                        <option value="Awaiting Reply">Awaiting Reply</option>
                        <option value="Reply Received">Reply Received</option>
                        <option value="Information Received">Information Received</option>
                        <option value="Pending Review">Pending Review</option>
                        <option value="Action Required">Action Required</option>
                      </select>

                      <button
                        onClick={() => setExpandedRowId(isExpanded ? null : comm.id)}
                        className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50/70"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        {comm.chatTurns && comm.chatTurns.length > 0 && (
                          <div className="space-y-1.5">
                            {comm.chatTurns.map((turn, tIdx) => (
                              <div
                                key={turn.id || tIdx}
                                className={`p-2 rounded-lg border text-[11px] ${
                                  turn.sender === 'us'
                                    ? 'bg-indigo-50/60 border-indigo-200'
                                    : 'bg-emerald-50/60 border-emerald-200'
                                }`}
                              >
                                <span className="font-bold block text-[10px]">
                                  {turn.sender === 'us' ? `📤 #${tIdx + 1} Us:` : `📩 #${tIdx + 1} ${comm.manufacturerName}:`}
                                </span>
                                <p className="text-slate-800 whitespace-pre-line">{turn.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {comm.informationReceived && (
                          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-800 whitespace-pre-line">
                            <strong className="block text-[10px] uppercase text-slate-400 mb-0.5">Technical Details:</strong>
                            {comm.informationReceived}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table (hidden lg:block) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="py-3 px-3 w-8"></th>
                  <th className="py-3 px-3 w-24">Date</th>
                  <th className="py-3 px-3 w-32">Supplier</th>
                  <th className="py-3 px-3 w-28">Thread</th>
                  <th className="py-3 px-3 w-32">Type / Channel</th>
                  <th className="py-3 px-3">Subject & Outcome</th>
                  <th className="py-3 px-3 w-36">Status</th>
                  <th className="py-3 px-3 w-24">Follow-up</th>
                  <th className="py-3 px-3 w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComms.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <p className="font-medium text-slate-600">No communication records match your search filters.</p>
                      <button onClick={resetFilters} className="text-xs text-indigo-600 hover:underline font-semibold mt-1">
                        Reset filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredComms.map(comm => {
                    const isExpanded = expandedRowId === comm.id;
                    const hasDocs =
                      comm.threadDoc ||
                      (comm.documentsReceived && comm.documentsReceived.length > 0) ||
                      (comm.attachments && comm.attachments.length > 0);

                    return (
                      <React.Fragment key={comm.id}>
                        <tr className={`hover:bg-slate-50/70 transition-colors ${isExpanded ? 'bg-indigo-50/20' : ''}`}>
                          
                          {/* Expand toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setExpandedRowId(isExpanded ? null : comm.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                              title={isExpanded ? 'Collapse' : 'Expand full details'}
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                            {comm.date}
                          </td>

                          {/* Supplier */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{comm.manufacturerName}</div>
                          </td>

                          {/* Thread ID Badge -> Opens Thread Modal */}
                          <td className="py-3 px-3">
                            <button
                              onClick={() => setActiveThreadModalId(comm.threadId)}
                              className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors border border-indigo-200/80 inline-flex items-center gap-1"
                              title="Click to view full thread conversation"
                            >
                              <span>{comm.threadId}</span>
                              <MessageSquare className="h-3 w-3 text-indigo-500" />
                            </button>
                          </td>

                          {/* Channel */}
                          <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-medium text-[11px]">
                              {getChannelIcon(comm.channel)}
                              <span>{comm.channel}</span>
                            </div>
                          </td>

                          {/* Subject & Outcome */}
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900 line-clamp-1">{comm.subject}</div>
                            <div className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">{comm.keyOutcome}</div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <select
                              value={comm.status}
                              onChange={e => handleStatusChange(comm.id, e.target.value as CommStatus)}
                              disabled={!hasPermission('canEditCommunication')}
                              className={`text-[11px] font-semibold rounded px-2 py-1 border cursor-pointer ${
                                comm.status === 'Completed' || comm.status === 'Reply Received'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : comm.status === 'Information Received'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <option value="Completed">Completed</option>
                              <option value="Awaiting Reply">Awaiting Reply</option>
                              <option value="Reply Received">Reply Received</option>
                              <option value="Information Received">Information Received</option>
                              <option value="Pending Review">Pending Review</option>
                              <option value="Action Required">Action Required</option>
                            </select>
                          </td>

                          {/* Follow-up date */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {comm.followUpDate ? (
                              <span className="text-[11px] font-mono font-medium text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                {comm.followUpDate}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => onOpenCommModal(comm)}
                                disabled={!hasPermission('canEditCommunication')}
                                title="Edit record"
                                className="p-1 text-slate-500 hover:text-indigo-600 rounded disabled:opacity-30"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(comm)}
                                disabled={!hasPermission('canDeleteCommunication')}
                                title="Delete record"
                                className="p-1 text-slate-400 hover:text-rose-600 rounded disabled:opacity-30"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={9} className="p-4 pl-12 border-b border-slate-200">
                              <div className="space-y-3 text-xs">
                                {comm.chatTurns && comm.chatTurns.length > 0 ? (
                                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                      💬 Live Chat Conversation ({comm.chatTurns.length} messages):
                                    </span>
                                    <div className="space-y-1.5">
                                      {comm.chatTurns.map((turn, tIdx) => {
                                        const isUs = turn.sender === 'us';
                                        return (
                                          <div
                                            key={turn.id || tIdx}
                                            className={`p-2 rounded-lg border ${
                                              isUs
                                                ? 'bg-indigo-50/60 border-indigo-200/80 mr-0 sm:mr-8'
                                                : 'bg-emerald-50/60 border-emerald-200/80 ml-0 sm:ml-8'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between text-[10px] font-bold mb-0.5">
                                              <span className={isUs ? 'text-indigo-700' : 'text-emerald-800'}>
                                                {isUs
                                                  ? `📤 #${tIdx + 1} Us (Sent)`
                                                  : `📩 #${tIdx + 1} ${comm.manufacturerName} (Reply)`}
                                              </span>
                                              {turn.timestamp && (
                                                <span className="font-mono text-slate-400">{turn.timestamp}</span>
                                              )}
                                            </div>
                                            <p className="text-slate-800 font-medium whitespace-pre-line">{turn.message}</p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : (comm.outboundSummary || comm.inboundResponse) && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {comm.outboundSummary && (
                                      <div className="p-2.5 bg-indigo-50/60 border border-indigo-200/80 rounded-lg">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block mb-1">
                                          📤 Sent Inquiry / Our Messages:
                                        </span>
                                        <p className="text-slate-800 font-medium whitespace-pre-line">{comm.outboundSummary}</p>
                                      </div>
                                    )}
                                    {comm.inboundResponse && (
                                      <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-lg">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                                          📩 Instant Reply / Outcome Received:
                                        </span>
                                        <p className="text-slate-800 font-medium whitespace-pre-line">{comm.inboundResponse}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {comm.informationReceived && (
                                  <div>
                                    <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block mb-1">
                                      Information Received & Technical Details:
                                    </span>
                                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-800 whitespace-pre-line leading-relaxed">
                                      {comm.informationReceived}
                                    </div>
                                  </div>
                                )}

                                {comm.nextAction && (
                                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-950 font-medium">
                                    <strong>Next Action: </strong> {comm.nextAction}
                                  </div>
                                )}

                                {hasDocs && (
                                  <div>
                                    <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                      <Paperclip className="h-3 w-3 text-indigo-500" />
                                      <span>Attached Files & Documents:</span>
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                      {comm.attachments?.map(att => (
                                        <button
                                          key={att.id}
                                          onClick={() => onPreviewDoc(att.name, `Attachment - ${att.name}`)}
                                          className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg font-mono text-[11px] text-indigo-800 flex items-center gap-1.5 hover:bg-indigo-100 cursor-pointer shadow-2xs"
                                          title="Preview or download attachment"
                                        >
                                          <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                                          <span className="max-w-[200px] truncate">{att.name}</span>
                                          <Eye className="h-3 w-3 text-indigo-500 ml-1" />
                                        </button>
                                      ))}
                                      {comm.threadDoc && !comm.attachments?.some(a => a.name === comm.threadDoc) && (
                                        <button
                                          onClick={() => onPreviewDoc(comm.threadDoc!, `Transcript - ${comm.threadDoc}`)}
                                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-indigo-700 flex items-center gap-1.5"
                                        >
                                          <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                          <span>{comm.threadDoc}</span>
                                        </button>
                                      )}
                                      {comm.documentsReceived?.filter(doc => !comm.attachments?.some(a => a.name === doc)).map((doc, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => onPreviewDoc(doc, `Specification - ${doc}`)}
                                          className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg font-mono text-[11px] text-emerald-800 flex items-center gap-1.5"
                                        >
                                          <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                          <span>{doc}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                                  <span>Entry Key: {comm.entryKey}</span>
                                  <span>·</span>
                                  <button
                                    onClick={() => setActiveThreadModalId(comm.threadId)}
                                    className="font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                                  >
                                    <span>View Thread {comm.threadId} Full History</span>
                                    <ArrowRight className="h-3 w-3" />
                                  </button>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dedicated Thread Conversation Modal */}
      <ThreadConversationModal
        isOpen={Boolean(activeThreadModalId)}
        onClose={() => setActiveThreadModalId(null)}
        threadId={activeThreadModalId}
        onOpenCommModalWithThread={(mId, tid) => {
          onOpenCommModal({
            id: '',
            date: '2026-11-04',
            manufacturerId: mId,
            manufacturerName: manufacturers.find(m => m.id === mId)?.name || 'Manufacturer',
            threadSelection: tid,
            threadId: tid,
            channel: 'Email - Sent',
            subject: 'Re: Thread follow-up',
            keyOutcome: '',
            status: 'Awaiting Reply',
          });
        }}
        onPreviewDoc={onPreviewDoc}
      />

    </div>
  );
};
