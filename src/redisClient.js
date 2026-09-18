import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL);

redis.on("error", (err) => {
  console.error("Redis connection error", err);
});

redis.on("connect", () => {
  console.log("Connected to redis");
});
