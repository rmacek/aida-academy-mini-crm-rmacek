import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../database.js';
import { createMiniCrmServer } from '../server.js';

test('Opportunity Copilot persists messages and immutable evidence in one scope', async () => {
  const database = createDatabase(':memory:');
  let capturedPrompt = '';
  const aidaAdapter = {
    isConfigured: true,
    async chat({ prompt, conversationId }) {
      capturedPrompt = prompt;
      assert.equal(conversationId, null);
      return {
        ok: true,
        answer: 'Briefing für Nordstern mit klaren nächsten Schritten.',
        conversationId: '11111111-1111-1111-1111-111111111111',
        profileName: 'Local Primary - Trainer',
        modelName: 'qwen3-coder:30b',
        usedFallback: false
      };
    }
  };
  const server = createMiniCrmServer({ database, aidaAdapter });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${baseUrl}/api/opportunities/opp-nordstern/copilot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: 'conv-nordstern-1',
        message: 'Erstelle ein Meeting-Briefing.',
        artifactType: 'Meeting-Briefing',
        artifactTitle: 'Briefing Lösungsworkshop',
        saveArtifact: true,
        selectedDocumentIds: ['doc-nordstern-1']
      })
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.ok(result.artifactId);
    assert.match(capturedPrompt, /\[AIM\]/u);
    assert.match(capturedPrompt, /Nordstern Maschinenbau GmbH/u);
    assert.doesNotMatch(capturedPrompt, /ALPENBLICK-INTERNAL-ONLY/u);

    const details = await fetch(`${baseUrl}/api/opportunities/opp-nordstern`).then(item => item.json());
    assert.equal(details.conversations[0].messages.length, 2);
    assert.equal(details.artifacts.length, 1);
    assert.equal(details.artifacts[0].title, 'Briefing Lösungsworkshop');
    assert.equal(details.artifacts[0].modelProfile, 'Local Primary - Trainer');
    assert.deepEqual(details.artifacts[0].sources, [
      'Verkaufschance: Nordstern Maschinenbau GmbH',
      'Dokument: Nordstern_Anforderungen.txt'
    ]);
  } finally {
    await new Promise(resolve => server.close(resolve));
    database.close();
  }
});

test('unconfigured Copilot returns 503 without inventing or persisting an answer', async () => {
  const database = createDatabase(':memory:');
  const server = createMiniCrmServer({
    database,
    aidaAdapter: {
      isConfigured: false,
      chat: async () => ({ ok: false, statusCode: 503, error: 'Nicht verbunden.' })
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${baseUrl}/api/opportunities/opp-nordstern/copilot`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: 'conv-nordstern-1', message: 'Briefing',
        artifactType: 'Meeting-Briefing', saveArtifact: true,
        selectedDocumentIds: []
      })
    });
    assert.equal(response.status, 503);
    const details = await fetch(`${baseUrl}/api/opportunities/opp-nordstern`).then(item => item.json());
    assert.equal(details.conversations[0].messages.length, 0);
    assert.equal(details.artifacts.length, 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
    database.close();
  }
});
