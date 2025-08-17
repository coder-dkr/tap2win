require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:5100/api';

// Test data with unique timestamps
const timestamp = Date.now();
const testUsers = {
  seller: {
    email: `seller${timestamp}@test.com`,
    password: 'password123',
    username: `testseller${timestamp}`,
    firstName: 'Test',
    lastName: 'Seller',
    role: 'seller'
  },
  buyer: {
    email: `buyer${timestamp}@test.com`,
    password: 'password123',
    username: `testbuyer${timestamp}`,
    firstName: 'Test',
    lastName: 'Buyer',
    role: 'buyer'
  }
};

let sellerToken, buyerToken, testAuctionId;

async function testBidsAPI() {
  console.log('🧪 Testing Bids API Endpoint...\n');

  try {
    // Step 1: Register test users
    console.log('📝 Step 1: Registering test users...');
    
    await axios.post(`${API_BASE}/auth/register`, testUsers.seller);
    await axios.post(`${API_BASE}/auth/register`, testUsers.buyer);
    console.log('✅ Users registered successfully');

    // Step 2: Login users
    console.log('\n🔐 Step 2: Logging in users...');
    
    const sellerLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: testUsers.seller.email,
      password: testUsers.seller.password
    });
    sellerToken = sellerLogin.data.data.token;

    const buyerLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: testUsers.buyer.email,
      password: testUsers.buyer.password
    });
    buyerToken = buyerLogin.data.data.token;
    
    console.log('✅ Users logged in successfully');

    // Step 3: Create test auction
    console.log('\n🏷️ Step 3: Creating test auction...');
    
    const now = new Date();
    const auctionData = {
      title: 'Test Auction for Bids API',
      description: 'This is a test auction to verify bids API',
      startingPrice: 100,
      bidIncrement: 10,
      startTime: new Date(now.getTime() + 2000).toISOString(), // Start in 2 seconds
      endTime: new Date(now.getTime() + 10000).toISOString(), // End in 10 seconds
      category: 'Electronics',
      condition: 'new'
    };

    const createAuction = await axios.post(`${API_BASE}/auctions`, auctionData, {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    testAuctionId = createAuction.data.data.auction.id;
    console.log(`✅ Auction created with ID: ${testAuctionId}`);

    // Step 4: Wait for auction to start
    console.log('\n⏰ Step 4: Waiting for auction to start...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

    // Step 5: Place a bid
    console.log('\n💰 Step 5: Placing a bid...');
    
    try {
      const bidData = { amount: 150 };
      const bidResponse = await axios.post(`${API_BASE}/auctions/${testAuctionId}/bids`, bidData, {
        headers: { Authorization: `Bearer ${buyerToken}` }
      });
      console.log('✅ Bid placed successfully');
      console.log(`📊 Current price after bid: ${bidResponse.data.data.auction.currentPrice}`);
    } catch (error) {
      console.log('❌ Bid placement failed:', error.response?.data?.message);
    }

    // Step 6: Test the bids API endpoint
    console.log('\n🔍 Step 6: Testing bids API endpoint...');
    
    try {
      // Test with authentication
      console.log('📤 Testing with authentication...');
      const bidsResponseWithAuth = await axios.get(`${API_BASE}/auctions/${testAuctionId}/bids`, {
        headers: { Authorization: `Bearer ${buyerToken}` }
      });
      
      if (bidsResponseWithAuth.data.success) {
        console.log('✅ Bids API with auth works!');
        console.log(`📊 Found ${bidsResponseWithAuth.data.data.bids.length} bids`);
        console.log('📋 Bid data structure:', JSON.stringify(bidsResponseWithAuth.data.data.bids[0], null, 2));
      } else {
        console.log('❌ Bids API with auth failed:', bidsResponseWithAuth.data.message);
      }
    } catch (error) {
      console.log('❌ Bids API with auth error:', error.response?.data?.message || error.message);
    }

    try {
      // Test without authentication (should work since it's optionalAuth)
      console.log('\n📤 Testing without authentication...');
      const bidsResponseWithoutAuth = await axios.get(`${API_BASE}/auctions/${testAuctionId}/bids`);
      
      if (bidsResponseWithoutAuth.data.success) {
        console.log('✅ Bids API without auth works!');
        console.log(`📊 Found ${bidsResponseWithoutAuth.data.data.bids.length} bids`);
        console.log('📋 Bid data structure:', JSON.stringify(bidsResponseWithoutAuth.data.data.bids[0], null, 2));
      } else {
        console.log('❌ Bids API without auth failed:', bidsResponseWithoutAuth.data.message);
      }
    } catch (error) {
      console.log('❌ Bids API without auth error:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 Bids API Test Completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('🔍 Full error:', error);
  }
}

testBidsAPI();
