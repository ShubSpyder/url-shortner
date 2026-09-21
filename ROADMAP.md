# URL Shortener — Project Roadmap

A step-by-step implementation guide to master **Node.js**, **PostgreSQL** (`pg`), and **Redis** (`ioredis`).

---

## 📌 Architecture & Data Flow

```
[ Client / Browser ]
        │
        ▼
   [ Express ]
        │
        ├──> [ Controller ] ──> [ Service ]
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
          [ Redis Cache ]                    [ PostgreSQL ]
          (Fast Read / TTL)               (Persistent Storage)
```

---

## ⚠️ Pre-implementation Note

In [`src/app.js`](src/app.js), error handling middleware is currently mounted before routes:
```js
app.use(express.json());
app.use(errorHandler); // ⚠️ Move this after all your route definitions
```
> In Express, middleware functions execute sequentially. For `errorHandler` to catch errors thrown in controllers/services via `next(err)`, it **must be registered after all route handlers**.

---

## 🗺️ Implementation Phases

### Phase 1: Layered Project Architecture
Organize your codebase for maintainability and separation of concerns:

- [ ] Create `src/controllers/urlController.js`
- [ ] Create `src/routes/urlRoutes.js`
- [ ] Mount routes into `src/app.js` before `errorHandler`

**Request Lifecycle**:
`Client` → `Route` (maps endpoint) → `Controller` (validates HTTP req/res) → `Service` (business logic, DB, Redis) → `Client`

---

### Phase 2: Core Endpoints Specification

#### 1. Create Short URL
* **Method**: `POST`
* **Route**: `/api/shorten`
* **Body**:
  ```json
  {
    "originalUrl": "https://example.com/very/long/url"
  }
  ```
* **Response** (`201 Created`):
  ```json
  {
    "code": "aB3dE9",
    "shortUrl": "http://localhost:3100/aB3dE9",
    "originalUrl": "https://example.com/very/long/url"
  }
  ```

#### 2. Redirect to Original URL
* **Method**: `GET`
* **Route**: `/:code` (e.g. `http://localhost:3100/aB3dE9`)
* **Response**:
  * Success: HTTP `302 Found` (redirect to target URL via `res.redirect(302, originalUrl)`)
  * Failure: HTTP `404 Not Found`

---

### Phase 3: Service Layer & Cache-Aside Pattern (`src/services/urlService.js`)

#### A. Creating a Short URL (`shortenUrl`)
1. Validate input URL format (e.g., protocol check for `http://` or `https://`).
2. Generate a unique code with `nanoid(7)`.
3. Insert into PostgreSQL:
   ```sql
   INSERT INTO urls (code, original_url) 
   VALUES ($1, $2) 
   RETURNING id, code, original_url, created_at;
   ```
4. Pre-warm Redis cache with a Time-to-Live (TTL):
   ```js
   await redis.set(code, original_url, 'EX', 86400); // 24-hour expiration
   ```
5. Return the record.

#### B. Cache-Aside Pattern (`getOriginalUrl`)
1. **Check Redis Cache**:
   ```js
   const cachedUrl = await redis.get(code);
   if (cachedUrl) {
     return cachedUrl; // Cache Hit ⚡
   }
   ```
2. **Cache Miss -> Query PostgreSQL**:
   ```sql
   SELECT original_url FROM urls WHERE code = $1;
   ```
3. If not found in DB: return `null`.
4. If found in DB:
   - Store in Redis for future hits:
     ```js
     await redis.set(code, row.original_url, 'EX', 86400);
     ```
   - Return the original URL.

---

### Phase 4: Analytics & Click Tracking

Learn more PostgreSQL operations and atomic Redis data types:

#### Option A: Direct PostgreSQL Updates
* Add a `clicks` column in your migration:
  ```sql
  ALTER TABLE urls ADD COLUMN clicks INT DEFAULT 0;
  ```
* On each redirect:
  ```sql
  UPDATE urls SET clicks = clicks + 1 WHERE code = $1;
  ```

#### Option B: High-Performance Redis Counters (Recommended)
* Increment an atomic counter in Redis without blocking the redirect:
  ```js
  await redis.incr(`clicks:${code}`);
  ```
* Expose an analytics endpoint:
  * **Method**: `GET /api/analytics/:code`
  * Reads both total historical clicks from DB and current live counts from Redis.

---

### Phase 5: Advanced Exercises to Level Up

- [ ] **Rate Limiting with Redis**:
  - Implement a middleware tracking IP requests using Redis key expiration (e.g. max 20 requests/minute per IP).
- [ ] **Custom Aliases**:
  - Allow users to pass a custom code `{ "originalUrl": "...", "customCode": "my-portfolio" }`.
  - Handle duplicate key errors from Postgres (`error.code === '23505'`).
- [ ] **Database Connection Pooling**:
  - Learn difference between `pool.query()` (auto-releases client) and `pool.connect()` (manual acquisition and release for transactions).
- [ ] **Database Transactions (`pg`)**:
  - Practice multi-query transactions using `BEGIN`, `COMMIT`, and `ROLLBACK`.

---

## 🧪 Testing Checklist

- [ ] Test creating a valid URL via cURL / Postman.
- [ ] Check PostgreSQL CLI (`psql`) to verify the row is saved.
- [ ] Check Redis CLI (`redis-cli get <code>`) to verify it is cached.
- [ ] Hit `/:code` in your browser and verify redirect occurs.
- [ ] Verify non-existent code returns a clean `404 Not Found`.
- [ ] Verify invalid URL input returns `400 Bad Request`.
