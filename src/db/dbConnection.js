import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  database: process.env.PGDATABASE,
});

pool.on("error", (err) => {
  console.error("PG connection error : ", err);
});

export default pool;