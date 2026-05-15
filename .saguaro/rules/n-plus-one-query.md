<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: n-plus-one-query
title: No database queries inside loops
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
  - database
  - n-plus-one
---

Database queries must not be executed inside loops (the N+1 query problem).

Look for:
- `for (const item of items) { await db.query(...item.id) }` — N queries instead of 1
- `items.map(async (item) => await prisma.related.findMany({ where: { parentId: item.id } }))`
- `for item in items: Model.objects.get(id=item.related_id)` (Python/Django)
- `for _, item := range items { db.Query("SELECT ... WHERE id = ?", item.ID) }` (Go)
- Any ORM `.find()`, `.get()`, `.findUnique()`, `.query()` call inside a loop or `.map()`/`.forEach()`

Exceptions:
- Loops with a known small upper bound (e.g., 3-5 items max) with a comment explaining the bound

### Violations

```
for (const id of ids) { await db.query("SELECT * FROM users WHERE id = ?", [id]) }
```

```
items.map(async (item) => await prisma.detail.findUnique({ where: { id: item.detailId } }))
```

### Compliant

```
await db.query("SELECT * FROM users WHERE id IN (?)", [ids])
```

```
await prisma.item.findMany({ include: { detail: true } })
```
