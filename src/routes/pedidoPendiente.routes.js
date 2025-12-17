const express = require('express');
const router = express.Router();
const pedidoPendienteController = require('../controllers/pedidoPendiente.controller');

// ================================
// PEDIDOS PENDIENTES
// ================================

// Obtener todos los pedidos pendientes
router.get('/', pedidoPendienteController.getPedidosPendientes);

// Obtener un pedido pendiente por ID
router.get('/:id', pedidoPendienteController.getPedidoPendienteById);

// Crear un nuevo pedido pendiente
router.post('/', pedidoPendienteController.createPedidoPendiente);

// Actualizar un pedido pendiente existente
router.put('/:id', pedidoPendienteController.updatePedidoPendiente);

// Eliminar un pedido pendiente
router.delete('/:id', pedidoPendienteController.deletePedidoPendiente);

module.exports = router;
