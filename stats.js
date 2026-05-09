const { LoadBalancer, generateRandomIP, getNodes } = require('./loadbalancer');

const counts = {};
getNodes().forEach(n => counts[n] = 0);

const N = 10000;
for (let i = 0; i < N; i++) {
  const ip = generateRandomIP();
  const node = LoadBalancer(ip);
  counts[node] = (counts[node] || 0) + 1;
}

console.log('\nDistribution after', N, 'random IPs:');
console.log(counts);
