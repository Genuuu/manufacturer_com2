import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CommunicationEntry, CommChannel, CommStatus } from '../types';
import {
  X,
  Plus,
  Trash2,
  FileText,
  Calendar,
  Sparkles,
  Send,
  MessageSquare,
  Building2,
  AlertCircle,
  Wand2,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface CommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEntry?: CommunicationEntry | null;
  preselectedManufacturerId?: string | null;
  preselectedThreadId?: string | null;
  startWithAiOpen?: boolean;
}

export const CommunicationModal: React.FC<CommunicationModalProps> = ({
  isOpen,
  onClose,
  initialEntry,
  preselectedManufacturerId,
  preselectedThreadId,
  startWithAiOpen = false,
}) => {
  const {
    manufacturers,
    communications,
    addCommunication,
    updateCommunication,
    getNextThreadId,
    getThreadsForManufacturer,
    hasPermission,
  } = useApp();

  const isEditing = Boolean(initialEntry);

  const [date, setDate] = useState('2026-11-04');
  const [manufacturerId, setManufacturerId] = useState('M001');
  const [threadSelection, setThreadSelection] = useState<'New Thread' | string>('New Thread');
  const [channel, setChannel] = useState<CommChannel>('Email - Received');
  const [subject, setSubject] = useState('');
  const [keyOutcome, setKeyOutcome] = useState('');
  const [status, setStatus] = useState<CommStatus>('Completed');
  const [nextAction, setNextAction] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [threadDoc, setThreadDoc] = useState('');
  const [documentsReceived, setDocumentsReceived] = useState<string[]>([]);
  const [newDocName, setNewDocName] = useState('');
  const [informationReceived, setInformationReceived] = useState('');
  const [fullEmailText, setFullEmailText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // AI Paste State
  const [showAiBox, setShowAiBox] = useState(false);
  const [rawText, setRawText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState('');

  const [entryType, setEntryType] = useState<'received' | 'sent' | 'reply'>('received');

  // Sync state on open/edit
  useEffect(() => {
    if (initialEntry) {
      setDate(initialEntry.date);
      setManufacturerId(initialEntry.manufacturerId);
      setThreadSelection(initialEntry.threadId);
      setChannel(initialEntry.channel);
      
      const ch = initialEntry.channel.toLowerCase();
      if (ch.includes('sent') && initialEntry.threadId && initialEntry.threadId !== 'New Thread') {
        setEntryType('reply');
      } else if (ch.includes('sent')) {
        setEntryType('sent');
      } else {
        setEntryType('received');
      }

      setSubject(initialEntry.subject);
      setKeyOutcome(initialEntry.keyOutcome);
      setStatus(initialEntry.status);
      setNextAction(initialEntry.nextAction || '');
      setFollowUpDate(initialEntry.followUpDate || '');
      setThreadDoc(initialEntry.threadDoc || '');
      setFullEmailText(initialEntry.fullEmailText || '');
      setDocumentsReceived(initialEntry.documentsReceived || []);
      setInformationReceived(initialEntry.informationReceived || '');
      setShowAiBox(false);
    } else {
      // New Entry
      setDate('2026-11-04');
      const targetM = preselectedManufacturerId || (manufacturers[0] ? manufacturers[0].id : 'M001');
      setManufacturerId(targetM);

      if (preselectedThreadId) {
        setThreadSelection(preselectedThreadId);
        setEntryType('reply');
        setChannel('Email - Sent');
      } else {
        setThreadSelection('New Thread');
        setEntryType('received');
        setChannel('Email - Received');
      }

      setSubject('');
      setKeyOutcome('');
      setStatus('Completed');
      setNextAction('');
      setFollowUpDate('');
      setThreadDoc('');
      setFullEmailText('');
      setDocumentsReceived([]);
      setInformationReceived('');
      setShowAiBox(startWithAiOpen);
    }
    setErrorMsg('');
    setAiSuccessMsg('');
    setRawText('');
  }, [initialEntry, preselectedManufacturerId, preselectedThreadId, isOpen, startWithAiOpen, manufacturers]);

  if (!isOpen) return null;

  const currentManufacturer = manufacturers.find(m => m.id === manufacturerId);
  const existingThreads = getThreadsForManufacturer(manufacturerId);

  const handleEntryTypeChange = (type: 'received' | 'sent' | 'reply') => {
    setEntryType(type);
    if (type === 'received') {
      setChannel('Email - Received');
    } else if (type === 'sent') {
      setChannel('Email - Sent');
    } else if (type === 'reply') {
      setChannel('Email - Sent');
      if (existingThreads.length > 0 && threadSelection === 'New Thread') {
        setThreadSelection(existingThreads[0]);
      }
    }
  };

  const handleAddDocument = () => {
    if (newDocName.trim()) {
      let finalName = newDocName.trim();
      if (!finalName.toLowerCase().endsWith('.pdf') && !finalName.toLowerCase().endsWith('.doc')) {
        finalName += '.pdf';
      }
      setDocumentsReceived(prev => [...prev, finalName]);
      setNewDocName('');
    }
  };

  const handleRemoveDocument = (idx: number) => {
    setDocumentsReceived(prev => prev.filter((_, i) => i !== idx));
  };

  // AI Auto-Fill Handler
  const handleAiAutoFill = async () => {
    if (!rawText.trim()) {
      setErrorMsg('Please paste the email or chat text first.');
      return;
    }

    setIsAiLoading(true);
    setErrorMsg('');
    setAiSuccessMsg('');

    try {
      const response = await fetch('/api/parse-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          existingManufacturers: manufacturers.map(m => ({ id: m.id, name: m.name })),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to process email text.');
      }

      const data = result.data;

      // Match Manufacturer
      if (data.matchedManufacturerId) {
        setManufacturerId(data.matchedManufacturerId);
      } else if (data.manufacturerName) {
        const match = manufacturers.find(
          m => m.name.toLowerCase() === data.manufacturerName.toLowerCase()
        );
        if (match) setManufacturerId(match.id);
      }

      // Handle Direction & Detected Type
      if (data.detectedType === 'received') {
        handleEntryTypeChange('received');
      } else if (data.detectedType === 'sent') {
        handleEntryTypeChange('sent');
      } else if (data.detectedType === 'reply') {
        handleEntryTypeChange('reply');
      } else if (data.detectedType === 'combined_thread') {
        handleEntryTypeChange('reply');
      }

      if (data.channel) setChannel(data.channel as CommChannel);
      if (data.subject) setSubject(data.subject);
      
      let outcomeText = data.keyOutcome || '';
      if (data.detectedType === 'combined_thread') {
        outcomeText = `[Received]: ${data.inboundContent || 'Vendor provided updates'} | [Reply]: ${data.outboundReply || 'Team acknowledged'}`;
      }
      setKeyOutcome(outcomeText);

      if (data.status) setStatus(data.status as CommStatus);
      if (data.nextAction) setNextAction(data.nextAction);
      if (data.followUpDate) setFollowUpDate(data.followUpDate);
      
      let infoText = data.informationReceived || '';
      if (data.inboundContent && data.outboundReply && !infoText.includes(data.inboundContent)) {
        infoText = `📥 Vendor Statement:\n${data.inboundContent}\n\n📤 Our Response:\n${data.outboundReply}\n\n${infoText}`;
      }
      setInformationReceived(infoText);

      setFullEmailText(rawText);

      if (data.documentsReceived && Array.isArray(data.documentsReceived)) {
        setDocumentsReceived(data.documentsReceived);
      }

      setAiSuccessMsg(
        data.detectedType === 'combined_thread'
          ? '✨ AI identified a Combined Exchange (Vendor Inquiry + Team Reply)! Saved full email text & auto-filled fields below.'
          : '✨ AI successfully parsed your text and saved full email content! Review fields below and click "Record Communication".'
      );
      setShowAiBox(false);
      setRawText('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`AI Parsing Error: ${err.message || String(err)}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setErrorMsg('Subject / Purpose is required.');
      return;
    }

    const mObj = manufacturers.find(m => m.id === manufacturerId);
    const mName = mObj ? mObj.name : 'Unknown';

    let assignedThreadId = threadSelection;
    if (threadSelection === 'New Thread') {
      assignedThreadId = getNextThreadId(manufacturerId);
    }

    if (isEditing && initialEntry) {
      const res = updateCommunication(initialEntry.id, {
        date,
        manufacturerId,
        manufacturerName: mName,
        threadSelection,
        threadId: assignedThreadId,
        channel,
        subject: subject.trim(),
        keyOutcome: keyOutcome.trim(),
        status,
        nextAction: nextAction.trim() || undefined,
        followUpDate: followUpDate || undefined,
        threadDoc: threadDoc.trim() || undefined,
        fullEmailText: fullEmailText.trim() || undefined,
        documentsReceived,
        informationReceived: informationReceived.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }
    } else {
      const res = addCommunication({
        date,
        manufacturerId,
        manufacturerName: mName,
        threadSelection,
        threadId: assignedThreadId,
        channel,
        subject: subject.trim(),
        keyOutcome: keyOutcome.trim(),
        status,
        nextAction: nextAction.trim() || undefined,
        followUpDate: followUpDate || undefined,
        threadDoc: threadDoc.trim() || undefined,
        fullEmailText: fullEmailText.trim() || undefined,
        documentsReceived,
        informationReceived: informationReceived.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 max-h-[88vh] mb-14 sm:mb-0 flex flex-col">
        
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                {isEditing ? 'Edit Communication Entry' : 'Log Supplier Communication'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Record emails, live chats, quotations, and technical deliverables
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* AI Auto-Fill Toggle Bar */}
        {!isEditing && (
          <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex items-center gap-1.5 font-bold text-indigo-950">
              <Wand2 className="h-4 w-4 text-indigo-600 animate-pulse" />
              <span>Copy & Paste Email Auto-Fill</span>
            </div>

            <button
              type="button"
              onClick={() => setShowAiBox(!showAiBox)}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{showAiBox ? 'Hide AI Auto-Fill Box' : '✨ Paste Raw Email/Chat'}</span>
            </button>
          </div>
        )}

        {/* AI Paste Box Drawer */}
        {showAiBox && !isEditing && (
          <div className="p-4 bg-indigo-950 text-white border-b border-indigo-900 space-y-3 shrink-0 overflow-y-auto max-h-[220px] animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-200 flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-indigo-400" />
                <span>Paste raw sent or received email/chat text below:</span>
              </span>
              <span className="text-[10px] font-mono text-indigo-300">Powered by Gemini 3.8 Flash</span>
            </div>

            <textarea
              rows={4}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="Paste email text here..."
              className="w-full text-xs font-sans p-2.5 bg-indigo-900/80 border border-indigo-700 rounded-lg text-white placeholder:text-indigo-300/60 focus:outline-hidden focus:ring-2 focus:ring-indigo-400 leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-indigo-300">
                Automatically extracts manufacturer, subject, outcomes, prices, status & follow-up dates.
              </span>

              <button
                type="button"
                onClick={handleAiAutoFill}
                disabled={isAiLoading || !rawText.trim()}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                    <span>Extracting Fields...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 text-slate-950" />
                    <span>Auto-Fill Form Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* AI Success Banner */}
        {aiSuccessMsg && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{aiSuccessMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs flex-1 min-h-0 overflow-y-auto">
          
          {/* Message Direction / Entry Type Selector */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <span>Message Direction & Type</span>
              </label>
              <span className="text-[11px] text-slate-500">Select entry purpose</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleEntryTypeChange('received')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5 ${
                  entryType === 'received'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold">
                  <span>📩 Received Email</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal leading-tight">Inbound from vendor</span>
              </button>

              <button
                type="button"
                onClick={() => handleEntryTypeChange('sent')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5 ${
                  entryType === 'sent'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold">
                  <span>📤 Sent Email</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal leading-tight">New outbound proposal</span>
              </button>

              <button
                type="button"
                onClick={() => handleEntryTypeChange('reply')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5 ${
                  entryType === 'reply'
                    ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500/20 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold">
                  <span>↩️ Reply to Thread</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal leading-tight">Append to thread</span>
              </button>
            </div>
          </div>
          
          {/* Row 1: Date & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Manufacturer</label>
              <select
                value={manufacturerId}
                onChange={e => {
                  setManufacturerId(e.target.value);
                  setThreadSelection('New Thread');
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
              >
                {manufacturers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.id} - {m.name} ({m.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Thread & Channel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Thread Selection
              </label>
              <select
                value={threadSelection}
                onChange={e => setThreadSelection(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              >
                <option value="New Thread">✨ Start New Thread (Auto ID: {getNextThreadId(manufacturerId)})</option>
                {existingThreads.map(tid => (
                  <option key={tid} value={tid}>
                    Append to Existing: {tid}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Channel / Direction</label>
              <select
                value={channel}
                onChange={e => setChannel(e.target.value as CommChannel)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
              >
                <option value="Email - Received">Email - Received</option>
                <option value="Email - Sent">Email - Sent</option>
                <option value="Live Chat (Session)">Live Chat (Session)</option>
                <option value="Website">Website Form / Inquiry</option>
                <option value="Phone Call">Phone Call</option>
                <option value="Video Meeting">Video Meeting</option>
                <option value="Portal / Ticket">Portal / Ticket</option>
              </select>
            </div>
          </div>

          {/* Subject & Purpose */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Subject / Purpose *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. 5,000-unit RFQ for A7671G-MBXV, FoC sample offer & Technical Docs"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>

          {/* Key Outcome */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Key Outcome / Latest Update</label>
            <textarea
              rows={2}
              value={keyOutcome}
              onChange={e => setKeyOutcome(e.target.value)}
              placeholder="e.g. Received 5,000-unit pricing: A7671G-MBXV @ $6.72 EXW HK; Lead time 6–8 weeks"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>

          {/* Row 3: Status, Follow-up Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as CommStatus)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
              >
                <option value="Completed">Completed</option>
                <option value="Awaiting Reply">Awaiting Reply</option>
                <option value="Information Received">Information Received</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Action Required">Action Required</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Follow-up Date (Optional)</label>
              <input
                type="date"
                value={followUpDate}
                onChange={e => setFollowUpDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>

          {/* Next Action */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Next Action</label>
            <input
              type="text"
              value={nextAction}
              onChange={e => setNextAction(e.target.value)}
              placeholder="e.g. Review 5k unit quotation ($6.72 / $5.42 EXW HK) & confirm FoC samples request"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>

          {/* Information Received / Detailed notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Information Received / Technical Specifications
            </label>
            <textarea
              rows={3}
              value={informationReceived}
              onChange={e => setInformationReceived(e.target.value)}
              placeholder="Enter technical details, pricing breakdowns, part numbers, compatibility notes..."
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-sans leading-relaxed"
            />
          </div>

          {/* Attached Files Section */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <label className="block font-semibold text-slate-800">
              Attached Documents & Chat Transcripts
            </label>

            {/* Saved Full Email Content */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Full Pasted Email Text (Saved directly in record)</span>
                <span className="text-[10px] text-slate-400 font-normal">Auto-saved from AI paste or manual input</span>
              </label>
              <textarea
                rows={3}
                value={fullEmailText}
                onChange={e => setFullEmailText(e.target.value)}
                placeholder="Full raw email text or chat transcript saved in database..."
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs leading-relaxed"
              />
            </div>

            {/* Technical Documents Received (e.g. Datasheets, Spec manuals) */}
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                Technical Manuals / Specifications Received (e.g. <code>A7671G_SPEC_202508.pdf</code>)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDocName}
                  onChange={e => setNewDocName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDocument();
                    }
                  }}
                  placeholder="Enter manual filename..."
                  className="flex-1 p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddDocument}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-900"
                >
                  + Add
                </button>
              </div>

              {documentsReceived.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {documentsReceived.map((doc, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-mono text-slate-700"
                    >
                      <FileText className="h-3 w-3 text-emerald-600" />
                      <span>{doc}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(idx)}
                        className="text-slate-400 hover:text-rose-600 ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 font-mono">
              Auto Thread Key: <code>{manufacturerId}|...</code>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-xs"
              >
                {isEditing ? 'Save Changes' : 'Record Communication'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
