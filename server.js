import { createServer } from 'node:http';
import { parse } from 'node:url';
import { createAidaAdapter } from './aida-adapter.js';
import { getDb } from './database.js';

const PORT = process.env.PORT || 3000;
const aidaAdapter = createAidaAdapter();

const server = createServer(async (req, res) => {
  const url = parse(req.url, true);
  const db = getDb();

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  try {
    if (req.method === 'GET' && url.pathname === '/') {
      // Serve the main HTML page
      const fs = await import('node:fs');
      const html = fs.readFileSync('./ui/index.html', 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(html);
    } else if (req.method === 'GET' && url.pathname.startsWith('/api/')) {
      await handleApiRequest(req, res, db, url);
    } else if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
      await handleApiPostRequest(req, res, db, url);
    } else {
      // Serve static files
      const serveStatic = await import('./ui/app.js');
      res.writeHead(404);
      res.end('Not Found');
    }
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

async function handleApiRequest(req, res, db, url) {
  const { pathname } = url;
  const pathParts = pathname.split('/').filter(Boolean);

  // Extract tenantId and salesOpportunityId from URL
  if (pathParts.length < 3 || pathParts[0] !== 'api' || pathParts[1] !== 'tenants') {
    res.writeHead(400);
    res.end('Invalid API endpoint');
    return;
  }

  const tenantId = pathParts[2];
  const salesOpportunityId = pathParts[4];

  // Validate that tenant and opportunity exist
  const opportunity = db.get(
    'SELECT * FROM salesOpportunities WHERE id = ? AND tenantId = ?',
    [salesOpportunityId, tenantId]
  );

  if (!opportunity) {
    res.writeHead(404);
    res.end('Sales opportunity not found');
    return;
  }

  // Handle conversation requests
  if (pathParts[5] === 'conversations') {
    if (pathParts.length === 7 && pathParts[6] === 'chat') {
      // GET /api/tenants/{tenantId}/opportunities/{opportunityId}/conversations/{conversationId}/chat
      const conversationId = pathParts[6];

      // Validate conversation exists and belongs to this opportunity
      const conversation = db.get(
        'SELECT * FROM conversations WHERE id = ? AND salesOpportunityId = ?',
        [conversationId, salesOpportunityId]
      );

      if (!conversation) {
        res.writeHead(404);
        res.end('Conversation not found');
        return;
      }

      // Get conversation messages
      const messages = db.all(
        'SELECT * FROM artifacts WHERE conversationId = ? ORDER BY createdAt ASC',
        [conversationId]
      );

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({ messages }));
    } else {
      // GET /api/tenants/{tenantId}/opportunities/{opportunityId}/conversations
      const conversations = db.all(
        'SELECT * FROM conversations WHERE salesOpportunityId = ?',
        [salesOpportunityId]
      );

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({ conversations }));
    }
  } else if (pathParts[5] === 'artifacts') {
    // GET /api/tenants/{tenantId}/opportunities/{opportunityId}/artifacts
    const artifacts = db.all(
      'SELECT * FROM artifacts WHERE salesOpportunityId = ?',
      [salesOpportunityId]
    );

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ artifacts }));
  }
}

async function handleApiPostRequest(req, res, db, url) {
  const { pathname } = url;
  const pathParts = pathname.split('/').filter(Boolean);

  // Extract tenantId and salesOpportunityId from URL
  if (pathParts.length < 3 || pathParts[0] !== 'api' || pathParts[1] !== 'tenants') {
    res.writeHead(400);
    res.end('Invalid API endpoint');
    return;
  }

  const tenantId = pathParts[2];
  const salesOpportunityId = pathParts[4];

  // Validate that tenant and opportunity exist
  const opportunity = db.get(
    'SELECT * FROM salesOpportunities WHERE id = ? AND tenantId = ?',
    [salesOpportunityId, tenantId]
  );

  if (!opportunity) {
    res.writeHead(404);
    res.end('Sales opportunity not found');
    return;
  }

  // Handle conversation creation
  if (pathParts[5] === 'conversations') {
    if (pathParts.length === 7 && pathParts[6] === 'chat') {
      // POST /api/tenants/{tenantId}/opportunities/{opportunityId}/conversations/{conversationId}/chat
      const conversationId = pathParts[7];

      // Validate conversation exists and belongs to this opportunity
      const conversation = db.get(
        'SELECT * FROM conversations WHERE id = ? AND salesOpportunityId = ?',
        [conversationId, salesOpportunityId]
      );

      if (!conversation) {
        res.writeHead(404);
        res.end('Conversation not found');
        return;
      }

      // Parse request body
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const messages = data.messages;

          // Send messages to AIDA
          const response = await aidaAdapter.chat(tenantId, salesOpportunityId, conversationId, messages);

          if (response.error) {
            res.writeHead(response.statusCode || 500);
            res.end(JSON.stringify({ error: response.error }));
            return;
          }

          // Store result as artifact
          const artifactId = `artifact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          db.run(
            'INSERT INTO artifacts (id, tenantId, salesOpportunityId, conversationId, name, type, content) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [artifactId, tenantId, salesOpportunityId, conversationId, 'AI Response', 'text', response.result]
          );

          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, artifactId }));
        } catch (error) {
          console.error(error);
          res.writeHead(400);
          res.end('Invalid request body');
        }
      });
    } else {
      // POST /api/tenants/{tenantId}/opportunities/{opportunityId}/conversations
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const { title } = data;

          // Create conversation
          const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          db.run(
            'INSERT INTO conversations (id, tenantId, salesOpportunityId, title) VALUES (?, ?, ?, ?)',
            [conversationId, tenantId, salesOpportunityId, title]
          );

          res.setHeader('Content-Type', 'application/json');
          res.writeHead(201);
          res.end(JSON.stringify({ conversationId }));
        } catch (error) {
          console.error(error);
          res.writeHead(400);
          res.end('Invalid request body');
        }
      });
    }
  } else if (pathParts[5] === 'artifacts') {
    // POST /api/tenants/{tenantId}/opportunities/{opportunityId}/artifacts
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { prompt, type } = data;

        // Generate artifact using AIDA
        const response = await aidaAdapter.generateArtifact(tenantId, salesOpportunityId, null, prompt, type);

        if (response.error) {
          res.writeHead(response.statusCode || 500);
          res.end(JSON.stringify({ error: response.error }));
          return;
        }

        // Store generated artifact
        const artifactId = `artifact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        db.run(
          'INSERT INTO artifacts (id, tenantId, salesOpportunityId, name, type, content) VALUES (?, ?, ?, ?, ?, ?)',
          [artifactId, tenantId, salesOpportunityId, `Generated ${type}`, type, response.result]
        );

        res.setHeader('Content-Type', 'application/json');
        res.writeHead(201);
        res.end(JSON.stringify({ artifactId }));
      } catch (error) {
        console.error(error);
        res.writeHead(400);
        res.end('Invalid request body');
      }
    });
  }
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
