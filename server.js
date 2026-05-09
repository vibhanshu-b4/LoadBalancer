const express = require('express');
const path = require('path');
const { LoadBalancer, generateRandomIP, simulateTraffic, testConsistency, runHealthCheck, getNodeStatuses, setNodeHealth, getNodes } = require('./loadbalancer');
const { consume, getStatus } = require('./rateLimiter');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// In-memory request log
const requestLog = [];

// In-memory metrics
const metrics = {
    startTime: new Date().toISOString(),
    totalRequests: 0,
    perNode: {},
    rejectedRequests: 0,
    requestsByIP: {}
};

// Route: Route a specific IP
app.post('/route', (req, res) => {
    const ip = req.body.ip;
    
    if (!ip) {
        return res.status(400).json({ error: "IP address is required" });
    }
    // Rate limit by provided IP
    const rl = consume(ip);
    if (!rl.allowed) {
        metrics.rejectedRequests += 1;
        return res.status(429).json({ error: 'Rate limit exceeded', remaining: rl.remaining });
    }

    const node = LoadBalancer(ip);
    const logEntry = { ip, node, timestamp: new Date().toISOString() };
    requestLog.push(logEntry);

    // Update metrics
    metrics.totalRequests += 1;
    metrics.perNode[node] = (metrics.perNode[node] || 0) + 1;
    metrics.requestsByIP[ip] = (metrics.requestsByIP[ip] || 0) + 1;

    res.json({
        success: true,
        ip,
        routedTo: node,
        timestamp: logEntry.timestamp
    });
});

// Route: Route a random IP
app.get('/route-random', (req, res) => {
    const ip = generateRandomIP();
    // Rate limit by generated IP
    const rl = consume(ip);
    if (!rl.allowed) {
        metrics.rejectedRequests += 1;
        return res.status(429).json({ error: 'Rate limit exceeded', remaining: rl.remaining });
    }
    const node = LoadBalancer(ip);
    const logEntry = { ip, node, timestamp: new Date().toISOString() };
    requestLog.push(logEntry);

    // Update metrics
    metrics.totalRequests += 1;
    metrics.perNode[node] = (metrics.perNode[node] || 0) + 1;
    metrics.requestsByIP[ip] = (metrics.requestsByIP[ip] || 0) + 1;

    res.json({
        success: true,
        ip,
        routedTo: node,
        timestamp: logEntry.timestamp
    });
});

// Route: Test consistency with same IP
app.post('/test-consistency', (req, res) => {
    const ip = req.body.ip;
    let iterations = req.body.iterations;

    if (iterations === undefined) {
        iterations = 5;
    }
    
    if (!ip) {
        return res.status(400).json({ error: "IP address is required" });
    }
    
    const results = [];

    for (let i = 0; i < iterations; i++) {
        const node = LoadBalancer(ip);
        results.push({ attempt: i + 1, ip, node, timestamp: new Date().toISOString() });
        requestLog.push(results[i]);
    }
    
    // Checking if all attempts went to same node
    const firstNode = results[0].node;
    let allSame = true;

    for (let i = 0; i < results.length; i++) {
        if (results[i].node !== firstNode) {
            allSame = false;
            break;
        }
    }
    
    res.json({
        success: true,
        ip,
        iterations,
        results,
        consistent: allSame,
        message: allSame ? "✓ Consistency verified: Same IP always routes to same node" : "✗ Inconsistency detected"
    });
});

// Route: Get request log
app.get('/logs', (req, res) => {
    res.json({
        success: true,
        totalRequests: requestLog.length,
        logs: requestLog
    });
});

// Route: Get node statuses
app.get('/nodes', (req, res) => {
    res.json({ success: true, nodes: getNodeStatuses() });
});

// Route: Get rate limit status for an IP
app.get('/rate/:ip', (req, res) => {
    const ip = req.params.ip;
    if (!ip) return res.status(400).json({ error: 'IP required' });
    const status = getStatus(ip);
    res.json({ success: true, ip, status });
});

// Route: Metrics dashboard
app.get('/metrics', (req, res) => {
    const topIPs = [];

    for (const ip in metrics.requestsByIP) {
        topIPs.push([ip, metrics.requestsByIP[ip]]);
    }

    topIPs.sort(function(a, b) {
        return b[1] - a[1];
    });

    res.json({
        success: true,
        startTime: metrics.startTime,
        uptimeSeconds: Math.floor((Date.now() - new Date(metrics.startTime)) / 1000),
        totalRequests: metrics.totalRequests,
        perNode: metrics.perNode,
        rejectedRequests: metrics.rejectedRequests,
        topIPs: topIPs.slice(0, 10)
    });
});

