const { Redis } = require('@upstash/redis');
require('dotenv').config();

// Upstash Redis client configuration
const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const connectRedis = async () => {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables are required');
    }

    console.log('🔗 Connecting to Upstash Redis...');
    
    // Test the connection with a simple ping
    const pong = await redisClient.ping();
    if (pong === 'PONG') {
      console.log('✅ Upstash Redis connected successfully');
      console.log('✅ Upstash Redis ping successful');
    } else {
      throw new Error('Unexpected response from Upstash Redis ping');
    }
    
  } catch (error) {
    console.error('❌ Upstash Redis connection failed:', error.message);
    console.error('Please check your Upstash Redis configuration:');
    console.error('- UPSTASH_REDIS_REST_URL should be your Upstash REST URL');
    console.error('- UPSTASH_REDIS_REST_TOKEN should be your Upstash REST token');
    console.error('Get these from your Upstash dashboard at https://console.upstash.com/');
    process.exit(1);
  }
};

/**
 * Test Upstash Redis connection and basic operations
 */
const testUpstashRedis = async () => {
  try {
    console.log('🧪 Testing Upstash Redis operations...');
    
    // Test basic set/get operations
    await redisClient.set('test:connection', 'success', { ex: 60 });
    const result = await redisClient.get('test:connection');
    
    if (result === 'success') {
      console.log('✅ Upstash Redis basic operations successful');
      
      // Test auction-related operations
      const auctionData = {
        id: 1,
        amount: 100,
        bidderId: 1,
        bidTime: new Date().toISOString()
      };
      
      await redisClient.set('test:auction:123:highest_bid', JSON.stringify(auctionData), { ex: 300 });
      const bidData = await redisClient.get('test:auction:123:highest_bid');
      
      if (bidData) {
        // Upstash Redis returns parsed object directly, no need to parse again
        if (bidData.amount === 100) {
          console.log('✅ Upstash Redis auction data operations successful');
        }
      }
      
      // Test list operations (for bid history)
      await redisClient.lpush('test:auction:123:bids', 'bid1');
      await redisClient.lpush('test:auction:123:bids', 'bid2');
      await redisClient.lpush('test:auction:123:bids', 'bid3');
      const bidList = await redisClient.lrange('test:auction:123:bids', 0, -1);
      if (bidList.length === 3) {
        console.log('✅ Upstash Redis list operations successful');
      }
      
      // Test hash operations (for user sessions)
      await redisClient.hset('test:user:123', 'username', 'testuser');
      await redisClient.hset('test:user:123', 'lastActive', new Date().toISOString());
      const userData = await redisClient.hgetall('test:user:123');
      if (userData && userData.username === 'testuser') {
        console.log('✅ Upstash Redis hash operations successful');
      }
      
      // Clean up test data
      await redisClient.del('test:connection');
      await redisClient.del('test:auction:123:highest_bid');
      await redisClient.del('test:auction:123:bids');
      await redisClient.del('test:user:123');
      
      console.log('✅ Upstash Redis test completed successfully');
      return true;
    } else {
      console.error('❌ Upstash Redis test failed - unexpected result');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Upstash Redis test failed:', error.message);
    return false;
  }
};

/**
 * Display Upstash Redis configuration info (without sensitive data)
 */
const showUpstashRedisConfig = () => {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!restUrl || !restToken) {
    console.error('❌ Upstash Redis configuration not found');
    console.error('Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
    return;
  }
  
  try {
    const url = new URL(restUrl);
    console.log('📋 Upstash Redis Configuration:');
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Region: ${url.hostname.split('.')[0]}`);
    console.log(`   REST URL: ${url.protocol}//${url.hostname}`);
    console.log(`   REST Token: ${restToken.substring(0, 8)}...`);
    console.log('   Database Type: Upstash Redis (REST API)');
  } catch (error) {
    console.error('❌ Invalid UPSTASH_REDIS_REST_URL format');
  }
};

module.exports = { 
  redisClient, 
  connectRedis, 
  testUpstashRedis, 
  showUpstashRedisConfig 
};
