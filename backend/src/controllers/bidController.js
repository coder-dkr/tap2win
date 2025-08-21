const { Bid, Auction, User, Notification } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const redisService = require('../services/redisService');
const emailService = require('../services/emailService');
const { broadcastToAuction, broadcastToUser, broadcastToAll } = require('../socket/socketManager');
const { sequelize } = require('../config/database');
const { debugBidCreation } = require('../utils/bidDebug');

const placeBid = asyncHandler(async (req, res) => {
  const { auctionId } = req.params;
  const { amount } = req.body;
  const bidderId = req.user.id;

  // Validate input parameters
  if (!auctionId || !amount || !bidderId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: auctionId, amount, or bidderId'
    });
  }

  // Convert amount to number and validate
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Bid amount must be a positive number'
    });
  }

  // Start database transaction
  const transaction = await sequelize.transaction();

  try {
    // Get auction details
    const auction = await Auction.findByPk(auctionId, {
      include: [{
        model: User,
        as: 'seller',
        attributes: ['id', 'username', 'firstName', 'lastName', 'email']
      }],
      transaction
    });

    if (!auction) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Check if auction is active
    if (!auction.canBid()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Auction is not active for bidding'
      });
    }

    // Check if seller is trying to bid on their own auction
    if (auction.sellerId === bidderId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'You cannot bid on your own auction'
      });
    }

    // Get current highest bid from Redis with proper error handling
    let currentHighestBid = null;
    try {
      const redisBidData = await redisService.getAuctionHighestBid(auctionId);
      if (redisBidData) {
        // Parse JSON if it's a string
        if (typeof redisBidData === 'string') {
          currentHighestBid = JSON.parse(redisBidData);
        } else {
          currentHighestBid = redisBidData;
        }
      }
    } catch (redisError) {
      console.error('Error getting highest bid from Redis:', redisError);
      // Continue without Redis data, will use database
    }

    // Fallback: Get highest bid from database if Redis failed
    if (!currentHighestBid) {
      try {
        const dbHighestBid = await Bid.findOne({
          where: { 
            auctionId,
            isWinning: true 
          },
          order: [['amount', 'DESC']],
          transaction
        });
        
        if (dbHighestBid) {
          currentHighestBid = {
            id: dbHighestBid.id,
            amount: dbHighestBid.amount,
            bidderId: dbHighestBid.bidderId,
            bidTime: dbHighestBid.bidTime
          };
        }
      } catch (dbError) {
        console.error('Error getting highest bid from database:', dbError);
      }
    }

    const currentPrice = currentHighestBid ? currentHighestBid.amount : auction.startingPrice;

    // Validate bid amount
    const minimumBid = currentPrice + auction.bidIncrement;
    if (numericAmount < minimumBid) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Bid must be at least $${minimumBid.toFixed(2)}`
      });
    }

    // Check rate limiting with error handling
    let canBid = true;
    try {
      const rateLimitKey = `bid_limit:${bidderId}:${auctionId}`;
      canBid = await redisService.checkRateLimit(rateLimitKey, 10, 60); // 10 bids per minute
    } catch (rateLimitError) {
      console.error('Error checking rate limit:', rateLimitError);
      // Continue without rate limiting if Redis fails
    }
    
    if (!canBid) {
      await transaction.rollback();
      return res.status(429).json({
        success: false,
        message: 'Too many bids. Please wait before bidding again.'
      });
    }

    // Create the bid
    const bid = await Bid.create({
      auctionId,
      bidderId,
      amount: numericAmount
    }, { transaction });

    // Update previous highest bid status if exists
    if (currentHighestBid && currentHighestBid.id) {
      await Bid.update(
        { isWinning: false, status: 'outbid' },
        { 
          where: { id: currentHighestBid.id },
          transaction 
        }
      );
    }

    // Mark new bid as winning
    await bid.update({ isWinning: true, status: 'winning' }, { transaction });

    // Update auction's current price and highest bid
    await auction.update({
      currentPrice: numericAmount,
      highestBidId: bid.id
    }, { transaction });

    // Update Redis cache with error handling
    try {
      const bidData = {
        id: bid.id,
        amount: numericAmount,
        bidderId: bid.bidderId,
        bidderUsername: req.user.username,
        bidTime: bid.bidTime
      };

      await redisService.setAuctionHighestBid(auctionId, bidData);
      await redisService.incrementAuctionBidCount(auctionId);
      await redisService.addAuctionParticipant(auctionId, bidderId);
      
      // Sync Redis with database to ensure consistency
      try {
        const updatedAuction = await redisService.syncAuctionWithDatabase(auctionId, Auction);
        if (updatedAuction) {
          console.log(`✅ Synced Redis with database for auction ${auctionId} after new bid`);
        }
      } catch (syncError) {
        console.error(`❌ Error syncing Redis with database for auction ${auctionId}:`, syncError);
      }
    } catch (redisError) {
      console.error('Error updating Redis cache:', redisError);
      // Continue without Redis updates
    }

    // Get updated auction with bid count
    let bidCount = 0;
    try {
      bidCount = await redisService.getAuctionBidCount(auctionId);
    } catch (countError) {
      console.error('Error getting bid count from Redis:', countError);
      // Get count from database as fallback
      const dbBidCount = await Bid.count({ where: { auctionId }, transaction });
      bidCount = dbBidCount;
    }

    // Load bidder info for response
    const bidWithBidder = await Bid.findByPk(bid.id, {
      include: [{
        model: User,
        as: 'bidder',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }],
      transaction
    });

    // Commit transaction
    await transaction.commit();

    // ✅ REAL-TIME: Emit detailed bid update to all auction participants
    try {
      const webSocketMessage = {
        type: 'newBid',
        auctionId: auction.id,
        bid: bidWithBidder.toPublic(),
        auction: {
          id: auction.id,
          currentPrice: numericAmount,
          bidCount,
          highestBidId: bid.id,
          updatedAt: new Date().toISOString()
        }
      };
      console.log('📡 Broadcasting newBid WebSocket message:', JSON.stringify(webSocketMessage, null, 2));
      broadcastToAuction(auctionId, webSocketMessage);

      // ✅ REAL-TIME: Also broadcast to all users for auction list updates
      broadcastToAll({
        type: 'auctionUpdate',
        auctionId: auction.id,
        auction: {
          id: auction.id,
          currentPrice: numericAmount,
          bidCount,
          highestBidId: bid.id,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (socketError) {
      console.error('Error broadcasting WebSocket message:', socketError);
    }

    // Create notifications with error handling
    try {
      console.log(`🔔 Creating new bid notification for seller ${auction.sellerId} on auction ${auction.id}`);
      // Notify seller
      await Notification.create({
        userId: auction.sellerId,
        type: 'new_bid',
        title: 'New Bid Received',
        message: `${req.user.username} placed a bid of $${numericAmount} on ${auction.title}`,
        data: {
          auctionId: auction.id,
          bidAmount: numericAmount,
          bidderId: req.user.id
        }
      });

      // Notify seller via socket
      try {
        console.log(`📡 Broadcasting new bid notification to seller ${auction.sellerId}`);
        broadcastToUser(auction.sellerId, {
          type: 'notification',
          notificationType: 'new_bid',
          title: 'New Bid Received',
          message: `${req.user.username} placed a bid of $${numericAmount} on ${auction.title}`,
          auctionId: auction.id,
          timestamp: new Date().toISOString(),
          isRead: false
        });
      } catch (socketError) {
        console.error('Error broadcasting notification to seller:', socketError);
      }

      // Notify previous highest bidder if exists
      if (currentHighestBid && currentHighestBid.bidderId !== bidderId) {
        await Notification.create({
          userId: currentHighestBid.bidderId,
          type: 'outbid',
          title: 'You\'ve been outbid',
          message: `Your bid on ${auction.title} has been outbid. Current highest bid: $${numericAmount}`,
          data: {
            auctionId: auction.id,
            previousBidAmount: currentHighestBid.amount,
            newBidAmount: numericAmount
          }
        });

        // Notify via socket
        try {
          broadcastToUser(currentHighestBid.bidderId, {
            type: 'notification',
            notificationType: 'outbid',
            title: 'You\'ve been outbid',
            message: `Your bid on ${auction.title} has been outbid`,
            auctionId: auction.id,
            timestamp: new Date().toISOString()
          });
        } catch (socketError) {
          console.error('Error broadcasting outbid notification:', socketError);
        }

        // Send email notification
        try {
          const previousBidder = await User.findByPk(currentHighestBid.bidderId);
          if (previousBidder) {
            emailService.sendOutbidNotification(previousBidder, auction, bid)
              .catch(err => console.error('Failed to send outbid email:', err));
          }
        } catch (emailError) {
          console.error('Error sending outbid email:', emailError);
        }
      }

    } catch (notificationError) {
      console.error('Error creating notifications:', notificationError);
      // Don't fail the entire request for notification errors
    }

    res.status(201).json({
      success: true,
      message: 'Bid placed successfully',
      data: {
        bid: bidWithBidder,
        auction: {
          id: auction.id,
          currentPrice: numericAmount,
          bidCount
        }
      }
    });

  } catch (error) {
    // Rollback transaction on any error
    await transaction.rollback();
    
    console.error('Error placing bid:', error);
    
    // Re-throw the error to be handled by the error handler middleware
    throw error;
  }
});

const getAuctionBids = asyncHandler(async (req, res) => {
  const { auctionId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const offset = (page - 1) * limit;

  const { count, rows: bids } = await Bid.findAndCountAll({
    where: { auctionId },
    include: [{
      model: User,
      as: 'buyer',
      attributes: ['id', 'username']
    }],
    order: [['amount', 'DESC'], ['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    success: true,
    data: {
      bids: bids.map(bid => bid.toPublic()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
});

const getBidById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const bid = await Bid.findByPk(id, {
    include: [
      {
        model: User,
        as: 'bidder',
        attributes: ['id', 'username', 'firstName', 'lastName']
      },
      {
        model: Auction,
        as: 'auction',
        attributes: ['id', 'title', 'sellerId']
      }
    ]
  });

  if (!bid) {
    return res.status(404).json({
      success: false,
      message: 'Bid not found'
    });
  }

  // Check if user can view this bid
  if (bid.bidderId !== req.user.id && 
      bid.auction.sellerId !== req.user.id && 
      req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'You can only view your own bids or bids on your auctions'
    });
  }

  res.json({
    success: true,
    data: {
      bid
    }
  });
});

const deleteBid = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const bid = await Bid.findByPk(id, {
    include: [{
      model: Auction,
      as: 'auction'
    }]
  });

  if (!bid) {
    return res.status(404).json({
      success: false,
      message: 'Bid not found'
    });
  }

  // Check permissions
  if (bid.bidderId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'You can only delete your own bids'
    });
  }

  // Check if auction is still active
  if (bid.auction.status === 'active') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete bid on active auction'
    });
  }

  await bid.destroy();

  res.json({
    success: true,
    message: 'Bid deleted successfully'
  });
});

const debugBid = asyncHandler(async (req, res) => {
  const { auctionId } = req.params;
  const { amount } = req.body;
  const bidderId = req.user.id;

  console.log('🔍 Debug bid request:', { auctionId, amount, bidderId });

  const debugResult = await debugBidCreation(auctionId, bidderId, amount);

  res.json({
    success: debugResult.success,
    message: debugResult.success ? 'Debug completed successfully' : 'Debug failed',
    data: debugResult
  });
});

module.exports = {
  placeBid,
  getAuctionBids,
  getBidById,
  deleteBid,
  debugBid
};
