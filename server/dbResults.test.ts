import { describe, expect, it } from "vitest";
import { mysqlAffectedRows, mysqlInsertId } from "./dbResults";

describe("mysqlAffectedRows", () => {
  it("unwraps mysql2 Drizzle's ResultSetHeader array", () => {
    expect(mysqlAffectedRows([{ affectedRows: 1, insertId: 0 }, []])).toBe(1);
  });

  it("supports direct ResultSetHeader for compatible adapters", () => {
    expect(mysqlAffectedRows({ affectedRows: 1 })).toBe(1);
  });

  it("supports PostgreSQL QueryResult with rowCount", () => {
    expect(mysqlAffectedRows({ command: "UPDATE", rowCount: 1, rows: [] })).toBe(1);
    expect(mysqlAffectedRows({ command: "UPDATE", rowCount: 0, rows: [] })).toBe(0);
  });

  it("fails closed when no row was changed or a result is malformed", () => {
    expect(mysqlAffectedRows([{ affectedRows: 0 }, []])).toBe(0);
    expect(mysqlAffectedRows(undefined)).toBe(0);
    expect(mysqlAffectedRows([{}, []])).toBe(0);
  });

  it("unwraps insertId from the mysql2 result header", () => {
    expect(mysqlInsertId([{ insertId: 42, affectedRows: 1 }, []])).toBe(42);
    expect(mysqlInsertId({ insertId: 9 })).toBe(9);
    expect(mysqlInsertId([{ insertId: 0 }, []])).toBe(0);
  });

  it("unwraps insert id from PostgreSQL returning array", () => {
    expect(mysqlInsertId([{ id: 42 }])).toBe(42);
    expect(mysqlInsertId([{ id: "99" }])).toBe(99);
    expect(mysqlInsertId([])).toBe(0);
  });
});

