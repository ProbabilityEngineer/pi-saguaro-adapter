<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: unbounded-list-endpoint
title: List endpoints must have pagination or a default limit
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
tags:
  - performance
  - api
  - pagination
---

API endpoints that return lists of records must include a LIMIT, pagination, or cursor mechanism.

Look for:
- `SELECT * FROM table` without a LIMIT clause
- ORM `.findMany()`, `.all()`, `.filter()` without `take`/`limit`/`[:N]`
- Returning the raw result of a "get all" query directly in a response
- Missing default page size when no pagination params are provided

Exceptions:
- Internal batch processing endpoints that deliberately load all records (must have a comment explaining the use case)

### Violations

```
const users = await db.query("SELECT * FROM users");
```

```
const items = await prisma.item.findMany();
```

### Compliant

```
const users = await db.query("SELECT * FROM users LIMIT ? OFFSET ?", [pageSize, offset]);
```

```
const items = await prisma.item.findMany({ take: limit, skip: offset });
```
