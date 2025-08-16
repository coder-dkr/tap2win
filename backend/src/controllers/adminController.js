const { User, Auction, Bid } = require('../models');
const { sequelize } = require('../config/database');
const redisService = require('../services/redisService');
const { broadcastToAuction } = require('../socket/socketManager');

// Get admin dashboard statistics
const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalAuctions,
      activeAuctions,
      totalBids,
      completedAuctions,
      pendingAuctions
    ] = await Promise.all([
      User.count(),
      Auction.count(),
      Auction.count({ where: { status: 'active' } }),
      Bid.count(),
      Auction.count({ where: { status: 'completed' } }),
      Auction.count({ where: { status: 'pending' } })
    ]);

    // Calculate total revenue from completed auctions
    const completedAuctionsData = await Auction.findAll({
      where: { status: 'completed' },
      include: [{ model: Bid, as: 'bids', order: [['amount', 'DESC']], limit: 1 }]
    });

    const totalRevenue = completedAuctionsData.reduce((sum, auction) => {
      const highestBid = auction.bids[0];
      return sum + (highestBid ? highestBid.amount : 0);
    }, 0);

    const stats = {
      totalUsers,
      totalAuctions,
      activeAuctions,
      totalBids,
      totalRevenue,
      completedAuctions,
      pendingAuctions
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ success: false, message: 'Failed to get admin statistics' });
  }
};

