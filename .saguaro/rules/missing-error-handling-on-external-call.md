<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: missing-error-handling-on-external-call
title: External calls must have error handling
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
  - reliability
  - error-handling
  - resilience
---

External calls (HTTP requests, database queries, file I/O) must have error handling at the call site or within an enclosing error boundary.

Look for:
- `fetch(url).then(res => res.json()).then(setData)` — no `.catch()` and no enclosing try/catch
- `await db.query(...)` outside of a try/catch block and not in a route handler with error middleware
- `fs.readFile(...)` callbacks without error parameter checks
- `requests.get(url)` in Python without try/except for `RequestException`
- `http.Get(url)` in Go where the returned error is assigned to `_`

Exceptions:
- Calls inside frameworks that provide automatic error handling (e.g., Next.js server actions, tRPC procedures with error formatters)
- Intentional fire-and-forget calls explicitly marked with `void` or `.catch(logError)`

### Violations

```
fetch("/api/data").then(r => r.json()).then(setData)
```

```
resp, _ := http.Get(url)
```

### Compliant

```
try {
  const res = await fetch("/api/data");
  setData(await res.json());
} catch (e) {
  setError("Failed to load data");
}
```

```
resp, err := http.Get(url)
if err != nil {
  return fmt.Errorf("fetch failed: %w", err)
}
```
