import { CommunicationEntry, Manufacturer } from '../types';

export interface SheetBackupConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  lastSyncedAt: string;
  lastSyncedManufacturerCount: number;
  lastSyncedCommCount: number;
  lastSyncedHash: string;
}

/**
 * Extracts the numeric entry index from an entryKey like "M001|3" -> 3
 */
export function parseEntryKeyIndex(entryKey?: string): number {
  if (!entryKey) return NaN;
  const parts = entryKey.split('|');
  if (parts.length < 2) return NaN;
  const num = parseInt(parts[parts.length - 1], 10);
  return isNaN(num) ? NaN : num;
}

/**
 * Extracts numeric timestamp/sequence from an ID like "comm-1793875763896" or "comm-import-1793875763896-4"
 */
function parseCommIdNumbers(id?: string): { ts: number; seq: number } {
  if (!id) return { ts: NaN, seq: NaN };
  const matches = id.match(/\d+/g);
  if (!matches || matches.length === 0) return { ts: NaN, seq: NaN };
  const ts = parseInt(matches[0], 10);
  const seq = matches.length > 1 ? parseInt(matches[1], 10) : 0;
  return { ts, seq };
}

/**
 * Sorts communication entries strictly in the chronological order that the data was entered
 * (1st entered -> 2nd entered -> 3rd entered).
 */
export function compareCommByEntryOrder(a: CommunicationEntry, b: CommunicationEntry): number {
  // 1. Compare explicit creation timestamp (createdAt) if both exist and differ
  const timeA = a.createdAt ? Date.parse(a.createdAt) : NaN;
  const timeB = b.createdAt ? Date.parse(b.createdAt) : NaN;
  if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
    return timeA - timeB;
  }

  // 2. Compare numeric timestamp & sequence embedded in the ID (e.g., comm-1793875763896)
  const idA = parseCommIdNumbers(a.id);
  const idB = parseCommIdNumbers(b.id);
  if (!isNaN(idA.ts) && !isNaN(idB.ts)) {
    if (idA.ts !== idB.ts) return idA.ts - idB.ts;
    if (idA.seq !== idB.seq) return idA.seq - idB.seq;
  }

  // 3. Compare entryKey sequence number (e.g., M001|1 vs M001|2)
  const keyIdxA = parseEntryKeyIndex(a.entryKey);
  const keyIdxB = parseEntryKeyIndex(b.entryKey);
  if (!isNaN(keyIdxA) && !isNaN(keyIdxB) && keyIdxA !== keyIdxB) {
    return keyIdxA - keyIdxB;
  }

  // 4. Fallback to date string comparison
  if (a.date !== b.date) {
    return a.date < b.date ? -1 : 1;
  }

  return (a.id || '').localeCompare(b.id || '');
}

/**
 * Sorts manufacturers by ID (M001, M002, M003...)
 */
export function compareManufacturerById(a: Manufacturer, b: Manufacturer): number {
  const numA = parseInt((a.id || '').replace(/\D+/g, ''), 10);
  const numB = parseInt((b.id || '').replace(/\D+/g, ''), 10);
  if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
    return numA - numB;
  }
  return (a.id || '').localeCompare(b.id || '');
}

/**
 * Formats multi-turn live chat, legacy outbound/inbound summaries, or full email text for a spreadsheet cell
 */
export function formatChatTranscriptCell(comm: CommunicationEntry): string {
  if (comm.chatTurns && comm.chatTurns.length > 0) {
    return comm.chatTurns
      .map(
        (t, i) =>
          `[${i + 1}. ${t.sender === 'us' ? 'OUR TEAM' : 'SUPPLIER'}${
            t.timestamp ? ` (${t.timestamp})` : ''
          }]: ${t.message}`
      )
      .join(' | ');
  }
  if (comm.outboundSummary || comm.inboundResponse) {
    const parts: string[] = [];
    if (comm.outboundSummary) parts.push(`[SENT]: ${comm.outboundSummary}`);
    if (comm.inboundResponse) parts.push(`[REPLY]: ${comm.inboundResponse}`);
    return parts.join(' | ');
  }
  if (comm.fullEmailText) {
    return comm.fullEmailText.replace(/\r?\n/g, ' ').trim();
  }
  return '';
}

/**
 * Combines documentsReceived and uploaded attachments into a single semicolon-separated string
 */
export function formatDocumentsCell(comm: CommunicationEntry): string {
  const docSet = new Set<string>();
  (comm.documentsReceived || []).forEach(d => {
    if (d && d.trim()) docSet.add(d.trim());
  });
  (comm.attachments || []).forEach(att => {
    if (att && att.name && att.name.trim()) docSet.add(att.name.trim());
  });
  return Array.from(docSet).join('; ');
}

