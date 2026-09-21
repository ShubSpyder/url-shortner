import pg from "pg";

const { Pool } = pg;

console.log("PGURL: ", process.env.PGURL);
export const pool = new Pool({
  connectionString: process.env.PGURL,
  connectionTimeoutMillis: 7000,
});

pool.on("error", (err) => {
  console.error("PG connection error : ", err);
});

export default pool;