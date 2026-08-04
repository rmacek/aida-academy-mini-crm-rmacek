import { createServer } from 'node:http';
import { parse } from 'node:url';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { database } from './database.js';
import { aidaAdapter } from './aida-adapter.js';

const PORT = process.env.PORT || 3000;
const AIDA_BASE_URL = process.env.AIDA_BASE_URL;
const AIDA_BEARER_TOKEN = process.env.AIDA_BEARER_TOKEN;

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
          'SELECT id FROM salesOpportunities WHERE id = ? AND tenantId = ?',
          [id, tenantId]
        );

        if (!opportunity) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Sales opportunity not found' }));
          return;
        }
      }

      // Proceed with API logic based on resource type
      switch (resource) {
        case 'opportunities':
          if (req.method === 'GET') {
            const opportunities = await db.all(
              'SELECT * FROM salesOpportunities WHERE tenantId = ?',
              [tenantId]
            );
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(opportunities));
          }
          break;

        case 'appointments':
          if (req.method === 'GET') {
            const appointments = await db.all(
              'SELECT * FROM appointments WHERE tenantId = ? AND salesOpportunityId = ?',
              [tenantId, salesOpportunityId]
            );
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(appointments));
          }
          break;

        case 'todos':
          if (req.method === 'GET') {
            const todos = await db.all(
              'SELECT * FROM todos WHERE tenantId = ? AND salesOpportunityId = ?',
              [tenantId, salesOpportunityId]
            );
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(todos));
          }
          break;

        case 'notes':
          if (req.method === 'GET') {
            const notes = await db.all(
              'SELECT * FROM notes WHERE tenantId = ? AND salesOpportunityId = ?',
              [tenantId, salesOpportunityId]
            );
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(notes));
          }
          break;

        case 'documents':
          if (req.method === 'GET') {
            const documents = await db.all(
              'SELECT * FROM documents WHERE tenantId = ? AND salesOpportunityId = ?',
              [tenantId, salesOpportunityId]
            );
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(documents));
          }
          break;

        case 'conversations':
          if (req.method === 'GET') {
            const conversations = await db.all(
              'SELECT * FROM conversations WHERE tenantId = ? AND salesOpportunityId = ?',
              [tenantId, salesOpportunityId]
            );
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(conversations));
          }
          break;

        case 'artifacts':
          if (req.method === 'GET') {
            const artifacts = await db.all(
              'SELECT * FROM artifacts WHERE tenantId = ? AND salesOpportunityId = ?',
              [tenantId, salesOpportunityId]
            );
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(artifacts));
          }
          break;

        default:
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

  if (req.method === 'POST' && pathname.startsWith('/api/chat/')) {
    try {
      const pathParts = pathname.split('/').filter(Boolean);
      const conversationId = pathParts[3];

      // Validate tenant and opportunity scope from headers
      const tenantId = req.headers['x-tenant-id'];
      const salesOpportunityId = req.headers['x-sales-opportunity-id'];

      if (!tenantId || !salesOpportunityId) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing tenantId or salesOpportunityId' }));
        return;
      }

      // Verify conversation exists and belongs to the opportunity
      const db = database();
      const conversation = await db.get(
        'SELECT id, aidaConversationId FROM conversations WHERE id = ? AND tenantId = ? AND salesOpportunityId = ?',
        [conversationId, tenantId, salesOpportunityId]
      );

      if (!conversation) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Conversation not found' }));
        return;
      }

      // Get opportunity and artifacts for prompt building
      const opportunity = await db.get(
        'SELECT * FROM salesOpportunities WHERE id = ? AND tenantId = ?',
        [salesOpportunityId, tenantId]
      );

      if (!opportunity) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Sales opportunity not found' }));
        return;
      }

      const artifacts = await db.all(
        'SELECT * FROM artifacts WHERE conversationId = ? AND tenantId = ? AND salesOpportunityId = ?',
        [conversationId, tenantId, salesOpportunityId]
      );

      // Build prompt from opportunity and artifacts
      let prompt = `Sales Opportunity: ${opportunity.title}\n\n`;

      if (artifacts.length > 0) {
        prompt += 'Relevant Artifacts:\n';
        for (const artifact of artifacts) {
          prompt += `- ${artifact.type}: ${artifact.content}\n`;
        }
        prompt += '\n';
      }

      // Add opportunity details to prompt
      prompt += `Opportunity Status: ${opportunity.status}\n`;

      if (opportunity.createdAt) {
        prompt += `Created At: ${opportunity.createdAt}\n`;
      }

      // Get conversation history from AIDA if available
      let responseText = '';
      if (conversation.aidaConversationId) {
        const result = await aidaClient.chat(conversation.aidaConversationId, prompt);
        responseText = result.response || 'No response from AIDA';
      } else {
        // If no AIDA conversation exists, create one
        const result = await aidaClient.chat('new-conversation', prompt);
        responseText = result.response || 'No response from AIDA';

        // Update the conversation with AIDA conversation ID
        await db.run(
          'UPDATE conversations SET aidaConversationId = ? WHERE id = ?',
          [result.conversationId, conversationId]
        );
      }

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ response: responseText }));
    } catch (error) {
      console.error('Chat API Error:', error);

      if (error.message.includes('AIDA service not configured')) {
        res.statusCode = 503;
        res.end(JSON.stringify({ error: 'AIDA service unavailable' }));
        return;
      }

      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Handle 404 for all other routes
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});