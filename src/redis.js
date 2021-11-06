const redis = require('redis');
const bluebird = require('bluebird');

// Make Redis work with promises
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

// Create redis client
const client = redis.createClient();

client.on('error', (err) => {
    console.log('Redis error: ', err);
});

module.exports = client;