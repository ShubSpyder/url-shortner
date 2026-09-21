import { customAlphabet } from "nanoid";

export const shortenUrl = async (req, res) => {
    const { originalUrl } = req.body;

    if (!originalUrl) {
        return res.status(400).json({ message: "Original URL is required" });
    }

    const url = new URL(originalUrl);

    const generateRandomString = customAlphabet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 7);

    const randomString = generateRandomString();

    try {
        await pool.query("INSERT INTO urls (code, original_url) VALUES ($1, $2)", [randomString, originalUrl]);
        return res.status(201).json({ message: "URL shortened successfully", code: randomString });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ message: "URL already exists" });
        }
    }
};