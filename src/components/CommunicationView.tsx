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
      if (selectedStatus !== 'ALL' && c.status !== selectedStatus) {
        return false;
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
    <div className="space-y-4">

      {/* VIEW MODE SWITCHER & QUICK FILTER PILLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs">
        
        {/* Left: Mode Toggle + Collapse/Expand All */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="grid grid-cols-2 sm:flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-fit">
            <button
              onClick={() => setDisplayMode('threads')}
              className={`flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                displayMode === 'threads'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${displayMode === 'threads' ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span className="truncate">Conversation Threads ({threadGroups.length})</span>
            </button>

            <button
              onClick={() => setDisplayMode('table')}
              className={`flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                displayMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className={`h-3.5 w-3.5 shrink-0 ${displayMode === 'table' ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span className="truncate">All Logs Table ({filteredComms.length})</span>
            </button>
          </div>

          {displayMode === 'threads' && threadGroups.length > 0 && (
            <div className="grid grid-cols-2 sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={collapseAllThreads}
                className="justify-center px-2.5 py-1.5 sm:py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Collapse all threads"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                <span>Collapse All</span>
              </button>
              <button
                onClick={expandAllThreads}
                className="justify-center px-2.5 py-1.5 sm:py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Expand all threads"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Expand All</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Quick Action Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 whitespace-nowrap">Quick Filter:</span>
          
          <button
            onClick={() => {
              setSelectedCommType('ALL');
              setSelectedStatus('ALL');
              setOnlyWithFollowup(false);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedCommType === 'ALL' && selectedStatus === 'ALL' && !onlyWithFollowup
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Records
          </button>

          <button
            onClick={() => setSelectedCommType(selectedCommType === 'ALL_EMAILS' ? 'ALL' : 'ALL_EMAILS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              selectedCommType === 'ALL_EMAILS'
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <Mail className="h-3 w-3" />
            <span>Emails Only</span>
          </button>

          <button
            onClick={() => setSelectedCommType(selectedCommType === 'Live Chat (Session)' ? 'ALL' : 'Live Chat (Session)')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              selectedCommType === 'Live Chat (Session)'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <MessageSquare className="h-3 w-3" />
            <span>Live Chats</span>
          </button>

          <button
            onClick={() => setSelectedStatus(selectedStatus === 'Awaiting Reply' ? 'ALL' : 'Awaiting Reply')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              selectedStatus === 'Awaiting Reply'
                ? 'bg-amber-600 text-white font-semibold'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>Awaiting Reply ({awaitingReplyCount})</span>
          </button>

          <button
            onClick={() => setOnlyWithFollowup(!onlyWithFollowup)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              onlyWithFollowup
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <Calendar className="h-3 w-3" />
            <span>Follow-ups Due ({followupsDueCount})</span>
          </button>
        </div>
      </div>

      {/* QUICK MANUFACTURER FILTER PILLS */}
      {manufacturers.length > 0 && (
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 shrink-0 flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-indigo-500" />
            <span>Supplier:</span>
          </span>

          <button
            onClick={() => setSelectedManufacturer('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedManufacturer === 'ALL'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({communications.length})
          </button>

          {manufacturers.map(m => {
            const count = communications.filter(c => c.manufacturerId === m.id).length;
            const isSelected = selectedManufacturer === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedManufacturer(isSelected ? 'ALL' : m.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{m.name}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs space-y-3">
        
        {/* Top Row: Search Input + Mobile Filter Toggle + Clear Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search threads, part numbers, outcomes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`sm:hidden px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors ${
                showMobileFilters || isFiltered
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-900">{filteredComms.length}</strong> entries in <strong className="text-indigo-700">{threadGroups.length}</strong> threads
            </span>
            {isFiltered && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Dropdown Filters (Collapsible on mobile) */}
        <div className={`${showMobileFilters ? 'grid' : 'hidden sm:grid'} grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs`}>
          
          {/* Filter by Manufacturer */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Manufacturer
            </label>
            <select
              value={selectedManufacturer}
              onChange={e => setSelectedManufacturer(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Suppliers ({manufacturers.length})</option>
              {manufacturers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.id} · {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Communication Type / Channel */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Communication Type
            </label>
            <select
              value={selectedCommType}
              onChange={e => setSelectedCommType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Channels & Types</option>
              <option value="ALL_EMAILS">All Emails (Sent & Received)</option>
              {commTypes.map(ct => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Current Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Current Status
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Awaiting Reply">Awaiting Reply</option>
              <option value="Reply Received">Reply Received</option>
              <option value="Information Received">Information Received</option>
              <option value="Completed">Completed</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Action Required">Action Required</option>
            </select>
          </div>

          {/* Follow-up Toggle */}
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer w-full px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg select-none">
              <input
                type="checkbox"
                checked={onlyWithFollowup}
                onChange={e => setOnlyWithFollowup(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
              />
              <span className="font-semibold text-slate-700">Follow-up Due Only</span>
            </label>
          </div>

        </div>
      </div>

      {/* DISPLAY MODE 1: THREAD CONVERSATION GROUPS */}
      {displayMode === 'threads' && (
        <div className="space-y-4">
          {threadGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-xs">
              <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">No communication threads match your filters.</p>
              {isFiltered && (
                <button onClick={resetFilters} className="mt-2 text-indigo-600 hover:underline font-semibold">
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            threadGroups.map(group => {
              const isCollapsed = !expandedThreadIds.has(group.threadId);

              return (
                <div
                  key={group.threadId}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                >
                  {/* Thread Header Bar */}
                  <div
                    onClick={() => toggleThreadExpand(group.threadId)}
                    className="p-3 sm:p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 cursor-pointer select-none hover:bg-slate-800/95 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
                      <span className="font-mono text-xs font-bold bg-indigo-600 text-white px-2 sm:px-2.5 py-1 rounded-lg shadow-xs shrink-0">
                        {group.threadId}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <h3 className="font-bold text-xs sm:text-sm text-white">
                            {group.manufacturerName}
                          </h3>
                          <span className="text-slate-400 text-[11px] font-mono">
                            ({group.manufacturerId})
                          </span>
                          <span className="text-slate-600 hidden sm:inline">•</span>
                          <span className="text-[11px] text-indigo-300 font-mono bg-indigo-500/20 px-1.5 py-0.2 rounded">
                            {group.messages.length} {group.messages.length === 1 ? 'entry' : 'entries'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium line-clamp-1 mt-0.5">
                          {group.primarySubject}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t border-slate-800 sm:border-0" onClick={e => e.stopPropagation()}>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                          group.status === 'Completed' || group.status === 'Reply Received'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : group.status === 'Information Received'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {group.status}
                      </span>

                      <button
                        onClick={() => toggleThreadExpand(group.threadId)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                        title={isCollapsed ? 'Expand thread messages' : 'Collapse thread messages'}
                      >
                        {isCollapsed ? (
                          <>
                            <ChevronDown className="h-3.5 w-3.5 text-indigo-400" />
                            <span>Expand</span>
                          </>
                        ) : (
                          <>
                            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                            <span>Collapse</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* If Collapsed: Show Compact 1-Line Latest Activity Bar */}
                  {isCollapsed ? (
                    <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-slate-600 truncate max-w-2xl">
                        <span className="font-mono text-[11px] font-semibold text-slate-500">
                          Latest ({group.latestMsg.date}):
                        </span>
                        <span className="font-medium text-slate-800 truncate">
                          {group.latestMsg.keyOutcome}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {group.latestMsg.followUpDate && group.status !== 'Completed' && (
                          <span className="text-[11px] font-mono text-amber-700 font-semibold flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Follow-up: {group.latestMsg.followUpDate}
                          </span>
                        )}
                        <button
                          onClick={() => setActiveThreadModalId(group.threadId)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          Full View →
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Expanded Thread Messages Stream */
                    <>
                      <div className="p-3 sm:p-5 bg-slate-50/50 space-y-3 sm:space-y-4">
                        <div className="relative pl-5 sm:pl-6 space-y-3 sm:space-y-4 before:absolute before:left-2 sm:before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                          
                          {group.messages.map((comm, idx) => {
                            const isSent = comm.channel.toLowerCase().includes('sent');
                            const isLiveChat =
                              comm.channel.toLowerCase().includes('live chat') ||
                              Boolean(comm.chatTurns && comm.chatTurns.length > 0) ||
                              Boolean(comm.outboundSummary && comm.inboundResponse);

                            return (
                              <div key={comm.id} className="relative group/msg">
                                
                                {/* Timeline Bullet Node */}
                                <div
                                  className={`absolute -left-5 sm:-left-6 top-3 h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 bg-white flex items-center justify-center text-[9px] sm:text-[10px] font-bold ${
                                    isLiveChat
                                      ? 'border-emerald-600 text-emerald-600'
                                      : isSent
                                      ? 'border-indigo-600 text-indigo-600'
                                      : 'border-blue-600 text-blue-600'
                                  }`}
                                >
                                  {idx + 1}
                                </div>

                                {/* Message Box */}
                                <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs space-y-2.5">
                                  
                                  {/* Message Header */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                                        isLiveChat
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : isSent
                                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                          : 'bg-blue-50 text-blue-700 border-blue-200'
                                      }`}>
                                        {isLiveChat ? (
                                          <MessageSquare className="h-3 w-3" />
                                        ) : isSent ? (
                                          <Send className="h-3 w-3" />
                                        ) : (
                                          <Mail className="h-3 w-3" />
                                        )}
                                        <span>{comm.channel}</span>
                                        {comm.chatTurns && comm.chatTurns.length > 0 && (
                                          <span className="ml-1 px-1.5 py-0.2 bg-emerald-200/70 text-emerald-900 rounded text-[10px] font-bold">
                                            {comm.chatTurns.length} turns
                                          </span>
                                        )}
                                      </span>

                                      <span className="font-mono text-slate-600 font-semibold">{comm.date}</span>
                                      <span className="text-slate-300">·</span>
                                      <span className="text-slate-500 font-medium">Logged by {comm.createdBy || 'Sarah Jenkins'}</span>
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
                                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                                        title="Edit message"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(comm)}
                                        disabled={!hasPermission('canDeleteCommunication')}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                        title="Delete message"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Subject & Outcome / Multi-Turn Chat Stream */}
                                  <div>
                                    <h4 className="font-bold text-xs text-slate-900">{comm.subject}</h4>
                                    {comm.chatTurns && comm.chatTurns.length > 0 ? (
                                      <div className="mt-2 space-y-2">
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-200/80">
                                            <span>💬 Live Chat Conversation ({comm.chatTurns.length} messages)</span>
                                            <span>Sent & Instant Replies</span>
                                          </div>
                                          <div className="space-y-2">
                                            {comm.chatTurns.map((turn, tIdx) => {
                                              const isUs = turn.sender === 'us';
                                              return (
                                                <div
                                                  key={turn.id || tIdx}
                                                  className={`p-2.5 rounded-lg border text-xs ${
                                                    isUs
                                                      ? 'bg-indigo-50/70 border-indigo-200/90 mr-0 sm:mr-8'
                                                      : 'bg-emerald-50/70 border-emerald-200/90 ml-0 sm:ml-8'
                                                  }`}
                                                >
                                                  <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span
                                                      className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                                        isUs ? 'text-indigo-700' : 'text-emerald-800'
                                                      }`}
                                                    >
                                                      {isUs ? (
                                                        <>
                                                          <Send className="h-2.5 w-2.5" />
                                                          <span>📤 Turn #{tIdx + 1} · Us (Sent)</span>
                                                        </>
                                                      ) : (
                                                        <>
                                                          <MessageSquare className="h-2.5 w-2.5" />
                                                          <span>📩 Turn #{tIdx + 1} · {comm.manufacturerName} (Reply)</span>
                                                        </>
                                                      )}
                                                    </span>
                                                    {turn.timestamp && (
                                                      <span className="text-[10px] font-mono text-slate-400">
                                                        {turn.timestamp}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <p className="text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                                                    {turn.message}
                                                  </p>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        {comm.keyOutcome && (
                                          <div className="text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 whitespace-pre-line">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                              Session Summary / Outcome:
                                            </span>
                                            {comm.keyOutcome}
                                          </div>
                                        )}
                                      </div>
                                    ) : comm.outboundSummary || comm.inboundResponse ? (
                                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {comm.outboundSummary && (
                                          <div className="p-2.5 bg-indigo-50/60 border border-indigo-200/80 rounded-lg text-xs">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1 mb-1">
                                              <Send className="h-3 w-3" />
                                              <span>📤 Sent Inquiry / Our Messages:</span>
                                            </span>
                                            <p className="text-slate-800 font-medium whitespace-pre-line">{comm.outboundSummary}</p>
                                          </div>
                                        )}
                                        {comm.inboundResponse && (
                                          <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-lg text-xs">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1 mb-1">
                                              <MessageSquare className="h-3 w-3" />
                                              <span>📩 Instant Reply / Outcome Received:</span>
                                            </span>
                                            <p className="text-slate-800 font-medium whitespace-pre-line">{comm.inboundResponse}</p>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-700 mt-1 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 whitespace-pre-line">
                                        {comm.keyOutcome}
                                      </p>
                                    )}
                                  </div>

                                  {/* Saved Full Email Content */}
                                  {comm.fullEmailText && (
                                    <details className="group/email text-xs pt-1">
                                      <summary className="font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer py-1 flex items-center gap-1.5 select-none">
                                        <Mail className="h-3.5 w-3.5 text-indigo-600" />
                                        <span>📧 View Saved Full Email Text ({comm.fullEmailText.length} characters)</span>
                                      </summary>
                                      <div className="mt-1.5 p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] leading-relaxed whitespace-pre-wrap border border-slate-800">
                                        {comm.fullEmailText}
                                      </div>
                                    </details>
                                  )}

                                  {/* Detailed Notes / Quotations */}
                                  {comm.informationReceived && (
                                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                        Technical Details & Quotation Breakdown:
                                      </span>
                                      {comm.informationReceived}
                                    </div>
                                  )}

                                  {/* Attached Files & Attachments */}
                                  {((comm.documentsReceived && comm.documentsReceived.length > 0) || (comm.attachments && comm.attachments.length > 0)) && (
                                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                                      {comm.attachments?.map(att => (
                                        <button
                                          key={att.id}
                                          onClick={() => onPreviewDoc(att.name, `Attachment - ${att.name}`)}
                                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg font-mono text-[11px] text-indigo-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                          title="Preview or download attachment"
                                        >
                                          <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                                          <span className="max-w-[200px] truncate">{att.name}</span>
                                          <Eye className="h-3 w-3 text-indigo-600 ml-1" />
                                        </button>
                                      ))}
                                      {comm.documentsReceived?.filter(doc => !comm.attachments?.some(a => a.name === doc)).map((doc, dIdx) => (
                                        <button
                                          key={dIdx}
                                          onClick={() => onPreviewDoc(doc, `Specification - ${doc}`)}
                                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-mono text-[11px] text-emerald-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                        >
                                          <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                          <span className="max-w-[200px] truncate">{doc}</span>
                                          <Eye className="h-3 w-3 text-emerald-600 ml-1" />
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {/* Next Action & Follow up */}
                                  {(comm.nextAction || comm.followUpDate) && (
                                    <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2">
                                      <div className="text-amber-950 font-medium">
                                        <strong>Next Action: </strong> {comm.nextAction || 'Follow up with vendor'}
                                      </div>
                                      {comm.followUpDate && (
                                        <span className="font-mono text-[11px] font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                                          Due: {comm.followUpDate}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                </div>

                              </div>
                            );
                          })}

                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="px-5 py-2.5 bg-slate-100/80 border-t border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-500">
                          Thread Key: <strong>{group.threadId}</strong> · {group.messages.length} recorded messages
                        </span>

                        <button
                          onClick={() => setActiveThreadModalId(group.threadId)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          <span>View Full Thread Modal</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
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
