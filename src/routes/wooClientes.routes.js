const express = require('express');
const router = express.Router();
const wooClientesController = require('../controllers/wooClientes.controller');

// Obtener cliente por email (query params)
// GET /woo-clientes/buscar?woo_config_id=1&email=test@email.com
router.get(
  '/woo-clientes/buscar',
  wooClientesController.getClienteByEmail
);



// Obtener cliente por ID
router.get(
  '/woo-clientes/id/:id',
  wooClientesController.getClienteById
);

router.get(
  '/woo/:id/guardar-clientes-desde-pedidos',
  wooClientesController.GuardarClientesDePedidosPorTienda
);
router.get(
  '/woo/:id/producto-entrada-clientes-nuevos',
  wooClientesController.informeProductoEntrada
);
router.get(
  '/woo/:id/producto-entrada-por-producto',
  wooClientesController.informeProductoEntradaPorProducto
);
router.get(
  '/woo/:id/frecuencia-compra-clientes',
  wooClientesController.informeFrecuenciaClientes
);
router.get(
  '/woo/producto-entrada-por-producto-global',
   wooClientesController.informeProductoEntradaGlobalPorProducto
);
// Obtener clientes por tienda
router.get(
  '/:woo_config_id',
  wooClientesController.getClientesPorTienda
);
// Crear cliente
router.post(
  '/woo-clientes',
  wooClientesController.crearCliente
);

// Actualizar cliente
router.patch(
  '/woo-clientes/:id',
  wooClientesController.actualizarCliente
);

module.exports = router;
