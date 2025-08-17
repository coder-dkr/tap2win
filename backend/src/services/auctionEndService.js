const { Auction, Bid, User, Notification } = require('../models');
const redisService = require('./redisService');
const emailService = require('./emailService');
const { broadcastToAuction, broadcastToUser, broadcastToAll, broadcastToAdmins } = require('../socket/socketManager');
class AuctionEndService {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
    this.processedStatusChanges = new Set(); 
  }
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Auction End Service started');
    this.checkInterval = setInterval(async () => {
      await this.checkAndEndAuctions();
    }, 10000);
    this.cleanupInterval = setInterval(() => {
      this.processedStatusChanges.clear();
      console.log('Cleaned up processed status changes');
    }, 5 * 60 * 1000); 
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
      await this.updateAuctionStatuses();
    } catch (error) {
      console.error('Error checking auctions to end:', error);
    }
  }
  async updateAuctionStatuses() {
    try {
      const now = new Date();
      console.log(`🕐 Auction End Service: Current time: ${now.toISOString()}`);
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
        const statusChangeKey = `${auction.id}-pending-to-active`;
        if (this.processedStatusChanges.has(statusChangeKey)) {
          continue; 
        }
        this.processedStatusChanges.add(statusChangeKey);
        await auction.update({ status: 'active' });
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
        const statusChangeKey = `${auction.id}-active-to-ended`;
        if (this.processedStatusChanges.has(statusChangeKey)) {
          continue; 
        }
        this.processedStatusChanges.add(statusChangeKey);
        const updateData = { 
          status: 'ended',
          endTime: new Date()
        };
        if (auction.bids && auction.bids.length > 0) {
          updateData.sellerDecision = 'pending';
          updateData.currentPrice = auction.bids[0].amount;
          updateData.highestBidId = auction.bids[0].id;
          updateData.winnerId = auction.bids[0].bidderId;
          console.log(`✅ Setting seller decision to pending for auction ${auction.id} with ${auction.bids.length} bids`);
          console.log(`💰 Highest bid amount: ${auction.bids[0].amount}`);
          console.log(`🏆 Winner ID: ${auction.bids[0].bidderId}`);
        } else {
          console.log(`ℹ️ No bids found for auction ${auction.id}, not setting seller decision`);
        }
        console.log(`💾 Updating auction ${auction.id} with data:`, updateData);
        await auction.update(updateData);
        console.log(`✅ Successfully updated auction ${auction.id} in database`);
        
        // Update Redis cache with new auction data
        try {
          const updatedAuction = await Auction.findByPk(auction.id, {
            include: [
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
            ]
          });
          
          if (updatedAuction) {
            await redisService.syncAuctionWithDatabase(auction.id, Auction);
            console.log(`✅ Synced Redis with database for auction ${auction.id} with sellerDecision: ${updatedAuction.sellerDecision}`);
          }
        } catch (error) {
          console.error(`❌ Error updating Redis cache for auction ${auction.id}:`, error);
        }
        
        console.log(`📡 Broadcasting auction ended to all users`);
        broadcastToAll({
          type: 'auctionEnded',
          auctionId: auction.id,
          auctionTitle: auction.title,
          status: 'ended',
          startTime: auction.startTime,
          endTime: auction.endTime,
          hasWinner: auction.bids && auction.bids.length > 0,
          sellerDecision: auction.bids && auction.bids.length > 0 ? 'pending' : null
        });
        
        console.log(`✅ Auction ${auction.id} ended and updated in database: ${auction.title}`);
        
        if (auction.bids && auction.bids.length > 0) {
          console.log(`🏆 Processing winner announcement for auction ${auction.id}`);
          await this.endAuction(auction);
        } else {
          console.log(`ℹ️ No bids for auction ${auction.id}, skipping endAuction processing`);
        }
      }
    } catch (error) {
      console.error('Error checking auction statuses:', error);
    }
  }




  async endAuction(auction) {
    try {
      console.log(`🏆 Processing end auction notifications: ${auction.id} - ${auction.title}`);
      const winningBid = auction.bids.length > 0 ? auction.bids[0] : null;
      const winner = winningBid ? winningBid.bidder : null;
      
      console.log(`📡 Broadcasting auction ended to auction room ${auction.id}`);
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
        endTime: auction.endTime,
        sellerDecision: 'pending'
      });
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
            broadcastToAdmins({
        type: 'notification',
        notificationType: 'auctionEnded',
        title: 'Auction Ended',
        message: `Auction "${auction.title}" has ended ${winningBid ? `with winner: ${winner.username} ($${winningBid.amount})` : 'with no bids'}`,
        timestamp: new Date().toISOString(),
        auctionId: auction.id,
        isRead: false
      });
      await this.createAuctionEndNotifications(auction, winningBid, winner);
      await this.sendAuctionEndEmails(auction, winningBid, winner);
      await redisService.removeActiveAuction(auction.id);
      await redisService.setAuctionStatus(auction.id, 'ended');
      console.log(`Auction ${auction.id} ended successfully`);
    } catch (error) {
      console.error(`Error ending auction ${auction.id}:`, error);
    }
  }


  async createAuctionEndNotifications(auction, winningBid, winner) {
    try {
      await Notification.create({
        userId: auction.seller.id,
        type: 'auction_ended',
        title: 'Auction Ended',
        message: `Your auction "${auction.title}" has ended. ${winningBid ? `Winner: ${winner.username} with bid of $${winningBid.amount}. Please make your decision.` : 'No bids received'}`,
        data: {
          auctionId: auction.id,
          winningBidAmount: winningBid ? winningBid.amount : null,
          winnerId: winner ? winner.id : null,
          sellerDecision: winningBid ? 'pending' : null
        }
      });
      console.log(`📡 Broadcasting auction ended notification to seller ${auction.seller.id}`);
      broadcastToUser(auction.seller.id, {
        type: 'notification',
        notificationType: 'auction_ended',
        title: 'Auction Ended',
        message: `Your auction "${auction.title}" has ended. ${winningBid ? `Winner: ${winner.username} with bid of $${winningBid.amount}. Please make your decision.` : 'No bids received'}`,
        auctionId: auction.id,
        timestamp: new Date().toISOString(),
        isRead: false,
        sellerDecision: winningBid ? 'pending' : null,
        winner: winningBid ? {
          id: winner.id,
          username: winner.username,
          bidAmount: winningBid.amount
        } : null
      });
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
        console.log(`🏆 Broadcasting winner announcement to winner ${winner.id}`);
        broadcastToUser(winner.id, {
          type: 'notification',
          notificationType: 'auctionWon',
          title: 'Congratulations! You Won!',
          message: `You won the auction "${auction.title}" with a bid of $${winningBid.amount}`,
          timestamp: new Date().toISOString(),
          auctionId: auction.id,
          isRead: false
        });
        
        console.log(`📢 Broadcasting winner announcement to all users`);
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
        
        console.log(`🤝 Broadcasting seller decision interface activation`);
        broadcastToUser(auction.seller.id, {
          type: 'sellerDecisionInterface',
          auctionId: auction.id,
          auctionTitle: auction.title,
          winner: {
            id: winner.id,
            username: winner.username
          },
          winningAmount: winningBid.amount,
          sellerDecision: 'pending',
          timestamp: new Date().toISOString()
        });
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
      await emailService.sendAuctionEndedEmail(auction.seller, auction, winningBid);
      if (winner) {
        await emailService.sendAuctionWonEmail(winner, auction, winningBid);
      }
    } catch (error) {
      console.error('Error sending auction end emails:', error);
    }
  }
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
const auctionEndService = new AuctionEndService();
module.exports = auctionEndService;
