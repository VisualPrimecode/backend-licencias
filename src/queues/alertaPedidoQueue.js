// 📦 alertPedidoQueue.js
const Queue = require('bull');
const axios = require('axios');

// 🧠 Worker de procesamiento de alertas
const alertaPedidoProcessor = require('../workers/alertaPedidoProcessor');

// ⚙️ Crear la cola (misma config Redis que el resto)
const alertPedidoQueue = new Queue('alertPedidoQueue', {
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
console.log("🟢 Cola 'alertPedidoQueue' creada y conectada a Redis.");
// 🧩 Asociar el processor
alertPedidoQueue.process(alertaPedidoProcessor);



// 📬 Evento: job completado
alertPedidoQueue.on('completed', (job, result) => {
  console.log(`✅ [alertPedidoQueue] Job completado correctamente.`);
  console.log(`📊 Resultado:`, result);
});

// ❌ Evento: job fallido
alertPedidoQueue.on('failed', (job, err) => {
  console.error(`❌ [alertPedidoQueue] Job fallido:`, err.message);
});

// 🧾 Exportar para uso en initqueues.js
module.exports = alertPedidoQueue;
