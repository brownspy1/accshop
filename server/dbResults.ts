/** Unwraps affected rows count from PostgreSQL QueryResult or MySQL ResultSetHeader. */
export function mysqlAffectedRows(result: unknown): number {
  if (!result) return 0;
  if (typeof result === "object" && "rowCount" in result && typeof (result as { rowCount?: unknown }).rowCount === "number") {
    const rc = (result as { rowCount: number }).rowCount;
    return Number.isSafeInteger(rc) && rc >= 0 ? rc : 0;
  }
  const header = Array.isArray(result) ? result[0] : result;
  if (!header || typeof header !== "object") return 0;
  const count = (header as { affectedRows?: unknown }).affectedRows;
  const numeric = typeof count === "number" ? count : Number(count);
  return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : 0;
}

/** Unwraps inserted ID from PostgreSQL returning([{ id }]) or MySQL insertId ResultSetHeader. */
export function mysqlInsertId(result: unknown): number {
  if (!result) return 0;
  if (Array.isArray(result) && result.length > 0 && typeof result[0] === "object" && result[0] !== null) {
    if ("id" in result[0]) {
      const idVal = (result[0] as { id?: unknown }).id;
      const num = typeof idVal === "number" ? idVal : Number(idVal);
      if (Number.isSafeInteger(num) && num > 0) return num;
    }
  }
  const header = Array.isArray(result) ? result[0] : result;
  if (!header || typeof header !== "object") return 0;
  const value = (header as { insertId?: unknown }).insertId;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : 0;
}

