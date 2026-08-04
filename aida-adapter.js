export function aidaAdapter(baseUrl, bearerToken) {
  if (!baseUrl || !bearerToken) {
    // Return a safe stub that returns 503 when called
    return {
      chat: async () => {
        throw new Error('AIDA service not configured');
      }
    };
  }

  const base = baseUrl.trim().replace(/\/$/, '');

  return {
    async chat(conversationId, prompt) {
      const url = `${base}/conversations/${conversationId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt
        })
      });

      if (!response.ok) {
        throw new Error(`AIDA API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    }
  };
}