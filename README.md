# Mini CRM Application

A secure, tenant-isolated CRM system with AI integration capabilities.

## Features

- Tenant-scoped sales opportunities
- Appointment management
- To-do tracking
- Notes and document management
- Conversation history with AI artifacts
- Responsive UI for desktop, tablet, and mobile
- Server-side AIDA chat adapter
- Strict isolation controls

## Architecture

The application follows a clean architecture pattern:

1. **Presentation Layer** - UI components in `ui/`
2. **Domain Layer** - Business logic and validation
3. **Persistence Layer** - SQLite database access via `database.js`
4. **Integration Layer** - AIDA service adapter in `aida-adapter.js`

## Security Controls

- All data operations are scoped to tenantId and salesOpportunityId
- Cross-tenant and cross-opportunity access is strictly forbidden
- AIDA credentials never exposed to browser
- Parameterized SQL queries prevent injection attacks
- Input validation and sanitization

## Getting Started

1. Set required environment variables (see `docs/configuration.md`)
2. Run server: `node server.js`
3. Access application at `http://localhost:3000`

## Testing

Run all tests with: `node test`

## Implementation Details

This vertical slice implements the core database functionality including:
- Complete database schema with proper foreign key relationships
- Seed data for two tenants (Nordstern and Alpenblick)
- Database wrapper with scalar, get, all, run, exec methods
- Isolation controls to prevent cross-tenant access

## UI Implementation

The UI implements responsive design patterns:
- Desktop: Sidebar navigation
- Tablet: Drawer-based navigation
- Mobile: Tabbed interface

All states (empty, loading, success, error) are properly handled and displayed.

## AIDA Integration

AI functionality is integrated through a dedicated adapter that:
- Communicates with the AIDA service using secure HTTP requests
- Passes only necessary data scoped to current opportunity
- Maintains conversation context per sales opportunity
- Never exposes credentials to client-side code