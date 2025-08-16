const { Bid, Auction, User, Notification } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const redisService = require('../services/redisService');
const emailService = require('../services/emailService');
const { broadcastToAuction, broadcastToUser, broadcastToAll } = require('../socket/socketManager');

const placeBid = asyncHandler(async (req, res) => {
  const { auctionId } = req.params;
  const { amount } = req.body;
  const bidderId = req.user.id;

  // Get auction details
  const auction = await Auction.findByPk(auctionId, {
    include: [{
      model: User,
      as: 'seller',
      attributes: ['id', 'username', 'firstName', 'lastName', 'email']
    }]
  });

  if (!auction) {
    return res.status(404).json({
      success: false,
      message: 'Auction not found'
    });
  }

  // Check if auction is active
  if (!auction.canBid()) {
    return res.status(400).json({
      success: false,
      message: 'Auction is not active for bidding'
    });
  }

  // Check if seller is trying to bid on their own auction
  if (auction.sellerId === bidderId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot bid on your own auction'
    });
  }

  // Get current highest bid from Redis
  const currentHighestBid = await redisService.getAuctionHighestBid(auctionId);
  const currentPrice = currentHighestBid ? currentHighestBid.amount : auction.startingPrice;

  // Validate bid amount
  const minimumBid = currentPrice + auction.bidIncrement;
  if (amount < minimumBid) {
    return res.status(400).json({
      success: false,
      message: `Bid must be at least $${minimumBid.toFixed(2)}`
    });
  }

  // Check rate limiting
  const rateLimitKey = `bid_limit:${bidderId}:${auctionId}`;
  const canBid = await redisService.checkRateLimit(rateLimitKey, 10, 60); // 10 bids per minute
  
  if (!canBid) {
    return res.status(429).json({
      success: false,
      message: 'Too many bids. Please wait before bidding again.'
    });
  }

  // Create the bid
  const bid = await Bid.create({
    auctionId,
    bidderId,
    amount
  });

  // Update previous highest bid status
  if (currentHighestBid) {
    await Bid.update(
      { isWinning: false, status: 'outbid' },
      { where: { id: currentHighestBid.id } }
    );
  }

  // Mark new bid as winning
  await bid.update({ isWinning: true, status: 'winning' });

  // Update auction's current price and highest bid
  await auction.update({
    currentPrice: amount,
    highestBidId: bid.id
  });

  // Update Redis cache
  const bidData = {
    id: bid.id,
    amount: bid.amount,
    bidderId: bid.bidderId,
    bidderUsername: req.user.username,
    bidTime: bid.bidTime
  };

  await redisService.setAuctionHighestBid(auctionId, bidData);
  await redisService.incrementAuctionBidCount(auctionId);
  await redisService.addAuctionParticipant(auctionId, bidderId);

  // Get updated auction with bid count
  const bidCount = await redisService.getAuctionBidCount(auctionId);

  // Load bidder info for response
  const bidWithBidder = await Bid.findByPk(bid.id, {
    include: [{
      model: User,
      as: 'bidder',
      attributes: ['id', 'username', 'firstName', 'lastName']
    }]
  });

  // ✅ REAL-TIME: Emit detailed bid update to all auction participants
  broadcastToAuction(auctionId, {
    type: 'newBid',
    bid: bidWithBidder.toPublic(),
    auction: {
      id: auction.id,
      currentPrice: amount,
      bidCount,
      highestBidId: bid.id,
      updatedAt: new Date().toISOString()
    }
  });

  // ✅ REAL-TIME: Also broadcast to all users for auction list updates
  broadcastToAll({
    type: 'auctionUpdate',
    auctionId: auction.id,
    auction: {
      id: auction.id,
      currentPrice: amount,
      bidCount,
      highestBidId: bid.id,
      updatedAt: new Date().toISOString()
    }
  });

  // Create notifications
  try {
    // Notify seller
    await Notification.create({
      userId: auction.sellerId,
      type: 'new_bid',
      title: 'New Bid Received',
      message: `${req.user.username} placed a bid of $${amount} on ${auction.title}`,
      data: {
        auctionId: auction.id,
        bidAmount: amount,
        bidderId: req.user.id
      }
    });

    // Notify seller via socket
    broadcastToUser(auction.sellerId, {
      type: 'notification',
      notificationType: 'new_bid',
      title: 'New Bid Received',
      message: `${req.user.username} placed a bid of $${amount} on ${auction.title}`,
      auctionId: auction.id,
      timestamp: new Date().toISOString()
    });

    // Notify previous highest bidder if exists
    if (currentHighestBid && currentHighestBid.bidderId !== bidderId) {
      await Notification.create({
        userId: currentHighestBid.bidderId,
        type: 'outbid',
        title: 'You\'ve been outbid',
        message: `Your bid on ${auction.title} has been outbid. Current highest bid: $${amount}`,
        data: {
          auctionId: auction.id,
          previousBidAmount: currentHighestBid.amount,
          newBidAmount: amount
        }
      });

      // Notify via socket
      broadcastToUser(currentHighestBid.bidderId, {
        type: 'notification',
        notificationType: 'outbid',
        title: 'You\'ve been outbid',
        message: `Your bid on ${auction.title} has been outbid`,
        auctionId: auction.id,
        timestamp: new Date().toISOString()
      });

      // Send email notification
      const previousBidder = await User.findByPk(currentHighestBid.bidderId);
      if (previousBidder) {
        emailService.sendOutbidNotification(previousBidder, auction, bid)
          .catch(err => console.error('Failed to send outbid email:', err));
      }
    }

  } catch (error) {
    console.error('Error creating notifications:', error);
  }

  res.status(201).json({
    success: true,
    message: 'Bid placed successfully',
    data: {
      bid: bidWithBidder,
      auction: {
        id: auction.id,
        currentPrice: amount,
        bidCount
      }
    }
  });
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
