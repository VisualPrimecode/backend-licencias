// queues/cotizacionQueue.js
const Queue = require('bull');
const redis = require('../config/redis');
console.log('🔁 Inicializando cola de cotización...');
const cotizacionQueue = new Queue('cotizacionQueue', {
    
  redis: {
    host: redis.options.host,
    port: redis.options.port
  }
  
});
console.log('✅ Cola de cotización inicializada');  
cotizacionQueue.on('error', (err) => {
  console.error('❌ Error en cotizacionQueue:', err);
});

cotizacionQueue.on('failed', (job, err) => {
  console.error(`❌ Job de cotización falló:`, err);
});

module.exports = cotizacionQueue;
