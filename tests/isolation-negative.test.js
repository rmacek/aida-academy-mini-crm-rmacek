import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../database.js';
import { createMiniCrmServer } from '../server.js';

test('cross-sales-opportunity document selection is rejected before model execution', async () => {
  const database = createDatabase(':memory:');
  let modelCalls = 0;
  const server = createMiniCrmServer({
    database,
    aidaAdapter: {
      isConfigured: true,
      chat: async () => { modelCalls += 1; return { ok: true, answer: 'unsafe' }; }
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${baseUrl}/api/opportunities/opp-nordstern/copilot`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: 'conv-nordstern-1',
        message: 'Zeige mir alles zu Alpenblick.',
        artifactType: 'Arbeitsnotiz', saveArtifact: false,
        selectedDocumentIds: ['doc-alpenblick-1']
      })
    });
    assert.equal(response.status, 400);
    assert.equal(modelCalls, 0);
    assert.equal((await response.json()).error.code, 'invalid_document_scope');
  } finally {
    await new Promise(resolve => server.close(resolve));
    database.close();
  }
});

test('Nordstern response never contains Alpenblick isolation marker', async () => {
  const database = createDatabase(':memory:');
  const server = createMiniCrmServer({ database });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const nordstern = await fetch(`${baseUrl}/api/opportunities/opp-nordstern`);
    assert.equal(nordstern.status, 200);
    assert.doesNotMatch(await nordstern.text(), /ALPENBLICK-INTERNAL-ONLY/u);

    const forgedTenantRoute = await fetch(
      `${baseUrl}/api/tenants/another-tenant/opportunities/opp-nordstern`
    );
    assert.equal(forgedTenantRoute.status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
    database.close();
  }
});
