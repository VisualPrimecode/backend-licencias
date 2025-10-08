
const envioQueue = require('./envioQueue');
const cotizacionQueue = require('./cotizacionQueue');
const envioProcessor = require('../workers/envioProcessor2');
const cotizacionProcessor = require('../workers/cotizacionProcessor2');
const productosEnvioQueue = require('./productosEnvioQueue');
const productosEnvioProcessor = require('../workers/envioProductosProcessor');
const wooPollingQueue = require('./wooPollingQueue');
const axios = require('axios');

// ⚡ Cada job del polling simplemente hace una petición al servidor
wooPollingQueue.process(async () => {
  try {
    console.log('📡 Ejecutando job de polling: llamando al endpoint /api/polling/woo');
//en local

    /*// Llamada al endpoint del servidor (ajusta URL según tu despliegue)
    await axios.post(`http://localhost:3000/api/webhooks-crud/woo/polling`);
*/
    await axios.post(`https://backend-licencias-node-mysql.onrender.com/api/webhooks-crud/woo/polling`);

    console.log('✅ Polling ejecutado correctamente vía API');
  } catch (error) {
    console.error('❌ Error ejecutando polling vía API:', error.message);
    throw error;
  }
});

// Programar cada 5 minutos
wooPollingQueue.add({}, {
  repeat: { cron: '*/2 * * * *' },
  removeOnComplete: true,
  removeOnFail: false
});

console.log('📡 Polling de WooCommerce programado cada 2 minutos');

// Procesadores de otras colas
cotizacionQueue.process(cotizacionProcessor);
envioQueue.process(envioProcessor);
productosEnvioQueue.process(productosEnvioProcessor);

console.log('📡 Worker de envío conectado a Bull');
