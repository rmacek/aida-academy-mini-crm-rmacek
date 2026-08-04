-- Schema for Mini CRM database

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