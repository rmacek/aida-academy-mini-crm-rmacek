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
      ['note-1', 'tenant-nordstern', 'opp-1', 'Key stakeholders', 'Identified key decision makers at Nordstern']
    );
    dbWrapper.run(
      'INSERT INTO documents (id, tenantId, salesOpportunityId, name, description, contentType, fileSize) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['doc-1', 'tenant-nordstern', 'opp-1', 'Project Charter.pdf', 'Initial project charter document', 'application/pdf', 102400]
    );
    dbWrapper.run(
      'INSERT INTO conversations (id, tenantId, salesOpportunityId, title) VALUES (?, ?, ?, ?)',
      ['conv-1', 'tenant-nordstern', 'opp-1', 'Initial Discussion']
    );
    dbWrapper.run(
      'INSERT INTO artifacts (id, tenantId, salesOpportunityId, conversationId, name, type, content) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['art-1', 'tenant-nordstern', 'opp-1', 'conv-1', 'Meeting Notes', 'text/plain', 'Initial notes from kickoff meeting']
    );

    // Insert Alpenblick tenant data
    dbWrapper.run(
      'INSERT INTO salesOpportunities (id, tenantId, name, description, status) VALUES (?, ?, ?, ?, ?)',
      ['opp-2', 'tenant-alpenblick', 'Alpenblick Mountain Resort Development', 'Development project for mountain resort', 'open']
    );
    dbWrapper.run(
      'INSERT INTO appointments (id, tenantId, salesOpportunityId, title, description, startTime, endTime) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['apt-2', 'tenant-alpenblick', 'opp-2', 'Site Visit', 'Visit to mountain resort site', '2023-06-20T14:00:00Z', '2023-06-20T16:00:00Z']
    );
    dbWrapper.run(
      'INSERT INTO todos (id, tenantId, salesOpportunityId, title, description, completed) VALUES (?, ?, ?, ?, ?, ?)',
      ['todo-2', 'tenant-alpenblick', 'opp-2', 'Research local regulations', 'Investigate zoning laws for resort development', false]
    );
    dbWrapper.run(
      'INSERT INTO notes (id, tenantId, salesOpportunityId, title, content) VALUES (?, ?, ?, ?, ?)',
      ['note-2', 'tenant-alpenblick', 'opp-2', 'Environmental concerns', 'Addressing environmental impact assessment']
    );
    dbWrapper.run(
      'INSERT INTO documents (id, tenantId, salesOpportunityId, name, description, contentType, fileSize) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['doc-2', 'tenant-alpenblick', 'opp-2', 'Site Analysis Report.pdf', 'Detailed site analysis report', 'application/pdf', 204800]
    );
    dbWrapper.run(
      'INSERT INTO conversations (id, tenantId, salesOpportunityId, title) VALUES (?, ?, ?, ?)',
      ['conv-2', 'tenant-alpenblick', 'opp-2', 'Development Planning']
    );
    dbWrapper.run(
      'INSERT INTO artifacts (id, tenantId, salesOpportunityId, conversationId, name, type, content) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['art-2', 'tenant-alpenblick', 'opp-2', 'conv-2', 'Project Outline', 'text/plain', 'Initial project outline']
    );
  }
} catch (error) {
  console.error('Database initialization error:', error);
  throw error;
}

export { dbWrapper as db };