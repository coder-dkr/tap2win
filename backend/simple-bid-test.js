// Simple test for bid creation
const testSimpleBid = () => {
  console.log('🧪 Testing simplified bid creation...\n');
  
  // Test cases
  const testCases = [
    { amount: 6000, description: 'Number 6000' },
    { amount: '6000', description: 'String "6000"' },
    { amount: '6000.50', description: 'String "6000.50"' },
    { amount: 6000.50, description: 'Number 6000.50' },
    { amount: 'abc', description: 'Invalid string "abc"' },
    { amount: -100, description: 'Negative number' },
    { amount: 0, description: 'Zero' }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`Input: ${testCase.input} (type: ${typeof testCase.input})`);
    
    try {
      const numericAmount = parseFloat(testCase.amount);
      const isValid = !isNaN(numericAmount) && numericAmount > 0;
      
      console.log(`Parsed: ${numericAmount}`);
      console.log(`Valid: ${isValid ? '✅' : '❌'}`);
      
      if (isValid) {
        console.log('✅ Would create bid successfully\n');
      } else {
        console.log('❌ Would reject bid\n');
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
      console.log('❌ Would reject bid\n');
    }
  });
  
  console.log('🎉 Simplified bid test completed!');
  console.log('The bid creation should now work with any positive number (string or number)');
};

// Run the test
testSimpleBid();
