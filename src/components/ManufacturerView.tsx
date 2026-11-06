import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Manufacturer, ManufacturerStatus } from '../types';
import {
  Building2,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  RotateCcw,
  MessageSquare,
  X,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Paperclip,
} from 'lucide-react';

interface ManufacturerViewProps {
  onOpenManufacturerModal: (m?: Manufacturer) => void;
  onOpenCommModalWithManufacturer: (mId: string) => void;
  onPreviewDoc: (filename: string, title: string) => void;
}

export const ManufacturerView: React.FC<ManufacturerViewProps> = ({
  onOpenManufacturerModal,
  onOpenCommModalWithManufacturer,
  onPreviewDoc,
}) => {
  const {
    manufacturers,
    communications,
    toggleManufacturerStatus,
    hasPermission,
    searchQuery,
    setSearchQuery,
  } = useApp();

  const [inspectManufacturerId, setInspectManufacturerId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Removed'>('ALL');

  const inspectedM = inspectManufacturerId
    ? manufacturers.find(m => m.id === inspectManufacturerId)
    : null;

  const inspectedComms = inspectedM
    ? communications.filter(c => c.manufacturerId === inspectedM.id)
    : [];

  const handleStatusToggle = (m: Manufacturer) => {
    const nextStatus: ManufacturerStatus = m.status === 'Active' ? 'Removed' : 'Active';
    const res = toggleManufacturerStatus(m.id, nextStatus);
    if (!res.success) {
      alert(res.message);
    }
  };

  // Filtered manufacturers dataset based on search & status filter
  const filteredManufacturers = manufacturers.filter(m => {
    if (statusFilter !== 'ALL' && m.status !== statusFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = m.name.toLowerCase().includes(q);
      const matchId = m.id.toLowerCase().includes(q);
      const matchPortal = m.contactPortal.toLowerCase().includes(q);
      const matchProducts = m.productsOfInterest.toLowerCase().includes(q);
      const matchNotes = (m.notes || '').toLowerCase().includes(q);
      return matchName || matchId || matchPortal || matchProducts || matchNotes;
    }

    return true;
  });

  return (
    <div className="space-y-5">
      
      {/* Top Header Card & Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold shadow-2xs shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Vendors & Suppliers</h2>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Section A
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Evaluated fabricators, component vendors, and technical service partners
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onOpenManufacturerModal()}
              disabled={!hasPermission('canCreateManufacturer')}
              title={!hasPermission('canCreateManufacturer') ? 'Requires Manager or Admin' : 'Add new supplier'}
              className="w-full sm:w-auto justify-center inline-flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Supplier</span>
            </button>
          </div>
        </div>

        {/* Key KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Vendors</div>
              <div className="text-sm font-bold text-slate-900">{manufacturers.length}</div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Suppliers</div>
              <div className="text-sm font-bold text-slate-900">
                {manufacturers.filter(m => m.status === 'Active').length}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Comms</div>
              <div className="text-sm font-bold text-slate-900">{communications.length}</div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Open Actions</div>
              <div className="text-sm font-bold text-slate-900">
                {communications.filter(c => c.status !== 'Completed').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search vendors, products, portal..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Status:</span>
          </span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses ({manufacturers.length})</option>
            <option value="Active">Active Only ({manufacturers.filter(m => m.status === 'Active').length})</option>
            <option value="Removed">Removed / Deactivated ({manufacturers.filter(m => m.status === 'Removed').length})</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Suppliers Table + Optional Inspected Side Drawer */}
      <div className={`grid grid-cols-1 ${inspectManufacturerId ? 'lg:grid-cols-5' : ''} gap-4`}>
        
        {/* Suppliers Card List (Mobile) + Table (Desktop) */}
        <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs ${
          inspectManufacturerId ? 'lg:col-span-3' : 'w-full'
        }`}>
          {/* Mobile & Tablet Vendor Card Grid (lg:hidden) */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-3 md:p-3 divide-slate-100">
            {filteredManufacturers.length === 0 ? (
              <div className="md:col-span-2 py-8 px-4 text-center text-slate-400 text-xs">
                No vendors matched your search or status filter.
              </div>
            ) : (
              filteredManufacturers.map(m => {
                const commCount = communications.filter(c => c.manufacturerId === m.id).length;
                const isSelected = inspectManufacturerId === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => setInspectManufacturerId(isSelected ? null : m.id)}
                    className={`p-3.5 md:rounded-xl md:border md:border-slate-200 space-y-2.5 text-xs transition-colors cursor-pointer ${
                      isSelected ? 'bg-indigo-50/40 md:border-indigo-300' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {m.id}
                          </span>
                          <span className="font-bold text-sm text-slate-900">{m.name}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            m.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {m.status}
                          </span>
                        </div>
                        {m.website && (
                          <a
                            href={m.website.startsWith('http') ? m.website : `https://${m.website}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-[11px] text-indigo-600 hover:underline inline-flex items-center gap-1 mt-0.5 font-mono truncate max-w-[240px]"
                          >
                            <span>{m.website.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </a>
                        )}
                      </div>

                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-[10px] shrink-0">
                        <MessageSquare className="h-3 w-3 text-indigo-600" />
                        {commCount}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-700 font-medium">
                        {m.productsOfInterest || <span className="text-slate-400 italic">General fabrication & sourcing</span>}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Portal: <span className="text-slate-700">{m.contactPortal || 'Website / Direct Inquiry'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setInspectManufacturerId(isSelected ? null : m.id)}
                        className="text-[11px] font-semibold text-indigo-600 px-2.5 py-1.5 rounded-lg bg-indigo-50/80 hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        {isSelected ? 'Hide History' : `Inspect (${commCount})`}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenCommModalWithManufacturer(m.id)}
                          disabled={!hasPermission('canLogCommunication')}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 disabled:opacity-30 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Log Comm</span>
                        </button>
                        <button
                          onClick={() => onOpenManufacturerModal(m)}
                          disabled={!hasPermission('canEditManufacturer')}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 rounded-lg border border-slate-200 bg-slate-50 disabled:opacity-30 cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {m.status === 'Active' ? (
                          <button
                            onClick={() => handleStatusToggle(m)}
                            disabled={!hasPermission('canDeleteManufacturer')}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 bg-slate-50 disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusToggle(m)}
                            disabled={!hasPermission('canEditManufacturer')}
                            className="p-1.5 text-emerald-600 rounded-lg border border-emerald-200 bg-emerald-50 cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Suppliers Table (hidden lg:block) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="py-3 px-3.5 w-16">ID</th>
                  <th className="py-3 px-3 w-44">Vendor Name</th>
                  <th className="py-3 px-3 w-44">Contact Portal</th>
                  <th className="py-3 px-3">Products of Interest</th>
                  <th className="py-3 px-3 w-20 text-center">Comms</th>
                  <th className="py-3 px-3 w-24">Status</th>
                  <th className="py-3 px-3.5 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredManufacturers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No vendors matched your search or status filter.
                    </td>
                  </tr>
                ) : (
                  filteredManufacturers.map(m => {
                    const commCount = communications.filter(c => c.manufacturerId === m.id).length;
                    const isSelected = inspectManufacturerId === m.id;

                    return (
                      <tr
                        key={m.id}
                        onClick={() => setInspectManufacturerId(isSelected ? null : m.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* ID */}
                        <td className="py-3 px-3.5 font-mono font-bold text-indigo-700">
                          {m.id}
                        </td>

                        {/* Name & Website */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{m.name}</div>
                          {m.website && (
                            <a
                              href={m.website.startsWith('http') ? m.website : `https://${m.website}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-[11px] text-indigo-600 hover:underline inline-flex items-center gap-1 mt-0.5 font-mono"
                            >
                              <span>{m.website.replace(/^https?:\/\//, '')}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-3 text-slate-600">
                          <div className="line-clamp-2">
                            {m.contactPortal || <span className="text-slate-400">Website / Direct Inquiry</span>}
                          </div>
                        </td>

                        {/* Products */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800 line-clamp-1">
                            {m.productsOfInterest || <span className="text-slate-400 italic font-normal">General fabrication & sourcing</span>}
                          </div>
                          {m.notes && <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{m.notes}</p>}
                        </td>

                        {/* Comms Count */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-[10px]">
                            <MessageSquare className="h-3 w-3 text-indigo-600" />
                            {commCount}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                            m.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {m.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onOpenCommModalWithManufacturer(m.id)}
                              disabled={!hasPermission('canLogCommunication')}
                              title="Log communication"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 cursor-pointer transition-colors"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onOpenManufacturerModal(m)}
                              disabled={!hasPermission('canEditManufacturer')}
                              title="Edit details"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 cursor-pointer transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {m.status === 'Active' ? (
                              <button
                                onClick={() => handleStatusToggle(m)}
                                disabled={!hasPermission('canDeleteManufacturer')}
                                title="Remove supplier (preserves history)"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-30 cursor-pointer transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusToggle(m)}
                                disabled={!hasPermission('canEditManufacturer')}
                                title="Restore to Active"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Panel: Inspected Supplier History */}
        {inspectedM && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4 animate-in fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                    {inspectedM.id}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900">{inspectedM.name}</h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {inspectedM.productsOfInterest || 'General fabrication & sourcing'}
                </p>
              </div>
              <button
                onClick={() => setInspectManufacturerId(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Communication History ({inspectedComms.length})</span>
              <button
                onClick={() => onOpenCommModalWithManufacturer(inspectedM.id)}
                disabled={!hasPermission('canLogCommunication')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>Log Comm</span>
              </button>
            </div>

            {inspectedComms.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No communications logged yet.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {inspectedComms.map(comm => (
                  <div key={comm.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-700">{comm.threadId}</span>
                        <span className="font-mono text-slate-400">{comm.date}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {comm.status}
                      </span>
                    </div>

                    <div className="font-semibold text-slate-900">{comm.subject}</div>
                    <div className="text-[11px] text-slate-600">{comm.keyOutcome}</div>

                    {comm.informationReceived && (
                      <div className="p-2 bg-white rounded border border-slate-100 text-[11px] text-slate-700">
                        {comm.informationReceived}
                      </div>
                    )}

                    {(comm.threadDoc || (comm.documentsReceived && comm.documentsReceived.length > 0) || (comm.attachments && comm.attachments.length > 0)) && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {comm.attachments?.map(att => (
                          <button
                            key={att.id}
                            onClick={() => onPreviewDoc(att.name, `Attachment - ${att.name}`)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-[10px] font-mono text-indigo-700 hover:bg-indigo-100 cursor-pointer shadow-2xs"
                            title="Preview or download attachment"
                          >
                            <Paperclip className="h-3 w-3 text-indigo-600" />
                            <span className="max-w-[140px] truncate">{att.name}</span>
                          </button>
                        ))}
                        {comm.threadDoc && !comm.attachments?.some(a => a.name === comm.threadDoc) && (
                          <button
                            onClick={() => onPreviewDoc(comm.threadDoc!, `Chat Document - ${comm.threadDoc}`)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-indigo-600 hover:underline cursor-pointer"
                          >
                            <FileText className="h-3 w-3" />
                            <span>{comm.threadDoc}</span>
                          </button>
                        )}
                        {comm.documentsReceived?.filter(doc => !comm.attachments?.some(a => a.name === doc)).map((doc, idx) => (
                          <button
                            key={idx}
                            onClick={() => onPreviewDoc(doc, `Specification - ${doc}`)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[10px] font-mono text-emerald-800 hover:underline cursor-pointer"
                          >
                            <FileText className="h-3 w-3" />
                            <span>{doc}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
