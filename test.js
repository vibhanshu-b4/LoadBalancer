// Standalone test script for the load balancer
const { LoadBalancer, generateRandomIP, testConsistency } = require('./loadbalancer');

console.log('\n========================================');
console.log('  LOAD BALANCER TEST - CONSISTENCY');
console.log('========================================\n');

// Test 1: Random IPs
console.log('TEST 1: Routing Random IPs');
console.log('----------------------------------');
for (let i = 0; i < 5; i++) {
    const ip = generateRandomIP();
    LoadBalancer(ip);
}

// Test 2: Consistency test
console.log('\n\nTEST 2: Consistency Test (Same IP Always Routes to Same Node)');
console.log('----------------------------------');
testConsistency();

// Test 3: Multiple IPs consistency
console.log('\n\nTEST 3: Multiple Different IPs');
console.log('----------------------------------');
const testIPs = ['10.0.0.1', '10.0.0.2', '10.0.0.3', '192.168.1.1', '172.16.0.1'];
const results = {};

testIPs.forEach(ip => {
    const node = LoadBalancer(ip);
    results[ip] = node;
});

// Verify consistency by routing same IPs again
console.log('\n\nVERIFY: Routing same IPs again (should match above)');
console.log('----------------------------------');
let consistent = true;
testIPs.forEach(ip => {
    const node = LoadBalancer(ip);
    const previousNode = results[ip];
    const match = node === previousNode ? '✓' : '✗';
    if (node !== previousNode) consistent = false;
});

console.log('\n========================================');
console.log(consistent ? '✓ ALL TESTS PASSED - Consistency Verified!' : '✗ TESTS FAILED - Inconsistency Detected!');
console.log('========================================\n');
