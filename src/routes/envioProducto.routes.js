const express = require('express');
const router = express.Router();
const envioController = require('../controllers/envioProductos.controller');

// Obtener todos los envíos
router.get('/', envioController.getEnvios);

router.get('/porTienda/:id_woo', envioController.getEnviosByIdwoo);

// Obtener un envío por ID
router.get('/:id', envioController.getEnvioById);

// Obtener un envío por ID


// Crear un nuevo envío
router.post('/', envioController.createEnvio);

// Actualizar un envío existente
router.put('/:id', envioController.updateEnvio);

// Eliminar un envío
router.delete('/:id', envioController.deleteEnvio);

module.exports = router;
