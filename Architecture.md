There are two sides to this question: **architecturally** (where the code belongs) and **functionally** (what Redis should do during creation).

---

### 1. Architectural Answer: Put it in `urlService.js`, not the Controller
You already have a [src/services/urlService.js](file:///Users/shubh/Coding/NodeJs/url-shortner/src/services/urlService.js) file. In standard backend architecture:

* **Controller's job (`urlController.js`)**: Handle HTTP concerns only.
  * Extract `req.body` or `req.params`.
  * Validate inputs.
  * Send HTTP status codes (`res.status(201)...`, `res.status(400)...`).
* **Service's job (`urlService.js`)**: Handle business logic and data access.
  * Talk to PostgreSQL (`pool.query`).
  * Talk to Redis (`redis.set`, `redis.get`).

If you put both Postgres and Redis operations directly inside `urlController.js`, the controller will quickly become bloated and hard to test.

---

### 2. Functional Answer: Should you use Redis during URL creation?
When creating a short URL (`shortenUrl`), you have two common caching strategies:

#### Strategy A: Pre-warming the Cache (Write on create)
Right after saving to PostgreSQL, you immediately store it in Redis:
```javascript
// In your service after PG insert:
await redis.set(code, originalUrl, "EX", 86400); // Expires in 24 hrs
```
* **Pros**: The very first time anyone clicks the link, it is **instantly a cache hit** without touching PostgreSQL.
* **Cons**: Uses Redis RAM for links that might never actually be clicked.

#### Strategy B: Lazy Caching / Cache-Aside (Recommended for saving RAM)
* During `POST /shorten`: **Only write to PostgreSQL**. Do not touch Redis.
* During `GET /:code` (Redirect): Check Redis first. If it's a miss, fetch from PostgreSQL and **then** cache it in Redis for subsequent visitors.
* **Pros**: Only URLs that people actually visit consume valuable in-memory Redis storage.

---

### How they look working together cleanly

#### In [src/services/urlService.js](file:///Users/shubh/Coding/NodeJs/url-shortner/src/services/urlService.js):
```javascript
import pool from "../db/dbConnection.js";
import { redis } from "../redisClient.js";

export const createShortUrl = async (code, originalUrl) => {
    // 1. Save to PostgreSQL
    await pool.query(
        "INSERT INTO urls (code, original_url) VALUES ($1, $2)",
        [code, originalUrl]
    );

    // 2. (Optional) Pre-warm Redis cache with 24hr TTL
    await redis.set(code, originalUrl, "EX", 86400);

    return { code, originalUrl };
};
```

#### In [src/controllers/urlController.js](file:///Users/shubh/Coding/NodeJs/url-shortner/src/controllers/urlController.js):
```javascript
import { createShortUrl } from "../services/urlService.js";
import { customAlphabet } from "nanoid";

export const shortenUrl = async (req, res, next) => {
    const { originalUrl } = req.body;
    if (!originalUrl) {
        return res.status(400).json({ message: "Original URL is required" });
    }

    try {
        new URL(originalUrl); // validate format
    } catch {
        return res.status(400).json({ message: "Invalid URL format" });
    }

    const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 7);
    const code = nanoid();

    try {
        const result = await createShortUrl(code, originalUrl);
        return res.status(201).json({ message: "URL shortened successfully", data: result });
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({ message: "Short code collision, please try again" });
        }
        next(err); // passes any other unexpected error to errorHandler
    }
};
```

### Summary
Keep your Redis calls inside **`urlService.js`**. You can optionally pre-warm the cache during creation, but **Redis is most critical in the redirect step (`GET /:code`)** to avoid hitting PostgreSQL on every redirect.