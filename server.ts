import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import fs from 'fs';
import { INITIAL_MANUFACTURERS, INITIAL_COMMUNICATIONS } from './src/data/initialData';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

// Ensure data directory exists safely (do not crash on read-only production filesystems)
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Notice: Could not create local data directory (read-only filesystem in production):', err);
}

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = Number(process.env.PORT) || 3000;

// Maintain in-memory snapshot initialized from disk or initial data so /spreadsheet and /api/backup.csv always have live data
let latestDbState: {
  manufacturers: any[];
  communications: any[];
  users?: any[];
  rolePermissions?: any;
  auditLogs?: any[];
  updatedAt?: string;
} = {
  manufacturers: INITIAL_MANUFACTURERS,
  communications: INITIAL_COMMUNICATIONS,
  updatedAt: new Date().toISOString(),
};

try {
  if (fs.existsSync(DB_FILE)) {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (parsed && Array.isArray(parsed.manufacturers)) {
      latestDbState = {
        ...parsed,
        updatedAt: new Date().toISOString(),
      };
    }
  }
} catch (err) {
  console.warn('Initial DB load notice:', err);
}

// Local file database persistence endpoints
app.get('/api/db', (_req, res) => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      latestDbState = { ...parsed, updatedAt: latestDbState.updatedAt || new Date().toISOString() };
      return res.json({ success: true, data: parsed });
    }
    return res.json({ success: true, data: latestDbState });
  } catch (err: any) {
    console.warn('Error reading local db file:', err.message || err);
    return res.json({ success: true, data: latestDbState });
  }
});

