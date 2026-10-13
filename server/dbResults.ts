/** mysql2 Drizzle returns [ResultSetHeader, fields], not ResultSetHeader directly. */
export function mysqlAffectedRows(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  if (!header || typeof header !== "object") return 0;
  const count = (header as { affectedRows?: unknown }).affectedRows;
  const numeric = typeof count === "number" ? count : Number(count);
  return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : 0;
}

/** mysql2 Drizzle insert results use the same outer [ResultSetHeader, fields] wrapper. */
export function mysqlInsertId(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  if (!header || typeof header !== "object") return 0;
  const value = (header as { insertId?: unknown }).insertId;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : 0;
}
