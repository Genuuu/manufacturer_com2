import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import {
  Mail,
  Copy,
  Check,
  Plus,
  Edit2,
  Trash2,
  Send,
  Search,
  X,
  RotateCcw,
  Building2,
  Sparkles,
  ExternalLink,
  FileText,
} from 'lucide-react';

export interface EmailTemplate {
  id: string;
  title: string;
  category: string;
  subject: string;
  body: string;
  description?: string;
  updatedAt?: string;
}

const STORAGE_KEY = 'fabricateops_email_templates_v1';

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl-rfq-volume',
    title: 'Initial RFQ & Volume Quotation',
    category: 'RFQ & Pricing',
    description: 'Request tiered unit pricing, MOQ, NRE/tooling costs, and production lead times.',
    subject: 'RFQ: {{Product_Name}} — Volume Pricing ({{Quantity}}) & Lead Time Inquiry',
    body: `Dear {{Contact_Name}},

We are currently evaluating suppliers for {{Product_Name}} and would like to request a formal quotation from {{Supplier_Name}}.

Could you please provide the following details:
1. Unit pricing breakdown for {{Quantity}} units (and tiered volume breaks)
2. Minimum Order Quantity (MOQ) and any NRE / tooling / setup charges
3. Standard production lead time and expedited turn-time options
4. Shipping terms (EXW / FOB / DDP) and packaging specifications

Please let us know if you need our Gerber/CAD package or technical specification sheet to finalize the quote.

Best regards,
{{Sender_Name}}
{{Position}}`,
    updatedAt: '2025-02-20',
  },
  {
    id: 'tpl-sample-order',
    title: 'Engineering Sample & Eval Kit Request',
    category: 'Samples & Prototyping',
    description: 'Request prototype/evaluation units, datasheets, and hardware design guides.',
    subject: 'Sample Inquiry: {{Product_Name}} Evaluation Units & Technical Documentation',
    body: `Hello {{Contact_Name}},

Our engineering team is designing in {{Product_Name}} for an upcoming hardware build and would like to order sample units from {{Supplier_Name}} for bench validation.

Could you please confirm:
• Availability and unit cost for {{Quantity}} engineering samples
• Estimated delivery timeline to our lab
• Latest datasheet, reference schematic, and hardware integration guide

Once confirmed, we can share our shipping account details or complete payment immediately.

Best regards,
{{Sender_Name}}
{{Position}}`,
    updatedAt: '2025-02-20',
  },
  {
    id: 'tpl-followup-pending',
    title: 'Follow-up on Pending Quotation / Reply',
    category: 'Follow-up',
    description: 'Polite follow-up on an open inquiry or awaiting technical/commercial response.',
    subject: 'Follow-up: Pending Inquiry for {{Product_Name}} — {{Supplier_Name}}',
    body: `Hi {{Contact_Name}},

I wanted to quickly follow up on our previous message regarding {{Product_Name}}.

Our team is finalizing our bill of materials and supplier selection schedule this week. Could you please share an update on the quotation and lead time when you have a moment?

If any additional technical clarifications are needed from our side, please let me know.

Thank you,
{{Sender_Name}}
{{Position}}`,
    updatedAt: '2025-02-20',
  },
  {
    id: 'tpl-dfm-technical',
    title: 'Technical Specification & DFM Clarification',
    category: 'Technical / DFM',
    description: 'Clarify manufacturing tolerances, stackup, impedance, or test requirements.',
    subject: 'Technical & DFM Clarification: {{Product_Name}} Specifications',
    body: `Dear {{Contact_Name}},

Thank you for the update on {{Product_Name}}. Before we release the files for production at {{Supplier_Name}}, our engineering team would like to confirm a few technical details:

1. Manufacturing tolerances and quality inspection standards (IPC Class / AOI / functional test)
2. Material availability and recommended stackup / finish options
3. Any DFM adjustments needed to optimize yield for a {{Quantity}} run

Please share your engineering team's feedback so we can lock the revision.

Best regards,
{{Sender_Name}}
{{Position}}`,
    updatedAt: '2025-02-20',
  },
  {
    id: 'tpl-price-negotiation',
    title: 'Commercial & Lead Time Negotiation',
    category: 'Negotiation',
    description: 'Request target price alignment or improved lead time for production commitment.',
    subject: 'Commercial Review: Target Pricing & Schedule for {{Product_Name}} ({{Quantity}})',
    body: `Dear {{Contact_Name}},

Thank you for sending over the quotation for {{Product_Name}}.

We are very interested in moving forward with {{Supplier_Name}} for our {{Quantity}} production allocation. However, to align with our target BOM budget and project schedule, could you review if there is room to:
• Improve the unit pricing at the {{Quantity}} tier
• Reduce the production lead time or split delivery into a partial first batch

If we can align on these terms, we are ready to proceed with order approval promptly.

Best regards,
{{Sender_Name}}
{{Position}}`,
    updatedAt: '2025-02-20',
  },
  {
    id: 'tpl-order-approval',
    title: 'Quotation Approval & Next Steps',
    category: 'Order & Approval',
    description: 'Confirm quote acceptance and request proforma invoice / payment instructions.',
    subject: 'Order Confirmation: Proceeding with {{Product_Name}} ({{Quantity}}) — {{Supplier_Name}}',
    body: `Dear {{Contact_Name}},

We have completed our internal review and are pleased to confirm that we would like to proceed with {{Supplier_Name}} for {{Product_Name}} ({{Quantity}}).

Could you please send over the official Proforma Invoice (PI) and order confirmation so we can arrange payment and lock in the production slot?

Thank you for your support,
{{Sender_Name}}
{{Position}}`,
    updatedAt: '2025-02-20',
  },
];

