const Queue = require('bull');

const envioQueue = new Queue('envioQueue', {
  redis: {
    host: 'tough-rat-53689.upstash.io',
    port: 6379,
    password: 'AdG5AAIjcDFhYjRkMDViYTAzNTE0NTU0YWE4N2E4M2E3NDFjNGY1N3AxMA',
    tls: {} // Requerido por Upstash para conexión segura
  }
});

// ✅ Evento: Job completado con éxito
const axios = require('axios');

envioQueue.on('completed', async (job, result) => {
  try {
    console.log(`✅ Job de envío completado. ID: ${result.id}`);

    // Enviar aviso al servidor para actualizar el estado en local 
   /* await axios.put(`http://localhost:3000/api/envios/envio/${result.id}/estado`, {
      estado: 'enviado'
    });*/
     await axios.put(`https://backend-licencias-node-mysql.onrender.com/api/envios/envio/${result.id}/estado`, {
      estado: 'enviado'
    });
    console.log(`📬 Estado actualizado vía API para ID: ${result.id}`);

  } catch (error) {
    console.error(`❌ Error al notificar estado 'enviado' para ID: ${result.id}`, error.message);
  }
});


// ❌ Evento: Job fallido
envioQueue.on('failed', async (job, err) => {
  const envioId = job?.data?.id;

  if (!envioId) {
    console.error('❌ Job fallido, pero no se encontró un ID válido en los datos del job.');
    return;
  }

  try {
    console.error(`❌ Job de envío fallido. ID: ${envioId}. Error: ${err.message}`);
    await Envio.updateEstadoEnvio(envioId, 'fallido');
    console.log(`📌 Estado del envío con ID ${envioId} actualizado a 'fallido'`);
  } catch (error) {
    console.error(`❌ Error al actualizar el estado a 'fallido' para el envío con ID: ${envioId}`, error);
  }
});


module.exports = envioQueue;
