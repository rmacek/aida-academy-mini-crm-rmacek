# Konfigurationsvertrag

| Variable | Pflicht | Wirkung |
|---|---:|---|
| `AIDA_BASE_URL` | für Copilot | Basis-URL der AIDA-Instanz; nur serverseitig gelesen |
| `AIDA_BEARER_TOKEN` | für Copilot | Token eines minimal berechtigten Service Accounts; nie im Browser |
| `AIDA_MODEL_PROFILE` | nein | Exakter Name des freigegebenen Modellprofils; Standard: `Local Primary - Trainer` |
| `AIDA_KNOWLEDGE_BASE_ID` | empfohlen | Aktiviert den AIDA-Wissensassistenten für allgemeines Produktwissen |
| `AIDA_ASSISTANT_RELEASE` | nein | Revisionsname, der in gespeicherten Artefakten erscheint |
| `MINI_CRM_TENANT_ID` | nein | Serverseitig vertrauenswürdige Tenant-ID; Standard: `academy-rmacek` |
| `MINI_CRM_TENANT_NAME` | nein | Sichtbarer Tenant-Name; Standard: `Academy - rmacek` |
| `MINI_CRM_DB_PATH` | nein | SQLite-Datei; Standard: `./db/mini-crm-v1.db` |
| `PORT` | nein | HTTP-Port; Standard: `3000` |

Der Copilot verwendet `POST /api/v1/chat/messages`. Neue Unterhaltungen senden
Modellprofil, `assistantKey` und Knowledge-Base-ID. Folgemeldungen verwenden die
von AIDA zurückgegebene Conversation-ID. Damit bleiben AIDA-Verlauf und
Mini-CRM-Unterhaltung gemeinsam an genau eine Verkaufschance gebunden.
