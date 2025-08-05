
const envioQueue = require('./envioQueue');
const cotizacionQueue = require('./cotizacionQueue');
const envioProcessor = require('../workers/envioProcessor2');
const cotizacionProcessor = require('../workers/cotizacionProcessor2');

cotizacionQueue.process(cotizacionProcessor);
// Vincular el procesador a la cola
envioQueue.process(envioProcessor);



console.log('📡 Worker de envío conectado a Bull');
 