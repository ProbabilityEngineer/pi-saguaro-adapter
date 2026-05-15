<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: no-secrets-in-error-responses
title: Error responses must not expose internal details
severity: error
globs:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.py"
  - "**/*.go"
  - "**/*.rs"
  - "!**/*.test.*"
  - "!**/*.spec.*"
  - "!**/test/**"
  - "!**/tests/**"
  - "!**/__tests__/**"
tags:
  - security
  - api
  - error-handling
---

Error responses at API boundaries must not expose stack traces, SQL query text, internal file paths, or raw exception messages to clients.

Look for:
- `catch (e) { res.json({ error: e.message }) }` — `e.message` may contain SQL syntax, file paths, or library internals
- Returning `error.stack` or full exception objects in HTTP responses
- Forwarding ORM/database errors directly to the client (e.g., Prisma, Drizzle, SQLAlchemy errors)
- GraphQL resolvers that propagate raw error messages to the response

Exceptions:
- 4xx errors with user-actionable messages (e.g., "Email already registered")
- Development-mode error pages that are disabled in production

### Violations

```
catch (e) { res.json({ error: e.message }) }
```

```
res.status(500).json({ error: error.stack })
```

### Compliant

```
catch (e) { logger.error(e); res.status(500).json({ error: "Internal server error" }) }
```
