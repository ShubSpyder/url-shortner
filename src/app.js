import express from "express";
import { errorHandler } from "./middlewares/errorHandler.js";
import { pool } from "./db/dbConnection.js";
import { createUrlTable } from "./db/migrate.js";
import urlRoutes from "./routes/urlRoutes.js";

const app = express();

app.use(express.json());

app.use("/api", urlRoutes);

app.use(errorHandler);

createUrlTable();

pool.connect((err, client, release) => {
  console.log("Connecting to database");
  if (err) {
    console.error("Error aquiring client ", err.stack);
  } else {
    console.info("Connected to database");
    release();
  }
});

export default app;
