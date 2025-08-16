const { redisClient } = require('../config/redis');

class RedisService {
  // Auction-related cache operations
  async setAuctionHighestBid(auctionId, bidData) {
    const key = `auction:${auctionId}:highest_bid`;
    await redisClient.set(key, JSON.stringify(bidData), { ex: 3600 }); // 1 hour expiry
  }

  async getAuctionHighestBid(auctionId) {
    const key = `auction:${auctionId}:highest_bid`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setAuctionBidCount(auctionId, count) {
    const key = `auction:${auctionId}:bid_count`;
    await redisClient.set(key, count.toString(), { ex: 3600 });
  }

  async getAuctionBidCount(auctionId) {
    const key = `auction:${auctionId}:bid_count`;
    const count = await redisClient.get(key);
    return count ? parseInt(count) : 0;
  }

  async incrementAuctionBidCount(auctionId) {
    const key = `auction:${auctionId}:bid_count`;
    return await redisClient.incr(key);
  }

  // Active auction tracking
  async addActiveAuction(auctionId, endTime) {
    const score = new Date(endTime).getTime();
    await redisClient.zadd('active_auctions', { score, member: auctionId });
  }

  async removeActiveAuction(auctionId) {
    await redisClient.zrem('active_auctions', auctionId);
  }

  async getActiveAuctions() {
    return await redisClient.zrange('active_auctions', 0, -1);
  }

  async getAuctionsEndingSoon(minutes = 5) {
    const now = Date.now();
    const future = now + (minutes * 60 * 1000);
    return await redisClient.zrangebyscore('active_auctions', now, future);
  }

  // User session management
  async setUserSession(userId, sessionData) {
    const key = `user:${userId}:session`;
    await redisClient.set(key, JSON.stringify(sessionData), { ex: 86400 }); // 24 hours
  }

  async getUserSession(userId) {
    const key = `user:${userId}:session`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteUserSession(userId) {
    const key = `user:${userId}:session`;
    await redisClient.del(key);
  }

  // Notification queue
  async addNotificationToQueue(notification) {
    await redisClient.lpush('notification_queue', JSON.stringify(notification));
  }

  async getNotificationFromQueue() {
    const data = await redisClient.rpop('notification_queue');
    return data ? JSON.parse(data) : null;
  }

  // Rate limiting
  async checkRateLimit(key, limit, window) {
    const current = await redisClient.incr(key);
    if (current === 1) {
      await redisClient.expire(key, window);
    }
    return current <= limit;
  }

  // Auction room participants
  async addAuctionParticipant(auctionId, userId) {
    const key = `auction:${auctionId}:participants`;
    await redisClient.sadd(key, userId);
    await redisClient.expire(key, 7200); // 2 hours
  }

  async removeAuctionParticipant(auctionId, userId) {
    const key = `auction:${auctionId}:participants`;
    await redisClient.srem(key, userId);
  }

  async getAuctionParticipants(auctionId) {
    const key = `auction:${auctionId}:participants`;
    return await redisClient.smembers(key);
  }

  // Cache auction data
  async cacheAuction(auctionId, auctionData) {
    const key = `auction:${auctionId}:data`;
    await redisClient.set(key, JSON.stringify(auctionData), { ex: 1800 }); // 30 minutes
  }

  async getCachedAuction(auctionId) {
    const key = `auction:${auctionId}:data`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteCachedAuction(auctionId) {
    const key = `auction:${auctionId}:data`;
    await redisClient.del(key);
  }

  // Set auction status
  async setAuctionStatus(auctionId, status) {
    const key = `auction:${auctionId}:status`;
    await redisClient.set(key, status, { ex: 7200 }); // 2 hours
  }

  async getAuctionStatus(auctionId) {
    const key = `auction:${auctionId}:status`;
    return await redisClient.get(key);
  }

  // General cache operations
  async set(key, value, ttl = 3600) {
    await redisClient.set(key, JSON.stringify(value), { ex: ttl });
  }

  async get(key) {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  async del(key) {
    await redisClient.del(key);
  }

  async exists(key) {
    return await redisClient.exists(key);
  }

  // Clean up expired data
  async cleanup() {
    const now = Date.now();
    // Remove expired auctions from active list
    await redisClient.zremrangebyscore('active_auctions', 0, now);
  }
}

module.exports = new RedisService();
