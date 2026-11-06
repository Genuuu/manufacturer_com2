import React from 'react';
import {
  X,
  FileText,
  Download,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Paperclip,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  title: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  filename,
  title,
}) => {
  const { communications } = useApp();

  if (!isOpen) return null;

  const matchedComm = communications.find(
    c =>
      c.threadDoc === filename ||
      (c.documentsReceived && c.documentsReceived.includes(filename)) ||
      (c.attachments && c.attachments.some(a => a.name === filename || a.id === filename))
  );

  const matchedAttachment = matchedComm?.attachments?.find(
    a => a.name === filename || a.id === filename
  );

  const isImage = Boolean(
    matchedAttachment?.type?.startsWith('image/') ||
      filename.match(/\.(png|jpe?g|webp|gif|svg)$/i)
  );

  const isPdf = Boolean(
    matchedAttachment?.type?.includes('pdf') || filename.toLowerCase().endsWith('.pdf')
  );

  const handleDownload = () => {
    // If we have the uploaded file dataUrl, download the actual binary file directly
    if (matchedAttachment?.dataUrl) {
      const link = document.createElement('a');
      link.href = matchedAttachment.dataUrl;
      link.download = matchedAttachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Fallback: Generate structured text export
    const contentLines = [
      `Document Reference: ${filename}`,
      `Title: ${title}`,
      matchedComm ? `Manufacturer: ${matchedComm.manufacturerName} (${matchedComm.manufacturerId})` : '',
      matchedComm ? `Date: ${matchedComm.date}` : '',
      matchedComm ? `Thread ID: ${matchedComm.threadId}` : '',
      matchedComm ? `Subject: ${matchedComm.subject}` : '',
      '',
      '--- Summary / Key Outcome ---',
      matchedComm?.keyOutcome || 'No summary recorded.',
      '',
      '--- Technical Notes & Information Received ---',
      matchedComm?.informationReceived || 'No additional technical notes recorded.',
      matchedComm?.fullEmailText ? `\n--- Full Transcript ---\n${matchedComm.fullEmailText}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const blob = new Blob([contentLines], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-300 overflow-hidden sm:my-auto animate-in fade-in zoom-in-95 flex flex-col max-h-[92dvh] sm:max-h-[88vh]">
        {/* Top Bar */}
        <div className="p-3 sm:p-3.5 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg shrink-0 ${isPdf ? 'bg-rose-600' : isImage ? 'bg-amber-600' : 'bg-indigo-600'}`}>
              {isImage ? <ImageIcon className="h-4 w-4 text-white" /> : <FileText className="h-4 w-4 text-white" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-mono text-xs font-bold truncate max-w-[180px] sm:max-w-md">{filename}</h3>
              <p className="text-[10px] text-slate-400 truncate">
                {title} · {matchedAttachment ? `File (${formatFileSize(matchedAttachment.size)})` : 'Document Record'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleDownload}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5 px-2.5 sm:px-3 cursor-pointer shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">{matchedAttachment?.dataUrl ? 'Download' : 'Summary'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Document Render Body */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-slate-100/70 text-slate-800 flex justify-center flex-1 min-h-0">
          <div className="bg-white p-4 sm:p-8 rounded-xl sm:rounded-lg shadow-md border border-slate-200 max-w-2xl w-full text-xs space-y-4 sm:space-y-6">
            {/* Header Document Banner */}
            <div className="border-b border-slate-200 pb-3 sm:pb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-sm sm:text-base text-slate-900">
                  {matchedComm ? matchedComm.manufacturerName : title}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5 break-all">
                  Attachment: {filename} {matchedComm ? `· Thread ${matchedComm.threadId} · ${matchedComm.date}` : ''}
                </div>
              </div>
              <div className="h-7 sm:h-8 px-2.5 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700 font-mono text-[10px] sm:text-[11px] shrink-0">
                {matchedAttachment ? formatFileSize(matchedAttachment.size) : 'ATTACHMENT'}
              </div>
            </div>

            {/* If uploaded image, display preview */}
            {isImage && matchedAttachment?.dataUrl && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Image Attachment Preview:
                </span>
                <div className="flex justify-center bg-white p-2 rounded-lg border border-slate-100">
                  <img
                    src={matchedAttachment.dataUrl}
                    alt={filename}
                    className="max-h-80 object-contain rounded"
                  />
                </div>
              </div>
            )}

            {/* If uploaded PDF, display direct action card */}
            {isPdf && matchedAttachment?.dataUrl && (
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs font-mono">{filename}</h4>
                    <p className="text-[11px] text-slate-600">
                      PDF Document ({formatFileSize(matchedAttachment.size)})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            )}

            {matchedComm ? (
              <div className="space-y-4">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-950">
                  <div className="font-bold text-xs uppercase tracking-wider mb-1">
                    {matchedComm.subject}
                  </div>
                  <p className="leading-relaxed">{matchedComm.keyOutcome}</p>
                </div>

                {matchedComm.informationReceived && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                      Technical Specifications & Information Received:
                    </h4>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 whitespace-pre-line leading-relaxed">
                      {matchedComm.informationReceived}
                    </div>
                  </div>
                )}

                {matchedComm.fullEmailText && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                      Full Transcript / Raw Correspondence:
                    </h4>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 whitespace-pre-line font-mono text-[11px] leading-relaxed">
                      {matchedComm.fullEmailText}
                    </div>
                  </div>
                )}

                {matchedComm.nextAction && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-950">
                    <span className="font-bold">Next Action: </span>
                    <span>{matchedComm.nextAction}</span>
                    {matchedComm.followUpDate && (
                      <span className="ml-2 font-mono text-[11px] text-amber-800">
                        (Follow-up: {matchedComm.followUpDate})
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                <div className="font-bold text-slate-900 mb-1">Attached Document Reference</div>
                <p>
                  Filename: <span className="font-mono font-semibold">{filename}</span>
                </p>
              </div>
            )}

            {/* Document Signature / Stamp */}
            <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Synced with Firestore Database</span>
              </div>
              <span className="font-mono">Doc ID: {filename.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
