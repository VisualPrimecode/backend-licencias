// 📦 stockAlertQueue.js
const Queue = require('bull');
const axios = require('axios');

// 🧠 Worker de procesamiento de alertas
const alertasStockProcessor = require('../workers/alertasStockProcessor');

// ⚙️ Crear la cola (misma config Redis que el resto)
const stockAlertQueue = new Queue('stockAlertQueue', {
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
console.log("🟢 Cola 'stockAlertQueue' creada y conectada a Redis.");
// 🧩 Asociar el processor
stockAlertQueue.process(alertasStockProcessor);



// 📬 Evento: job completado
stockAlertQueue.on('completed', (job, result) => {
  console.log(`✅ [stockAlertQueue] Job completado correctamente.`);
  console.log(`📊 Resultado:`, result);
});

// ❌ Evento: job fallido
stockAlertQueue.on('failed', (job, err) => {
  console.error(`❌ [stockAlertQueue] Job fallido:`, err.message);
});

// 🧾 Exportar para uso en initqueues.js
module.exports = stockAlertQueue;
