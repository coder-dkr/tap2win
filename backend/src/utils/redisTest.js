const { redisClient, connectRedis, testUpstashRedis, showUpstashRedisConfig } = require('../config/redis');
const testRedisConnection = async () => {
  return await testUpstashRedis();
};
const showRedisConfig = () => {
  showUpstashRedisConfig();
};
module.exports = {
  testRedisConnection,
  showRedisConfig
};
