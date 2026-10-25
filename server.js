const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

function sendText(req, res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(message) });
  res.end(req.method === 'HEAD' ? undefined : message);
}

function notFound(req, res) {
  fs.readFile(path.join(__dirname, '404.html'), (error, page) => {
    if (error) return sendText(req, res, 404, 'Page not found');
    res.writeHead(404, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': page.length,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    });
    res.end(req.method === 'HEAD' ? undefined : page);
  });
}

const server = http.createServer((req, res) => {
  let requestURL, url;
  try {
    requestURL = new URL(req.url, 'http://localhost');
    url = decodeURIComponent(requestURL.pathname);
    if (url.includes('\0')) return sendText(req, res, 400, 'Bad request');
  } catch (error) { return sendText(req, res, 400, 'Bad request'); }

  let resolved = path.resolve(__dirname, '.' + url);
  const relative = path.relative(__dirname, resolved);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    return sendText(req, res, 403, 'Forbidden');
  }

  fs.stat(resolved, (error, stats) => {
    if (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return notFound(req, res);
      return sendText(req, res, 500, 'Internal server error');
    }
    if (stats.isDirectory()) {
      if (!url.endsWith('/')) {
        res.writeHead(301, { Location: requestURL.pathname + '/' + requestURL.search });
        return res.end();
      }
      resolved = path.join(resolved, 'index.html');
    }
    fs.readFile(resolved, (readError, data) => {
      if (readError) {
        if (readError.code === 'ENOENT' || readError.code === 'ENOTDIR') return notFound(req, res);
        return sendText(req, res, 500, 'Internal server error');
      }
      const ext = path.extname(resolved).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': ext === '.html' ? type + '; charset=utf-8' : type, 'Content-Length': data.length });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});

module.exports = server;
