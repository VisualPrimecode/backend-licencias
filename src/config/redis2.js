const Redis = require('ioredis2');
//redis en producción
//const redis = new Redis(process.env.REDIS_URL); // URL como la que pegaste
//redis en local
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379
});
module.exports = redis;
