const express = require('express');
const router = express.Router();
const correosConfigController = require('../controllers/correosConfig.controller');

// Obtener todas las configuraciones
router.get('/', correosConfigController.getCorreosConfig);

// Obtener una configuración por ID
router.get('/:id', correosConfigController.getCorreoConfigById);

// Crear una nueva configuración
router.post('/', correosConfigController.createCorreoConfig);

// Actualizar una configuración existente
router.put('/:id', correosConfigController.updateCorreoConfig);

// Eliminar una configuración
router.delete('/:id', correosConfigController.deleteCorreoConfig);

router.get('/store/:storeId', correosConfigController.getCorreosByStoreId);


module.exports = router;
