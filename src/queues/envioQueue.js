const Queue = require('bull');
const redis = require('../config/redis');
const { updateEstadoEnvio } = require('../models/envio.model'); // 👈 Asegúrate de importar esto

const envioQueue = new Queue('envioQueue', {
  redis: {
    host: redis.options.host,
    port: redis.options.port
  }
});

// ✅ Evento: Job completado con éxito
envioQueue.on('completed', async (job, result) => {
  try {
    console.log(`✅ Job de envío completado. ID: ${result.id}`);
    await updateEstadoEnvio(result.id, 'enviado');
  } catch (error) {
    console.error(`❌ Error al actualizar estado a 'enviado' para ID: ${result.id}`, error);
  }
});

// ❌ Evento: Job fallido
envioQueue.on('failed', async (job, err) => {
  try {
    console.error(`❌ Job de envío fallido. ID: ${job.data.id}`);
    await updateEstadoEnvio(job.data.id, 'fallido');
  } catch (error) {
    console.error(`❌ Error al actualizar estado a 'fallido' para ID: ${job.data.id}`, error);
  }
});

module.exports = envioQueue;
