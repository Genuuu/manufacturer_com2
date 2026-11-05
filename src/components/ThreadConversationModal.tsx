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
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
          isSent
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'bg-blue-50 text-blue-700 border-blue-200'
        }`}
      >
        {isSent ? <Send className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
        <span>{ch}</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 max-h-[88vh] mb-14 sm:mb-0 flex flex-col">
        
        {/* Modal Header (shrink-0) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-xs">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded">
                  Thread {threadId}
                </span>
                <span className="font-bold text-sm text-white">
                  {firstMsg?.manufacturerName || 'Manufacturer'}
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-xs text-slate-300 font-mono">
                  {threadComms.length} {threadComms.length === 1 ? 'Message' : 'Messages'}
                </span>
              </div>
              <h3 className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                {firstMsg?.subject || 'Communication Thread History'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {firstMsg && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCommModalWithThread(firstMsg.manufacturerId, threadId);
                }}
                disabled={!hasPermission('canLogCommunication')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Reply to Thread</span>
              </button>
            )}
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
          <div className="px-5 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-3 text-slate-700">
              <span><strong>Supplier ID:</strong> {manufacturer.id}</span>
              <span>·</span>
              <span><strong>Products:</strong> {manufacturer.productsOfInterest}</span>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
              latestMsg?.status === 'Completed'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              Thread Status: {latestMsg?.status || 'Active'}
            </span>
          </div>
        )}

        {/* Message Timeline Stream (flex-1 min-h-0 overflow-y-auto) */}
        <div className="p-6 bg-slate-50/60 flex-1 min-h-0 overflow-y-auto space-y-6">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            
            {threadComms.map((comm, idx) => {
              const isSent = comm.channel.toLowerCase().includes('sent');

              return (
                <div key={comm.id} className="relative group">
                  
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

                  {/* Message Card */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all hover:border-slate-300">
                    
                    {/* Message Card Header */}
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getChannelBadge(comm.channel)}
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {comm.date}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-500 font-medium">
                          Logged by {comm.createdBy || 'Team Member'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          comm.status === 'Completed'
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
                        <p className="text-xs text-slate-700 mt-1 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                          {comm.keyOutcome}
                        </p>
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

                      {/* Attached Documents */}
                      {(comm.threadDoc || (comm.documentsReceived && comm.documentsReceived.length > 0)) && (
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                            Attached Documents:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {comm.threadDoc && (
                              <button
                                onClick={() => onPreviewDoc(comm.threadDoc!, `Transcript - ${comm.threadDoc}`)}
                                className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-indigo-700 flex items-center gap-1.5 transition-colors"
                              >
                                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                <span>{comm.threadDoc}</span>
                                <Eye className="h-3 w-3 text-slate-400 ml-1" />
                              </button>
                            )}

                            {comm.documentsReceived?.map((doc, dIdx) => (
                              <button
                                key={dIdx}
                                onClick={() => onPreviewDoc(doc, `Specification - ${doc}`)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-mono text-emerald-800 flex items-center gap-1.5 transition-colors"
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