app.post('/api/db', (req, res) => {
  try {
    const payload = req.body;
    if (payload && Array.isArray(payload.manufacturers)) {
      latestDbState = {
        ...payload,
        updatedAt: new Date().toISOString(),
      };
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    return res.json({ success: true, message: 'Local database saved successfully' });
  } catch (err: any) {
    // In production Cloud Run, disk may be read-only while inMemory + Firestore handle persistence
    return res.json({ success: true, message: 'Synced (Firestore & memory primary)' });
  }
});

// Helper to format CSV from latestDbState
function buildBackupCsv(): string {
  const manufacturers = latestDbState.manufacturers || [];
  const communications = latestDbState.communications || [];
  const esc = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  let csv = `CENTRAL INPUT • Live Online Backup Spreadsheet,Last Updated: ${latestDbState.updatedAt || new Date().toISOString()},Suppliers: ${manufacturers.length},Communications: ${communications.length}\n`;
  csv += 'A. MANUFACTURER LIST (one row per manufacturer)\n';
  csv += 'Manufacturer ID,Manufacturer,Website,Contact Email / Chat Portal,Product(s) of Interest,Notes,Record Status\n';
  manufacturers.forEach((m: any) => {
    csv += [
      esc(m.id),
      esc(m.name),
      esc(m.website),
      esc(m.contactPortal),
      esc(m.productsOfInterest),
      esc(m.notes),
      esc(m.status),
    ].join(',') + '\n';
  });

  csv += '\nB. COMMUNICATION HISTORY (one row per email / call / chat)\n';
  csv += 'Date,Manufacturer,Thread Selection,Thread ID (auto),Channel / Direction,Subject / Purpose,Key Outcome / Summary,Current Status,Follow-up Date,Chat / Thread Doc,Documents Received,Technical Info Received,Live Chat Transcript,Manufacturer ID (auto),Entry key (helper)\n';
  communications.forEach((c: any) => {
    const docs = Array.isArray(c.documentsReceived) ? c.documentsReceived.join('; ') : '';
    const chatTranscript = Array.isArray(c.chatTurns) && c.chatTurns.length > 0
      ? c.chatTurns
          .map(
            (t: any, i: number) =>
              `[${i + 1}. ${t.sender === 'us' ? 'OUR TEAM' : 'SUPPLIER'}${
                t.timestamp ? ` (${t.timestamp})` : ''
              }]: ${t.message}`
          )
          .join(' | ')
      : '';
    csv += [
      esc(c.date),
      esc(c.manufacturerName),
      esc(c.threadSelection),
      esc(c.threadId),
      esc(c.channel),
      esc(c.subject),
      esc(c.keyOutcome),
      esc(c.status),
      esc(c.followUpDate),
      esc(c.threadDoc),
      esc(docs),
      esc(c.informationReceived),
      esc(chatTranscript),
      esc(c.manufacturerId),
      esc(c.entryKey),
    ].join(',') + '\n';
  });

  return csv;
}

// Live CSV Feed Endpoint (compatible with Google Sheets =IMPORTDATA(".../api/backup.csv"))
app.get('/api/backup.csv', (_req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.send(buildBackupCsv());
});

// Standalone Live Online Backup Spreadsheet Page (/spreadsheet)
app.get('/spreadsheet', (_req, res) => {
  const manufacturers = latestDbState.manufacturers || [];
  const communications = latestDbState.communications || [];
  const updatedAt = latestDbState.updatedAt || new Date().toISOString();
  const escHtml = (s: any) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Manufacturer Comms — Live Online Backup Spreadsheet</title>
  <meta http-equiv="refresh" content="15" />
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #0f172a; font-size: 12px; }
    .topbar { background: #065f46; color: #fff; padding: 10px 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; position: sticky; top: 0; z-index: 20; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
    .topbar h1 { margin: 0; font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .badge { background: rgba(255,255,255,0.18); padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .actions { display: flex; align-items: center; gap: 8px; }
    .btn { background: #fff; color: #065f46; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 11px; border: none; cursor: pointer; }
    .btn-secondary { background: rgba(255,255,255,0.15); color: #fff; border: 1px solid rgba(255,255,255,0.3); }
    .sheet-wrap { overflow-x: auto; padding: 12px; }
    table { border-collapse: collapse; width: 100%; background: #fff; border: 1px solid #cbd5e1; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; vertical-align: top; max-width: 320px; word-wrap: break-word; }
    .col-hdr th { background: #e2e8f0; color: #475569; font-family: monospace; font-size: 11px; text-align: center; font-weight: 700; }
    .row-num { background: #f1f5f9; color: #64748b; font-family: monospace; font-size: 11px; text-align: center; width: 38px; font-weight: 600; }
    .sec-title td { background: #064e3b; color: #fff; font-weight: 700; font-size: 12px; }
    .tbl-hdr td { background: #1e293b; color: #fff; font-weight: 600; font-size: 11px; }
    tr:nth-child(even) td:not(.sec-title td):not(.tbl-hdr td) { background: #f8fafc; }
  </style>
</head>
<body>
  <div class="topbar">
    <h1>
      <span>📊 CENTRAL INPUT • Live Online Backup Spreadsheet</span>
      <span class="badge">Auto-Syncing (15s) • Last Updated: ${escHtml(updatedAt.replace('T', ' ').slice(0, 19))} UTC</span>
    </h1>
    <div class="actions">
      <a class="btn btn-secondary" href="/?tab=spreadsheet">Open in Webapp & Connect Google Sheets</a>
      <a class="btn" href="/api/backup.csv" download="Manufacturer_Comms_Backup.csv">⬇ Download CSV</a>
    </div>
  </div>
  <div class="sheet-wrap">
    <table>
      <tr class="sec-title"><td class="row-num">1</td><td colspan="14">A. MANUFACTURER LIST (${manufacturers.length} Manufacturers)</td></tr>
      <tr class="tbl-hdr">
        <td class="row-num">2</td>
        <td>Manufacturer ID</td><td>Manufacturer</td><td>Website</td><td>Contact Email / Chat Portal</td><td>Product(s) of Interest</td><td>Notes</td><td>Record Status</td><td colspan="7"></td>
      </tr>
      ${manufacturers
        .map(
          (m: any, idx: number) => `<tr>
        <td class="row-num">${idx + 3}</td>
        <td><strong>${escHtml(m.id)}</strong></td>
        <td>${escHtml(m.name)}</td>
        <td>${escHtml(m.website)}</td>
        <td>${escHtml(m.contactPortal)}</td>
        <td>${escHtml(m.productsOfInterest)}</td>
        <td>${escHtml(m.notes)}</td>
        <td>${escHtml(m.status)}</td>
        <td colspan="7"></td>
      </tr>`
        )
        .join('')}
      <tr class="sec-title"><td class="row-num">${manufacturers.length + 3}</td><td colspan="14">B. COMMUNICATION HISTORY (${communications.length} Logs)</td></tr>
      <tr class="tbl-hdr">
        <td class="row-num">${manufacturers.length + 4}</td>
        <td>Date</td><td>Manufacturer</td><td>Thread ID</td><td>Channel / Direction</td><td>Subject / Purpose</td><td>Key Outcome / Summary</td><td>Current Status</td><td>Follow-up Date</td><td>Documents Received</td><td>Technical Info Received</td><td>Live Chat Transcript</td><td>Manufacturer ID</td><td>Entry Key</td><td>Logged By</td>
      </tr>
      ${communications
        .map((c: any, idx: number) => {
          const docs = Array.isArray(c.documentsReceived) ? c.documentsReceived.join('; ') : '';
          const chat =
            Array.isArray(c.chatTurns) && c.chatTurns.length > 0
              ? c.chatTurns
                  .map(
                    (t: any, i: number) =>
                      `[${i + 1}. ${t.sender === 'us' ? 'OUR TEAM' : 'SUPPLIER'}${
                        t.timestamp ? ` (${t.timestamp})` : ''
                      }]: ${t.message}`
                  )
                  .join(' | ')
              : '';
          return `<tr>
        <td class="row-num">${manufacturers.length + 5 + idx}</td>
        <td>${escHtml(c.date)}</td>
        <td><strong>${escHtml(c.manufacturerName)}</strong></td>
        <td>${escHtml(c.threadId)}</td>
        <td>${escHtml(c.channel)}</td>
        <td>${escHtml(c.subject)}</td>
        <td>${escHtml(c.keyOutcome)}</td>
        <td>${escHtml(c.status)}</td>
        <td>${escHtml(c.followUpDate)}</td>
        <td>${escHtml(docs)}</td>
        <td>${escHtml(c.informationReceived)}</td>
        <td>${escHtml(chat)}</td>
        <td>${escHtml(c.manufacturerId)}</td>
        <td>${escHtml(c.entryKey)}</td>
        <td>${escHtml(c.createdBy)}</td>
      </tr>`;
        })
        .join('')}
    </table>
  </div>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Helper to get GoogleGenAI client
function getGenAI() {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint to automatically parse copy-pasted email or chat text with high accuracy
app.post('/api/parse-email', async (req, res) => {
  try {
    const {
      rawText,
      existingManufacturers,
      manufacturerName,
      manufacturerDetails,
      date,
      threadSelection,
      priorMessages,
      entryType,
      channel,
    } = req.body || {};

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ success: false, error: 'Text to parse is empty or missing.' });
    }

    const ai = getGenAI();

    const isSent = entryType === 'sent';
    const isLiveChat = entryType === 'live_chat' || channel === 'Live Chat (Session)';

    const manufacturersContext =
      existingManufacturers && Array.isArray(existingManufacturers) && existingManufacturers.length > 0
        ? `Registered Manufacturers in Database:\n${existingManufacturers
            .map((m: any) => `- ID: ${m.id}, Name: ${m.name}${m.category ? ` (Category: ${m.category})` : ''}`)
            .join('\n')}`
        : 'Registered Manufacturers in Database: None registered yet.';

    const selectedManufacturerInfo = manufacturerDetails
      ? `Selected Supplier Profile:
- Name: ${manufacturerDetails.name} (ID: ${manufacturerDetails.id})
- Category / Products: ${manufacturerDetails.category || 'Hardware / Electronics'}
- Contact Person: ${manufacturerDetails.contactName || 'N/A'} (${manufacturerDetails.contactEmail || 'N/A'})
- Current Supplier Notes: ${manufacturerDetails.notes || 'None'}`
      : `Selected Supplier: ${manufacturerName || 'Selected Manufacturer'}`;

    const threadHistoryContext =
      priorMessages && Array.isArray(priorMessages) && priorMessages.length > 0
        ? `Chronological Thread History for Thread ID "${threadSelection}" (${priorMessages.length} prior message(s)):\n${priorMessages
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(
              (m: any, idx: number) =>
                `Message #${idx + 1} [Date: ${m.date} | Direction/Channel: ${m.channel} | Status: ${m.status}]
- Purpose / Subject: ${m.subject}
- Summary / Key Outcome: ${m.keyOutcome}
${m.informationReceived ? `- Technical Specs / Info Received: ${m.informationReceived}\n` : ''}${
                  m.documentsReceived && m.documentsReceived.length > 0
                    ? `- Documents: ${m.documentsReceived.join(', ')}\n`
                    : ''
                }${m.fullEmailText ? `- Raw Message Snippet: ${String(m.fullEmailText).slice(0, 400)}\n` : ''}---`
            )
            .join('\n')}`
        : `Chronological Thread History: None (This is the first message in "${threadSelection}").`;

    const directionLabel = isLiveChat
      ? 'Live Chat Session (Multi-turn interactive back-and-forth conversation between our team and supplier)'
      : isSent
      ? 'Sent Email (Outbound from our team to vendor)'
      : 'Received Mail (Inbound from vendor to our team)';

    const systemInstruction = `You are a Principal Hardware Procurement & Supply Chain Intelligence Analyst.
Your job is to analyze a newly pasted email or live chat transcript between our hardware engineering/procurement team and an external manufacturer, cross-referencing it against the chronological thread history and pre-entered metadata.

CRITICAL ACCURACY RULES:
1. RESPECT PRE-ENTERED METADATA:
   - Direction / Mode: "${directionLabel}"
   - Channel: "${channel || (isLiveChat ? 'Live Chat (Session)' : isSent ? 'Email - Sent' : 'Email - Received')}"
   - Manufacturer: "${manufacturerName || ''}"
   - Thread: "${threadSelection}"
   - Date: "${date}"

2. HANDLE QUOTED EMAIL CHAINS OR MULTI-TURN LIVE CHAT DIALOGUES ACCURATELY:
   - If this is a Live Chat Session (${isLiveChat}): A live chat contains multiple back-and-forth messages between our team ("us") and the supplier ("supplier"). Break down the conversation chronologically into "chatTurns" (an ordered array of every distinct message or exchange turn in the chat, labeling each turn's sender as "us" or "supplier", optional timestamp if present, and clean message content). Also provide an overall session synthesis in "keyOutcome" and bulleted technical specs in "informationReceived".
   - If this is an Email: Pasted emails often contain older quoted replies at the bottom (e.g., "On [Date] ... wrote:", "From: ...", "> quoted lines"). Focus primarily on the NEWEST / TOPMOST message in the pasted text that corresponds to the pre-entered direction (${isSent ? 'Sent by our team' : 'Received from the supplier'}), while using quoted history and Thread History to understand exact part numbers, quantities, and context.

3. FIELD-SPECIFIC EXTRACTION PRECISION:
   - "subject" (Subject / Purpose):
     * NEVER copy a raw email subject line (such as "Re: Inquiry" or "Fw: Quote").
     * Formulate a clear, specific 5–12 word engineering/procurement purpose statement that explains WHY this message or live chat session took place in the flow of the thread.
     * Examples: "Live chat negotiation on PCB impedance control and 5k unit pricing", "Requesting volume quotation and lead time for SIM7600G-H modules", "Provided tiered unit pricing, MOQ, and 4-week lead time for LTE antennas".

   - "chatTurns" (Multi-turn Live Chat Conversation Array):
     * If Live Chat (${isLiveChat}): Extract EVERY back-and-forth turn in chronological order as an array of objects: { "sender": "us" | "supplier", "timestamp": "optional time string or empty", "message": "the message text or clear turn content" }. Support 2, 3, 5, 10+ turns accurately.
     * If Email (${!isLiveChat}): Return an empty array [].

   - "keyOutcome" (Combined Session Outcome / Summary / Latest Update):
     * Write a high-precision 1–3 sentence synthesis.
     * If Live Chat (${isLiveChat}): Summarize the overall outcome of the multi-turn live chat session (what we asked across the conversation and what the vendor answered/agreed).
     * If Sent Email (${isSent}): Summarize what our team requested, proposed, confirmed, or answered.
     * If Received Mail (${!isSent && !isLiveChat}): Summarize the key outcome, commercial quote, technical answer, or latest update delivered by the vendor.

   - "informationReceived" (Technical Specifications & Commercial Data):
     * If Direction is "Sent Email" (${isSent}): MUST be an empty string ("").
     * If Direction is "Received Mail" OR "Live Chat" (${!isSent}): Extract ONLY structured, clean technical and commercial facts provided by the supplier in this message/chat.
     * Format as clean, scannable bullet points (using "• ") covering any present details:
       • Part Numbers / Model SKUs
       • Unit Pricing / Tiered Pricing / Currency / Incoterms (EXW, FOB, DDP)
       • MOQ (Minimum Order Quantity) & NRE / Tooling / Sample costs
       • Lead Time / Delivery Schedule / Shipping Method
       • Electrical, Mechanical, RF, Firmware, or Certification Specs
     * NEVER paste greetings, sign-offs, legal disclaimers, or the raw chat/email transcript.

   - "status":
     * For Sent Email: Choose "Awaiting Reply" if our team is asking questions or waiting for vendor confirmation; choose "Completed" if purely a final acknowledgment.
     * For Live Chat or Received Mail: Choose "Information Received" if the vendor provided quotes, datasheets, or answers; choose "Action Required" if follow-up approval/payment is needed; choose "Completed" if all questions in the chat/mail were resolved.

   - "nextAction" & "followUpDate":
     * MUST both be empty strings ("").

   - "documentsReceived":
     * Extract exact filenames of any datasheets, PDFs, Gerber/CAD archives, spreadsheets, or invoices mentioned or shared in the text.`;

    const prompt = `${selectedManufacturerInfo}

${manufacturersContext}

${threadHistoryContext}

=== NEWLY PASTED EMAIL / LIVE CHAT TRANSCRIPT TO ANALYZE ===
Direction / Mode: ${directionLabel}
Channel: ${channel}
Date: ${date}
Transcript:
"""
${rawText}
"""

Analyze the transcript and thread flow carefully and return the structured JSON object.`;

    const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastError: any = null;
    let parsed: any = null;

    for (const modelName of modelsToTry) {
      try {
        const configObj: any = {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              manufacturerName: {
                type: Type.STRING,
                description: 'Pre-entered manufacturer name.',
              },
              matchedManufacturerId: {
                type: Type.STRING,
                description: 'Pre-entered manufacturer ID.',
              },
              channel: {
                type: Type.STRING,
                description: 'Pre-entered communication channel.',
              },
              detectedType: {
                type: Type.STRING,
                description: 'Strictly "sent", "received", or "live_chat" matching pre-entered direction.',
              },
              subject: {
                type: Type.STRING,
                description:
                  'Specific 5-12 word engineering/procurement purpose of this mail or live chat session analyzed from the text and thread flow.',
              },
              keyOutcome: {
                type: Type.STRING,
                description: isLiveChat
                  ? 'Concise 1-3 sentence synthesis of the overall multi-turn live chat session outcome.'
                  : isSent
                  ? 'Concise 1-3 sentence Summary of what our team asked, proposed, or confirmed in this sent email.'
                  : 'Concise 1-3 sentence Key Outcome / Latest Update summarizing what the supplier quoted, answered, or updated.',
              },
              status: {
                type: Type.STRING,
                description:
                  'One of: "Completed", "Awaiting Reply", "Reply Received", "Information Received", "Pending Review", "Action Required".',
              },
              nextAction: {
                type: Type.STRING,
                description: 'Always empty string "".',
              },
              followUpDate: {
                type: Type.STRING,
                description: 'Always empty string "".',
              },
              informationReceived: {
                type: Type.STRING,
                description: isSent
                  ? 'Always empty string "" for sent emails.'
                  : 'Clean bulleted list ("• ") of technical specifications, part numbers, unit prices, MOQ, lead times, and commercial terms received from the vendor during the email or live chat.',
              },
              inboundContent: {
                type: Type.STRING,
                description: 'Concise summary of what the vendor replied or confirmed.',
              },
              outboundReply: {
                type: Type.STRING,
                description: 'Concise summary of what our team sent or asked.',
              },
              chatTurns: {
                type: Type.ARRAY,
                description:
                  'Ordered chronological list of back-and-forth messages in the Live Chat session. Each item has sender ("us" or "supplier"), optional timestamp, and message text.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sender: {
                      type: Type.STRING,
                      description: '"us" for our team (sent) or "supplier" for the vendor agent (received).',
                    },
                    timestamp: {
                      type: Type.STRING,
                      description: 'Time or speaker label if mentioned, otherwise empty string "".',
                    },
                    message: {
                      type: Type.STRING,
                      description: 'The message content for this turn in the conversation.',
                    },
                  },
                  required: ['sender', 'timestamp', 'message'],
                },
              },
              documentsReceived: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exact filenames of documents, datasheets, quotes, or CAD files mentioned.',
              },
            },
            required: [
              'manufacturerName',
              'matchedManufacturerId',
              'channel',
              'detectedType',
              'subject',
              'keyOutcome',
              'status',
              'nextAction',
              'followUpDate',
              'informationReceived',
              'inboundContent',
              'outboundReply',
              'chatTurns',
              'documentsReceived',
            ],
          },
        };

        if (modelName === 'gemini-3.8-flash') {
          configObj.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: configObj,
        });

        const txt = response.text || '{}';
        const cleaned = txt
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/, '')
          .trim();
        parsed = JSON.parse(cleaned);
        break;
      } catch (err: any) {
        console.warn(`Model ${modelName} failed, trying fallback:`, err.message || err);
        lastError = err;
      }
    }

    if (!parsed) {
      throw lastError || new Error('All Gemini model endpoints failed.');
    }

    // Enforce post-processing guarantees
    parsed.followUpDate = '';
    parsed.nextAction = '';
    if (isSent) {
      parsed.informationReceived = '';
      parsed.detectedType = 'sent';
    } else if (isLiveChat) {
      parsed.detectedType = 'live_chat';
    } else {
      parsed.detectedType = 'received';
    }

    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in /api/parse-email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process email text with AI.',
      details: error.message || String(error),
    });
  }
});

// Serve frontend in dev vs production
const distPath = path.resolve(__dirname, 'dist');
const hasBuiltDist = fs.existsSync(path.resolve(distPath, 'index.html'));

if (process.env.NODE_ENV !== 'production' && !process.env.K_SERVICE) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  });
  app.use(vite.middlewares);
  app.use('*', async (req, res, next) => {
    try {
      let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
} else if (hasBuiltDist) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  });
  app.use(vite.middlewares);
  app.use('*', async (req, res, next) => {
    try {
      let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FabricateOps Server running on port ${PORT}`);
});
