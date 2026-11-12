import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CommunicationEntry, CommStatus } from '../types';
import {
  Search,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  RotateCcw,
  Mail,
  MessageSquare,
  Globe,
  Clock,
  Layers,
  Paperclip,
  AlertCircle,
} from 'lucide-react';
import { ThreadConversationModal } from './ThreadConversationModal';
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

  const [displayMode, setDisplayMode] = useState<'threads' | 'table'>('threads');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('ALL');
  const [selectedCommType, setSelectedCommType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

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

  const commTypes = useMemo(() => {
    const types = new Set<string>();
    communications.forEach(c => {
      if (c.channel) types.add(c.channel);
    });
    ['Email - Received', 'Email - Sent', 'Live Chat (Session)', 'Website'].forEach(t =>
      types.add(t)
    );
    return Array.from(types);
  }, [communications]);

  const awaitingReplyCount = communications.filter(c => c.status === 'Awaiting Reply').length;

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
    return communications
      .filter(c => {
        if (selectedManufacturer !== 'ALL' && c.manufacturerId !== selectedManufacturer) {
          return false;
        }

        if (selectedCommType !== 'ALL') {
          if (selectedCommType === 'ALL_EMAILS') {
            if (!c.channel.toLowerCase().includes('email')) return false;
          } else if (c.channel !== selectedCommType) {
            return false;
          }
        }

        if (selectedStatus !== 'ALL') {
          if (selectedStatus === 'ACTION_REQUIRED_GROUP') {
            if (!isCommActionRequired(c)) return false;
          } else if (c.status !== selectedStatus) {
            return false;
          }
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            (c.subject || '').toLowerCase().includes(q) ||
            (c.keyOutcome || '').toLowerCase().includes(q) ||
            (c.manufacturerName || '').toLowerCase().includes(q) ||
            (c.manufacturerId || '').toLowerCase().includes(q) ||
            (c.threadId || '').toLowerCase().includes(q) ||
            (c.channel || '').toLowerCase().includes(q) ||
            (c.informationReceived || '').toLowerCase().includes(q) ||
            (c.nextAction || '').toLowerCase().includes(q)
          );
        }

        return true;
      })
      .sort(compareCommByEntryOrder);
  }, [communications, selectedManufacturer, selectedCommType, selectedStatus, searchQuery]);

  // Group filtered messages into Thread Groups
  const threadGroups = useMemo(() => {
    const groupsMap = new Map<string, CommunicationEntry[]>();
    const sorted = [...filteredComms].sort(compareCommByEntryOrder);

    sorted.forEach(c => {
      const tid = c.threadId || 'T001';
      if (!groupsMap.has(tid)) {
        groupsMap.set(tid, []);
      }
      groupsMap.get(tid)!.push(c);
    });

    return Array.from(groupsMap.entries())
      .map(([threadId, msgs]) => {
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
      })
      .sort((a, b) => compareCommByEntryOrder(b.latestMsg, a.latestMsg));
  }, [filteredComms]);

  const isFiltered =
    selectedManufacturer !== 'ALL' ||
    selectedCommType !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    Boolean(searchQuery.trim());

  const resetFilters = () => {
    setSelectedManufacturer('ALL');
    setSelectedCommType('ALL');
    setSelectedStatus('ALL');
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
      alert('Permission Denied: Only Moderator or Admin can delete communication records.');
      return;
    }
    if (confirm(`Delete record for ${c.manufacturerName} - "${c.subject}"?`)) {
      deleteCommunication(c.id);
    }
  };

  const getChannelIcon = (ch: string) => {
    if (ch.toLowerCase().includes('email')) return <Mail className="h-3.5 w-3.5 text-blue-600" />;
    if (ch.toLowerCase().includes('chat'))
      return <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />;
    if (ch.toLowerCase().includes('website'))
      return <Globe className="h-3.5 w-3.5 text-indigo-600" />;
    return <Clock className="h-3.5 w-3.5 text-slate-500" />;
  };

  return (
    <div className="space-y-3">
      {/* SINGLE-ROW UNIFIED FILTER BAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Left: View Toggle + Search + Supplier Select */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <div className="grid grid-cols-2 sm:flex items-center bg-slate-100 p-1 rounded-lg shrink-0">
            <button
              onClick={() => setDisplayMode('threads')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                displayMode === 'threads'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span>Threads ({threadGroups.length})</span>
            </button>

            <button
              onClick={() => setDisplayMode('table')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                displayMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5 shrink-0" />
              <span>All Logs ({filteredComms.length})</span>
            </button>
          </div>

          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search threads, outcomes, specs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-6 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedManufacturer}
            onChange={e => setSelectedManufacturer(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-semibold cursor-pointer shrink-0"
          >
            <option value="ALL">All Suppliers ({manufacturers.length})</option>
            {manufacturers.map(m => (
              <option key={m.id} value={m.id}>
                {m.id} · {m.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCommType}
            onChange={e => setSelectedCommType(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium cursor-pointer shrink-0"
          >
            <option value="ALL">All Channels</option>
            <option value="ALL_EMAILS">All Emails</option>
            {commTypes.map(ct => (
              <option key={ct} value={ct}>
                {ct}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Segmented Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setSelectedStatus('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedStatus === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>

            <button
              onClick={() =>
                setSelectedStatus(selectedStatus === 'Awaiting Reply' ? 'ALL' : 'Awaiting Reply')
              }
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedStatus === 'Awaiting Reply'
                  ? 'bg-white text-amber-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Awaiting ({awaitingReplyCount})
            </button>

            <button
              onClick={() =>
                setSelectedStatus(
                  selectedStatus === 'ACTION_REQUIRED_GROUP' ? 'ALL' : 'ACTION_REQUIRED_GROUP'
                )
              }
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                selectedStatus === 'ACTION_REQUIRED_GROUP'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-600 hover:text-rose-700'
              }`}
            >
              <AlertCircle className="h-3 w-3" />
              <span>Action Required ({actionRequiredItems.length})</span>
            </button>
          </div>

          {isFiltered && (
            <button
              onClick={resetFilters}
              className="p-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
              title="Reset filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ACTION REQUIRED SUMMARY PANEL WHEN FILTERED TO ACTION REQUIRED */}
      {selectedStatus === 'ACTION_REQUIRED_GROUP' && actionRequiredItems.length > 0 && (
        <div className="bg-white rounded-xl border border-rose-200 overflow-hidden">
          <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-xs font-bold text-rose-900">
            <span>What Requires Action ({actionRequiredItems.length})</span>
            <button
              onClick={() => setSelectedStatus('ALL')}
              className="text-rose-700 hover:underline font-semibold cursor-pointer"
            >
              Show All Logs
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {actionRequiredItems.map(item => (
              <div
                key={item.id}
                className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="font-mono font-bold text-indigo-600">{item.threadId}</span>
                    <span>·</span>
                    <span className="font-bold text-slate-900">{item.manufacturerName}</span>
                    {item.followUpDate && (
                      <>
                        <span>·</span>
                        <span className="font-mono text-amber-700 tabular-nums">
                          Due {item.followUpDate}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="font-semibold text-rose-700 truncate mt-0.5">
                    Action: {item.nextAction || item.keyOutcome || item.subject}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setActiveThreadModalId(item.threadId)}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    Thread
                  </button>
                  <button
                    onClick={() => onOpenCommModal(item)}
                    disabled={!hasPermission('canEditCommunication')}
                    className="px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Edit
                  </button>
                  {hasPermission('canEditCommunication') && (
                    <button
                      onClick={() => handleStatusChange(item.id, 'Completed')}
                      className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DISPLAY MODE 1: THREAD CONVERSATION GROUPS */}
      {displayMode === 'threads' && (
        <div className="space-y-2">
          {threadGroups.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-600">
                No communication threads match your filters.
              </p>
              {isFiltered && (
                <button
                  onClick={resetFilters}
                  className="mt-1.5 text-indigo-600 hover:underline font-semibold cursor-pointer"
                >
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
                  className={`bg-white rounded-xl border overflow-hidden transition-colors ${
                    latestActionMsg ? 'border-rose-300' : 'border-slate-200'
                  }`}
                >
                  {/* Thread Header */}
                  <div
                    onClick={() => toggleThreadExpand(group.threadId)}
                    className="px-4 py-3 hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-mono font-bold text-indigo-600 shrink-0">
                          {group.threadId}
                        </span>
                        <span className="font-bold text-slate-900">{group.manufacturerName}</span>
                        <span className="text-slate-400">—</span>
                        <span className="text-slate-700 font-medium truncate">
                          {group.primarySubject}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                          ({group.messages.length})
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 truncate">
                        <span className="font-mono tabular-nums">{group.latestMsg.date}:</span>{' '}
                        {group.latestMsg.keyOutcome}
                      </div>

                      {isCollapsed && latestActionMsg && (
                        <div className="text-xs font-semibold text-rose-600 truncate pt-0.5">
                          Action:{' '}
                          {latestActionMsg.nextAction ||
                            latestActionMsg.keyOutcome ||
                            latestActionMsg.subject}
                        </div>
                      )}
                    </div>

                    <div
                      className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      <span
                        className={`text-[11px] font-semibold ${
                          group.status === 'Completed' || group.status === 'Reply Received'
                            ? 'text-emerald-600'
                            : group.status === 'Action Required'
                            ? 'text-rose-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {group.status}
                      </span>

                      <button
                        onClick={() => setActiveThreadModalId(group.threadId)}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                      >
                        Open Thread
                      </button>

                      <button
                        onClick={() => toggleThreadExpand(group.threadId)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
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

                  {/* Expanded Thread Messages Stream */}
                  {!isCollapsed && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/40">
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
                          <div key={comm.id} className="px-4 py-3 space-y-1.5 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-slate-500">
                                <span className="font-mono text-[11px] font-bold text-slate-400 tabular-nums">
                                  #{idx + 1}
                                </span>
                                <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                  {getChannelIcon(comm.channel)}
                                  <span>{comm.channel}</span>
                                </span>
                                <span>·</span>
                                <span className="font-mono tabular-nums">{comm.date}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <select
                                  value={comm.status}
                                  onChange={e =>
                                    handleStatusChange(comm.id, e.target.value as CommStatus)
                                  }
                                  disabled={!hasPermission('canEditCommunication')}
                                  className="text-[11px] font-semibold rounded-md px-2 py-0.5 border border-slate-200 bg-white text-slate-800 cursor-pointer"
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

                            <div>
                              <div className="font-bold text-slate-900">{comm.subject}</div>
                              {comm.keyOutcome && (
                                <p className="text-slate-600 mt-0.5 whitespace-pre-line">
                                  {comm.keyOutcome}
                                </p>
                              )}
                            </div>

                            {(comm.nextAction || isCommActionRequired(comm)) && (
                              <div className="text-rose-600 font-semibold">
                                Action: {comm.nextAction || comm.keyOutcome || 'Review required'}
                                {comm.followUpDate ? ` (Due ${comm.followUpDate})` : ''}
                              </div>
                            )}

                            {hasDocs && (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {comm.attachments?.map(att => (
                                  <button
                                    key={att.id}
                                    onClick={() =>
                                      onPreviewDoc(att.name, `Attachment - ${att.name}`)
                                    }
                                    className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
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
                                      onClick={() =>
                                        onPreviewDoc(doc, `Specification - ${doc}`)
                                      }
                                      className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <FileText className="h-3 w-3" />
                                      <span className="max-w-[180px] truncate">{doc}</span>
                                    </button>
                                  ))}
                              </div>
                            )}

                            {hasExtraDetails && (
                              <details className="pt-1">
                                <summary className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer select-none">
                                  View Transcript & Technical Notes
                                </summary>
                                <div className="mt-2 space-y-2 pl-2 border-l border-slate-200">
                                  {comm.informationReceived && (
                                    <div className="text-slate-700 whitespace-pre-line">
                                      {comm.informationReceived}
                                    </div>
                                  )}
                                  {comm.chatTurns && comm.chatTurns.length > 0 && (
                                    <div className="space-y-1">
                                      {comm.chatTurns.map((turn, tIdx) => (
                                        <div key={turn.id || tIdx} className="text-[11px]">
                                          <span className="font-bold text-slate-800 mr-1.5">
                                            {turn.sender === 'us'
                                              ? 'Us:'
                                              : `${comm.manufacturerName}:`}
                                          </span>
                                          <span className="text-slate-600 whitespace-pre-line">
                                            {turn.message}
                                          </span>
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

      {/* DISPLAY MODE 2: HIGH-DENSITY ALL LOGS TABLE */}
      {displayMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="py-2.5 px-3 w-8"></th>
                  <th className="py-2.5 px-3 w-24">Date</th>
                  <th className="py-2.5 px-3 w-36">Supplier</th>
                  <th className="py-2.5 px-3 w-28">Thread</th>
                  <th className="py-2.5 px-3 w-32">Channel</th>
                  <th className="py-2.5 px-3">Subject & Outcome</th>
                  <th className="py-2.5 px-3 w-36">Status</th>
                  <th className="py-2.5 px-3 w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComms.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No communication records match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredComms.map(comm => {
                    const isExpanded = expandedRowId === comm.id;
                    return (
                      <React.Fragment key={comm.id}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => setExpandedRowId(isExpanded ? null : comm.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                            {comm.date}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {comm.manufacturerName}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => setActiveThreadModalId(comm.threadId)}
                              className="font-mono font-bold text-indigo-600 hover:underline cursor-pointer"
                            >
                              {comm.threadId}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {comm.channel}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900 line-clamp-1">
                              {comm.subject}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {comm.keyOutcome}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <select
                              value={comm.status}
                              onChange={e =>
                                handleStatusChange(comm.id, e.target.value as CommStatus)
                              }
                              disabled={!hasPermission('canEditCommunication')}
                              className="text-[11px] font-semibold rounded-md px-2 py-1 border border-slate-200 bg-white text-slate-800 cursor-pointer"
                            >
                              <option value="Completed">Completed</option>
                              <option value="Awaiting Reply">Awaiting Reply</option>
                              <option value="Reply Received">Reply Received</option>
                              <option value="Information Received">Information Received</option>
                              <option value="Pending Review">Pending Review</option>
                              <option value="Action Required">Action Required</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => onOpenCommModal(comm)}
                                disabled={!hasPermission('canEditCommunication')}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded disabled:opacity-30 cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(comm)}
                                disabled={!hasPermission('canDeleteCommunication')}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded disabled:opacity-30 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/60">
                            <td colSpan={8} className="p-3.5 pl-10 border-b border-slate-200 space-y-2">
                              {comm.informationReceived && (
                                <div className="text-slate-700 whitespace-pre-line">
                                  <strong className="text-slate-900 block mb-0.5">
                                    Technical Notes:
                                  </strong>
                                  {comm.informationReceived}
                                </div>
                              )}
                              {comm.nextAction && (
                                <div className="text-rose-600 font-semibold">
                                  Next Action: {comm.nextAction}
                                </div>
                              )}
                              {comm.fullEmailText && (
                                <div className="p-2.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] whitespace-pre-wrap">
                                  {comm.fullEmailText}
                                </div>
                              )}
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

      {/* Focused Thread Conversation Modal */}
      <ThreadConversationModal
        isOpen={Boolean(activeThreadModalId)}
        threadId={activeThreadModalId}
        onClose={() => setActiveThreadModalId(null)}
        onOpenCommModalWithThread={() => {
          setActiveThreadModalId(null);
          onOpenCommModal();
        }}
        onPreviewDoc={onPreviewDoc}
      />
    </div>
  );
};
