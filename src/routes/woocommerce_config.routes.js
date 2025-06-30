const express = require('express');
const router = express.Router();
const wooConfigController = require('../controllers/woocommerce_config.controller');

// Obtener todas las configuraciones
router.get('/', wooConfigController.getAllConfigs);

// Obtener configuración por ID
router.get('/:id', wooConfigController.getConfigById);

// Obtener configuraciones por empresa_id
router.get('/empresa/:empresaId', wooConfigController.getConfigsByEmpresa);

// Crear nueva configuración
router.post('/', wooConfigController.createConfig);

// Actualizar configuración existente
router.put('/:id', wooConfigController.updateConfig);

// Eliminar configuración
router.delete('/:id', wooConfigController.deleteConfig);

module.exports = router;
