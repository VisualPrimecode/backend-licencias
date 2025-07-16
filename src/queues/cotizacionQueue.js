const Queue = require('bull');

console.log('🔁 Inicializando cola de cotización...');

const cotizacionQueue = new Queue('cotizacionQueue', {
  redis: {
    port: 6379,
    host: 'tough-rat-53689.upstash.io',
    password: 'AdG5AAIjcDFhYjRkMDViYTAzNTE0NTU0YWE4N2E4M2E3NDFjNGY1N3AxMA',
    tls: {} // <= Requerido por Upstash para habilitar TLS
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
