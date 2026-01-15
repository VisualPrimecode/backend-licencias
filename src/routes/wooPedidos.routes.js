const express = require('express');
const router = express.Router();
const wooPedidosController = require('../controllers/wooPedidos.controller');


// GET /woo-pedidos/existe?woo_config_id=1&numero_pedido=123&woo_order_id=456
router.get(
  '/woo-pedidos/existe',
  wooPedidosController.existePedidoWoo
);
// Obtener pedidos por tienda
router.get(
  '/woo-pedidos/:woo_config_id',
  wooPedidosController.getPedidosPorTienda
);

// Obtener pedido por número y tienda
router.get(
  '/woo-pedidos/:woo_config_id/:numero_pedido',
  wooPedidosController.getPedidoPorNumero
);

router.get(
  '/woo/:id/guardar-datos-pedidos',
  wooPedidosController.GuardarPedidosPorTienda
);

// Crear pedido
router.post(
  '/woo-pedidos',
  wooPedidosController.crearPedido
);

// Marcar pedido como enviado
router.patch(
  '/woo-pedidos/:id/enviado',
  wooPedidosController.marcarPedidoEnviado
);

// Registrar error de envío
router.patch(
  '/woo-pedidos/:id/error',
  wooPedidosController.registrarErrorEnvio
);

// Obtener pedidos pendientes de envío
router.get(
  '/woo-pedidos-pendientes',
  wooPedidosController.getPedidosPendientes
);

module.exports = router;
