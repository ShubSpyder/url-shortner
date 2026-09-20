import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.PGURL,
});

pool.on("error", (err) => {
  console.error("PG connection error : ", err);
});

export default pool;