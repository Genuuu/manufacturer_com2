import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;

// Initialize Gemini SDK with User-Agent header for telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint to automatically parse copy-pasted email or chat text
app.post('/api/parse-email', async (req, res) => {
  try {
    const { rawText, existingManufacturers } = req.body;

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ error: 'Text to parse is empty or missing.' });
    }

    const manufacturersContext = existingManufacturers && Array.isArray(existingManufacturers) && existingManufacturers.length > 0
      ? `Registered Manufacturers in Database:\n${existingManufacturers.map((m: any) => `- ID: ${m.id}, Name: ${m.name}`).join('\n')}`
      : 'Registered Manufacturers in Database: JLCPCB (M001), PCBWay (M002), SIMCom (M003)';

    const prompt = `You are an expert procurement and hardware supply chain assistant.
Analyze the following copy-pasted raw email or live chat transcript between a hardware engineering team and a supplier/manufacturer.
The text might be a received email from the vendor, a sent email to the vendor, a reply to a thread, or a combination of both a received email and our reply.

${manufacturersContext}

Text to analyze:
"""
${rawText}
"""

Extract and fill these exact fields:
1. manufacturerName: Name of the manufacturer/vendor (e.g. SIMCom, JLCPCB, PCBWay, Quectel).
2. matchedManufacturerId: Matched ID from the registered manufacturers list if it matches (e.g. M001, M002, M003), or empty string if not found.
3. channel: One of: "Email - Received", "Email - Sent", "Thread Reply (Sent)", "Live Chat (Session)", "Website", "Phone Call", "Video Meeting", "Portal / Ticket".
4. detectedType: One of: "received" (vendor wrote to us), "sent" (we wrote to vendor), "reply" (reply to existing thread), "combined_thread" (text contains both vendor message and our reply).
5. subject: Concise summary title for this interaction (under 12 words).
6. keyOutcome: Core outcome or response summary (1-2 clear sentences summarizing what was agreed, quoted, or answered).
7. status: One of: "Completed", "Awaiting Reply", "Information Received", "Pending Review", "Action Required".
8. nextAction: Suggested follow-up step or next action for the engineering/procurement team.
9. followUpDate: Suggested follow-up date in YYYY-MM-DD format if mentioned or implied (or empty string if none). Reference current year baseline is 2026.
10. informationReceived: Detailed technical notes, quotation prices (e.g. unit costs, EXW pricing, MOQ, lead times), EVK/samples, part numbers (e.g., A7671G-MBXV), or technical specs mentioned.
11. inboundContent: If vendor sent text, extract what the vendor stated/quoted.
12. outboundReply: If our team sent or replied to the vendor, extract what our team asked or replied.
13. documentsReceived: List of filenames, datasheets, or PDF manuals mentioned in the text (e.g. ["A7671G_SPEC_202508.pdf"]).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in /api/parse-email:', error);
    return res.status(500).json({
      error: 'Failed to process email text with AI.',
      details: error.message || String(error),
    });
  }
});

// Vite server integration in dev mode
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  });
  app.use(vite.middlewares);
  app.use('*', async (req, res, next) => {
    try {
      const fs = await import('fs');
      let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`FabricateOps Server running on port ${PORT}`);
});
