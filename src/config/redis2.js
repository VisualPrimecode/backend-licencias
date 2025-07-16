const Redis = require('ioredis2');

const redis = new Redis(process.env.REDIS_URL); // URL como la que pegaste

module.exports = redis;
