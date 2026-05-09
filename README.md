# Load Balancer

This is a simple load balancer project made with Node.js and Express.

It takes an IP address and routes it to one of the nodes. The same IP should go to the same node again because the routing is based on hashing.

## What It Has

- IP based routing
- 3 sample nodes: `Node-A`, `Node-B`, `Node-C`
- simple request logs
- basic metrics
- rate limiting per IP
- fake health check for nodes
- small metrics page in browser

## Files

```text
loadbalancer.js   - main routing logic
rateLimiter.js    - rate limit code
server.js         - Express server and API routes
metrics.html      - metrics page
test.js           - basic test for same IP routing
stats.js          - checks distribution between nodes
metrics_test.js   - checks rate limit and metrics API
```

## Setup And Run On Your Device

Follow these steps to run the project on another laptop/PC.

### 1. Install Node.js

First install Node.js from:

```text
https://nodejs.org/
```

After installing, check it in terminal:

```bash
node -v
npm -v
```

If both commands show versions, then Node.js is installed properly.

### 2. Get The Project

Option 1: clone using Git:

```bash
git clone <your-github-repo-link>
```

Then go inside the folder:

```bash
cd <project-folder-name>
```

Option 2: download ZIP:

1. Open the GitHub repository.
2. Click `Code`.
3. Click `Download ZIP`.
4. Extract the ZIP file.
5. Open terminal inside the extracted project folder.

### 3. Install Packages

Run this inside the project folder:

```bash
npm install
```

This will install Express and other needed files.

### 4. Start The Server

```bash
npm start
```

If it starts correctly, the server will run here:

```text
http://localhost:3000
```

Do not close this terminal while testing the APIs.

### 5. Check If Server Is Running

Open another terminal and run:

```bash
curl http://localhost:3000/health
```

Or open this in browser:

```text
http://localhost:3000/health
```

If it returns success, the server is working.

## Main APIs

Check server:

```bash
curl http://localhost:3000/health
```

Route one IP:

```bash
curl -X POST http://localhost:3000/route -H "Content-Type: application/json" -d "{\"ip\":\"192.168.1.100\"}"
```

Test same IP routing:

```bash
curl -X POST http://localhost:3000/test-consistency -H "Content-Type: application/json" -d "{\"ip\":\"10.0.0.1\",\"iterations\":5}"
```

Simulate random traffic:

```bash
curl -X POST http://localhost:3000/simulate -H "Content-Type: application/json" -d "{\"requestCount\":10}"
```

Open metrics page:

```text
http://localhost:3000/metrics/ui
```

Other useful routes:

```text
GET  /info
GET  /logs
GET  /metrics
GET  /nodes
POST /nodes/check
GET  /rate/:ip
```

## Run Tests

These tests can be run from terminal inside the project folder.

### 1. Test same IP routing

```bash
node test.js
```

This checks that the same IP is going to the same node again.

### 2. Test traffic distribution

```bash
node stats.js
```

This sends many random IPs and shows how many requests went to each node.

### 3. Test metrics and rate limit

First keep the server running:

```bash
npm start
```

Then open another terminal and run:

```bash
node metrics_test.js
```

This sends 12 requests from the same IP. First 10 should pass, and after that it should show rate limit error.

## Use On Another Device

Both devices should be on the same WiFi/network.

1. Start the server on the main laptop:

```bash
npm start
```

2. Find the main laptop IP address.

On Windows:

```bash
ipconfig
```

Use the IPv4 address, something like:

```text
192.168.1.50
```

3. From the other device, open:

```text
http://192.168.1.50:3000/info
```

or:

```text
http://192.168.1.50:3000/metrics/ui
```

If it does not open, check firewall settings and make sure port `3000` is allowed.

For using it outside the same network, a tool like ngrok can be used:

```bash
ngrok http 3000
```

Then use the URL given by ngrok.

## Host Online

I used GitHub for the code:

```text
https://github.com/vibhanshu-b4/LoadBalancer
```

One simple way to host this is Render.

Steps:

1. Go to Render and create/login to your account.
2. Click `New` and select `Web Service`.
3. Connect this GitHub repository:

```text
https://github.com/vibhanshu-b4/LoadBalancer
```

4. Use these settings:

```text
Language: Node
Branch: main
Build Command: npm install
Start Command: npm start
```

5. Create the service and wait for deploy to finish.

After deploy, Render will give a public URL like:

```text
https://your-app-name.onrender.com
```

Then check:

```text
https://your-app-name.onrender.com/health
https://your-app-name.onrender.com/info
https://your-app-name.onrender.com/metrics/ui
```

## Note

All logs, metrics, rate limit data, and node health data are stored in memory only. So if the server restarts, everything resets.
