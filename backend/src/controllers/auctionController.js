const { Auction, User, Bid, CloudinaryFile } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const redisService = require('../services/redisService');
const { broadcastToAll, broadcastToUser } = require('../socket/socketManager');
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
    condition
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
    sellerId: req.user.id,
    currentPrice: startingPrice
  });

  
  const auctionWithSeller = await Auction.findByPk(auction.id, {
    include: [
      {
        model: User,
        as: 'seller',
        attributes: ['id', 'username', 'firstName', 'lastName']
      },
      {
        model: CloudinaryFile,
        as: 'images',
        attributes: ['id', 'url', 'filename', 'width', 'height']
      }
    ]
  });


  await redisService.cacheAuction(auction.id, auctionWithSeller);

  
  const now = new Date();
  if (new Date(startTime) <= now) {
    await redisService.addActiveAuction(auction.id, endTime);
  }

  
  broadcastToAll({
    type: 'newAuction',
    auction: {
      id: auctionWithSeller.id,
      title: auctionWithSeller.title,
      description: auctionWithSeller.description,
      startingPrice: auctionWithSeller.startingPrice,
      currentPrice: auctionWithSeller.currentPrice,
      category: auctionWithSeller.category,
      condition: auctionWithSeller.condition,
      status: auctionWithSeller.status,
      startTime: auctionWithSeller.startTime,
      endTime: auctionWithSeller.endTime,
      images: auctionWithSeller.images?.map(img => img.url) || [],
      seller: auctionWithSeller.seller
    }
  });

  
  broadcastToUser(req.user.id, {
    type: 'notification',
    notificationType: 'auctionCreated',
    title: 'Auction Created Successfully',
    message: `Your auction "${title}" has been created and is now ${new Date(startTime) <= now ? 'live' : 'scheduled'}`,
    timestamp: new Date().toISOString(),
    auctionId: auction.id,
    isRead: false
  });

  res.status(201).json({
    success: true,
    message: 'Auction created successfully',
    data: {
      auction: auctionWithSeller
    }
  });
});


const calculateAuctionStatus = (auction) => {
  // If the auction has been explicitly marked as ended in the database, respect that
  if (auction.status === 'ended' || auction.status === 'completed') {
    return auction.status;
  }
  
  const now = new Date();
  const startTime = new Date(auction.startTime);
  const endTime = new Date(auction.endTime);
  
  if (now < startTime) {
    return 'pending';
  } else if (now >= startTime && now < endTime) {
    return 'active';
  } else if (now >= endTime) {
    return 'ended';
  }
  
  return auction.status;
};

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
      },
      {
        model: CloudinaryFile,
        as: 'images',
        attributes: ['id', 'url', 'filename', 'width', 'height']
      }
    ],
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });


  const auctionsWithBidCount = await Promise.all(
    auctions.map(async (auction) => {
      
      const calculatedStatus = calculateAuctionStatus(auction);
      const bidCount = await redisService.getAuctionBidCount(auction.id);
      const auctionData = auction.toJSON ? auction.toJSON() : auction;
      
      
      auctionData.images = auctionData.images?.map(img => img.url) || [];
      
      return {
        ...auctionData,
        status: calculatedStatus, 
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

  // Always get fresh data from database for critical fields
  const freshAuction = await Auction.findByPk(id, {
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
      },
      {
        model: CloudinaryFile,
        as: 'images',
        attributes: ['id', 'url', 'filename', 'width', 'height']
      }
    ]
  });

  if (!freshAuction) {
    return res.status(404).json({
      success: false,
      message: 'Auction not found'
    });
  }

  // Update Redis cache with fresh data
  await redisService.cacheAuction(id, freshAuction);
  
  // Use fresh auction data
  const auction = freshAuction;


  const calculatedStatus = calculateAuctionStatus(auction);

  
  const bidCount = await redisService.getAuctionBidCount(id);
  const highestBid = await redisService.getAuctionHighestBid(id);


  const auctionData = auction.toJSON ? auction.toJSON() : auction;
  
  
  auctionData.images = auctionData.images?.map(img => img.url) || [];
  
  // Use fresh data from database (no need to preserve fields manually)
  const responseData = {
    ...auctionData,
    status: calculatedStatus, 
    bidCount,
    currentHighestBid: highestBid
  };

  // Debug logging for seller decision
  console.log(`🔍 getAuctionById ${id}: sellerDecision=${auction.sellerDecision}, status=${auction.status}, calculatedStatus=${calculatedStatus}`);
  
  res.json({
    success: true,
    data: {
      auction: responseData
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

  // Update Redis cache with new auction data
  try {
    const updatedAuction = await Auction.findByPk(id, {
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
        },
        {
          model: CloudinaryFile,
          as: 'images',
          attributes: ['id', 'url', 'filename', 'width', 'height']
        }
      ]
    });
    
    if (updatedAuction) {
      await redisService.cacheAuction(id, updatedAuction);
      console.log(`✅ Updated Redis cache for auction ${id} after update`);
    }
  } catch (error) {
    console.error(`❌ Error updating Redis cache for auction ${id}:`, error);
  }

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
    include: [
      {
        model: Bid,
        as: 'highestBid',
        include: [{
          model: User,
          as: 'bidder',
          attributes: ['id', 'username']
        }]
      },
      {
        model: CloudinaryFile,
        as: 'images',
        attributes: ['id', 'url', 'filename', 'width', 'height']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  
  const serializedAuctions = auctions.map(auction => {
    const auctionData = auction.toJSON ? auction.toJSON() : auction;
    auctionData.images = auctionData.images?.map(img => img.url) || [];
    return auctionData;
  });

  res.json({
    success: true,
    data: {
      auctions: serializedAuctions,
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
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: CloudinaryFile,
          as: 'images',
          attributes: ['id', 'url', 'filename', 'width', 'height']
        }
      ]
    }],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  
  const serializedBids = bids.map(bid => {
    const bidData = bid.toJSON ? bid.toJSON() : bid;
    if (bidData.auction && bidData.auction.images) {
      bidData.auction.images = bidData.auction.images.map(img => img.url);
    }
    return bidData;
  });

  res.json({
    success: true,
    data: {
      bids: serializedBids,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
});

const getAuctionBids = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const offset = (page - 1) * limit;

  
  const auction = await Auction.findByPk(id);
  if (!auction) {
    return res.status(404).json({
      success: false,
      message: 'Auction not found'
    });
  }

  const { count, rows: bids } = await Bid.findAndCountAll({
    where: { auctionId: id },
    include: [{
      model: User,
      as: 'bidder',
      attributes: ['id', 'username']
    }],
    order: [['amount', 'DESC']],            
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  // Get the highest bid amount to determine winning bid
  const highestBidAmount = bids.length > 0 ? bids[0].amount : 0;
  
  const serializedBids = bids.map(bid => {
    const bidData = bid.toPublic ? bid.toPublic() : bid;
    // Mark the highest bid as winning
    bidData.isWinning = bid.amount === highestBidAmount;
    
    // Debug logging for winning bid
    if (bidData.isWinning) {
      console.log('🏆 Winning bid serialized:', {
        id: bidData.id,
        amount: bidData.amount,
        bidderId: bidData.bidderId,
        bidder: bidData.bidder,
        isWinning: bidData.isWinning
      });
    }
    
    return bidData;
  });

  res.json({
    success: true,
    data: {
      bids: serializedBids,
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
  getMyBids,
  getAuctionBids
};
