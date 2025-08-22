const { redisClient } = require('../config/redis');
class RedisService {
  async setAuctionHighestBid(auctionId, bidData) {
    const key = `auction:${auctionId}:highest_bid`;
    await redisClient.set(key, JSON.stringify(bidData), { ex: 3600 }); 
  }
  async getAuctionHighestBid(auctionId) {
    try {
      const key = `auction:${auctionId}:highest_bid`;
      const data = await redisClient.get(key);
      
      if (!data) {
        return null;
      }
      
      // Handle both string and object data
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch (parseError) {
          console.error('Error parsing Redis bid data:', parseError);
          return null;
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error getting auction highest bid:', error);
      return null;
    }
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
  async setUserSession(userId, sessionData) {
    const key = `user:${userId}:session`;
    await redisClient.set(key, JSON.stringify(sessionData), { ex: 86400 }); 
  }
  async getUserSession(userId) {
    const key = `user:${userId}:session`;
    const data = await redisClient.get(key);
    return data || null;
  }
  async deleteUserSession(userId) {
    const key = `user:${userId}:session`;
    await redisClient.del(key);
  }
  async addNotificationToQueue(notification) {
    await redisClient.lpush('notification_queue', JSON.stringify(notification));
  }
  async getNotificationFromQueue() {
    const data = await redisClient.rpop('notification_queue');
    return data || null;
  }
  async checkRateLimit(key, limit, window) {
    const current = await redisClient.incr(key);
    if (current === 1) {
      await redisClient.expire(key, window);
    }
    return current <= limit;
  }
  async addAuctionParticipant(auctionId, userId) {
    const key = `auction:${auctionId}:participants`;
    await redisClient.sadd(key, userId);
    await redisClient.expire(key, 7200); 
  }
  async removeAuctionParticipant(auctionId, userId) {
    const key = `auction:${auctionId}:participants`;
    await redisClient.srem(key, userId);
  }
  async getAuctionParticipants(auctionId) {
    const key = `auction:${auctionId}:participants`;
    return await redisClient.smembers(key);
  }
  async cacheAuction(auctionId, auctionData) {
    const key = `auction:${auctionId}:data`;
    await redisClient.set(key, JSON.stringify(auctionData), { ex: 1800 }); 
  }
  async getCachedAuction(auctionId) {
    try {
      const key = `auction:${auctionId}:data`;
      const data = await redisClient.get(key);
      return data || null;
    } catch (error) {
      console.error('Error getting cached auction:', error);
      return null;
    }
  }
  async deleteCachedAuction(auctionId) {
    const key = `auction:${auctionId}:data`;
    await redisClient.del(key);
  }
  async setAuctionStatus(auctionId, status) {
    const key = `auction:${auctionId}:status`;
    await redisClient.set(key, status, { ex: 7200 }); 
  }
  async getAuctionStatus(auctionId) {
    const key = `auction:${auctionId}:status`;
    return await redisClient.get(key);
  }
  async set(key, value, ttl = 3600) {
    await redisClient.set(key, JSON.stringify(value), { ex: ttl });
  }
  async get(key) {
    try {
      const data = await redisClient.get(key);
      return data || null;
    } catch (error) {
      console.error('Error getting from Redis:', error);
      return null;
    }
  }
  async del(key) {
    await redisClient.del(key);
  }
  async exists(key) {
    return await redisClient.exists(key);
  }
  async cleanup() {
    const now = Date.now();
    await redisClient.zremrangebyscore('active_auctions', 0, now);
  }

  // Utility function to update auction cache with full auction data
  async updateAuctionCache(auctionId, auctionData) {
    try {
      await this.cacheAuction(auctionId, auctionData);
      console.log(`✅ Updated Redis cache for auction ${auctionId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating Redis cache for auction ${auctionId}:`, error);
      return false;
    }
  }

  // Utility function to sync Redis with database - ensures consistency
  async syncAuctionWithDatabase(auctionId, Auction, includeAssociations = true) {
    try {
      // Get fresh data from database
      const includeOptions = includeAssociations ? [
        {
          model: require('../models/User'),
          as: 'seller',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: require('../models/Bid'),
          as: 'bids',
          include: [{
            model: require('../models/User'),
            as: 'bidder',
            attributes: ['id', 'username']
          }],
          order: [['amount', 'DESC']],
          limit: 10
        },
        {
          model: require('../models/CloudinaryFile'),
          as: 'images',
          attributes: ['id', 'url', 'filename', 'width', 'height']
        }
      ] : [];

      const freshAuction = await Auction.findByPk(auctionId, { include: includeOptions });
      
      if (freshAuction) {
        // Update Redis with fresh database data
        await this.cacheAuction(auctionId, freshAuction);
        console.log(`🔄 Synced Redis with database for auction ${auctionId}, sellerDecision: ${freshAuction.sellerDecision}`);
        return freshAuction;
      } else {
        console.error(`❌ Auction ${auctionId} not found in database for sync`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error syncing Redis with database for auction ${auctionId}:`, error);
      return null;
    }
  }

  // Utility function to force refresh auction cache from database
  async refreshAuctionCache(auctionId, Auction) {
    try {
      // Delete existing cache
      await this.deleteCachedAuction(auctionId);
      
      // Get fresh data and cache it
      const freshAuction = await this.syncAuctionWithDatabase(auctionId, Auction);
      
      if (freshAuction) {
        console.log(`🔄 Refreshed Redis cache for auction ${auctionId} from database`);
        return freshAuction;
      } else {
        console.error(`❌ Failed to refresh cache for auction ${auctionId}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error refreshing auction cache for ${auctionId}:`, error);
      return null;
    }
  }

  // Utility function to invalidate auction cache
  async invalidateAuctionCache(auctionId) {
    try {
      await this.deleteCachedAuction(auctionId);
      console.log(`🗑️ Invalidated Redis cache for auction ${auctionId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error invalidating Redis cache for auction ${auctionId}:`, error);
      return false;
    }
  }

  // Simple sync function to update Redis with database data
  async syncBidData(auctionId, bidData) {
    try {
      await this.setAuctionHighestBid(auctionId, bidData);
      console.log(`✅ Synced bid data for auction ${auctionId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to sync bid data for auction ${auctionId}:`, error);
      return false;
    }
  }

  // Simple function to get bid count from database and sync to Redis
  async syncBidCount(auctionId, bidCount) {
    try {
      await this.setAuctionBidCount(auctionId, bidCount);
      console.log(`✅ Synced bid count for auction ${auctionId}: ${bidCount}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to sync bid count for auction ${auctionId}:`, error);
      return false;
    }
  }
}
module.exports = new RedisService();
