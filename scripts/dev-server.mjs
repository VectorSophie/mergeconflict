import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 4173);

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml'
};

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const requestedPath = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  let filePath = join(root, requestedPath || 'index.html');

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(root, 'index.html');
  }

  response.setHeader('Content-Type', types[extname(filePath)] || 'text/plain; charset=utf-8');
  createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`mergeconflict running at http://127.0.0.1:${port}`);
});
