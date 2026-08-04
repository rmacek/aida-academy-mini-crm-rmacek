import { createServer } from 'node:http';
import { parse } from 'node:url';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { database } from './database.js';
import { aidaAdapter } from './aida-adapter.js';

const PORT = process.env.PORT || 3000;
const AIDA_BASE_URL = process.env.AIDA_BASE_URL;
const AIDA_BEARER_TOKEN = process.env.AIDA_BEARER_TOKEN;

if (!AIDA_BASE_URL || !AIDA_BEARER_TOKEN) {
  throw new Error('Missing required environment variables: AIDA_BASE_URL and AIDA_BEARER_TOKEN');
}

const aidaClient = aidaAdapter(AIDA_BASE_URL, AIDA_BEARER_TOKEN);

const server = createServer(async (req, res) => {
  const url = parse(req.url, true);
  const { pathname, query } = url;

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  if (req.method === 'GET' && pathname === '/') {
    res.setHeader('Content-Type', 'text/html');
    const html = readFileSync(join(process.cwd(), 'ui/index.html'), 'utf-8');
    res.end(html);
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/api/')) {
    try {
      const pathParts = pathname.split('/').filter(Boolean);
      const resource = pathParts[1];
      const id = pathParts[2];

      // Validate tenant and opportunity scope from query or headers
      const tenantId = query.tenantId || req.headers['x-tenant-id'];
      const salesOpportunityId = query.salesOpportunityId || req.headers['x-sales-opportunity-id'];

      if (!tenantId || !salesOpportunityId) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing tenantId or salesOpportunityId' }));
        return;
      }

      const db = database();

      // Verify scope
      if (resource === 'opportunities') {
        const opportunity = await db.get(
          `SELECT id FROM salesOpportunities WHERE id = ? AND tenantId = ?`,
          [id, tenantId]
        );
        if (!opportunity) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Opportunity not found or access denied' }));
          return;
        }

        const opportunities = await db.all(
          `SELECT * FROM salesOpportunities WHERE tenantId = ?`,
          [tenantId]
        );
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(opportunities));
      } else if (resource === 'appointments') {
        const appointments = await db.all(
          `SELECT * FROM appointments WHERE tenantId = ? AND salesOpportunityId = ?`,
          [tenantId, salesOpportunityId]
        );
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(appointments));
      } else if (resource === 'todos') {
        const todos = await db.all(
          `SELECT * FROM todos WHERE tenantId = ? AND salesOpportunityId = ?`,
          [tenantId, salesOpportunityId]
        );
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(todos));
      } else if (resource === 'notes') {
        const notes = await db.all(
          `SELECT * FROM notes WHERE tenantId = ? AND salesOpportunityId = ?`,
          [tenantId, salesOpportunityId]
        );
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(notes));
      } else if (resource === 'documents') {
        const documents = await db.all(
          `SELECT * FROM documents WHERE tenantId = ? AND salesOpportunityId = ?`,
          [tenantId, salesOpportunityId]
        );
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(documents));
      } else if (resource === 'conversations') {
        const conversations = await db.all(
          `SELECT * FROM conversations WHERE tenantId = ? AND salesOpportunityId = ?`,
          [tenantId, salesOpportunityId]
        );
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(conversations));
      } else if (resource === 'artifacts') {
        const artifacts = await db.all(
          `SELECT * FROM artifacts WHERE tenantId = ? AND salesOpportunityId = ?`,
          [tenantId, salesOpportunityId]
        );
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(artifacts));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Resource not found' }));
      }
    } catch (error) {
      console.error('API Error:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  if (req.method === 'POST' && pathname.startsWith('/api/')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const pathParts = pathname.split('/').filter(Boolean);
        const resource = pathParts[1];
        const tenantId = data.tenantId || req.headers['x-tenant-id'];
        const salesOpportunityId = data.salesOpportunityId || req.headers['x-sales-opportunity-id'];

        if (!tenantId || !salesOpportunityId) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing tenantId or salesOpportunityId' }));
          return;
        }

        const db = database();

        // Verify scope for writes
        const opportunity = await db.get(
          `SELECT id FROM salesOpportunities WHERE id = ? AND tenantId = ?`,
          [salesOpportunityId, tenantId]
        );

        if (!opportunity) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: 'Access denied to this opportunity' }));
          return;
        }

        // Handle different resources
        if (resource === 'conversations') {
          const conversationId = `conv-${Date.now()}`;
          const aidaConversationId = await aidaClient.startConversation(data.prompt);

          await db.run(
            `INSERT INTO conversations (id, tenantId, salesOpportunityId, title, aidaConversationId) VALUES (?, ?, ?, ?, ?)`,
            [conversationId, tenantId, salesOpportunityId, data.title || 'New Conversation', aidaConversationId]
          );

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 201;
          res.end(JSON.stringify({ id: conversationId }));
        } else if (resource === 'artifacts') {
          const artifactId = `art-${Date.now()}`;

          await db.run(
            `INSERT INTO artifacts (id, tenantId, salesOpportunityId, conversationId, type, content) VALUES (?, ?, ?, ?, ?, ?)`,
            [artifactId, tenantId, salesOpportunityId, data.conversationId, data.type, data.content]
          );

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 201;
          res.end(JSON.stringify({ id: artifactId }));
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Resource not found' }));
        }
      } catch (error) {
        console.error('API Error:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
    return;
  }

  if (req.method === 'PUT' && pathname.startsWith('/api/')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const pathParts = pathname.split('/').filter(Boolean);
        const resource = pathParts[1];
        const id = pathParts[2];
        const tenantId = data.tenantId || req.headers['x-tenant-id'];
        const salesOpportunityId = data.salesOpportunityId || req.headers['x-sales-opportunity-id'];

        if (!tenantId || !salesOpportunityId) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing tenantId or salesOpportunityId' }));
          return;
        }

        const db = database();

        // Verify scope for updates
        const opportunity = await db.get(
          `SELECT id FROM salesOpportunities WHERE id = ? AND tenantId = ?`,
          [salesOpportunityId, tenantId]
        );

        if (!opportunity) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: 'Access denied to this opportunity' }));
          return;
        }

        // Handle different resources
        if (resource === 'todos') {
          await db.run(
            `UPDATE todos SET completed = ? WHERE id = ? AND tenantId = ? AND salesOpportunityId = ?`,
            [data.completed, id, tenantId, salesOpportunityId]
          );
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Resource not found' }));
        }
      } catch (error) {
        console.error('API Error:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
    return;
  }

  if (req.method === 'DELETE' && pathname.startsWith('/api/')) {
    const pathParts = pathname.split('/').filter(Boolean);
    const resource = pathParts[1];
    const id = pathParts[2];
    const tenantId = req.headers['x-tenant-id'];
    const salesOpportunityId = req.headers['x-sales-opportunity-id'];

    if (!tenantId || !salesOpportunityId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing tenantId or salesOpportunityId' }));
      return;
    }

    const db = database();

    // Verify scope for deletes
    const opportunity = await db.get(
      `SELECT id FROM salesOpportunities WHERE id = ? AND tenantId = ?`,
      [salesOpportunityId, tenantId]
    );

    if (!opportunity) {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: 'Access denied to this opportunity' }));
      return;
    }

    try {
      if (resource === 'appointments') {
        await db.run(
          `DELETE FROM appointments WHERE id = ? AND tenantId = ? AND salesOpportunityId = ?`,
          [id, tenantId, salesOpportunityId]
        );
      } else if (resource === 'todos') {
        await db.run(
          `DELETE FROM todos WHERE id = ? AND tenantId = ? AND salesOpportunityId = ?`,
          [id, tenantId, salesOpportunityId]
        );
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Resource not found' }));
        return;
      }

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error('API Error:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Default response
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});