import pool from "./dbConnection.js";

export const createUrlTable = async () => {
  try {
    await pool.query(`
            CREATE TABLE IF NOT EXISTS urls(
             id SERIAL PRIMARY KEY,
             code VARCHAR(12) UNIQUE NOT NULL,
             original_url UNIQUE TEXT NOT NULL,
             created_at TIMESTAMP NOT NULL DEFAULT now()
            )
            `);
    console.log('Urls table created::')
  } catch (err) {
    console.error("Error while creating urls table :: ", err);
  }
};
