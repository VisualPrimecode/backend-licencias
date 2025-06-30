const Queue = require('bull');
const redis = require('../config/redis');

const envioQueue = new Queue('envioQueue', {
  redis: {
    host: redis.options.host,
    port: redis.options.port
  }
});

module.exports = envioQueue;
