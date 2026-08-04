import { fetch } from 'node:cross-fetch';

const AIDA_BASE_URL = process.env.AIDA_BASE_URL;
const AIDA_BEARER_TOKEN = process.env.AIDA_BEARER_TOKEN;

export function createAidaAdapter() {
  return {
    async chat(tenantId, salesOpportunityId, conversationId, messages) {
      // Return 503 if no AIDA credentials available
      if (!AIDA_BASE_URL || !AIDA_BEARER_TOKEN) {
        return { error: 'Service Unavailable', statusCode: 503 };
      }

      try {
        const response = await fetch(`${AIDA_BASE_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AIDA_BEARER_TOKEN}`
          },
          body: JSON.stringify({ messages })
        });

        if (!response.ok) {
          const error = await response.text();
          return { error, statusCode: response.status };
        }

        const data = await response.json();
        return { result: data.response };
      } catch (error) {
        return { error: 'Internal Server Error', statusCode: 500 };
      }
    },

    async generateArtifact(tenantId, salesOpportunityId, conversationId, prompt, artifactType) {
      // Return 503 if no AIDA credentials available
      if (!AIDA_BASE_URL || !AIDA_BEARER_TOKEN) {
        return { error: 'Service Unavailable', statusCode: 503 };
      }

      try {
        const response = await fetch(`${AIDA_BASE_URL}/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AIDA_BEARER_TOKEN}`
          },
          body: JSON.stringify({ prompt, type: artifactType })
        });

        if (!response.ok) {
          const error = await response.text();
          return { error, statusCode: response.status };
        }

        const data = await response.json();
        return { result: data.artifact };
      } catch (error) {
        return { error: 'Internal Server Error', statusCode: 500 };
      }
    }
  };
}
