// server.js — Railway-compatible entry point.
// The /api/*.js files in this project were written as Vercel serverless
// functions (each just exports a single (req,res) handler). Railway does
// not auto-route those files the way Vercel does — it needs one process
// that starts an actual HTTP server. This file is that server: it serves
// the static frontend files and manually routes /api/<name> requests to
// the same handler functions from lib/handlers.js, unchanged.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const handlers = require('./lib/handlers');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// Map "login" -> handlers.login, "forgot-password" -> handlers.forgotPassword, etc.
const ROUTES = {
  'login': handlers.login,
  'signup': handlers.signup,
  'logout': handlers.logout,
  'session': handlers.session,
  'doctors': handlers.doctors,
  'patients': handlers.patients,
  'appointments': handlers.appointments,
  'invoices': handlers.invoices,
  'staff': handlers.staff,
  'contacts': handlers.contacts,
  'dashboard': handlers.dashboard,
  'forgot-password': handlers.forgotPassword,
  'notifications': handlers.notifications,
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Give the plain Node `res` object the small Express-like surface that
// lib/http.js and lib/handlers.js expect (res.status().json(), etc.)
function enhanceResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) req.destroy(); // 5MB guard
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.join(ROOT, filePath);

  // Guard against escaping the project root.
  if (!fullPath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      // SPA-style fallback: unknown non-file routes go to index.html
      if (!path.extname(fullPath)) {
        return fs.readFile(path.join(ROOT, 'index.html'), (e2, data2) => {
          if (e2) {
            res.writeHead(404);
            return res.end('Not found');
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data2);
        });
      }
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  enhanceResponse(res);

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  if (pathname.startsWith('/api/')) {
    const name = pathname.slice(5).replace(/\.js$/, '').replace(/\/$/, '');
    const handler = ROUTES[name];

    if (!handler) {
      res.status(404).json({ success: false, message: 'API route not found.' });
      return;
    }

    // Build the req.query / req.body shape the handlers expect.
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      req.body = await readBody(req);
    } else {
      req.body = {};
    }

    try {
      await handler(req, res);
    } catch (e) {
      console.error('Unhandled route error:', e);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Server or database error. Please verify the deployment environment variables and database connection.' });
      }
    }
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`MediCare HMS server listening on port ${PORT}`);
});
