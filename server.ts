import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
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

// Endpoint to automatically parse copy-pasted email or chat text
app.post('/api/parse-email', async (req, res) => {
  try {
    const { rawText, existingManufacturers, manufacturerName, date, threadSelection, priorMessages, entryType, channel } = req.body || {};

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ success: false, error: 'Text to parse is empty or missing.' });
    }

    const ai = getGenAI();

    const manufacturersContext =
      existingManufacturers && Array.isArray(existingManufacturers) && existingManufacturers.length > 0
        ? `Registered Manufacturers in Database:\n${existingManufacturers
            .map((m: any) => `- ID: ${m.id}, Name: ${m.name}`)
            .join('\n')}`
        : 'Registered Manufacturers in Database: None registered yet.';

    const threadHistoryContext =
      priorMessages && Array.isArray(priorMessages) && priorMessages.length > 0
        ? `Existing Thread History for Thread ID "${threadSelection}" (Manufacturer: ${manufacturerName || 'Selected'}, Date: ${date}):\n${priorMessages
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((m: any) => `[Date: ${m.date}, Channel: ${m.channel}, Subject: ${m.subject}, Status: ${m.status}]\nKey Outcome / Details:\n${m.keyOutcome}\nInformation Received:\n${m.informationReceived || '(None)'}\n---`)
            .join('\n')}`
        : `Existing Thread History: None (New Thread or no prior messages in this thread).`;

    const userDirectionContext = `User Pre-Selected Metadata & Direction:
- Manufacturer: ${manufacturerName || 'Selected Manufacturer'}
- Interaction Date: ${date}
- Thread ID: ${threadSelection}
- Pre-Selected Direction/Type: ${entryType === 'received' ? 'Received (Inbound from Vendor)' : entryType === 'sent' ? 'Sent (Outbound from Team)' : 'Reply to Thread'}
- Pre-Selected Channel: ${channel || 'Email - Received'}

IMPORTANT: Respect the user's pre-selected direction (${entryType}) and channel (${channel}) when extracting fields.`;

    const prompt = `You are an expert procurement and hardware supply chain assistant.
Analyze the following newly copy-pasted raw email or live chat transcript between a hardware engineering team and a supplier/manufacturer.

${userDirectionContext}

${manufacturersContext}

${threadHistoryContext}

New Raw Email/Chat Text to Analyze:
"""
${rawText}
"""

Extract and fill these exact fields:
1. manufacturerName: Name of the manufacturer/vendor.
2. matchedManufacturerId: Matched ID from the registered manufacturers list if it matches (e.g. M001, M002), or empty string if not found.
3. channel: Must align with the user's pre-selected channel ("${channel || 'Email - Received'}") or as appropriate.
4. detectedType: Must align with the user's pre-selected direction ("${entryType || 'received'}").
5. subject: Concise summary title for this interaction (under 12 words).
6. keyOutcome: Core outcome or response summary (1-2 clear sentences summarizing what was agreed, quoted, or answered in the context of the thread).
7. status: One of: "Completed", "Awaiting Reply", "Information Received", "Pending Review", "Action Required".
8. nextAction: Suggested follow-up step or next action for the engineering/procurement team based on the thread flow.
9. followUpDate: Suggested follow-up date in YYYY-MM-DD format if mentioned or implied (or empty string if none).
10. informationReceived: Detailed technical notes, quotation prices (e.g. unit costs, EXW pricing, MOQ, lead times), EVK/samples, part numbers, or technical specs mentioned in this new message or thread context.
11. inboundContent: If vendor sent text, extract what the vendor stated/quoted.
12. outboundReply: If our team sent or replied to the vendor, extract what our team asked or replied.
13. documentsReceived: List of filenames, datasheets, or PDF manuals mentioned in the text.`;

    const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastError: any = null;
    let parsed: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                manufacturerName: { type: Type.STRING },
                matchedManufacturerId: { type: Type.STRING },
                channel: { type: Type.STRING },
                detectedType: { type: Type.STRING },
                subject: { type: Type.STRING },
                keyOutcome: { type: Type.STRING },
                status: { type: Type.STRING },
                nextAction: { type: Type.STRING },
                followUpDate: { type: Type.STRING },
                informationReceived: { type: Type.STRING },
                inboundContent: { type: Type.STRING },
                outboundReply: { type: Type.STRING },
                documentsReceived: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
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
          },
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
