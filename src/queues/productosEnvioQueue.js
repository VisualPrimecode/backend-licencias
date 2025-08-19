const Queue = require('bull');

console.log('🔁 Inicializando cola de cotización...');


const envioProductosQueue = new Queue('envioProductosQueue', {
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
const envioProductosQueue = new Queue('envioProductosQueue', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379
    // No se requiere password ni TLS para Redis local por defecto
  }
});
*/
const axios = require('axios');

envioProductosQueue.on('completed', async (job, result) => {
  console.log("entro en el envioProductosQueue.on('completed')");
  const envioProductosId = job.data.id;
  console.log(`✅ Job de cotización completado. ID: ${envioProductosId}`);
  console.log('Datos del job:', job.data);
  console.log('Resultado del job:', result);

  try {
    // 1️⃣ Actualizar estado del envío/cotización
    /*await axios.put(`http://localhost:3000/api/cotizacion/${envioProductosId}/estadoPersonalizado`, {
      estado_envio: 'ENVIADO'
    });*/
    await axios.put(`https://backend-licencias-node-mysql.onrender.com/api/cotizacion/${envioProductosId}/estadoPersonalizado`, {
      estado_envio: 'ENVIADO'
    });
    console.log(`📬 Estado de cotización actualizado a 'enviado' para ID: ${envioProductosId}`);
    // 2️⃣ Actualizar estado de cada serial a "asignado"
    const productos = job.data.productos || [];
    /*
    for (const producto of productos) {
      for (const serial of (producto.seriales || [])) {
        try {
          await axios.put(`http://localhost:3000/api/seriales/${serial.id}`, {
            estado: 'asignado',
            observaciones: `Asignado en envío ${envioProductosId}`,
          });
          console.log(`🔑 Serial ${serial.codigo} actualizado a 'asignado'`);
        } catch (err) {
          console.error(`❌ Error al actualizar serial ${serial.id}:`, err.message);
        }
      }
    }*/
   for (const producto of productos) {
      for (const serial of (producto.seriales || [])) {
        try {
          await axios.put(`https://backend-licencias-node-mysql.onrender.com/api/seriales/${serial.id}`, {
            estado: 'asignado',
            observaciones: `Asignado en envío ${envioProductosId}`,
          });
          console.log(`🔑 Serial ${serial.codigo} actualizado a 'asignado'`);
        } catch (err) {
          console.error(`❌ Error al actualizar serial ${serial.id}:`, err.message);
        }
      }
    }

  } catch (error) {
    console.error(`❌ Error al actualizar estado de cotización para ID ${envioProductosId}`, error.message);
  }
});

envioProductosQueue.on('failed', async (job, err) => {
  const envioProductosId = job?.data?.id;

  if (!envioProductosId) {
    console.error('❌ Job fallido, pero no se encontró ID en los datos del job.');
    return;
  }

  try {
    await axios.put(`https://backend-licencias-node-mysql.onrender.com/api/cotizacion/${envioProductosId}/estadoPersonalizado`, {
      estado: 'fallido'
    });

    console.log(`📌 Estado de cotización con ID ${envioProductosId} actualizado a 'fallido'`);
  } catch (error) {
    console.error(`❌ Error al actualizar estado a 'fallido' para cotización ${envioProductosId}`, error.message);
  }
});

envioProductosQueue.on('error', (err) => {
  console.error('❌ Error en envioProductosQueue:', err);
});

envioProductosQueue.on('failed', (job, err) => {
  console.error(`❌ Job de cotización falló:`, err);
});

module.exports = envioProductosQueue;
