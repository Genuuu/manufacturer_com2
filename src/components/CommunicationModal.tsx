import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CommunicationEntry, CommChannel, CommStatus, FileAttachment, ChatTurn } from '../types';
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
  Paperclip,
  Upload,
  Download,
  Image as ImageIcon,
  FileCheck,
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

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manufacturerId, setManufacturerId] = useState(manufacturers[0]?.id || '');
  const [threadSelection, setThreadSelection] = useState<'New Thread' | string>('New Thread');
  const [channel, setChannel] = useState<CommChannel>('Email - Received');
  const [subject, setSubject] = useState('');
  const [keyOutcome, setKeyOutcome] = useState('');
  const [status, setStatus] = useState<CommStatus>('Completed');
  const [nextAction, setNextAction] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [threadDoc, setThreadDoc] = useState('');
  const [documentsReceived, setDocumentsReceived] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [newDocName, setNewDocName] = useState('');
  const [informationReceived, setInformationReceived] = useState('');
  const [fullEmailText, setFullEmailText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // AI Paste State
  const [showAiBox, setShowAiBox] = useState(false);
  const [rawText, setRawText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState('');

  const [entryType, setEntryType] = useState<'received' | 'sent' | 'live_chat'>('received');
  const [outboundSummary, setOutboundSummary] = useState('');
  const [inboundResponse, setInboundResponse] = useState('');
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([
    { id: 'turn-1', sender: 'us', timestamp: '', message: '' },
    { id: 'turn-2', sender: 'supplier', timestamp: '', message: '' },
  ]);

  const createDefaultChatTurns = (): ChatTurn[] => [
    { id: `turn-${Date.now()}-1`, sender: 'us', timestamp: '', message: '' },
    { id: `turn-${Date.now()}-2`, sender: 'supplier', timestamp: '', message: '' },
  ];

  // Sync state on open/edit
  useEffect(() => {
    if (initialEntry) {
      setDate(initialEntry.date);
      setManufacturerId(initialEntry.manufacturerId);
      setThreadSelection(initialEntry.threadId);
      setChannel(initialEntry.channel);
      
      const ch = initialEntry.channel.toLowerCase();
      if (ch.includes('live chat') || (initialEntry.chatTurns && initialEntry.chatTurns.length > 0)) {
        setEntryType('live_chat');
      } else if (ch.includes('sent')) {
        setEntryType('sent');
      } else {
        setEntryType('received');
      }

      setSubject(initialEntry.subject);
      setKeyOutcome(initialEntry.keyOutcome);
      setOutboundSummary(initialEntry.outboundSummary || '');
      setInboundResponse(initialEntry.inboundResponse || '');

      if (initialEntry.chatTurns && initialEntry.chatTurns.length > 0) {
        setChatTurns(initialEntry.chatTurns);
      } else if (initialEntry.outboundSummary || initialEntry.inboundResponse) {
        const legacyTurns: ChatTurn[] = [];
        if (initialEntry.outboundSummary) {
          legacyTurns.push({
            id: `turn-${Date.now()}-1`,
            sender: 'us',
            timestamp: '',
            message: initialEntry.outboundSummary,
          });
        }
        if (initialEntry.inboundResponse) {
          legacyTurns.push({
            id: `turn-${Date.now()}-2`,
            sender: 'supplier',
            timestamp: '',
            message: initialEntry.inboundResponse,
          });
        }
        setChatTurns(legacyTurns.length > 0 ? legacyTurns : createDefaultChatTurns());
      } else {
        setChatTurns(createDefaultChatTurns());
      }

      setStatus(initialEntry.status);
      setNextAction(initialEntry.nextAction || '');
      setFollowUpDate(initialEntry.followUpDate || '');
      setThreadDoc(initialEntry.threadDoc || '');
      setFullEmailText(initialEntry.fullEmailText || '');
      setDocumentsReceived(initialEntry.documentsReceived || []);
      setAttachments(initialEntry.attachments || []);
      setInformationReceived(initialEntry.informationReceived || '');
      setShowAiBox(false);
    } else {
      // New Entry
      setDate(new Date().toISOString().split('T')[0]);
      const targetM = preselectedManufacturerId || (manufacturers[0] ? manufacturers[0].id : '');
      setManufacturerId(targetM);

      if (preselectedThreadId) {
        setThreadSelection(preselectedThreadId);
        setEntryType('sent');
        setChannel('Email - Sent');
      } else {
        setThreadSelection('New Thread');
        setEntryType('received');
        setChannel('Email - Received');
      }

      setSubject('');
      setKeyOutcome('');
      setOutboundSummary('');
      setInboundResponse('');
      setChatTurns(createDefaultChatTurns());
      setStatus('Completed');
      setNextAction('');
      setFollowUpDate('');
      setThreadDoc('');
      setFullEmailText('');
      setDocumentsReceived([]);
      setAttachments([]);
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

  const handleEntryTypeChange = (type: 'received' | 'sent' | 'live_chat') => {
    setEntryType(type);
    if (type === 'received') {
      setChannel('Email - Received');
    } else if (type === 'sent') {
      setChannel('Email - Sent');
    } else if (type === 'live_chat') {
      setChannel('Live Chat (Session)');
    }
  };

  const handleChannelChange = (newChannel: CommChannel) => {
    setChannel(newChannel);
    if (newChannel === 'Live Chat (Session)') {
      setEntryType('live_chat');
    } else if (newChannel.toLowerCase().includes('sent')) {
      setEntryType('sent');
    } else if (newChannel.toLowerCase().includes('received')) {
      setEntryType('received');
    }
  };

  const handleAddChatTurn = (sender: 'us' | 'supplier') => {
    setChatTurns(prev => [
      ...prev,
      {
        id: `turn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sender,
        timestamp: '',
        message: '',
      },
    ]);
  };

  const handleUpdateChatTurn = (id: string, patch: Partial<ChatTurn>) => {
    setChatTurns(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  };

  const handleRemoveChatTurn = (id: string) => {
    setChatTurns(prev => (prev.length > 1 ? prev.filter(t => t.id !== id) : prev));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const newDocNames: string[] = [];

    list.forEach(file => {
      const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      newDocNames.push(file.name);

      const reader = new FileReader();
      if (file.size <= 3 * 1024 * 1024) {
        reader.onload = e => {
          const dataUrl = e.target?.result as string;
          setAttachments(prev => [
            ...prev.filter(a => a.name !== file.name),
            {
              id,
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              dataUrl,
              uploadedAt: new Date().toISOString(),
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachments(prev => [
          ...prev.filter(a => a.name !== file.name),
          {
            id,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            uploadedAt: new Date().toISOString(),
          },
        ]);
      }
    });

    if (newDocNames.length > 0) {
      setDocumentsReceived(prev => Array.from(new Set([...prev, ...newDocNames])));
    }
  };

  const handleRemoveAttachment = (attId: string, attName: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attId));
    setDocumentsReceived(prev => prev.filter(d => d !== attName));
  };

  const handleDownloadAttachmentFile = (att: FileAttachment) => {
    if (att.dataUrl) {
      const link = document.createElement('a');
      link.href = att.dataUrl;
      link.download = att.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleAddDocument = () => {
    if (newDocName.trim()) {
      let finalName = newDocName.trim();
      if (!finalName.toLowerCase().endsWith('.pdf') && !finalName.toLowerCase().endsWith('.doc')) {
        finalName += '.pdf';
      }
      setDocumentsReceived(prev => Array.from(new Set([...prev, finalName])));
      setNewDocName('');
    }
  };

  const handleRemoveDocument = (idx: number) => {
    const docName = documentsReceived[idx];
    setDocumentsReceived(prev => prev.filter((_, i) => i !== idx));
    setAttachments(prev => prev.filter(a => a.name !== docName));
  };

  // Fallback local structured parser when backend /api/parse-email is unreachable in static deployments
  const parseEmailLocally = (textInput: string) => {
    const clean = textInput.trim();

    // Strip out older quoted email threads at the bottom ("On ... wrote:", "-----Original Message-----", "> ")
    const splitMarkers = [
      /^on\s+.+wrote:\s*$/im,
      /^-----original message-----/im,
      /^from:\s+.+\nsent:\s+/im,
      /^_{5,}/m,
    ];
    let primaryMessage = clean;
    for (const marker of splitMarkers) {
      const match = primaryMessage.match(marker);
      if (match && match.index && match.index > 30) {
        primaryMessage = primaryMessage.slice(0, match.index).trim();
        break;
      }
    }

    const lines = primaryMessage
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => Boolean(l) && !l.startsWith('>'));

    // 1. Respect pre-selected Manufacturer, Direction, and Channel
    const selectedM = manufacturers.find(m => m.id === manufacturerId);
    const matchedManufacturerId = selectedM ? selectedM.id : manufacturerId;
    const manufacturerName = selectedM ? selectedM.name : 'Supplier';

    const detectedType: 'received' | 'sent' | 'live_chat' = entryType;
    const detectedChannel: CommChannel = channel;

    // Prior thread messages for context
    const priorThreadMsgs = communications
      .filter(
        c =>
          c.manufacturerId === manufacturerId &&
          (threadSelection === 'New Thread' ? false : c.threadId === threadSelection)
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lastThreadMsg = priorThreadMsgs.length > 0 ? priorThreadMsgs[priorThreadMsgs.length - 1] : null;

    // 2. Clean body lines (remove headers, greetings, sign-offs)
    const bodyLines = lines.filter(
      l =>
        !/^(from|to|cc|bcc|date|sent|subject):/i.test(l) &&
        !/^(hi|hello|dear|good morning|good afternoon|good evening)\b/i.test(l) &&
        !/^(best regards|sincerely|kind regards|warm regards|regards|thanks|thank you|cheers)[,!]?$/i.test(l)
    );

    // 3. Extract technical & commercial sentences
    const techSpecLines = bodyLines.filter(l =>
      /(\$|usd|eur|rmb|cny|quote|quotation|price|pricing|moq|lead time|week|day|sample|evk|confirm|availab|spec|datasheet|gerber|schematic|bom|pcb|module|antenna|ic|chip|shipping|dhl|fedex|exw|fob|ddp|payment|invoice|pi|po|part|v\d|\d+\s*(pcs|units|k|mhz|ghz|v|ma|dbm|mm))/i.test(
        l
      )
    );

    // 4. Formulate Subject / Purpose based on content + thread flow
    let extractedSubject = '';
    const lowerBody = bodyLines.join(' ').toLowerCase();

    if (detectedType === 'live_chat') {
      if (/quote|quotation|price|pricing|cost|moq/i.test(lowerBody)) {
        extractedSubject = `Live chat session regarding pricing, MOQ, and lead time with ${manufacturerName}`;
      } else if (/sample|evk|evaluation|test/i.test(lowerBody)) {
        extractedSubject = `Live chat session on evaluation samples and specs with ${manufacturerName}`;
      } else if (bodyLines[0]) {
        extractedSubject = `Live Chat Session: ${bodyLines[0].slice(0, 65)}`;
      } else {
        extractedSubject = `Interactive Live Chat Session with ${manufacturerName}`;
      }
    } else if (detectedType === 'sent') {
      if (/quote|quotation|price|pricing|cost|moq/i.test(lowerBody)) {
        extractedSubject = `Requesting quotation, MOQ, and pricing from ${manufacturerName}`;
      } else if (/sample|evk|evaluation|test/i.test(lowerBody)) {
        extractedSubject = `Requesting evaluation samples and availability from ${manufacturerName}`;
      } else if (/gerber|schematic|cad|spec|datasheet|pinout|technical/i.test(lowerBody)) {
        extractedSubject = `Sharing technical specifications and design files with ${manufacturerName}`;
      } else if (/confirm|approv|proceed|order|po|payment/i.test(lowerBody)) {
        extractedSubject = `Confirming order details and next steps with ${manufacturerName}`;
      } else if (lastThreadMsg) {
        extractedSubject = `Follow-up response regarding ${lastThreadMsg.subject.replace(/^(Sent Inquiry|Received Update|Purpose):\s*/i, '')}`;
      } else if (bodyLines[0]) {
        extractedSubject = `Outbound inquiry: ${bodyLines[0].slice(0, 68)}`;
      } else {
        extractedSubject = `Outbound procurement inquiry to ${manufacturerName}`;
      }
    } else {
      if (/quote|quotation|\$|usd|unit price|moq/i.test(lowerBody)) {
        extractedSubject = `Received quotation, unit pricing, and MOQ from ${manufacturerName}`;
      } else if (/ship|tracking|dhl|fedex|dispatch|waybill/i.test(lowerBody)) {
        extractedSubject = `Sample dispatch and shipment tracking update from ${manufacturerName}`;
      } else if (/datasheet|manual|reference design|schematic|spec/i.test(lowerBody)) {
        extractedSubject = `Received technical documentation and specifications from ${manufacturerName}`;
      } else if (/lead time|stock|inventory|schedule|production/i.test(lowerBody)) {
        extractedSubject = `Lead time and production availability update from ${manufacturerName}`;
      } else if (lastThreadMsg) {
        extractedSubject = `Supplier response regarding ${lastThreadMsg.subject.replace(/^(Sent Inquiry|Received Update|Purpose):\s*/i, '')}`;
      } else if (bodyLines[0]) {
        extractedSubject = `Supplier update: ${bodyLines[0].slice(0, 68)}`;
      } else {
        extractedSubject = `Received technical & commercial update from ${manufacturerName}`;
      }
    }

    // 5. Formulate Summary (Sent), Key Outcome (Received), or Multi-Turn Chat Turns (Live Chat)
    const questionLines = bodyLines.filter(l => /\?/.test(l) || /^(we need|can you|could you|please|looking for|do you have)/i.test(l));
    const answerLines = bodyLines.filter(l => !questionLines.includes(l));

    const localOutbound =
      questionLines.slice(0, 2).join(' ') ||
      bodyLines.slice(0, 1).join(' ') ||
      `Inquired with ${manufacturerName} via live chat.`;

    const localInbound =
      techSpecLines.slice(0, 2).join(' ') ||
      answerLines.slice(0, 2).join(' ') ||
      `Supplier agent responded with details during live chat.`;

    // Build multi-turn chatTurns array when in live_chat mode
    const parsedChatTurns: Array<{ sender: 'us' | 'supplier'; timestamp: string; message: string }> = [];
    if (detectedType === 'live_chat') {
      let lastSender: 'us' | 'supplier' = 'us';
      lines.forEach((rawLine, idx) => {
        const timeMatch = rawLine.match(/^\[?(\d{1,2}:\d{2}(?:\s*[AP]M)?)\]?\s*[-:]?\s*(.*)$/i);
        const extractedTime = timeMatch ? timeMatch[1] : '';
        const restOfLine = timeMatch ? timeMatch[2] : rawLine;

        const usPrefix = /^(me|us|you|buyer|engineer|our team|client|customer|q)\s*[:\-]\s*(.+)$/i.exec(restOfLine);
        const supplierPrefix = /^(agent|supplier|vendor|sales|support|rep|service|a)\s*[:\-]\s*(.+)$/i.exec(restOfLine);

        if (usPrefix) {
          lastSender = 'us';
          parsedChatTurns.push({ sender: 'us', timestamp: extractedTime, message: usPrefix[2].trim() });
        } else if (supplierPrefix) {
          lastSender = 'supplier';
          parsedChatTurns.push({ sender: 'supplier', timestamp: extractedTime, message: supplierPrefix[2].trim() });
        } else if (/\?$/.test(restOfLine) || /^(hi|hello|can you|do you|we need|what is)/i.test(restOfLine)) {
          lastSender = 'us';
          parsedChatTurns.push({ sender: 'us', timestamp: extractedTime, message: restOfLine.trim() });
        } else {
          const nextSender = idx === 0 ? 'us' : lastSender === 'us' ? 'supplier' : 'us';
          lastSender = nextSender;
          parsedChatTurns.push({ sender: nextSender, timestamp: extractedTime, message: restOfLine.trim() });
        }
      });
    }

    const extractedOutcome =
      detectedType === 'live_chat'
        ? `Completed ${parsedChatTurns.length || 2}-message live chat exchange with ${manufacturerName}. ${localInbound}`
        : techSpecLines.slice(0, 2).join(' ') ||
          bodyLines.slice(0, 2).join(' ').slice(0, 260) ||
          (detectedType === 'sent'
            ? `Sent email to ${manufacturerName}.`
            : `Received correspondence from ${manufacturerName}.`);

    // 6. Format clean bulleted Technical Specifications for Received Mail & Live Chat
    let formattedInfoReceived = '';
    if (detectedType !== 'sent') {
      const candidateLines = techSpecLines.length > 0 ? techSpecLines : bodyLines.slice(0, 4);
      formattedInfoReceived = candidateLines
        .map(l => (l.startsWith('•') || l.startsWith('-') ? l : `• ${l}`))
        .join('\n');
    }

    // 7. Extract Documents mentioned (.pdf, .doc, .docx, .xlsx, .csv, .zip, .rar, .step, .stp, .gerber)
    const docMatches =
      clean.match(/\b[\w.-]+\.(?:pdf|docx?|xlsx?|csv|zip|rar|step|stp|gbr)\b/gi) || [];
    const uniqueDocs = Array.from(new Set(docMatches));

    // 8. Determine Status based on pre-entered direction
    let detectedStatus: CommStatus =
      detectedType === 'sent' ? 'Awaiting Reply' : 'Information Received';

    if (detectedType !== 'sent') {
      if (
        /action required|please confirm|let us know|awaiting your confirmation|please approve|kindly advise/i.test(
          primaryMessage
        )
      ) {
        detectedStatus = 'Action Required';
      } else {
        detectedStatus = 'Information Received';
      }
    }

    return {
      manufacturerName,
      matchedManufacturerId,
      channel: detectedChannel,
      detectedType,
      subject: extractedSubject,
      keyOutcome: extractedOutcome,
      status: detectedStatus,
      nextAction: '',
      followUpDate: '',
      informationReceived: formattedInfoReceived,
      inboundContent: localInbound,
      outboundReply: localOutbound,
      chatTurns: parsedChatTurns,
      documentsReceived: uniqueDocs,
    };
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
      const selectedManufacturerObj = manufacturers.find(m => m.id === manufacturerId);
      const mName = selectedManufacturerObj ? selectedManufacturerObj.name : '';

      const priorMessages = communications.filter(
        c =>
          c.manufacturerId === manufacturerId &&
          (threadSelection === 'New Thread' ? false : c.threadId === threadSelection)
      );

      let data: any = null;

      try {
        const response = await fetch('/api/parse-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText,
            existingManufacturers: manufacturers.map(m => ({
              id: m.id,
              name: m.name,
              category: m.productsOfInterest,
            })),
            manufacturerName: mName,
            manufacturerDetails: selectedManufacturerObj
              ? {
                  id: selectedManufacturerObj.id,
                  name: selectedManufacturerObj.name,
                  category: selectedManufacturerObj.productsOfInterest,
                  contactName: selectedManufacturerObj.contactPortal,
                  contactEmail: selectedManufacturerObj.website,
                  notes: selectedManufacturerObj.notes,
                }
              : null,
            date,
            threadSelection,
            entryType,
            channel,
            priorMessages: priorMessages.map(p => ({
              date: p.date,
              channel: p.channel,
              subject: p.subject,
              status: p.status,
              keyOutcome: p.keyOutcome,
              informationReceived: p.informationReceived,
              documentsReceived: p.documentsReceived,
              fullEmailText: p.fullEmailText,
            })),
          }),
        });

        const text = await response.text();
        if (text && !text.trim().startsWith('<')) {
          const result = JSON.parse(text);
          if (response.ok && result && result.success && result.data) {
            data = result.data;
          }
        }
      } catch (apiErr) {
        console.warn('Backend /api/parse-email fallback triggered:', apiErr);
      }

      // If deployed environment does not reach backend route, use built-in structured parser
      if (!data) {
        data = parseEmailLocally(rawText);
      }

      // Keep pre-entered Date, Manufacturer, Thread, Channel/Direction, and Mode untouched.
      if (data.subject) setSubject(data.subject);

      if (entryType === 'live_chat') {
        if (data.chatTurns && Array.isArray(data.chatTurns) && data.chatTurns.length > 0) {
          setChatTurns(
            data.chatTurns.map((t: any, idx: number) => ({
              id: `turn-${Date.now()}-${idx}`,
              sender: t.sender === 'supplier' ? 'supplier' : 'us',
              timestamp: t.timestamp || '',
              message: t.message || '',
            }))
          );
        } else {
          const outText = data.outboundReply || '';
          const inText = data.inboundContent || data.keyOutcome || '';
          const fallbackTurns: ChatTurn[] = [];
          if (outText) {
            fallbackTurns.push({
              id: `turn-${Date.now()}-1`,
              sender: 'us',
              timestamp: '',
              message: outText,
            });
          }
          if (inText) {
            fallbackTurns.push({
              id: `turn-${Date.now()}-2`,
              sender: 'supplier',
              timestamp: '',
              message: inText,
            });
          }
          if (fallbackTurns.length > 0) {
            setChatTurns(fallbackTurns);
          }
        }
        setKeyOutcome(data.keyOutcome || '');
      } else {
        const outcomeText = data.keyOutcome || '';
        setKeyOutcome(outcomeText);
      }

      if (data.status) setStatus(data.status as CommStatus);

      // User requested: do not fill follow-up date by AI.
      setFollowUpDate('');

      // User requested: sent mail does not require information received.
      if (entryType === 'sent') {
        setInformationReceived('');
      } else {
        setInformationReceived(data.informationReceived || '');
      }

      setFullEmailText(rawText);

      if (data.documentsReceived && Array.isArray(data.documentsReceived)) {
        setDocumentsReceived(data.documentsReceived);
      }

      setAiSuccessMsg(
        `✨ Parsed according to your pre-entered ${
          entryType === 'live_chat'
            ? `Multi-Turn Live Chat (${data.chatTurns?.length || 2} conversation messages extracted)`
            : entryType === 'sent'
            ? 'Sent Email'
            : 'Received Mail'
        } & thread context! Review the fields below and click "Record Communication".`
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

    const validChatTurns =
      entryType === 'live_chat'
        ? chatTurns
            .map(t => ({
              ...t,
              timestamp: t.timestamp?.trim() || undefined,
              message: t.message.trim(),
            }))
            .filter(t => Boolean(t.message))
        : undefined;

    if (entryType === 'live_chat' && (!validChatTurns || validChatTurns.length === 0) && !keyOutcome.trim()) {
      setErrorMsg('Please enter at least one message in the Live Chat conversation log or provide a session summary.');
      return;
    }

    // For Live Chat, synthesize keyOutcome from chatTurns if keyOutcome was left blank
    let finalKeyOutcome = keyOutcome.trim();
    if (entryType === 'live_chat' && !finalKeyOutcome && validChatTurns && validChatTurns.length > 0) {
      const usCount = validChatTurns.filter(t => t.sender === 'us').length;
      const supCount = validChatTurns.filter(t => t.sender === 'supplier').length;
      const lastSupplierTurn = [...validChatTurns].reverse().find(t => t.sender === 'supplier');
      finalKeyOutcome = `Live Chat (${validChatTurns.length} msgs: ${usCount} sent, ${supCount} replies)${
        lastSupplierTurn ? ` — Latest reply: ${lastSupplierTurn.message.slice(0, 140)}` : ''
      }`;
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
        keyOutcome: finalKeyOutcome,
        chatTurns: entryType === 'live_chat' ? validChatTurns : undefined,
        outboundSummary: undefined,
        inboundResponse: undefined,
        status,
        nextAction: nextAction.trim() || undefined,
        followUpDate: followUpDate || undefined,
        threadDoc: threadDoc.trim() || undefined,
        fullEmailText: fullEmailText.trim() || undefined,
        documentsReceived,
        attachments,
        informationReceived: entryType === 'sent' ? undefined : informationReceived.trim() || undefined,
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
        keyOutcome: finalKeyOutcome,
        chatTurns: entryType === 'live_chat' ? validChatTurns : undefined,
        status,
        nextAction: nextAction.trim() || undefined,
        followUpDate: followUpDate || undefined,
        threadDoc: threadDoc.trim() || undefined,
        fullEmailText: fullEmailText.trim() || undefined,
        documentsReceived,
        attachments,
        informationReceived: entryType === 'sent' ? undefined : informationReceived.trim() || undefined,
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
              <span>Pre-Enter Details & AI Auto-Fill</span>
            </div>

            <button
              type="button"
              onClick={() => setShowAiBox(!showAiBox)}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{showAiBox ? 'Hide AI Auto-Fill Box' : '✨ Paste Email / Chat (Uses Pre-Entered Details)'}</span>
            </button>
          </div>
        )}

        {/* AI Paste Box Drawer */}
        {showAiBox && !isEditing && (
          <div className="p-4 bg-indigo-950 text-white border-b border-indigo-900 space-y-3 shrink-0 overflow-y-auto max-h-[240px] animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-indigo-200 flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-indigo-400" />
                <span>Step 1: Pre-enter Date, Manufacturer, Thread, Channel & Mode below. Step 2: Paste transcript:</span>
              </span>
              <span className="text-[10px] font-mono bg-indigo-900/90 border border-indigo-700 px-2 py-0.5 rounded text-indigo-200">
                {entryType === 'live_chat'
                  ? '💬 Live Chat (Sent + Received)'
                  : entryType === 'sent'
                  ? '📤 Sent Email'
                  : '📩 Received Mail'}{' '}
                • {currentManufacturer?.name || manufacturerId} • {threadSelection}
              </span>
            </div>

            <textarea
              rows={4}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={
                entryType === 'live_chat'
                  ? 'Paste full live chat conversation (both sent inquiries and instant replies) here...'
                  : `Paste ${entryType === 'sent' ? 'sent email' : 'received mail'} text here...`
              }
              className="w-full text-xs font-sans p-2.5 bg-indigo-900/80 border border-indigo-700 rounded-lg text-white placeholder:text-indigo-300/60 focus:outline-hidden focus:ring-2 focus:ring-indigo-400 leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-indigo-300">
                Parses strictly according to your pre-entered Date, Manufacturer, Thread, Channel &{' '}
                {entryType === 'live_chat'
                  ? 'Live Chat (Sent & Received)'
                  : entryType === 'sent'
                  ? 'Sent Email'
                  : 'Received Mail'}{' '}
                selection.
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
                    <span>Analyzing Thread & Text...</span>
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
          
          {/* Pre-Entered Details Section: Mode, Date, Manufacturer, Thread, Channel */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <span>1. Pre-Enter Mail / Chat Context & Direction</span>
              </label>
              <span className="text-[11px] text-slate-500">Select these before AI parsing</span>
            </div>

            {/* Received Mail vs Sent Email vs Live Chat (Simultaneous Sent & Received) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleEntryTypeChange('received')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
                  entryType === 'received'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span>📩 Received Mail</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal leading-tight">Inbound message from supplier</span>
              </button>

              <button
                type="button"
                onClick={() => handleEntryTypeChange('sent')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
                  entryType === 'sent'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span>📤 Sent Email</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal leading-tight">Outbound message to supplier</span>
              </button>

              <button
                type="button"
                onClick={() => handleEntryTypeChange('live_chat')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
                  entryType === 'live_chat'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span>💬 Live Chat (Multi-Turn)</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal leading-tight">Log multiple back-and-forth chat messages</span>
              </button>
            </div>

            {/* Row 1: Date & Manufacturer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
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
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                >
                  {manufacturers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.id} - {m.name} ({m.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Thread & Channel / Direction */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Thread
                </label>
                <select
                  value={threadSelection}
                  onChange={e => setThreadSelection(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
                >
                  <option value="New Thread">✨ Start New Thread (Auto ID: {getNextThreadId(manufacturerId)})</option>
                  {existingThreads.map(tid => (
                    <option key={tid} value={tid}>
                      Existing Thread: {tid}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Channel / Direction</label>
                <select
                  value={channel}
                  onChange={e => handleChannelChange(e.target.value as CommChannel)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
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
          </div>

          {/* Subject & Purpose */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Subject / Purpose *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={
                entryType === 'live_chat'
                  ? 'Enter purpose of this live chat session'
                  : 'Enter subject or purpose of this communication'
              }
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>

          {/* Live Chat Multi-Turn Conversation Log OR Single Summary / Key Outcome */}
          {entryType === 'live_chat' ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                      <span>💬 Live Chat Multi-Turn Conversation Log</span>
                    </span>
                    <p className="text-[11px] text-emerald-800/80">
                      Add as many Sent and Received messages as occurred in the live chat session
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-300">
                    {chatTurns.length} {chatTurns.length === 1 ? 'Turn' : 'Turns'}
                  </span>
                </div>

                {/* Conversation Turns List */}
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {chatTurns.map((turn, idx) => {
                    const isUs = turn.sender === 'us';
                    return (
                      <div
                        key={turn.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isUs
                            ? 'bg-indigo-50/70 border-indigo-200 ml-0 sm:mr-6'
                            : 'bg-white border-emerald-300 ml-0 sm:ml-6 shadow-2xs'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              #{idx + 1}
                            </span>

                            {/* Sender Toggle Pill */}
                            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateChatTurn(turn.id, { sender: 'us' })}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                                  isUs
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                📤 Us (Sent)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateChatTurn(turn.id, { sender: 'supplier' })}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                                  !isUs
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                📩 Supplier (Reply)
                              </button>
                            </div>

                            <input
                              type="text"
                              value={turn.timestamp || ''}
                              onChange={e => handleUpdateChatTurn(turn.id, { timestamp: e.target.value })}
                              placeholder="Time (optional, e.g. 14:05)"
                              className="w-36 px-2 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-700 placeholder:text-slate-400"
                            />
                          </div>

                          {chatTurns.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveChatTurn(turn.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove this message turn"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <textarea
                          rows={2}
                          value={turn.message}
                          onChange={e => handleUpdateChatTurn(turn.id, { message: e.target.value })}
                          placeholder={
                            isUs
                              ? `Message #${idx + 1} sent by our team...`
                              : `Reply #${idx + 1} received from ${currentManufacturer?.name || 'supplier'}...`
                          }
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs leading-relaxed"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Quick Add Turn Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-200/80">
                  <button
                    type="button"
                    onClick={() => handleAddChatTurn('us')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Our Message (Sent)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddChatTurn('supplier')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Supplier Reply (Received)</span>
                  </button>
                </div>
              </div>

              {/* Overall Session Outcome / Summary */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Overall Live Chat Session Summary / Key Outcome (Optional — auto-synthesized if blank)
                </label>
                <textarea
                  rows={2}
                  value={keyOutcome}
                  onChange={e => setKeyOutcome(e.target.value)}
                  placeholder="Overall takeaway from this multi-turn live chat session..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {entryType === 'sent' ? 'Summary' : 'Key Outcome / Latest Update'}
              </label>
              <textarea
                rows={2}
                value={keyOutcome}
                onChange={e => setKeyOutcome(e.target.value)}
                placeholder={
                  entryType === 'sent'
                    ? 'Summarize the sent email content...'
                    : 'Summarize the key outcome, quote details, or response...'
                }
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          )}

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
                <option value="Reply Received">Reply Received</option>
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

          {/* Information Received / Technical Specifications (For Received Mail & Live Chat) */}
          {entryType !== 'sent' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Technical Specifications & Information Received (Vendor Details)
              </label>
              <textarea
                rows={3}
                value={informationReceived}
                onChange={e => setInformationReceived(e.target.value)}
                placeholder="Extract clean technical specs, pricing breakdowns, part numbers, MOQ, lead times..."
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-sans leading-relaxed"
              />
            </div>
          )}

          {/* Attached Files & Attachments Section */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="block font-semibold text-slate-800 flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4 text-indigo-600" />
                  <span>Attachments & Technical Documents</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Upload supplier datasheets, quotations, Gerber/CAD files, or photos
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>+ Upload Files</span>
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={e => {
                handleFilesSelected(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="hidden"
            />

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={e => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/80'
                  : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/80'
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Upload className="h-4 w-4" />
                </div>
                <div className="text-xs text-slate-700 font-medium">
                  <span className="font-semibold text-indigo-600">Click to browse</span> or drag & drop files here
                </div>
                <p className="text-[10px] text-slate-400">
                  PDF datasheets, CAD/Gerber, Word, Excel/CSV, images (PNG, JPG), ZIP archives
                </p>
              </div>
            </div>

            {/* Uploaded File Attachments List */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Uploaded Files ({attachments.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachments.map(att => {
                    const isImg = att.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(att.name);
                    const isPdf = att.name.toLowerCase().endsWith('.pdf');

                    return (
                      <div
                        key={att.id}
                        className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2 shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-md ${
                            isPdf ? 'bg-rose-50 text-rose-600' : isImg ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {isImg ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-mono text-xs font-semibold text-slate-800 truncate" title={att.name}>
                              {att.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {formatFileSize(att.size)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {att.dataUrl && (
                            <button
                              type="button"
                              onClick={() => handleDownloadAttachmentFile(att)}
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                              title="Download attachment"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.id, att.name)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Remove attachment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Referenced Document Names */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Document Names / Manual Reference Keys
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
                  placeholder="e.g. A7671G_SPEC_202508.pdf"
                  className="flex-1 p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddDocument}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  + Add Name
                </button>
              </div>

              {documentsReceived.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {documentsReceived.map((doc, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-mono text-slate-700 shadow-2xs"
                    >
                      <FileCheck className="h-3 w-3 text-emerald-600" />
                      <span>{doc}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(idx)}
                        className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Saved Full Email Content */}
            <div className="pt-2 border-t border-slate-200/70">
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
