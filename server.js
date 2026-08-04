import { createServer } from 'node:http';
import { parse } from 'node:url';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { database } from './database.js';

const PORT = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  const url = parse(req.url);
  const path = url.pathname;

  // Serve static files
  if (path.startsWith('/ui/')) {
    const filePath = join(process.cwd(), path);
    try {
      const content = readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': getContentType(filePath) });
      res.end(content);
    } catch (err) {
      res.writeHead(404);
      res.end('Not Found');
    }
    return;
  }

  // API routes
  if (path.startsWith('/api/')) {
    const [_, __, entity, id] = path.split('/');
    try {
      await handleApiRequest(req, res, entity, id);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
    return;
  }

  // Serve index.html for root path
  if (path === '/') {
    try {
      const content = readFileSync(join(process.cwd(), 'ui/index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    } catch (err) {
      res.writeHead(404);
      res.end('Not Found');
    }
    return;
  }

  // Default to index.html for SPA
  try {
    const content = readFileSync(join(process.cwd(), 'ui/index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  } catch (err) {
    res.writeHead(404);
    res.end('Not Found');
  }
});

async function handleApiRequest(req, res, entity, id) {
  const tenantId = req.headers['x-tenant-id'];
  const salesOpportunityId = req.headers['x-sales-opportunity-id'];

  if (!tenantId || !salesOpportunityId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing tenant or opportunity ID' }));
    return;
  }

  const db = database();

  if (req.method === 'GET') {
    if (id) {
      const item = await db.get(`SELECT * FROM ${entity} WHERE id = ? AND tenantId = ? AND salesOpportunityId = ?`, [id, tenantId, salesOpportunityId]);
      if (!item) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(item));
    } else {
      const items = await db.all(`SELECT * FROM ${entity} WHERE tenantId = ? AND salesOpportunityId = ?`, [tenantId, salesOpportunityId]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(items));
    }
  } else if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const result = await db.run(`INSERT INTO ${entity} (tenantId, salesOpportunityId, ...) VALUES (?, ?, ...)`, [tenantId, salesOpportunityId, ...]);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: result.lastID }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Request' }));
      }
    });
  } else if (req.method === 'PUT') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        await db.run(`UPDATE ${entity} SET ... WHERE id = ? AND tenantId = ? AND salesOpportunityId = ?`, [..., id, tenantId, salesOpportunityId]);
        res.writeHead(204);
        res.end();
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Request' }));
      }
    });
  } else if (req.method === 'DELETE') {
    await db.run(`DELETE FROM ${entity} WHERE id = ? AND tenantId = ? AND salesOpportunityId = ?`, [id, tenantId, salesOpportunityId]);
    res.writeHead(204);
    res.end();
  }
}

function getContentType(filePath) {
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.js')) return 'application/javascript';
  if (filePath.endsWith('.html')) return 'text/html';
  return 'application/octet-stream';
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});