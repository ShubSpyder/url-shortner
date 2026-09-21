import { customAlphabet } from "nanoid";
import { pool } from "../db/dbConnection.js";
import { redis } from "../redisClient.js";

export const shortenUrl = async (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ message: "Original URL is required" });
  }

  const generateRandomString = customAlphabet(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    7,
  );

  const randomString = generateRandomString();

  try {
    await pool.query("INSERT INTO urls (code, original_url) VALUES ($1, $2)", [
      randomString,
      originalUrl,
    ]);

    await redis.set(randomString, originalUrl, "EX", 60 * 60 * 24);

    return res
      .status(201)
      .json({ message: "URL shortened successfully", code: randomString });
  } catch (err) {
    if (err.code === "23505") {
      const result = await pool.query(
        "SELECT code FROM urls WHERE original_url = $1",
        [originalUrl],
      );
      const existingCode = result.rows[0].code;
      return res.status(200).json({
        message: "URL already exists, returning existing code",
        code: existingCode,
      });
    }
  }
};

export const redirectUrl = async (req, res) => {
  const { code } = req.params;

  try {
    const cachedUrl = await redis.get(code);
    if (cachedUrl) {
      console.log("Cache hit for code:", code);
      return res.redirect(cachedUrl);
    }

    const result = await pool.query(
      "SELECT original_url FROM urls WHERE code = $1",
      [code],
    );

    await redis.set(code, result.rows[0].original_url, "EX", 60 * 60 * 24);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "URL not found" });
    }

    const originalUrl = result.rows[0].original_url;
    return res.redirect(originalUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
