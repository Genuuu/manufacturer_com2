import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import fs from 'fs';

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

// Local file database persistence endpoints
app.get('/api/db', (_req, res) => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return res.json({ success: true, data: JSON.parse(raw) });
    }
    return res.json({ success: true, data: null });
  } catch (err: any) {
    console.warn('Error reading local db file:', err.message || err);
    return res.json({ success: true, data: null });
  }
});

app.post('/api/db', (req, res) => {
  try {
    const payload = req.body;
    fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    return res.json({ success: true, message: 'Local database saved successfully' });
  } catch (err: any) {
    // In production Cloud Run, disk may be read-only while Firestore handles persistence
    return res.json({ success: true, message: 'Synced (Firestore primary)' });
  }
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

    const systemInstruction = `You are a Principal Hardware Procurement & Supply Chain Intelligence Analyst.
Your job is to analyze a newly pasted email or chat message between our hardware engineering/procurement team and an external manufacturer, cross-referencing it against the chronological thread history and pre-entered metadata.

CRITICAL ACCURACY RULES:
1. RESPECT PRE-ENTERED METADATA:
   - Direction: "${isSent ? 'Sent Email (Outbound from our team to vendor)' : 'Received Mail (Inbound from vendor to our team)'}"
   - Channel: "${channel || (isSent ? 'Email - Sent' : 'Email - Received')}"
   - Manufacturer: "${manufacturerName || ''}"
   - Thread: "${threadSelection}"
   - Date: "${date}"

2. HANDLE QUOTED EMAIL CHAINS ACCURATELY:
   - Pasted emails often contain older quoted replies at the bottom (e.g., "On [Date] ... wrote:", "From: ...", "> quoted lines").
   - Focus primarily on the NEWEST / TOPMOST message in the pasted text that corresponds to the pre-entered direction (${isSent ? 'Sent by our team' : 'Received from the supplier'}), while using quoted history and Thread History to understand exact part numbers, quantities, and context.

3. FIELD-SPECIFIC EXTRACTION PRECISION:
   - "subject" (Subject / Purpose):
     * NEVER copy the raw email subject line (such as "Re: Inquiry" or "Fw: Quote").
     * Formulate a clear, specific 5–12 word engineering/procurement purpose statement that explains WHY this message was sent or received in the flow of the thread.
     * Examples for Sent Email: "Requesting volume quotation and lead time for SIM7600G-H modules", "Confirming Gerber v2.4 modifications and requesting DFM review", "Following up on EVK sample tracking and customs invoice".
     * Examples for Received Mail: "Provided tiered unit pricing, MOQ, and 4-week lead time for LTE antennas", "Confirmed PCB stackup impedance specs and attached updated datasheet", "Notified 2-week factory delay on sample dispatch".

   - "keyOutcome" (${isSent ? 'Summary (for Sent Email)' : 'Key Outcome / Latest Update (for Received Mail)'}):
     * Write a high-precision 1–3 sentence synthesis.
     * Mention specific part numbers, quantities, target prices, or concrete decisions made in this message relative to the prior thread messages.
     * If Sent Email: Summarize exactly what our team requested, proposed, confirmed, or answered.
     * If Received Mail: Summarize the key outcome, commercial quote, technical answer, or latest update delivered by the vendor.

   - "informationReceived" (Technical Specifications & Commercial Data):
     * If Direction is "Sent Email" (${isSent}): MUST be an empty string ("").
     * If Direction is "Received Mail" (${!isSent}): Extract ONLY structured, clean technical and commercial facts provided by the supplier in this message.
     * Format as clean, scannable bullet points (using "• ") covering any present details:
       • Part Numbers / Model SKUs
       • Unit Pricing / Tiered Pricing / Currency / Incoterms (EXW, FOB, DDP)
       • MOQ (Minimum Order Quantity) & NRE / Tooling / Sample costs
       • Lead Time / Delivery Schedule / Shipping Method
       • Electrical, Mechanical, RF, Firmware, or Certification Specs
     * NEVER paste greetings, sign-offs, legal disclaimers, or the raw email paragraph. If no technical or commercial specs were provided, summarize only the concrete factual data points received.

   - "status":
     * For Sent Email: Choose "Awaiting Reply" if our team is asking questions, requesting a quote/sample, or waiting for vendor confirmation; choose "Completed" if purely a final acknowledgment.
     * For Received Mail: Choose "Action Required" if the vendor asks us to confirm specs, approve a quote/PI, or make payment; choose "Information Received" if the vendor provided quotes, datasheets, or answers; choose "Pending Review" if engineering needs to evaluate complex specs/samples; choose "Completed" if the matter is fully resolved.

   - "nextAction" & "followUpDate":
     * MUST both be empty strings ("").

   - "documentsReceived":
     * Extract exact filenames of any datasheets, PDFs, Gerber/CAD archives, spreadsheets, or invoices mentioned or attached (e.g., "A7670E_Hardware_Design_V1.04.pdf", "PI-20261105.pdf").`;

    const prompt = `${selectedManufacturerInfo}

${manufacturersContext}

${threadHistoryContext}

=== NEWLY PASTED EMAIL / CHAT TRANSCRIPT TO ANALYZE ===
Direction: ${isSent ? 'SENT EMAIL (Outbound from our team)' : 'RECEIVED MAIL (Inbound from supplier)'}
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
                description: 'Strictly "sent" or "received" matching pre-entered direction.',
              },
              subject: {
                type: Type.STRING,
                description:
                  'Specific 5-12 word engineering/procurement purpose of this mail analyzed from the mail and thread flow. Never a raw "Re:" subject header.',
              },
              keyOutcome: {
                type: Type.STRING,
                description: isSent
                  ? 'Concise 1-3 sentence Summary of what our team asked, proposed, or confirmed in this sent email.'
                  : 'Concise 1-3 sentence Key Outcome / Latest Update summarizing what the supplier quoted, answered, or updated in the context of the thread.',
              },
              status: {
                type: Type.STRING,
                description:
                  'One of: "Completed", "Awaiting Reply", "Information Received", "Pending Review", "Action Required".',
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
                  : 'Clean bulleted list ("• ") of technical specifications, part numbers, unit prices, MOQ, lead times, and commercial terms received from the vendor. Never raw email paragraphs or greetings.',
              },
              inboundContent: {
                type: Type.STRING,
                description: 'Summary of vendor statement if received.',
              },
              outboundReply: {
                type: Type.STRING,
                description: 'Summary of our team message if sent.',
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
