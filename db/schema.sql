PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sales_opportunities (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Qualifizierung',
  value_eur INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  next_step TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sales_opportunity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  location TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id, sales_opportunity_id)
    REFERENCES sales_opportunities(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sales_opportunity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  due_at TEXT,
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id, sales_opportunity_id)
    REFERENCES sales_opportunities(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sales_opportunity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id, sales_opportunity_id)
    REFERENCES sales_opportunities(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sales_opportunity_id TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'text/plain',
  source TEXT NOT NULL DEFAULT 'Manuell',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id, sales_opportunity_id)
    REFERENCES sales_opportunities(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  sales_opportunity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  aida_conversation_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, sales_opportunity_id, id),
  FOREIGN KEY (tenant_id, sales_opportunity_id)
    REFERENCES sales_opportunities(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sales_opportunity_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id, sales_opportunity_id, conversation_id)
    REFERENCES conversations(tenant_id, sales_opportunity_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sales_opportunity_id TEXT NOT NULL,
  conversation_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  assistant_release TEXT NOT NULL,
  model_profile TEXT NOT NULL,
  model_name TEXT NOT NULL,
  sources_json TEXT NOT NULL DEFAULT '[]',
  confidence TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id, sales_opportunity_id)
    REFERENCES sales_opportunities(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_appointments_scope
  ON appointments(tenant_id, sales_opportunity_id, scheduled_at);
CREATE INDEX IF NOT EXISTS ix_todos_scope
  ON todos(tenant_id, sales_opportunity_id, completed, due_at);
CREATE INDEX IF NOT EXISTS ix_documents_scope
  ON documents(tenant_id, sales_opportunity_id);
CREATE INDEX IF NOT EXISTS ix_messages_scope
  ON messages(tenant_id, sales_opportunity_id, conversation_id, created_at);
CREATE INDEX IF NOT EXISTS ix_artifacts_scope
  ON artifacts(tenant_id, sales_opportunity_id, created_at);
