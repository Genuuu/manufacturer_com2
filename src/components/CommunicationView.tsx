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
    });
  }, [
    communications,
    selectedManufacturer,
    selectedCommType,
    selectedStatus,
    onlyWithFollowup,
    searchQuery,
  ]);

  // Group filtered messages into Thread Groups
  const threadGroups = useMemo(() => {
    const groupsMap = new Map<string, CommunicationEntry[]>();

    // Sort all comms chronologically
    const sorted = [...filteredComms].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

    sorted.forEach(c => {
      const tid = c.threadId || 'T001';
      if (!groupsMap.has(tid)) {
        groupsMap.set(tid, []);
      }
      groupsMap.get(tid)!.push(c);
    });

    return Array.from(groupsMap.entries()).map(([threadId, msgs]) => {
      const firstMsg = msgs[0];
      const latestMsg = msgs[msgs.length - 1];
      return {
        threadId,
        messages: msgs,
        firstMsg,
        latestMsg,
        manufacturerName: firstMsg.manufacturerName,
        manufacturerId: firstMsg.manufacturerId,
        primarySubject: firstMsg.subject,
        status: latestMsg.status,
        date: latestMsg.date,
      };
    }).sort((a, b) => (a.date < b.date ? 1 : -1)); // Sort threads newest activity first
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

      {/* SEARCH AND FILTER BAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
        
        {/* Top Header: View Mode Switcher + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Display Mode Toggle & Thread Collapse Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setDisplayMode('threads')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  displayMode === 'threads'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>💬 Thread Groups ({threadGroups.length})</span>
              </button>

              <button
                onClick={() => setDisplayMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  displayMode === 'table'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>📋 All Logs Table ({filteredComms.length})</span>
              </button>
            </div>

            {displayMode === 'threads' && threadGroups.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-100/70 p-1 rounded-xl">
                <button
                  onClick={collapseAllThreads}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white rounded-lg transition-colors flex items-center gap-1"
                  title="Hide message list for all threads"
                >
                  <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                  <span>Collapse All</span>
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={expandAllThreads}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white rounded-lg transition-colors flex items-center gap-1"
                  title="Show message stream for all threads"
                >
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  <span>Expand All</span>
                </button>
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search part numbers (e.g. A7671G), prices, subject..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

        </div>

        {/* Dropdowns Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          
          {/* Manufacturer Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              <span>Manufacturer</span>
            </label>
            <select
              value={selectedManufacturer}
              onChange={e => setSelectedManufacturer(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Manufacturers ({manufacturers.length})</option>
              {manufacturers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.id} · {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Communication Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <span>Communication Type</span>
            </label>
            <select
              value={selectedCommType}
              onChange={e => setSelectedCommType(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Types</option>
              <option value="ALL_EMAILS">All Emails (Received & Sent)</option>
              {commTypes.map(ct => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>Status</span>
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Awaiting Reply">Awaiting Reply</option>
              <option value="Information Received">Information Received</option>
              <option value="Completed">Completed</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Action Required">Action Required</option>
            </select>
          </div>

        </div>

        {/* Filter Shortcuts Bar */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Quick Filters:</span>
            
            <button
              onClick={resetFilters}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                !isFiltered
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>

            <button
              onClick={() => setSelectedCommType(selectedCommType === 'ALL_EMAILS' ? 'ALL' : 'ALL_EMAILS')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
                selectedCommType === 'ALL_EMAILS'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Mail className="h-3 w-3" />
              <span>Emails</span>
            </button>

            <button
              onClick={() => setSelectedStatus(selectedStatus === 'Awaiting Reply' ? 'ALL' : 'Awaiting Reply')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                selectedStatus === 'Awaiting Reply'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Awaiting Reply
            </button>

            <button
              onClick={() => setOnlyWithFollowup(!onlyWithFollowup)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
                onlyWithFollowup
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>Pending Follow-up</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <span className="text-[11px] text-slate-500 font-mono">
              {threadGroups.length} Thread Groups ({filteredComms.length} messages)
            </span>

            {isFiltered && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-0.5 rounded transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* DISPLAY MODE 1: THREAD CONVERSATION GROUPS */}
      {displayMode === 'threads' && (
        <div className="space-y-4">
          {threadGroups.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-xs">
              <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">No communication threads match your filters.</p>
              <button onClick={resetFilters} className="mt-2 text-indigo-600 hover:underline font-semibold">
                Reset filters
              </button>
            </div>
          ) : (
            threadGroups.map(group => {
              const isCollapsed = !expandedThreadIds.has(group.threadId);

              return (
                <div
                  key={group.threadId}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
                >
                  {/* Thread Header Card */}
                  <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="font-mono text-xs font-bold bg-indigo-600 text-white px-2.5 py-1 rounded-lg shadow-2xs shrink-0">
                        Thread {group.threadId}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-white">
                            {group.manufacturerName}
                          </h3>
                          <span className="text-slate-400 text-xs font-mono">({group.manufacturerId})</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-xs text-indigo-200 font-mono font-medium">
                            {group.messages.length} {group.messages.length === 1 ? 'message' : 'messages'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 truncate mt-0.5">
                          Topic: {group.primarySubject}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded border ${
                        group.status === 'Completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {group.status}
                      </span>

                      {/* Reply Button */}
                      <button
                        onClick={() => onOpenCommModal({
                          id: '',
                          date: '2026-11-04',
                          manufacturerId: group.manufacturerId,
                          manufacturerName: group.manufacturerName,
                          threadSelection: group.threadId,
                          threadId: group.threadId,
                          channel: 'Email - Sent',
                          subject: `Re: ${group.primarySubject}`,
                          keyOutcome: '',
                          status: 'Awaiting Reply',
                        })}
                        disabled={!hasPermission('canLogCommunication')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Reply</span>
                      </button>

                      {/* SINGLE Expand / Collapse Button */}
                      <button
                        onClick={() => toggleThreadExpand(group.threadId)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors shadow-2xs"
                        title={isCollapsed ? 'Expand thread messages' : 'Collapse thread messages'}
                      >
                        {isCollapsed ? (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            <span>Expand ({group.messages.length})</span>
                          </>
                        ) : (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            <span>Collapse</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Collapsed Compact Summary */}
                  {isCollapsed ? (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-slate-600 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">
                          Latest ({group.latestMsg.date}):
                        </span>
                        <span className="font-semibold text-slate-800 truncate">{group.latestMsg.keyOutcome}</span>
                      </div>
                      
                      <button
                        onClick={() => setActiveThreadModalId(group.threadId)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 shrink-0"
                      >
                        View Thread History
                      </button>
                    </div>
                  ) : (
                    /* Expanded Thread Messages Stream */
                    <>
                      <div className="p-5 bg-slate-50/50 space-y-4">
                        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                          
                          {group.messages.map((comm, idx) => {
                            const isSent = comm.channel.toLowerCase().includes('sent');

                            return (
                              <div key={comm.id} className="relative group/msg">
                                
                                {/* Timeline Bullet Node */}
                                <div
                                  className={`absolute -left-6 top-3 h-5 w-5 rounded-full border-2 bg-white flex items-center justify-center text-[10px] font-bold ${
                                    isSent
                                      ? 'border-indigo-600 text-indigo-600'
                                      : 'border-blue-600 text-blue-600'
                                  }`}
                                >
                                  {idx + 1}
                                </div>

                                {/* Message Box */}
                                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
                                  
                                  {/* Message Header */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                                        isSent
                                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                          : 'bg-blue-50 text-blue-700 border-blue-200'
                                      }`}>
                                        {isSent ? <Send className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                                        <span>{comm.channel}</span>
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
                                          comm.status === 'Completed'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}
                                      >
                                        <option value="Completed">Completed</option>
                                        <option value="Awaiting Reply">Awaiting Reply</option>
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

                                  {/* Subject & Outcome */}
                                  <div>
                                    <h4 className="font-bold text-xs text-slate-900">{comm.subject}</h4>
                                    <p className="text-xs text-slate-700 mt-1 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                                      {comm.keyOutcome}
                                    </p>
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

      {/* DISPLAY MODE 2: FLAT ALL LOGS TABLE */}
      {displayMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
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
                                comm.status === 'Completed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <option value="Completed">Completed</option>
                              <option value="Awaiting Reply">Awaiting Reply</option>
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
