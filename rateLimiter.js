// Simple in-memory rate limiter
// Each IP gets 10 chances every 1 minute

const buckets = new Map();

const CAPACITY = 10;
const REFILL_INTERVAL_MS = 60 * 1000; // 1 minute
const REFILL_TOKENS = CAPACITY;

function getCurrentTime() {
    return Date.now();
}

function getBucket(ip) {
    let bucket = buckets.get(ip);

    if (!bucket) {
        // New IP, so give it a full bucket
        bucket = {
            tokens: CAPACITY,
            last: getCurrentTime()
        };

        buckets.set(ip, bucket);
    }

    return bucket;
}

function refillBucket(bucket) {
    const currentTime = getCurrentTime();
    const timePassed = currentTime - bucket.last;

    if (timePassed <= 0) {
        return;
    }

    const tokensToAdd = (REFILL_TOKENS * timePassed) / REFILL_INTERVAL_MS;
    bucket.tokens = bucket.tokens + tokensToAdd;

    if (bucket.tokens > CAPACITY) {
        bucket.tokens = CAPACITY;
    }

    bucket.last = currentTime;
}

function consume(ip, cost = 1) {
    const bucket = getBucket(ip);
    refillBucket(bucket);

    if (bucket.tokens >= cost) {
        bucket.tokens = bucket.tokens - cost;

        return {
            allowed: true,
            remaining: Math.floor(bucket.tokens),
            resetMs: REFILL_INTERVAL_MS
        };
    }

    return {
        allowed: false,
        remaining: Math.floor(bucket.tokens),
        resetMs: REFILL_INTERVAL_MS
    };
}

function getStatus(ip) {
    const bucket = getBucket(ip);
    refillBucket(bucket);

    return {
        remaining: Math.floor(bucket.tokens),
        capacity: CAPACITY
    };
}

module.exports = {
    consume,
    getStatus
};
