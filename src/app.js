import express from "express";
import { errorHandler } from "./middlewares/errorHandler.js";
import { pool } from "./db/dbConnection.js";
import { createUrlTable } from "./db/migrate.js";

const app = express();

app.use(express.json());
app.use(errorHandler);

createUrlTable();

pool.connect((err, client, release) => {
  if (err) {
    console.error("Error aquiring client ", err.stack);
  } else {
    console.info("Connected to database");
    release();
  }
});

export default app;
