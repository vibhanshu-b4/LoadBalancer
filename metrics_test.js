const http = require('http');

function post(ip) {
  return new Promise(resolve => {
    const data = JSON.stringify({ ip });
    const req = http.request({ hostname: 'localhost', port: 3000, path: '/route', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(data);
    req.end();
  });
}

function getMetrics() {
  return new Promise(resolve => {
    http.get('http://localhost:3000/metrics', res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    }).on('error', e => resolve({ error: e.message }));
  });
}

(async () => {
  console.log('Sending 12 requests from IP 1.2.3.4 (capacity 10)');
  for (let i = 0; i < 12; i++) {
    const r = await post('1.2.3.4');
    console.log(i + 1, r.status, r.body);
  }

  const m = await getMetrics();
  console.log('\nMETRICS:', m.body);
})();

