// 📦 stockProductoQueue.js
const Queue = require('bull');
const axios = require('axios');

// 🧠 Worker de procesamiento de alertas
const stockProductoProcessor = require('../workers/productoPedidoProcessor');

// ⚙️ Crear la cola (misma config Redis que el resto)
const stockProductoQueue = new Queue('stockProductoQueue', {
  /*
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  }*/
  redis: {
    port: 6379,
    host: 'tough-rat-53689.upstash.io',
    password: 'AdG5AAIjcDFhYjRkMDViYTAzNTE0NTU0YWE4N2E4M2E3NDFjNGY1N3AxMA',
    tls: {} // <= Requerido por Upstash para habilitar TLS
  }
});

// 🧩 Asociar el processor
stockProductoQueue.process(stockProductoProcessor);



// 📬 Evento: job completado
stockProductoQueue.on('completed', (job, result) => {
  console.log(`✅ [stockProductoQueue] Job completado correctamente.`);
  console.log(`📊 Resultado:`, result);
});

// ❌ Evento: job fallido
stockProductoQueue.on('failed', (job, err) => {
  console.error(`❌ [stockProductoQueue] Job fallido:`, err.message);
});

// 🧾 Exportar para uso en initqueues.js
module.exports = stockProductoQueue;
