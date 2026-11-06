import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Manufacturer, ManufacturerStatus } from '../types';
import {
  X,
  Building2,
  AlertCircle,
  ExternalLink,
  Lock,
} from 'lucide-react';

interface ManufacturerModalProps {
  isOpen: boolean;
  onClose: () => void;
  manufacturer?: Manufacturer | null;
}

export const ManufacturerModal: React.FC<ManufacturerModalProps> = ({
  isOpen,
  onClose,
  manufacturer,
}) => {
  const {
    addManufacturer,
    updateManufacturer,
    getNextManufacturerId,
    hasPermission,
  } = useApp();

  const isEditing = Boolean(manufacturer);

  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [contactPortal, setContactPortal] = useState('');
  const [productsOfInterest, setProductsOfInterest] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ManufacturerStatus>('Active');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (manufacturer) {
      setName(manufacturer.name);
      setWebsite(manufacturer.website);
      setContactPortal(manufacturer.contactPortal);
      setProductsOfInterest(manufacturer.productsOfInterest);
      setNotes(manufacturer.notes);
      setStatus(manufacturer.status);
    } else {
      setName('');
      setWebsite('');
      setContactPortal('Website Live Chat');
      setProductsOfInterest('');
      setNotes('');
      setStatus('Active');
    }
    setErrorMsg('');
  }, [manufacturer, isOpen]);

  if (!isOpen) return null;

  const nextId = isEditing ? manufacturer!.id : getNextManufacturerId();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Manufacturer Name is required.');
      return;
    }

    if (isEditing && manufacturer) {
      const res = updateManufacturer(manufacturer.id, {
        name: name.trim(),
        website: website.trim(),
        contactPortal: contactPortal.trim(),
        productsOfInterest: productsOfInterest.trim(),
        notes: notes.trim(),
        status,
      });

      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }
    } else {
      const res = addManufacturer({
        name: name.trim(),
        website: website.trim(),
        contactPortal: contactPortal.trim(),
        productsOfInterest: productsOfInterest.trim(),
        notes: notes.trim(),
        status,
      });

      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden sm:my-auto animate-in fade-in zoom-in-95 max-h-[92dvh] sm:max-h-[88vh] flex flex-col">
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2 shrink-0" />
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                {isEditing ? `Edit Supplier (${manufacturer?.id})` : 'Register New Manufacturer (Section A)'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isEditing ? 'Modify supplier credentials & evaluation scope' : 'Enter unique name and contact portal'}
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

        {errorMsg && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs flex-1 min-h-0 overflow-y-auto">
          
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Allocated ID</span>
              <div className="font-mono text-base font-bold text-indigo-700">{nextId}</div>
            </div>
            <span className="text-[11px] text-slate-500">Auto-calculated unique key</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Manufacturer Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter manufacturer name"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Website URL</label>
            <input
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://supplier.com"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contact Email / Chat Portal</label>
            <input
              type="text"
              value={contactPortal}
              onChange={e => setContactPortal(e.target.value)}
              placeholder="e.g. Website Live Chat or sales@vendor.com"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product(s) of Interest</label>
            <input
              type="text"
              value={productsOfInterest}
              onChange={e => setProductsOfInterest(e.target.value)}
              placeholder="Enter product(s) or services of interest"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes & Technical Evaluation</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Evaluating functional testing capability, lead time, distributor channels..."
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 leading-relaxed"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Record Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as ManufacturerStatus)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
            >
              <option value="Active">Active (Keep in active evaluations)</option>
              <option value="Removed">Removed (Preserves previous emails and files)</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial min-h-[42px] px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-xs"
            >
              {isEditing ? 'Save Supplier' : 'Register Supplier'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
