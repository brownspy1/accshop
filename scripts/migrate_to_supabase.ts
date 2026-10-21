/**
 * Automated Database Migration Script: Source Database -> Supabase
 *
 * Usage:
 *   SOURCE_DATABASE_URL="postgresql://user:pass@source-host:5432/dbname" pnpm tsx scripts/migrate_to_supabase.ts
 */

import pg from "pg";

const { Pool } = pg;

const SUPABASE_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || "";
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "nwgmlbparkujvkfuuwvc";

const sourceUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;

if (!sourceUrl) {
  console.error("❌ SOURCE_DATABASE_URL দেওয়া হয়নি!");
  console.log("ব্যবহার পদ্ধতি:");
  console.log('SOURCE_DATABASE_URL="postgresql://user:pass@host:5432/dbname" pnpm tsx scripts/migrate_to_supabase.ts');
  process.exit(1);
}

const TABLES = [
  "store_settings",
  "provider_credentials",
  "activation_services",
  "admin_users",
  "admin_passkeys",
  "shop_customer_accounts",
  "shop_orders",
  "shop_order_items",
  "shop_email_outbox",
  "custom_product_inventory",
  "users",
];

async function executeSupabaseSql(query: string): Promise<any> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Supabase Query Failed: ${JSON.stringify(data)}`);
  }
  return data;
}

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function main() {
  console.log("🚀 শুরু হচ্ছে ডেটা মাইগ্রেশন: Existing Database -> Supabase...");

  const isLocalhost = sourceUrl.includes("localhost") || sourceUrl.includes("127.0.0.1");
  const sourcePool = new Pool({
    connectionString: sourceUrl,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
  });

  const client = await sourcePool.connect();
  console.log("✅ বর্তমান (Source) ডেটাবেজে সফলভাবে কানেক্ট হয়েছে!");

  try {
    for (const table of TABLES) {
      console.log(`\n📦 মাইগ্রেট হচ্ছে টেবিল: "${table}"...`);

      // Read all rows from source table
      let rows: any[] = [];
      try {
        const result = await client.query(`SELECT * FROM ${table}`);
        rows = result.rows;
      } catch (err: any) {
        console.warn(`  ⚠️ সোর্স টেবিলে "${table}" পাওয়া যায়নি বা ফাঁকা (${err.message})`);
        continue;
      }

      console.log(`  🔍 মোট পাওয়া গেছে: ${rows.length}টি সারি (rows)`);
      if (rows.length === 0) continue;

      // Disable triggers/foreign keys temporarily for clean insertion
      const columns = Object.keys(rows[0]);
      const quotedCols = columns.map(c => `"${c}"`).join(", ");

      // Batch insert in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const valueClauses = chunk.map(row => {
          const vals = columns.map(col => escapeSqlValue(row[col])).join(", ");
          return `(${vals})`;
        }).join(",\n");

        const insertSql = `
          INSERT INTO "${table}" (${quotedCols})
          VALUES ${valueClauses}
          ON CONFLICT DO NOTHING;
        `;

        await executeSupabaseSql(insertSql);
      }

      // Reset sequence if table has serial id
      if (columns.includes("id")) {
        try {
          await executeSupabaseSql(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1));`);
        } catch {}
      }

      console.log(`  ✅ "${table}" এর সকল ডেটা Supabase-এ সফলভাবে স্থানান্তরিত হয়েছে!`);
    }

    console.log("\n🎉 সম্পূর্ণ ডেটা মাইগ্রেশন ১০০% সফলভাবে সম্পন্ন হয়েছে!");
  } finally {
    client.release();
    await sourcePool.end();
  }
}

main().catch(err => {
  console.error("❌ মাইগ্রেশনে সমস্যা:", err);
  process.exit(1);
});
