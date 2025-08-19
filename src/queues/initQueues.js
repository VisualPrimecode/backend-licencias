
const envioQueue = require('./envioQueue');
const cotizacionQueue = require('./cotizacionQueue');
const envioProcessor = require('../workers/envioProcessor2');
const cotizacionProcessor = require('../workers/cotizacionProcessor2');
const productosEnvioQueue = require('./productosEnvioQueue');
const productosEnvioProcessor = require('../workers/envioProductosProcessor');

cotizacionQueue.process(cotizacionProcessor);
// Vincular el procesador a la cola
envioQueue.process(envioProcessor);

productosEnvioQueue.process(productosEnvioProcessor);



console.log('📡 Worker de envío conectado a Bull');
 