const express = require('express');
const router = express.Router();
const wooConfigController = require('../controllers/woocommerce_config.controller');


// 🌍 NUEVA RUTA GLOBAL — debe ir antes de /woo/:id/...
router.get(
  '/woo/orders/filter/global',
  wooConfigController.getWooOrdersWithFilterGlobal
);
// Buscar pedidos de WooCommerce con filtros (versión lenta)
router.get('/woo/:id/orders/search', wooConfigController.searchWooOrders);

router.get('/woo/:id/orders/not-sent', wooConfigController.getWooOrdersNotSent);

router.get(
  '/woo/:id/orders/filter',
  wooConfigController.getWooOrdersWithFilter
);

// Obtener un pedido específico por ID de pedido (más eficiente)
router.get('/woo/:id/orders/:orderId', wooConfigController.getWooOrderById);
// Actualizar un pedido específico en WooCommerce
router.put('/woo/:configId/orders/:orderId', wooConfigController.updateWooOrder);


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


router.get('/woo/fallidos/:id/orders', wooConfigController.getAllConfigsWooOrdersFallidas);

router.get('/woo/:id/orders', wooConfigController.getAllConfigsWooOrders);
// 🚀 Nueva ruta para informe de ventas en MXN
router.get('/woo/:id/ventas-mxn', wooConfigController.getVentasTotalesMXN);

// 🚀 Nueva ruta para informe de tendencia de productos en MXN
router.get('/woo/:id/tendencia-mxn', wooConfigController.getTendenciaProductosMXN);


router.get(
  '/woo/crecimiento-ventas-global',
  wooConfigController.getCrecimientoVentasGlobal
);

// 🚀 Nueva ruta para informe de ventas por país/divisa
router.get('/woo/:id/ventas-por-pais', wooConfigController.getVentasPorPais);
router.get(
  '/woo/ventas-por-tipo-software-global-producto',
  wooConfigController.getVentasPorProductoGlobal
);
router.get(
  '/woo/ventas-por-tipo-software-global',
  wooConfigController.getVentasPorTipoSoftwareGlobal
);
// 🚀 Nueva ruta para informe de ventas por tipo de software
router.get(
  '/woo/:id/ventas-por-tipo-software',
  wooConfigController.getVentasPorTipoSoftware
);


// 🚀 Nueva ruta para informe de ventas por tipo de software
router.get(
  '/woo/:id/top-productos-vendidos',
  wooConfigController.getTopProductosVendidosController
);



// 🚀 Nueva ruta para informe GLOBAL de ventas por país/divisa (consolidado de todas las tiendas)
router.get('/woo/ventas-por-pais/global', wooConfigController.getVentasPorPaisGlobal);

router.get('/woo/promedio-productos/global', wooConfigController.getPromedioProductosGlobal);
// 🚀 Nueva ruta para sincronizar productos
router.post('/woo/:storeId/sync-products', wooConfigController.syncProducts);

module.exports = router;
