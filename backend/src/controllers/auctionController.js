const { Auction, User, Bid } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const redisService = require('../services/redisService');
const { Op } = require('sequelize');

const createAuction = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    startingPrice,
    bidIncrement,
    startTime,
    endTime,
    category,
    condition,
    images
  } = req.body;

  const auction = await Auction.create({
    title,
    description,
    startingPrice,
    bidIncrement,
    startTime,
    endTime,
    category,
    condition,
    images,
    sellerId: req.user.id,
    currentPrice: startingPrice
  });

  // Load auction with seller data
  const auctionWithSeller = await Auction.findByPk(auction.id, {
    include: [{
      model: User,
      as: 'seller',
      attributes: ['id', 'username', 'firstName', 'lastName']
    }]
  });

  // Cache auction data
  await redisService.cacheAuction(auction.id, auctionWithSeller);

  // If auction starts immediately, add to active auctions
  const now = new Date();
  if (new Date(startTime) <= now) {
    await redisService.addActiveAuction(auction.id, endTime);
  }

  res.status(201).json({
    success: true,
    message: 'Auction created successfully',
    data: {
      auction: auctionWithSeller
    }
  });
});

const getAuctions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    category,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search
  } = req.query;

  const offset = (page - 1) * limit;
  const whereClause = {};

  if (status) {
    whereClause.status = status;
  }

  if (category) {
    whereClause.category = category;
  }

  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const { count, rows: auctions } = await Auction.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'seller',
        attributes: ['id', 'username', 'firstName', 'lastName']
      },
      {
        model: Bid,
        as: 'highestBid',
        include: [{
          model: User,
          as: 'bidder',
          attributes: ['id', 'username']
        }]
      }
    ],
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  // Add current bid count from Redis
  const auctionsWithBidCount = await Promise.all(
    auctions.map(async (auction) => {
      const bidCount = await redisService.getAuctionBidCount(auction.id);
      return {
        ...auction.toJSON(),
        bidCount
      };
    })
  );

  res.json({
    success: true,
    data: {
      auctions: auctionsWithBidCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
});

const getAuctionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try to get from cache first
  let auction = await redisService.getCachedAuction(id);

  if (!auction) {
    auction = await Auction.findByPk(id, {
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: Bid,
          as: 'bids',
          include: [{
            model: User,
            as: 'bidder',
            attributes: ['id', 'username']
          }],
          order: [['amount', 'DESC']],
          limit: 10
        }
      ]
    });

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Cache for future requests
    await redisService.cacheAuction(id, auction);
  }

  // Get additional data from Redis
  const bidCount = await redisService.getAuctionBidCount(id);
  const highestBid = await redisService.getAuctionHighestBid(id);

  res.json({
    success: true,
    data: {
      auction: {
        ...auction,
        bidCount,
        currentHighestBid: highestBid
      }
    }
  });
});

const updateAuction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const auction = await Auction.findByPk(id);

  if (!auction) {
    return res.status(404).json({
      success: false,
      message: 'Auction not found'
    });
  }

  if (auction.sellerId !== userId) {
    return res.status(403).json({
      success: false,
      message: 'You can only update your own auctions'
    });
  }

  if (auction.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Cannot update auction after it has started'
    });
  }

  const allowedUpdates = ['title', 'description', 'startingPrice', 'bidIncrement', 'startTime', 'endTime', 'category', 'condition', 'images'];
  const updates = {};

  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  await auction.update(updates);

  // Update cache
  await redisService.deleteCachedAuction(id);

  res.json({
    success: true,
    message: 'Auction updated successfully',
    data: {
      auction
    }
  });
});

const deleteAuction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const auction = await Auction.findByPk(id);

  if (!auction) {
    return res.status(404).json({
      success: false,
      message: 'Auction not found'
    });
  }

  if (auction.sellerId !== userId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'You can only delete your own auctions'
    });
  }

  if (auction.status === 'active') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete active auction'
    });
  }

  await auction.destroy();

  // Clean up cache and Redis data
  await redisService.deleteCachedAuction(id);
  await redisService.removeActiveAuction(id);

  res.json({
    success: true,
    message: 'Auction deleted successfully'
  });
});

const getMyAuctions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10, status } = req.query;

  const offset = (page - 1) * limit;
  const whereClause = { sellerId: userId };

  if (status) {
    whereClause.status = status;
  }

  const { count, rows: auctions } = await Auction.findAndCountAll({
    where: whereClause,
    include: [{
      model: Bid,
      as: 'highestBid',
      include: [{
        model: User,
        as: 'bidder',
        attributes: ['id', 'username']
      }]
    }],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    success: true,
    data: {
      auctions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
});

const getMyBids = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  const offset = (page - 1) * limit;

  const { count, rows: bids } = await Bid.findAndCountAll({
    where: { bidderId: userId },
    include: [{
      model: Auction,
      as: 'auction',
      include: [{
        model: User,
        as: 'seller',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }]
    }],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    success: true,
    data: {
      bids,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
});

module.exports = {
  createAuction,
  getAuctions,
  getAuctionById,
  updateAuction,
  deleteAuction,
  getMyAuctions,
  getMyBids
};
