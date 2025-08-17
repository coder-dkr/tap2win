const axios = require('axios');
const { Auction, User, Bid } = require('./src/models');

const BASE_URL = 'http://localhost:5100/api';

async function testSellerDecisionSync() {
  try {
    console.log('🧪 Testing Seller Decision Synchronization...\n');

    // Step 1: Create test users
    console.log('1️⃣ Creating test users...');
    const sellerData = {
      username: `seller_${Date.now()}`,
      email: `seller_${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'Seller',
      role: 'seller'
    };

    const buyerData = {
      username: `buyer_${Date.now()}`,
      email: `buyer_${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'Buyer',
      role: 'buyer'
    };

    const sellerResponse = await axios.post(`${BASE_URL}/auth/register`, sellerData);
    const buyerResponse = await axios.post(`${BASE_URL}/auth/register`, buyerData);

    const seller = sellerResponse.data.data.user;
    const buyer = buyerResponse.data.data.user;

    console.log('✅ Users created:', { seller: seller.username, buyer: buyer.username });

    // Step 2: Login users
    console.log('\n2️⃣ Logging in users...');
    const sellerLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: sellerData.email,
      password: 'password123'
    });
    const buyerLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: buyerData.email,
      password: 'password123'
    });

    const sellerToken = sellerLogin.data.data.token;
    const buyerToken = buyerLogin.data.data.token;

    console.log('✅ Users logged in');

    // Step 3: Create auction
    console.log('\n3️⃣ Creating auction...');
    const auctionData = {
      title: 'Test Auction for Sync',
      description: 'Testing seller decision sync',
      startingPrice: 100,
      category: 'electronics',
      condition: 'new',
      startTime: new Date(Date.now() + 1000).toISOString(), // Start in 1 second
      endTime: new Date(Date.now() + 10000).toISOString()   // End in 10 seconds
    };

    const auctionResponse = await axios.post(`${BASE_URL}/auctions`, auctionData, {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });

    const auction = auctionResponse.data.data.auction;
    console.log('✅ Auction created:', auction.id);

    // Step 4: Wait for auction to start and place bid
    console.log('\n4️⃣ Waiting for auction to start...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const bidResponse = await axios.post(`${BASE_URL}/auctions/${auction.id}/bid`, {
      amount: 150
    }, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });

    console.log('✅ Bid placed:', bidResponse.data.data.bid.amount);

    // Step 5: Wait for auction to end
    console.log('\n5️⃣ Waiting for auction to end...');
    await new Promise(resolve => setTimeout(resolve, 12000));

    // Step 6: Check auction status before seller decision
    console.log('\n6️⃣ Checking auction status before seller decision...');
    const auctionBefore = await axios.get(`${BASE_URL}/auctions/${auction.id}`);
    console.log('📊 Auction before decision:', {
      status: auctionBefore.data.data.auction.status,
      sellerDecision: auctionBefore.data.data.auction.sellerDecision,
      winnerId: auctionBefore.data.data.auction.winnerId
    });

    // Step 7: Make seller decision (accept)
    console.log('\n7️⃣ Making seller decision (accept)...');
    const decisionResponse = await axios.post(`${BASE_URL}/seller/auctions/${auction.id}/decision`, {
      decision: 'accept'
    }, {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });

    console.log('✅ Seller decision made:', decisionResponse.data.message);

    // Step 8: Check auction status after seller decision
    console.log('\n8️⃣ Checking auction status after seller decision...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit for sync

    const auctionAfter = await axios.get(`${BASE_URL}/auctions/${auction.id}`);
    console.log('📊 Auction after decision:', {
      status: auctionAfter.data.data.auction.status,
      sellerDecision: auctionAfter.data.data.auction.sellerDecision,
      winnerId: auctionAfter.data.data.auction.winnerId
    });

    // Step 9: Verify database directly
    console.log('\n9️⃣ Verifying database directly...');
    const dbAuction = await Auction.findByPk(auction.id);
    console.log('📊 Database auction:', {
      status: dbAuction.status,
      sellerDecision: dbAuction.sellerDecision,
      winnerId: dbAuction.winnerId
    });

    // Step 10: Check Redis cache
    console.log('\n🔟 Checking Redis cache...');
    const redisService = require('./src/services/redisService');
    const cachedAuction = await redisService.getCachedAuction(auction.id);
    if (cachedAuction) {
      const parsedCache = typeof cachedAuction === 'string' ? JSON.parse(cachedAuction) : cachedAuction;
      console.log('📊 Redis cache:', {
        status: parsedCache.status,
        sellerDecision: parsedCache.sellerDecision,
        winnerId: parsedCache.winnerId
      });
    } else {
      console.log('❌ No cached auction found in Redis');
    }

    // Step 11: Verify consistency
    console.log('\n1️⃣1️⃣ Verifying consistency...');
    const apiDecision = auctionAfter.data.data.auction.sellerDecision;
    const dbDecision = dbAuction.sellerDecision;
    const redisDecision = cachedAuction ? (typeof cachedAuction === 'string' ? JSON.parse(cachedAuction) : cachedAuction).sellerDecision : null;

    console.log('🔍 Decision comparison:', {
      API: apiDecision,
      Database: dbDecision,
      Redis: redisDecision
    });

    if (apiDecision === 'accepted' && dbDecision === 'accepted' && redisDecision === 'accepted') {
      console.log('✅ SUCCESS: All sources show "accepted" - synchronization working!');
    } else {
      console.log('❌ FAILURE: Inconsistent data between sources');
      console.log('   API:', apiDecision);
      console.log('   Database:', dbDecision);
      console.log('   Redis:', redisDecision);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testSellerDecisionSync();
