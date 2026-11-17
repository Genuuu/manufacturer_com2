import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ComponentDocCategory,
  ComponentDocStatus,
  ComponentDocument,
} from '../types';
import { parseGoogleDriveUrl } from '../utils/driveLinks';
import {
  X,
  Link2,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface ComponentDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDoc?: ComponentDocument | null;
  prefillComponent?: {
    componentName: string;
    manufacturerId?: string;
    manufacturerName?: string;
  } | null;
}

const CATEGORIES: ComponentDocCategory[] = [
  'Certification',
  'Design Datasheet',
  'Test Report',
  'Compliance / CoC',
  'CAD / Gerber',
  'Other',
];

const STATUSES: ComponentDocStatus[] = [
  'Verified',
  'Active',
  'Pending',
  'Needs Renewal',
  'Expired',
];

export const ComponentDocModal: React.FC<ComponentDocModalProps> = ({
  isOpen,
  onClose,
  editingDoc,
  prefillComponent,
}) => {
  const {
    manufacturers,
    componentDocuments,
    addComponentDoc,
    updateComponentDoc,
  } = useApp();

  const [componentName, setComponentName] = useState('');
  const [manufacturerSelection, setManufacturerSelection] = useState('');
  const [customManufacturerName, setCustomManufacturerName] = useState('');
  const [category, setCategory] = useState<ComponentDocCategory>('Certification');
  const [driveUrl, setDriveUrl] = useState('');
  const [status, setStatus] = useState<ComponentDocStatus>('Verified');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const existingComponentNames = useMemo(() => {
    const names = new Set<string>();
    componentDocuments.forEach(d => {
      if (d.componentName?.trim()) names.add(d.componentName.trim());
    });
    return Array.from(names).sort();
  }, [componentDocuments]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setSavedBanner(null);

    if (editingDoc) {
      setComponentName(editingDoc.componentName || '');
      if (editingDoc.manufacturerId && manufacturers.some(m => m.id === editingDoc.manufacturerId)) {
        setManufacturerSelection(editingDoc.manufacturerId);
        setCustomManufacturerName('');
      } else if (editingDoc.manufacturerName) {
        setManufacturerSelection('__CUSTOM__');
        setCustomManufacturerName(editingDoc.manufacturerName);
      } else {
        setManufacturerSelection('');
        setCustomManufacturerName('');
      }
      setCategory(editingDoc.category || 'Certification');
      setDriveUrl(editingDoc.driveUrl || '');
      setStatus(editingDoc.status || 'Verified');
      setExpiryDate(editingDoc.expiryDate || '');
      setNotes(editingDoc.notes || '');
    } else if (prefillComponent) {
      setComponentName(prefillComponent.componentName || '');
      if (
        prefillComponent.manufacturerId &&
        manufacturers.some(m => m.id === prefillComponent.manufacturerId)
      ) {
        setManufacturerSelection(prefillComponent.manufacturerId);
        setCustomManufacturerName('');
      } else if (prefillComponent.manufacturerName) {
        setManufacturerSelection('__CUSTOM__');
        setCustomManufacturerName(prefillComponent.manufacturerName);
      } else {
        setManufacturerSelection('');
        setCustomManufacturerName('');
      }
      setCategory('Certification');
      setDriveUrl('');
      setStatus('Verified');
      setExpiryDate('');
      setNotes('');
    } else {
      setComponentName('');
      setManufacturerSelection('');
      setCustomManufacturerName('');
      setCategory('Certification');
      setDriveUrl('');
      setStatus('Verified');
      setExpiryDate('');
      setNotes('');
    }
  }, [isOpen, editingDoc, prefillComponent, manufacturers]);

  const parsedLink = useMemo(() => parseGoogleDriveUrl(driveUrl), [driveUrl]);

  if (!isOpen) return null;

  const handleSubmit = (addAnother: boolean) => {
    setErrorMsg(null);
    setSavedBanner(null);

    if (!componentName.trim()) {
      setErrorMsg('Please enter the Component / Ordered Item.');
      return;
    }
    if (!driveUrl.trim() || !parsedLink.isValidUrl) {
      setErrorMsg('Please paste a valid Google Drive or document URL (starting with https://).');
      return;
    }

    let finalMId: string | undefined;
    let finalMName: string | undefined;

    if (manufacturerSelection === '__CUSTOM__') {
      finalMName = customManufacturerName.trim() || undefined;
    } else if (manufacturerSelection) {
      const matchedM = manufacturers.find(m => m.id === manufacturerSelection);
      if (matchedM) {
        finalMId = matchedM.id;
        finalMName = matchedM.name;
      }
    }

    const payload = {
      componentName: componentName.trim(),
      manufacturerId: finalMId,
      manufacturerName: finalMName,
      category,
      driveUrl: parsedLink.normalizedUrl,
      driveResourceType: parsedLink.resourceType,
      driveFileId: parsedLink.fileId,
      status,
      expiryDate: expiryDate.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingDoc) {
      const res = updateComponentDoc(editingDoc.id, payload);
      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }
      onClose();
      return;
    }

    const res = addComponentDoc(payload);
    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    if (addAnother) {
      setSavedBanner(`Linked ${payload.category}. Add the next Drive link for ${payload.componentName}.`);
      setDriveUrl('');
      setExpiryDate('');
      setNotes('');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <Link2 className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate">
                {editingDoc ? 'Edit Component Drive Link' : 'Link Component Certification / Datasheet'}
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Manually attach a Google Drive file or folder link for an ordered component
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {savedBanner && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{savedBanner}</span>
            </div>
          )}

          {/* Component Identification */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Component / Ordered Item *
            </label>
            <input
              type="text"
              list="component-names-datalist"
              value={componentName}
              onChange={e => setComponentName(e.target.value)}
              placeholder="e.g. SIMCom A7670E LTE Module"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <datalist id="component-names-datalist">
              {existingComponentNames.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          {/* Supplier Link & Document Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Supplier / Manufacturer
              </label>
              <select
                value={manufacturerSelection}
                onChange={e => setManufacturerSelection(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">— General / Not Assigned —</option>
                {manufacturers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.id} · {m.name}
                  </option>
                ))}
                <option value="__CUSTOM__">+ Enter Custom Supplier Name</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Document Category *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ComponentDocCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {manufacturerSelection === '__CUSTOM__' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Custom Supplier Name
              </label>
              <input
                type="text"
                value={customManufacturerName}
                onChange={e => setCustomManufacturerName(e.target.value)}
                placeholder="e.g. Texas Instruments / DigiKey"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Google Drive Link Input + Live Parser Badge */}
          <div className="p-3 bg-indigo-50/50 border border-indigo-200/80 rounded-xl space-y-2">
            <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
              Google Drive Link (File, Folder, Doc, or Sheet URL) *
            </label>
            <input
              type="url"
              value={driveUrl}
              onChange={e => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/... or https://drive.google.com/drive/folders/..."
              className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {driveUrl.trim() && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  {parsedLink.isValidUrl ? (
                    <>
                      {parsedLink.resourceType === 'folder' ? (
                        <FolderOpen className="h-3.5 w-3.5 text-amber-600" />
                      ) : parsedLink.resourceType === 'sheet' ? (
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-indigo-600" />
                      )}
                      <span className="font-semibold text-slate-800">{parsedLink.label}</span>
                      {parsedLink.fileId && (
                        <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          ID: {parsedLink.fileId.slice(0, 14)}...
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-rose-600 font-medium">
                      Please enter a complete URL (e.g. https://drive.google.com/...)
                    </span>
                  )}
                </div>

                {parsedLink.isValidUrl && (
                  <a
                    href={parsedLink.normalizedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-semibold"
                  >
                    <span>Test Link</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Status & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Verification / Document Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ComponentDocStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Expiry / Valid Until (Optional)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Notes / Compliance Scope (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Covers Q3 batch order, includes test lab summary and pinout errata..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            Cancel
          </button>

          {!editingDoc && (
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold text-indigo-700 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Save &amp; Add Another</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white cursor-pointer shadow-xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{editingDoc ? 'Save Changes' : 'Save Drive Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