/**
 * Computes a deterministic hash over ALL fields of manufacturers and communications
 * so any added or edited detail immediately triggers a sheet sync.
 */
export function computeSpreadsheetDataHash(
  manufacturers: Manufacturer[],
  communications: CommunicationEntry[]
): string {
  const sortedM = [...manufacturers].sort(compareManufacturerById);
  const sortedC = [...communications].sort(compareCommByEntryOrder);

  const payload = JSON.stringify({
    m: sortedM.map(m => [
      m.id,
      m.name,
      m.website,
      m.contactPortal,
      m.productsOfInterest,
      m.notes,
      m.status,
      m.updatedAt,
    ]),
    c: sortedC.map(c => [
      c.id,
      c.date,
      c.manufacturerId,
      c.manufacturerName,
      c.threadSelection,
      c.threadId,
      c.channel,
      c.subject,
      c.keyOutcome,
      c.status,
      c.nextAction,
      c.followUpDate,
      c.threadDoc,
      formatDocumentsCell(c),
      c.informationReceived,
      formatChatTranscriptCell(c),
      c.createdBy,
      c.entryKey,
      c.createdAt,
    ]),
  });

  // 32-bit FNV-1a hash
  let h1 = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h1 ^= payload.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  const hex = (h1 >>> 0).toString(16).padStart(8, '0');
  return `v2-${sortedM.length}-${sortedC.length}-${payload.length}-${hex}`;
}

/**
 * Builds the 2D row arrays for CENTRAL INPUT, Manufacturers, and Communications tabs
 */
export function buildSpreadsheetTabs(
  manufacturers: Manufacturer[],
  communications: CommunicationEntry[]
): {
  centralRows: string[][];
  manufacturerRows: string[][];
  communicationRows: string[][];
} {
  const sortedManufacturers = [...manufacturers].sort(compareManufacturerById);
  const sortedCommunications = [...communications].sort(compareCommByEntryOrder);

  const COL_WIDTH = 16;
  const padRow = (cells: string[]): string[] => {
    const copy = [...cells];
    while (copy.length < COL_WIDTH) copy.push('');
    return copy;
  };

  const centralRows: string[][] = [];
  centralRows.push(
    padRow([
      'CENTRAL INPUT • Live Online Backup Spreadsheet',
      `Last Updated: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`,
      `Suppliers: ${sortedManufacturers.length}`,
      `Communications: ${sortedCommunications.length}`,
    ])
  );
  centralRows.push(padRow(['A. MANUFACTURER LIST (one row per manufacturer)']));
  centralRows.push(
    padRow([
      'Manufacturer ID',
      'Manufacturer',
      'Website',
      'Contact Email / Chat Portal',
      'Product(s) of Interest',
      'Notes',
      'Record Status',
    ])
  );

  sortedManufacturers.forEach(m => {
    centralRows.push(
      padRow([
        m.id,
        m.name,
        m.website || '',
        m.contactPortal || '',
        m.productsOfInterest || '',
        m.notes || '',
        m.status,
      ])
    );
  });

  centralRows.push(new Array(COL_WIDTH).fill(''));
  centralRows.push(padRow(['B. COMMUNICATION HISTORY (one row per email / call / chat)']));
  centralRows.push([
    'Date',
    'Manufacturer',
    'Thread Selection',
    'Thread ID (auto)',
    'Channel / Direction',
    'Subject / Purpose',
    'Key Outcome / Latest Update',
    'Current Status',
    'Next Action',
    'Follow-up Date',
    'Chat / Thread Doc',
    'Documents Received',
    'Technical Info Received',
    'Live Chat / Message Transcript',
    'Manufacturer ID (auto)',
    'Entry key (helper)',
  ]);

  sortedCommunications.forEach(c => {
    centralRows.push([
      c.date || '',
      c.manufacturerName || '',
      c.threadSelection || '',
      c.threadId || '',
      c.channel || '',
      c.subject || '',
      c.keyOutcome || '',
      c.status || '',
      c.nextAction || '',
      c.followUpDate || '',
      c.threadDoc || '',
      formatDocumentsCell(c),
      c.informationReceived || '',
      formatChatTranscriptCell(c),
      c.manufacturerId || '',
      c.entryKey || '',
    ]);
  });

  const manufacturerRows: string[][] = [
    [
      'Manufacturer ID',
      'Manufacturer Name',
      'Website',
      'Contact Email / Chat Portal',
      'Product(s) of Interest',
      'Engineering & Sourcing Notes',
      'Status',
      'Last Updated',
    ],
  ];
  sortedManufacturers.forEach(m => {
    manufacturerRows.push([
      m.id,
      m.name,
      m.website || '',
      m.contactPortal || '',
      m.productsOfInterest || '',
      m.notes || '',
      m.status,
      m.updatedAt ? m.updatedAt.replace('T', ' ').substring(0, 16) : '',
    ]);
  });

  const communicationRows: string[][] = [
    [
      'Entry #',
      'Date',
      'Manufacturer ID',
      'Manufacturer',
      'Thread ID',
      'Channel / Direction',
      'Subject / Purpose',
      'Key Outcome / Summary',
      'Current Status',
      'Next Action',
      'Follow-up Date',
      'Technical Information Received',
      'Live Chat / Message Transcript',
      'Documents & Attachments',
      'Logged By',
      'Entry Key',
    ],
  ];
  sortedCommunications.forEach((c, idx) => {
    communicationRows.push([
      String(idx + 1),
      c.date || '',
      c.manufacturerId || '',
      c.manufacturerName || '',
      c.threadId || '',
      c.channel || '',
      c.subject || '',
      c.keyOutcome || '',
      c.status || '',
      c.nextAction || '',
      c.followUpDate || '',
      c.informationReceived || '',
      formatChatTranscriptCell(c),
      formatDocumentsCell(c),
      c.createdBy || '',
      c.entryKey || '',
    ]);
  });

  return { centralRows, manufacturerRows, communicationRows };
}

