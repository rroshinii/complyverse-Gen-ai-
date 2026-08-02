import { runIngestionAgent } from '../../lib/agents';
import { extractTextFromUpload } from '../../lib/documentParser';

// --------------------------------------------------------------------------
// IMPORTANT: this route intentionally does NOT use the classic
// `(req: VercelRequest, res: VercelResponse)` handler shape (like the other
// routes in this project), and does NOT export `config.api.bodyParser`.
//
// `export const config = { api: { bodyParser: false } }` is a *Next.js*
// convention. This project is a plain Vite app deployed with standalone
// Vercel Functions (no Next.js), where that config key is silently ignored.
// Combined with multer, that mismatch is what caused every upload to crash
// in production: Vercel's Node.js compatibility layer had already started
// consuming/buffering the raw request stream before multer's busboy parser
// got a chance to read it, so the function either hung until it timed out or
// threw - and Vercel's own platform-level crash page ("A server error has
// occurred...") was returned to the browser instead of JSON, which is
// exactly the "Unexpected token 'A'" JSON.parse error this was producing.
//
// The fix is to use Vercel's documented Web Standard `fetch` handler
// (https://vercel.com/docs/functions/runtimes/node-js#create-a-node.js-function-in-/api),
// which gives us the standard `Request`/`Response` Web APIs Node 18+ ships
// natively. `request.formData()` handles multipart parsing itself - no
// multer, no raw-stream races, no Next.js-only config flags - and this
// exact same code path also runs correctly under `vercel dev` and under the
// local Express dev server (see server.ts, which now adapts to this same
// fetch-style handler for this route).
// --------------------------------------------------------------------------

const FALLBACK_SAMPLE_TEXT = `
  DATA PROCESSING ADDENDUM (DPA) - SAMPLE CLAUSES
  This Data Processing Addendum ("DPA") supplements the Master Services Agreement.
  Section 3.1: The Processor shall process Customer Personal Data strictly in accordance with documented instructions.
  Section 4.2: The Processor shall provide at least 30 calendar days advance written notice prior to engaging any new sub-processor.
  Section 8.1: In the event of a confirmed Personal Data Breach, Processor shall notify Controller within 24 hours of discovery.
  Section 12.3: Annual SOC 2 Type II audit report shall be provided to Controller upon request.
`;

export default {
  // POST /api/documents/upload - Ingest file / text, run Ingestion Agent
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json(
        { success: false, error: 'Method not allowed. Use: POST' },
        { status: 405, headers: { Allow: 'POST' } }
      );
    }

    try {
      const contentType = request.headers.get('content-type') || '';
      let fileName = 'Uploaded_Document.pdf';
      let content = '';

      if (contentType.includes('multipart/form-data')) {
        // The Web Standard FormData API parses the multipart body for us -
        // no multer, no manual stream reading required.
        const formData = await request.formData();
        const file = formData.get('file');
        const formFileName = formData.get('fileName');
        const formTextContent = formData.get('textContent');

        if (typeof formFileName === 'string' && formFileName) {
          fileName = formFileName;
        }
        if (typeof formTextContent === 'string') {
          content = formTextContent;
        }

        if (file instanceof File) {
          fileName = file.name || fileName;
          const buffer = Buffer.from(await file.arrayBuffer());
          content = await extractTextFromUpload({
            originalname: fileName,
            mimetype: file.type || 'application/octet-stream',
            buffer
          });
        }
      } else {
        // Pasted-text (JSON) case.
        const body = await request.json().catch(() => ({} as any));
        fileName = body?.fileName || fileName;
        content = body?.textContent || '';
      }

      if (!content || content.trim().length === 0) {
        content = FALLBACK_SAMPLE_TEXT;
      }

      const result = await runIngestionAgent(fileName, content);
      return Response.json({ success: true, data: result });
    } catch (err: any) {
      console.error('Error in /api/documents/upload:', err);
      return Response.json(
        { success: false, error: err?.message || 'Failed to ingest document' },
        { status: 500 }
      );
    }
  }
};
