import { DatabaseSync } from 'node:sqlite';

const DB_PATH = './db/crm.db';
const db = new DatabaseSync(DB_PATH);

// Wrap DatabaseSync to provide scalar, get, all, run and exec methods
const dbWrapper = {
  scalar: (sql, ...params) => {
    const stmt = db.prepare(sql);
    return stmt.value(...params);
  },

  get: (sql, ...params) => {
    const stmt = db.prepare(sql);
    return stmt.get(...params);
  },

  all: (sql, ...params) => {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  },

  run: (sql, ...params) => {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  },

  exec: (sql) => {
    return db.exec(sql);
  }
};

// Initialize schema if not exists
try {
  dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS salesOpportunities (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'open',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      salesOpportunityId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      startTime DATETIME NOT NULL,
      endTime DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (salesOpportunityId) REFERENCES salesOpportunities(id)
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      salesOpportunityId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      completed BOOLEAN DEFAULT FALSE,
      dueDate DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (salesOpportunityId) REFERENCES salesOpportunities(id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      salesOpportunityId TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (salesOpportunityId) REFERENCES salesOpportunities(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      salesOpportunityId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      contentType TEXT,
      fileSize INTEGER,
      uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (salesOpportunityId) REFERENCES salesOpportunities(id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      salesOpportunityId TEXT NOT NULL,
      title TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (salesOpportunityId) REFERENCES salesOpportunities(id)
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      salesOpportunityId TEXT NOT NULL,
      conversationId TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (salesOpportunityId) REFERENCES salesOpportunities(id),
      FOREIGN KEY (conversationId) REFERENCES conversations(id)
    );
  `);

  // Seed data if tables are empty
  const opportunityCount = dbWrapper.scalar('SELECT COUNT(*) FROM salesOpportunities');
  if (opportunityCount === 0) {
    // Insert Nordstern tenant data
    dbWrapper.run(
      'INSERT INTO salesOpportunities (id, tenantId, name, description, status) VALUES (?, ?, ?, ?, ?)',
      ['opp-1', 'tenant-nordstern', 'Nordstern Consulting Project', 'Consulting project for Nordstern', 'open']
    );
    dbWrapper.run(
      'INSERT INTO appointments (id, tenantId, salesOpportunityId, title, description, startTime, endTime) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['apt-1', 'tenant-nordstern', 'opp-1', 'Project Kickoff Meeting', 'Initial project kickoff', '2023-05-15T09:00:00Z', '2023-05-15T10:00:00Z']
    );
    dbWrapper.run(
      'INSERT INTO todos (id, tenantId, salesOpportunityId, title, description, completed) VALUES (?, ?, ?, ?, ?, ?)',
      ['todo-1', 'tenant-nordstern', 'opp-1', 'Prepare project proposal', 'Draft initial project proposal document', false]
    );
    dbWrapper.run(
      'INSERT INTO notes (id, tenantId, salesOpportunityId, title, content) VALUES (?, ?, ?, ?, ?)',
      ['note-1', 'tenant-nordstern', 'opp-1', 'Project requirements', 'Client wants to implement a new CRM system with AI integration']
    );
    dbWrapper.run(
      'INSERT INTO documents (id, tenantId, salesOpportunityId, name, description, contentType, fileSize) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['doc-1', 'tenant-nordstern', 'opp-1', 'Project Brief', 'Initial project brief document', 'application/pdf', 10240]
    );

    // Insert Alpenblick tenant data
    dbWrapper.run(
      'INSERT INTO salesOpportunities (id, tenantId, name, description, status) VALUES (?, ?, ?, ?, ?)',
      ['opp-2', 'tenant-alpenblick', 'Alpenblick Sales Expansion', 'Sales expansion project for Alpenblick', 'open']
    );
    dbWrapper.run(
      'INSERT INTO appointments (id, tenantId, salesOpportunityId, title, description, startTime, endTime) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['apt-2', 'tenant-alpenblick', 'opp-2', 'Market Analysis Meeting', 'Meeting to analyze market conditions', '2023-06-10T14:00:00Z', '2023-06-10T15:00:00Z']
    );
    dbWrapper.run(
      'INSERT INTO todos (id, tenantId, salesOpportunityId, title, description, completed) VALUES (?, ?, ?, ?, ?, ?)',
      ['todo-2', 'tenant-alpenblick', 'opp-2', 'Research competitors', 'Analyze competitor offerings', false]
    );
    dbWrapper.run(
      'INSERT INTO notes (id, tenantId, salesOpportunityId, title, content) VALUES (?, ?, ?, ?, ?)',
      ['note-2', 'tenant-alpenblick', 'opp-2', 'Key insights', 'Important market trends identified during research']
    );
    dbWrapper.run(
      'INSERT INTO documents (id, tenantId, salesOpportunityId, name, description, contentType, fileSize) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['doc-2', 'tenant-alpenblick', 'opp-2', 'Market Analysis Report', 'Comprehensive market analysis report', 'application/pdf', 15360]
    );

    // Create initial conversations and artifacts for demo purposes
    dbWrapper.run(
      'INSERT INTO conversations (id, tenantId, salesOpportunityId, title) VALUES (?, ?, ?, ?)',
      ['conv-1', 'tenant-nordstern', 'opp-1', 'Project Planning Discussion']
    );

    dbWrapper.run(
      'INSERT INTO artifacts (id, tenantId, salesOpportunityId, conversationId, name, type, content) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['artifact-1', 'tenant-nordstern', 'opp-1', 'conv-1', 'Initial Plan Summary', 'text', 'Based on our discussion, we propose to implement a CRM system with AI capabilities in three phases. Phase 1 focuses on core functionality, phase 2 adds AI features, and phase 3 implements advanced analytics.']
    );
  }
} catch (error) {
  console.error('Database initialization error:', error);
}

export function getDb() {
  return dbWrapper;
}
