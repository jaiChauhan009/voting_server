// config/redis.js
const redis = require('redis');
require('dotenv').config();

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('connect', () => console.log('Redis Connected!'));
redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Connect to Redis only once when the application starts
(async () => {
  await redisClient.connect();
})();

module.exports = redisClient;