const express = require('express');
const router = express.Router();
const envioController = require('../controllers/envio.controller');

// Obtener todos los envíos
router.get('/', envioController.getEnvios);

// Obtener un envío por ID
router.get('/:id', envioController.getEnvioById);

// Crear un nuevo envío manual pedidos (ENVÍA CORREO)
router.post('/', envioController.createEnvio);

// Crear un nuevo envío cotizacion
router.post('/cotizaciones/', envioController.createCotizacion);

// Envío personalizado (ENVÍA CORREO)
router.post('/envioProductos/', envioController.envioProductos);

// 🆕 NUEVA RUTA → solo registra, NO envía correo
router.post(
  '/solo-registro-personalizado',
  envioController.createSoloRegistroEnvioPersonalizado
);

// Actualizar un envío existente
router.put('/:id', envioController.updateEnvio);

// Actualizar estado de un envío
router.put('/envio/:id/estado', envioController.updateEstadoEnvio);

// Eliminar un envío
router.delete('/:id', envioController.deleteEnvio);

router.get('/estado/envio', envioController.consultarEstadoEnvio);

router.get('/verificar/registroEnvio', envioController.verificarEnvioPorPedidoWoo);

module.exports = router;
