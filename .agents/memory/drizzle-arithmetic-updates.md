---
name: Drizzle arithmetic column updates
description: How to safely increment/decrement a column value in Drizzle ORM without sql.raw.
---

When you need to do arithmetic on a column value (e.g. coinBalance += 50), use the `sql` template literal tag from drizzle-orm, NOT `sql.raw`:

```typescript
import { sql } from "drizzle-orm";

// CORRECT
db.update(membersTable).set({
  coinBalance: sql`${membersTable.coinBalance} + ${amount}`,
  streak: sql`${membersTable.streak} + 1`,
});

// WRONG — risky and requires type cast hacks
db.update(membersTable).set({
  coinBalance: sql.raw(`coin_balance + ${amount}`) as unknown as number,
});
```

**Why:** `sql.raw` interpolates strings directly, is a SQL injection risk even for numeric values, and requires unsafe `as unknown as number` casts. The `sql` template tag is parameterized and properly typed.

**How to apply:** Any time you need to increment/decrement a DB column in a route handler, use `sql\`\${table.column} + \${value}\`` pattern.
