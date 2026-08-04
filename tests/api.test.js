import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../database.js';
import { createMiniCrmServer } from '../server.js';

async function withServer(run) {
  const database = createDatabase(':memory:');
  const server = createMiniCrmServer({
    database,
    aidaAdapter: { isConfigured: false, chat: async () => ({ ok: false, statusCode: 503 }) }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try { await run(baseUrl); }
  finally {
    await new Promise(resolve => server.close(resolve));
    database.close();
  }
}

test('standalone page and trusted context contract are available', async () => {
  await withServer(async baseUrl => {
    const page = await fetch(`${baseUrl}/aida-crm`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/u);
    assert.match(await page.text(), /AIDA Mini CRM/u);

    const response = await fetch(`${baseUrl}/api/context`);
    assert.equal(response.status, 200);
    const context = await response.json();
    assert.deepEqual(context.tenant, { id: 'academy-rmacek', name: 'Academy - rmacek' });
    assert.equal(context.copilotConfigured, false);
    assert.equal(context.opportunities.length, 2);
  });
});

test('CRUD writes stay within the active sales opportunity', async () => {
  await withServer(async baseUrl => {
    const created = await fetch(`${baseUrl}/api/opportunities/opp-nordstern/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Workshop-Folgepunkt', content: 'Pilotumfang bestätigen.' })
    });
    assert.equal(created.status, 201);

    const nordstern = await fetch(`${baseUrl}/api/opportunities/opp-nordstern`).then(item => item.json());
    const alpenblick = await fetch(`${baseUrl}/api/opportunities/opp-alpenblick`).then(item => item.json());
    assert.ok(nordstern.notes.some(note => note.title === 'Workshop-Folgepunkt'));
    assert.ok(!alpenblick.notes.some(note => note.title === 'Workshop-Folgepunkt'));

    const todo = nordstern.todos[0];
    const updated = await fetch(
      `${baseUrl}/api/opportunities/opp-nordstern/todos/${encodeURIComponent(todo.id)}`,
      {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true })
      }
    );
    assert.equal(updated.status, 200);
    const after = await fetch(`${baseUrl}/api/opportunities/opp-nordstern`).then(item => item.json());
    assert.equal(after.todos[0].completed, true);
  });
});

test('bounded JSON and validation errors are safe', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/opportunities/opp-nordstern/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '', content: '<script>alert(1)</script>' })
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, 'invalid_request');
    assert.doesNotMatch(JSON.stringify(body), /stack|sqlite|SELECT/iu);
  });
});
