const express = require('express');
const router = express.Router();
const wooConfigController = require('../controllers/woocommerce_config.controller');

// Buscar pedidos de WooCommerce con filtros (versión lenta)
router.get('/woo/:id/orders/search', wooConfigController.searchWooOrders);


// Obtener un pedido específico por ID de pedido (más eficiente)
router.get('/woo/:id/orders/:orderId', wooConfigController.getWooOrderById);


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

// Obtener productos de WooCommerce por ID de configuración
router.get('/woo/:id/products', wooConfigController.getAllConfigsWooProducts);

// Obtener pedidos de WooCommerce por ID de configuración
router.get('/woo/:id/orders', wooConfigController.getAllConfigsWooOrders);




module.exports = router;
