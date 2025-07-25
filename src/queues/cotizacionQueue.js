const Queue = require('bull');

console.log('🔁 Inicializando cola de cotización...');

const cotizacionQueue = new Queue('cotizacionQueue', {
  redis: {
    port: 6379,
    host: 'tough-rat-53689.upstash.io',
    password: 'AdG5AAIjcDFhYjRkMDViYTAzNTE0NTU0YWE4N2E4M2E3NDFjNGY1N3AxMA',
    tls: {} // <= Requerido por Upstash para habilitar TLS
  }

const axios = require('axios');

cotizacionQueue.on('completed', async (job, result) => {
  console.log("entro en el cotizacionQueue.on('completed'");
  const cotizacionId = job.data.id;
  console.log(`✅ Job de cotización completado. ID: ${cotizacionId}`);
  try {
    
    await axios.put(`http://localhost:3000/api/cotizacion/${cotizacionId}/estado`, {
      estado_envio: 'ENVIADO'
    });

    console.log(`📬 Estado de cotización actualizado a 'enviado' para ID: ${cotizacionId}`);
  } catch (error) {
    console.error(`❌ Error al actualizar estado de cotización para ID ${cotizacionId}`, error.message);
  }
});

cotizacionQueue.on('failed', async (job, err) => {
  const cotizacionId = job?.data?.id;

  if (!cotizacionId) {
    console.error('❌ Job fallido, pero no se encontró ID en los datos del job.');
    return;
  }

  try {
    await axios.put(`http://localhost:3000/api/cotizacion/${cotizacionId}/estado`, {
      estado: 'fallido'
    });

    console.log(`📌 Estado de cotización con ID ${cotizacionId} actualizado a 'fallido'`);
  } catch (error) {
    console.error(`❌ Error al actualizar estado a 'fallido' para cotización ${cotizacionId}`, error.message);
  }
});

cotizacionQueue.on('error', (err) => {
  console.error('❌ Error en cotizacionQueue:', err);
});

cotizacionQueue.on('failed', (job, err) => {
  console.error(`❌ Job de cotización falló:`, err);
});

module.exports = cotizacionQueue;
