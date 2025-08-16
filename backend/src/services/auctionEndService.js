const { Auction, Bid, User, Notification } = require('../models');
const redisService = require('./redisService');
const emailService = require('./emailService');
const { broadcastToAuction, broadcastToUser, broadcastToAll, broadcastToAdmins } = require('../socket/socketManager');

class AuctionEndService {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
    this.processedStatusChanges = new Set(); // Track processed status changes
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Auction End Service started');
    
    // Check for auctions to end every 10 seconds for more responsive updates
    this.checkInterval = setInterval(async () => {
      await this.checkAndEndAuctions();
    }, 10000);
    
    // Cleanup processed status changes every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.processedStatusChanges.clear();
      console.log('Cleaned up processed status changes');
    }, 5 * 60 * 1000); // 5 minutes
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.processedStatusChanges.clear();
    this.isRunning = false;
    console.log('Auction End Service stopped');
  }

  async checkAndEndAuctions() {
    try {
      console.log('🔄 Auction End Service: Checking for status updates...');
      // Update auction statuses based on time (includes database updates)
      await this.updateAuctionStatuses();
      
      // Get auctions that should have ended
      const now = new Date();
      const endedAuctions = await Auction.findAll({
        where: {
          status: 'active',
          endTime: {
            [require('sequelize').Op.lte]: now
          }
        },
        include: [
          {
            model: Bid,
            as: 'bids',
            order: [['amount', 'DESC']],
            limit: 1,
            include: [{
              model: User,
              as: 'bidder',
              attributes: ['id', 'username', 'email']
            }]
          },
          {
            model: User,
            as: 'seller',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

      for (const auction of endedAuctions) {
        await this.endAuction(auction);
      }
    } catch (error) {
      console.error('Error checking auctions to end:', error);
    }
  }

  async updateAuctionStatuses() {
    try {
      const now = new Date();
      console.log(`🕐 Auction End Service: Current time: ${now.toISOString()}`);
      
      // Check pending auctions that should be active (WITH DATABASE UPDATE)
      const pendingToActive = await Auction.findAll({
        where: {
          status: 'pending',
          startTime: {
            [require('sequelize').Op.lte]: now
          },
          endTime: {
            [require('sequelize').Op.gt]: now
          }
        }
      });
      
      console.log(`📊 Found ${pendingToActive.length} pending auctions that should be active`);

      for (const auction of pendingToActive) {
        // Check if we've already processed this status change
        const statusChangeKey = `${auction.id}-pending-to-active`;
        if (this.processedStatusChanges.has(statusChangeKey)) {
          continue; // Skip if already processed
        }
        
        // Mark as processed
        this.processedStatusChanges.add(statusChangeKey);
        
        // ✅ DATABASE UPDATE: Update auction status to active
        await auction.update({ status: 'active' });
        
        // ✅ REAL-TIME: Broadcast auction started
        broadcastToAll({
          type: 'auctionStarted',
          auctionId: auction.id,
          auctionTitle: auction.title,
          status: 'active',
          startTime: auction.startTime,
          endTime: auction.endTime
        });
        
        console.log(`✅ Auction ${auction.id} started and updated in database: ${auction.title}`);
      }

      // Check active auctions that should be ended (WITH DATABASE UPDATE)
      const activeToEnded = await Auction.findAll({
        where: {
          status: 'active',
          endTime: {
            [require('sequelize').Op.lte]: now
          }
        },
        include: [
          {
            model: require('../models/Bid'),
            as: 'bids',
            order: [['amount', 'DESC']],
            limit: 1,
            include: [{
              model: require('../models/User'),
              as: 'bidder',
              attributes: ['id', 'username', 'email']
            }]
          },
          {
            model: require('../models/User'),
            as: 'seller',
            attributes: ['id', 'username', 'email']
          }
        ]
      });
      
      console.log(`📊 Found ${activeToEnded.length} active auctions that should be ended`);
      activeToEnded.forEach(auction => {
        console.log(`  - Auction ${auction.id}: "${auction.title}" (${auction.bids.length} bids)`);
        if (auction.bids.length > 0) {
          console.log(`    Highest bid: $${auction.bids[0].amount} by ${auction.bids[0].bidder?.username || 'Unknown'}`);
        }
      });

      for (const auction of activeToEnded) {
        // Check if we've already processed this status change
        const statusChangeKey = `${auction.id}-active-to-ended`;
        if (this.processedStatusChanges.has(statusChangeKey)) {
          continue; // Skip if already processed
        }
        
        // Mark as processed
        this.processedStatusChanges.add(statusChangeKey);
        
        // ✅ DATABASE UPDATE: Update auction status to ended and set seller decision
        const updateData = { 
          status: 'ended',
          endTime: new Date()
        };
        
        // Set seller decision to pending if there are bids
        if (auction.bids && auction.bids.length > 0) {
          updateData.sellerDecision = 'pending';
          updateData.currentPrice = auction.bids[0].amount;
          updateData.highestBidId = auction.bids[0].id;
          console.log(`✅ Setting seller decision to pending for auction ${auction.id} with ${auction.bids.length} bids`);
          console.log(`💰 Highest bid amount: ${auction.bids[0].amount}`);
        } else {
          console.log(`ℹ️ No bids found for auction ${auction.id}, not setting seller decision`);
        }
        
        console.log(`💾 Updating auction ${auction.id} with data:`, updateData);
        await auction.update(updateData);
        console.log(`✅ Successfully updated auction ${auction.id} in database`);
        
        // ✅ REAL-TIME: Broadcast auction ended
        broadcastToAll({
          type: 'auctionEnded',
          auctionId: auction.id,
          auctionTitle: auction.title,
          status: 'ended',
          startTime: auction.startTime,
          endTime: auction.endTime
        });
        
        console.log(`✅ Auction ${auction.id} ended and updated in database: ${auction.title}`);
        
        // If there are bids, also call endAuction for notifications and emails
        if (auction.bids && auction.bids.length > 0) {
          await this.endAuction(auction);
        }
      }
    } catch (error) {
      console.error('Error checking auction statuses:', error);
    }
  }

  async endAuction(auction) {
    try {
      console.log(`Processing end auction notifications: ${auction.id} - ${auction.title}`);

      // Note: Database updates are now handled in updateAuctionStatuses()
      // This method only handles notifications, emails, and broadcasts

      // Get winning bid and bidder
      const winningBid = auction.bids.length > 0 ? auction.bids[0] : null;
      const winner = winningBid ? winningBid.bidder : null;

      // ✅ REAL-TIME: Broadcast auction ended to all participants
      broadcastToAuction(auction.id, {
        type: 'auctionEnded',
        auctionId: auction.id,
        auctionTitle: auction.title,
        status: 'ended',
        currentPrice: auction.currentPrice,
        winner: winner ? {
          id: winner.id,
          username: winner.username
        } : null,
        hasWinner: !!winningBid,
        winningAmount: winningBid ? winningBid.amount : null,
        endTime: auction.endTime
      });

      // ✅ REAL-TIME: Broadcast to all users for activity feed
      broadcastToAll({
        type: 'systemActivity',
        activityType: 'auctionEnded',
        message: `Auction "${auction.title}" has ended ${winningBid ? `with a winning bid of $${winningBid.amount}` : 'with no bids'}`,
        timestamp: new Date().toISOString(),
        data: {
          auctionId: auction.id,
          hasWinner: !!winningBid,
          winningAmount: winningBid ? winningBid.amount : null
        }
      });

      // ✅ REAL-TIME: Notify admins about auction closure
      broadcastToAdmins({
        type: 'notification',
        notificationType: 'auctionEnded',
        title: 'Auction Ended',
        message: `Auction "${auction.title}" has ended ${winningBid ? `with winner: ${winner.username} ($${winningBid.amount})` : 'with no bids'}`,
        timestamp: new Date().toISOString(),
        auctionId: auction.id,
        isRead: false
      });

      // Create notifications
      await this.createAuctionEndNotifications(auction, winningBid, winner);

      // Send email notifications
      await this.sendAuctionEndEmails(auction, winningBid, winner);

      // Update Redis cache
      await redisService.removeActiveAuction(auction.id);
      await redisService.setAuctionStatus(auction.id, 'ended');

      console.log(`Auction ${auction.id} ended successfully`);
    } catch (error) {
      console.error(`Error ending auction ${auction.id}:`, error);
    }
  }

  async createAuctionEndNotifications(auction, winningBid, winner) {
    try {
      // Notify seller
      await Notification.create({
        userId: auction.seller.id,
        type: 'auction_ended',
        title: 'Auction Ended',
        message: `Your auction "${auction.title}" has ended. ${winningBid ? `Highest bid: $${winningBid.amount}` : 'No bids received'}`,
        data: {
          auctionId: auction.id,
          winningBidAmount: winningBid ? winningBid.amount : null,
          winnerId: winner ? winner.id : null
        }
      });

      // Notify seller via socket
      broadcastToUser(auction.seller.id, {
        type: 'notification',
        notificationType: 'auction_ended',
        title: 'Auction Ended',
        message: `Your auction "${auction.title}" has ended`,
        auctionId: auction.id
      });

      // Notify winner if exists
      if (winner) {
        await Notification.create({
          userId: winner.id,
          type: 'auction_won',
          title: 'Auction Won!',
          message: `Congratulations! You won the auction "${auction.title}" with a bid of $${winningBid.amount}`,
          data: {
            auctionId: auction.id,
            bidAmount: winningBid.amount
          }
        });

        // ✅ REAL-TIME: Notify winner via socket
        broadcastToUser(winner.id, {
          type: 'notification',
          notificationType: 'auctionWon',
          title: 'Congratulations! You Won!',
          message: `You won the auction "${auction.title}" with a bid of $${winningBid.amount}`,
          timestamp: new Date().toISOString(),
          auctionId: auction.id,
          isRead: false
        });

        // ✅ REAL-TIME: Broadcast winner announcement to ALL users
        broadcastToAll({
          type: 'winnerAnnouncement',
          auctionId: auction.id,
          auctionTitle: auction.title,
          winner: {
            id: winner.id,
            username: winner.username
          },
          winningAmount: winningBid.amount,
          timestamp: new Date().toISOString()
        });

        // ✅ REAL-TIME: Activity feed for all users
        broadcastToAll({
          type: 'systemActivity',
          activityType: 'auctionWon',
          message: `${winner.username} won "${auction.title}" for $${winningBid.amount}`,
          timestamp: new Date().toISOString(),
          data: {
            auctionId: auction.id,
            winnerId: winner.id,
            winningAmount: winningBid.amount
          }
        });
      }

      // Notify all other bidders that they didn't win
      if (winningBid) {
        const otherBidders = await Bid.findAll({
          where: {
            auctionId: auction.id,
            bidderId: {
              [require('sequelize').Op.ne]: winner.id
            }
          },
          include: [{
            model: User,
            as: 'bidder',
            attributes: ['id', 'username']
          }]
        });

        for (const bid of otherBidders) {
          await Notification.create({
            userId: bid.bidder.id,
            type: 'auction_lost',
            title: 'Auction Ended',
            message: `The auction "${auction.title}" has ended. You were outbid.`,
            data: {
              auctionId: auction.id,
              yourBidAmount: bid.amount,
              winningBidAmount: winningBid.amount
            }
          });

          // Notify via socket
          broadcastToUser(bid.bidder.id, {
            type: 'notification',
            notificationType: 'auction_lost',
            title: 'Auction Ended',
            message: `The auction "${auction.title}" has ended`,
            auctionId: auction.id
          });
        }
      }
    } catch (error) {
      console.error('Error creating auction end notifications:', error);
    }
  }

  async sendAuctionEndEmails(auction, winningBid, winner) {
    try {
      // Send email to seller
      await emailService.sendAuctionEndedEmail(auction.seller, auction, winningBid);

      // Send email to winner if exists
      if (winner) {
        await emailService.sendAuctionWonEmail(winner, auction, winningBid);
      }
    } catch (error) {
      console.error('Error sending auction end emails:', error);
    }
  }

  // Check for auctions ending soon (within 5 minutes) and send warnings
  async checkAuctionsEndingSoon() {
    try {
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      const auctionsEndingSoon = await Auction.findAll({
        where: {
          status: 'active',
          endTime: {
            [require('sequelize').Op.between]: [now, fiveMinutesFromNow]
          }
        },
        include: [{
          model: Bid,
          as: 'bids',
          include: [{
            model: User,
            as: 'bidder',
            attributes: ['id', 'username']
          }]
        }]
      });

      for (const auction of auctionsEndingSoon) {
        await this.sendEndingSoonNotifications(auction);
      }
    } catch (error) {
      console.error('Error checking auctions ending soon:', error);
    }
  }

  async sendEndingSoonNotifications(auction) {
    try {
      // Get unique bidders
      const bidders = auction.bids.map(bid => bid.bidder).filter((bidder, index, self) => 
        index === self.findIndex(b => b.id === bidder.id)
      );

      for (const bidder of bidders) {
        await Notification.create({
          userId: bidder.id,
          type: 'auction_ending_soon',
          title: 'Auction Ending Soon',
          message: `The auction "${auction.title}" ends in less than 5 minutes!`,
          data: {
            auctionId: auction.id,
            endTime: auction.endTime
          }
        });

        // Notify via socket
        broadcastToUser(bidder.id, {
          type: 'notification',
          notificationType: 'auction_ending_soon',
          title: 'Auction Ending Soon',
          message: `The auction "${auction.title}" ends soon!`,
          auctionId: auction.id
        });
      }
    } catch (error) {
      console.error('Error sending ending soon notifications:', error);
    }
  }
}

// Create singleton instance
const auctionEndService = new AuctionEndService();

module.exports = auctionEndService;
