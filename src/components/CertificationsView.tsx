import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ComponentDocCategory,
  ComponentDocStatus,
  ComponentDocument,
} from '../types';
import { parseGoogleDriveUrl } from '../utils/driveLinks';
import { ComponentDocModal } from './ComponentDocModal';
import { DrivePreviewModal } from './DrivePreviewModal';
import {
  Plus,
  Search,
  X,
  ExternalLink,
  Copy,
  Check,
  Edit2,
  Trash2,
  FileText,
  FolderOpen,
  FileSpreadsheet,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Cpu,
  Building2,
  LayoutGrid,
  List,
  Link2,
  Calendar,
} from 'lucide-react';

const CATEGORY_TABS: ('ALL' | ComponentDocCategory)[] = [
  'ALL',
  'Certification',
  'Design Datasheet',
  'Test Report',
  'Compliance / CoC',
  'CAD / Gerber',
  'Other',
];

function getCategoryBadgeClass(cat: ComponentDocCategory): string {
  switch (cat) {
    case 'Certification':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Design Datasheet':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Test Report':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Compliance / CoC':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'CAD / Gerber':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getStatusBadgeClass(status: ComponentDocStatus): string {
  switch (status) {
    case 'Verified':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Active':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Needs Renewal':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'Expired':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export const CertificationsView: React.FC = () => {
  const {
    componentDocuments,
    manufacturers,
    currentUser,
    hasPermission,
    deleteComponentDoc,
    searchQuery,
    setSearchQuery,
  } = useApp();

  const canModify =
    currentUser.role === 'admin' ||
    currentUser.role === 'moderator' ||
    hasPermission('canLogCommunication') ||
    hasPermission('canCreateManufacturer');

  const canDelete =
    currentUser.role === 'admin' ||
    currentUser.role === 'moderator' ||
    hasPermission('canDeleteCommunication');

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ComponentDocCategory>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATTENTION' | ComponentDocStatus>('ALL');
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ComponentDocument | null>(null);
  const [prefillComponent, setPrefillComponent] = useState<{
    componentName: string;
    manufacturerId?: string;
    manufacturerName?: string;
  } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ComponentDocument | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<ComponentDocument | null>(null);

  // Summary KPIs
  const metrics = useMemo(() => {
    const total = componentDocuments.length;
    const certifications = componentDocuments.filter(
      d => d.category === 'Certification' || d.category === 'Compliance / CoC'
    ).length;
    const datasheets = componentDocuments.filter(
      d => d.category === 'Design Datasheet' || d.category === 'CAD / Gerber'
    ).length;
    const attention = componentDocuments.filter(
      d => d.status === 'Pending' || d.status === 'Needs Renewal' || d.status === 'Expired'
    ).length;
    const uniqueComponents = new Set(
      componentDocuments.map(d => (d.componentName || '').trim().toLowerCase())
    ).size;

    return { total, certifications, datasheets, attention, uniqueComponents };
  }, [componentDocuments]);

  // Unique suppliers appearing in docs (for filter dropdown)
  const supplierFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    manufacturers.forEach(m => map.set(m.id, `${m.id} · ${m.name}`));
    componentDocuments.forEach(d => {
      if (!d.manufacturerId && d.manufacturerName) {
        map.set(`name:${d.manufacturerName}`, d.manufacturerName);
      }
    });
    return Array.from(map.entries());
  }, [manufacturers, componentDocuments]);

  // Filtered Documents
  const filteredDocs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return componentDocuments.filter(d => {
      if (categoryFilter !== 'ALL' && d.category !== categoryFilter) return false;

      if (supplierFilter !== 'ALL') {
        if (supplierFilter.startsWith('name:')) {
          const targetName = supplierFilter.slice(5);
          if ((d.manufacturerName || '') !== targetName) return false;
        } else if (d.manufacturerId !== supplierFilter) {
          return false;
        }
      }

      if (statusFilter === 'ATTENTION') {
        if (d.status !== 'Pending' && d.status !== 'Needs Renewal' && d.status !== 'Expired') {
          return false;
        }
      } else if (statusFilter !== 'ALL' && d.status !== statusFilter) {
        return false;
      }

      if (q) {
        const hay = [
          d.componentName,
          d.manufacturerName,
          d.category,
          d.notes,
          d.driveUrl,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [componentDocuments, categoryFilter, supplierFilter, statusFilter, searchQuery]);

  // Grouped by Ordered Component
  const groupedComponents = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        componentName: string;
        manufacturerId?: string;
        manufacturerName?: string;
        docs: ComponentDocument[];
      }
    >();

    filteredDocs.forEach(d => {
      const normName = (d.componentName || 'Unnamed Component').trim();
      const key = normName.toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          componentName: normName,
          manufacturerId: d.manufacturerId,
          manufacturerName: d.manufacturerName,
          docs: [],
        });
      }
      const group = groups.get(key)!;
      group.docs.push(d);
      if (!group.manufacturerName && d.manufacturerName) {
        group.manufacturerName = d.manufacturerName;
        group.manufacturerId = d.manufacturerId;
      }
    });

    return Array.from(groups.values());
  }, [filteredDocs]);

  const handleOpenAddNew = () => {
    setEditingDoc(null);
    setPrefillComponent(null);
    setModalOpen(true);
  };

  const handleOpenAddForComponent = (group: {
    componentName: string;
    manufacturerId?: string;
    manufacturerName?: string;
  }) => {
    setEditingDoc(null);
    setPrefillComponent(group);
    setModalOpen(true);
  };

  const handleOpenEdit = (docItem: ComponentDocument) => {
    setEditingDoc(docItem);
    setPrefillComponent(null);
    setModalOpen(true);
  };

  const handleCopyLink = (docItem: ComponentDocument) => {
    navigator.clipboard.writeText(docItem.driveUrl).then(() => {
      setCopiedId(docItem.id);
      setTimeout(() => setCopiedId(null), 1600);
    });
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteDoc) return;
    deleteComponentDoc(confirmDeleteDoc.id);
    setConfirmDeleteDoc(null);
  };

  const renderDriveIcon = (docItem: ComponentDocument) => {
    const type = docItem.driveResourceType || parseGoogleDriveUrl(docItem.driveUrl).resourceType;
    if (type === 'folder') return <FolderOpen className="h-4 w-4 text-amber-600 shrink-0" />;
    if (type === 'sheet') return <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />;
    return <FileText className="h-4 w-4 text-indigo-600 shrink-0" />;
  };

  return (
    <div className="space-y-4">
      {/* Header & KPI Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base text-slate-900">
                Component Certifications &amp; Design Docs
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                {metrics.uniqueComponents} components · {metrics.total} links
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Dedicated repository for manually linking Google Drive certifications, design datasheets, test reports, and CAD files for ordered components.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddNew}
            disabled={!canModify}
            title={!canModify ? 'Requires Moderator or Admin role' : 'Manually link a Google Drive file or folder'}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer shrink-0 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Drive Link</span>
          </button>
        </div>

        {/* 4 Interactive KPI Filter Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('ALL');
              setStatusFilter('ALL');
            }}
            className={`px-3 py-2 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer border ${
              categoryFilter === 'ALL' && statusFilter === 'ALL'
                ? 'bg-indigo-50/70 border-indigo-200'
                : 'bg-slate-50 border-transparent hover:border-slate-200'
            }`}
          >
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Total Linked Docs</span>
              <span className="text-lg font-bold text-slate-900 tabular-nums">{metrics.total}</span>
            </div>
            <Link2 className="h-4 w-4 text-indigo-600 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              setCategoryFilter('Certification');
              setStatusFilter('ALL');
            }}
            className={`px-3 py-2 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer border ${
              categoryFilter === 'Certification'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-slate-50 border-transparent hover:border-emerald-200'
            }`}
          >
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Certs &amp; Compliance</span>
              <span className="text-lg font-bold text-slate-900 tabular-nums">{metrics.certifications}</span>
            </div>
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              setCategoryFilter('Design Datasheet');
              setStatusFilter('ALL');
            }}
            className={`px-3 py-2 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer border ${
              categoryFilter === 'Design Datasheet'
                ? 'bg-indigo-50 border-indigo-200'
                : 'bg-slate-50 border-transparent hover:border-indigo-200'
            }`}
          >
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Datasheets &amp; CAD</span>
              <span className="text-lg font-bold text-slate-900 tabular-nums">{metrics.datasheets}</span>
            </div>
            <Cpu className="h-4 w-4 text-indigo-600 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              setCategoryFilter('ALL');
              setStatusFilter(prev => (prev === 'ATTENTION' ? 'ALL' : 'ATTENTION'));
            }}
            className={`px-3 py-2 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer border ${
              statusFilter === 'ATTENTION'
                ? 'bg-amber-50 border-amber-300'
                : 'bg-slate-50 border-transparent hover:border-amber-200'
            }`}
          >
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Pending / Renewal</span>
              <span className="text-lg font-bold text-slate-900 tabular-nums">{metrics.attention}</span>
            </div>
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          </button>
        </div>
      </div>

      {/* Filter & View Mode Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORY_TABS.map(cat => {
              const count =
                cat === 'ALL'
                  ? componentDocuments.length
                  : componentDocuments.filter(d => d.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    categoryFilter === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <span>{cat === 'ALL' ? 'All Categories' : cat}</span>
                  <span className="text-[10px] opacity-75 tabular-nums">({count})</span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>By Component</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>All Links</span>
            </button>
          </div>
        </div>

        {/* Search + Dropdown Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search component, category, supplier, or notes..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 cursor-pointer"
          >
            <option value="ALL">All Suppliers</option>
            {supplierFilterOptions.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ATTENTION">Needs Attention (Pending / Renewal / Expired)</option>
            <option value="Verified">Verified</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Needs Renewal">Needs Renewal</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm font-bold text-slate-900">
              {componentDocuments.length === 0
                ? 'No Component Certifications or Datasheets Linked Yet'
                : 'No Matching Documents Found'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {componentDocuments.length === 0
                ? 'Keep your supplier communication threads uncluttered by storing Google Drive links for certifications, design datasheets, test reports, and CAD files here.'
                : 'Try adjusting your category, supplier, status filter, or search query.'}
            </p>
          </div>
          {componentDocuments.length === 0 && canModify && (
            <button
              type="button"
              onClick={handleOpenAddNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Link First Google Drive Document</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grouped' ? (
        /* Grouped by Component View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {groupedComponents.map(group => (
            <div
              key={group.key}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col"
            >
              {/* Component Card Header */}
              <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Cpu className="h-4 w-4 text-indigo-600 shrink-0" />
                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {group.componentName}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    {group.manufacturerName && (
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        {group.manufacturerId ? `${group.manufacturerId} · ` : ''}
                        {group.manufacturerName}
                      </span>
                    )}
                    <span>· {group.docs.length} linked file{group.docs.length === 1 ? '' : 's'}</span>
                  </div>
                </div>

                {canModify && (
                  <button
                    type="button"
                    onClick={() => handleOpenAddForComponent(group)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-[11px] font-semibold text-indigo-700 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Link</span>
                  </button>
                )}
              </div>

              {/* Linked Documents List */}
              <div className="divide-y divide-slate-100">
                {group.docs.map(docItem => {
                  const parsed = parseGoogleDriveUrl(docItem.driveUrl);
                  return (
                    <div
                      key={docItem.id}
                      className="p-3 hover:bg-slate-50/70 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 border border-slate-200/80 shrink-0">
                            {renderDriveIcon(docItem)}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${getCategoryBadgeClass(
                                  docItem.category
                                )}`}
                              >
                                {docItem.category}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${getStatusBadgeClass(
                                  docItem.status
                                )}`}
                              >
                                {docItem.status}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                              <span className="font-medium text-slate-700">{parsed.label}</span>
                              {docItem.expiryDate && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-slate-400" />
                                  Exp: {docItem.expiryDate}
                                </span>
                              )}
                            </div>

                            {docItem.notes && (
                              <p className="text-[11px] text-slate-600 line-clamp-2">{docItem.notes}</p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(docItem)}
                            title="Preview Drive document"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 transition-colors cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          <a
                            href={parsed.normalizedUrl || docItem.driveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in Google Drive"
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopyLink(docItem)}
                            title="Copy Drive link"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            {copiedId === docItem.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {canModify && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(docItem)}
                              title="Edit link details"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteDoc(docItem)}
                              title="Remove link"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat All-Documents Table View */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Component</th>
                  <th className="py-2.5 px-3">Document Category &amp; Type</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Status &amp; Expiry</th>
                  <th className="py-2.5 px-3 text-right">Drive Link Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map(docItem => {
                  const parsed = parseGoogleDriveUrl(docItem.driveUrl);
                  return (
                    <tr key={docItem.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 align-top">
                        <div className="font-bold text-slate-900">{docItem.componentName}</div>
                        {docItem.notes && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {docItem.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <div className="flex items-center gap-2">
                          {renderDriveIcon(docItem)}
                          <span
                            className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${getCategoryBadgeClass(
                              docItem.category
                            )}`}
                          >
                            {docItem.category}
                          </span>
                          <span className="text-[11px] text-slate-500">{parsed.label}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 align-top text-slate-700">
                        {docItem.manufacturerName ? (
                          <span>
                            {docItem.manufacturerId ? `${docItem.manufacturerId} · ` : ''}
                            {docItem.manufacturerName}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${getStatusBadgeClass(
                            docItem.status
                          )}`}
                        >
                          {docItem.status}
                        </span>
                        {docItem.expiryDate && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            Exp: {docItem.expiryDate}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(docItem)}
                            title="Preview"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 text-[11px] font-semibold cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">Preview</span>
                          </button>

                          <a
                            href={parsed.normalizedUrl || docItem.driveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">Open</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopyLink(docItem)}
                            title="Copy link"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          >
                            {copiedId === docItem.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {canModify && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(docItem)}
                              title="Edit"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteDoc(docItem)}
                              title="Delete"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Component Document Modal */}
      <ComponentDocModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingDoc={editingDoc}
        prefillComponent={prefillComponent}
      />

      {/* Google Drive Preview Modal */}
      <DrivePreviewModal
        docItem={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      {/* Delete Confirmation Modal */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90dvh]">
            <div className="p-4 bg-rose-50 border-b border-rose-200 flex items-center gap-2.5">
              <Trash2 className="h-4 w-4 text-rose-600 shrink-0" />
              <h3 className="font-bold text-sm text-rose-950">Remove Linked Document?</h3>
            </div>
            <div className="p-4 text-xs text-slate-600 space-y-1.5 overflow-y-auto">
              <p>
                Remove <strong className="text-slate-900">{confirmDeleteDoc.category}</strong> link from{' '}
                <strong className="text-slate-900">{confirmDeleteDoc.componentName}</strong>?
              </p>
              <p className="text-[11px] text-slate-500">
                This only removes the link from FabricateOps; the file in your Google Drive is not affected.
              </p>
            </div>
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Remove Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