// Get all auctions for admin
const getAllAuctions = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (search) {
      whereClause[sequelize.Op.or] = [
        { title: { [sequelize.Op.iLike]: `%${search}%` } },
        { description: { [sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    const auctions = await Auction.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'seller', attributes: ['id', 'username', 'email'] },
        { model: Bid, as: 'bids', attributes: ['id'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const auctionsWithBidCount = auctions.rows.map(auction => ({
      ...auction.toJSON(),
      bidCount: auction.bids.length
    }));

    res.json({
      success: true,
      data: {
        auctions: auctionsWithBidCount,
        total: auctions.count,
        page: parseInt(page),
        totalPages: Math.ceil(auctions.count / limit)
      }
    });
  } catch (error) {
    console.error('Error getting all auctions:', error);
    res.status(500).json({ success: false, message: 'Failed to get auctions' });
  }
};

// Start an auction manually
const startAuction = async (req, res) => {
  try {
    const { id } = req.params;
    
    const auction = await Auction.findByPk(id);
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    if (auction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Auction is not in pending status' });
    }

    auction.status = 'active';
    auction.startTime = new Date();
    await auction.save();

    // Broadcast to all connected clients
    broadcastToAuction(auction.id, {
      type: 'AUCTION_STARTED',
      data: { auctionId: auction.id, status: 'active' }
    });

    res.json({ success: true, message: 'Auction started successfully', data: auction });
  } catch (error) {
    console.error('Error starting auction:', error);
    res.status(500).json({ success: false, message: 'Failed to start auction' });
  }
};

// End an auction manually
const endAuction = async (req, res) => {
  try {
    const { id } = req.params;
    
    const auction = await Auction.findByPk(id, {
      include: [{ model: Bid, as: 'bids', order: [['amount', 'DESC']], limit: 1 }]
    });

    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    if (auction.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Auction is not active' });
    }

    auction.status = 'ended';
    auction.endTime = new Date();
    
    // Set current price to highest bid if exists
    if (auction.bids.length > 0) {
      auction.currentPrice = auction.bids[0].amount;
    }
    
    await auction.save();

    // Broadcast to all connected clients
    broadcastToAuction(auction.id, {
      type: 'AUCTION_ENDED',
      data: { 
        auctionId: auction.id, 
        status: 'ended',
        currentPrice: auction.currentPrice,
        winnerId: auction.bids.length > 0 ? auction.bids[0].bidderId : null
      }
    });

    res.json({ success: true, message: 'Auction ended successfully', data: auction });
  } catch (error) {
    console.error('Error ending auction:', error);
    res.status(500).json({ success: false, message: 'Failed to end auction' });
  }
};

// Reset an auction (clear all bids and reset status)
const resetAuction = async (req, res) => {
  try {
    const { id } = req.params;
    
    const auction = await Auction.findByPk(id);
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    // Delete all bids for this auction
    await Bid.destroy({ where: { auctionId: id } });

    // Reset auction to pending status
    auction.status = 'pending';
    auction.currentPrice = null;
    auction.startTime = null;
    auction.endTime = null;
    await auction.save();

    // Broadcast to all connected clients
    broadcastToAuction(auction.id, {
      type: 'AUCTION_RESET',
      data: { auctionId: auction.id, status: 'pending' }
    });

    res.json({ success: true, message: 'Auction reset successfully', data: auction });
  } catch (error) {
    console.error('Error resetting auction:', error);
    res.status(500).json({ success: false, message: 'Failed to reset auction' });
  }
};

// Update auction details
const updateAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, startingPrice, bidIncrement, endTime } = req.body;
    
    const auction = await Auction.findByPk(id);
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    // Only allow updates if auction hasn't started
    if (auction.status === 'active' || auction.status === 'ended') {
      return res.status(400).json({ success: false, message: 'Cannot update active or ended auction' });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (startingPrice) updateData.startingPrice = startingPrice;
    if (bidIncrement) updateData.bidIncrement = bidIncrement;
    if (endTime) updateData.endTime = endTime;

    await auction.update(updateData);

    res.json({ success: true, message: 'Auction updated successfully', data: auction });
  } catch (error) {
    console.error('Error updating auction:', error);
    res.status(500).json({ success: false, message: 'Failed to update auction' });
  }
};

// Delete auction
const deleteAuction = async (req, res) => {
  try {
    const { id } = req.params;
    
    const auction = await Auction.findByPk(id);
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    // Only allow deletion if auction hasn't started
    if (auction.status === 'active' || auction.status === 'ended') {
      return res.status(400).json({ success: false, message: 'Cannot delete active or ended auction' });
    }

    // Delete all bids for this auction
    await Bid.destroy({ where: { auctionId: id } });
    
    // Delete the auction
    await auction.destroy();

    res.json({ success: true, message: 'Auction deleted successfully' });
  } catch (error) {
    console.error('Error deleting auction:', error);
    res.status(500).json({ success: false, message: 'Failed to delete auction' });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, role, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (role) whereClause.role = role;
    if (search) {
      whereClause[sequelize.Op.or] = [
        { username: { [sequelize.Op.iLike]: `%${search}%` } },
        { email: { [sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    const users = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        users: users.rows,
        total: users.count,
        page: parseInt(page),
        totalPages: Math.ceil(users.count / limit)
      }
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ success: false, message: 'Failed to get users' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Auction, as: 'auctions' },
        { model: Bid, as: 'bids' }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ success: false, message: 'Failed to get user' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, isActive } = req.body;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    await user.update(updateData);

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({ success: true, message: 'User updated successfully', data: userResponse });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deletion of admin users
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot delete admin users' });
    }

    // Delete user's auctions and bids
    await Bid.destroy({ where: { bidderId: id } });
    await Auction.destroy({ where: { sellerId: id } });
    await user.destroy();

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

// Get system status
const getSystemStatus = async (req, res) => {
  try {
    // Check database connection
    let dbStatus = 'healthy';
    try {
      await sequelize.authenticate();
    } catch (error) {
      dbStatus = 'error';
    }

    // Check Redis connection
    let redisStatus = 'connected';
    try {
      await redisService.ping();
    } catch (error) {
      redisStatus = 'disconnected';
    }

    const systemStatus = {
      database: dbStatus,
      redis: redisStatus,
      websocket: 'connected', // This would be checked from socket manager
      email: 'active', // This would be checked from email service
      timestamp: new Date().toISOString()
    };

    res.json({ success: true, data: systemStatus });
  } catch (error) {
    console.error('Error getting system status:', error);
    res.status(500).json({ success: false, message: 'Failed to get system status' });
  }
};

// Get recent activity
const getRecentActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Get recent bids
    const recentBids = await Bid.findAll({
      include: [
        { model: User, as: 'bidder', attributes: ['username'] },
        { model: Auction, as: 'auction', attributes: ['title'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Get recent auctions
    const recentAuctions = await Auction.findAll({
      include: [{ model: User, as: 'seller', attributes: ['username'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Get recent users
    const recentUsers = await User.findAll({
      attributes: ['id', 'username', 'email', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    const activity = {
      bids: recentBids.map(bid => ({
        type: 'bid',
        id: bid.id,
        amount: bid.amount,
        bidder: bid.bidder.username,
        auction: bid.auction.title,
        timestamp: bid.createdAt
      })),
      auctions: recentAuctions.map(auction => ({
        type: 'auction',
        id: auction.id,
        title: auction.title,
        status: auction.status,
        seller: auction.seller.username,
        timestamp: auction.createdAt
      })),
      users: recentUsers.map(user => ({
        type: 'user',
        id: user.id,
        username: user.username,
        role: user.role,
        timestamp: user.createdAt
      }))
    };

    res.json({ success: true, data: activity });
  } catch (error) {
    console.error('Error getting recent activity:', error);
    res.status(500).json({ success: false, message: 'Failed to get recent activity' });
  }
};

module.exports = {
  getStats,
  getAllAuctions,
  startAuction,
  endAuction,
  resetAuction,
  updateAuction,
  deleteAuction,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getSystemStatus,
  getRecentActivity
};
