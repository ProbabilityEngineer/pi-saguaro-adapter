<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: no-floating-promises
title: Promises must be awaited, returned, or caught
severity: error
globs:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "!**/*.test.*"
  - "!**/*.spec.*"
  - "!**/test/**"
  - "!**/tests/**"
  - "!**/__tests__/**"
tags:
  - correctness
  - async
  - error-handling
---

Every Promise must be `await`ed, returned, or have a `.catch()` handler attached. A floating (unhandled) Promise silently swallows errors and causes execution to continue before the async operation completes.

Look for:
- `saveToDatabase(data);` — calling an async function without `await` or `return`
- `fetch(url);` — fire-and-forget fetch calls
- `promise.then(handler)` without a `.catch()` or a subsequent `await`
- `.forEach(async (item) => { await ... })` — the promises from each iteration are not collected

Exceptions:
- Intentional fire-and-forget with `void promise` or `promise.catch(logError)` to explicitly acknowledge the pattern

### Violations

```
saveToDatabase(data);
```

```
items.forEach(async (item) => { await processItem(item); });
```

### Compliant

```
await saveToDatabase(data);
```

```
await Promise.all(items.map((item) => processItem(item)));
```
