const DEFAULT_PROFILE = 'Local Primary - Trainer';

export function createAidaAdapter({
  baseUrl = process.env.AIDA_BASE_URL,
  bearerToken = process.env.AIDA_BEARER_TOKEN,
  modelProfileName = process.env.AIDA_MODEL_PROFILE || DEFAULT_PROFILE,
  knowledgeBaseId = process.env.AIDA_KNOWLEDGE_BASE_ID,
  fetchImpl = globalThis.fetch
} = {}) {
  return {
    isConfigured: Boolean(baseUrl && bearerToken && typeof fetchImpl === 'function'),

    async chat({ prompt, conversationId = null }) {
      if (!baseUrl || !bearerToken || typeof fetchImpl !== 'function') {
        return {
          ok: false,
          statusCode: 503,
          error: 'Der Opportunity Copilot ist noch nicht mit AIDA verbunden.'
        };
      }

      const payload = {
        modelProfileName,
        prompt,
        dataClassification: 'Internal',
        contextMode: 'Full',
        runContextMode: 'Full',
        cloudProcessingConfirmed: false,
        assistantKey: knowledgeBaseId ? 'knowledge' : 'general',
        knowledgeBaseId: knowledgeBaseId || null
      };
      if (conversationId) payload.conversationId = conversationId;

      try {
        const response = await fetchImpl(
          `${String(baseUrl).replace(/\/$/, '')}/api/v1/chat/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${bearerToken}`
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(90_000)
          }
        );
        const responseBody = await response.json().catch(() => ({}));
        if (!response.ok) {
          return {
            ok: false,
            statusCode: response.status === 429 ? 429 : 503,
            error: responseBody.detail || responseBody.title
              || 'AIDA konnte die Anfrage nicht verarbeiten.'
          };
        }

        return {
          ok: true,
          answer: responseBody.answer,
          conversationId: responseBody.conversationId,
          profileName: responseBody.profileName || modelProfileName,
          modelName: responseBody.modelName || 'unbekannt',
          usedFallback: Boolean(responseBody.usedFallback)
        };
      } catch {
        return {
          ok: false,
          statusCode: 503,
          error: 'AIDA ist momentan nicht erreichbar. Es wurden keine Daten gespeichert.'
        };
      }
    }
  };
}
