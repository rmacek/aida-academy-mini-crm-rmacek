import test from 'node:test';
import assert from 'node:assert';
import { db } from '../database.js';

// Test integration with actual data structures
await test('Can read seed data correctly', () => {
  const opportunities = db.all('SELECT * FROM salesOpportunities');
  assert.ok(Array.isArray(opportunities));
  assert.equal(opportunities.length, 2);

  const nordstern = opportunities.find(o => o.tenantId === 'tenant-nordstern');
  assert.ok(nordstern);
  assert.equal(nordstern.name, 'Nordstern Consulting Project');

  const alpenblick = opportunities.find(o => o.tenantId === 'tenant-alpenblick');
  assert.ok(alpenblick);
  assert.equal(alpenblick.name, 'Alpenblick Mountain Resort Development');
});

await test('Can read nested data correctly', () => {
  const appointments = db.all(
    'SELECT a.*, s.name as opportunityName
     FROM appointments a
     JOIN salesOpportunities s ON a.salesOpportunityId = s.id'
  );
  assert.ok(Array.isArray(appointments));
  assert.equal(appointments.length, 2);

  const kickoffMeeting = appointments.find(a => a.title === 'Project Kickoff Meeting');
  assert.ok(kickoffMeeting);
  assert.equal(kickoffMeeting.opportunityName, 'Nordstern Consulting Project');
});

await test('Can handle cross-tenant queries correctly', () => {
  // This should not return data from other tenants
  const results = db.all(
    'SELECT * FROM salesOpportunities WHERE tenantId = ?',
    ['tenant-nordstern']
  );
  assert.ok(Array.isArray(results));
  assert.equal(results.length, 1);
  assert.equal(results[0].tenantId, 'tenant-nordstern');
});