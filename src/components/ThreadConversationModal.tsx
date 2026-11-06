import React from 'react';
import { useApp } from '../context/AppContext';
import { CommunicationEntry } from '../types';
import {
  X,
  MessageSquare,
  Building2,
  Calendar,
  FileText,
  Eye,
  Plus,
  Edit2,
  Trash2,
  Send,
  Mail,
  Clock,
  ArrowRight,
  Paperclip,
  Download,
} from 'lucide-react';

interface ThreadConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string | null;
  onOpenCommModalWithThread: (mId: string, threadId: string) => void;
  onPreviewDoc: (filename: string, title: string) => void;
}

export const ThreadConversationModal: React.FC<ThreadConversationModalProps> = ({
  isOpen,
  onClose,
  threadId,
  onOpenCommModalWithThread,
  onPreviewDoc,
}) => {
  const {
    communications,
    manufacturers,
    deleteCommunication,
    hasPermission,
  } = useApp();

  if (!isOpen || !threadId) return null;

  // Find all messages in this thread sorted chronologically
  const threadComms = communications
    .filter(c => c.threadId === threadId)
    .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

  const firstMsg = threadComms[0];
  const latestMsg = threadComms[threadComms.length - 1];
  const manufacturer = firstMsg
    ? manufacturers.find(m => m.id === firstMsg.manufacturerId)
    : null;

  const handleEdit = (c: CommunicationEntry) => {
    // You can handle edit
  };

  const handleDelete = (c: CommunicationEntry) => {
    if (!hasPermission('canDeleteCommunication')) {
      alert('Permission Denied: Only Manager or Admin can delete communication records.');
      return;
    }
    if (confirm(`Delete message for ${c.manufacturerName} - "${c.subject}"?`)) {
      deleteCommunication(c.id);
    }
  };

  const getChannelBadge = (ch: string) => {
    const isSent = ch.toLowerCase().includes('sent');
    const isLiveChat = ch.toLowerCase().includes('live chat');
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
          isLiveChat
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : isSent
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'bg-blue-50 text-blue-700 border-blue-200'
        }`}
      >
        {isLiveChat ? (
          <MessageSquare className="h-3 w-3" />
        ) : isSent ? (
          <Send className="h-3 w-3" />
        ) : (
          <Mail className="h-3 w-3" />
        )}
        <span>{ch}</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden sm:my-auto animate-in fade-in zoom-in-95 max-h-[92dvh] sm:max-h-[88vh] flex flex-col">
        
        {/* Modal Header (shrink-0) */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-xs shrink-0">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="font-mono text-[11px] sm:text-xs font-bold bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded">
                  Thread {threadId}
                </span>
                <span className="font-bold text-xs sm:text-sm text-white truncate">
                  {firstMsg?.manufacturerName || 'Manufacturer'}
                </span>
                <span className="text-slate-400 hidden xs:inline">·</span>
                <span className="text-[11px] sm:text-xs text-slate-300 font-mono">
                  {threadComms.length} {threadComms.length === 1 ? 'Msg' : 'Msgs'}
                </span>
              </div>
              <h3 className="text-[11px] sm:text-xs text-slate-300 line-clamp-1 mt-0.5">
                {firstMsg?.subject || 'Communication Thread History'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Supplier Banner Summary (shrink-0) */}
        {manufacturer && (
          <div className="px-3.5 sm:px-5 py-2.5 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-slate-700 min-w-0">
              <span><strong>ID:</strong> {manufacturer.id}</span>
              <span>·</span>
              <span className="truncate max-w-[200px] sm:max-w-md"><strong>Products:</strong> {manufacturer.productsOfInterest}</span>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${
              latestMsg?.status === 'Completed'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              Status: {latestMsg?.status || 'Active'}
            </span>
          </div>
        )}

        {/* Message Timeline Stream (flex-1 min-h-0 overflow-y-auto) */}
        <div className="p-3.5 sm:p-6 bg-slate-50/60 flex-1 min-h-0 overflow-y-auto space-y-4 sm:space-y-6">
          <div className="relative pl-5 sm:pl-6 space-y-4 sm:space-y-6 before:absolute before:left-2 sm:before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            
            {threadComms.map((comm, idx) => {
              const isSent = comm.channel.toLowerCase().includes('sent');
              const isLiveChat =
                comm.channel.toLowerCase().includes('live chat') ||
                Boolean(comm.chatTurns && comm.chatTurns.length > 0) ||
                Boolean(comm.outboundSummary && comm.inboundResponse);

              return (
                <div key={comm.id} className="relative group">
                  
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

                  {/* Message Card */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all hover:border-slate-300">
                    
                    {/* Message Card Header */}
                    <div className="p-2.5 sm:p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {getChannelBadge(comm.channel)}
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {comm.date}
                        </span>
                        <span className="text-slate-300 hidden xs:inline">·</span>
                        <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
                          {comm.createdBy || 'Team Member'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          comm.status === 'Completed' || comm.status === 'Reply Received'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : comm.status === 'Information Received'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {comm.status}
                        </span>
                      </div>
                    </div>

                    {/* Message Card Content */}
                    <div className="p-4 space-y-3">
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

                      {comm.informationReceived && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Technical Specifications / Quotation Details:
                          </span>
                          <div className="text-xs text-slate-800 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed whitespace-pre-line">
                            {comm.informationReceived}
                          </div>
                        </div>
                      )}

                      {/* Attached Documents & Files */}
                      {(comm.threadDoc || (comm.documentsReceived && comm.documentsReceived.length > 0) || (comm.attachments && comm.attachments.length > 0)) && (
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1">
                            <Paperclip className="h-3 w-3 text-indigo-500" />
                            <span>Attached Documents & Files:</span>
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {comm.attachments?.map(att => (
                              <button
                                key={att.id}
                                onClick={() => onPreviewDoc(att.name, `Attachment - ${att.name}`)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-mono text-indigo-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                                <span className="max-w-[200px] truncate">{att.name}</span>
                                <Eye className="h-3 w-3 text-indigo-500 ml-1" />
                              </button>
                            ))}

                            {comm.threadDoc && !comm.attachments?.some(a => a.name === comm.threadDoc) && (
                              <button
                                onClick={() => onPreviewDoc(comm.threadDoc!, `Transcript - ${comm.threadDoc}`)}
                                className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-indigo-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                <span>{comm.threadDoc}</span>
                                <Eye className="h-3 w-3 text-slate-400 ml-1" />
                              </button>
                            )}

                            {comm.documentsReceived?.filter(doc => !comm.attachments?.some(a => a.name === doc)).map((doc, dIdx) => (
                              <button
                                key={dIdx}
                                onClick={() => onPreviewDoc(doc, `Specification - ${doc}`)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-mono text-emerald-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              >
                                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{doc}</span>
                                <Eye className="h-3 w-3 text-emerald-600 ml-1" />
                              </button>
                            ))}
                          </div>
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

                </div>
              );
            })}

          </div>
        </div>

        {/* Modal Footer (shrink-0) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            Thread Key: {threadId} · {threadComms.length} entries recorded
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
          >
            Close Conversation View
          </button>
        </div>

      </div>
    </div>
  );
};
