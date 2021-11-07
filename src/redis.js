const redis = require('redis');
const bluebird = require('bluebird');
const config = require('./config');

// Make Redis work with promises
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
// Create redis client
const client = redis.createClient({host: process.env.REDIS_HOST || "127.0.0.1"});

client.on('error', (err) => {
    console.log('Redis error: ', err);
});

module.exports = client;