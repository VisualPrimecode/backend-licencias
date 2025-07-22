const express = require('express');
const router = express.Router();
const configController = require('../controllers/dbConnectionConfig.controller');

// Obtener todas las configuraciones
router.get('/', configController.getAllConfigs);

// Obtener una configuración por ID
router.get('/:id', configController.getConfigById);

// Obtener configuraciones por empresa
router.get('/empresa/:empresaId', configController.getConfigsByEmpresaId);

// Obtener configuraciones por empresa
router.get('/woocommerce/:id_woo', configController.getConfigsByWooId);

// Crear una nueva configuración
router.post('/', configController.createConfig);

// Actualizar una configuración por ID
router.put('/:id', configController.updateConfig);

// Eliminar una configuración por ID
router.delete('/:id', configController.deleteConfig);



module.exports = router;
