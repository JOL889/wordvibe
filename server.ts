import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', app: 'WordVibe' });
  });

  if (IS_PRODUCTION) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { maxAge: '1d' }));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/assets/')) return next();
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        return res.sendFile(indexHtml);
      }
      return res.status(404).send('Build output not found');
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: disableHmr ? false : { server: httpServer },
        hmr: disableHmr ? false : { server: httpServer },
      },
      appType: 'spa',
    });

    if (disableHmr) {
      let cachedNoHmrClient: string | null = null;
      app.get('/@vite/client', async (_req, res, next) => {
        try {
          if (!cachedNoHmrClient) {
            const result = await vite.transformRequest('/@vite/client');
            if (!result) return next();
            const startMarker = 'const transport = normalizeModuleRunnerTransport((() => {';
            const endMarker = '})());';
            const startIdx = result.code.indexOf(startMarker);
            const endIdx = startIdx !== -1 ? result.code.indexOf(endMarker, startIdx) : -1;
            if (startIdx !== -1 && endIdx !== -1) {
              cachedNoHmrClient =
                result.code.slice(0, startIdx) +
                `${startMarker} return { connect: async () => {}, disconnect: async () => {}, send: () => {} }; ${endMarker}` +
                result.code.slice(endIdx + endMarker.length);
            } else {
              cachedNoHmrClient = result.code;
            }
          }
          res.status(200).type('application/javascript').set('Cache-Control', 'no-cache').send(cachedNoHmrClient);
        } catch (err) {
          next(err);
        }
      });
    }

    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`WordVibe server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start WordVibe server:', err);
  process.exit(1);
});
