import { open } from 'node:sqlite';
import { join } from 'node:path';

const dbPath = join(process.cwd(), 'db.sqlite');

export function database() {
  const db = open(dbPath, { mode: open.CREATE | open.READWRITE });
  return db;
}

// Initialize schema and seed data
export async function initDatabase() {
  const db = database();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS salesOpportunities (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      salesOpportunityId TEXT NOT NULL,
      title TEXT NOT NULL,
      date DATETIME NOT NULL,
      FOREIGN KEY (tenantId) REFERENCES tenants(id),
      FOREIGN KEY (salesOpportunityId) REFERENCES salesOpportunities(id)
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      salesOpportunityId TEXT NOT NULL,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (tenantId) REFERENCES tenants(id),
      FOREIGN KEY (salesOpportunityId) REFERENCES salesOpportunities(id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      salesOpportunityId TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id),
      FOREIGN KEY (salesOpportunityId) REFERENCES salesOpportunities(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      salesOpportunityId TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id),
      FOREIGN KEY (salesOpportunityId) REFERENCES salesOpportunities(id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      salesOpportunityId TEXT NOT NULL,
      title TEXT NOT NULL,
      aidaConversationId TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id),
      FOREIGN KEY (salesOpportunityId) REFERENCES salesOpportunities(id)
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      salesOpportunityId TEXT NOT NULL,
      conversationId TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id),
      FOREIGN KEY (salesOpportunityId) REFERENCES salesOpportunities(id),
      FOREIGN KEY (conversationId) REFERENCES conversations(id)
    );
  `);

  // Seed data
  await db.run(`INSERT OR IGNORE INTO tenants (id, name) VALUES ('nordstern', 'Nordstern AG'), ('alpenblick', 'Alpenblick GmbH');`);

  await db.run(`INSERT OR IGNORE INTO salesOpportunities (id, tenantId, title, status) VALUES
    ('opp1-nordstern', 'nordstern', 'Enterprise Software Deal', 'active'),
    ('opp2-nordstern', 'nordstern', 'Cloud Migration Project', 'closed'),
    ('opp1-alpenblick', 'alpenblick', 'Retail Chain Expansion', 'active');`);

  await db.run(`INSERT OR IGNORE INTO appointments (id, tenantId, salesOpportunityId, title, date) VALUES
    ('appt1-nordstern', 'nordstern', 'opp1-nordstern', 'Product Demo', '2023-06-15T10:00:00'),
    ('appt2-alpenblick', 'alpenblick', 'opp1-alpenblick', 'Initial Meeting', '2023-07-20T14:30:00');`);

  await db.run(`INSERT OR IGNORE INTO todos (id, tenantId, salesOpportunityId, title, completed) VALUES
    ('todo1-nordstern', 'nordstern', 'opp1-nordstern', 'Prepare proposal draft', TRUE),
    ('todo2-alpenblick', 'alpenblick', 'opp1-alpenblick', 'Review contract terms', FALSE);`);

  await db.run(`INSERT OR IGNORE INTO notes (id, tenantId, salesOpportunityId, content) VALUES
    ('note1-nordstern', 'nordstern', 'opp1-nordstern', 'Client requested additional security features.'),
    ('note2-alpenblick', 'alpenblick', 'opp1-alpenblick', 'Budget approved for Q3.');`);

  await db.run(`INSERT OR IGNORE INTO documents (id, tenantId, salesOpportunityId, name, url) VALUES
    ('doc1-nordstern', 'nordstern', 'opp1-nordstern', 'Technical Specification.pdf', '/docs/spec.pdf'),
    ('doc2-alpenblick', 'alpenblick', 'opp1-alpenblick', 'Market Analysis.xlsx', '/docs/market.xlsx');`);

  await db.run(`INSERT OR IGNORE INTO conversations (id, tenantId, salesOpportunityId, title, aidaConversationId) VALUES
    ('conv1-nordstern', 'nordstern', 'opp1-nordstern', 'Product Discussion', 'conv-aidanord'),
    ('conv2-alpenblick', 'alpenblick', 'opp1-alpenblick', 'Pricing Strategy', 'conv-aidaalp');`);

  await db.run(`INSERT OR IGNORE INTO artifacts (id, tenantId, salesOpportunityId, conversationId, type, content) VALUES
    ('art1-nordstern', 'nordstern', 'opp1-nordstern', 'conv1-nordstern', 'summary', 'Client needs custom integration.'),
    ('art2-alpenblick', 'alpenblick', 'opp1-alpenblick', 'conv2-alpenblick', 'recommendation', 'Consider tiered pricing model.');`);
}

// Initialize on module load
initDatabase();