// Route: Reset metrics
app.post('/metrics/reset', (req, res) => {
    metrics.totalRequests = 0;
    metrics.perNode = {};
    metrics.rejectedRequests = 0;
    metrics.requestsByIP = {};
    metrics.startTime = new Date().toISOString();
    res.json({ success: true, message: 'Metrics reset' });
});

// Route: Metrics UI
app.get('/metrics/ui', (req, res) => {
    res.sendFile(path.join(__dirname, 'metrics.html'));
});

// Route: Trigger a health check (simulated)
app.post('/nodes/check', (req, res) => {
    const result = runHealthCheck();
    res.json({ success: true, result });
});

// Route: Manually set a node health (body: { healthy: true|false })
app.post('/nodes/:name/health', (req, res) => {
    const name = req.params.name;
    const healthy = req.body.healthy;

    if (typeof healthy !== 'boolean') {
        return res.status(400).json({ error: 'Request body must include boolean `healthy`' });
    }

    const ok = setNodeHealth(name, healthy);
    if (!ok) return res.status(404).json({ error: 'Node not found' });
    res.json({ success: true, nodes: getNodeStatuses() });
});

// Route: Simulate traffic
app.post('/simulate', (req, res) => {
    let requestCount = req.body.requestCount;

    if (requestCount === undefined) {
        requestCount = 10;
    }
    
    console.log(`\n====== Simulating ${requestCount} Requests ======\n`);
    const results = [];
    
    for (let i = 0; i < requestCount; i++) {
        const ip = generateRandomIP();
        // Respect rate limiter for simulation per generated IP
        const rl = consume(ip);
        if (!rl.allowed) {
            // record rejected event
            const logEntry = { ip, node: null, timestamp: new Date().toISOString(), rejected: true };
            results.push(logEntry);
            requestLog.push(logEntry);
            continue;
        }
        const node = LoadBalancer(ip);
        const logEntry = { ip, node, timestamp: new Date().toISOString() };
        results.push(logEntry);
        requestLog.push(logEntry);
        // Update metrics for simulated requests
        metrics.totalRequests += 1;
        metrics.perNode[node] = (metrics.perNode[node] || 0) + 1;
        metrics.requestsByIP[ip] = (metrics.requestsByIP[ip] || 0) + 1;
    }
    
    res.json({
        success: true,
        requestCount,
        results
    });
});

// Route: Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: "Load Balancer is running",
        timestamp: new Date().toISOString()
    });
});

// Route: Get info
app.get('/info', (req, res) => {
    res.json({
        success: true,
        name: "Load Balancer API",
        version: "1.0.0",
        algorithm: "Consistent Hashing (SHA-256)",
        nodes: ["Node-A", "Node-B", "Node-C"],
        endpoints: {
            "POST /route": "Route a specific IP (body: { ip: 'x.x.x.x' })",
            "GET /route-random": "Route a random IP",
            "POST /test-consistency": "Test IP consistency (body: { ip: 'x.x.x.x', iterations: 5 })",
            "POST /simulate": "Simulate traffic (body: { requestCount: 10 })",
            "GET /logs": "Get all request logs",
            "GET /health": "Health check",
            "GET /info": "Show API info"
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n✓ Load Balancer Server running on http://localhost:${PORT}`);
    console.log(`\nAvailable endpoints:`);
    console.log(`  GET  http://localhost:${PORT}/info`);
    console.log(`  GET  http://localhost:${PORT}/health`);
    console.log(`  POST http://localhost:${PORT}/route`);
    console.log(`  GET  http://localhost:${PORT}/route-random`);
    console.log(`  POST http://localhost:${PORT}/test-consistency`);
    console.log(`  POST http://localhost:${PORT}/simulate`);
    console.log(`  GET  http://localhost:${PORT}/logs\n`);
    console.log(`  GET  http://localhost:${PORT}/metrics`);
    console.log(`  GET  http://localhost:${PORT}/metrics/ui`);
    // Start periodic health checks every 15 seconds
    setInterval(() => {
        try {
            runHealthCheck();
        } catch (err) {
            console.error('Health check error:', err);
        }
    }, 15000);
});

