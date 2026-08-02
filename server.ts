/**
 * Local development server ONLY.
 *
 * In production this project deploys as Vercel Serverless Functions living in
 * `api/` - Vercel discovers and runs those files directly, and this file is
 * never used or bundled for that path (see vercel.json / package.json).
 *
 * For local development (`npm run dev`) we still want one process that serves
 * both the Vite frontend and the API, with hot reload. Rather than duplicate
 * business logic here, this file mounts the exact same handler modules from
 * `api/` behind a tiny Express adapter, so there is a single source of truth
 * for every route and dev/prod can never drift apart.
 */
import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import statusHandler from './api/status';
import uploadHandler from './api/documents/upload';
import commitHandler from './api/documents/commit';
import graphExportHandler from './api/graph/export';
import graphNodeHandler from './api/graph/node/[id]';
import graphSearchHandler from './api/graph/search';
import graphResetHandler from './api/graph/reset';
import simulateHandler from './api/simulate';
import evidenceFeedHandler from './api/evidence/feed';

// Adapts a Vercel-style `(req, res) => void | Promise<void>` handler to an
// Express route handler, and attaches the small extras (`res.status`,
// `res.json` are already present on Express responses) that Vercel handlers
// expect. Async errors are forwarded to Express's error handling.
function adapt(handler: (req: any, res: any) => any) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

// Reads the raw (unparsed) body of an Express request into a Buffer.
function readRawBody(req: Request): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Adapts a Vercel Web Standard `{ fetch(request: Request): Promise<Response> }`
// handler (the shape used by api/documents/upload.ts) to an Express route
// handler, by building a real Web `Request` from the raw Express/Node
// request and translating the Web `Response` back onto Express's `res`.
// This keeps local dev, `vercel dev`, and production all running the exact
// same handler code for this route.
function adaptFetchHandler(mod: { fetch: (request: globalThis.Request) => Promise<globalThis.Response> }) {
  return async (req: Request, res: Response) => {
    const protocol = req.protocol || 'http';
    const host = req.headers.host || 'localhost';
    const url = `${protocol}://${host}${req.originalUrl}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(', '));
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const rawBody = hasBody ? await readRawBody(req) : undefined;

    const webRequest = new Request(url, {
      method: req.method,
      headers,
      body: rawBody && rawBody.length > 0 ? rawBody : undefined
    });

    const webResponse = await mod.fetch(webRequest);

    res.status(webResponse.status);
    webResponse.headers.forEach((value, key) => {
      // Content-Length/Content-Encoding are recomputed by Express/Node.
      if (key.toLowerCase() === 'content-length') return;
      res.setHeader(key, value);
    });
    const buf = Buffer.from(await webResponse.arrayBuffer());
    res.end(buf);
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // The upload route reads its own raw body (it builds a Web Standard
  // Request and hands it to a fetch-style handler, matching production - see
  // adaptFetchHandler above), so it's excluded from Express's body parsers.
  // Every other route relies on Express's parsed req.body, matching how
  // Vercel auto-parses JSON bodies for those functions in production.
  app.use((req, res, next) => {
    if (req.path === '/api/documents/upload') {
      return next();
    }
    express.json({ limit: '10mb' })(req, res, next);
  });
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ==================== API ENDPOINTS ====================
  app.get('/api/status', adapt(statusHandler));
  app.post('/api/documents/upload', adaptFetchHandler(uploadHandler));
  app.post('/api/documents/commit', adapt(commitHandler));
  app.get('/api/graph/export', adapt(graphExportHandler));
  app.get('/api/graph/node/:id', (req: Request, res: Response, next: NextFunction) => {
    // Vercel automatically merges dynamic route segments (e.g. [id]) into
    // req.query for the corresponding api/graph/node/[id].ts function; Express
    // puts them in req.params instead, so mirror that here for parity.
    (req.query as any).id = req.params.id;
    return adapt(graphNodeHandler)(req, res, next);
  });
  app.get('/api/graph/search', adapt(graphSearchHandler));
  app.delete('/api/graph/reset', adapt(graphResetHandler));
  app.post('/api/simulate', adapt(simulateHandler));
  app.get('/api/evidence/feed', adapt(evidenceFeedHandler));

  // ==================== VITE MIDDLEWARE ====================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ComplyVerse local dev server running on http://localhost:${PORT}`);
  });
}

startServer();
