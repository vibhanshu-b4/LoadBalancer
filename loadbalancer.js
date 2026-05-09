const crypto = require('crypto');

// These are the server nodes used by the load balancer
const nodes = [
    { name: "Node-A", weight: 1, healthy: true },
    { name: "Node-B", weight: 1, healthy: true },
    { name: "Node-C", weight: 1, healthy: true }
];

function logRequest(ip, selectedNode, timestamp) {
    console.log(`[${timestamp}] Incoming IP: ${ip} → Routed to: ${selectedNode}`);
}

// This converts the IP into a number between 0 and 1
function hashIP(ip) {
    const hash = crypto.createHash('sha256').update(ip).digest('hex');
    const firstPart = hash.slice(0, 8);
    const numberValue = parseInt(firstPart, 16);

    return numberValue / 0xffffffff;
}

// Main load balancer function
function LoadBalancer(ip) {
    if (!ip || nodes.length === 0) {
        console.error("Invalid IP or no nodes available");
        return null;
    }

    // First we only take the healthy nodes
    const healthyNodes = [];
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].healthy === true) {
            healthyNodes.push(nodes[i]);
        }
    }

    let availableNodes = healthyNodes;
    if (availableNodes.length === 0) {
        // If all nodes are down, still use original nodes so code does not break
        availableNodes = nodes;
    }

    const hashValue = hashIP(ip);

    // Finding total weight in a simple way
    let totalWeight = 0;
    for (let i = 0; i < availableNodes.length; i++) {
        let nodeWeight = availableNodes[i].weight;
        if (!nodeWeight) {
            nodeWeight = 1;
        }

        totalWeight = totalWeight + nodeWeight;
    }

    const selectedPlace = hashValue * totalWeight;

    let currentWeight = 0;
    let selectedNode = availableNodes[availableNodes.length - 1];

    for (let i = 0; i < availableNodes.length; i++) {
        let nodeWeight = availableNodes[i].weight;
        if (!nodeWeight) {
            nodeWeight = 1;
        }

        currentWeight = currentWeight + nodeWeight;

        if (selectedPlace < currentWeight) {
            selectedNode = availableNodes[i];
            break;
        }
    }

    const timestamp = new Date().toISOString();
    logRequest(ip, selectedNode.name, timestamp);

    return selectedNode.name;
}

// Generate random IP for testing
function generateRandomIP() {
    const parts = [];

    for (let i = 0; i < 4; i++) {
        const number = Math.floor(Math.random() * 256);
        parts.push(number);
    }

    return parts.join(".");
}

// Simulate incoming traffic
function simulateTraffic(requestCount = 5) {
    console.log(`\n====== Simulating ${requestCount} Requests ======\n`);

    for (let i = 0; i < requestCount; i++) {
        const ip = generateRandomIP();
        LoadBalancer(ip);
    }
}

// Test consistency - same IP should always route to same node
function testConsistency() {
    console.log(`\n====== Testing Consistency (Same IP) ======\n`);

    const testIP = "192.168.1.100";
    console.log(`Testing IP: ${testIP}\n`);

    for (let i = 0; i < 5; i++) {
        LoadBalancer(testIP);
    }
}

// This is just a fake health check for demo purpose
function runHealthCheck() {
    const changes = [];

    for (let i = 0; i < nodes.length; i++) {
        const oldHealth = nodes[i].healthy;

        // 95 percent chance that node is healthy
        if (Math.random() < 0.95) {
            nodes[i].healthy = true;
        } else {
            nodes[i].healthy = false;
        }

        if (nodes[i].healthy !== oldHealth) {
            changes.push({ node: nodes[i].name, healthy: nodes[i].healthy });

            const healthText = nodes[i].healthy ? 'healthy' : 'unhealthy';
            console.log(`[${new Date().toISOString()}] Health change: ${nodes[i].name} -> ${healthText}`);
        }
    }

    const nodeList = [];
    for (let i = 0; i < nodes.length; i++) {
        nodeList.push({ name: nodes[i].name, healthy: nodes[i].healthy });
    }

    return { timestamp: new Date().toISOString(), changes: changes, nodes: nodeList };
}

function getNodeStatuses() {
    const statusList = [];

    for (let i = 0; i < nodes.length; i++) {
        statusList.push({
            name: nodes[i].name,
            healthy: nodes[i].healthy,
            weight: nodes[i].weight
        });
    }

    return statusList;
}

function setNodeHealth(name, healthy) {
    let foundNode = null;

    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].name === name) {
            foundNode = nodes[i];
            break;
        }
    }

    if (!foundNode) {
        return false;
    }

    foundNode.healthy = !!healthy;
    return true;
}

function getNodes() {
    const nodeNames = [];

    for (let i = 0; i < nodes.length; i++) {
        nodeNames.push(nodes[i].name);
    }

    return nodeNames;
}

module.exports = {
    LoadBalancer,
    generateRandomIP,
    simulateTraffic,
    testConsistency,
    getNodes,
    runHealthCheck,
    getNodeStatuses,
    setNodeHealth
};
