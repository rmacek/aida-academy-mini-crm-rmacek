import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../database.js';

test('database wrapper supports scalar, get, all, run and array parameters', () => {
  const database = createDatabase(':memory:');
  try {
    assert.equal(database.scalar(
      'SELECT COUNT(*) AS count FROM sales_opportunities WHERE tenant_id = ?',
      ['academy-rmacek']
    ), 2);
    assert.equal(database.get(
      'SELECT company FROM sales_opportunities WHERE tenant_id = ? AND id = ?',
      'academy-rmacek', 'opp-nordstern'
    ).company, 'Nordstern Maschinenbau GmbH');
    assert.equal(database.all(
      'SELECT id FROM sales_opportunities WHERE tenant_id = ? ORDER BY id',
      'academy-rmacek'
    ).length, 2);
    const result = database.run(
      `UPDATE sales_opportunities SET next_step = ?
        WHERE tenant_id = ? AND id = ?`,
      'Validierter nächster Schritt', 'academy-rmacek', 'opp-nordstern'
    );
    assert.equal(Number(result.changes), 1);
    assert.doesNotThrow(() => database.exec('SELECT 1;'));
  } finally {
    database.close();
  }
});

test('synthetic opportunities share one tenant and keep scoped documents separate', () => {
  const database = createDatabase(':memory:');
  try {
    const tenants = database.all(
      'SELECT DISTINCT tenant_id AS tenantId FROM sales_opportunities'
    );
    assert.equal(tenants.length, 1);
    assert.equal(tenants[0].tenantId, 'academy-rmacek');
    const nordsternDocuments = database.all(
      `SELECT name, content FROM documents
        WHERE tenant_id = ? AND sales_opportunity_id = ?`,
      'academy-rmacek', 'opp-nordstern'
    );
    assert.equal(nordsternDocuments.length, 1);
    assert.doesNotMatch(nordsternDocuments[0].content, /ALPENBLICK-INTERNAL-ONLY/u);
  } finally {
    database.close();
  }
});
