import test from 'node:test';
import assert from 'node:assert';
import { db } from '../database.js';

// Test database wrapper methods
await test('Database wrapper provides scalar method', () => {
  const count = db.scalar('SELECT COUNT(*) FROM salesOpportunities');
  assert.equal(typeof count, 'number');
});

await test('Database wrapper provides get method', () => {
  const result = db.get('SELECT * FROM salesOpportunities LIMIT 1');
  assert.ok(result);
  assert.ok(result.id);
});

await test('Database wrapper provides all method', () => {
  const results = db.all('SELECT id FROM salesOpportunities');
  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0);
});

await test('Database wrapper provides run method', () => {
  const result = db.run('UPDATE salesOpportunities SET name = ? WHERE id = ?', ['Updated Name', 'opp-1']);
  assert.ok(result);
});

await test('Database wrapper provides exec method', () => {
  const result = db.exec('SELECT * FROM salesOpportunities');
  assert.ok(result);
});

await test('Database wrapper handles complex queries correctly', () => {
  const result = db.all(
    'SELECT s.id, s.name, COUNT(a.id) as appointmentCount
     FROM salesOpportunities s
     LEFT JOIN appointments a ON s.id = a.salesOpportunityId
     GROUP BY s.id, s.name'
  );
  assert.ok(Array.isArray(result));
  assert.ok(result.length > 0);
});