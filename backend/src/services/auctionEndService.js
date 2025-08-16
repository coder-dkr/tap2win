const { Auction, Bid, User, Notification } = require('../models');
const redisService = require('./redisService');
const emailService = require('./emailService');
const { broadcastToAuction, broadcastToUser } = require('../socket/socketManager');

class AuctionEndService {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Auction End Service started');
    
    // Check for auctions to end every 30 seconds
    this.checkInterval = setInterval(async () => {
      await this.checkAndEndAuctions();
    }, 30000);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('Auction End Service stopped');
  }

  async checkAndEndAuctions() {
    try {
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

  async endAuction(auction) {
    try {
      console.log(`Ending auction: ${auction.id} - ${auction.title}`);

      // Update auction status
      auction.status = 'ended';
      auction.endTime = new Date();
      
      // Set current price to highest bid if exists
      if (auction.bids.length > 0) {
        auction.currentPrice = auction.bids[0].amount;
        auction.highestBidId = auction.bids[0].id;
      }
      
      await auction.save();

      // Get winning bid and bidder
      const winningBid = auction.bids.length > 0 ? auction.bids[0] : null;
      const winner = winningBid ? winningBid.bidder : null;

      // Broadcast auction ended to all participants
      broadcastToAuction(auction.id, {
        type: 'auctionEnded',
        auctionId: auction.id,
        status: 'ended',
        currentPrice: auction.currentPrice,
        winner: winner ? {
          id: winner.id,
          username: winner.username
        } : null,
        endTime: auction.endTime
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

        // Notify winner via socket
        broadcastToUser(winner.id, {
          type: 'notification',
          notificationType: 'auction_won',
          title: 'Auction Won!',
          message: `You won the auction "${auction.title}"`,
          auctionId: auction.id
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
