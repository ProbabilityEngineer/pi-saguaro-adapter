<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: hardcoded-env-specific-value
title: Environment-specific values must come from configuration
severity: warning
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
  - "!**/*.config.*"
  - "!**/config/**"
  - "!**/.env*"
  - "!**/docker-compose*"
tags:
  - deployment
  - configuration
  - environment
---

URLs, ports, API endpoints, and connection strings must not be hardcoded in source files. These values change between environments and should come from environment variables or configuration files.

Look for:
- `http://localhost:3000` or `http://127.0.0.1` URLs in application code
- Hardcoded API base URLs: `https://api.myapp.com/v1`
- Hardcoded port numbers in application logic: `const PORT = 3000`
- Database connection strings: `postgres://user:pass@localhost:5432/db`
- Hardcoded WebSocket URLs: `ws://localhost:8080`

Exceptions:
- Test files and fixtures (excluded by globs)
- Configuration files, docker-compose files, and .env files (excluded by globs)
- Constants that are genuinely the same across all environments (e.g., well-known public API URLs)

### Violations

```
const API_URL = "http://localhost:3000/api"
```

```
const db = new Database("postgres://admin:secret@localhost:5432/mydb")
```

### Compliant

```
const API_URL = process.env.API_URL ?? "http://localhost:3000/api"
```

```
const db = new Database(process.env.DATABASE_URL)
```
