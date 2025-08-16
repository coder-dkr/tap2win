const { redisClient, connectRedis, testUpstashRedis, showUpstashRedisConfig } = require('../config/redis');

/**
 * Test Upstash Redis connection and basic operations
 * This utility helps verify Upstash Redis configuration
 */
const testRedisConnection = async () => {
  return await testUpstashRedis();
};

/**
 * Display Upstash Redis configuration info (without sensitive data)
 */
const showRedisConfig = () => {
  showUpstashRedisConfig();
};

module.exports = {
  testRedisConnection,
  showRedisConfig
};