export const EmailTemplatesView: React.FC = () => {
  const {
    manufacturers,
    currentUser,
    addCommunication,
    getNextThreadId,
    hasPermission,
    setActiveTab,
  } = useApp();

  const canViewTemplates = currentUser.role === 'admin' || currentUser.role === 'moderator';
  const canEditTemplates = currentUser.role === 'admin';

  const [templates, setTemplates] = useState<EmailTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_EMAIL_TEMPLATES;
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || DEFAULT_EMAIL_TEMPLATES[0].id
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchText, setSearchText] = useState<string>('');

  // Dynamic Variable Fill State
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');
  const [contactName, setContactName] = useState<string>('Sales & Engineering Team');
  const [productName, setProductName] = useState<string>('5,000 PCBs / Hardware Assemblies');
  const [quantity, setQuantity] = useState<string>('5,000 pcs');
  const [senderName, setSenderName] = useState<string>(currentUser?.name || 'Procurement Team');
  const [senderPosition, setSenderPosition] = useState<string>(
    currentUser?.department || 'Procurement & Hardware Engineering'
  );
  const [companyName, setCompanyName] = useState<string>('FabricateOps');
  const [senderEmail, setSenderEmail] = useState<string>(currentUser?.email || '');

  // Copy & Log Feedback
  const [copiedField, setCopiedField] = useState<'subject' | 'body' | 'all' | null>(null);
  const [loggedSuccessMsg, setLoggedSuccessMsg] = useState<string | null>(null);

  // Create / Edit Modal State
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('RFQ & Pricing');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formSubject, setFormSubject] = useState<string>('');
  const [formBody, setFormBody] = useState<string>('');

  // Keep senderName, position, and email synced with currentUser when user switches
  useEffect(() => {
    if (currentUser?.name) {
      setSenderName(currentUser.name);
    }
    if (currentUser?.department) {
      setSenderPosition(currentUser.department);
    }
    if (currentUser?.email) {
      setSenderEmail(currentUser.email);
    }
  }, [currentUser?.name, currentUser?.department, currentUser?.email]);

  // Firestore real-time sync for emailTemplates
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'emailTemplates'),
      snapshot => {
        if (!snapshot.empty) {
          const remote: EmailTemplate[] = [];
          snapshot.forEach(docSnap => {
            remote.push(docSnap.data() as EmailTemplate);
          });
          setTemplates(remote);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
          } catch {
            // ignore
          }
        }
      },
      () => {
        // Fallback silently to local templates if offline
      }
    );
    return () => unsub();
  }, []);

  const saveTemplateToStore = (updatedList: EmailTemplate[], changedItem?: EmailTemplate, deletedId?: string) => {
    if (!canEditTemplates) return;
    setTemplates(updatedList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch {
      // ignore
    }
    if (changedItem) {
      setDoc(doc(db, 'emailTemplates', changedItem.id), changedItem).catch(() => {});
    }
    if (deletedId) {
      deleteDoc(doc(db, 'emailTemplates', deletedId)).catch(() => {});
    }
  };

  // Update variable placeholders automatically when a supplier is chosen
  const selectedManufacturer = useMemo(
    () => manufacturers.find(m => m.id === selectedManufacturerId) || null,
    [manufacturers, selectedManufacturerId]
  );

  const handleSelectManufacturer = (mId: string) => {
    setSelectedManufacturerId(mId);
    const found = manufacturers.find(m => m.id === mId);
    if (found) {
      if (found.productsOfInterest) {
        setProductName(found.productsOfInterest);
      }
      setContactName(`${found.name} Team`);
    } else {
      setContactName('Sales & Engineering Team');
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>(['RFQ & Pricing', 'Samples & Prototyping', 'Follow-up', 'Technical / DFM', 'Negotiation', 'Order & Approval']);
    templates.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.body.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [templates, selectedCategory, searchText]);

  const activeTemplate = useMemo(
    () =>
      templates.find(t => t.id === selectedTemplateId) ||
      filteredTemplates[0] ||
      templates[0] ||
      DEFAULT_EMAIL_TEMPLATES[0],
    [templates, selectedTemplateId, filteredTemplates]
  );

  // Replace {{Placeholders}} with current variable values
  const fillVariables = (text: string): string => {
    const supplierLabel = selectedManufacturer ? selectedManufacturer.name : 'Supplier';
    return text
      .replace(/\{\{Supplier_Name\}\}/gi, supplierLabel)
      .replace(/\{\{Contact_Name\}\}/gi, contactName || 'Team')
      .replace(/\{\{Product_Name\}\}/gi, productName || 'Requested Components')
      .replace(/\{\{Quantity\}\}/gi, quantity || 'Target Volume')
      .replace(/\{\{Sender_Name\}\}/gi, senderName || currentUser?.name || 'Procurement Team')
      .replace(/\{\{Position\}\}/gi, senderPosition || currentUser?.department || 'Procurement & Hardware Engineering')
      .replace(/\{\{Department\}\}/gi, senderPosition || currentUser?.department || 'Procurement & Hardware Engineering')
      .replace(/\{\{Sender_Email\}\}/gi, senderEmail || currentUser?.email || '')
      .replace(/\{\{Company_Name\}\}/gi, companyName || 'FabricateOps');
  };

  const compiledSubject = useMemo(
    () => (activeTemplate ? fillVariables(activeTemplate.subject) : ''),
    [activeTemplate, selectedManufacturer, contactName, productName, quantity, senderName, senderPosition, senderEmail, companyName]
  );

  const compiledBody = useMemo(
    () => (activeTemplate ? fillVariables(activeTemplate.body) : ''),
    [activeTemplate, selectedManufacturer, contactName, productName, quantity, senderName, senderPosition, senderEmail, companyName]
  );

  const handleCopy = async (type: 'subject' | 'body' | 'all') => {
    const content =
      type === 'subject'
        ? compiledSubject
        : type === 'body'
        ? compiledBody
        : `Subject: ${compiledSubject}\n\n${compiledBody}`;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedField(type);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleLogAsSentEmail = () => {
    if (!selectedManufacturer) return;
    const today = new Date().toISOString().split('T')[0];
    const nextThread = getNextThreadId(selectedManufacturer.id);
    const res = addCommunication({
      date: today,
      manufacturerId: selectedManufacturer.id,
      manufacturerName: selectedManufacturer.name,
      threadSelection: 'New Thread',
      threadId: nextThread,
      channel: 'Email - Sent',
      subject: compiledSubject,
      keyOutcome: `Sent "${activeTemplate.title}" email regarding ${productName} (${quantity}).`,
      status: 'Awaiting Reply',
      nextAction: 'Await supplier quotation / response',
      followUpDate: '',
      fullEmailText: `Subject: ${compiledSubject}\n\n${compiledBody}`,
      documentsReceived: [],
      informationReceived: '',
    });

    if (res.success) {
      setLoggedSuccessMsg(`Logged to ${selectedManufacturer.name} (${nextThread})`);
      setTimeout(() => setLoggedSuccessMsg(null), 4000);
    }
  };

  const openNewTemplateModal = () => {
    if (!canEditTemplates) return;
    setEditingTemplate(null);
    setFormTitle('');
    setFormCategory('RFQ & Pricing');
    setFormDescription('');
    setFormSubject('Inquiry: {{Product_Name}} ({{Quantity}}) — {{Supplier_Name}}');
    setFormBody(
      `Dear {{Contact_Name}},\n\nWe are reaching out to {{Supplier_Name}} regarding {{Product_Name}} ({{Quantity}}).\n\nBest regards,\n{{Sender_Name}}`
    );
    setIsEditorOpen(true);
  };

  const openEditTemplateModal = (tpl: EmailTemplate) => {
    if (!canEditTemplates) return;
    setEditingTemplate(tpl);
    setFormTitle(tpl.title);
    setFormCategory(tpl.category);
    setFormDescription(tpl.description || '');
    setFormSubject(tpl.subject);
    setFormBody(tpl.body);
    setIsEditorOpen(true);
  };

  const handleSaveTemplateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditTemplates) return;
    if (!formTitle.trim() || !formSubject.trim() || !formBody.trim()) return;

    const now = new Date().toISOString().split('T')[0];
    if (editingTemplate) {
      const updated: EmailTemplate = {
        ...editingTemplate,
        title: formTitle.trim(),
        category: formCategory.trim() || 'General',
        description: formDescription.trim(),
        subject: formSubject.trim(),
        body: formBody,
        updatedAt: now,
      };
      const nextList = templates.map(t => (t.id === updated.id ? updated : t));
      saveTemplateToStore(nextList, updated);
      setSelectedTemplateId(updated.id);
    } else {
      const newTpl: EmailTemplate = {
        id: `tpl-${Date.now()}`,
        title: formTitle.trim(),
        category: formCategory.trim() || 'General',
        description: formDescription.trim(),
        subject: formSubject.trim(),
        body: formBody,
        updatedAt: now,
      };
      const nextList = [newTpl, ...templates];
      saveTemplateToStore(nextList, newTpl);
      setSelectedTemplateId(newTpl.id);
    }
    setIsEditorOpen(false);
  };

  const handleDeleteTemplate = (tpl: EmailTemplate) => {
    if (!canEditTemplates || templates.length <= 1) return;
    const nextList = templates.filter(t => t.id !== tpl.id);
    saveTemplateToStore(nextList, undefined, tpl.id);
    if (selectedTemplateId === tpl.id && nextList[0]) {
      setSelectedTemplateId(nextList[0].id);
    }
  };

  const handleResetDefaults = () => {
    if (!canEditTemplates) return;
    saveTemplateToStore(DEFAULT_EMAIL_TEMPLATES);
    DEFAULT_EMAIL_TEMPLATES.forEach(t => {
      setDoc(doc(db, 'emailTemplates', t.id), t).catch(() => {});
    });
    setSelectedTemplateId(DEFAULT_EMAIL_TEMPLATES[0].id);
  };

  const supplierEmailAddress = useMemo(() => {
    if (!selectedManufacturer?.contactPortal) return '';
    const match = selectedManufacturer.contactPortal.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0] : '';
  }, [selectedManufacturer]);

  if (!canViewTemplates) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
        <h3 className="font-bold text-sm text-slate-900">Restricted Access</h3>
        <p className="text-xs text-slate-500">
          Only Admin and Moderator roles have permission to view Email Templates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Unified Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Email Templates</h2>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500 tabular-nums">
                {templates.length} templates
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-indigo-600">
                {canEditTemplates ? 'Admin (Edit Access)' : 'Moderator (View & Use)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder:text-slate-400"
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {canEditTemplates && (
            <>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 flex items-center gap-1 cursor-pointer"
                title="Restore default procurement templates"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>

              <button
                type="button"
                onClick={openNewTemplateModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Template</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Split View: Left Template List (4 cols) + Right Live Preview & Auto-Fill (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Compact Template List */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
          {filteredTemplates.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No templates match your filter.
            </div>
          ) : (
            filteredTemplates.map(tpl => {
              const isSelected = activeTemplate?.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`p-3.5 cursor-pointer transition-colors flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-indigo-50/80 ring-1 ring-inset ring-indigo-200'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                      {tpl.title}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                      {tpl.category}
                    </span>
                  </div>
                  {tpl.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2">{tpl.description}</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Quick Variable Fill + Ready-to-Send Email Preview */}
        {activeTemplate && (
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
            {/* Template Title & Edit/Delete Actions (Admin Only) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    {activeTemplate.title}
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {activeTemplate.category}
                  </span>
                </div>
                {activeTemplate.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{activeTemplate.description}</p>
                )}
              </div>

              {canEditTemplates && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditTemplateModal(activeTemplate)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Template</span>
                  </button>
                  {templates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(activeTemplate)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Delete template"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Auto-Fill Variables Bar */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Auto-Fill Placeholders for Supplier</span>
                </span>
                {selectedManufacturer && (
                  <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {selectedManufacturer.id} · {selectedManufacturer.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Select Supplier
                  </label>
                  <select
                    value={selectedManufacturerId}
                    onChange={e => handleSelectManufacturer(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium cursor-pointer"
                  >
                    <option value="">— Generic / Any Supplier —</option>
                    {manufacturers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.id} · {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Recipient / Contact
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="e.g. Sales Team"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Product / Part Name
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    placeholder="e.g. SIM7600G-H Modules"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Target Quantity
                  </label>
                  <input
                    type="text"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    placeholder="e.g. 5,000 units"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Sender Name <span className="text-[9px] text-indigo-600 font-normal">(Auto-filled from user profile)</span>
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="e.g. Alex Chen"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Position <span className="text-[9px] text-indigo-600 font-normal">(Auto-filled from user profile)</span>
                  </label>
                  <input
                    type="text"
                    value={senderPosition}
                    onChange={e => setSenderPosition(e.target.value)}
                    placeholder="e.g. Lead Sourcing Engineer"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Compiled Subject Line */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Subject Line
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('subject')}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'subject' ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied Subject</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Subject</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900">
                {compiledSubject}
              </div>
            </div>

            {/* Compiled Email Body */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Email Body Preview
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('body')}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'body' ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied Body</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Body</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans min-h-[210px]">
                {compiledBody}
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy('all')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  {copiedField === 'all' ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied Full Email!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Full Email</span>
                    </>
                  )}
                </button>

                <a
                  href={`mailto:${encodeURIComponent(supplierEmailAddress)}?subject=${encodeURIComponent(
                    compiledSubject
                  )}&body=${encodeURIComponent(compiledBody)}`}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Open in Mail App</span>
                </a>
              </div>

              <div className="flex items-center gap-2">
                {loggedSuccessMsg && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('communications')}
                    className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{loggedSuccessMsg} — View →</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleLogAsSentEmail}
                  disabled={!selectedManufacturer || !hasPermission('canLogCommunication')}
                  title={
                    !selectedManufacturer
                      ? 'Select a supplier above to log this email directly to their communication history'
                      : 'Record this email as Sent in the supplier communication log'
                  }
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {selectedManufacturer
                      ? `Log as Sent to ${selectedManufacturer.name}`
                      : 'Select Supplier to Log'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Template Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-400" />
                <h3 className="font-bold text-sm">
                  {editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplateForm} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Template Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="e.g. Initial RFQ & Volume Quotation"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    placeholder="e.g. RFQ & Pricing, Follow-up, Technical"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Short Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="When to use this template..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Email Subject *</label>
                  <span className="text-[10px] font-mono text-slate-400">
                    Placeholders: {'{{Supplier_Name}}'} {'{{Product_Name}}'} {'{{Quantity}}'}
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={formSubject}
                  onChange={e => setFormSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Email Body *</label>
                  <span className="text-[10px] font-mono text-slate-400">
                    Supports {'{{Contact_Name}}'}, {'{{Sender_Name}}'}, {'{{Position}}'}
                  </span>
                </div>
                <textarea
                  rows={9}
                  required
                  value={formBody}
                  onChange={e => setFormBody(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 leading-relaxed"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
