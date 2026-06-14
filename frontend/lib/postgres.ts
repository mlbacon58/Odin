import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

export const db = new Pool({
  connectionString,
});

export async function query<T = any>(text: string, params?: any[]) {
  return db.query<T>(text, params);
}