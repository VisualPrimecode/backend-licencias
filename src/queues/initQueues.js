const envioQueue = require('./envioQueue');
const envioProcessor = require('../workers/envioProcessor');

// Vincular el procesador a la cola
envioQueue.process(envioProcessor);

console.log('📡 Worker de envío conectado a Bull');
