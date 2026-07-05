---
name: Orval query param TS2308 collision
description: Query parameters on GET list endpoints cause a TS2308 duplicate export error between generated/api.ts and generated/types/.
---

Orval generates `<OperationIdPascal>Params` as both a Zod schema in `generated/api.ts` AND a TypeScript interface in `generated/types/`. When `lib/api-zod/src/index.ts` re-exports both with `export *`, TypeScript sees a duplicate export and fails with TS2308.

**Why:** The name collision happens for any endpoint whose operationId produces query-parameter types that Orval names identically in both output files.

**How to apply:** When writing OpenAPI list endpoints, do NOT add query parameters. Remove any `in: query` parameters from GET list operations and handle filtering client-side instead. Alternatively, suffix the operationId so the generated name is unique, but removing the params is simpler and safer.
