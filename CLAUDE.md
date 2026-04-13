# CLAUDE.md

## Architecture

### OpenAPI-first

`openapi.yaml` is the single source of truth for the API. Workflow:

1. Edit `openapi.yaml`
2. `mise run generate` — regenerates ogen (backend) and openapi-typescript (frontend) artifacts
3. Add/update handler implementation

**Never edit generated files directly.**

### DB (sqlc)

SQL is the single source of truth. Workflow:

1. Edit `schema.sql` and `query.sql` under `backend/internal/database/`
2. `mise run generate-backend` — regenerates sqlc artifacts

### Frontend embedding

In production, `frontend/dist/` is embedded into the backend binary (`backend/static/`) and served as a single container.

## Commands

All build, test, lint, and format commands must be run via `mise run <task>`. Do not invoke `go`, `pnpm`, or other tools directly.

All `mise run` tasks may be executed without human confirmation.

## Development cycle

```
Edit openapi.yaml / schema.sql
  → mise run generate
  → implement
  → mise run format
  → mise run ci        # lint + test
```

Run `mise run pre-merge` before merging.

## Testing

- Uses real SQLite — no mocks

## Notes

- `--disable-oidc` flag skips OIDC auth for local development
- SQLite — keep replicas at 1
