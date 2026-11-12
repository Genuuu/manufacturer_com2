import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Manufacturer, ManufacturerStatus } from '../types';
import { compareCommByEntryOrder } from '../utils/spreadsheetSync';
import {
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  RotateCcw,
  MessageSquare,
  X,
  FileText,
  Search,
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
    ? communications
        .filter(c => c.manufacturerId === inspectedM.id)
        .sort(compareCommByEntryOrder)
    : [];

  const handleStatusToggle = (m: Manufacturer) => {
    const nextStatus: ManufacturerStatus = m.status === 'Active' ? 'Removed' : 'Active';
    const res = toggleManufacturerStatus(m.id, nextStatus);
    if (!res.success) {
      alert(res.message);
    }
  };

  const filteredManufacturers = manufacturers.filter(m => {
    if (statusFilter !== 'ALL' && m.status !== statusFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.contactPortal.toLowerCase().includes(q) ||
        m.productsOfInterest.toLowerCase().includes(q) ||
        (m.notes || '').toLowerCase().includes(q)
      );
    }

    return true;
  });

  const activeCount = manufacturers.filter(m => m.status === 'Active').length;
  const removedCount = manufacturers.filter(m => m.status === 'Removed').length;

  return (
    <div className="space-y-3">
      {/* Single-Row Filter & Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({manufacturers.length})
            </button>
            <button
              onClick={() => setStatusFilter('Active')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'Active'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('Removed')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'Removed'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Removed ({removedCount})
            </button>
          </div>

          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search vendors, products..."
              className="w-full pl-8 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => onOpenManufacturerModal()}
          disabled={!hasPermission('canCreateManufacturer')}
          title={
            !hasPermission('canCreateManufacturer')
              ? 'Requires Moderator or Admin'
              : 'Add new supplier'
          }
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Main Grid: Suppliers Table + Optional Inspected Side Drawer */}
      <div className={`grid grid-cols-1 ${inspectManufacturerId ? 'lg:grid-cols-5' : ''} gap-3.5`}>
        <div
          className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${
            inspectManufacturerId ? 'lg:col-span-3' : 'w-full'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="py-2.5 px-3.5 w-16">ID</th>
                  <th className="py-2.5 px-3 w-44">Vendor Name</th>
                  <th className="py-2.5 px-3 w-44 hidden sm:table-cell">Contact Portal</th>
                  <th className="py-2.5 px-3">Products of Interest</th>
                  <th className="py-2.5 px-3 w-16 text-right">Logs</th>
                  <th className="py-2.5 px-3 w-20">Status</th>
                  <th className="py-2.5 px-3.5 w-24 text-right">Actions</th>
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
                          isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-2.5 px-3.5 font-mono font-bold text-indigo-600">
                          {m.id}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{m.name}</div>
                          {m.website && (
                            <a
                              href={
                                m.website.startsWith('http') ? m.website : `https://${m.website}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-[11px] text-indigo-600 hover:underline inline-flex items-center gap-1 font-mono"
                            >
                              <span>{m.website.replace(/^https?:\/\//, '')}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-slate-600 hidden sm:table-cell">
                          <div className="line-clamp-1">
                            {m.contactPortal || (
                              <span className="text-slate-400">Direct Inquiry</span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-800 line-clamp-1">
                            {m.productsOfInterest || (
                              <span className="text-slate-400 font-normal">
                                General fabrication & sourcing
                              </span>
                            )}
                          </div>
                          {m.notes && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">{m.notes}</p>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-600">
                          {commCount}
                        </td>

                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[11px] font-semibold ${
                              m.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>

                        <td
                          className="py-2.5 px-3.5 text-right whitespace-nowrap"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onOpenCommModalWithManufacturer(m.id)}
                              disabled={!hasPermission('canLogCommunication')}
                              title="Log communication"
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded disabled:opacity-30 cursor-pointer"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onOpenManufacturerModal(m)}
                              disabled={!hasPermission('canEditManufacturer')}
                              title="Edit details"
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded disabled:opacity-30 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {m.status === 'Active' ? (
                              <button
                                onClick={() => handleStatusToggle(m)}
                                disabled={!hasPermission('canDeleteManufacturer')}
                                title="Remove supplier"
                                className="p-1 text-slate-400 hover:text-rose-600 rounded disabled:opacity-30 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusToggle(m)}
                                disabled={!hasPermission('canEditManufacturer')}
                                title="Restore to Active"
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
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
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-start justify-between pb-2.5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-mono font-bold text-indigo-600">{inspectedM.id}</span>
                  <span>·</span>
                  <h3 className="font-bold text-sm text-slate-900">{inspectedM.name}</h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {inspectedM.productsOfInterest || 'General fabrication & sourcing'}
                </p>
              </div>
              <button
                onClick={() => setInspectManufacturerId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                History ({inspectedComms.length})
              </span>
              <button
                onClick={() => onOpenCommModalWithManufacturer(inspectedM.id)}
                disabled={!hasPermission('canLogCommunication')}
                className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Log Comm</span>
              </button>
            </div>

            {inspectedComms.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No communications logged yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto pr-1">
                {inspectedComms.map(comm => (
                  <div key={comm.id} className="py-2.5 first:pt-0 last:pb-0 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono font-bold text-indigo-600">
                        {comm.threadId} · <span className="font-normal tabular-nums">{comm.date}</span>
                      </span>
                      <span className="font-semibold text-slate-700">{comm.status}</span>
                    </div>

                    <div className="font-semibold text-slate-900">{comm.subject}</div>
                    <div className="text-[11px] text-slate-600">{comm.keyOutcome}</div>

                    {(comm.threadDoc ||
                      (comm.documentsReceived && comm.documentsReceived.length > 0) ||
                      (comm.attachments && comm.attachments.length > 0)) && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {comm.attachments?.map(att => (
                          <button
                            key={att.id}
                            onClick={() => onPreviewDoc(att.name, `Attachment - ${att.name}`)}
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-600 hover:underline cursor-pointer"
                          >
                            <Paperclip className="h-3 w-3" />
                            <span className="max-w-[140px] truncate">{att.name}</span>
                          </button>
                        ))}
                        {comm.documentsReceived
                          ?.filter(doc => !comm.attachments?.some(a => a.name === doc))
                          .map((doc, idx) => (
                            <button
                              key={idx}
                              onClick={() => onPreviewDoc(doc, `Specification - ${doc}`)}
                              className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 hover:underline cursor-pointer"
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
