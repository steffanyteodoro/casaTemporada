import { Pool, types } from "pg";

// ------------------------------------------------------------
// Type parsers: garantem que os dados cheguem no formato que o
// app espera (datas como 'YYYY-MM-DD', timestamps em ISO, numéricos
// como number em vez de string).
// ------------------------------------------------------------
types.setTypeParser(1082, (v) => v); // date        -> 'YYYY-MM-DD'
types.setTypeParser(1184, (v) => (v ? new Date(v).toISOString() : v)); // timestamptz -> ISO
types.setTypeParser(1114, (v) => (v ? new Date(v + "Z").toISOString() : v)); // timestamp -> ISO
types.setTypeParser(1700, (v) => parseFloat(v)); // numeric -> number

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn("[db] DATABASE_URL ausente. Configure o .env / docker-compose.");
    }
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

export async function queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
