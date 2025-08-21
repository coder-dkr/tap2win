const { Bid, Auction, User } = require('../models');
const redisService = require('../services/redisService');
const { sequelize } = require('../config/database');

/**
 * Debug utility to test bid creation components
 */
const debugBidCreation = async (auctionId, bidderId, amount) => {
  console.log('🔍 Starting bid creation debug...');
  
  try {
    // Test 1: Database connection
    console.log('1. Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Test 2: Check if auction exists
    console.log('2. Checking auction existence...');
    const auction = await Auction.findByPk(auctionId, {
      include: [{
        model: User,
        as: 'seller',
        attributes: ['id', 'username']
      }]
    });
    
    if (!auction) {
      console.log('❌ Auction not found');
      return { success: false, error: 'Auction not found' };
    }
    console.log('✅ Auction found:', auction.title);
    
    // Test 3: Check if bidder exists
    console.log('3. Checking bidder existence...');
    const bidder = await User.findByPk(bidderId);
    if (!bidder) {
      console.log('❌ Bidder not found');
      return { success: false, error: 'Bidder not found' };
    }
    console.log('✅ Bidder found:', bidder.username);
    
    // Test 4: Check auction status
    console.log('4. Checking auction status...');
    const canBid = auction.canBid();
    console.log(`Auction status: ${auction.status}, Can bid: ${canBid}`);
    
    if (!canBid) {
      console.log('❌ Auction is not active for bidding');
      return { success: false, error: 'Auction is not active for bidding' };
    }
    
    // Test 5: Check Redis connection
    console.log('5. Testing Redis connection...');
    try {
      await redisService.set('test:bid:debug', 'test', 60);
      const testValue = await redisService.get('test:bid:debug');
      if (testValue === 'test') {
        console.log('✅ Redis connection successful');
      } else {
        console.log('❌ Redis test failed');
      }
    } catch (redisError) {
      console.log('❌ Redis connection failed:', redisError.message);
    }
    
    // Test 6: Get current highest bid
    console.log('6. Getting current highest bid...');
    let currentHighestBid = null;
    try {
      currentHighestBid = await redisService.getAuctionHighestBid(auctionId);
      if (currentHighestBid) {
        console.log('✅ Current highest bid from Redis:', currentHighestBid);
      } else {
        console.log('ℹ️ No current highest bid in Redis');
      }
    } catch (error) {
      console.log('❌ Error getting highest bid from Redis:', error.message);
    }
    
    // Test 7: Check database for highest bid
    console.log('7. Checking database for highest bid...');
    const dbHighestBid = await Bid.findOne({
      where: { 
        auctionId,
        isWinning: true 
      },
      order: [['amount', 'DESC']]
    });
    
    if (dbHighestBid) {
      console.log('✅ Highest bid from database:', {
        id: dbHighestBid.id,
        amount: dbHighestBid.amount,
        bidderId: dbHighestBid.bidderId
      });
    } else {
      console.log('ℹ️ No winning bid in database');
    }
    
    // Test 8: Validate bid amount
    console.log('8. Validating bid amount...');
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      console.log('❌ Invalid bid amount');
      return { 
        success: false, 
        error: 'Bid amount must be a positive number' 
      };
    }
    
    const currentPrice = currentHighestBid ? currentHighestBid.amount : auction.startingPrice;
    const minimumBid = currentPrice + auction.bidIncrement;
    
    console.log(`Current price: $${currentPrice}`);
    console.log(`Bid increment: $${auction.bidIncrement}`);
    console.log(`Minimum bid: $${minimumBid}`);
    console.log(`Proposed bid: $${numericAmount}`);
    
    if (numericAmount < minimumBid) {
      console.log('❌ Bid amount too low');
      return { 
        success: false, 
        error: `Bid must be at least $${minimumBid.toFixed(2)}` 
      };
    }
    console.log('✅ Bid amount is valid');
    
    // Test 9: Check rate limiting
    console.log('9. Checking rate limiting...');
    try {
      const rateLimitKey = `bid_limit:${bidderId}:${auctionId}`;
      const canBid = await redisService.checkRateLimit(rateLimitKey, 10, 60);
      console.log(`Rate limit check: ${canBid ? '✅ Allowed' : '❌ Rate limited'}`);
    } catch (error) {
      console.log('❌ Rate limit check failed:', error.message);
    }
    
    console.log('✅ All tests completed successfully');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test bid creation with transaction
 */
const testBidCreation = async (auctionId, bidderId, amount) => {
  console.log('🧪 Testing bid creation with transaction...');
  
  const transaction = await sequelize.transaction();
  
  try {
    // Create the bid
    const bid = await Bid.create({
      auctionId,
      bidderId,
      amount
    }, { transaction });
    
    console.log('✅ Bid created successfully:', bid.id);
    
    // Update auction
    const auction = await Auction.findByPk(auctionId, { transaction });
    await auction.update({
      currentPrice: amount,
      highestBidId: bid.id
    }, { transaction });
    
    console.log('✅ Auction updated successfully');
    
    // Commit transaction
    await transaction.commit();
    console.log('✅ Transaction committed successfully');
    
    return { success: true, bidId: bid.id };
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Bid creation failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  debugBidCreation,
  testBidCreation
};
