import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  buildSpreadsheetTabs,
  writeBackupToGoogleSpreadsheet,
} from '../utils/spreadsheetSync';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  subscribeAccessToken,
} from '../firebase';
import {
  Table,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  Check,
  Plus,
  Link2,
  Search,
  Sparkles,
  CloudUpload,
  FileSpreadsheet,
  X,
  Unlink,
  ShieldAlert,
} from 'lucide-react';

type WorksheetTab = 'central' | 'manufacturers' | 'communications';

export const SpreadsheetView: React.FC = () => {
  const {
    manufacturers,
    communications,
    exportCsvData,
    sheetBackupConfig,
    saveSheetBackupConfig,
    currentDataHash,
    isAutoSyncingSheet,
    lastSheetSyncError,
    triggerGoogleSheetSync,
  } = useApp();

  const [activeSheet, setActiveSheet] = useState<WorksheetTab>('central');
  const [sheetSearch, setSheetSearch] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ addr: string; val: string } | null>(null);
  const [copiedTsv, setCopiedTsv] = useState(false);

  // Google OAuth token state (cached in memory via firebase.ts)
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Google Sheets API operations state
  const [isCreatingSheet, setIsCreatingSheet] = useState<boolean>(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Link existing spreadsheet modal/input state
  const [showLinkInput, setShowLinkInput] = useState<boolean>(false);
  const [linkInputUrl, setLinkInputUrl] = useState<string>('');

  // Mandatory User Confirmation Modal state before mutating/updating Google Sheets
  const [confirmSyncModalOpen, setConfirmSyncModalOpen] = useState<boolean>(false);
  const [confirmUnlinkModalOpen, setConfirmUnlinkModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubAuth = initAuth(
      (_user, token) => {
        setAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );

    const unsubToken = subscribeAccessToken(token => {
      setAccessToken(token);
      setNeedsAuth(!token);
    });

    return () => {
      unsubAuth();
      unsubToken();
    };
  }, []);

  const isOutOfSync = useMemo(() => {
    if (!sheetBackupConfig) return false;
    return sheetBackupConfig.lastSyncedHash !== currentDataHash;
  }, [sheetBackupConfig, currentDataHash]);

  // Build all 3 tabs using the shared entry-ordered builder (includes all recent details: nextAction, attachments, chatTurns, etc.)
  const { centralRows, manufacturerRows, communicationRows } = useMemo(
    () => buildSpreadsheetTabs(manufacturers, communications),
    [manufacturers, communications]
  );



  const activeRows = useMemo(() => {
    const base =
      activeSheet === 'central'
        ? centralRows
        : activeSheet === 'manufacturers'
        ? manufacturerRows
        : communicationRows;

    if (!sheetSearch.trim()) return base;
    const q = sheetSearch.toLowerCase();
    return base.filter((row, idx) => {
      if (idx === 0) return true; // Keep header row visible
      return row.some(cell => cell.toLowerCase().includes(q));
    });
  }, [activeSheet, centralRows, manufacturerRows, communicationRows, sheetSearch]);

  const columnCount = useMemo(() => {
    return activeRows.reduce((max, r) => Math.max(max, r.length), 8);
  }, [activeRows]);

  const getColLetter = (index: number) => {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  // Handle Google OAuth Sign-In for Google Sheets
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setStatusBanner(null);
    try {
      const result = await googleSignIn();
      if (result?.accessToken) {
        setAccessToken(result.accessToken);
        setNeedsAuth(false);

        if (sheetBackupConfig) {
          setIsSyncingSheet(true);
          try {
            const updated = await triggerGoogleSheetSync(result.accessToken);
            setStatusBanner({
              type: 'success',
              text: `Signed in as ${result.user.email} and automatically synced all ${manufacturers.length} suppliers and ${communications.length} communication records to "${updated?.spreadsheetTitle || sheetBackupConfig.spreadsheetTitle}".`,
            });
          } catch (syncErr: any) {
            setStatusBanner({
              type: 'error',
              text: syncErr?.message || 'Signed in, but could not sync to Google Sheet.',
            });
          } finally {
            setIsSyncingSheet(false);
          }
        } else {
          setStatusBanner({
            type: 'success',
            text: `Connected to Google Sheets as ${result.user.email}. You can now create or link your online backup spreadsheet.`,
          });
        }
      }
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.message || 'Failed to authenticate with Google Sheets.',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Helper to write all 3 tabs to a Google Spreadsheet ID
  const writeDataToSpreadsheet = async (
    spreadsheetId: string,
    token: string,
    existingTitle?: string
  ) => {
    try {
      const updatedConfig = await writeBackupToGoogleSpreadsheet(
        spreadsheetId,
        token,
        manufacturers,
        communications,
        existingTitle
      );
      saveSheetBackupConfig(updatedConfig);
      return updatedConfig;
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        setNeedsAuth(true);
      }
      throw err;
    }
  };

  // Create a brand new Google Sheet and populate it with the backup
  const handleCreateNewGoogleSheet = async () => {
    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setIsCreatingSheet(true);
    setStatusBanner(null);

    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const title = `Manufacturer Comms Backup (${dateStr})`;

      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: { title },
          sheets: [
            {
              properties: {
                title: 'CENTRAL INPUT',
                gridProperties: { frozenRowCount: 3 },
              },
            },
            {
              properties: {
                title: 'Manufacturers',
                gridProperties: { frozenRowCount: 1 },
              },
            },
            {
              properties: {
                title: 'Communications',
                gridProperties: { frozenRowCount: 1 },
              },
            },
          ],
        }),
      });

      if (!createRes.ok) {
        if (createRes.status === 401 || createRes.status === 403) {
          setNeedsAuth(true);
          throw new Error('Authentication required. Please sign in with Google to grant Google Sheets permission.');
        }
        const errBody = await createRes.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || 'Failed to create Google Sheet');
      }

      const created = await createRes.json();
      const newSpreadsheetId = created.spreadsheetId;

      const savedConfig = await writeDataToSpreadsheet(newSpreadsheetId, token, title);

      setStatusBanner({
        type: 'success',
        text: `Created and synced online backup "${savedConfig.spreadsheetTitle}" (${manufacturers.length} suppliers, ${communications.length} logs). Any new details added in the webapp will now sync automatically!`,
      });
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.message || 'Could not create Google Sheet backup.',
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Sync to existing linked Google Sheet
  const handleConfirmedSyncToGoogleSheet = async () => {
    if (!sheetBackupConfig) return;
    setConfirmSyncModalOpen(false);

    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      setStatusBanner({
        type: 'info',
        text: 'Please sign in with Google first to authorize updating the backup spreadsheet.',
      });
      return;
    }

    setIsSyncingSheet(true);
    setStatusBanner(null);

    try {
      const updated = await writeDataToSpreadsheet(
        sheetBackupConfig.spreadsheetId,
        token,
        sheetBackupConfig.spreadsheetTitle
      );
      setStatusBanner({
        type: 'success',
        text: `Updated "${updated.spreadsheetTitle}" with all ${manufacturers.length} manufacturers and ${communications.length} communication records in entry order.`,
      });
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.message || 'Failed to sync data to Google Sheets.',
      });
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Link an existing Google Sheet by URL or ID
  const handleLinkExistingSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = linkInputUrl.trim();
    if (!raw) return;

    // Extract spreadsheetId from URL or raw ID
    const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const extractedId = match ? match[1] : raw;

    const initialConfig = {
      spreadsheetId: extractedId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${extractedId}/edit`,
      spreadsheetTitle: 'Linked Google Sheet Backup',
      lastSyncedAt: '',
      lastSyncedManufacturerCount: 0,
      lastSyncedCommCount: 0,
      lastSyncedHash: '',
    };

    saveSheetBackupConfig(initialConfig);
    setLinkInputUrl('');
    setShowLinkInput(false);

    const token = await getAccessToken();
    if (token) {
      setIsSyncingSheet(true);
      try {
        const updated = await writeDataToSpreadsheet(extractedId, token, initialConfig.spreadsheetTitle);
        setStatusBanner({
          type: 'success',
          text: `Linked and synced "${updated.spreadsheetTitle}" with all ${manufacturers.length} manufacturers and ${communications.length} communication records!`,
        });
      } catch (err: any) {
        setStatusBanner({
          type: 'error',
          text: err?.message || 'Spreadsheet linked, but initial sync failed. Click "Sync Backup Now" to retry.',
        });
      } finally {
        setIsSyncingSheet(false);
      }
    } else {
      setStatusBanner({
        type: 'info',
        text: 'Spreadsheet linked! Sign in with Google to automatically push current webapp data to this Google Sheet.',
      });
    }
  };

  const handleCopyTsv = () => {
    const tsv = activeRows
      .map(row => row.map(cell => cell.replace(/\t|\r?\n/g, ' ')).join('\t'))
      .join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedTsv(true);
    setTimeout(() => setCopiedTsv(false), 2000);
  };

  const handleDownloadCsv = () => {
    const csv = exportCsvData();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Manufacturer_Communication_Backup_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Google Sheets Cloud Backup Control Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900">
                  Online Backup Spreadsheet & Google Sheets Sync
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="h-3 w-3" />
                  <span>Live Webapp Mirror</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically formats all suppliers, threads, and multi-turn live chat transcripts into a structured online backup spreadsheet and syncs to Google Sheets.
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={handleCopyTsv}
              className="min-h-[38px] justify-center px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy active sheet cells to clipboard to paste directly into Google Sheets or Excel"
            >
              {copiedTsv ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span>{copiedTsv ? 'Copied Cells!' : 'Copy Sheet'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="min-h-[38px] justify-center px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Status Banner */}
        {statusBanner && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              statusBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : statusBanner.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusBanner.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span className="font-medium">{statusBanner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="p-1 rounded hover:bg-black/5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Google Sheets Cloud Integration Panel */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {needsAuth || !accessToken ? (
            <>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Connect Google Sheets Cloud Backup</span>
                  {sheetBackupConfig && (
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      Linked: {sheetBackupConfig.spreadsheetTitle}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Sign in with your Google account to create a new Google Sheet backup or sync live webapp changes to your linked Google Sheet.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 shrink-0 w-full md:w-auto">
                {sheetBackupConfig && (
                  <a
                    href={sheetBackupConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] justify-center px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Open Linked Google Sheet</span>
                  </a>
                )}

                {/* Official Sign in with Google button style */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="gsi-material-button min-h-[40px] justify-center inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-300 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper flex items-center gap-2">
                    <div className="gsi-material-button-icon h-4 w-4 shrink-0">
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        style={{ display: 'block' }}
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        ></path>
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        ></path>
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        ></path>
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        ></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">
                      {isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
                    </span>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                {sheetBackupConfig ? (
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {sheetBackupConfig.spreadsheetTitle}
                      </span>
                      {isSyncingSheet || isAutoSyncingSheet ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Syncing to Google Sheet...</span>
                        </span>
                      ) : isOutOfSync ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Webapp Updated — Needs Sync</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Auto-Sync Active • Up to Date</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        Last Synced:{' '}
                        <strong className="text-slate-700">
                          {sheetBackupConfig.lastSyncedAt
                            ? new Date(sheetBackupConfig.lastSyncedAt).toLocaleString()
                            : 'Not yet synced'}
                        </strong>
                      </span>
                      <span>
                        • {manufacturers.length} Suppliers & {communications.length} Communications
                      </span>
                      {lastSheetSyncError && (
                        <span className="text-rose-600 font-semibold">
                          • Error: {lastSheetSyncError}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Google Sheets Connected</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Create a new online Google Sheet backup or link an existing spreadsheet URL.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {sheetBackupConfig ? (
                  <>
                    <button
                      type="button"
                      onClick={handleConfirmedSyncToGoogleSheet}
                      disabled={isSyncingSheet || isAutoSyncingSheet}
                      className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                        isOutOfSync
                          ? 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-400/40'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      <CloudUpload className={`h-4 w-4 ${isSyncingSheet || isAutoSyncingSheet ? 'animate-bounce' : ''}`} />
                      <span>
                        {isSyncingSheet || isAutoSyncingSheet
                          ? 'Syncing to Google Sheets...'
                          : isOutOfSync
                          ? 'Sync Webapp Updates Now'
                          : 'Sync Backup Now'}
                      </span>
                    </button>

                    <a
                      href={sheetBackupConfig.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Open Google Sheet</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setConfirmUnlinkModalOpen(true)}
                      className="min-h-[40px] px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-xs font-medium text-slate-500 inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title="Unlink current spreadsheet"
                    >
                      <Unlink className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCreateNewGoogleSheet}
                      disabled={isCreatingSheet}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      <span>
                        {isCreatingSheet ? 'Creating Google Sheet...' : 'Create Online Google Sheet Backup'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowLinkInput(!showLinkInput)}
                      className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Link2 className="h-3.5 w-3.5 text-slate-500" />
                      <span>Link Existing Sheet</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Optional Link Existing Spreadsheet Input */}
        {showLinkInput && (
          <form
            onSubmit={handleLinkExistingSpreadsheet}
            className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <input
              type="text"
              value={linkInputUrl}
              onChange={e => setLinkInputUrl(e.target.value)}
              placeholder="Paste Google Sheet URL or Spreadsheet ID (e.g., https://docs.google.com/spreadsheets/d/1abc.../edit)"
              className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Link Sheet
              </button>
              <button
                type="button"
                onClick={() => setShowLinkInput(false)}
                className="px-2.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Interactive Online Spreadsheet Grid Container */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden flex flex-col">
        {/* Formula & Search Bar */}
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="px-2 py-1 rounded bg-white border border-slate-300 font-mono text-[11px] font-bold text-slate-700 min-w-[48px] text-center shadow-2xs">
              {selectedCell ? selectedCell.addr : 'A1'}
            </span>
            <span className="text-xs font-serif italic font-bold text-slate-400 select-none">
              fx
            </span>
            <div className="flex-1 px-2.5 py-1 rounded bg-white border border-slate-300 text-xs text-slate-800 font-mono truncate">
              {selectedCell
                ? selectedCell.val || '(empty cell)'
                : 'Click any cell to inspect full value • Auto-updates live with webapp records'}
            </div>
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={sheetSearch}
              onChange={e => setSheetSearch(e.target.value)}
              placeholder="Filter rows in sheet..."
              className="w-full pl-8 pr-7 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {sheetSearch && (
              <button
                type="button"
                onClick={() => setSheetSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Spreadsheet Table */}
        <div className="overflow-x-auto max-h-[62vh] overflow-y-auto scrollbar-thin">
          <table className="w-full border-collapse text-left font-sans text-xs select-text">
            <thead className="sticky top-0 z-20 bg-slate-200 text-slate-700 select-none">
              <tr>
                <th className="w-10 min-w-[40px] py-1.5 px-2 border-r border-b border-slate-300 bg-slate-200 text-center font-mono text-[10px] text-slate-500 sticky left-0 z-30">
                  #
                </th>
                {Array.from({ length: columnCount }).map((_, colIdx) => (
                  <th
                    key={colIdx}
                    className="py-1.5 px-3 border-r border-b border-slate-300 bg-slate-200 font-mono text-[11px] font-semibold text-center text-slate-600 min-w-[140px]"
                  >
                    {getColLetter(colIdx)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeRows.map((row, rowIdx) => {
                const isSectionHeader =
                  row[0]?.startsWith('CENTRAL INPUT') ||
                  row[0]?.startsWith('A. MANUFACTURER LIST') ||
                  row[0]?.startsWith('B. COMMUNICATION HISTORY');
                const isColumnHeader =
                  row[0] === 'Manufacturer ID' ||
                  row[0] === 'Date' ||
                  row[0] === 'Entry #';

                return (
                  <tr
                    key={rowIdx}
                    className={
                      isSectionHeader
                        ? 'bg-emerald-900 text-white font-bold'
                        : isColumnHeader
                        ? 'bg-slate-800 text-white font-semibold'
                        : rowIdx % 2 === 0
                        ? 'bg-white hover:bg-emerald-50/40'
                        : 'bg-slate-50/60 hover:bg-emerald-50/40'
                    }
                  >
                    {/* Row Number */}
                    <td className="py-1.5 px-2 border-r border-b border-slate-200 bg-slate-100 text-center font-mono text-[10px] text-slate-500 font-semibold sticky left-0 z-10 select-none">
                      {rowIdx + 1}
                    </td>

                    {Array.from({ length: columnCount }).map((_, colIdx) => {
                      const val = row[colIdx] ?? '';
                      const addr = `${getColLetter(colIdx)}${rowIdx + 1}`;
                      const isSelected = selectedCell?.addr === addr;

                      return (
                        <td
                          key={colIdx}
                          onClick={() => setSelectedCell({ addr, val })}
                          className={`py-1.5 px-2.5 border-r border-b border-slate-200 max-w-[260px] truncate cursor-cell transition-colors ${
                            isSelected
                              ? 'ring-2 ring-inset ring-emerald-600 bg-emerald-50/60 text-slate-900 font-medium'
                              : ''
                          }`}
                          title={val}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Worksheet Tabs Bar (like Google Sheets) */}
        <div className="px-3 py-1.5 bg-slate-100 border-t border-slate-300 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveSheet('central')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                activeSheet === 'central'
                  ? 'bg-white text-emerald-700 border-slate-300 border-b-white shadow-2xs'
                  : 'bg-slate-200/70 text-slate-600 border-transparent hover:bg-slate-200'
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              <span>CENTRAL INPUT (Full Backup)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSheet('manufacturers')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                activeSheet === 'manufacturers'
                  ? 'bg-white text-emerald-700 border-slate-300 border-b-white shadow-2xs'
                  : 'bg-slate-200/70 text-slate-600 border-transparent hover:bg-slate-200'
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              <span>Manufacturers ({manufacturers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSheet('communications')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                activeSheet === 'communications'
                  ? 'bg-white text-emerald-700 border-slate-300 border-b-white shadow-2xs'
                  : 'bg-slate-200/70 text-slate-600 border-transparent hover:bg-slate-200'
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              <span>Communications ({communications.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono hidden sm:block shrink-0">
            {activeRows.length} rows × {columnCount} columns
          </div>
        </div>
      </div>

      {/* Mandatory User Confirmation Modal before Mutating/Updating Google Sheets Data */}
      {confirmSyncModalOpen && sheetBackupConfig && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Update Google Sheets Backup?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Please confirm that you want to overwrite the backup tabs in your Google Sheet with the latest data from the webapp:
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Target Spreadsheet:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[200px]">
                  {sheetBackupConfig.spreadsheetTitle}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Worksheets to Update:</span>
                <span className="font-mono text-[11px] text-slate-800">
                  CENTRAL INPUT, Manufacturers, Communications
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Records Affected:</span>
                <span className="font-semibold text-emerald-700">
                  {manufacturers.length} suppliers & {communications.length} comm logs
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmSyncModalOpen(false)}
                className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmedSyncToGoogleSheet}
                className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <CloudUpload className="h-4 w-4" />
                <span>Confirm & Update Spreadsheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Unlinking Spreadsheet */}
      {confirmUnlinkModalOpen && sheetBackupConfig && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Unlink className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Unlink Backup Spreadsheet?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  This will disconnect <strong>{sheetBackupConfig.spreadsheetTitle}</strong> from this tracker. The file itself will remain untouched in your Google Drive.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmUnlinkModalOpen(false)}
                className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  saveSheetBackupConfig(null);
                  setConfirmUnlinkModalOpen(false);
                  setStatusBanner({
                    type: 'info',
                    text: 'Unlinked Google Sheet backup.',
                  });
                }}
                className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Confirm Unlink
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
