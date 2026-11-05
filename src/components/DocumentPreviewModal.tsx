import React from 'react';
import {
  X,
  FileText,
  Download,
  CheckCircle2,
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
      (c.documentsReceived && c.documentsReceived.includes(filename))
  );

  const handleDownloadText = () => {
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

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-300 overflow-hidden my-auto animate-in fade-in zoom-in-95 flex flex-col max-h-[88vh] mb-14 sm:mb-0">
        {/* Top Bar */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-mono text-xs font-bold truncate max-w-md">{filename}</h3>
              <p className="text-[10px] text-slate-400">{title} · Database Document Record</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadText}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1 px-2.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
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
        <div className="p-6 overflow-y-auto bg-slate-100/70 text-slate-800 flex justify-center flex-1 min-h-0">
          <div className="bg-white p-8 rounded-lg shadow-md border border-slate-200 max-w-2xl w-full text-xs space-y-6">
            {/* Header Document Banner */}
            <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-base text-slate-950">
                  {matchedComm ? matchedComm.manufacturerName : title}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Reference File: {filename} {matchedComm ? `· Thread ${matchedComm.threadId} · ${matchedComm.date}` : ''}
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 font-mono">
                DOC
              </div>
            </div>

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
