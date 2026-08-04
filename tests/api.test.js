import test from 'node:test';
import assert from 'node:assert';
import { db } from '../database.js';

// Test API contract compliance with database operations
await test('API can read sales opportunities', () => {
  const opportunities = db.all('SELECT * FROM salesOpportunities');
  assert.ok(Array.isArray(opportunities));
  assert.equal(opportunities.length, 2);
});

await test('API can read appointments with proper tenant isolation', () => {
  const appointments = db.all(
    'SELECT * FROM appointments WHERE tenantId = ? AND salesOpportunityId = ?',
    ['tenant-nordstern', 'opp-1']
  );

  assert.ok(Array.isArray(appointments));
  assert.equal(appointments.length, 1);
  assert.equal(appointments[0].title, 'Project Kickoff Meeting');
});

await test('API can read todos with proper scope', () => {
  const todos = db.all(
    'SELECT * FROM todos WHERE tenantId = ? AND salesOpportunityId = ?',
    ['tenant-alpenblick', 'opp-2']
  );

  assert.ok(Array.isArray(todos));
  assert.equal(todos.length, 1);
  assert.equal(todos[0].title, 'Research local regulations');
});

await test('API can read notes with proper scope', () => {
  const notes = db.all(
    'SELECT * FROM notes WHERE tenantId = ? AND salesOpportunityId = ?',
    ['tenant-nordstern', 'opp-1']
  );

  assert.ok(Array.isArray(notes));
  assert.equal(notes.length, 1);
  assert.equal(notes[0].title, 'Key stakeholders');
});

await test('API can read documents with proper scope', () => {
  const documents = db.all(
    'SELECT * FROM documents WHERE tenantId = ? AND salesOpportunityId = ?',
    ['tenant-alpenblick', 'opp-2']
  );

  assert.ok(Array.isArray(documents));
  assert.equal(documents.length, 1);
  assert.equal(documents[0].name, 'Site Analysis Report.pdf');
});