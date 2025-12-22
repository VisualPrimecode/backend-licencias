const Queue = require('bull');

console.log('🔁 Inicializando cola de correos de seguimiento...');



const correoSeguimientoQueue = new Queue('cotizacionQueue', {
  redis: {
    port: 6379,
    host: 'tough-rat-53689.upstash.io',
    password: 'AdG5AAIjcDFhYjRkMDViYTAzNTE0NTU0YWE4N2E4M2E3NDFjNGY1N3AxMA',
    tls: {} // <= Requerido por Upstash para habilitar TLS
  }
});
//en local
// 
/*
const correoSeguimientoQueue = new Queue('correoSeguimientoQueue', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379
    // No se requiere password ni TLS para Redis local por defecto
  }
});
*/
const axios = require('axios');

correoSeguimientoQueue.on('completed', async (job, result) => {
  const correoSeguimientoId = job.data.id;
  try {
    await axios.put(`https://backend-licencias-node-mysql.onrender.com/api/correo-seguimiento/${correoSeguimientoId}/estado`, {
      estado_envio: 'ENVIADO'
    });

    console.log(`📬 Estado de correo de seguimiento actualizado a 'enviado' para ID: ${correoSeguimientoId}`);
  } catch (error) {
    console.error(`❌ Error al actualizar estado de cotización para ID ${correoSeguimientoId}`, error.message);
  }
});

correoSeguimientoQueue.on('failed', async (job, err) => {
  const correoSeguimientoId = job?.data?.id;

  if (!correoSeguimientoId) {
    console.error('❌ Job fallido, pero no se encontró ID en los datos del job.');
    return;
  }

  try {
    await axios.put(`https://backend-licencias-node-mysql.onrender.com/api/correo-seguimiento/${correoSeguimientoId}/estado`, {
      estado_envio: 'fallido'
    });

    console.log(`📌 Estado de correo de seguimiento con ID ${correoSeguimientoId} actualizado a 'fallido'`);
  } catch (error) {
    console.error(`❌ Error al actualizar estado a 'fallido' para cotización ${correoSeguimientoId }`, error.message);
  }
});

correoSeguimientoQueue.on('error', (err) => {
  console.error('❌ Error en correoSeguimientoQueue:', err);
});

correoSeguimientoQueue.on('failed', (job, err) => {
  console.error(`❌ Job de correo de seguimiento falló:`, err);
});

module.exports = correoSeguimientoQueue;