/**
 * Writes all 3 backup worksheet tabs to a Google Spreadsheet via the Google Sheets REST API v4.
 */
export async function writeBackupToGoogleSpreadsheet(
  spreadsheetId: string,
  token: string,
  manufacturers: Manufacturer[],
  communications: CommunicationEntry[],
  existingTitle?: string
): Promise<SheetBackupConfig> {
  // 1. Fetch spreadsheet metadata first
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!metaRes.ok) {
    const errBody = await metaRes.json().catch(() => ({}));
    const status = metaRes.status;
    const error = new Error(
      errBody?.error?.message || `Failed to read spreadsheet (${status})`
    ) as Error & { status?: number };
    error.status = status;
    throw error;
  }

  const metaData = await metaRes.json();
  const spreadsheetTitle =
    metaData.properties?.title || existingTitle || 'Manufacturer Comms Backup';
  const spreadsheetUrl =
    metaData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const existingSheets: { title: string; sheetId: number }[] = (metaData.sheets || []).map(
    (s: any) => ({
      title: s.properties?.title || '',
      sheetId: s.properties?.sheetId ?? 0,
    })
  );

  const desiredTabs = ['CENTRAL INPUT', 'Manufacturers', 'Communications'];
  const requests: any[] = [];

  const hasCentral = existingSheets.some(s => s.title === 'CENTRAL INPUT');
  if (!hasCentral && existingSheets.length > 0 && existingSheets[0].title === 'Sheet1') {
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: existingSheets[0].sheetId,
          title: 'CENTRAL INPUT',
          gridProperties: { frozenRowCount: 3 },
        },
        fields: 'title,gridProperties.frozenRowCount',
      },
    });
    existingSheets[0].title = 'CENTRAL INPUT';
  }

  desiredTabs.forEach(tabName => {
    if (!existingSheets.some(s => s.title === tabName)) {
      requests.push({
        addSheet: {
          properties: {
            title: tabName,
            gridProperties: {
              frozenRowCount: tabName === 'CENTRAL INPUT' ? 3 : 1,
            },
          },
        },
      });
    }
  });

  if (requests.length > 0) {
    const batchRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );
    if (!batchRes.ok) {
      const errData = await batchRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Failed to prepare worksheet tabs');
    }
  }

  // 2. Clear existing values in the 3 tabs
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: [
          "'CENTRAL INPUT'!A1:Z2000",
          "'Manufacturers'!A1:Z1000",
          "'Communications'!A1:Z2000",
        ],
      }),
    }
  );

  // 3. Build fresh rows & write all 3 tabs
  const { centralRows, manufacturerRows, communicationRows } = buildSpreadsheetTabs(
    manufacturers,
    communications
  );

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: "'CENTRAL INPUT'!A1",
            values: centralRows,
          },
          {
            range: "'Manufacturers'!A1",
            values: manufacturerRows,
          },
          {
            range: "'Communications'!A1",
            values: communicationRows,
          },
        ],
      }),
    }
  );

  if (!updateRes.ok) {
    const errData = await updateRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to write backup data to Google Sheets');
  }

  const hash = computeSpreadsheetDataHash(manufacturers, communications);

  return {
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetTitle,
    lastSyncedAt: new Date().toISOString(),
    lastSyncedManufacturerCount: manufacturers.length,
    lastSyncedCommCount: communications.length,
    lastSyncedHash: hash,
  };
}
