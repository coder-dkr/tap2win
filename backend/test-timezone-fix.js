const axios = require('axios');

const BASE_URL = 'http://localhost:5100/api';

async function testTimezoneFix() {
  try {
    console.log('🧪 Testing Timezone Fix...\n');

    // Step 1: Create test user
    console.log('1️⃣ Creating test user...');
    const userData = {
      username: `timezone_test_${Date.now()}`,
      email: `timezone_test_${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Timezone',
      lastName: 'Test',
      role: 'seller'
    };

    const userResponse = await axios.post(`${BASE_URL}/auth/register`, userData);
    const user = userResponse.data.data.user;
    console.log('✅ User created:', user.username);

    // Step 2: Login user
    console.log('\n2️⃣ Logging in user...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: userData.email,
      password: 'password123'
    });
    const token = loginResponse.data.data.token;
    console.log('✅ User logged in');

    // Step 3: Create auction with specific times
    console.log('\n3️⃣ Creating auction with timezone test...');
    
    // Create times that should be in the future
    const now = new Date();
    const startTime = new Date(now.getTime() + 60000); // Start in 1 minute
    const endTime = new Date(now.getTime() + 300000);  // End in 5 minutes
    
    // Format as local datetime strings (like the frontend would send)
    const localStartTime = startTime.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    const localEndTime = endTime.toISOString().slice(0, 16);     // YYYY-MM-DDTHH:MM
    
    console.log('📅 Local times (as frontend would send):');
    console.log(`   Start: ${localStartTime}`);
    console.log(`   End: ${localEndTime}`);
    
    const auctionData = {
      title: 'Timezone Test Auction',
      description: 'Testing timezone conversion from frontend to backend',
      startingPrice: 100,
      bidIncrement: 10,
      startTime: localStartTime,
      endTime: localEndTime,
      category: 'electronics',
      condition: 'new'
    };

    const auctionResponse = await axios.post(`${BASE_URL}/auctions`, auctionData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const auction = auctionResponse.data.data.auction;
    console.log('✅ Auction created:', auction.id);
    
    console.log('\n📊 Time comparison:');
    console.log(`   Frontend sent start: ${localStartTime}`);
    console.log(`   Backend stored start: ${auction.startTime}`);
    console.log(`   Frontend sent end: ${localEndTime}`);
    console.log(`   Backend stored end: ${auction.endTime}`);
    
    // Step 4: Check if times are properly converted
    const storedStartTime = new Date(auction.startTime);
    const storedEndTime = new Date(auction.endTime);
    
    console.log('\n🕐 Timezone analysis:');
    console.log(`   Original start time: ${startTime.toISOString()}`);
    console.log(`   Stored start time: ${storedStartTime.toISOString()}`);
    console.log(`   Time difference: ${Math.abs(storedStartTime.getTime() - startTime.getTime())}ms`);
    
    // Check if the times are within 1 second (allowing for processing time)
    const timeDiff = Math.abs(storedStartTime.getTime() - startTime.getTime());
    if (timeDiff < 1000) {
      console.log('✅ Timezone conversion working correctly!');
    } else {
      console.log('❌ Timezone conversion issue detected!');
      console.log(`   Expected: ${startTime.toISOString()}`);
      console.log(`   Got: ${storedStartTime.toISOString()}`);
    }
    
    // Step 5: Check auction status
    console.log('\n4️⃣ Checking auction status...');
    const statusResponse = await axios.get(`${BASE_URL}/auctions/${auction.id}`);
    const auctionStatus = statusResponse.data.data.auction;
    
    console.log('📊 Auction status:', {
      status: auctionStatus.status,
      startTime: auctionStatus.startTime,
      endTime: auctionStatus.endTime
    });
    
    console.log('\n🎉 Timezone test completed!');
    console.log('📧 Check the auction creation to see if times are correct');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testTimezoneFix();
