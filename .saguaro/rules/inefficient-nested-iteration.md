<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: inefficient-nested-iteration
title: Avoid nested iterations when a hash lookup would work
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
  - complexity
  - algorithms
---

Nested iterations where the inner operation is a lookup by key or value should use a hash-based data structure (Set, Map, dict, HashMap) instead.

Look for:
- `.find()` or `.findIndex()` inside `.map()`, `.filter()`, `.forEach()`, or `for` loops
- `.includes()` called on an array inside a loop
- Nested `for` loops where the inner loop searches for a matching element by ID or key
- `.some()` or `.every()` inside `.filter()`
- Python: `if x in list` inside a loop (should be `if x in set`)
- Go: linear scan of a slice inside a loop

Exceptions:
- Arrays with a known small upper bound (< 20 items) where readability outweighs performance
- One-time operations in startup/initialization code

### Violations

```
orders.map(order => users.find(u => u.id === order.userId))
```

```
items.filter(item => excludeIds.includes(item.id))
```

### Compliant

```
const userMap = new Map(users.map(u => [u.id, u]));
orders.map(order => userMap.get(order.userId))
```

```
const excludeSet = new Set(excludeIds);
items.filter(item => !excludeSet.has(item.id))
```
