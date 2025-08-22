const { Bid, Auction, User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const redisService = require('../services/redisService');
const { broadcastToAuction, broadcastToAll } = require('../socket/socketManager');

const placeBid = asyncHandler(async (req, res) => {
  const { auctionId } = req.params;
  const { amount } = req.body;
  const bidderId = req.user.id;

  console.log('🚀 Bid request received:', { auctionId, amount, bidderId, userRole: req.user.role });

  // Basic validation - just check if amount is positive
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Bid amount must be a positive number'
    });
  }

  try {
    // Get auction
    const auction = await Auction.findByPk(auctionId);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Check if auction is active (simple check)
    const now = new Date();
    if (now < new Date(auction.startTime) || now > new Date(auction.endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Auction is not active'
      });
    }

    // Check if seller is trying to bid on their own auction
    if (auction.sellerId === bidderId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot bid on your own auction'
      });
    }

    // Get current highest bid from database (simple approach)
    const currentHighestBid = await Bid.findOne({
      where: { 
        auctionId,
        isWinning: true 
      },
      order: [['amount', 'DESC']]
    });

    const currentPrice = currentHighestBid ? currentHighestBid.amount : auction.startingPrice;
    const minimumBid = currentPrice + auction.bidIncrement;

    // Check minimum bid
    if (numericAmount < minimumBid) {
      return res.status(400).json({
        success: false,
        message: `Bid must be at least $${minimumBid.toFixed(2)}`
      });
    }

    // Create the bid
    const bid = await Bid.create({
      auctionId,
      bidderId,
      amount: numericAmount,
      isWinning: true,
      status: 'winning'
    });

    // Update previous highest bid if exists
    if (currentHighestBid) {
      await currentHighestBid.update({
        isWinning: false,
        status: 'outbid'
      });
    }

    // Update auction
    await auction.update({
      currentPrice: numericAmount,
      highestBidId: bid.id
    });

    // Update Redis cache (simple approach)
    try {
      const bidData = {
        id: bid.id,
        amount: numericAmount,
        bidderId: bid.bidderId,
        bidderUsername: req.user.username,
        bidTime: bid.bidTime
      };

      // Update Redis with new bid data
      await redisService.setAuctionHighestBid(auctionId, bidData);
      await redisService.incrementAuctionBidCount(auctionId);
      await redisService.addAuctionParticipant(auctionId, bidderId);
      
      console.log('✅ Redis updated successfully');
    } catch (redisError) {
      console.error('⚠️ Redis update failed, but bid was created:', redisError.message);
      // Continue even if Redis fails - bid is already created in database
    }

    // Get bid count
    const bidCount = await Bid.count({ where: { auctionId } });

    // Sync bid count to Redis as backup
    try {
      await redisService.syncBidCount(auctionId, bidCount);
    } catch (syncError) {
      console.error('⚠️ Bid count sync failed:', syncError.message);
    }

    // Load bidder info for response
    const bidWithBidder = await Bid.findByPk(bid.id, {
      include: [{
        model: User,
        as: 'bidder',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }]
    });

    console.log('✅ Bid placed successfully:', bid.id);

    // Simple WebSocket broadcast (won't break if it fails)
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
      
      broadcastToAuction(auctionId, webSocketMessage);
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
      
      console.log('✅ WebSocket broadcast sent');
    } catch (socketError) {
      console.error('⚠️ WebSocket broadcast failed, but bid was created:', socketError.message);
    }

    // Simple response
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
    console.error('❌ Error placing bid:', error);
    throw error; // Let error handler deal with it
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
      as: 'bidder',
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

// Simple function to get auction data with Redis fallback
const getAuctionData = async (auctionId) => {
  try {
    // Try to get from Redis first
    const redisData = await redisService.getCachedAuction(auctionId);
    if (redisData) {
      return JSON.parse(redisData);
    }
  } catch (error) {
    console.log('Redis cache miss, getting from database');
  }

  // Fallback to database
  const auction = await Auction.findByPk(auctionId, {
    include: [{
      model: User,
      as: 'seller',
      attributes: ['id', 'username', 'firstName', 'lastName']
    }]
  });

  // Cache in Redis for next time
  if (auction) {
    try {
      await redisService.cacheAuction(auctionId, auction);
    } catch (cacheError) {
      console.error('Failed to cache auction:', cacheError.message);
    }
  }

  return auction;
};

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

module.exports = {
  placeBid,
  getAuctionBids,
  getBidById,
  deleteBid
};
