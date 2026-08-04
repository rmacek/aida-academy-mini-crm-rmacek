import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
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
  assistant_release TEXT NOT NULL DEFAULT 'Opportunity Copilot',
  model_profile TEXT NOT NULL DEFAULT 'unbekannt',
  model_name TEXT NOT NULL DEFAULT 'unbekannt',
  sources_json TEXT NOT NULL DEFAULT '[]',
  confidence TEXT NOT NULL DEFAULT 'Nicht bewertet',
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
`;

function normalizedParams(params) {
  return params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
}

export function createDatabase(path = ':memory:') {
  const connection = new DatabaseSync(path);
  connection.exec(SCHEMA);

  const api = {
    scalar(sql, ...params) {
      const row = connection.prepare(sql).get(...normalizedParams(params));
      return row ? Object.values(row)[0] : undefined;
    },
    get(sql, ...params) {
      return connection.prepare(sql).get(...normalizedParams(params));
    },
    all(sql, ...params) {
      return connection.prepare(sql).all(...normalizedParams(params));
    },
    run(sql, ...params) {
      return connection.prepare(sql).run(...normalizedParams(params));
    },
    exec(sql) {
      return connection.exec(sql);
    },
    close() {
      connection.close();
    }
  };

  seed(api);
  return api;
}

function seed(database) {
  const tenantId = 'academy-rmacek';
  const existing = database.scalar(
    'SELECT COUNT(*) AS count FROM sales_opportunities WHERE tenant_id = ?',
    tenantId
  );
  if (existing > 0) return;

  database.run(
    `INSERT INTO sales_opportunities
      (id, tenant_id, name, company, status, value_eur, description, next_step)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    'opp-nordstern', tenantId, 'AIDA für den technischen Vertrieb',
    'Nordstern Maschinenbau GmbH', 'Lösungsentwurf', 145000,
    'Nordstern prüft AIDA für Angebotsvorbereitung, Wissensarbeit und sichere Vertriebsassistenz.',
    'Workshop mit Vertrieb und IT vorbereiten'
  );
  database.run(
    `INSERT INTO sales_opportunities
      (id, tenant_id, name, company, status, value_eur, description, next_step)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    'opp-alpenblick', tenantId, 'AIDA für Serviceprozesse',
    'Alpenblick Energie AG', 'Qualifizierung', 92000,
    'Alpenblick evaluiert AIDA für interne Serviceprozesse. Diese Daten dienen ausschließlich dem Isolationstest.',
    'Fachliche Ansprechpartner bestätigen'
  );

  database.run(
    `INSERT INTO appointments
      (id, tenant_id, sales_opportunity_id, title, scheduled_at, duration_minutes, location, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    'apt-nordstern-1', tenantId, 'opp-nordstern', 'Lösungsworkshop mit Nordstern',
    '2026-08-12T09:00:00.000Z', 60, 'Microsoft Teams',
    'Zielbild, Datenschutz und Pilotumfang abstimmen.'
  );
  database.run(
    `INSERT INTO todos
      (id, tenant_id, sales_opportunity_id, title, due_at, completed)
     VALUES (?, ?, ?, ?, ?, ?)`,
    'todo-nordstern-1', tenantId, 'opp-nordstern',
    'Meeting-Briefing vorbereiten', '2026-08-11T15:00:00.000Z', 0
  );
  database.run(
    `INSERT INTO notes
      (id, tenant_id, sales_opportunity_id, title, content)
     VALUES (?, ?, ?, ?, ?)`,
    'note-nordstern-1', tenantId, 'opp-nordstern', 'Entscheidungskriterien',
    'Wichtig sind Datenhaltung auf Olares One, nachvollziehbare Quellen und eine kurze Pilotphase.'
  );
  database.run(
    `INSERT INTO documents
      (id, tenant_id, sales_opportunity_id, name, content, source)
     VALUES (?, ?, ?, ?, ?, ?)`,
    'doc-nordstern-1', tenantId, 'opp-nordstern', 'Nordstern_Anforderungen.txt',
    'Nordstern möchte mit 15 Vertriebsmitarbeitenden starten. Gewünscht sind Wissenssuche, Angebotsentwürfe und Meeting-Briefings. Externe Nachrichten dürfen nur als Entwurf entstehen.',
    'Synthetisches Workshop-Dokument'
  );
  database.run(
    `INSERT INTO documents
      (id, tenant_id, sales_opportunity_id, name, content, source)
     VALUES (?, ?, ?, ?, ?, ?)`,
    'doc-alpenblick-1', tenantId, 'opp-alpenblick', 'Alpenblick_Intern.txt',
    'ALPENBLICK-INTERNAL-ONLY: Budgetrahmen und interner Projektname dürfen niemals in einer anderen Verkaufschance erscheinen.',
    'Synthetisches Isolationstest-Dokument'
  );
  database.run(
    `INSERT INTO conversations
      (id, tenant_id, sales_opportunity_id, title)
     VALUES (?, ?, ?, ?)`,
    'conv-nordstern-1', tenantId, 'opp-nordstern', 'Vorbereitung Lösungsworkshop'
  );
}

const defaultPath = process.env.MINI_CRM_DB_PATH || './db/mini-crm-v1.db';
let defaultDatabase;
export function getDb() {
  defaultDatabase ??= createDatabase(defaultPath);
  return defaultDatabase;
}
