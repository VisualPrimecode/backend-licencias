
const envioQueue = require('./envioQueue');
//antigua ruta
//const envioProcessor = require('../workers/envioProcessor');
const envioProcessor = require('../workers/envioProcessor');


// Vincular el procesador a la cola
envioQueue.process(envioProcessor);

console.log('📡 Worker de envío conectado a Bull');
 