# AIDA Academy Mini CRM

Ein bewusst kleines, eigenständiges CRM für AIDA-Verkaufschancen. Die Anwendung
läuft außerhalb der AIDA-Verwaltungsoberfläche unter `/aida-crm`. AIDA bleibt
generisch; die CRM-Fachlogik liegt ausschließlich in diesem Projekt.

## Funktionsumfang

- sichtbarer, serverseitig erzwungener Tenant- und Verkaufschancen-Kontext;
- sicherer Wechsel zwischen Verkaufschancen;
- Termine, Aufgaben, Notizen und Textdokumente;
- mehrere KI-Unterhaltungen pro Verkaufschance;
- Opportunity Copilot für Meeting-Briefings, E-Mail-Entwürfe,
  Angebotsstrukturen und Risikoanalysen;
- unveränderliche Artefakte mit Modell-, Quellen-, Konfidenz- und Zeitnachweis;
- negative Isolationstests mit synthetischen Daten von Nordstern und
  Alpenblick.

## Lokal starten

Voraussetzung ist Node.js 22 oder neuer. Es werden keine externen npm-Pakete
benötigt.

```text
npm test
npm start
```

Danach ist die Anwendung unter `http://localhost:3000/aida-crm` erreichbar.
Ohne AIDA-Konfiguration funktionieren alle CRM-Bereiche; nur der Copilot
antwortet kontrolliert mit HTTP 503 und speichert keine erfundene Ausgabe.

## AIDA anbinden

Alle Zugangsdaten bleiben ausschließlich auf dem Server:

```text
AIDA_BASE_URL=https://<aida-host>
AIDA_BEARER_TOKEN=<Service-Account-Token>
AIDA_MODEL_PROFILE=Local Primary - Trainer
AIDA_KNOWLEDGE_BASE_ID=<UUID-der-AIDA-Produktwissensbasis>
AIDA_ASSISTANT_RELEASE=Opportunity Copilot v1
MINI_CRM_TENANT_ID=academy-rmacek
MINI_CRM_TENANT_NAME=Academy - rmacek
```

Der Service Account benötigt nur die AIDA-Berechtigung zum Senden von
Chatnachrichten und zum Lesen der ausdrücklich gewählten Wissensbasis. Der
Browser erhält weder Token noch eine frei wählbare Tenant-ID.

## Sicherheitsgrenzen

Jede Datenbankoperation enthält `tenant_id` und `sales_opportunity_id`.
Dokumente werden vor dem Modellaufruf auf ihre Zugehörigkeit geprüft. Fremde
Dokument-IDs führen zu HTTP 400; das Modell wird dabei nicht aufgerufen.
Dokumentinhalte und Benutzereingaben sind im ACTION-Prompt ausdrücklich als
nicht vertrauenswürdige Daten markiert. Externe Nachrichten oder Angebote
werden niemals versendet, sondern nur als Entwurf gespeichert.
