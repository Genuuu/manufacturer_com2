import React, { useState } from 'react';
import { ComponentDocument } from '../types';
import { parseGoogleDriveUrl } from '../utils/driveLinks';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  FileText,
  FolderOpen,
  Building2,
  Calendar,
  Info,
} from 'lucide-react';

interface DrivePreviewModalProps {
  docItem: ComponentDocument | null;
  onClose: () => void;
}

export const DrivePreviewModal: React.FC<DrivePreviewModalProps> = ({
  docItem,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!docItem) return null;

  const parsed = parseGoogleDriveUrl(docItem.driveUrl);
  const canEmbed = Boolean(parsed.previewEmbedUrl);

  const handleCopy = () => {
    navigator.clipboard.writeText(docItem.driveUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="fixed inset-0 z-[75] bg-slate-950/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              {parsed.resourceType === 'folder' ? (
                <FolderOpen className="h-4 w-4 text-white" />
              ) : (
                <FileText className="h-4 w-4 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold truncate">
                {docItem.componentName} · {docItem.category}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {parsed.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

            <a
              href={parsed.normalizedUrl || docItem.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open in Drive</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600 shrink-0">
          {docItem.manufacturerName && (
            <span className="inline-flex items-center gap-1 font-medium text-slate-800">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              {docItem.manufacturerName}
            </span>
          )}
          {docItem.expiryDate && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Valid until: <strong className="text-slate-800">{docItem.expiryDate}</strong>
            </span>
          )}
          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700">
            Status: {docItem.status}
          </span>
        </div>

        {/* Scrollable Content / Drive Embed */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-100 p-3 sm:p-4 space-y-3 flex flex-col">
          {docItem.notes && (
            <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 shrink-0">
              <span className="font-bold text-slate-900 mr-1.5">Notes:</span>
              {docItem.notes}
            </div>
          )}

          {canEmbed ? (
            <div className="flex-1 min-h-[340px] sm:min-h-[420px] bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-[11px] text-slate-500 shrink-0">
                <span className="inline-flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-indigo-500" />
                  <span>
                    If Google Drive restricts embedded preview for private files, use{' '}
                    <strong>Open in Drive</strong> above.
                  </span>
                </span>
                <span className="font-mono text-[10px] hidden sm:inline">{parsed.label}</span>
              </div>
              <iframe
                src={parsed.previewEmbedUrl}
                title={`${docItem.componentName} - ${docItem.category}`}
                className="w-full flex-1 min-h-[300px] border-0 bg-white"
                allow="autoplay"
              />
            </div>
          ) : (
            <div className="p-6 bg-white rounded-xl border border-slate-200 text-center space-y-3 my-auto">
              <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <ExternalLink className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">External Document Link</h4>
                <p className="text-xs text-slate-500 break-all max-w-lg mx-auto font-mono">
                  {docItem.driveUrl}
                </p>
              </div>
              <a
                href={parsed.normalizedUrl || docItem.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Link in New Tab</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 truncate">
            Added by {docItem.addedBy || 'Team'} · Updated{' '}
            {(docItem.updatedAt || docItem.createdAt || '').slice(0, 10)}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
