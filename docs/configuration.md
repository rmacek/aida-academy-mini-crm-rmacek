# Configuration

This document describes the environment variables required for the Mini CRM application.

## Environment Variables

### AIDA Integration

- `AIDA_BASE_URL` - Base URL of the AIDA service (e.g., `https://api.aida.example.com`)
- `AIDA_BEARER_TOKEN` - Bearer token for authenticating with AIDA service

> **Security Note**: These credentials must never be exposed to client-side JavaScript, stored in version control, or included in logs.

## Database

The application uses SQLite for data persistence. The database file is located at `./db/crm.db` and will be created automatically on first run.

## Server

- `PORT` - Port number to bind the HTTP server (default: 3000)

## Tenant Isolation

All operations are strictly scoped by tenantId and salesOpportunityId. Cross-tenant or cross-opportunity access is rejected with appropriate HTTP status codes.

## Example Usage

```bash
export AIDA_BASE_URL="https://api.aida.example.com"
export AIDA_BEARER_TOKEN="your-bearer-token-here"
export PORT=3000
node server.js
```